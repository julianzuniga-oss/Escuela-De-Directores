(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await markInProgressOnce(participant.id, 3);

  const bank = await fetch("data/preguntas.json").then((r) => r.json());
  const data = bank.sesion3;

  const quiz = new QuizEngine({
    containerId: "quiz-container",
    questions: data.preguntas,
    mode: "scored",
    onComplete: async (result) => {
      await DB.insert("evaluations", {
        participant_id: participant.id,
        session: 3,
        answers: result.answers,
        score: result.correct,
        total: result.total,
        percentage: result.percentage,
        time_seconds: result.time_seconds
      });

      document.getElementById("quiz-card").style.display = "none";
      document.getElementById("resultado-card").style.display = "block";
      document.getElementById("resultado-container").innerHTML = `
        <div class="resultado-metric"><span>Respuestas correctas</span><strong>${result.correct} de ${result.total}</strong></div>
        <div class="resultado-metric"><span>Respuestas incorrectas</span><strong>${result.total - result.correct}</strong></div>
        <div class="resultado-metric"><span>Porcentaje</span><strong>${result.percentage}%</strong></div>
        <div class="resultado-metric"><span>Tiempo utilizado</span><strong>${result.time_seconds}s</strong></div>
      `;
      await setSessionStatus(participant.id, 3, "completado");
      showToast("Has completado la Sesión 3.", "success");
    }
  });
  quiz.start();

  document.getElementById("finalizar-btn").addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
})();
