const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function element() {
  const handlers = {};
  return {
    value: '', textContent: '', disabled: false, hidden: false, open: false,
    classList: { toggle() {} },
    addEventListener(name, handler) { (handlers[name] ||= []).push(handler); },
    async emit(name) { for (const handler of handlers[name] || []) await handler({ preventDefault() {} }); },
    showModal() { this.open = true; }, close() { this.open = false; this.emit('close'); },
    focus() {}, setCustomValidity(value) { this.validity = value; },
    reportValidity() { return !this.validity; },
  };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

async function main() {
  const nodes = new Map();
  const node = (id) => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
  let onAuth;
  let lastCall;
  let failLogin = false;
  const session = { user: { id: 'test-user', email: 'test@example.com' } };
  const events = [];
  const client = { auth: {
    onAuthStateChange(callback) { onAuth = callback; },
    getSession: async () => ({ data: { session: null }, error: null }),
    signUp: async (args) => { lastCall = args; return { data: { session: null }, error: null }; },
    signInWithPassword: async (args) => {
      lastCall = args;
      if (failLogin) return { error: { code: 'invalid_credentials' } };
      onAuth('SIGNED_IN', session);
      return { data: { session }, error: null };
    },
    resetPasswordForEmail: async (email, options) => { lastCall = { email, options }; return { error: null }; },
    updateUser: async (args) => { lastCall = args; return { error: null }; },
    signOut: async (args) => { lastCall = args; onAuth('SIGNED_OUT', null); return { error: null }; },
  } };
  const context = vm.createContext({
    window: {
      STEZKA_SUPABASE: { url: 'https://example.supabase.co', publishableKey: 'public-test-key' },
      supabase: { createClient: () => client }, dispatchEvent: (event) => events.push(event),
    },
    document: { getElementById: node, createElement: element, head: { appendChild: (script) => queueMicrotask(() => script.onload()) } },
    location: { protocol: 'http:', origin: 'http://127.0.0.1:5500', pathname: '/index.html', hash: '', search: '' },
    history: { replaceState() {} }, URLSearchParams, setTimeout, clearTimeout,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8'), context);
  await tick();
  assert.equal(events.at(-1).detail.user, null);

  await node('registerBtn').emit('click');
  assert.equal(node('authDialog').open, true);
  node('authEmail').value = 'test@example.com';
  node('authPassword').value = 'Example-password';
  node('authConfirm').value = 'different';
  await node('authForm').emit('submit');
  assert.match(node('authConfirm').validity, /neshodují/);
  assert.equal(lastCall, undefined, 'Mismatched passwords must not call Supabase');
  node('authConfirm').value = 'Example-password';
  await node('authConfirm').emit('input');
  await node('authForm').emit('submit');
  assert.equal(lastCall.options.emailRedirectTo, 'http://127.0.0.1:5500/index.html');
  assert.match(node('authStatus').textContent, /potvrď registraci/);
  assert.equal(node('authPassword').value, '');

  failLogin = true;
  node('authPassword').value = 'wrong-password';
  await node('authForm').emit('submit');
  assert.match(node('authStatus').textContent, /není správné/);
  assert.equal(node('authFields').disabled, false);
  failLogin = false;
  node('authPassword').value = 'Example-password';
  await node('authForm').emit('submit');
  await tick();
  assert.equal(node('authDialog').open, false);
  assert.equal(events.at(-1).detail.user.id, 'test-user');
  assert.equal(node('logoutBtn').hidden, false);

  await node('logoutBtn').emit('click');
  await tick();
  assert.equal(lastCall.scope, 'local');
  assert.equal(events.at(-1).detail.user, null);
  await node('loginBtn').emit('click');
  await node('forgotPasswordBtn').emit('click');
  await node('authForm').emit('submit');
  assert.equal(lastCall.options.redirectTo, 'http://127.0.0.1:5500/index.html');
  onAuth('PASSWORD_RECOVERY', session);
  await tick();
  assert.equal(node('authEmail').disabled, true);
  node('authPassword').value = 'New-password';
  node('authConfirm').value = 'New-password';
  await node('authForm').emit('submit');
  assert.equal(lastCall.password, 'New-password');
  assert.equal(node('authDialog').open, false);
  const eventsBefore = events.length;
  onAuth('SIGNED_OUT', null);
  onAuth('SIGNED_IN', session);
  await tick();
  assert.equal(events.length, eventsBefore + 1, 'Only the most recent queued auth event may be announced');
  assert.equal(events.at(-1).detail.user.id, 'test-user');
  onAuth('PASSWORD_RECOVERY', session);
  onAuth('TOKEN_REFRESHED', session);
  await tick();
  assert.equal(node('authDialog').open, true, 'A token refresh must not lose the password recovery event');
  assert.equal(node('authEmail').disabled, true);
  console.log('PASS: registration validation, confirmation, redirect URL, login failure, login, logout, password recovery');
}

async function initializationRace() {
  const nodes = new Map();
  const node = (id) => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
  let onAuth;
  let resolveSession;
  const events = [];
  const client = { auth: {
    onAuthStateChange(callback) { onAuth = callback; },
    getSession: () => new Promise((resolve) => { resolveSession = resolve; }),
  } };
  const context = vm.createContext({
    window: {
      STEZKA_SUPABASE: { url: 'https://example.supabase.co', publishableKey: 'public-test-key' },
      supabase: { createClient: () => client }, dispatchEvent: (event) => events.push(event),
    },
    document: { getElementById: node, createElement: element, head: { appendChild: (script) => queueMicrotask(() => script.onload()) } },
    location: { protocol: 'http:', origin: 'http://127.0.0.1:5500', pathname: '/index.html', hash: '', search: '' },
    history: { replaceState() {} }, URLSearchParams, setTimeout, clearTimeout,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8'), context);
  await tick();
  onAuth('SIGNED_IN', { user: { id: 'new-session', email: 'new@example.com' } });
  resolveSession({ data: { session: null }, error: null });
  await tick();
  assert.equal(events.at(-1).detail.user.id, 'new-session', 'A stale getSession result must not overwrite a later auth event');
  assert.equal(node('logoutBtn').hidden, false);
  console.log('PASS: auth initialization race, event ordering, password recovery during token refresh');
}

main().then(initializationRace).catch((error) => { console.error(error); process.exitCode = 1; });
