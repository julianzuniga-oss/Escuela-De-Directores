(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await markInProgressOnce(participant.id, 8);

  function accionRow(n) {
    const div = document.createElement("div");
    div.className = "dynamic-row";
    div.innerHTML = `
      <div><label>Acción ${n}</label><input type="text" name="accion_${n}_nombre" required></div>
      <div><label>Responsable</label><input type="text" name="accion_${n}_responsable" required></div>
      <div><label>Tiempo</label><input type="text" name="accion_${n}_tiempo" required placeholder="Ej. 30 días"></div>
      <div><label>Recurso</label><input type="text" name="accion_${n}_recurso"></div>
      <div><label>Indicador</label><input type="text" name="accion_${n}_indicador"></div>
    `;
    return div;
  }
  const cont = document.getElementById("acciones-container");
  [1, 2, 3].forEach((n) => cont.appendChild(accionRow(n)));

  document.getElementById("vision-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);

    const acciones = [1, 2, 3].map((n) => ({
      accion: fd.get(`accion_${n}_nombre`),
      responsable: fd.get(`accion_${n}_responsable`),
      tiempo: fd.get(`accion_${n}_tiempo`),
      recurso: fd.get(`accion_${n}_recurso`),
      indicador: fd.get(`accion_${n}_indicador`)
    }));

    const proyecto = {
      participant_id: participant.id,
      role: fd.get("cargo"),
      motivation: fd.get("motivacion"),
      diagnosis: fd.get("diagnostico"),
      objective: fd.get("objetivo"),
      actions: acciones,
      value_proposition: fd.get("propuesta_valor"),
      risks: fd.get("riesgos"),
      first_90_days: {
        dias_1_30: fd.get("dias_1_30"),
        dias_31_60: fd.get("dias_31_60"),
        dias_61_90: fd.get("dias_61_90")
      },
      reflection: fd.get("reflexion")
    };

    await DB.insert("final_projects", proyecto);
    showToast("Actividad guardada correctamente.", "success");
    renderResumen(proyecto);
  });

  function renderResumen(p) {
    document.getElementById("resumen-card").style.display = "block";
    document.getElementById("resumen-container").innerHTML = `
      <h3>Cargo de interés</h3><p>${p.role}</p>
      <h3>¿Por qué quiero asumir este rol?</h3><p>${p.motivation}</p>
      <h3>Diagnóstico</h3><p>${p.diagnosis}</p>
      <h3>Objetivo</h3><p>${p.objective}</p>
      <h3>Acciones prioritarias</h3>
      <table class="ranking-table">
        <thead><tr><th>Acción</th><th>Responsable</th><th>Tiempo</th><th>Recurso</th><th>Indicador</th></tr></thead>
        <tbody>${p.actions
          .map(
            (a) => `<tr><td data-label="Acción">${a.accion}</td><td data-label="Responsable">${a.responsable}</td>
            <td data-label="Tiempo">${a.tiempo}</td><td data-label="Recurso">${a.recurso || "-"}</td><td data-label="Indicador">${a.indicador || "-"}</td></tr>`
          )
          .join("")}</tbody>
      </table>
      <h3>Mi propuesta de valor</h3><p>${p.value_proposition}</p>
      <h3>Riesgos</h3><p>${p.risks}</p>
      <h3>Primeros 90 días</h3>
      <div class="timeline-90">
        <div class="bloque"><h4>Día 1–30</h4><p>${p.first_90_days.dias_1_30}</p></div>
        <div class="bloque"><h4>Día 31–60</h4><p>${p.first_90_days.dias_31_60}</p></div>
        <div class="bloque"><h4>Día 61–90</h4><p>${p.first_90_days.dias_61_90}</p></div>
      </div>
      <h3>¿Qué tipo de director quiero llegar a ser?</h3><p>${p.reflection}</p>
    `;
    document.getElementById("resumen-card").scrollIntoView({ behavior: "smooth" });
  }

  document.getElementById("descargar-pdf").addEventListener("click", () => window.print());

  document.getElementById("finalizar-btn").addEventListener("click", async () => {
    await setSessionStatus(participant.id, 8, "completado");
    showToast("Has completado la Sesión 8. ¡Cierre de la Escuela de Directores!", "success");
    setTimeout(() => (window.location.href = "resultados.html"), 900);
  });
})();
