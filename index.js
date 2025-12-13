// 1. Importar as ferramentas
import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";

// 2. Ler o arquivo .env
dotenv.config();

// 3. Criar o servidor
const app = express();
app.use(express.json());

// 4. Pegar a chave da OpenAI
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// 5. Rota principal (teste)
app.get("/", (req, res) => {
  res.send("Backend da Secretaria Inteligente está rodando 🚀");
});

// 6. Função que envia áudio pra OpenAI e vira texto
async function transcreverAudio(urlDoAudio) {
  const resposta = await fetch(urlDoAudio);
  const buffer = await resposta.arrayBuffer();

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

// 7. Função que classifica o texto
async function classificarTexto(texto) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Classifique esta mensagem como Urgente, Normal ou Spam:\n\n${texto}`
        }
      ],
      temperature: 0
    })
  });

  const data = await r.json();
  return data.choices[0].message.content;
}

// 8. Endpoint que recebe o áudio
app.post("/processar", async (req, res) => {
  try {
    const { audio_url } = req.body;

    if (!audio_url) {
      return res.status(400).json({ erro: "audio_url não enviado" });
    }

    const texto = await transcreverAudio(audio_url);
    const classificacao = await classificarTexto(texto);

    res.json({
      texto,
      classificacao
    });

  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// 9. Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
