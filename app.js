const storageKey = "moje-stezka-ceskem-v2";
const photoBucket = "stage-photos";
const maxPhotoBytes = 10 * 1024 * 1024;
const maxCachedPhotoBytes = 32 * 1024 * 1024;
const photoTypes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const mapBounds = {
  minLon: 12.090575,
  maxLon: 18.859254,
  minLat: 48.551808,
  maxLat: 51.055701,
};

const branches = {
  north: {
    name: "Severn\u00ed v\u011btev",
    stages: [
      { id: "n1", name: "Kr\u00e1sn\u00e1 - Kl\u00ednovec", km: 110, lon: 12.55, lat: 50.27, routeOrder: 1 },
      { id: "n2", name: "Kru\u0161n\u00e9 hory", km: 162, lon: 13.45, lat: 50.65, routeOrder: 2 },
      { id: "n3", name: "\u010cesk\u00e9 \u0160v\u00fdcarsko - Lu\u017eick\u00e9 hory", km: 107, lon: 14.35, lat: 50.83, routeOrder: 3 },
      { id: "n4", name: "Jizersk\u00e9 hory - Krkono\u0161e", km: 107, lon: 15.35, lat: 50.75, routeOrder: 4 },
      { id: "n5", name: "Adr\u0161pach - Broumovsko", km: 98, lon: 16.18, lat: 50.58, routeOrder: 5 },
      { id: "n6", name: "Orlick\u00e9 hory", km: 92, lon: 16.55, lat: 50.23, routeOrder: 6 },
      { id: "n7", name: "Jesen\u00edky", km: 142, lon: 17.20, lat: 50.08, routeOrder: 8 },
      { id: "n8", name: "Podbeskyd\u00ed", km: 58, lon: 17.78, lat: 49.72, routeOrder: 9 },
      { id: "n9", name: "Beskydy", km: 105, lon: 18.55, lat: 49.55, routeOrder: 10 },
      { id: "n10", name: "Rychlebsk\u00e9 hory", km: 36.5, lon: 17.05, lat: 50.35, routeOrder: 7 },
    ],
  },
  south: {
    name: "Ji\u017en\u00ed v\u011btev",
    stages: [
      { id: "s11", name: "Beskydy - Javorn\u00edky", km: 115.3, lon: 18.48, lat: 49.32, routeOrder: 1 },
      { id: "s12", name: "B\u00edl\u00e9 Karpaty", km: 93.5, lon: 17.75, lat: 48.95, routeOrder: 2 },
      { id: "s13", name: "Dolnomoravsk\u00fd \u00faval", km: 116.7, lon: 16.85, lat: 48.78, routeOrder: 3 },
      { id: "s14", name: "Podyj\u00ed", km: 110, lon: 15.85, lat: 48.85, routeOrder: 4 },
      { id: "s15", name: "\u010cesk\u00e1 Kanada", km: 87.7, lon: 15.18, lat: 49.02, routeOrder: 5 },
      { id: "s16", name: "Novohradsk\u00e9 hory", km: 134, lon: 14.62, lat: 48.74, routeOrder: 6 },
      { id: "s17", name: "Ji\u017en\u00ed \u0160umava", km: 81.4, lon: 13.85, lat: 48.78, routeOrder: 7 },
      { id: "s18", name: "\u0160umava", km: 105, lon: 13.35, lat: 49.00, routeOrder: 8 },
      { id: "s19", name: "Z\u00e1padn\u00ed \u0160umava", km: 116, lon: 13.00, lat: 49.20, routeOrder: 9 },
      { id: "s20", name: "\u010cesk\u00fd les", km: 131, lon: 12.55, lat: 49.65, routeOrder: 10 },
    ],
  },
};

