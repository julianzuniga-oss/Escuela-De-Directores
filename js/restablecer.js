(function () {
  const $ = (id) => document.getElementById(id);
  const msg = $("auth-msg");
  function say(t, k) { msg.textContent = t || ""; msg.className = "auth-msg " + (k || ""); }
  const client = DB.getClient();
  let shown = false;
  function showForm() { if (shown) return; shown = true; $("form-new").hidden = false; $("wait").hidden = true; }
  if (!client) { say("Supabase no está configurado.", "error"); return; }
  client.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY" || ev === "SIGNED_IN") showForm(); });
  client.auth.getSession().then(({ data }) => { if (data.session) showForm(); });
  setTimeout(() => { if (!shown) { $("wait").hidden = true; say("El enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de ingreso.", "error"); } }, 3500);

  $("form-new").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const a = $("new-pass").value, b = $("new-pass2").value;
    if (a.length < 8) { say("La contraseña debe tener al menos 8 caracteres.", "error"); return; }
    if (a !== b) { say("Las contraseñas no coinciden.", "error"); return; }
    const btn = ev.target.querySelector("button[type=submit]"); btn.disabled = true;
    try { await Auth.updatePassword(a); say("Contraseña actualizada. Entrando…", "ok"); setTimeout(() => (location.href = "index.html"), 1200); }
    catch (e) { say(e.message, "error"); btn.disabled = false; }
  });
})();
