(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await markInProgressOnce(participant.id, 6);

  const DIM_LABELS = {
    comunicacion: "Comunicación",
    liderazgo: "Liderazgo",
    delegacion: "Delegación",
    resolucion_conflictos: "Resolución de conflictos",
    organizacion: "Organización",
    adaptabilidad: "Adaptabilidad",
    creatividad: "Creatividad",
    inteligencia_emocional: "Inteligencia emocional"
  };

  const bank = await fetch("data/preguntas.json").then((r) => r.json());
  const data = bank.sesion6;

  const quiz = new QuizEngine({
    containerId: "quiz-container",
    questions: data.preguntas,
    mode: "skills",
    onComplete: async (result) => {
      await DB.insert("leadership_profiles", {
        participant_id: participant.id,
        results: result.profile,
        strengths: topDims(result.profile, true),
        development_areas: topDims(result.profile, false)
      });

      document.getElementById("quiz-card").style.display = "none";
      document.getElementById("resultado-card").style.display = "block";

      document.getElementById("perfil-container").innerHTML = Object.entries(result.profile)
        .map(
          ([dim, val]) => `
        <div class="skill-bar-row">
          <div class="skill-bar-label"><span>${DIM_LABELS[dim] || dim}</span><span>${val}/100</span></div>
          <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${val}%"></div></div>
        </div>`
        )
        .join("");

      const fortalezas = topDims(result.profile, true);
      const areas = topDims(result.profile, false);
      document.getElementById("fortalezas-container").innerHTML = `
        <h3>Fortalezas identificadas</h3>
        <p>${fortalezas.map((d) => DIM_LABELS[d] || d).join(", ") || "Sigue practicando para identificar tus fortalezas."}</p>
        <h3>Aspectos para desarrollar</h3>
        <p>${areas.map((d) => DIM_LABELS[d] || d).join(", ") || "—"}</p>
        <h3>Recomendaciones de formación</h3>
        <p>Refuerza estas habilidades participando en comités, asumiendo pequeños liderazgos y buscando retroalimentación constante de tu equipo. Este resultado es una guía de desarrollo, no una evaluación definitiva de tu capacidad para dirigir.</p>
      `;

      await setSessionStatus(participant.id, 6, "completado");
      showToast("Has completado la Sesión 6.", "success");
    }
  });
  quiz.start();

  function topDims(profile, high) {
    const sorted = Object.entries(profile).sort((a, b) => (high ? b[1] - a[1] : a[1] - b[1]));
    return sorted.slice(0, 2).map(([dim]) => dim);
  }

  document.getElementById("finalizar-btn").addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
})();
