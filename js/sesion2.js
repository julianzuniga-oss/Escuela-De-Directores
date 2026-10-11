(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await window.guardReady;
  await markInProgressOnce(participant.id, 2);

  const [bank, logosData] = await Promise.all([
    fetch("data/preguntas.json").then((r) => r.json()),
    fetch("data/logos.json").then((r) => r.json())
  ]);
  let st = await stageState(participant.id, 2);
  const row = (await DB.selectWhere("canvas_maps", { participant_id: participant.id, session: 2, version: "inicial" }))[0] || null;
  const lienzo = document.getElementById("lienzo");
  const statusEl = document.getElementById("save-status");
  let timer = null, editor = null;

  function showKahoot() {
    document.getElementById("stage-kahoot").hidden = false;
    const engine = new KahootEngine({
      containerId: "kahoot-container",
      questions: bank.cargos1.preguntas,
      maxPoints: 700, seconds: 20,
      participant, session: 2, stage: "kahoot",
      title: bank.cargos1.titulo,
      onFinish: async (r) => {
        await finishStage(participant.id, 2, "kahoot", r.points, true);
        await DB.insert("evaluations", { participant_id: participant.id, session: 2, answers: r.answers, score: r.correct, total: r.total, percentage: r.percentage, time_seconds: r.time_seconds });
        await setSessionStatus(participant.id, 2, "completado");
        showToast("Has completado la Sesión 2.", "success");
      },
      onContinue: () => (window.location.href = "dashboard.html"),
      continueLabel: "Volver al dashboard"
    });
    if (st.detail.kahoot_done) engine.renderCompleted(st.detail.kahoot);
    else engine.renderIntro();
  }

  function lockMapa(data) {
    if (editor) editor.destroy();
    lienzo.innerHTML = "";
    editor = new CanvasEditor({ container: lienzo, data, readOnly: true });
    document.getElementById("mapa-acciones").hidden = true;
    document.getElementById("mapa-nota").hidden = false;
  }

  if (st.detail.mapa_done) {
    lockMapa(row && row.data);
    showKahoot();
  } else {
    const saver = createCanvasSaver(participant.id, 2, "inicial", row, (t) => (statusEl.textContent = t));
    editor = new CanvasEditor({
      container: lienzo, data: row && row.data, logos: logosData.logos,
      onChange: (d) => {
        statusEl.textContent = "Cambios sin guardar…";
        clearTimeout(timer);
        timer = setTimeout(() => saver.save(d), 1200);
      }
    });
    document.getElementById("guardar-mapa").addEventListener("click", async () => {
      if (editor.countElements() < 3) { showToast("Agrega al menos 3 elementos a tu mapa para continuar.", "warn"); return; }
      clearTimeout(timer);
      const data = editor.getData();
      await saver.save(data);
      await finishStage(participant.id, 2, "mapa", 300, false);
      st = await stageState(participant.id, 2);
      showToast("Mapa inicial guardado. +300 puntos.", "success");
      lockMapa(data);
      showKahoot();
      document.getElementById("stage-kahoot").scrollIntoView({ behavior: "smooth" });
    });
  }
})();
