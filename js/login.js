(function () {
  const $ = (id) => document.getElementById(id);
  const msg = $("auth-msg");
  function say(text, kind) { msg.textContent = text || ""; msg.className = "auth-msg " + (kind || ""); }

  // capítulos
  const sel = $("reg-chapter");
  sel.innerHTML = '<option value="">Selecciona tu capítulo</option>' + CAPITULOS.map((c) => '<option value="' + c + '">' + c + "</option>").join("");

  // pestañas
  function show(which) {
    ["login", "register", "forgot"].forEach((n) => { $("form-" + n).hidden = n !== which; });
    $("tab-login").classList.toggle("active", which === "login");
    $("tab-register").classList.toggle("active", which === "register");
    $("auth-tabs").hidden = which === "forgot";
    say("");
  }
  $("tab-login").addEventListener("click", () => show("login"));
  $("tab-register").addEventListener("click", () => show("register"));
  $("go-forgot").addEventListener("click", () => show("forgot"));
  $("back-login").addEventListener("click", () => show("login"));

  const m = Auth.mode();
  if (m === "local") $("mode-note").hidden = false;
  if (m === "broken") {
    say("No se pudo cargar la conexión con Supabase. Revisa tu internet o desactiva bloqueadores e intenta de nuevo.", "error");
    document.querySelectorAll(".auth-card form button[type=submit]").forEach((b) => (b.disabled = true));
  }

  // si ya hay sesión, entrar directo
  Auth.restoreFromSession().then((p) => { if (p) window.location.href = "dashboard.html"; }).catch(() => {});

  async function run(btn, label, fn) {
    say("");
    btn.disabled = true; const old = btn.textContent; btn.textContent = label;
    try { await fn(); } catch (e) { say(e.message || "Ocurrió un error. Inténtalo de nuevo.", "error"); }
    btn.disabled = false; btn.textContent = old;
  }

  $("form-login").addEventListener("submit", (ev) => {
    ev.preventDefault();
    run(ev.target.querySelector("button[type=submit]"), "Ingresando…", async () => {
      await Auth.login($("login-email").value, $("login-pass").value);
      window.location.href = "dashboard.html";
    });
  });

  $("form-register").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if ($("reg-pass").value !== $("reg-pass2").value) { say("Las contraseñas no coinciden.", "error"); return; }
    run(ev.target.querySelector("button[type=submit]"), "Creando cuenta…", async () => {
      const r = await Auth.register({ name: $("reg-name").value, chapter: $("reg-chapter").value, email: $("reg-email").value, password: $("reg-pass").value });
      if (r.needsConfirm) { say("Cuenta creada. Te enviamos un correo para confirmarla: ábrelo (revisa también spam) y luego ingresa.", "ok"); return; }
      window.location.href = "dashboard.html";
    });
  });

  $("form-forgot").addEventListener("submit", (ev) => {
    ev.preventDefault();
    run(ev.target.querySelector("button[type=submit]"), "Enviando…", async () => {
      await Auth.resetPassword($("forgot-email").value);
      say("Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.", "ok");
    });
  });
})();