const routeGeometry = {
  n1: [[12.090641, 50.252369], [12.15117, 50.24242], [12.213234, 50.238042], [12.251691, 50.20589], [12.293157, 50.175385], [12.341459, 50.201308], [12.363405, 50.239489], [12.368535, 50.280173], [12.40709, 50.312613], [12.469685, 50.306985], [12.515921, 50.334482], [12.513173, 50.375388], [12.565401, 50.398001], [12.619757, 50.377863], [12.681832, 50.382829], [12.744184, 50.383305], [12.799664, 50.401998], [12.861117, 50.393563], [12.918681, 50.409555], [12.922373, 50.410866]],
  n2: [[12.925121, 50.409446], [12.987286, 50.403406], [13.035076, 50.429725], [13.097374, 50.426435], [13.147679, 50.45074], [13.195821, 50.478964], [13.246521, 50.502688], [13.286245, 50.535005], [13.343413, 50.551429], [13.405388, 50.555944], [13.455945, 50.579799], [13.487872, 50.614971], [13.527245, 50.646778], [13.541771, 50.686475], [13.604149, 50.686833], [13.664436, 50.676229], [13.708992, 50.704752], [13.756898, 50.730994], [13.813663, 50.714047], [13.876411, 50.716027], [13.904573, 50.752414], [13.941943, 50.785275], [13.99321, 50.808521], [14.055418, 50.799307], [14.117762, 50.80025], [14.176421, 50.814265], [14.216315, 50.842869]],
  n3: [[14.219082, 50.843232], [14.2571, 50.875644], [14.319326, 50.872838], [14.380357, 50.864232], [14.435756, 50.845421], [14.493787, 50.860326], [14.556382, 50.865854], [14.617709, 50.857842], [14.6769, 50.844304], [14.732128, 50.825264], [14.792962, 50.815656], [14.854182, 50.807937], [14.900185, 50.780278], [14.938139, 50.812659], [14.969678, 50.817024]],
  n4: [[14.969678, 50.81703], [15.000725, 50.852449], [15.059241, 50.866625], [15.120066, 50.857558], [15.178923, 50.843799], [15.238095, 50.830042], [15.291447, 50.808363], [15.353044, 50.815702], [15.370722, 50.77658], [15.433972, 50.778721], [15.493217, 50.765757], [15.553997, 50.775188], [15.616349, 50.772416], [15.675027, 50.758467], [15.730497, 50.738721], [15.791889, 50.748447], [15.836085, 50.719616], [15.862461, 50.682451], [15.908364, 50.655053]],
  n5: [[15.90655, 50.652382], [15.968416, 50.646988], [15.993686, 50.609469], [16.056038, 50.609732], [16.083634, 50.646458], [16.145313, 50.640352], [16.117807, 50.603768], [16.181677, 50.601346], [16.244586, 50.597029], [16.276942, 50.562107], [16.311752, 50.528238], [16.298907, 50.488264], [16.24136, 50.471687], [16.188692, 50.462321]],
  n6: [[16.188872, 50.461943], [16.206623, 50.422852], [16.23262, 50.385705], [16.293059, 50.375485], [16.350363, 50.359246], [16.386519, 50.325846], [16.422093, 50.292336], [16.445808, 50.253857], [16.495288, 50.228578], [16.536925, 50.19807], [16.565437, 50.161293], [16.612814, 50.134244], [16.627663, 50.094634], [16.67673, 50.069484], [16.736556, 50.081118], [16.76011, 50.084266]],
  n7: [[16.759689, 50.084473], [16.764001, 50.125145], [16.79404, 50.160942], [16.823406, 50.196937], [16.884761, 50.204194], [16.940654, 50.222365], [17.002046, 50.214634], [17.057507, 50.195833], [17.112978, 50.176691], [17.140134, 50.139984], [17.183559, 50.110727], [17.232158, 50.085026], [17.21615, 50.045481], [17.256843, 50.014319], [17.296261, 49.98271], [17.35864, 49.982704], [17.40211, 49.953172], [17.455991, 49.932666], [17.455712, 49.890824], [17.44761, 49.850336], [17.510293, 49.842192], [17.567823, 49.826351], [17.620292, 49.804], [17.627946, 49.794792]],
  n8: [[17.627946, 49.794798], [17.67464, 49.767675], [17.698401, 49.729976], [17.714733, 49.690614], [17.762927, 49.664456], [17.825414, 49.662049], [17.865264, 49.629906], [17.925388, 49.618476], [17.96423, 49.585874], [18.001906, 49.552556], [18.022351, 49.538223]],
  n9: [[18.022944, 49.537903], [18.075244, 49.515658], [18.137713, 49.512018], [18.192753, 49.492779], [18.253138, 49.482555], [18.310567, 49.498624], [18.371473, 49.508116], [18.430626, 49.521367], [18.49314, 49.519699], [18.547831, 49.500095], [18.610334, 49.496729], [18.670998, 49.50618], [18.731464, 49.516929], [18.790195, 49.530994], [18.850975, 49.540916], [18.859231, 49.550574]],
  n10: [[17.028357, 50.230078], [17.017774, 50.270327], [16.984681, 50.305075], [16.935444, 50.330416], [16.929128, 50.371039], [16.882776, 50.398888], [16.893152, 50.439252], [16.894292, 50.44026]],
  s11: [[18.859231, 49.550574], [18.804281, 49.531058], [18.743169, 49.522545], [18.68511, 49.507387], [18.624303, 49.497872], [18.563156, 49.505992], [18.54571, 49.46666], [18.501917, 49.437496], [18.463397, 49.405363], [18.410909, 49.383309], [18.404145, 49.34262], [18.352905, 49.318969], [18.294622, 49.304415], [18.233905, 49.294632], [18.184308, 49.269903], [18.126879, 49.254016], [18.080347, 49.226773], [18.108213, 49.190298], [18.103515, 49.14965], [18.044746, 49.135821], [18.00735, 49.140453]],
  s12: [[18.007359, 49.140464], [18.069567, 49.143721], [18.109505, 49.112395], [18.124813, 49.072653], [18.078496, 49.045251], [18.0312, 49.018653], [17.968471, 49.023878], [17.907062, 49.014629], [17.882502, 48.977096], [17.889833, 48.936449], [17.827794, 48.940745], [17.768282, 48.952951], [17.71705, 48.92922], [17.658696, 48.911724], [17.667131, 48.871336], [17.615531, 48.848311], [17.553018, 48.846715], [17.529203, 48.865091]],
  s13: [[17.53003, 48.865156], [17.476168, 48.843883], [17.416816, 48.827699], [17.359108, 48.812079], [17.320021, 48.843842], [17.312234, 48.884611], [17.307427, 48.925289], [17.244563, 48.924303], [17.211074, 48.889922], [17.168251, 48.860167], [17.113966, 48.839277], [17.084923, 48.80311], [17.04176, 48.771954], [17.009043, 48.737177], [16.948883, 48.724112], [16.899502, 48.749221], [16.861989, 48.781834], [16.804973, 48.79889], [16.758665, 48.826499], [16.713991, 48.855617], [16.661323, 48.87744], [16.637464, 48.839673], [16.635856, 48.804228]],
  s14: [[16.631661, 48.80282], [16.569488, 48.809008], [16.506777, 48.804813], [16.445062, 48.797488], [16.412562, 48.76158], [16.36063, 48.738736], [16.301045, 48.753183], [16.237894, 48.761728], [16.180339, 48.744529], [16.118471, 48.750375], [16.097145, 48.788689], [16.058499, 48.820679], [16.001556, 48.837598], [15.939554, 48.842641], [15.893533, 48.87068], [15.836068, 48.886998], [15.811814, 48.895343]],
  s15: [[15.812864, 48.894594], [15.808508, 48.936762], [15.748508, 48.947919], [15.691053, 48.931687], [15.646523, 48.902719], [15.584584, 48.896123], [15.527056, 48.911883], [15.488221, 48.944627], [15.428502, 48.957824], [15.382706, 48.985598], [15.326166, 49.003652], [15.263706, 49.007912], [15.20704, 49.025263], [15.14821, 49.011477], [15.101884, 49.019336]],
  s16: [[15.102854, 49.019148], [15.040331, 49.014853], [14.982129, 48.999992], [14.945577, 48.966895], [14.967837, 48.928671], [14.950491, 48.889496], [14.960049, 48.849073], [14.950338, 48.808807], [14.962519, 48.76868], [14.898972, 48.773784], [14.83963, 48.7868], [14.777016, 48.789458], [14.737688, 48.757779], [14.697382, 48.726488], [14.677887, 48.687654], [14.695747, 48.648599], [14.698118, 48.607815], [14.634976, 48.607994], [14.573028, 48.613387], [14.511691, 48.624343], [14.465526, 48.652053], [14.431947, 48.649596]],
  s17: [[14.432315, 48.649703], [14.418086, 48.609972], [14.380087, 48.577609], [14.320853, 48.590897], [14.263297, 48.606817], [14.20338, 48.618482], [14.142052, 48.626546], [14.079413, 48.634644], [14.062748, 48.673929], [14.030319, 48.708755], [13.96591, 48.714316], [13.917905, 48.741834], [13.882214, 48.762451]],
  s18: [[13.882394, 48.76206], [13.82155, 48.772375], [13.809514, 48.812428], [13.768999, 48.843617], [13.745787, 48.882473], [13.690065, 48.900788], [13.641349, 48.926989], [13.598257, 48.956502], [13.543216, 48.976282], [13.480901, 48.977857], [13.490864, 49.01817], [13.43824, 49.041665], [13.408461, 49.077572], [13.373121, 49.111407], [13.311416, 49.117887], [13.249414, 49.12326], [13.236756, 49.136216]],
  s19: [[13.23681, 49.136251], [13.202953, 49.170504], [13.151696, 49.19371], [13.107479, 49.222936], [13.064029, 49.252374], [13.036648, 49.289353], [12.995163, 49.319912], [12.970118, 49.357373], [12.921825, 49.383257], [12.863597, 49.368658], [12.802278, 49.376162], [12.7898, 49.416345], [12.754703, 49.450293], [12.709257, 49.478253], [12.677924, 49.513576], [12.628229, 49.538363], [12.591362, 49.571312], [12.566236, 49.60889], [12.55065, 49.648463], [12.535379, 49.660042]],
  s20: [[12.534624, 49.660857], [12.50824, 49.698051], [12.453758, 49.718087], [12.407199, 49.745227], [12.456758, 49.770262], [12.476908, 49.808864], [12.507271, 49.844955], [12.567017, 49.868509], [12.581597, 49.908253], [12.530178, 49.932932], [12.505376, 49.971682], [12.466604, 50.003604], [12.409524, 50.020957], [12.350011, 50.034074], [12.301835, 50.062069], [12.337821, 50.095597], [12.275488, 50.099423], [12.230984, 50.128117], [12.219092, 50.168251], [12.203182, 50.208052], [12.161437, 50.238364], [12.100145, 50.247544], [12.09065, 50.252363]],
};

