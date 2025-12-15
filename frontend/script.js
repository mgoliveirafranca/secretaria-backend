// =======================
// ELEMENTOS DA TELA
// =======================
const filterToggle = document.getElementById("filterToggle");
const statusText = document.getElementById("status");

const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");

const callsList = document.getElementById("callsList");

// =======================
// TOGGLE DO FILTRO
// =======================
filterToggle.addEventListener("change", async () => {
  const enabled = filterToggle.checked;

  statusText.textContent = enabled
    ? "Filtro ativado"
    : "Filtro desligado";

  await fetch("/filter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled })
  });
});

// =======================
// SALVAR HORÁRIO
// =======================
async function saveSchedule() {
  const start = startTimeInput.value;
  const end = endTimeInput.value;

  if (!start || !end) {
    alert("Preencha início e fim");
    return;
  }

  // pega só a hora (HH)
  const startHour = Number(start.split(":")[0]);
  const endHour = Number(end.split(":")[0]);

  await fetch("/silent-hours", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: startHour,
      end: endHour
    })
  });

  alert("Horário de silêncio salvo");
}

// =======================
// CARREGAR CHAMADAS
// =======================
async function carregarChamadas() {
  const response = await fetch("/calls");
  const calls = await response.json();

  callsList.innerHTML = "";

  calls.forEach(call => {
    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${call.decisao}</strong> — ${call.from}<br>
      "${call.texto}"<br>
      <small>${call.time}</small>
    `;

    li.style.marginBottom = "10px";
    callsList.appendChild(li);
  });
}

// Atualiza a cada 3 segundos
setInterval(carregarChamadas, 3000);
carregarChamadas();
