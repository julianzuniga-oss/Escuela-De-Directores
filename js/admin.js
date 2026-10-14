/**
 * admin.js — Panel administrativo.
 * Usa Supabase Auth (correo + contraseña de un usuario creado en tu proyecto de Supabase).
 * Las políticas RLS de session_settings solo permiten escribir al correo administrador.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const client = DB.getClient();
  let settings = {};

  function friendlyError(err) {
    const m = (err && err.message) || String(err);
    if (/Invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos. Recuerda: es el usuario creado en Authentication → Users de Supabase, no tu cuenta de Supabase. (" + m + ")";
    if (/Email not confirmed/i.test(m)) return "El correo no está confirmado. En Supabase: Authentication → Users → abre el usuario y confírmalo, o créalo con 'Auto Confirm User'. (" + m + ")";
    if (/Failed to fetch|NetworkError/i.test(m)) return "No hay conexión con Supabase. Revisa SUPABASE_URL en js/config.js. (" + m + ")";
    if (/Invalid API key|apikey/i.test(m)) return "La clave SUPABASE_ANON_KEY de js/config.js no es válida. (" + m + ")";
    return "No fue posible ingresar: " + m;
  }

  if (!client) {
    $("admin-error").textContent = "Supabase no está configurado: abre js/config.js y escribe tu SUPABASE_URL y SUPABASE_ANON_KEY.";
  }

  $("admin-login-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    $("admin-error").textContent = "";
    if (!client) return;
    const { error } = await client.auth.signInWithPassword({ email: $("admin-email").value.trim(), password: $("admin-password").value });
    if (error) { $("admin-error").textContent = friendlyError(error); return; }
    await openPanel();
  });

  $("admin-logout").addEventListener("click", async () => { await client.auth.signOut(); location.reload(); });

  async function openPanel() {
    const { data } = await client.auth.getSession();
    $("login-card").hidden = true;
    $("admin-panel").hidden = false;
    $("admin-user").textContent = "Sesión de administrador: " + ((data.session && data.session.user.email) || "");
    await loadAll();
  }

  async function setSetting(n, value) {
    const { error } = await client.from("session_settings").upsert(
      { session_number: n, unlocked: value, unlocked_at: value ? new Date().toISOString() : null },
      { onConflict: "session_number" }
    );
    if (error) {
      showToast("No se pudo cambiar: " + error.message + ". Revisa que el correo de la política RLS en el SQL sea el tuyo.", "error");
      return false;
    }
    settings[n] = value;
    return true;
  }

  function renderSwitches() {
    $("sessions-switches").innerHTML = ESCUELA_SESIONES.map((s) =>
      '<div class="switch-row"><span><b>Sesión ' + s.number + "</b> — " + s.title + ' <span class="diag">(' + s.fase + ')</span></span>' +
      '<button type="button" class="sw-btn ' + (settings[s.number] ? "sw-on" : "sw-off") + '" data-n="' + s.number + '">' + (settings[s.number] ? "Habilitada" : "Bloqueada") + "</button></div>").join("");
    $("sessions-switches").querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", async () => {
      const n = Number(b.dataset.n);
      if (await setSetting(n, !settings[n])) { renderSwitches(); showToast("Sesión " + n + (settings[n] ? " habilitada." : " bloqueada."), "success"); }
    }));
    const closed = !!settings[ESCUELA_CIERRE_KEY];
    $("close-switch").className = "sw-btn " + (closed ? "sw-on" : "sw-off");
    $("close-switch").textContent = closed ? "Escuela cerrada (ganador declarado)" : "Escuela abierta";
  }

  $("close-switch").addEventListener("click", async () => {
    if (await setSetting(ESCUELA_CIERRE_KEY, !settings[ESCUELA_CIERRE_KEY])) renderSwitches();
  });
  $("unlock-all").addEventListener("click", async () => {
    for (const s of ESCUELA_SESIONES) await setSetting(s.number, true);
    renderSwitches();
  });
  $("lock-all").addEventListener("click", async () => {
    for (const s of ESCUELA_SESIONES) await setSetting(s.number, false);
    renderSwitches();
  });

  let rankingRows = [];
  let emailById = {};
  async function loadAll() {
    const rows = await DB.selectAll("session_settings");
    settings = {};
    rows.forEach((r) => (settings[r.session_number] = !!r.unlocked));
    if (!rows.length) showToast("No se encontró la tabla session_settings. Ejecuta supabase-migracion-v2.sql en Supabase.", "warn");
    renderSwitches();

    const [participants, progress, ranking, emails] = await Promise.all([DB.selectAll("participants"), DB.selectAll("progress"), buildRanking(), DB.selectAll("participant_emails")]);
    emailById = {}; emails.forEach((e) => (emailById[e.participant_id] = e.email));
    rankingRows = ranking.rows;
    const done = progress.filter((p) => p.status === "completado").length;
    const avg = participants.length ? Math.round(done / (participants.length * ESCUELA_TOTAL) * 100) : 0;
    $("resumen-general").innerHTML =
      '<div class="resultado-metric"><span>Participantes registrados</span><strong>' + participants.length + "</strong></div>" +
      '<div class="resultado-metric"><span>Sesiones completadas (total)</span><strong>' + done + "</strong></div>" +
      '<div class="resultado-metric"><span>Progreso promedio de la cohorte</span><strong>' + avg + "%</strong></div>";

    $("admin-rank-head").innerHTML = "<tr><th>#</th><th>Participante</th>" + ESCUELA_SESIONES.map((s) => "<th>S" + s.number + "</th>").join("") + "<th>Total</th></tr>";
    $("admin-rank-body").innerHTML = rankingRows.map((r, i) =>
      "<tr><td data-label='#'>" + (i + 1) + "</td><td data-label='Participante'>" + escapeHtml(r.name) + "</td>" +
      ESCUELA_SESIONES.map((s) => "<td data-label='S" + s.number + "'>" + (r.bySession[s.number] != null ? r.bySession[s.number] : "–") + "</td>").join("") +
      "<td data-label='Total'><b>" + r.total + "</b></td></tr>").join("");

    $("participants-body").innerHTML = participants.map((p) => {
      const d = progress.filter((x) => x.participant_id === p.id && x.status === "completado").length;
      return "<tr><td data-label='Nombre'>" + escapeHtml(p.name) + "</td><td data-label='Capítulo'>" + escapeHtml(p.chapter || "-") + "</td><td data-label='Correo'>" + escapeHtml(emailById[p.id] || "-") +
        "</td><td data-label='Última actividad'>" + (p.last_activity ? new Date(p.last_activity).toLocaleString() : "-") + "</td><td data-label='Sesiones completadas'>" + d + "/" + ESCUELA_TOTAL + "</td></tr>";
    }).join("");
  }

  $("export-ranking").addEventListener("click", () => {
    const head = "posicion,nombre,capitulo,correo," + ESCUELA_SESIONES.map((s) => "s" + s.number).join(",") + ",total\n";
    const body = rankingRows.map((r, i) => [i + 1, '"' + r.name.replace(/"/g, '""') + '"', '"' + (r.chapter || "") + '"', '"' + (emailById[r.id] || "") + '"'].concat(ESCUELA_SESIONES.map((s) => (r.bySession[s.number] != null ? r.bySession[s.number] : 0)), r.total).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + head + body], { type: "text/csv;charset=utf-8;" }));
    a.download = "ranking_escuela_directores.csv";
    a.click();
  });

  // Si ya había una sesión de administrador activa, entrar directo
  if (client) client.auth.getSession().then(({ data }) => { if (data.session) openPanel(); });
})();
