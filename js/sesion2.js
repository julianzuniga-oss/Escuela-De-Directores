(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await markInProgressOnce(participant.id, 2);

  const CATEGORIES = [
    "Presidencia", "Interventoría", "Junta Capitular",
    "Dirección Académica", "Dirección de Comunicaciones", "Dirección de Desarrollo",
    "Dirección de Finanzas", "Dirección de Mercadeo", "Dirección de Proyectos"
  ];

  const inicial = new MapaBuilder({
    containerId: "mapa-inicial",
    table: "structure_maps",
    participantId: participant.id,
    categories: CATEGORIES,
    extraFilter: { version: "inicial" }
  });
  await inicial.load();

  document.getElementById("continuar-final").addEventListener("click", async () => {
    document.getElementById("bloque-inicial").style.display = "none";
    document.getElementById("bloque-final").style.display = "block";

    const final = new MapaBuilder({
      containerId: "mapa-final",
      table: "structure_maps",
      participantId: participant.id,
      categories: CATEGORIES,
      extraFilter: { version: "final" }
    });
    await final.load();

    document.getElementById("ver-comparacion").addEventListener("click", async () => {
      document.getElementById("bloque-final").style.display = "none";
      document.getElementById("bloque-comparacion").style.display = "block";
      await renderComparacion();
    });
  });

  async function renderComparacion() {
    const inicialItems = await DB.selectWhere("structure_maps", { participant_id: participant.id, version: "inicial" });
    const finalItems = await DB.selectWhere("structure_maps", { participant_id: participant.id, version: "final" });

    const catsInicial = new Set(inicialItems.map((i) => i.category));
    const catsFinal = new Set(finalItems.map((i) => i.category));
    const agregados = [...catsFinal].filter((c) => !catsInicial.has(c)).length;
    const eliminados = [...catsInicial].filter((c) => !catsFinal.has(c)).length;

    document.getElementById("comparacion-resumen").innerHTML = `
      <div class="resultado-metric"><span>Elementos en el mapa inicial</span><strong>${inicialItems.length}</strong></div>
      <div class="resultado-metric"><span>Elementos en el mapa final</span><strong>${finalItems.length}</strong></div>
      <div class="resultado-metric"><span>Categorías nuevas identificadas</span><strong>${agregados}</strong></div>
      <div class="resultado-metric"><span>Categorías que ya no aparecen</span><strong>${eliminados}</strong></div>
      <p class="page-lead" style="margin-top:12px;">Este comparativo no es una calificación: refleja cómo se amplió tu comprensión de la estructura del capítulo durante la sesión.</p>
    `;

    const inicialSolo = new MapaBuilder({
      containerId: "mapa-inicial-solo", table: "structure_maps", participantId: participant.id,
      categories: CATEGORIES, extraFilter: { version: "inicial" }, readOnly: true
    });
    await inicialSolo.load();

    const finalSolo = new MapaBuilder({
      containerId: "mapa-final-solo", table: "structure_maps", participantId: participant.id,
      categories: CATEGORIES, extraFilter: { version: "final" }, readOnly: true
    });
    await finalSolo.load();
  }

  document.getElementById("finalizar-btn").addEventListener("click", async () => {
    await setSessionStatus(participant.id, 2, "completado");
    showToast("Has completado la Sesión 2.", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 900);
  });
})();
