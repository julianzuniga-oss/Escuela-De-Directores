(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);

  const CATEGORIES = [
    "Liderazgo", "Responsabilidad", "Equipo", "Toma de decisiones",
    "Comunicación", "Tiempo", "Resultados", "Desarrollo personal", "Asociación"
  ];

  await markInProgressOnce(participant.id, 1);

  const builder = new MapaBuilder({
    containerId: "mapa-individual",
    table: "expectation_maps",
    participantId: participant.id,
    categories: CATEGORIES
  });
  await builder.load();

  // ---------- Panel colectivo ----------
  async function loadColectivo() {
    const allMaps = await DB.selectAll("expectation_maps");
    const allParticipants = await DB.selectAll("participants");

    const byParticipant = {};
    allMaps.forEach((item) => {
      if (item.participant_id === participant.id) return; // el propio ya se ve arriba
      byParticipant[item.participant_id] = byParticipant[item.participant_id] || [];
      byParticipant[item.participant_id].push(item);
    });

    const listaEl = document.getElementById("lista-colectiva");
    const ids = Object.keys(byParticipant);

    if (ids.length === 0) {
      listaEl.innerHTML = `<p class="page-lead">Todavía no hay mapas de otros asociados para mostrar.</p>`;
      return;
    }

    listaEl.innerHTML = `
      <table class="ranking-table">
        <thead><tr><th>Asociado</th><th>Categorías</th><th>N.º de expectativas</th><th></th></tr></thead>
        <tbody>
          ${ids
            .map((pid) => {
              const p = allParticipants.find((x) => x.id === pid);
              const items = byParticipant[pid];
              const cats = [...new Set(items.map((i) => i.category))];
              return `<tr>
                <td data-label="Asociado">${p ? escapeHtml(p.name) : "Asociado"}</td>
                <td data-label="Categorías">${cats.length}</td>
                <td data-label="N.º de expectativas">${items.length}</td>
                <td><button type="button" class="btn-secondary btn-ver-mapa" data-pid="${pid}">Ver mapa</button></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    `;

    listaEl.querySelectorAll(".btn-ver-mapa").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = btn.dataset.pid;
        const readOnlyBuilder = new MapaBuilder({
          containerId: "mapa-colectivo-detalle",
          table: "expectation_maps",
          participantId: pid,
          categories: CATEGORIES,
          readOnly: true
        });
        await readOnlyBuilder.load();
      });
    });
  }
  await loadColectivo();

  document.getElementById("finalizar-btn").addEventListener("click", async () => {
    if (builder.count() === 0) {
      showToast("Agrega al menos una expectativa antes de finalizar la sesión.", "warn");
      return;
    }
    await setSessionStatus(participant.id, 1, "completado");
    showToast("Has completado la Sesión 1.", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 900);
  });
})();
