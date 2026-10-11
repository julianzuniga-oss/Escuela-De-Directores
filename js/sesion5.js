(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await window.guardReady;
  await markInProgressOnce(participant.id, 5);
  const bank = await fetch("data/preguntas.json").then((r) => r.json());
  const st = await stageState(participant.id, 5);

  const engine = new KahootEngine({
    containerId: "kahoot-container",
    questions: bank.normativa.preguntas,
    maxPoints: 1000, seconds: 20,
    participant, session: 5, stage: "kahoot",
    title: bank.normativa.titulo,
    onFinish: async (r) => {
      await finishStage(participant.id, 5, "kahoot", r.points, true);
      await DB.insert("evaluations", { participant_id: participant.id, session: 5, answers: r.answers, score: r.correct, total: r.total, percentage: r.percentage, time_seconds: r.time_seconds });
      await setSessionStatus(participant.id, 5, "completado");
      showToast("Has completado la Sesión 5.", "success");
      document.getElementById("stage-fin").hidden = false;
    }
  });
  if (st.detail.kahoot_done) { engine.renderCompleted(st.detail.kahoot); document.getElementById("stage-fin").hidden = false; }
  else engine.renderIntro();
})();
