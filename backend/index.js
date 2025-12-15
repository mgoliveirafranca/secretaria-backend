import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ===============================
// ESTADO
// ===============================
let filterEnabled = true;
let silentHours = { start: 22, end: 8 };
let calls = [];

// ===============================
// IA – TRANSCRIÇÃO
// ===============================
async function transcreverAudio(url) {
  const audio = await fetch(url);
  const buffer = await audio.arrayBuffer();

  const form = new FormData();
  form.append("file", Buffer.from(buffer), "audio.wav");
  form.append("model", "whisper-1");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      ...form.getHeaders()
    },
    body: form
  });

  const data = await r.json();
  return data.text;
}

// ===============================
// IA – DECISÃO
// ===============================
async function decidir(texto) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Classifique a ligação como URGENTE, NORMAL ou SPAM. Responda apenas uma palavra."
        },
        { role: "user", content: texto }
      ]
    })
  });

  const data = await r.json();
  return data.choices[0].message.content.trim();
}

// ===============================
// HORÁRIO SILENCIOSO
// ===============================
function estaEmHorarioSilencioso() {
  const hora = new Date().getHours();
  if (silentHours.start < silentHours.end) {
    return hora >= silentHours.start && hora < silentHours.end;
  }
  return hora >= silentHours.start || hora < silentHours.end;
}

// ===============================
// TWILIO
// ===============================
app.post("/voice", async (req, res) => {
  const from = req.body.From;
  const audioUrl = req.body.RecordingUrl;

  if (!filterEnabled || !audioUrl) {
    return responder(res, "passar");
  }

  if (estaEmHorarioSilencioso()) {
    return responder(res, "bloquear");
  }

  const texto = await transcreverAudio(audioUrl);
  const decisao = await decidir(texto);

  calls.unshift({
    from,
    texto,
    decisao,
    time: new Date().toLocaleString()
  });

  if (decisao === "URGENTE") return responder(res, "passar");
  if (decisao === "NORMAL") return responder(res, "recado");
  return responder(res, "bloquear");
});

// ===============================
// TWIML
// ===============================
function responder(res, tipo) {
  let xml = "";

  if (tipo === "passar") {
    xml = `
    <Response>
      <Say language="pt-BR">Ligação importante. Transferindo.</Say>
      <Dial>+SEU_NUMERO</Dial>
    </Response>`;
  }

  if (tipo === "recado") {
    xml = `
    <Response>
      <Say language="pt-BR">Deixe seu recado.</Say>
      <Record maxLength="30"/>
    </Response>`;
  }

  if (tipo === "bloquear") {
    xml = `
    <Response>
      <Say language="pt-BR">No momento não atendemos chamadas.</Say>
      <Hangup/>
    </Response>`;
  }

  res.type("text/xml").send(xml);
}

// ===============================
// API PARA FRONTEND
// ===============================
app.get("/calls", (req, res) => res.json(calls));

app.post("/silent-hours", (req, res) => {
  silentHours = req.body;
  res.sendStatus(200);
});

app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

// ===============================
app.listen(3000, () =>
  console.log("🚀 Secretária IA rodando na porta 3000")
);
