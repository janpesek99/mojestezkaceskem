const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function element() {
  return {
    value: '', checked: false, disabled: false, hidden: false, textContent: '',
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, setCustomValidity(value) { this.validity = value; },
    querySelectorAll() { return []; },
    reportValidity() { return !this.validity; },
  };
}

function setup() {
  const nodes = new Map();
  const storage = new Map();
  const context = vm.createContext({
    document: { querySelector(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); } },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    console,
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  vm.runInContext(source.replace('\ninit();', '\n// Initialization is exercised separately in the browser.'), context);
  vm.runInContext('render = () => {}; renderPhotos = () => {};', context);
  return { nodes, storage, context, run: (script) => vm.runInContext(script, context) };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

async function main() {
  const app = setup();
  const { run, nodes, storage, context } = app;
  storage.set('moje-stezka-ceskem-v2', JSON.stringify({ n1: { done: true, note: 'guest' } }));
  run('handleAuthChange({ detail: { user: null, client: null } });');
  assert.equal(run('getEntry("n1").note'), 'guest');

  assert.equal(run('completedKm(findStage("n1"))'), 110, 'Legacy completed stages count in full');
  run('state.entries.n2 = { done: false, completedKm: 25.5 };');
  assert.equal(run('completedKm(findStage("n2"))'), 25.5);

  let resolveA;
  context.clientA = { from: () => ({ select: () => ({ eq: () => new Promise((resolve) => { resolveA = resolve; }) }) }) };
  run('handleAuthChange({ detail: { user: { id: "A" }, client: clientA } });');
  assert.equal(run('state.loading'), true);
  assert.equal(run('getEntry("n1").done'), false, 'Guest progress must not leak into an account');

  let savedRow;
  let saveError = false;
  context.clientB = {
    rpc(name, args) {
      assert.equal(name, 'save_stage_progress');
      savedRow = {
        user_id: 'B', stage_id: args.p_stage_id, done: args.p_done, completed_km: args.p_completed_km,
        date_from: args.p_date_from, date_to: args.p_date_to, note: args.p_note, photo_paths: args.p_photo_paths,
      };
      return { single: async () => ({ data: savedRow, error: saveError ? new Error('offline') : null }) };
    },
    from(table) {
      assert.equal(table, 'stage_progress');
      return {
        select: () => ({ eq: async (field, user) => {
          assert.equal(field, 'user_id'); assert.equal(user, 'B');
          return { data: [{ stage_id: 'n2', done: true, note: 'B only', date_from: null, date_to: null }], error: null };
        } }),
      };
    },
  };
  run('handleAuthChange({ detail: { user: { id: "B" }, client: clientB } });');
  await flush();
  assert.equal(run('state.loading'), false, 'Account switch must start a fresh load');
  assert.equal(run('getEntry("n2").note'), 'B only');
  resolveA({ data: [{ stage_id: 'n1', done: true, note: 'A only' }], error: null });
  await flush();
  assert.equal(run('getEntry("n1").done'), false, 'Stale account response must be ignored');

  run('state.selectedId = "n2";');
  nodes.get('#stageId').value = 'n2';
  nodes.get('#stageDone').checked = true;
  nodes.get('#stageNote').value = 'Updated';
  nodes.get('#stageDateFrom').value = '2026-10-01';
  nodes.get('#stageDateTo').value = '';
  await run('saveEntry();');
  assert.equal(savedRow.user_id, 'B');
  assert.equal(savedRow.date_from, '2026-10-01');
  assert.equal(savedRow.date_to, null);
  assert.equal(run('getEntry("n2").note'), 'Updated');
  assert.equal(JSON.parse(storage.get('moje-stezka-ceskem-v2')).n1.note, 'guest');

  nodes.get('#stageDone').checked = false;
  nodes.get('#stageCompletedKm').value = '25.5';
  await run('saveEntry();');
  assert.equal(savedRow.completed_km, 25.5);
  assert.equal(savedRow.done, false);
  assert.equal(run('getEntry("n2").completedKm'), 25.5);
  nodes.get('#stageCompletedKm').value = '163';
  await run('saveEntry();');
  assert.equal(savedRow.completed_km, 25.5, 'Invalid distance must not overwrite progress');
  nodes.get('#stageCompletedKm').value = '162';
  nodes.get('#stageCompletedKm').setCustomValidity('');
  await run('saveEntry();');
  assert.equal(savedRow.done, true, 'Full distance completes the stage');

  saveError = true;
  nodes.get('#stageNote').value = 'Unsaved draft';
  await run('saveEntry();');
  assert.equal(run('getEntry("n2").note'), 'Updated');
  assert.equal(nodes.get('#stageNote').value, 'Unsaved draft', 'Failed save must retain draft');
  assert.equal(run('state.saving'), false);
  assert.match(nodes.get('#syncStatus').textContent, /nepodařilo uložit/);

  run('handleAuthChange({ detail: { user: null, client: null } });');
  assert.equal(run('getEntry("n1").note'), 'guest');
  assert.equal(run('getEntry("n2").note'), '');

  context.failedClient = { from: () => ({ select: () => ({ eq: async () => ({ error: { code: 'PGRST205' } }) }) }) };
  run('handleAuthChange({ detail: { user: { id: "C" }, client: failedClient } });');
  await flush();
  assert.equal(run('journalLocked()'), true, 'Failed load must block writes');
  assert.equal(nodes.get('#retrySyncBtn').hidden, false);
  console.log('PASS: account isolation, stale response, cloud save, date mapping, failed save, logout, failed load');
}

async function photoSyncTests() {
  const app = setup();
  const { run, nodes, storage, context } = app;
  const png = 'data:image/png;base64,aGVsbG8=';
  const uploads = [];
  const revoked = [];
  let savedRow;
  let uploadError = false;
  let databaseError = false;
  let downloads = 0;
  let resolveUpload;
  let resolveDownload;
  const deletedPaths = new Set();
  const removals = [];
  let removeError = false;
  const configure = (target) => {
    target.fetch = fetch;
    target.crypto = require('node:crypto').webcrypto;
    target.URL = {
      createObjectURL: () => `blob:photo-${downloads}`,
      revokeObjectURL: (url) => revoked.push(url),
    };
  };
  configure(context);
  context.photoClient = {
    rpc(name, args) {
      assert.equal(name, 'save_stage_progress');
      if (!databaseError) {
        for (const path of args.p_added_photo_paths || []) deletedPaths.delete(path);
        for (const path of args.p_removed_photo_paths || []) deletedPaths.add(path);
        savedRow = {
        user_id: 'PHOTO-USER', stage_id: args.p_stage_id, done: args.p_done, completed_km: args.p_completed_km,
        date_from: args.p_date_from, date_to: args.p_date_to, note: args.p_note,
        photo_paths: [...new Set([...(savedRow?.photo_paths || []), ...args.p_photo_paths])].filter((path) => !deletedPaths.has(path)),
        photo_deleted_paths: [...deletedPaths],
      };
      }
      return { single: async () => ({ data: savedRow, error: databaseError ? new Error('offline') : null }) };
    },
    from() {
      return {
        select: () => ({ eq: async () => ({ data: savedRow ? [savedRow] : [], error: null }) }),
      };
    },
    storage: { from(bucket) {
      assert.equal(bucket, 'stage-photos');
      return {
        async upload(path, blob, options) {
          uploads.push(path);
          assert.match(path, /^PHOTO-USER\/n1\/[a-f0-9]{64}\.png$/);
          assert.equal(blob.type, 'image/png');
          assert.equal(options.upsert, true);
          if (resolveUpload === 'defer') return new Promise((resolve) => { resolveUpload = resolve; });
          return { error: uploadError ? new Error('offline') : null };
        },
        async download(path) {
          downloads++;
          assert.equal(path, savedRow.photo_paths[0]);
          if (resolveDownload === 'defer') return new Promise((resolve) => { resolveDownload = resolve; });
          return { data: new Blob(['photo'], { type: 'image/png' }), error: null };
        },
        async remove(paths) {
          removals.push([...paths]);
          return { error: removeError ? new Error('offline') : null };
        },
      };
    } },
  };
  storage.set('moje-stezka-ceskem-v2:photos:PHOTO-USER', JSON.stringify({ n1: [png], n2: [png] }));
  run('handleAuthChange({ detail: { user: { id: "PHOTO-USER" }, client: photoClient } });');
  await flush();
  assert.equal(run('getEntry("n1").photos.length'), 1, 'Local account photos without progress rows must remain available');
  nodes.get('#stageId').value = 'n1';
  run('state.selectedId = "n1";');
  await run('saveEntry();');
  assert.equal(savedRow.photo_paths.length, 1, 'Uploaded photo must be attached to cloud progress');
  assert.equal(run('getEntry("n1").photos[0].path'), savedRow.photo_paths[0]);
  const local = JSON.parse(storage.get('moje-stezka-ceskem-v2:photos:PHOTO-USER'));
  assert.equal(local.n1, undefined, 'Remove local copy only after a successful cloud save');
  assert.equal(local.n2.length, 1, 'Keep other stages awaiting migration');

  // A second device only has the cloud row, not the first browser's storage.
  const second = setup();
  configure(second.context);
  second.context.photoClient = context.photoClient;
  second.run('handleAuthChange({ detail: { user: { id: "PHOTO-USER" }, client: photoClient } });');
  await flush();
  assert.equal(second.run('getEntry("n1").photos[0].path'), savedRow.photo_paths[0]);
  const photoUrl = await second.run('cloudPhotoUrl(getEntry("n1").photos[0].path)');
  assert.match(photoUrl, /^blob:/);
  assert.equal(await second.run('cloudPhotoUrl(getEntry("n1").photos[0].path)'), photoUrl);
  assert.equal(downloads, 1, 'Repeated previews reuse authenticated download');
  await assert.rejects(second.run('cloudPhotoUrl("OTHER-USER/n1/photo.png")'), /owner/);
  second.run('handleAuthChange({ detail: { user: null, client: null } });');
  assert.deepEqual(revoked, [photoUrl], 'Logout revokes downloaded photo URLs');

  context.png = png;
  context.otherPng = 'data:image/png;base64,d29ybGQ=';
  run('state.pendingPhotos = [otherPng, otherPng];');
  nodes.get('#stageNote').value = 'Photo draft';
  uploadError = true;
  const oldRow = savedRow;
  await run('saveEntry();');
  assert.equal(savedRow, oldRow, 'Failed upload must not commit progress');
  assert.equal(run('state.pendingPhotos.length'), 2, 'Failed upload keeps photos for retry');
  assert.equal(nodes.get('#stageNote').value, 'Photo draft');
  uploadError = false;
  databaseError = true;
  await run('saveEntry();');
  assert.equal(run('state.pendingPhotos.length'), 2, 'Failed row save also keeps the photo draft');
  databaseError = false;
  await run('saveEntry();');
  assert.equal(savedRow.photo_paths.length, 2, 'Retry and duplicate content must not duplicate photo references');
  assert.equal(new Set(uploads).size, 2, 'Retries use the same storage object path');
  assert.equal(run('state.pendingPhotos.length'), 0);

  const remotePhoto = `PHOTO-USER/n1/${'a'.repeat(64)}.png`;
  savedRow.photo_paths.push(remotePhoto);
  await run('saveEntry();');
  assert.equal(run('getEntry("n1").photos.length'), 3, 'A stale device must accept merged photos from the database');
  assert.equal(run('getEntry("n1").photos[2].path'), remotePhoto);

  // Removing one photo must preserve remotely added photos and survive failed saves.
  const removedPath = savedRow.photo_paths[0];
  context.removedPath = removedPath;
  run('state.removedPhotos = [getEntry("n1").photos[0]];');
  databaseError = true;
  await run('saveEntry();');
  assert.equal(run('state.removedPhotos.length'), 1, 'Failed deletion save retains the draft');
  assert.equal(savedRow.photo_paths.length, 3, 'Failed save does not remove persisted photos');
  databaseError = false;
  removeError = true;
  await run('saveEntry();');
  assert.equal(savedRow.photo_paths.includes(removedPath), false);
  assert.equal(savedRow.photo_paths.includes(remotePhoto), true, 'Deleting a photo must retain photos from another device');
  assert.equal(run('state.removedPhotos.length'), 0, 'Committed deletion clears the draft even if object cleanup fails');
  assert.match(nodes.get('#syncStatus').textContent, /úložiště/);
  assert.equal(removals.at(-1).includes(removedPath), true);
  removeError = false;
  await run('saveEntry();');
  assert.equal(removals.length, 2, 'A later save retries failed object cleanup');
  // A stale device submits the old photo list; the deletion marker wins.
  await context.photoClient.rpc('save_stage_progress', {
    p_stage_id: 'n1', p_photo_paths: [...savedRow.photo_paths, removedPath],
  }).single();
  assert.equal(savedRow.photo_paths.includes(removedPath), false, 'Stale saves cannot resurrect deleted photos');
  const uploadsBeforeReAdd = uploads.length;
  run('state.photoCache.set(removedPath, { uploaded: true, url: "blob:old", bytes: 1 });');
  run('state.pendingPhotos = [png];');
  await run('saveEntry();');
  assert.equal(uploads.length, uploadsBeforeReAdd + 1, 'Explicit re-add uploads even with a stale cache from another device');
  assert.equal(savedRow.photo_paths.includes(removedPath), true, 'Explicit re-add restores the same content');
  assert.equal(savedRow.photo_deleted_paths.includes(removedPath), false);

  // A logout while an upload is in flight cannot attach its result to another account.
  context.thirdPng = 'data:image/png;base64,dGhpcmQ=';
  run('state.pendingPhotos = [thirdPng];');
  resolveUpload = 'defer';
  const staleSave = run('saveEntry();');
  while (resolveUpload === 'defer') await flush();
  const rowBeforeLogout = savedRow;
  run('handleAuthChange({ detail: { user: null, client: null } });');
  resolveUpload({ error: null });
  await staleSave;
  assert.equal(savedRow, rowBeforeLogout);
  assert.equal(run('state.photoCache.size'), 0);
  assert.equal(run('getEntry("n1").photos.length'), 0);

  // Late photo downloads must not create live URLs after the account changes.
  second.run('handleAuthChange({ detail: { user: { id: "PHOTO-USER" }, client: photoClient } });');
  await flush();
  resolveDownload = 'defer';
  const staleDownload = second.run('cloudPhotoUrl(getEntry("n1").photos[0].path)');
  second.run('handleAuthChange({ detail: { user: null, client: null } });');
  resolveDownload({ data: new Blob(['photo']), error: null });
  await assert.rejects(staleDownload, /Account changed/);
  assert.equal(second.run('state.photoCache.size'), 0);

  await run('addPhotos({ target: { files: [{ type: "image/png", size: 11 * 1024 * 1024 }] } });');
  assert.equal(run('state.pendingPhotos.length'), 0);
  assert.match(nodes.get('#syncStatus').textContent, /10 MB/);
  // Guest photos still save locally and are not uploaded to an account.
  run('state.selectedId = "n1"; state.pendingPhotos = [png];');
  nodes.get('#stageNote').value = 'Guest';
  resolveUpload = undefined;
  const uploadCount = uploads.length;
  await run('saveEntry();');
  assert.equal(uploads.length, uploadCount);
  assert.equal(JSON.parse(storage.get('moje-stezka-ceskem-v2')).n1.photos[0], png);
  run('state.removedPhotos = [getEntry("n1").photos[0]];');
  await run('saveEntry();');
  assert.equal(JSON.parse(storage.get('moje-stezka-ceskem-v2')).n1.photos.length, 0, 'Guest deletion persists locally');
  let finishRead;
  context.FileReader = class {
    addEventListener(name, callback) { this[name] = callback; }
    readAsDataURL() { finishRead = () => { this.result = png; this.load(); }; }
  };
  const reading = run('addPhotos({ target: { files: [{ type: "image/png", size: 5 }] } });');
  assert.equal(run('journalLocked()'), true, 'Save must wait until selected files have been read');
  assert.equal(nodes.get('#saveEntryBtn').disabled, true);
  finishRead();
  await reading;
  assert.equal(run('journalLocked()'), false);
  assert.equal(run('state.pendingPhotos.length'), 1);
  console.log('PASS: photo migration, second-device download, isolation, retries, failures, stale upload/download, file limit, guest photos, file-reading lock');
}

async function storageAndCacheTests() {
  const { run, storage, context, nodes } = setup();
  for (const bad of ['[]', 'true', '"broken"', '{invalid']) {
    storage.set('moje-stezka-ceskem-v2', bad);
    assert.equal(run('Object.keys(loadEntries()).length'), 0);
    storage.set('moje-stezka-ceskem-v2:photos:CACHE-USER', bad);
    assert.equal(run('Object.keys(loadLocalPhotos("CACHE-USER")).length'), 0);
  }
  storage.set('moje-stezka-ceskem-v2', JSON.stringify({
    n1: { done: 'true', completedKm: 'Infinity', note: { invalid: true }, photos: [null, { path: 'other' }] },
    n2: [], unknown: { done: true },
  }));
  run('state.entries = loadEntries();');
  assert.equal(run('completedKm(findStage("n1"))'), 0);
  assert.equal(run('getEntry("n1").done'), false);
  assert.equal(run('getEntry("n1").photos.length'), 0);
  assert.equal(run('getEntry("n1").note'), '');
  assert.equal(run('Object.keys(state.entries).length'), 1);
  run('state.authReady = true; state.selectedId = "n1";');
  nodes.get('#stageId').value = 'unknown';
  await run('saveEntry();');
  assert.equal(run('findStage("unknown")'), null, 'Unknown stage must not alias the first stage');
  nodes.get('#stageId').value = 'n1';
  nodes.get('#stageCompletedKm').value = '10.55';
  await run('saveEntry();');
  assert.equal(run('completedKm(findStage("n1"))'), 0, 'Excess precision must not save');
  assert.match(nodes.get('#stageCompletedKm').validity, /desetinným/);
  const revoked = [];
  context.URL = { revokeObjectURL: (url) => revoked.push(url) };
  run(`state.user = { id: "CACHE-USER" };
    for (const id of ["n1", "n2", "n3", "n4"]) {
      state.photoCache.set("CACHE-USER/" + id + "/photo.png", { url: "blob:" + id, bytes: 10 * 1024 * 1024 });
    }
    trimPhotoCache();`);
  assert.equal(run('state.photoCache.has("CACHE-USER/n1/photo.png")'), true, 'Keep the open stage photos');
  assert.equal(run('state.photoCache.size'), 3, 'Evict unused photos beyond the memory budget');
  assert.deepEqual(revoked, ['blob:n2']);
  await assert.rejects(run('cloudPhotoUrl("CACHE-USER/n1/../../other.png")'), /path/);
  console.log('PASS: malformed storage recovery, unknown stage rejection, decimal precision, bounded photo cache, path validation');
}

main().then(photoSyncTests).then(storageAndCacheTests).catch((error) => { console.error(error); process.exitCode = 1; });
