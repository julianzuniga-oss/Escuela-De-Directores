(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await markInProgressOnce(participant.id, 4);

  let accionCount = 0;
  let indicadorCount = 0;
  const asignaciones = {}; // accionIndex -> cuadrante

  function addAccionRow() {
    accionCount += 1;
    const idx = accionCount;
    const div = document.createElement("div");
    div.className = "dynamic-row";
    div.dataset.idx = idx;
    div.innerHTML = `
      <button type="button" class="icon-btn remove" data-idx="${idx}">✕</button>
      <div><label>Acción</label><input type="text" name="accion_${idx}_nombre" required></div>
      <div><label>Responsable</label><input type="text" name="accion_${idx}_responsable" required></div>
      <div><label>Fecha</label><input type="date" name="accion_${idx}_fecha" required></div>
      <div><label>Recurso necesario</label><input type="text" name="accion_${idx}_recurso"></div>
      <div><label>Indicador asociado</label><input type="text" name="accion_${idx}_indicador"></div>
    `;
    document.getElementById("acciones-container").appendChild(div);
    div.querySelector(".remove").addEventListener("click", () => {
      div.remove();
      delete asignaciones[idx];
      renderMatrizSelector();
    });
  }

  function addIndicadorRow() {
    indicadorCount += 1;
    const idx = indicadorCount;
    const div = document.createElement("div");
    div.className = "dynamic-row";
    div.innerHTML = `
      <button type="button" class="icon-btn remove">✕</button>
      <div><label>Nombre</label><input type="text" name="indicador_${idx}_nombre" required></div>
      <div><label>Fórmula / forma de medición</label><input type="text" name="indicador_${idx}_formula" required></div>
      <div><label>Meta</label><input type="text" name="indicador_${idx}_meta" required></div>
    `;
    document.getElementById("indicadores-container").appendChild(div);
    div.querySelector(".remove").addEventListener("click", () => div.remove());
  }

  document.getElementById("add-accion").addEventListener("click", () => { addAccionRow(); renderMatrizSelector(); });
  document.getElementById("add-indicador").addEventListener("click", addIndicadorRow);
  addAccionRow(); addAccionRow();
  addIndicadorRow();
  renderMatrizSelector();

  function getAccionNombres() {
    return [...document.querySelectorAll('[name$="_nombre"]')]
      .filter((el) => el.name.startsWith("accion_"))
      .map((el, i) => ({ idx: el.name.split("_")[1], nombre: el.value || `Acción ${i + 1}` }));
  }

  function renderMatrizSelector() {
    const acciones = getAccionNombres();
    const el = document.getElementById("matriz-selector");
    el.innerHTML = acciones
      .map(
        (a) => `<span class="matriz-item ${asignaciones[a.idx] ? "activo" : ""}" data-idx="${a.idx}">
          ${escapeHtmlLocal(a.nombre || "Acción sin nombre")} ${asignaciones[a.idx] ? `→ Cuadrante ${asignaciones[a.idx]}` : "(sin ubicar)"}
        </span>`
      )
      .join(" ");

    el.querySelectorAll(".matriz-item").forEach((item) => {
      item.addEventListener("click", () => {
        el.querySelectorAll(".matriz-item").forEach((i) => i.classList.remove("seleccionando"));
        item.classList.add("seleccionando");
        showToast("Ahora haz clic en el cuadrante donde ubicas esta acción.", "info");
      });
    });

    document.querySelectorAll(".matriz-priorizacion .celda[data-cuadrante]").forEach((celda) => {
      celda.onclick = () => {
        const seleccionado = el.querySelector(".matriz-item.seleccionando");
        if (!seleccionado) {
          showToast("Primero selecciona una acción de la lista.", "warn");
          return;
        }
        asignaciones[seleccionado.dataset.idx] = celda.dataset.cuadrante;
        renderMatrizSelector();
        pintarMatriz(acciones);
      };
    });
    pintarMatriz(acciones);
  }

  function pintarMatriz(acciones) {
    [1, 2, 3, 4].forEach((c) => (document.getElementById(`cuadrante-${c}`).innerHTML = ""));
    Object.entries(asignaciones).forEach(([idx, cuadrante]) => {
      const accion = acciones.find((a) => a.idx === idx);
      if (!accion) return;
      const cel = document.getElementById(`cuadrante-${cuadrante}`);
      const tag = document.createElement("div");
      tag.className = "matriz-item activo";
      tag.textContent = accion.nombre || "Acción";
      cel.appendChild(tag);
    });
  }

  function escapeHtmlLocal(str) {
    return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  document.getElementById("plan-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);

    const acciones = [];
    document.querySelectorAll("#acciones-container .dynamic-row").forEach((row) => {
      const idx = row.dataset.idx;
      acciones.push({
        accion: fd.get(`accion_${idx}_nombre`),
        responsable: fd.get(`accion_${idx}_responsable`),
        fecha: fd.get(`accion_${idx}_fecha`),
        recurso: fd.get(`accion_${idx}_recurso`),
        indicador: fd.get(`accion_${idx}_indicador`),
        cuadrante: asignaciones[idx] || null
      });
    });

    const indicadores = [];
    document.querySelectorAll("#indicadores-container .dynamic-row").forEach((row, i) => {
      const idx = i + 1;
      const nombre = fd.get(`indicador_${idx}_nombre`);
      if (nombre) {
        indicadores.push({
          nombre,
          formula: fd.get(`indicador_${idx}_formula`),
          meta: fd.get(`indicador_${idx}_meta`)
        });
      }
    });

    const plan = {
      participant_id: participant.id,
      problem: fd.get("problema"),
      general_objective: fd.get("objetivo_general"),
      specific_objectives: [fd.get("obj_esp_1"), fd.get("obj_esp_2"), fd.get("obj_esp_3")],
      actions: acciones,
      indicators: indicadores,
      priority_matrix: asignaciones
    };

    const saved = await DB.insert("strategic_plans", plan);
    showToast("Actividad guardada correctamente.", "success");
    renderResumen(plan);
  });

  function renderResumen(plan) {
    document.getElementById("resumen-card").style.display = "block";
    document.getElementById("resumen-container").innerHTML = `
      <h3>Problema principal</h3><p>${plan.problem}</p>
      <h3>Objetivo general</h3><p>${plan.general_objective}</p>
      <h3>Objetivos específicos</h3>
      <ul>${plan.specific_objectives.map((o) => `<li>${o}</li>`).join("")}</ul>
      <h3>Acciones</h3>
      <table class="ranking-table">
        <thead><tr><th>Acción</th><th>Responsable</th><th>Fecha</th><th>Recurso</th><th>Cuadrante</th></tr></thead>
        <tbody>${plan.actions
          .map(
            (a) => `<tr><td data-label="Acción">${a.accion}</td><td data-label="Responsable">${a.responsable}</td>
            <td data-label="Fecha">${a.fecha}</td><td data-label="Recurso">${a.recurso || "-"}</td>
            <td data-label="Cuadrante">${a.cuadrante || "-"}</td></tr>`
          )
          .join("")}</tbody>
      </table>
      <h3>Indicadores</h3>
      <table class="ranking-table">
        <thead><tr><th>Nombre</th><th>Fórmula</th><th>Meta</th></tr></thead>
        <tbody>${plan.indicators
          .map((i) => `<tr><td data-label="Nombre">${i.nombre}</td><td data-label="Fórmula">${i.formula}</td><td data-label="Meta">${i.meta}</td></tr>`)
          .join("")}</tbody>
      </table>
    `;
    document.getElementById("resumen-card").scrollIntoView({ behavior: "smooth" });
  }

  document.getElementById("descargar-pdf").addEventListener("click", () => window.print());

  document.getElementById("finalizar-btn").addEventListener("click", async () => {
    await setSessionStatus(participant.id, 4, "completado");
    showToast("Has completado la Sesión 4.", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 900);
  });
})();
