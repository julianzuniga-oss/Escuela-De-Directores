(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader("dashboard.html");
  document.getElementById("welcome-title").textContent = "Bienvenido, " + participant.name;

  const lockedMsg = sessionStorage.getItem("edad_locked_msg");
  if (lockedMsg) {
    sessionStorage.removeItem("edad_locked_msg");
    showToast("La Sesión " + lockedMsg + " aún no está habilitada. Se abrirá el día que corresponda.", "warn");
  }

  // Tras un reset de la base de datos, el navegador puede conservar un participante que ya no existe
  if (DB.isConfigured()) {
    try {
      const rows = await DB.selectWhere("participants", { id: participant.id });
      if (!rows || !rows.length) { Auth.logout(); return; }
    } catch (e) {}
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

  document.getElementById("progress-label").textContent = "Progreso de la Escuela: " + completed + "/" + ESCUELA_TOTAL + " espacios completados";
  document.getElementById("progress-fill").style.width = (completed / ESCUELA_TOTAL * 100) + "%";

  document.getElementById("points-summary").innerHTML =
    '<div class="ps-item"><div class="ps-num">' + mine.total + '</div><div class="ps-lbl">Mis puntos (de ' + ESCUELA_TOTAL * 1000 + ')</div></div>' +
    '<div class="ps-item"><div class="ps-num">' + (pos || "-") + ' / ' + ranking.rows.length + '</div><div class="ps-lbl">Mi posición en el ranking</div></div>' +
    '<a href="ranking.html"><button type="button" class="btn-secondary">Ver ranking general</button></a>';

  document.getElementById("session-grid").innerHTML = ESCUELA_SESIONES.map((s) => {
    const open = !configured || !!settings[s.number];
    const row = progressRows.find((p) => p.session_number === s.number);
    const status = row ? row.status : "no_iniciado";
    const pts = mine.bySession[s.number];
    return '<div class="session-card ' + (open ? "" : "locked") + '">' +
      '<span class="session-number">Sesión ' + s.number + " · " + s.fase + "</span><h3>" + s.title + "</h3>" +
      (s.topics.length ? '<ul class="topic-list">' + s.topics.map((t) => "<li>" + t + "</li>").join("") + "</ul>" : "") +
      '<p class="act">' + s.activity + "</p>" +
      '<div class="card-foot"><span class="status-pill status-' + (open ? status : "bloqueado") + '">' + (open ? statusLabel(status) : "Aún no disponible") + "</span>" +
      '<span class="pts">' + (pts != null ? pts + " pts" : "") + "</span></div>" +
      (open
        ? '<a href="' + s.file + '"><button type="button" class="btn-secondary" style="width:100%;">' + (status === "no_iniciado" ? "Comenzar" : status === "en_progreso" ? "Continuar" : "Revisar") + "</button></a>"
        : '<button type="button" class="btn-secondary" style="width:100%;" disabled>Bloqueada</button>') +
      "</div>";
  }).join("");
})();