const stageCatalog = Object.entries(branches).flatMap(([branchId, branch]) =>
  branch.stages.map((stage) => ({ ...stage, branchId, branchName: branch.name }))
);
const stageById = new Map(stageCatalog.map((stage) => [stage.id, stage]));
const totalRouteKm = stageCatalog.reduce((sum, stage) => sum + stage.km, 0);
const kmFormatter = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 });
const mapViews = new Map();
const listViews = new Map();
const branchCounters = new Map();

const state = {
  selectedId: null,
  entries: loadEntries(),
  pendingPhotos: [],
  removedPhotos: [],
  drafts: new Map(),
  photoCache: new Map(),
  user: null,
  client: null,
  authReady: false,
  loading: false,
  loadFailed: false,
  saving: false,
  readingPhotos: false,
  revision: 0,
};

const elements = {
  content: document.querySelector(".content"),
  routeSegments: document.querySelector("#routeSegments"),
  list: document.querySelector("#stageList"),
  template: document.querySelector("#stageButtonTemplate"),
  form: document.querySelector("#journalForm"),
  stageId: document.querySelector("#stageId"),
  stageBranch: document.querySelector("#stageBranch"),
  stageTitle: document.querySelector("#stageTitle"),
  stageDistance: document.querySelector("#stageDistance"),
  selectedStageName: document.querySelector("#selectedStageName"),
  completedKm: document.querySelector("#stageCompletedKm"),
  done: document.querySelector("#stageDone"),
  dateFrom: document.querySelector("#stageDateFrom"),
  dateTo: document.querySelector("#stageDateTo"),
  note: document.querySelector("#stageNote"),
  photoInput: document.querySelector("#photoInput"),
  photoPreview: document.querySelector("#photoPreview"),
  photoStorageNote: document.querySelector("#photoStorageNote"),
  photoDialog: document.querySelector("#photoDialog"),
  photoDialogImage: document.querySelector("#photoDialogImage"),
  closePhoto: document.querySelector("#closePhotoBtn"),
  save: document.querySelector("#saveEntryBtn"),
  progressPercent: document.querySelector("#mapProgressPercent"),
  progressText: document.querySelector("#mapProgressText"),
  progressRing: document.querySelector("#progressRing"),
  doneCount: document.querySelector("#doneCount"),
  syncStatus: document.querySelector("#syncStatus"),
  retrySync: document.querySelector("#retrySyncBtn"),
};

