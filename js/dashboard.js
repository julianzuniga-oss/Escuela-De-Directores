(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;

  renderHeader("dashboard.html");
  document.getElementById("welcome-title").textContent = `Bienvenido, ${participant.name}`;

  const progressRows = await DB.selectWhere("progress", { participant_id: participant.id });

  const completed = progressRows.filter((p) => p.status === "completado").length;
  document.getElementById("progress-label").textContent =
    `Progreso de la Escuela: ${completed}/${APP_CONFIG.TOTAL_SESSIONS} espacios completados`;
  document.getElementById("progress-fill").style.width = `${(completed / APP_CONFIG.TOTAL_SESSIONS) * 100}%`;

  const grid = document.getElementById("session-grid");
  grid.innerHTML = SESSIONS_META.map((s) => {
    const row = progressRows.find((p) => p.session_number === s.number);
    const status = row ? row.status : "no_iniciado";
    return `
      <div class="session-card">
        <span class="session-number">Sesión ${s.number}</span>
        <h3>${s.title}</h3>
        <p>${s.short}</p>
        <span class="status-pill status-${status}">${statusLabel(status)}</span>
        <a href="${s.file}"><button type="button" class="btn-secondary" style="width:100%;">
          ${status === "no_iniciado" ? "Comenzar" : status === "en_progreso" ? "Continuar" : "Revisar"}
        </button></a>
      </div>
    `;
  }).join("");
})();
