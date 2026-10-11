(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await window.guardReady;
  await markInProgressOnce(participant.id, 6);

  const PERSP = ["Financiera", "Asociados", "Procesos internos", "Aprendizaje y crecimiento"];
  document.querySelectorAll("[data-persp]").forEach((s) => {
    s.innerHTML = PERSP.map((p) => '<option value="' + p + '">' + p + "</option>").join("");
  });
  const st0 = await stageState(participant.id, 6);
  const asign = {};
  let accionN = 0, indN = 0;

  function addAccion() {
    const i = ++accionN;
    const d = document.createElement("div");
    d.className = "dynamic-row"; d.dataset.idx = i;
    d.innerHTML = '<button type="button" class="icon-btn remove">✕</button>' +
      '<div><label>Acción</label><input type="text" name="a' + i + '_nombre" required></div>' +
      '<div><label>Responsable</label><input type="text" name="a' + i + '_resp" required></div>' +
      '<div><label>Fecha</label><input type="date" name="a' + i + '_fecha" required></div>' +
      '<div><label>Recurso necesario</label><input type="text" name="a' + i + '_rec"></div>' +
      '<div><label>Indicador asociado</label><input type="text" name="a' + i + '_ind"></div>';
    document.getElementById("acciones-container").appendChild(d);
    d.querySelector(".remove").addEventListener("click", () => { d.remove(); delete asign[i]; renderSelector(); });
    d.querySelector('[name$="_nombre"]').addEventListener("input", renderSelector);
  }
  function addIndicador() {
    const i = ++indN;
    const d = document.createElement("div");
    d.className = "dynamic-row"; d.dataset.idx = i;
    d.innerHTML = '<button type="button" class="icon-btn remove">✕</button>' +
      '<div><label>Nombre</label><input type="text" name="i' + i + '_nombre" required></div>' +
      '<div><label>Fórmula / forma de medición</label><input type="text" name="i' + i + '_formula" required></div>' +
      '<div><label>Meta</label><input type="text" name="i' + i + '_meta" required></div>' +
      '<div><label>Perspectiva CMI</label><select name="i' + i + '_persp">' + PERSP.map((p) => "<option>" + p + "</option>").join("") + "</select></div>";
    document.getElementById("indicadores-container").appendChild(d);
    d.querySelector(".remove").addEventListener("click", () => d.remove());
  }

  let seleccionada = null;
  function nombres() {
    return [...document.querySelectorAll("#acciones-container .dynamic-row")].map((r) => ({
      idx: r.dataset.idx, nombre: r.querySelector('[name$="_nombre"]').value || "Acción " + r.dataset.idx
    }));
  }
  function renderSelector() {
    const list = nombres();
    const el = document.getElementById("matriz-selector");
    el.innerHTML = list.map((a) =>
      '<span class="matriz-item ' + (asign[a.idx] ? "activo" : "") + (seleccionada === a.idx ? " seleccionando" : "") + '" data-idx="' + a.idx + '">' +
      escapeHtml(a.nombre) + (asign[a.idx] ? " → Cuadrante " + asign[a.idx] : " (sin ubicar)") + "</span> ").join("");
    el.querySelectorAll(".matriz-item").forEach((it) => it.addEventListener("click", () => {
      seleccionada = it.dataset.idx; renderSelector();
      showToast("Ahora toca el cuadrante donde ubicas esta acción.", "info");
    }));
    [1, 2, 3, 4].forEach((c) => (document.getElementById("cuadrante-" + c).innerHTML = ""));
    Object.entries(asign).forEach(([idx, c]) => {
      const a = list.find((x) => x.idx === idx);
      if (!a) return;
      const t = document.createElement("div");
      t.className = "matriz-item activo"; t.textContent = a.nombre;
      document.getElementById("cuadrante-" + c).appendChild(t);
    });
  }
  document.querySelectorAll(".matriz-priorizacion .celda[data-cuadrante]").forEach((c) => c.addEventListener("click", () => {
    if (!seleccionada) { showToast("Primero selecciona una acción de la lista.", "warn"); return; }
    asign[seleccionada] = c.dataset.cuadrante; seleccionada = null; renderSelector();
  }));
  document.getElementById("add-accion").addEventListener("click", () => { addAccion(); renderSelector(); });
  document.getElementById("add-indicador").addEventListener("click", addIndicador);
  addAccion(); addAccion(); addIndicador(); renderSelector();

  function renderResumen(plan) {
    document.getElementById("resumen-card").hidden = false;
    const e = escapeHtml;
    document.getElementById("resumen-container").innerHTML =
      "<h3>Problema principal</h3><p>" + e(plan.problem) + "</p>" +
      "<h3>Objetivo general</h3><p>" + e(plan.general_objective) + "</p>" +
      "<h3>Alineación con el PLANEIAP</h3><p>" + e((plan.priority_matrix || {}).alineacion_planeiap || "-") + "</p>" +
      "<h3>Objetivos específicos</h3><ul>" + plan.specific_objectives.map((o) => "<li>" + e(o.objetivo) + " — <em>" + e(o.perspectiva) + "</em></li>").join("") + "</ul>" +
      "<h3>Acciones</h3><table class='ranking-table'><thead><tr><th>Acción</th><th>Responsable</th><th>Fecha</th><th>Recurso</th><th>Cuadrante</th></tr></thead><tbody>" +
      plan.actions.map((a) => "<tr><td data-label='Acción'>" + e(a.accion) + "</td><td data-label='Responsable'>" + e(a.responsable) + "</td><td data-label='Fecha'>" + e(a.fecha) + "</td><td data-label='Recurso'>" + e(a.recurso || "-") + "</td><td data-label='Cuadrante'>" + e(a.cuadrante || "-") + "</td></tr>").join("") + "</tbody></table>" +
      "<h3>Indicadores</h3><table class='ranking-table'><thead><tr><th>Nombre</th><th>Fórmula</th><th>Meta</th><th>Perspectiva CMI</th></tr></thead><tbody>" +
      plan.indicators.map((i) => "<tr><td data-label='Nombre'>" + e(i.nombre) + "</td><td data-label='Fórmula'>" + e(i.formula) + "</td><td data-label='Meta'>" + e(i.meta) + "</td><td data-label='Perspectiva'>" + e(i.perspectiva) + "</td></tr>").join("") + "</tbody></table>";
  }

  let currentPlan = null;
  document.getElementById("plan-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const acciones = [...document.querySelectorAll("#acciones-container .dynamic-row")].map((r) => {
      const i = r.dataset.idx;
      return { accion: fd.get("a" + i + "_nombre"), responsable: fd.get("a" + i + "_resp"), fecha: fd.get("a" + i + "_fecha"), recurso: fd.get("a" + i + "_rec"), indicador: fd.get("a" + i + "_ind"), cuadrante: asign[i] || null };
    });
    const indicadores = [...document.querySelectorAll("#indicadores-container .dynamic-row")].map((r) => {
      const i = r.dataset.idx;
      return { nombre: fd.get("i" + i + "_nombre"), formula: fd.get("i" + i + "_formula"), meta: fd.get("i" + i + "_meta"), perspectiva: fd.get("i" + i + "_persp") };
    });
    currentPlan = {
      participant_id: participant.id,
      problem: fd.get("problema"), general_objective: fd.get("objetivo_general"),
      specific_objectives: [1, 2, 3].map((n) => ({ objetivo: fd.get("obj_" + n), perspectiva: fd.get("persp_" + n) })),
      actions: acciones, indicators: indicadores,
      priority_matrix: { cuadrantes: asign, alineacion_planeiap: fd.get("planeiap") }
    };
    await DB.insert("strategic_plans", currentPlan);
    showToast("Actividad guardada correctamente.", "success");
    renderResumen(currentPlan);
    document.getElementById("resumen-card").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("descargar-pdf").addEventListener("click", () => window.print());

  async function finalizar() {
    const nAcc = currentPlan ? currentPlan.actions.length : 0;
    await finishStage(participant.id, 6, "plan", 800 + Math.min(200, nAcc * 50), true);
    await setSessionStatus(participant.id, 6, "completado");
    showToast("Has completado la Sesión 6.", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 900);
  }
  document.getElementById("finalizar-btn").addEventListener("click", finalizar);

  // Si ya completó la sesión, mostrar su último plan y ocultar el formulario
  if (st0.detail.plan_done) {
    const rows = await DB.selectWhere("strategic_plans", { participant_id: participant.id });
    rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const last = rows[rows.length - 1];
    document.getElementById("plan-form").hidden = true;
    if (last) renderResumen(last);
    const btn = document.getElementById("finalizar-btn");
    btn.textContent = "Volver al dashboard";
    btn.onclick = () => (window.location.href = "dashboard.html");
    btn.replaceWith(btn.cloneNode(true));
    document.getElementById("finalizar-btn").addEventListener("click", () => (window.location.href = "dashboard.html"));
  }
})();