init();

function init() {
  elements.form.addEventListener("submit", saveEntry);
  elements.done.addEventListener("change", () => {
    elements.completedKm.setCustomValidity("");
    elements.completedKm.value = elements.done.checked ? findStage(state.selectedId).km : 0;
    saveEntry();
  });
  elements.completedKm.addEventListener("input", () => {
    elements.completedKm.setCustomValidity("");
    elements.done.checked = Number(elements.completedKm.value) === findStage(state.selectedId).km;
  });
  elements.photoInput.addEventListener("change", addPhotos);
  elements.closePhoto.addEventListener("click", closePhotoPreview);
  elements.photoDialog.addEventListener("click", (event) => {
    if (event.target === elements.photoDialog) closePhotoPreview();
  });
  elements.photoDialog.addEventListener("close", () => elements.photoDialogImage.removeAttribute("src"));
  [elements.dateFrom, elements.dateTo].forEach((input) =>
    input.addEventListener("input", () => elements.dateTo.setCustomValidity("")));
  window.addEventListener("stezka:auth", handleAuthChange);
  elements.retrySync.addEventListener("click", loadCloudEntries);
  window.matchMedia("(max-width: 860px)").addEventListener("change", updateJournalPlacement);
  render();
}

function syncMessage(text, error = false) {
  elements.syncStatus.textContent = text;
  elements.syncStatus.classList.toggle("is-error", error);
}

function journalLocked() {
  return !state.authReady || state.loading || state.loadFailed || state.saving || state.readingPhotos;
}

function updateJournalControls() {
  const disabled = !state.selectedId || journalLocked();
  [elements.done, elements.completedKm, elements.dateFrom, elements.dateTo, elements.note, elements.photoInput, elements.save]
    .forEach((element) => { element.disabled = disabled; });
  elements.photoPreview.querySelectorAll(".photo-remove").forEach((button) => { button.disabled = disabled; });
  elements.save.textContent = state.saving ? "Ukládám…" : state.readingPhotos ? "Načítám fotky…" : "Uložit";
}

function handleAuthChange(event) {
  const { user, client } = event.detail;
  if (state.authReady && state.user?.id === user?.id) return;
  state.revision += 1;
  closePhotoPreview();
  clearPhotoCache();
  state.authReady = true;
  state.user = user;
  state.client = client;
  state.pendingPhotos = [];
  state.removedPhotos = [];
  state.drafts.clear();
  state.saving = false;
  state.readingPhotos = false;
  state.loading = false;
  state.loadFailed = false;
  elements.retrySync.hidden = true;
  elements.photoInput.value = "";
  if (user) {
    state.entries = {};
    loadCloudEntries();
  } else {
    state.loading = false;
    state.entries = loadEntries();
    syncMessage("Nepřihlášený režim · záznamy se ukládají jen v tomto prohlížeči.");
    render();
  }
}

async function loadCloudEntries() {
  if (!state.user || !state.client || state.loading) return;
  const revision = state.revision;
  const userId = state.user.id;
  state.loading = true;
  state.loadFailed = false;
  elements.retrySync.hidden = true;
  syncMessage("Načítám tvůj postup…");
  render();
  try {
    const { data, error } = await state.client.from("stage_progress")
      .select("stage_id, done, completed_km, date_from, date_to, note, photo_paths")
      .eq("user_id", userId);
    if (error) throw error;
    if (revision !== state.revision) return;
    const photos = loadLocalPhotos(userId);
    state.entries = Object.fromEntries(data.map((row) => [row.stage_id, {
      done: row.done, completedKm: row.completed_km || 0, dateFrom: row.date_from || "", dateTo: row.date_to || "",
      note: row.note, photos: [
        ...(row.photo_paths || []).map((path) => ({ path })),
        ...(photos[row.stage_id] || []),
      ],
    }]));
    // Older account photos can exist locally even without a progress row.
    allStages().forEach((stage) => {
      if (!state.entries[stage.id] && photos[stage.id]?.length) {
        state.entries[stage.id] = { ...getEntry(stage.id), photos: photos[stage.id] };
      }
    });
    syncMessage("Postup, poznámky a fotky se ukládají do tvého účtu.");
  } catch (error) {
    if (revision !== state.revision) return;
    state.loadFailed = true;
    elements.retrySync.hidden = false;
    syncMessage(error.code === "PGRST205" || error.code === "42P01" || error.code === "42703" || error.code === "PGRST204"
      ? "Úložiště ještě není připravené. Pro existující databázi spusť photo-sync.sql v Supabase a zkus to znovu."
      : "Postup se nepodařilo načíst. Zkontroluj připojení a zkus to znovu.", true);
  } finally {
    if (revision === state.revision) {
      state.loading = false;
      render();
    }
  }
}

function loadLocalPhotos(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(`${storageKey}:photos:${userId}`));
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(stageCatalog.filter((stage) => Array.isArray(value[stage.id]))
      .map((stage) => [stage.id, value[stage.id].filter((photo) => typeof photo === "string" && photo.startsWith("data:image/"))]));
  } catch {
    return {};
  }
}

