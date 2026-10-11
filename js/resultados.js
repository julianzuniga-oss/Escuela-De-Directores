(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader("resultados.html");

  const [progress, ranking, evaluations, plans, finals] = await Promise.all([
    DB.selectWhere("progress", { participant_id: participant.id }),
    buildRanking(),
    DB.selectWhere("evaluations", { participant_id: participant.id }),
    DB.selectWhere("strategic_plans", { participant_id: participant.id }),
    DB.selectWhere("final_projects", { participant_id: participant.id })
  ]);
  const mine = ranking.rows.find((r) => r.id === participant.id) || { total: 0, bySession: {} };
  const pos = ranking.rows.findIndex((r) => r.id === participant.id) + 1;

  document.getElementById("progreso-lista").innerHTML =
    '<div class="resultado-metric"><span><strong>Puntos totales</strong> · posición ' + (pos || "-") + " de " + ranking.rows.length + "</span><strong>" + mine.total + "</strong></div>" +
    ESCUELA_SESIONES.map((s) => {
      const row = progress.find((p) => p.session_number === s.number);
      const status = row ? row.status : "no_iniciado";
      const pts = mine.bySession[s.number];
      return '<div class="resultado-metric"><span>Sesión ' + s.number + " — " + s.title + '</span><span><span class="status-pill status-' + status + '">' + statusLabel(status) + "</span> &nbsp; <strong>" + (pts != null ? pts + " pts" : "–") + "</strong></span></div>";
    }).join("");

  const evs = evaluations.filter((e) => e.total > 0);
  document.getElementById("evaluaciones-body").innerHTML = evs.length
    ? evs.map((e) => {
        const s = ESCUELA_SESIONES.find((x) => x.number === e.session);
        return "<tr><td data-label='Sesión'>" + (s ? s.title : "Sesión " + e.session) + "</td><td data-label='Resultado'>" + e.score + "/" + e.total + " (" + e.percentage + "%)</td><td data-label='Tiempo'>" + e.time_seconds + "s</td><td data-label='Fecha'>" + (e.created_at ? new Date(e.created_at).toLocaleDateString() : "-") + "</td></tr>";
      }).join("")
    : '<tr><td colspan="4">Aún no has completado retos.</td></tr>';

  document.getElementById("puntuacion-container").innerHTML = plans.length
    ? '<div class="resultado-metric"><span>Plan de gestión (Sesión 6)</span><strong>Registrado</strong></div><p>' + escapeHtml(plans[plans.length - 1].problem) + "</p>"
    : '<p class="page-lead">Aún no has construido tu plan de gestión (Sesión 6).</p>';

  document.getElementById("propuesta-container").innerHTML = finals.length
    ? '<div class="resultado-metric"><span>Cargo de interés</span><strong>' + escapeHtml(finals[finals.length - 1].role) + "</strong></div><p style='margin-top:10px;'>" + escapeHtml(finals[finals.length - 1].reflection) + "</p>"
    : '<p class="page-lead">Aún no has construido tu visión de dirección (Sesión 7).</p>';
})();
