const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const bootstrap = `<script>
(() => {
  let onAuth;
  let user = null;
  const rows = new Map();
  const files = new Map();
  const deleted = new Map();
  const client = {
    auth: {
      onAuthStateChange(callback) { onAuth = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      async getSession() { return { data: { session: null }, error: null }; },
      async signInWithPassword({ email }) {
        user = { id: 'browser-user', email };
        const session = { user };
        onAuth('SIGNED_IN', session);
        return { data: { session }, error: null };
      },
      async signOut() { user = null; onAuth('SIGNED_OUT', null); return { error: null }; },
    },
    from() { return { select() { return { async eq() { return { data: [...rows.values()], error: null }; } }; } }; },
    rpc(name, args) {
      const removed = deleted.get(args.p_stage_id) || new Set();
      for (const path of args.p_added_photo_paths || []) removed.delete(path);
      for (const path of args.p_removed_photo_paths || []) removed.add(path);
      deleted.set(args.p_stage_id, removed);
      const row = {
        stage_id: args.p_stage_id, done: args.p_done, completed_km: args.p_completed_km,
        date_from: args.p_date_from, date_to: args.p_date_to, note: args.p_note,
        photo_paths: [...new Set([...(rows.get(args.p_stage_id)?.photo_paths || []), ...args.p_photo_paths])].filter(path => !removed.has(path)),
        photo_deleted_paths: [...removed],
      };
      rows.set(row.stage_id, row);
      return { async single() { return { data: row, error: null }; } };
    },
    storage: { from() { return {
      async upload(path, blob) { files.set(path, blob); return { error: null }; },
      async download(path) { return { data: files.get(path), error: null }; },
      async remove(paths) { for (const path of paths) files.delete(path); return { error: null }; },
    }; } },
  };
  window.supabase = { createClient() { return client; } };
  const append = document.head.appendChild.bind(document.head);
  document.head.appendChild = (element) => {
    if (element.tagName === 'SCRIPT' && element.src.startsWith('https://cdn.jsdelivr.net/')) {
      queueMicrotask(() => element.onload());
      return element;
    }
    return append(element);
  };
})();
</script>`;

