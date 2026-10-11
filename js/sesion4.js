(async function () {
  const participant = Auth.requireLogin();
  if (!participant) return;
  renderHeader(null);
  await window.guardReady;
  await markInProgressOnce(participant.id, 4);

  const DIM = {
    comunicacion: "Comunicación", liderazgo: "Liderazgo", delegacion: "Delegación",
    resolucion_conflictos: "Resolución de conflictos", organizacion: "Organización",
    adaptabilidad: "Adaptabilidad", creatividad: "Creatividad", inteligencia_emocional: "Inteligencia emocional"
  };
  const bank = await fetch("data/preguntas.json").then((r) => r.json());
  let st = await stageState(participant.id, 4);
  const show = (id, v) => (document.getElementById(id).hidden = !v);

  function topDims(profile, high) {
    return Object.entries(profile).sort((a, b) => (high ? b[1] - a[1] : a[1] - b[1])).slice(0, 2).map(([d]) => d);
  }
  function renderPerfil(profile) {
    show("stage-perfil", true);
    document.getElementById("perfil-container").innerHTML = Object.entries(profile).map(([d, v]) =>
      '<div class="skill-bar-row"><div class="skill-bar-label"><span>' + (DIM[d] || d) + '</span><span>' + v + '/100</span></div>' +
      '<div class="skill-bar-track"><div class="skill-bar-fill" style="width:' + v + '%"></div></div></div>').join("");
    const f = topDims(profile, true).map((d) => DIM[d] || d).join(", ");
    const a = topDims(profile, false).map((d) => DIM[d] || d).join(", ");
    document.getElementById("fortalezas-container").innerHTML =
      "<h3>Fortalezas identificadas</h3><p>" + f + "</p><h3>Aspectos para desarrollar</h3><p>" + a + "</p>" +
      "<h3>Recomendaciones de formación</h3><p>Refuerza estas habilidades asumiendo pequeños liderazgos, pidiendo retroalimentación a tu equipo y practicando en espacios como el foro. Este perfil es una guía de desarrollo, no una evaluación definitiva de tu capacidad para dirigir.</p>";
  }
  function showReflexion() { show("stage-reflexion", true); }
  function showFin() {
    show("stage-reflexion", false); show("stage-fin", true);
    document.getElementById("fin-puntos").textContent = "Puntos de esta sesión: " + (st.row ? st.row.points : 0) + ".";
  }

  async function loadPerfil() {
    const rows = await DB.selectWhere("leadership_profiles", { participant_id: participant.id });
    rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const last = rows[rows.length - 1];
    if (last && last.results) renderPerfil(last.results);
  }

  if (st.detail.reflexion_done) { await loadPerfil(); showFin(); }
  else if (st.detail.kahoot_done) { await loadPerfil(); showReflexion(); }
  else {
    show("stage-kahoot", true);
    const engine = new KahootEngine({
      containerId: "kahoot-container",
      questions: bank.habilidades.preguntas,
      maxPoints: 700, seconds: 25,
      participant, session: 4, stage: "kahoot",
      title: bank.habilidades.titulo,
      onFinish: async (r) => {
        await DB.insert("leadership_profiles", {
          participant_id: participant.id, results: r.profile,
          strengths: topDims(r.profile, true), development_areas: topDims(r.profile, false)
        });
        await finishStage(participant.id, 4, "kahoot", r.points, false);
        await DB.insert("evaluations", { participant_id: participant.id, session: 4, answers: r.answers, score: r.correct, total: r.total, percentage: r.percentage, time_seconds: r.time_seconds });
        window.__perfil = r.profile;
      },
      onContinue: () => { show("stage-kahoot", false); renderPerfil(window.__perfil || {}); showReflexion(); },
      continueLabel: "Ver mi perfil de habilidades"
    });
    engine.renderIntro();
  }

  document.getElementById("reflexion-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const aprendizaje = document.getElementById("aprendizaje").value.trim();
    const compromiso = document.getElementById("compromiso").value.trim();
    if (aprendizaje.length < 30 || compromiso.length < 20) { showToast("Desarrolla un poco más tu reflexión.", "warn"); return; }
    await DB.insert("evaluations", {
      participant_id: participant.id, session: 4,
      answers: { tipo: "reflexion_foro", aprendizaje, compromiso }, score: 0, total: 0, percentage: 0, time_seconds: 0
    });
    await finishStage(participant.id, 4, "reflexion", 300, true);
    await setSessionStatus(participant.id, 4, "completado");
    st = await stageState(participant.id, 4);
    showToast("Has completado la Sesión 4.", "success");
    showFin();
  });
})();
