(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await window.guardReady;
  await markInProgressOnce(participant.id, 1);

  const st = await stageState(participant.id, 1);
  const row = (await DB.selectWhere("canvas_maps", { participant_id: participant.id, session: 1, version: "unico" }))[0] || null;
  const statusEl = document.getElementById("save-status");
  let timer = null;
  const saver = createCanvasSaver(participant.id, 1, "unico", row, (t) => (statusEl.textContent = t));
  const editor = new CanvasEditor({
    container: document.getElementById("lienzo"),
    data: row && row.data,
    onChange: (d) => {
      statusEl.textContent = "Cambios sin guardar…";
      clearTimeout(timer);
      timer = setTimeout(() => saver.save(d), 1200);
    }
  });

  if (st.detail.mapa_done) {
    document.getElementById("puntos-info").textContent =
      "Ya completaste esta sesión: " + (st.row ? st.row.points : 0) + " puntos. Puedes seguir editando tu mapa.";
  } else {
    document.getElementById("puntos-info").textContent = "Hasta 1000 puntos: 600 por completar y hasta 400 según los elementos de tu mapa.";
  }

  document.getElementById("guardar-ahora").addEventListener("click", async () => {
    clearTimeout(timer);
    await saver.save(editor.getData());
    showToast("Actividad guardada correctamente.", "success");
  });

  // ---------- Mapa colectivo ----------
  async function loadColectivo() {
    const maps = await DB.selectWhere("canvas_maps", { session: 1, version: "unico" });
    const ps = await DB.selectAll("participants");
    const others = maps.filter((m) => m.participant_id !== participant.id && m.data && m.data.nodes && m.data.nodes.length);
    const listEl = document.getElementById("lista-colectiva");
    if (!others.length) {
      listEl.innerHTML = '<p class="page-lead">Todavía no hay mapas de otros asociados para mostrar.</p>';
      return;
    }
    listEl.innerHTML =
      '<table class="ranking-table"><thead><tr><th>Asociado</th><th>Elementos</th><th>Conectores</th><th></th></tr></thead><tbody>' +
      others.map((m) => {
        const p = ps.find((x) => x.id === m.participant_id);
        return '<tr><td data-label="Asociado">' + escapeHtml(p ? p.name : "Asociado") + '</td>' +
          '<td data-label="Elementos">' + m.data.nodes.length + '</td>' +
          '<td data-label="Conectores">' + (m.data.edges || []).length + '</td>' +
          '<td><button type="button" class="btn-secondary btn-ver" data-pid="' + m.participant_id + '">Ver mapa</button></td></tr>';
      }).join("") + "</tbody></table>";
    listEl.querySelectorAll(".btn-ver").forEach((btn) => {
      btn.addEventListener("click", () => {
        const m = others.find((x) => x.participant_id === btn.dataset.pid);
        const p = ps.find((x) => x.id === btn.dataset.pid);
        const det = document.getElementById("mapa-colectivo-detalle");
        det.innerHTML = '<div class="ce-view-label">Mapa de ' + escapeHtml(p ? p.name : "Asociado") + ' (solo lectura)</div><div id="vista-colectiva"></div>';
        new CanvasEditor({ container: document.getElementById("vista-colectiva"), data: m.data, readOnly: true });
        det.scrollIntoView({ behavior: "smooth" });
      });
    });
  }
  loadColectivo();

  document.getElementById("finalizar-btn").addEventListener("click", async () => {
    const n = editor.countElements();
    if (n < 3) { showToast("Agrega al menos 3 elementos a tu mapa antes de finalizar.", "warn"); return; }
    clearTimeout(timer);
    await saver.save(editor.getData());
    const pts = 600 + Math.min(400, n * 50);
    await finishStage(participant.id, 1, "mapa", pts, true);
    await setSessionStatus(participant.id, 1, "completado");
    showToast("Has completado la Sesión 1.", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 900);
  });
})();
