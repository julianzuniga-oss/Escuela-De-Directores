(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await markInProgressOnce(participant.id, 5);

  const SCORING = { acierto: 100, error: -10 };

  const direcciones = await fetch("data/direcciones.json").then((r) => r.json());

  // Construir mazo: una carta con el nombre, otra con la descripción
  let cards = [];
  direcciones.forEach((d, i) => {
    cards.push({ pairId: i, type: "nombre", label: d.nombre });
    cards.push({ pairId: i, type: "descripcion", label: d.descripcion });
  });
  cards = cards.map((c, i) => ({ ...c, uid: i })).sort(() => Math.random() - 0.5);

  let intentos = 0, aciertos = 0, puntuacion = 0;
  let revealed = [];
  let matched = new Set();
  const startTime = Date.now();
  let timerInterval = null;

  function renderGrid() {
    const grid = document.getElementById("memory-grid");
    grid.innerHTML = cards
      .map((c) => {
        const isMatched = matched.has(c.pairId + "-" + c.type) || (matched.has(c.pairId) && false);
        return `<div class="memory-card ${matchedFull(c.pairId) ? "matched" : ""}" data-uid="${c.uid}"></div>`;
      })
      .join("");
    grid.querySelectorAll(".memory-card").forEach((el) => {
      el.addEventListener("click", () => onCardClick(Number(el.dataset.uid)));
    });
  }

  const fullyMatched = new Set();
  function matchedFull(pairId) {
    return fullyMatched.has(pairId);
  }

  function updateStats() {
    document.getElementById("stat-intentos").textContent = intentos;
    document.getElementById("stat-aciertos").textContent = aciertos;
    document.getElementById("stat-puntuacion").textContent = puntuacion;
  }

  function onCardClick(uid) {
    if (revealed.length >= 2) return;
    const card = cards.find((c) => c.uid === uid);
    if (!card || fullyMatched.has(card.pairId) || revealed.some((r) => r.uid === uid)) return;

    const el = document.querySelector(`.memory-card[data-uid="${uid}"]`);
    el.classList.add("revealed");
    el.textContent = card.label;
    revealed.push(card);

    if (revealed.length === 2) {
      intentos += 1;
      const [a, b] = revealed;
      if (a.pairId === b.pairId && a.type !== b.type) {
        aciertos += 1;
        puntuacion += SCORING.acierto;
        fullyMatched.add(a.pairId);
        setTimeout(() => {
          document.querySelectorAll(`.memory-card[data-uid="${a.uid}"], .memory-card[data-uid="${b.uid}"]`).forEach((e) => e.classList.add("matched"));
          revealed = [];
          updateStats();
          checkFinish();
        }, 300);
      } else {
        puntuacion = Math.max(0, puntuacion + SCORING.error);
        setTimeout(() => {
          document.querySelectorAll(`.memory-card[data-uid="${a.uid}"], .memory-card[data-uid="${b.uid}"]`).forEach((e) => {
            e.classList.remove("revealed");
            e.textContent = "";
          });
          revealed = [];
          updateStats();
        }, 700);
      }
    }
    updateStats();
  }

  function checkFinish() {
    if (fullyMatched.size === direcciones.length) {
      clearInterval(timerInterval);
      finishGame();
    }
  }

  timerInterval = setInterval(() => {
    document.getElementById("stat-tiempo").textContent = Math.round((Date.now() - startTime) / 1000) + "s";
  }, 500);

  async function finishGame() {
    const timeSeconds = Math.round((Date.now() - startTime) / 1000);
    await DB.insert("rankings", {
      participant_id: participant.id,
      session: 5,
      score: puntuacion,
      time_seconds: timeSeconds
    });

    document.getElementById("resultado-card").style.display = "block";
    document.getElementById("resultado-texto").textContent =
      `Terminaste con ${puntuacion} puntos, ${aciertos} aciertos en ${intentos} intentos y ${timeSeconds} segundos.`;

    await setSessionStatus(participant.id, 5, "completado");
    showToast("Has completado la Sesión 5.", "success");
    await loadRanking();
  }

  async function loadRanking() {
    const rankings = await DB.selectWhere("rankings", { session: 5 });
    const participants = await DB.selectAll("participants");
    const sorted = rankings
      .slice()
      .sort((a, b) => b.score - a.score || a.time_seconds - b.time_seconds)
      .slice(0, 20);

    document.getElementById("ranking-body").innerHTML = sorted
      .map((r, i) => {
        const p = participants.find((x) => x.id === r.participant_id);
        return `<tr>
          <td data-label="#">${i + 1}</td>
          <td data-label="Participante">${p ? p.name : "Asociado"}</td>
          <td data-label="Puntuación">${r.score}</td>
          <td data-label="Tiempo">${r.time_seconds}s</td>
        </tr>`;
      })
      .join("");
  }

  document.getElementById("finalizar-btn").addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  renderGrid();
  updateStats();
  await loadRanking();
})();
