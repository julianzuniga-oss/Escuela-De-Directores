(async function () {
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
    const leader = rows.find((r) => r.total > 0);
    document.getElementById("banner").innerHTML = leader
      ? '<div class="rank-banner ' + (closed ? "winner" : "") + '"><div class="rb-lbl">' + (closed ? "Ganador de la Escuela de Directores" : "Líder actual") + '</div><div class="rb-name">' + escapeHtml(leader.name) + '</div><div>' + leader.total + " puntos</div></div>"
      : "";
    document.getElementById("rank-head").innerHTML = "<tr><th>#</th><th>Participante</th>" +
      ESCUELA_SESIONES.map((s) => '<th class="col-ses">S' + s.number + "</th>").join("") + "<th>Total</th></tr>";
    document.getElementById("rank-body").innerHTML = rows.length ? rows.map((r, i) =>
      '<tr class="' + (me && r.id === me.id ? "me" : "") + '"><td data-label="#">' + (i + 1) + '</td><td data-label="Participante">' + escapeHtml(r.name) + "</td>" +
      ESCUELA_SESIONES.map((s) => '<td class="col-ses" data-label="S' + s.number + '">' + (r.bySession[s.number] != null ? r.bySession[s.number] : "–") + "</td>").join("") +
      '<td class="total" data-label="Total">' + r.total + "</td></tr>").join("")
      : '<tr><td colspan="' + (ESCUELA_TOTAL + 3) + '">Aún no hay participantes.</td></tr>';
    document.getElementById("actualizado").textContent = "Actualizado " + new Date().toLocaleTimeString();
  }
  await load();
  setInterval(load, 10000);
})();
