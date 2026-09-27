(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader("resultados.html");

  // Progreso
  const progress = await DB.selectWhere("progress", { participant_id: participant.id });
  document.getElementById("progreso-lista").innerHTML = SESSIONS_META.map((s) => {
    const row = progress.find((p) => p.session_number === s.number);
    const status = row ? row.status : "no_iniciado";
    return `<div class="resultado-metric"><span>Sesión ${s.number} — ${s.title}</span>
      <span class="status-pill status-${status}">${statusLabel(status)}</span></div>`;
  }).join("");

  // Evaluaciones
  const evaluations = await DB.selectWhere("evaluations", { participant_id: participant.id });
  document.getElementById("evaluaciones-body").innerHTML =
    evaluations
      .map(
        (e) => `<tr>
        <td data-label="Sesión">Sesión ${e.session}</td>
        <td data-label="Resultado">${e.score}/${e.total} (${e.percentage}%)</td>
        <td data-label="Tiempo">${e.time_seconds}s</td>
        <td data-label="Fecha">${e.created_at ? new Date(e.created_at).toLocaleDateString() : "-"}</td>
      </tr>`
      )
      .join("") || `<tr><td colspan="4">Aún no has completado evaluaciones.</td></tr>`;

  // Puntuación / ranking
  const rankings = await DB.selectWhere("rankings", { participant_id: participant.id, session: 5 });
  document.getElementById("puntuacion-container").innerHTML =
    rankings.length > 0
      ? rankings
          .map((r) => `<div class="resultado-metric"><span>Puntuación obtenida</span><strong>${r.score} pts en ${r.time_seconds}s</strong></div>`)
          .join("")
      : `<p class="page-lead">Aún no has jugado el reto de direcciones ANEIAP.</p>`;

  // Propuesta final
  const finals = await DB.selectWhere("final_projects", { participant_id: participant.id });
  document.getElementById("propuesta-container").innerHTML =
    finals.length > 0
      ? `<div class="resultado-metric"><span>Cargo de interés</span><strong>${finals[0].role}</strong></div>
         <p style="margin-top:10px;">${finals[0].reflection}</p>`
      : `<p class="page-lead">Aún no has construido tu propuesta de visión (Sesión 8).</p>`;
})();