async function main() {
  const allowed = new Map([
    ['/index.html', ['index.html', 'text/html; charset=utf-8']],
    ['/app.js', ['app.js', 'application/javascript']],
    ['/auth.js', ['auth.js', 'application/javascript']],
    ['/supabase-config.js', ['supabase-config.js', 'application/javascript']],
    ['/styles.css', ['styles.css', 'text/css']],
  ]);
  const server = http.createServer((request, response) => {
    const file = allowed.get(new URL(request.url, 'http://localhost').pathname);
    if (!file) { response.writeHead(404).end(); return; }
    let body = fs.readFileSync(path.join(root, file[0]), 'utf8');
    if (file[0] === 'index.html') body = body.replace('<script src="supabase-config.js">', bootstrap + '<script src="supabase-config.js">');
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' }).end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const checks = path.join(root, '.checks');
  fs.mkdirSync(checks, { recursive: true });
  const profile = fs.mkdtempSync(path.join(checks, 'browser-review-'));
  let chrome;
  let socket;
  let chromeExited;
  const errors = [];
  try {
    const debugUrl = await new Promise((resolve, reject) => {
      chrome = spawn(chromePath, [
        '--headless', '--disable-gpu', '--disable-extensions', '--disable-background-networking',
        '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
        `--user-data-dir=${profile}`, 'about:blank',
      ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
      const timeout = setTimeout(() => reject(new Error('Chrome did not start')), 20000);
      chromeExited = new Promise((done) => chrome.once('exit', done));
      chrome.once('error', (error) => { clearTimeout(timeout); reject(error); });
      chrome.stderr.on('data', (chunk) => {
        const match = chunk.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
    });
    const debugPort = new URL(debugUrl).port;
    const page = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    const requests = new Map();
    let sequence = 0;
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      const pending = requests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        requests.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => { requests.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      requests.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, replMode: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const until = async (expression) => {
      for (let attempt = 0; attempt < 80; attempt++) {
        if (await evaluate(expression)) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`Browser condition not met: ${expression}`);
    };
    const check = async (expression, message) => assert.equal(await evaluate(expression), true, message);
    const viewport = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 860 });
    await send('Runtime.enable');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await viewport(390, 844);
    await send('Page.navigate', { url });
    await until('typeof state !== "undefined" && state.authReady');
    await check('document.querySelectorAll(".stage-button").length === 20', 'All stages must render');
    await check('getComputedStyle(elements.form).display === "none"', 'Empty mobile editor must be hidden');
    await evaluate('window.originalButton = document.querySelector(".stage-button"); window.originalSegment = document.querySelector(".route-segment"); originalButton.click();');
    await check('originalButton.nextElementSibling === elements.form', 'Editor must open directly under the selected stage');
    await check('document.documentElement.scrollWidth <= innerWidth', 'Mobile page must not overflow horizontally');
    await evaluate('elements.note.value = "Rozpracovaný záznam"; elements.completedKm.value = "25.5"; elements.completedKm.dispatchEvent(new Event("input")); document.querySelectorAll(".stage-button")[1].click(); originalButton.click();');
    await check('elements.note.value === "Rozpracovaný záznam" && elements.completedKm.value === "25.5"', 'Changing stages must preserve the draft');
    await evaluate('window.testPng = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="), c => c.charCodeAt(0)); await addPhotos({ target: { files: [new File([testPng], "photo.png", { type: "image/png" })] } }); document.querySelectorAll(".stage-button")[1].click(); originalButton.click();');
    await check('state.pendingPhotos.length === 1 && elements.photoPreview.querySelectorAll("img").length === 1', 'Unsaved photos must survive stage changes');
    await evaluate('elements.photoPreview.querySelector(".photo-open").click();');
    await check('elements.photoDialog.open && elements.photoDialogImage.src.startsWith("data:image/")', 'Guest thumbnail must open a large preview');
    await check('document.documentElement.scrollWidth <= innerWidth', 'Preview must fit a mobile viewport');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await until('!elements.photoDialog.open && !elements.photoDialogImage.getAttribute("src")');
    await evaluate('await addPhotos({ target: { files: [new File([testPng], "second.png", { type: "image/png" })] } }); elements.photoPreview.querySelectorAll(".photo-remove")[1].click();');
    await check('state.pendingPhotos.length === 1', 'Delete must remove only the chosen unsaved photo');
    await check('originalButton === document.querySelector(".stage-button") && originalSegment === document.querySelector(".route-segment")', 'Rendering must preserve map and list nodes');
    await evaluate('await saveEntry();');
    await check('getEntry("n1").completedKm === 25.5 && !getEntry("n1").done', 'Partial progress must save');
    await evaluate('elements.photoPreview.querySelector(".photo-remove").click(); document.querySelectorAll(".stage-button")[1].click(); originalButton.click();');
    await check('state.removedPhotos.length === 1 && !elements.photoPreview.querySelector("img") && getEntry("n1").photos.length === 1', 'Photo deletion must stay in the draft across stage changes');
    await evaluate('await saveEntry();');
    await check('getEntry("n1").photos.length === 0 && JSON.parse(localStorage.getItem(storageKey)).n1.photos.length === 0', 'Saving must persist guest photo deletion');
    await check('mapViews.get("n1").partial.style.display !== "none"', 'Partial route must be visible');
    await check('mapViews.get("n1").partial.getAttribute("stroke-dasharray").split(" ")[0] > 0', 'Partial route must show a positive travelled length');
    await check('getComputedStyle(mapViews.get("n1").partial).stroke === "rgb(198, 91, 22)"', 'Partial progress must use its own color');
    await evaluate('elements.done.checked = true; elements.done.dispatchEvent(new Event("change"));');
    await until('!state.saving');
    await check('getEntry("n1").done && getEntry("n1").completedKm === 110', 'Checkbox must still complete the full stage');
    await evaluate('originalButton.focus(); await saveEntry();');
    await check('document.activeElement === originalButton', 'Saving must preserve keyboard focus');
    await viewport(320, 720);
    await check('document.documentElement.scrollWidth <= innerWidth', 'Small mobile viewport must not overflow horizontally');
    await viewport(1280, 900);
    await until('elements.form.parentElement === elements.content');
    await evaluate('elements.note.value = "Rozepsáno při změně šířky";');
    await viewport(390, 844);
    await until('originalButton.nextElementSibling === elements.form');
    await check('elements.note.value === "Rozepsáno při změně šířky"', 'Responsive layout must preserve edits');
    await evaluate('originalButton.click();');
    await check('getComputedStyle(elements.form).display === "none"', 'Clicking the selected stage must close the mobile editor');
    await evaluate('originalSegment.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));');
    await check('state.selectedId === "n1" && originalButton.nextElementSibling === elements.form', 'Map keyboard selection must open the correct editor');
    await evaluate('elements.completedKm.value = "111"; elements.done.checked = false; await saveEntry();');
    await check('getEntry("n1").completedKm === 110', 'Out-of-range distance must not save');
    await evaluate('document.querySelectorAll(".stage-button")[1].click(); elements.dateFrom.value = "2026-10-03"; elements.dateTo.value = "2026-10-01"; await saveEntry();');
    await check('elements.dateTo.validationMessage.includes("před")', 'Reversed dates must fail validation');
    await evaluate('document.querySelector("#loginBtn").click();');
    await check('document.querySelector("#authDialog").open', 'Real login dialog must open');
    await evaluate('document.querySelector("#authEmail").value = "browser@example.com"; document.querySelector("#authPassword").value = "test-password"; document.querySelector("#authForm").requestSubmit();');
    await until('state.user?.id === "browser-user" && !state.loading');
    await check('state.drafts.size === 0 && !getEntry("n1").done', 'Account login must isolate guest data and drafts');
    await evaluate('originalButton.click(); await addPhotos({ target: { files: [new File([testPng], "cloud.png", { type: "image/png" })] } }); await saveEntry();');
    await until('elements.photoPreview.querySelector("img")?.src.startsWith("blob:")');
    await check('getEntry("n1").photos[0].path.startsWith("browser-user/n1/")', 'Cloud photo must be attached to the signed-in account');
    await evaluate('document.querySelector("#logoutBtn").click();');
    await until('state.user === null && !document.querySelector("#loginBtn").hidden');
    await check('getEntry("n1").done', 'Logout must restore saved guest progress');
    await evaluate('document.querySelector("#loginBtn").click(); document.querySelector("#authPassword").value = "test-password"; document.querySelector("#authForm").requestSubmit();');
    await until('state.user?.id === "browser-user" && !state.loading && elements.photoPreview.querySelector("img")?.src.startsWith("blob:")');
    await check('getEntry("n1").photos.length === 1', 'Account photo must load again through authenticated download');
    await evaluate('elements.photoPreview.querySelector(".photo-open").click();');
    await check('elements.photoDialog.open && elements.photoDialogImage.src.startsWith("blob:")', 'Cloud preview must reuse the private downloaded photo');
    await evaluate('elements.closePhoto.click();');
    await until('!elements.photoDialog.open');
    await evaluate('elements.photoPreview.querySelector(".photo-remove").click(); await saveEntry(); await loadCloudEntries();');
    await check('getEntry("n1").photos.length === 0 && state.photoCache.size === 0', 'Cloud deletion must survive reload and revoke cached images');
    await evaluate('await addPhotos({ target: { files: [new File([testPng], "re-added.png", { type: "image/png" })] } }); await saveEntry();');
    await until('elements.photoPreview.querySelector("img")?.src.startsWith("blob:")');
    await check('getEntry("n1").photos.length === 1', 'A deleted photo can be explicitly added again');
    assert.deepEqual(errors, [], 'Browser must not raise uncaught exceptions');
    console.log('PASS: real Chrome mobile/desktop layout, drafts, progress, login isolation, photo preview/Escape, pending/guest/cloud deletion, deletion retention and re-add');
    await send('Browser.close').catch(() => {});
  } finally {
    socket?.close();
    chrome?.kill();
    if (chromeExited) await Promise.race([chromeExited, new Promise((resolve) => setTimeout(resolve, 3000))]);
    await new Promise((resolve) => server.close(resolve));
    const resolvedProfile = path.resolve(profile);
    if (!resolvedProfile.startsWith(path.resolve(checks) + path.sep)) throw new Error('Unsafe browser profile cleanup path');
    try { fs.rmSync(resolvedProfile, { recursive: true, force: true }); } catch { /* Chrome may still hold temporary files. */ }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
