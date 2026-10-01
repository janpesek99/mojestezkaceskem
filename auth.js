(() => {
  const ui = Object.fromEntries([
    "accountLabel", "accountStatus", "loginBtn", "registerBtn", "logoutBtn",
    "authDialog", "closeAuthBtn", "authTitle", "authDescription", "authForm",
    "authFields", "authEmailField", "authEmail", "authPasswordField", "authPassword",
    "authPasswordLabel", "authConfirmField", "authConfirm", "authSubmit", "authStatus",
    "forgotPasswordBtn", "switchAuthBtn",
  ].map((id) => [id, document.getElementById(id)]));
  let client = null;
  let mode = "login";
  let busy = false;
  let ready = false;
  let recovery = false;
  let authEventRevision = 0;
  let latestSession = null;
  let authSubscription = null;
  let initializationError = "Připojuji přihlašování…";

  function message(element, text, error = false) {
    element.textContent = text;
    element.classList.toggle("is-error", error);
  }

  function errorMessage(error) {
    const messages = {
      invalid_credentials: "E-mail nebo heslo není správné.",
      email_not_confirmed: "Nejdřív potvrď svůj e-mail odkazem ve zprávě od nás.",
      user_already_exists: "Účet už existuje. Zkus se přihlásit nebo obnovit heslo.",
      weak_password: "Zvol silnější heslo, alespoň 8 znaků.",
      same_password: "Nové heslo musí být jiné než původní.",
      signup_disabled: "Registrace je momentálně vypnutá.",
      over_email_send_rate_limit: "Bylo odesláno příliš mnoho e-mailů. Zkus to později.",
      over_request_rate_limit: "Příliš mnoho pokusů. Chvíli počkej a zkus to znovu.",
      email_address_invalid: "Zkontroluj zadanou e-mailovou adresu.",
      email_address_not_authorized: "Odesílání e-mailů zatím není pro tuto adresu povolené. Je potřeba dokončit nastavení e-mailů.",
      session_not_found: "Přihlášení vypršelo. Vyžádej si nový odkaz nebo se přihlas znovu.",
    };
    return messages[error?.code] || "Akce se nepodařila. Zkontroluj připojení a zkus to znovu.";
  }

  function setMode(nextMode) {
    mode = nextMode;
    const signup = mode === "signup";
    const reset = mode === "reset";
    const update = mode === "update";
    const titles = { login: "Vítej zpátky", signup: "Tvoje cesta začíná tady", reset: "Obnovit heslo", update: "Nastav nové heslo" };
    const descriptions = {
      login: "Přihlas se a pokračuj ve své cestě.",
      signup: "Ukládej dokončené etapy a poznámky do svého účtu.",
      reset: "Pošleme ti odkaz pro nastavení nového hesla.",
      update: "Vyber si nové heslo s alespoň 8 znaky.",
    };
    ui.authTitle.textContent = titles[mode];
    ui.authDescription.textContent = descriptions[mode];
    ui.authEmailField.hidden = update;
    ui.authEmail.disabled = update;
    ui.authPasswordField.hidden = reset;
    ui.authPassword.disabled = reset;
    ui.authPassword.minLength = signup || update ? 8 : 1;
    ui.authPassword.autocomplete = signup || update ? "new-password" : "current-password";
    ui.authPasswordLabel.textContent = signup || update ? "Heslo (alespoň 8 znaků)" : "Heslo";
    ui.authConfirmField.hidden = !(signup || update);
    ui.authConfirm.disabled = !(signup || update);
    ui.authConfirm.required = signup || update;
    ui.authPassword.value = "";
    ui.authConfirm.value = "";
    ui.authConfirm.setCustomValidity("");
    ui.authSubmit.textContent = { login: "Přihlásit se", signup: "Vytvořit účet", reset: "Poslat odkaz", update: "Uložit nové heslo" }[mode];
    ui.authSubmit.disabled = !ready;
    ui.forgotPasswordBtn.hidden = mode !== "login";
    ui.switchAuthBtn.hidden = update;
    ui.switchAuthBtn.textContent = mode === "login" ? "Nemáš účet? Zaregistruj se" : "Zpět na přihlášení";
    message(ui.authStatus, ready ? "" : initializationError, !ready);
  }

  function openDialog(nextMode) {
    if (busy) return;
    setMode(recovery ? "update" : nextMode);
    if (!ui.authDialog.open) ui.authDialog.showModal();
    (mode === "update" ? ui.authPassword : ui.authEmail).focus();
  }

  function announceSession(session) {
    const user = session?.user || null;
    ui.accountLabel.textContent = user ? user.email : "";
    ui.loginBtn.hidden = !!user;
    ui.registerBtn.hidden = !!user;
    ui.logoutBtn.hidden = !user;
    window.dispatchEvent(new CustomEvent("stezka:auth", { detail: { user, client } }));
  }

  ui.loginBtn.addEventListener("click", () => openDialog("login"));
  ui.registerBtn.addEventListener("click", () => openDialog("signup"));
  ui.closeAuthBtn.addEventListener("click", () => { if (!busy) ui.authDialog.close(); });
  ui.authDialog.addEventListener("cancel", (event) => { if (busy) event.preventDefault(); });
  ui.authDialog.addEventListener("close", () => {
    ui.authPassword.value = "";
    ui.authConfirm.value = "";
  });
  ui.switchAuthBtn.addEventListener("click", () => { if (!busy) setMode(mode === "login" ? "signup" : "login"); });
  ui.forgotPasswordBtn.addEventListener("click", () => { if (!busy) setMode("reset"); });
  [ui.authPassword, ui.authConfirm].forEach((input) => input.addEventListener("input", () => ui.authConfirm.setCustomValidity("")));

  ui.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !ready) return;
    if ((mode === "signup" || mode === "update") && ui.authPassword.value !== ui.authConfirm.value) {
      ui.authConfirm.setCustomValidity("Hesla se neshodují.");
      ui.authConfirm.reportValidity();
      return;
    }
    if (!ui.authForm.reportValidity()) return;
    const submittedMode = mode;
    const email = ui.authEmail.value.trim();
    const password = ui.authPassword.value;
    const redirectTo = `${location.origin}${location.pathname}`;
    busy = true;
    ui.authFields.disabled = true;
    ui.closeAuthBtn.disabled = true;
    message(ui.authStatus, "Chvilku prosím…");
    try {
      let result;
      if (submittedMode === "signup") {
        result = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
      } else if (submittedMode === "reset") {
        result = await client.auth.resetPasswordForEmail(email, { redirectTo });
      } else if (submittedMode === "update") {
        result = await client.auth.updateUser({ password });
      } else {
        result = await client.auth.signInWithPassword({ email, password });
      }
      if (result.error) throw result.error;
      ui.authPassword.value = "";
      ui.authConfirm.value = "";
      if (submittedMode === "reset") {
        message(ui.authStatus, "Pokud pro tuto adresu existuje účet, pošleme na ni odkaz. Zkontroluj i spam.");
      } else if (submittedMode === "signup" && !result.data.session) {
        setMode("login");
        message(ui.authStatus, "Zkontroluj e-mail a potvrď registraci. Pokud už máš účet, můžeš se přihlásit.");
      } else {
        if (submittedMode === "update") recovery = false;
        ui.authDialog.close();
        message(ui.accountStatus, submittedMode === "update" ? "Nové heslo je uložené." : "Přihlášení proběhlo úspěšně.");
      }
    } catch (error) {
      message(ui.authStatus, errorMessage(error), true);
    } finally {
      busy = false;
      ui.authFields.disabled = false;
      ui.closeAuthBtn.disabled = false;
      if (recovery && mode !== "update") openDialog("update");
    }
  });

  ui.logoutBtn.addEventListener("click", async () => {
    if (busy || !client) return;
    busy = true;
    ui.logoutBtn.disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
      recovery = false;
      ui.authDialog.close();
      message(ui.accountStatus, "Jsi odhlášený.");
    } catch (error) {
      message(ui.accountStatus, errorMessage(error), true);
    } finally {
      busy = false;
      ui.logoutBtn.disabled = false;
    }
  });

  async function initialize() {
    try {
      if (!/^https?:$/.test(location.protocol)) {
        throw new Error("Pro přihlášení otevři web přes lokální server, například Live Server. Samotný soubor nestačí.");
      }
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/dist/umd/supabase.js";
        const timeout = setTimeout(() => reject(new Error("Přihlášení se nepodařilo načíst. Zkontroluj internet a obnov stránku.")), 15000);
        script.onload = () => { clearTimeout(timeout); resolve(); };
        script.onerror = () => { clearTimeout(timeout); reject(new Error("Přihlášení se nepodařilo načíst. Zkontroluj internet a obnov stránku.")); };
        document.head.appendChild(script);
      });
      const config = window.STEZKA_SUPABASE;
      if (!config?.url || !config?.publishableKey) {
        throw new Error("Chybí nastavení Supabase v souboru supabase-config.js.");
      }
      client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      const listener = client.auth.onAuthStateChange((event, session) => {
        const revision = ++authEventRevision;
        latestSession = session;
        if (event === "PASSWORD_RECOVERY") recovery = true;
        if (event === "SIGNED_OUT") recovery = false;
        // Defer database requests until the Auth callback releases its lock.
        setTimeout(() => {
          if (!ready || revision !== authEventRevision) return;
          announceSession(session);
          if (recovery) openDialog("update");
        }, 0);
      });
      authSubscription = listener?.data?.subscription;
      const revision = authEventRevision;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      ready = true;
      initializationError = "";
      ui.authSubmit.disabled = false;
      announceSession(revision === authEventRevision ? data.session : latestSession);
      if (recovery) openDialog("update");
      const params = new URLSearchParams(location.hash.slice(1));
      if (params.has("error")) {
        message(ui.accountStatus, "Odkaz není platný nebo už vypršel. Vyžádej si nový.", true);
        history.replaceState(null, "", `${location.pathname}${location.search}`);
      }
    } catch (error) {
      ready = false;
      authSubscription?.unsubscribe();
      client = null;
      initializationError = error.message || "Přihlášení se nepodařilo načíst. Obnov stránku a zkus to znovu.";
      message(ui.accountStatus, initializationError, true);
      ui.accountLabel.textContent = "Lokální režim";
      window.dispatchEvent(new CustomEvent("stezka:auth", { detail: { user: null, client: null } }));
      if (ui.authDialog.open) message(ui.authStatus, initializationError, true);
    }
  }

  initialize();
})();