function clearPhotoCache() {
  state.photoCache.forEach((item) => {
    if (item.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
  });
  state.photoCache.clear();
}

function trimPhotoCache() {
  let bytes = [...state.photoCache.values()].reduce((sum, item) => sum + (item.bytes || 0), 0);
  for (const [path, item] of state.photoCache) {
    if (bytes <= maxCachedPhotoBytes) break;
    // Keep every image used by the currently open journal.
    if (!item.url || path.startsWith(`${state.user?.id}/${state.selectedId}/`)) continue;
    if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
    state.photoCache.delete(path);
    bytes -= item.bytes || 0;
  }
}

function validPhotoPath(path, userId, stageId) {
  if (typeof path !== "string") return false;
  const parts = path.split("/");
  return parts.length === 3 && parts[0] === userId && stageById.has(parts[1])
    && (!stageId || parts[1] === stageId) && /^[a-f0-9]{64}\.(jpg|png|webp|gif)$/.test(parts[2]);
}

function assertCurrentAccount(revision) {
  if (revision !== state.revision) throw new Error("Account changed");
}

async function uploadCloudPhotos(photos, stageId, userId, client, revision, addedPaths = []) {
  const uploaded = new Map();
  for (const photo of photos) {
    assertCurrentAccount(revision);
    if (typeof photo !== "string") {
      if (!validPhotoPath(photo?.path, userId, stageId)) throw new Error("Invalid photo path");
      uploaded.set(photo.path, photo);
      continue;
    }
    if (!photo.startsWith("data:image/")) throw new Error("Invalid photo");
    const blob = await (await fetch(photo)).blob();
    const extension = photoTypes[blob.type];
    if (!extension || blob.size > maxPhotoBytes) {
      throw new Error("Vyber fotky JPG, PNG, WebP nebo GIF, každou nejvýše 10 MB.");
    }
    const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    const filename = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const path = `${userId}/${stageId}/${filename}.${extension}`;
    addedPaths.push(path);
    assertCurrentAccount(revision);
    // A stable content hash prevents duplicates when retrying a failed save.
    if (!uploaded.has(path)) {
      // A fresh selection must upload again: another device may have deleted
      // the object since this browser cached it. Upsert keeps retries idempotent.
      const { error } = await client.storage.from(photoBucket).upload(path, blob, {
        contentType: blob.type, upsert: true,
      });
      if (error) throw error;
      assertCurrentAccount(revision);
      if (!state.photoCache.has(path)) {
        const url = URL.createObjectURL(blob);
        state.photoCache.set(path, { url, bytes: blob.size, promise: Promise.resolve(url) });
      }
      trimPhotoCache();
      uploaded.set(path, { path });
    }
  }
  return [...uploaded.values()];
}

async function cloudPhotoUrl(path) {
  if (!state.user || !validPhotoPath(path, state.user.id)) throw new Error("Invalid photo owner or path");
  if (state.photoCache.has(path)) {
    const cached = state.photoCache.get(path);
    state.photoCache.delete(path);
    state.photoCache.set(path, cached);
    return cached.promise;
  }
  const revision = state.revision;
  const client = state.client;
  const item = {};
  item.promise = (async () => {
    const { data, error } = await client.storage.from(photoBucket).download(path);
    assertCurrentAccount(revision);
    if (error) throw error;
    item.url = URL.createObjectURL(data);
    item.bytes = data.size;
    trimPhotoCache();
    return item.url;
  })().catch((error) => {
    if (revision === state.revision) state.photoCache.delete(path);
    throw error;
  });
  state.photoCache.set(path, item);
  return item.promise;
}

function loadEntries() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey));
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(stageCatalog.filter((stage) => value[stage.id] && typeof value[stage.id] === "object" && !Array.isArray(value[stage.id]))
      .map((stage) => {
        const entry = value[stage.id];
        const km = Number(entry.completedKm);
        return [stage.id, {
          done: entry.done === true,
          completedKm: Number.isFinite(km) ? Math.min(stage.km, Math.max(0, km)) : 0,
          dateFrom: typeof (entry.dateFrom ?? entry.date) === "string" ? entry.dateFrom ?? entry.date : "",
          dateTo: typeof entry.dateTo === "string" ? entry.dateTo : "",
          note: typeof entry.note === "string" ? entry.note : "",
          photos: Array.isArray(entry.photos) ? entry.photos.filter((photo) => typeof photo === "string" && photo.startsWith("data:image/")) : [],
        }];
      }));
  } catch {
    return {};
  }
}

function allStages() {
  return stageCatalog;
}

function findStage(stageId) {
  return stageById.get(stageId) || null;
}

function completedKm(stage) {
  const entry = getEntry(stage.id);
  const km = Number(entry.completedKm);
  return entry.done ? stage.km : Number.isFinite(km) ? Math.min(stage.km, Math.max(0, km)) : 0;
}

function getEntry(stageId) {
  return state.entries[stageId] || { done: false, dateFrom: "", dateTo: "", note: "", photos: [] };
}

