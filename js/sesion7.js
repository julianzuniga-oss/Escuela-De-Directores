(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await window.guardReady;
  await markInProgressOnce(participant.id, 7);

  const DIM = { gestion_recursos: "Gestión de recursos", liderazgo: "Liderazgo", comunicacion: "Comunicación", planeacion: "Planeación", organizacion: "Organización", delegacion: "Delegación" };
  const bank = await fetch("data/preguntas.json").then((r) => r.json());
  const data = bank.rol;
  let st = await stageState(participant.id, 7);
  const show = (id, v) => (document.getElementById(id).hidden = !v);

  // Acciones de la visión
  const cont = document.getElementById("acciones-container");
  [1, 2, 3].forEach((n) => {
    const d = document.createElement("div");
    d.className = "dynamic-row";
    d.innerHTML = '<div><label>Acción ' + n + '</label><input type="text" name="a' + n + '_nombre" required></div>' +
      '<div><label>Responsable</label><input type="text" name="a' + n + '_resp" required></div>' +
      '<div><label>Tiempo</label><input type="text" name="a' + n + '_tiempo" required placeholder="Ej. 30 días"></div>' +
      '<div><label>Recurso</label><input type="text" name="a' + n + '_rec"></div>' +
      '<div><label>Indicador</label><input type="text" name="a' + n + '_ind"></div>';
    cont.appendChild(d);
  });

  function renderVision(p) {
    const e = escapeHtml;
    show("resumen-card", true);
    document.getElementById("resumen-container").innerHTML =
      "<h3>Cargo de interés</h3><p>" + e(p.role) + "</p><h3>¿Por qué quiero asumir este rol?</h3><p>" + e(p.motivation) + "</p>" +
      "<h3>Diagnóstico</h3><p>" + e(p.diagnosis) + "</p><h3>Objetivo</h3><p>" + e(p.objective) + "</p>" +
      "<h3>Acciones prioritarias</h3><table class='ranking-table'><thead><tr><th>Acción</th><th>Responsable</th><th>Tiempo</th><th>Recurso</th><th>Indicador</th></tr></thead><tbody>" +
      p.actions.map((a) => "<tr><td data-label='Acción'>" + e(a.accion) + "</td><td data-label='Responsable'>" + e(a.responsable) + "</td><td data-label='Tiempo'>" + e(a.tiempo) + "</td><td data-label='Recurso'>" + e(a.recurso || "-") + "</td><td data-label='Indicador'>" + e(a.indicador || "-") + "</td></tr>").join("") + "</tbody></table>" +
      "<h3>Mi propuesta de valor</h3><p>" + e(p.value_proposition) + "</p><h3>Riesgos</h3><p>" + e(p.risks) + "</p>" +
      "<h3>Primeros 90 días</h3><div class='timeline-90'><div class='bloque'><h4>Día 1–30</h4><p>" + e(p.first_90_days.dias_1_30) + "</p></div><div class='bloque'><h4>Día 31–60</h4><p>" + e(p.first_90_days.dias_31_60) + "</p></div><div class='bloque'><h4>Día 61–90</h4><p>" + e(p.first_90_days.dias_61_90) + "</p></div></div>" +
      "<h3>¿Qué tipo de director quiero llegar a ser?</h3><p>" + e(p.reflection) + "</p>";
  }
  function showFin() {
    show("vision-form", false); show("stage-fin", true);
    document.getElementById("fin-puntos").textContent = "Puntos de esta sesión: " + (st.row ? st.row.points : 0) + ". Revisa dónde quedaste en el ranking general.";
  }
  function showVision() { show("vision-form", true); }

  function startRoles() {
    const cargo = document.getElementById("cargo-select").value;
    document.getElementById("cargo-pick").hidden = true;
    const qs = data.preguntas.map((q) => Object.assign({}, q, { context: "Cargo asumido: " + cargo + ". " + data.contexto_general }));
    const engine = new KahootEngine({
      containerId: "kahoot-container", questions: qs, maxPoints: 600, seconds: 25,
      participant, session: 7, stage: "roles", title: "Director por un día — " + cargo,
      onFinish: async (r) => {
        await finishStage(participant.id, 7, "roles", r.points, false);
        await DB.insert("evaluations", { participant_id: participant.id, session: 7, answers: { cargo, respuestas: r.answers }, score: r.correct, total: r.total, percentage: r.percentage, time_seconds: r.time_seconds });
        document.getElementById("roles-resultado").innerHTML =
          "<h3>Resultado de mi gestión</h3>" +
          '<div class="resultado-metric"><span>Decisiones acertadas</span><strong>' + r.correct + " de " + r.total + "</strong></div>" +
          '<div class="resultado-metric"><span>Decisiones por revisar</span><strong>' + (r.total - r.correct) + "</strong></div>" +
          Object.entries(r.profile).map(([d, v]) => '<div class="skill-bar-row"><div class="skill-bar-label"><span>' + (DIM[d] || d) + "</span><span>" + v + '/100</span></div><div class="skill-bar-track"><div class="skill-bar-fill" style="width:' + v + '%"></div></div></div>').join("");
      },
      onContinue: () => { show("stage-roles", false); showVision(); window.scrollTo({ top: 0, behavior: "smooth" }); },
      continueLabel: "Continuar a mi visión de dirección"
    });
    engine.start();
  }

  if (st.detail.vision_done) {
    show("stage-roles", false);
    const rows = await DB.selectWhere("final_projects", { participant_id: participant.id });
    rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    if (rows.length) renderVision(rows[rows.length - 1]);
    showFin();
  } else if (st.detail.roles_done) {
    show("stage-roles", false); showVision();
  } else {
    const engineIntro = document.createElement("div");
    engineIntro.innerHTML = '<p class="page-lead">Caso: ' + escapeHtml(data.contexto_general) + '</p><button type="button" class="btn-primary" id="empezar-roles" style="width:auto;">Comenzar el juego de roles</button>';
    document.getElementById("cargo-pick").appendChild(engineIntro);
    document.getElementById("empezar-roles").addEventListener("click", startRoles);
  }

  document.getElementById("descargar-pdf").addEventListener("click", () => window.print());

  document.getElementById("vision-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const acciones = [1, 2, 3].map((n) => ({ accion: fd.get("a" + n + "_nombre"), responsable: fd.get("a" + n + "_resp"), tiempo: fd.get("a" + n + "_tiempo"), recurso: fd.get("a" + n + "_rec"), indicador: fd.get("a" + n + "_ind") }));
    const proyecto = {
      participant_id: participant.id, role: fd.get("cargo"), motivation: fd.get("motivacion"), diagnosis: fd.get("diagnostico"),
      objective: fd.get("objetivo"), actions: acciones, value_proposition: fd.get("propuesta_valor"), risks: fd.get("riesgos"),
      first_90_days: { dias_1_30: fd.get("dias_1_30"), dias_31_60: fd.get("dias_31_60"), dias_61_90: fd.get("dias_61_90") },
      reflection: fd.get("reflexion")
    };
    await DB.insert("final_projects", proyecto);
    await finishStage(participant.id, 7, "vision", 400, true);
    await setSessionStatus(participant.id, 7, "completado");
    st = await stageState(participant.id, 7);
    showToast("Has completado la Sesión 7 y la Escuela de Directores.", "success");
    renderVision(proyecto);
    showFin();
    document.getElementById("resumen-card").scrollIntoView({ behavior: "smooth" });
  });
})();
