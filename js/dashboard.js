(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader("dashboard.html");
  const first = participant.name.split(" ")[0];
  document.getElementById("welcome-title").textContent = "Hola, " + first;
  document.getElementById("welcome-sub").innerHTML =
    (participant.chapter ? '<span class="chapter-chip">' + escapeHtml(participant.chapter) + "</span> &nbsp; " : "") +
    "Tu camino hacia la dirección: 7 capacitaciones, " + ESCUELA_TOTAL * 1000 + " puntos en juego y un solo ganador.";

  // Si la base de datos fue reiniciada, el navegador puede conservar un participante que ya no existe
  if (DB.isConfigured()) {
    try {
      const rows = await DB.selectWhere("participants", { id: participant.id });
      if (!rows || !rows.length) { Auth.logout(); return; }
    } catch (e) {}
  }

  const lockedMsg = sessionStorage.getItem("edad_locked_msg");
  if (lockedMsg) {
    sessionStorage.removeItem("edad_locked_msg");
    showToast("La Sesión " + lockedMsg + " aún no está habilitada. Se abrirá el día que corresponda.", "warn");
  }

  const [progressRows, settings, ranking] = await Promise.all([
    DB.selectWhere("progress", { participant_id: participant.id }),
    getSessionSettings(),
    buildRanking()
  ]);
  const configured = DB.isConfigured();
  const mine = ranking.rows.find((r) => r.id === participant.id) || { total: 0, bySession: {} };
  const pos = ranking.rows.findIndex((r) => r.id === participant.id) + 1;
  const completed = ESCUELA_SESIONES.filter((s) => {
    const r = progressRows.find((p) => p.session_number === s.number);
    return r && r.status === "completado";
  }).length;

  const C = 2 * Math.PI * 34;
  document.getElementById("stats-row").innerHTML =
    '<div class="stat-card"><div class="ring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="#e8efff" stroke-width="9"/>' +
    '<circle cx="40" cy="40" r="34" fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (completed / ESCUELA_TOTAL * C) + " " + C + '"/>' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b4dff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs></svg>' +
    '<div class="ring-txt">' + completed + "/" + ESCUELA_TOTAL + '</div></div><div><div class="stat-num">' + completed + '</div><div class="stat-lbl">Sesiones completadas</div></div></div>' +
    '<div class="stat-card"><div><div class="stat-num">' + mine.total + '</div><div class="stat-lbl">Mis puntos (de ' + ESCUELA_TOTAL * 1000 + ")</div></div></div>" +
    '<a class="stat-card cta" href="ranking.html"><div><div class="stat-num">' + (pos || "-") + " / " + ranking.rows.length + '</div><div class="stat-lbl">Mi posición · Ver ranking</div></div></a>';

  document.getElementById("session-grid").innerHTML = ESCUELA_SESIONES.map((s) => {
    const open = !configured || !!settings[s.number];
    const row = progressRows.find((p) => p.session_number === s.number);
    const status = row ? row.status : "no_iniciado";
    const pts = mine.bySession[s.number];
    return '<div class="session-card fase-' + s.fase.replace(/\D/g, "") + (open ? "" : " locked") + '">' +
      '<span class="big-n">0' + s.number + "</span>" +
      '<span class="session-number">Sesión ' + s.number + " · " + s.fase + "</span><h3>" + s.title + "</h3>" +
      (s.topics.length ? '<ul class="topic-list">' + s.topics.map((t) => "<li>" + t + "</li>").join("") + "</ul>" : "") +
      '<p class="act">' + s.activity + "</p>" +
      '<div class="card-foot"><span class="status-pill status-' + (open ? status : "bloqueado") + '">' + (open ? statusLabel(status) : "Aún no disponible") + "</span>" +
      '<span class="pts">' + (pts != null ? pts + " pts" : "") + "</span></div>" +
      (open
        ? '<a href="' + s.file + '"><button type="button" class="btn-primary" style="width:100%;">' + (status === "no_iniciado" ? "Comenzar" : status === "en_progreso" ? "Continuar" : "Revisar") + "</button></a>"
        : '<button type="button" class="btn-secondary" style="width:100%;" disabled>Bloqueada</button>') +
      "</div>";
  }).join("");
})();