async function saveEntry(event) {
  event?.preventDefault();
  const id = elements.stageId.value;
  const stage = findStage(id);
  if (!stage || journalLocked()) return;
  elements.dateTo.setCustomValidity("");
  if (elements.dateFrom.value && elements.dateTo.value && elements.dateTo.value < elements.dateFrom.value) {
    elements.dateTo.setCustomValidity("Datum do nesmí být před datem od.");
  }
  if (!elements.form.reportValidity()) return;
  const km = elements.done.checked ? stage.km : Number(elements.completedKm.value || 0);
  if (!Number.isFinite(km) || km < 0 || km > stage.km || Math.abs(km * 10 - Math.round(km * 10)) > 1e-8) {
    elements.completedKm.setCustomValidity("Kilometry musí být mezi 0 a délkou etapy, nejvýše s jedním desetinným místem.");
    elements.completedKm.reportValidity();
    return;
  }
  const previous = getEntry(id);
  const revision = state.revision;
  const userId = state.user?.id;
  const client = state.client;
  const entry = {
    done: km === stage.km,
    completedKm: km,
    dateFrom: elements.dateFrom.value,
    dateTo: elements.dateTo.value,
    note: elements.note.value.trim(),
    photos: [...(previous.photos || []).filter((photo) => !state.removedPhotos.includes(photo)), ...state.pendingPhotos],
  };

  state.saving = true;
  updateJournalControls();
  syncMessage("Ukládám záznam…");
  let cleanupFailed = false;
  try {
    if (userId) {
      syncMessage(entry.photos.length ? "Ukládám záznam a synchronizuji fotky…" : "Ukládám záznam…");
      const addedPaths = [];
      entry.photos = await uploadCloudPhotos(entry.photos, id, userId, client, revision, addedPaths);
      const removedPaths = state.removedPhotos.filter((photo) => typeof photo !== "string").map((photo) => photo.path);
      assertCurrentAccount(revision);
      const { data, error } = await client.rpc("save_stage_progress", {
        p_stage_id: id, p_done: entry.done, p_completed_km: entry.completedKm,
        p_date_from: entry.dateFrom || null, p_date_to: entry.dateTo || null, p_note: entry.note,
        p_photo_paths: entry.photos.map((photo) => photo.path),
        ...((removedPaths.length || addedPaths.length) ? {
          p_removed_photo_paths: removedPaths, p_added_photo_paths: [...new Set(addedPaths)],
        } : {}),
      }).single();
      if (error) throw error;
      if (revision !== state.revision) return;
      entry.photos = data.photo_paths.map((path) => ({ path }));
      const deletedPaths = (data.photo_deleted_paths || []).filter((path) => validPhotoPath(path, userId, id));
      deletedPaths.forEach((path) => {
        const cached = state.photoCache.get(path);
        if (cached?.url?.startsWith("blob:")) URL.revokeObjectURL(cached.url);
        state.photoCache.delete(path);
      });
      if (deletedPaths.length) {
        try {
          const result = await client.storage.from(photoBucket).remove(deletedPaths);
          cleanupFailed = Boolean(result.error);
        } catch { cleanupFailed = true; }
        assertCurrentAccount(revision);
      }
      try {
        const photos = loadLocalPhotos(userId);
        delete photos[id];
        localStorage.setItem(`${storageKey}:photos:${userId}`, JSON.stringify(photos));
      } catch {
        // Already synchronized. A leftover local backup is safe to retry.
      }
    } else {
      // Write first so a storage failure leaves the draft available for retry.
      localStorage.setItem(storageKey, JSON.stringify({ ...state.entries, [id]: entry }));
    }
    state.entries[id] = entry;
    state.drafts.delete(id);
    state.pendingPhotos = [];
    state.removedPhotos = [];
    elements.photoInput.value = "";
    syncMessage(cleanupFailed
      ? "Záznam je uložený a fotka odebraná z etapy. Soubor se nepodařilo odstranit z úložiště; další uložení to zkusí znovu."
      : userId ? "Záznam i fotky jsou uložené v tvém účtu." : "Uloženo v tomto prohlížeči.", cleanupFailed);
    render();
  } catch (error) {
    if (revision !== state.revision) return;
    const reason = error.code === "PGRST202" || /bucket not found/i.test(error.message || "")
      ? "Úložiště fotek ještě není připravené. Spusť photo-sync.sql v Supabase."
      : error.message?.startsWith("Vyber fotky") ? error.message : "Záznam se nepodařilo uložit.";
    syncMessage(`${reason} Úpravy a fotky zůstaly ve formuláři; zkus uložení znovu.`, true);
  } finally {
    if (revision === state.revision) {
      state.saving = false;
      updateJournalControls();
    }
  }
}

