(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await markInProgressOnce(participant.id, 7);

  const DIM_LABELS = {
    gestion_recursos: "Gestión de recursos",
    liderazgo: "Liderazgo",
    comunicacion: "Comunicación",
    planeacion: "Planeación",
    organizacion: "Organización",
    delegacion: "Delegación"
  };

  const bank = await fetch("data/preguntas.json").then((r) => r.json());
  const data = bank.sesion7;
  let cargoElegido = "";

  document.getElementById("empezar-caso").addEventListener("click", () => {
    cargoElegido = document.getElementById("cargo-select").value;
    document.getElementById("cargo-card").style.display = "none";
    document.getElementById("quiz-card").style.display = "block";
    document.getElementById("quiz-container").innerHTML = `<div class="quiz-contexto"><strong>Cargo asumido: ${cargoElegido}.</strong> ${data.contexto_general}</div>`;

    const holder = document.createElement("div");
    document.getElementById("quiz-container").appendChild(holder);
    holder.id = "quiz-inner";

    const quiz = new QuizEngine({
      containerId: "quiz-inner",
      questions: data.preguntas,
      mode: "combined",
      onComplete: async (result) => {
        await DB.insert("evaluations", {
          participant_id: participant.id,
          session: 7,
          answers: result.answers,
          score: result.correct,
          total: result.total,
          percentage: result.percentage,
          time_seconds: result.time_seconds
        });

        document.getElementById("quiz-card").style.display = "none";
        document.getElementById("resultado-card").style.display = "block";
        document.getElementById("resultado-container").innerHTML = `
          <div class="resultado-metric"><span>Cargo asumido</span><strong>${cargoElegido}</strong></div>
          <div class="resultado-metric"><span>Decisiones acertadas</span><strong>${result.correct} de ${result.total}</strong></div>
          <div class="resultado-metric"><span>Decisiones por revisar</span><strong>${result.toReview}</strong></div>
          <div class="resultado-metric"><span>Capacidad de análisis</span><strong>${result.percentage}%</strong></div>
        `;
        document.getElementById("perfil-container").innerHTML =
          `<h3>Gestión por dimensión</h3>` +
          Object.entries(result.profile)
            .map(
              ([dim, val]) => `
            <div class="skill-bar-row">
              <div class="skill-bar-label"><span>${DIM_LABELS[dim] || dim}</span><span>${val}/100</span></div>
              <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${val}%"></div></div>
            </div>`
            )
            .join("");

        await setSessionStatus(participant.id, 7, "completado");
        showToast("Has completado la Sesión 7.", "success");
      }
    });
    quiz.start();
  });

  document.getElementById("finalizar-btn").addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
})();
