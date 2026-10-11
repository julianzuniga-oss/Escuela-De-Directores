(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await window.guardReady;
  await markInProgressOnce(participant.id, 3);

  const [bank, logosData, refData] = await Promise.all([
    fetch("data/preguntas.json").then((r) => r.json()),
    fetch("data/logos.json").then((r) => r.json()),
    fetch("data/estructura_referencia.json").then((r) => r.json())
  ]);
  const ref = refData.elementos;
  let st = await stageState(participant.id, 3);
  const initialRow = (await DB.selectWhere("canvas_maps", { participant_id: participant.id, session: 2, version: "inicial" }))[0] || null;
  let finalRow = (await DB.selectWhere("canvas_maps", { participant_id: participant.id, session: 2, version: "final" }))[0] || null;
  const show = (id, v) => (document.getElementById(id).hidden = !v);

  function showKahoot() {
    show("stage-kahoot", true);
    const engine = new KahootEngine({
      containerId: "kahoot-container",
      questions: bank.cargos2.preguntas,
      maxPoints: 600, seconds: 20,
      participant, session: 3, stage: "kahoot",
      title: bank.cargos2.titulo,
      onFinish: async (r) => {
        await finishStage(participant.id, 3, "kahoot", r.points, false);
        await DB.insert("evaluations", { participant_id: participant.id, session: 3, answers: r.answers, score: r.correct, total: r.total, percentage: r.percentage, time_seconds: r.time_seconds });
      },
      onContinue: () => { show("stage-kahoot", false); showMapaFinal(); },
      continueLabel: "Continuar al mapa final"
    });
    if (st.detail.kahoot_done) engine.renderCompleted(st.detail.kahoot);
    else engine.renderIntro();
  }

  function showMapaFinal() {
    show("stage-mapa", true);
    const statusEl = document.getElementById("save-status");
    let timer = null;
    const saver = createCanvasSaver(participant.id, 2, "final", finalRow, (t) => (statusEl.textContent = t));
    const editor = new CanvasEditor({
      container: document.getElementById("lienzo"), data: finalRow && finalRow.data, logos: logosData.logos,
      onChange: (d) => {
        statusEl.textContent = "Cambios sin guardar…";
        clearTimeout(timer);
        timer = setTimeout(() => saver.save(d), 1200);
      }
    });
    document.getElementById("copiar-inicial").addEventListener("click", () => {
      if (!initialRow || !initialRow.data || !initialRow.data.nodes.length) { showToast("No encontramos un mapa inicial guardado.", "warn"); return; }
      if (editor.getData().nodes.length) { showToast("Tu lienzo ya tiene elementos. Elimínalos o usa Deshacer para partir de tu mapa inicial.", "warn"); return; }
      editor.setData(initialRow.data);
      showToast("Se cargó tu mapa inicial. Ahora corrígelo con lo aprendido.", "info");
    });
    document.getElementById("guardar-final").addEventListener("click", async () => {
      if (editor.countElements() < 3) { showToast("Agrega al menos 3 elementos a tu mapa final.", "warn"); return; }
      clearTimeout(timer);
      const data = editor.getData();
      await saver.save(data);
      const cmp = compareMaps(initialRow && initialRow.data, data, ref);
      const pts = 250 + Math.round(150 * cmp.idFinal / Math.max(1, cmp.refTotal));
      await finishStage(participant.id, 3, "mapa", pts, true);
      await setSessionStatus(participant.id, 3, "completado");
      showToast("Has completado la Sesión 3.", "success");
      finalRow = saver.row();
      st = await stageState(participant.id, 3);
      show("stage-mapa", false);
      showComparison(data);
    });
  }

  function list(arr) { return arr.length ? arr.map(escapeHtml).join(", ") : "Ninguno"; }

  function showComparison(finalData) {
    show("stage-kahoot", false); show("stage-mapa", false); show("stage-comparacion", true);
    const iData = initialRow && initialRow.data;
    const cmp = compareMaps(iData, finalData, ref);
    const delta = cmp.idFinal - cmp.idInitial;
    document.getElementById("comparacion-resumen").innerHTML =
      '<div class="resultado-metric"><span>Elementos de la estructura identificados</span><strong>' + cmp.idInitial + '/' + cmp.refTotal + ' → ' + cmp.idFinal + '/' + cmp.refTotal + (delta > 0 ? ' (+' + delta + ')' : '') + '</strong></div>' +
      '<div class="resultado-metric"><span>Elementos en el mapa (inicial → final)</span><strong>' + cmp.initialCount + ' → ' + cmp.finalCount + '</strong></div>' +
      '<div class="resultado-metric"><span>Relaciones o conectores (inicial → final)</span><strong>' + cmp.relInitial + ' → ' + cmp.relFinal + '</strong></div>' +
      '<div class="resultado-metric"><span>Elementos agregados</span><strong>' + list(cmp.added) + '</strong></div>' +
      '<div class="resultado-metric"><span>Elementos con relaciones modificadas</span><strong>' + list(cmp.modified) + '</strong></div>' +
      '<div class="resultado-metric"><span>Elementos que ya no aparecen</span><strong>' + list(cmp.removed) + '</strong></div>' +
      '<p class="page-lead" style="margin-top:12px;">Este comparativo no es una calificación: muestra cómo se amplió tu comprensión de la estructura de ANEIAP. Tus puntos totales de la sesión: ' + (st.row ? st.row.points : 0) + '.</p>';
    new CanvasEditor({ container: document.getElementById("vista-inicial"), data: iData, readOnly: true });
    new CanvasEditor({ container: document.getElementById("vista-final"), data: finalData, readOnly: true });
    if (!iData || !iData.nodes || !iData.nodes.length) {
      document.getElementById("vista-inicial").insertAdjacentHTML("beforeend", '<p class="ce-empty">No registraste un mapa inicial en la Sesión 2.</p>');
    }
  }

  if (st.detail.mapa_done && finalRow) showComparison(finalRow.data);
  else if (st.detail.kahoot_done) showMapaFinal();
  else showKahoot();
})();