async function addPhotos(event) {
  if (journalLocked()) return;
  const revision = state.revision;
  const stageId = state.selectedId;
  const files = Array.from(event.target.files || []);
  if (files.some((file) => !photoTypes[file.type] || file.size > maxPhotoBytes)) {
    syncMessage("Vyber fotky JPG, PNG, WebP nebo GIF, každou nejvýše 10 MB.", true);
    elements.photoInput.value = "";
    return;
  }
  state.readingPhotos = true;
  updateJournalControls();
  try {
    const images = await Promise.all(files.map(readImage));
    if (revision !== state.revision || stageId !== state.selectedId) return;
    state.pendingPhotos.push(...images);
    elements.photoInput.value = "";
    renderPhotos();
  } catch {
    if (revision === state.revision) syncMessage("Fotky se nepodařilo načíst. Zkus je vybrat znovu.", true);
  } finally {
    if (revision === state.revision) {
      state.readingPhotos = false;
      updateJournalControls();
    }
  }
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function render() {
  renderMap();
  renderList();
  renderJournal();
  renderStats();
  updateJournalPlacement();
}

function updateJournalPlacement() {
  const selectedButton = elements.list.querySelector(".stage-button.active");
  if (window.matchMedia("(max-width: 860px)").matches && selectedButton) {
    if (selectedButton.nextElementSibling !== elements.form) selectedButton.insertAdjacentElement("afterend", elements.form);
  } else if (elements.form.parentElement !== elements.content) {
    elements.content.appendChild(elements.form);
  }
}

function renderMap() {
  renderRouteSegments();
}

function renderRouteSegments() {
  stageCatalog.forEach((stage) => {
    const entry = getEntry(stage.id);
    let view = mapViews.get(stage.id);
    if (!view) {
      const segment = document.createElementNS("http://www.w3.org/2000/svg", "path");
      segment.classList.add("route-segment", stage.branchId);
      segment.setAttribute("d", createSmoothPath(routePoints(stage)));
      segment.setAttribute("tabindex", "0");
      segment.setAttribute("role", "button");
      segment.setAttribute("aria-controls", "journalForm");
      segment.addEventListener("click", () => selectStage(stage.id));
      segment.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectStage(stage.id);
        }
      });
      elements.routeSegments.appendChild(segment);
      // Leave a small gap at each end so adjacent stages remain distinct.
      const length = segment.getTotalLength();
      const gap = Math.min(7, length / 5);
      segment.setAttribute("stroke-dasharray", `${length - gap * 2} ${length + gap * 2}`);
      segment.setAttribute("stroke-dashoffset", -gap);
      const partial = document.createElementNS("http://www.w3.org/2000/svg", "path");
      partial.classList.add("route-segment", "partial");
      partial.setAttribute("d", segment.getAttribute("d"));
      partial.setAttribute("aria-hidden", "true");
      partial.setAttribute("stroke-dashoffset", -gap);
      elements.routeSegments.appendChild(partial);
      view = { segment, partial, length, gap };
      mapViews.set(stage.id, view);
    }
    const km = completedKm(stage);
    const active = stage.id === state.selectedId;
    view.segment.classList.toggle("done", entry.done);
    view.segment.classList.toggle("active", active);
    view.segment.setAttribute("aria-expanded", String(active));
    view.segment.setAttribute("aria-label", `${stage.name}, ${formatKm(km)} z ${formatKm(stage.km)} km`);
    view.partial.style.display = km > 0 && !entry.done ? "" : "none";
    view.partial.classList.toggle("active", active);
    view.partial.setAttribute("stroke-dasharray", `${(view.length - view.gap * 2) * km / stage.km} ${view.length + view.gap * 2}`);
  });
}

function routePoints(stage) {
  return (routeGeometry[stage.id] || [[stage.lon, stage.lat]]).map(([lon, lat]) => project(lon, lat));
}

function createSmoothPath(points) {
  return points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      const control = midpoint(previous, point);
      return `Q ${control.x} ${control.y} ${point.x} ${point.y}`;
    })
    .join(" ");
}

