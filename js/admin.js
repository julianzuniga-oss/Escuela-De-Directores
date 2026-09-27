/**
 * admin.js
 * Requiere Supabase Auth configurado (usuario administrador creado desde
 * el panel de Supabase, no dentro del código). Ver README, sección
 * "Panel administrativo".
 */
(function () {
  const supaReady = DB.init();
  const client = supaReady ? window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY) : null;

  document.getElementById("admin-login-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;
    const errorEl = document.getElementById("admin-error");
    errorEl.textContent = "";

    if (!client) {
      errorEl.textContent = "Supabase no está configurado todavía. Revisa js/config.js.";
      return;
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      errorEl.textContent = "Credenciales incorrectas o usuario no autorizado.";
      return;
    }
    document.getElementById("login-card").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    await loadPanel();
  });

  document.getElementById("admin-logout").addEventListener("click", async () => {
    if (client) await client.auth.signOut();
    window.location.reload();
  });

  async function loadPanel() {
    const [participants, progress, rankings] = await Promise.all([
      DB.selectAll("participants"),
      DB.selectAll("progress"),
      DB.selectWhere("rankings", { session: 5 })
    ]);

    const totalCompleted = progress.filter((p) => p.status === "completado").length;
    const avgProgress = participants.length
      ? Math.round((totalCompleted / (participants.length * APP_CONFIG.TOTAL_SESSIONS)) * 100)
      : 0;

    document.getElementById("resumen-general").innerHTML = `
      <div class="resultado-metric"><span>Participantes activos</span><strong>${participants.length}</strong></div>
      <div class="resultado-metric"><span>Sesiones completadas (total)</span><strong>${totalCompleted}</strong></div>
      <div class="resultado-metric"><span>Progreso promedio de la cohorte</span><strong>${avgProgress}%</strong></div>
    `;

    document.getElementById("participants-body").innerHTML = participants
      .map((p) => {
        const done = progress.filter((pr) => pr.participant_id === p.id && pr.status === "completado").length;
        return `<tr>
          <td data-label="Nombre">${p.name}</td>
          <td data-label="Ingreso">${p.created_at ? new Date(p.created_at).toLocaleString() : "-"}</td>
          <td data-label="Última actividad">${p.last_activity ? new Date(p.last_activity).toLocaleString() : "-"}</td>
          <td data-label="Sesiones completadas">${done}/${APP_CONFIG.TOTAL_SESSIONS}</td>
        </tr>`;
      })
      .join("");

    const sorted = rankings.slice().sort((a, b) => b.score - a.score || a.time_seconds - b.time_seconds).slice(0, 20);
    document.getElementById("admin-ranking-body").innerHTML = sorted
      .map((r, i) => {
        const p = participants.find((x) => x.id === r.participant_id);
        return `<tr><td data-label="#">${i + 1}</td><td data-label="Participante">${p ? p.name : "Asociado"}</td>
          <td data-label="Puntuación">${r.score}</td><td data-label="Tiempo">${r.time_seconds}s</td></tr>`;
      })
      .join("");

    document.getElementById("export-participants").onclick = () => exportCsv(participants);
  }

  function exportCsv(rows) {
    const header = "nombre,ingreso,ultima_actividad\n";
    const body = rows.map((r) => `"${r.name}","${r.created_at || ""}","${r.last_activity || ""}"`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "participantes_escuela_directores.csv";
    a.click();
  }
})();
