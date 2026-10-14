(async function () {
  // Requiere haber ingresado (participante o administrador)
  if (DB.isConfigured()) {
    const ok = await Auth.hasSession();
    if (!ok) { location.href = "index.html"; return; }
  }
  renderHeader("ranking.html");
  const me = Auth.getCurrentParticipant();
  const params = new URLSearchParams(location.search);

  function setProyeccion(on) {
    document.body.classList.toggle("proyeccion", on);
    const u = new URL(location.href);
    if (on) u.searchParams.set("proyeccion", "1"); else u.searchParams.delete("proyeccion");
    history.replaceState(null, "", u);
  }
  document.getElementById("proy-btn").addEventListener("click", () => setProyeccion(true));
  document.getElementById("proy-exit").addEventListener("click", () => setProyeccion(false));
  if (params.get("proyeccion") === "1") setProyeccion(true);

  async function load() {
    const [{ rows }, settings] = await Promise.all([buildRanking(), getSessionSettings()]);
    const closed = !!settings[ESCUELA_CIERRE_KEY];
    const ranked = rows.filter((r) => r.total > 0);
    const leader = ranked[0];

    document.getElementById("banner").innerHTML = closed && leader
      ? '<div class="rank-banner winner card"><div class="rb-lbl">Ganador de la Escuela de Directores</div><div class="rb-name">' + escapeHtml(leader.name) + (leader.chapter ? " · " + escapeHtml(leader.chapter) : "") + "</div><div>" + leader.total + " puntos</div></div>"
      : "";

    const slot = (i, cls) => {
      const r = ranked[i];
      return r
        ? '<div class="pod ' + cls + '"><div class="pn">' + (i + 1) + '</div><div class="nm">' + escapeHtml(r.name) + '</div><div class="ch">' + escapeHtml(r.chapter || "") + '</div><div class="pt">' + r.total + " pts</div></div>"
        : '<div class="pod ' + cls + ' empty"><div class="pn">' + (i + 1) + '</div><div class="nm">—</div></div>';
    };
    document.getElementById("podium").innerHTML = slot(1, "p2") + slot(0, "p1") + slot(2, "p3");

    const byCh = {};
    rows.forEach((r) => { const k = r.chapter || "Sin capítulo"; (byCh[k] = byCh[k] || { n: 0, t: 0 }); byCh[k].n++; byCh[k].t += r.total; });
    document.getElementById("chapters").innerHTML = Object.entries(byCh)
      .map(([k, v]) => ({ k, n: v.n, avg: Math.round(v.t / v.n) }))
      .sort((a, b) => b.avg - a.avg)
      .map((c) => '<div class="chapter-card"><div class="cn">' + escapeHtml(c.k) + '</div><div class="ca">' + c.avg + '</div><small>promedio por asociado · ' + c.n + " participantes</small></div>").join("");

    document.getElementById("rank-head").innerHTML = "<tr><th>#</th><th>Participante</th><th>Capítulo</th>" +
      ESCUELA_SESIONES.map((s) => '<th class="col-ses">S' + s.number + "</th>").join("") + "<th>Total</th></tr>";
    document.getElementById("rank-body").innerHTML = rows.length ? rows.map((r, i) =>
      '<tr class="' + (me && r.id === me.id ? "me" : "") + '"><td data-label="#">' + (i + 1) + '</td><td data-label="Participante">' + escapeHtml(r.name) + '</td><td data-label="Capítulo">' + escapeHtml(r.chapter || "—") + "</td>" +
      ESCUELA_SESIONES.map((s) => '<td class="col-ses" data-label="S' + s.number + '">' + (r.bySession[s.number] != null ? r.bySession[s.number] : "–") + "</td>").join("") +
      '<td class="total" data-label="Total">' + r.total + "</td></tr>").join("")
      : '<tr><td colspan="' + (ESCUELA_TOTAL + 4) + '">Aún no hay participantes.</td></tr>';
    document.getElementById("actualizado").textContent = "Actualizado " + new Date().toLocaleTimeString();
  }
  await load();
  setInterval(load, 10000);
})();