function project(lon, lat) {
  return {
    x: round(70 + ((lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * 760),
    y: round(65 + ((mapBounds.maxLat - lat) / (mapBounds.maxLat - mapBounds.minLat)) * 430),
  };
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function midpoint(a, b) {
  return {
    x: round((a.x + b.x) / 2),
    y: round((a.y + b.y) / 2),
  };
}

function renderList() {
  if (!listViews.size) Object.entries(branches).forEach(([branchId, branch]) => {
    const group = document.createElement("section");
    group.className = "stage-group";
    const heading = document.createElement("h3");
    heading.textContent = branch.name;
    const count = document.createElement("span");
    heading.appendChild(count);
    branchCounters.set(branchId, count);
    group.appendChild(heading);

    branch.stages.forEach((stage) => {
      const button = elements.template.content.firstElementChild.cloneNode(true);
      button.querySelector("strong").textContent = stage.name;
      button.setAttribute("aria-controls", "journalForm");
      button.addEventListener("click", () => selectStage(stage.id));
      listViews.set(stage.id, button);
      group.appendChild(button);
    });
    elements.list.appendChild(group);
  });
  Object.entries(branches).forEach(([branchId, branch]) => {
    const done = branch.stages.filter((stage) => getEntry(stage.id).done).length;
    branchCounters.get(branchId).textContent = `${done}/${branch.stages.length}`;
    branch.stages.forEach((stage) => {
      const entry = getEntry(stage.id);
      const button = listViews.get(stage.id);
      button.classList.toggle("done", entry.done);
      button.classList.toggle("partial", !entry.done && completedKm(stage) > 0);
      button.classList.toggle("active", stage.id === state.selectedId);
      button.setAttribute("aria-expanded", String(stage.id === state.selectedId));
      button.querySelector("small").textContent = `${formatKm(completedKm(stage))} / ${formatKm(stage.km)} km`;
    });

  });
}

function renderJournal() {
  elements.photoStorageNote.textContent = state.user
    ? "Fotky se po uložení etapy synchronizují do tvého účtu. JPG, PNG, WebP a GIF, nejvýše 10 MB na fotku."
    : "Bez přihlášení zůstávají fotky pouze v tomto prohlížeči.";
  elements.dateTo.setCustomValidity("");
  const stage = state.selectedId ? findStage(state.selectedId) : null;
  if (!stage) {
    elements.form.classList.add("empty");
    elements.stageId.value = "";
    elements.stageBranch.textContent = "";
    elements.stageTitle.textContent = "Vyber etapu";
    elements.stageDistance.textContent = "";
    elements.selectedStageName.textContent = "\u017d\u00e1dn\u00e1 etapa nen\u00ed vybran\u00e1";
    elements.done.checked = false;
    elements.completedKm.value = "";
    elements.completedKm.disabled = true;
    elements.dateFrom.value = "";
    elements.dateTo.value = "";
    elements.note.value = "";
    elements.done.disabled = true;
    elements.dateFrom.disabled = true;
    elements.dateTo.disabled = true;
    elements.note.disabled = true;
    elements.photoInput.disabled = true;
    elements.save.disabled = true;
    elements.photoPreview.innerHTML = "";
    return;
  }

  const entry = getEntry(stage.id);
  const draft = state.drafts.get(stage.id);
  elements.form.classList.remove("empty");
  elements.stageId.value = stage.id;
  elements.stageBranch.textContent = stage.branchName;
  elements.stageTitle.textContent = stage.name;
  elements.stageDistance.textContent = `${formatKm(stage.km)} km`;
  elements.selectedStageName.textContent = stage.name;
  elements.done.checked = draft?.done ?? entry.done;
  elements.completedKm.max = stage.km;
  elements.completedKm.value = draft?.completedKm ?? completedKm(stage);
  elements.completedKm.setCustomValidity("");
  elements.done.disabled = false;
  elements.dateFrom.disabled = false;
  elements.dateTo.disabled = false;
  elements.note.disabled = false;
  elements.photoInput.disabled = false;
  elements.save.disabled = false;
  elements.dateFrom.value = draft?.dateFrom ?? entry.dateFrom ?? entry.date ?? "";
  elements.dateTo.value = draft?.dateTo ?? entry.dateTo ?? "";
  elements.note.value = draft?.note ?? entry.note ?? "";
  updateJournalControls();
  renderPhotos();
}

function renderPhotos() {
  if (!state.selectedId) return;
  const entry = getEntry(state.selectedId);
  const savedPhotos = (entry.photos || []).filter((photo) => !state.removedPhotos.includes(photo));
  const photos = [...savedPhotos, ...state.pendingPhotos];
  trimPhotoCache();
  elements.photoPreview.innerHTML = "";

  const revision = state.revision;
  if (state.user && (entry.photos || []).some((photo) => typeof photo === "string")) {
    elements.photoStorageNote.textContent = "Ulož etapu a přenes do účtu i její starší fotky z tohoto prohlížeče.";
  }
  photos.forEach((photo, index) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "photo-open";
    preview.setAttribute("aria-label", `Zvětšit fotku ${index + 1}`);
    const image = document.createElement("img");
    image.decoding = "async";
    image.alt = "Fotka z etapy";
    preview.appendChild(image);
    preview.addEventListener("click", () => {
      if (!image.getAttribute("src")) return;
      elements.photoDialogImage.src = image.src;
      elements.photoDialogImage.alt = `Fotka z etapy ${findStage(state.selectedId).name}`;
      elements.photoDialog.showModal();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "photo-remove";
    remove.textContent = "Smazat";
    remove.setAttribute("aria-label", `Smazat fotku ${index + 1}`);
    remove.disabled = journalLocked();
    remove.addEventListener("click", () => {
      if (journalLocked()) return;
      if (index < savedPhotos.length) state.removedPhotos.push(photo);
      else state.pendingPhotos.splice(index - savedPhotos.length, 1);
      renderPhotos();
      elements.photoPreview.querySelectorAll(".photo-remove")[Math.min(index, elements.photoPreview.children.length - 1)]?.focus();
      if (!elements.photoPreview.children.length) elements.save.focus();
      syncMessage("Fotka je odebraná z rozpracované etapy. Změnu potvrď tlačítkem Uložit.");
    });
    card.append(preview, remove);
    elements.photoPreview.appendChild(card);
    if (typeof photo === "string") {
      image.src = photo;
    } else {
      image.alt = "Načítám fotku z etapy…";
      cloudPhotoUrl(photo.path).then((src) => {
        if (revision !== state.revision || !image.isConnected) return;
        image.src = src;
        image.alt = "Fotka z etapy";
      }).catch(() => {
        if (revision !== state.revision || !image.isConnected) return;
        image.alt = "Fotku se nepodařilo načíst";
        syncMessage("Fotku se nepodařilo načíst. Zkontroluj připojení a znovu otevři etapu.", true);
      });
    }
  });
}

function closePhotoPreview() {
  if (elements.photoDialog.open) elements.photoDialog.close();
}

function renderStats() {
  const stages = allStages();
  const done = stages.filter((stage) => getEntry(stage.id).done).length;
  const walkedKm = stages.reduce((sum, stage) => sum + completedKm(stage), 0);
  const percent = totalRouteKm ? Math.round((walkedKm / totalRouteKm) * 100) : 0;

  elements.progressPercent.textContent = `${percent}%`;
  elements.progressText.textContent = `${formatKm(walkedKm)} / ${formatKm(totalRouteKm)} km`;
  elements.doneCount.textContent = `${done}/${stages.length}`;
  updateProgressRing(percent);
}

function selectStage(stageId) {
  if (state.saving || state.readingPhotos || !findStage(stageId)) return;
  rememberDraft();
  state.selectedId = state.selectedId === stageId ? null : stageId;
  state.pendingPhotos = [...(state.drafts.get(state.selectedId)?.pendingPhotos || [])];
  state.removedPhotos = [...(state.drafts.get(state.selectedId)?.removedPhotos || [])];
  render();
  if (state.selectedId && window.matchMedia("(max-width: 860px)").matches) {
    elements.list.querySelector(".stage-button.active")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }
}

function rememberDraft() {
  if (!state.selectedId || journalLocked()) return;
  state.drafts.set(state.selectedId, {
    done: elements.done.checked, completedKm: elements.completedKm.value,
    dateFrom: elements.dateFrom.value, dateTo: elements.dateTo.value,
    note: elements.note.value, pendingPhotos: [...state.pendingPhotos],
    removedPhotos: [...state.removedPhotos],
  });
}

function updateProgressRing(percent) {
  const radius = Number(elements.progressRing.getAttribute("r"));
  const length = 2 * Math.PI * radius;
  elements.progressRing.style.strokeDasharray = length;
  elements.progressRing.style.strokeDashoffset = length - length * (percent / 100);
}

function formatKm(value) {
  return kmFormatter.format(value);
}



