// Mdl TWS (Tanzania 3D Interactive Weather System) — Main Application Entry
import * as THREE from 'three';
import './style.css';
import {
  MONTHS,
  SCENARIOS,
  RAIN_STATUS,
  TEMP_STATUS,
  rainAnomaly,
  tempAnomaly,
  actualTempC,
  heatIndexC,
  sampleWind,
  getStationLiveWeather,
  getRainTier,
  getTempTier,
  getImpacts,
  clamp,
} from './data/climate.js';
import { fetchLiveTanzaniaWeather } from './data/liveWeather.js';
import { buildTerrain, relief, inLand, inLake } from './world/terrain.js';
import { buildEnvironment } from './world/environment.js';
import { buildRivers } from './world/rivers.js';
import { buildWorldDetails } from './world/details.js';
import { buildMarkers } from './world/markers.js';
import { buildWeatherSystems } from './world/weather.js';
import { createPostPipeline } from './render/post.js';
import { initHUD, $, fmtPct, fmtDeg, fmtTempAnom } from './ui/hud.js';

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.4, 720);

// Natural Daylight & Atmospheric Lighting
const ambientLight = new THREE.AmbientLight(0x9dc2e0, 0.95);
const hemiLight = new THREE.HemisphereLight(0xb2e2ff, 0x1e3024, 0.65);
const sunLight = new THREE.DirectionalLight(0xfff4e2, 1.55);
sunLight.position.set(-45, 72, 36);

const warmFillLight = new THREE.DirectionalLight(0xff965c, 0.32);
warmFillLight.position.set(55, 30, -18);

scene.add(ambientLight, hemiLight, sunLight, warmFillLight);

const waterUniforms = {
  uT: { value: 0 },
  uNino: { value: 3.3 },
};

// Build 3D World Modules
const { rings, regLines, sweep } = buildEnvironment(scene, waterUniforms);
const { terr, wf, shelfMesh, coastGlow, updateSurface, lift } = buildTerrain(
  scene,
  waterUniforms,
  renderer
);
const { riversGroup, updateRivers } = buildRivers(scene, waterUniforms);
const { detailsGroup, updateDetails } = buildWorldDetails(scene, waterUniforms);
const { sites, probeGroup, townPoints, updateMarkers } = buildMarkers(scene, $('labels'));
const { rainMesh, streamMesh, heatPts, updateStreams, updateWeather } = buildWeatherSystems(
  scene,
  sites
);
const post = createPostPipeline(renderer, scene, cam);

// Application State (Opens in 'live' Open-Meteo mode by default)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  scenario: 'live', // 'live' | 'elnino' | 'cyclone' | 'lanina' | 'deluge'
  tm: 0,
  playing: false, // In 'live' mode, starts at 'Now' (tm=0); auto-plays when switching to seasonal scenarios
  speed: 1,
  nino: 3.3,
  relScale: 1,
  dataMode: 'both', // 'both' | 'rain' | 'temp'
  cur: -1,
  hov: -1,
  auto: !reducedMotion,
  mode: !reducedMotion ? 'over' : 'free',
  probeP: null,
  layers: {
    surf: 1,
    cities: 1,
    rivers: 1,
    reg: 1,
    flow: 1,
    cloud: 1,
    lab: 1,
    radar: 0,
  },
};

function updateSiteMetrics() {
  const isLive = state.scenario === 'live';
  sites.forEach((s) => {
    const h = s.baseH || (s.baseH = relief(s.x, s.z));
    if (isLive) {
      const lw = getStationLiveWeather(s.i, state.tm);
      s.precipMm = lw.precipMm;
      s.cloudCover = lw.cloudCover;
      s.weatherCode = lw.weatherCode;
      s.weatherDesc = lw.weatherDesc;
      s.isRaining = lw.isRaining;
      s.rainA = lw.rainA;
      s.tempA = lw.tempA;
      s.absTemp = lw.tempC;
      s.feelsLike = lw.feelsLike;
      s.windKmh = lw.windKmh;
      s.windDir = lw.windDir;
      s.rainSt = getRainTier(s.rainA, true, s.precipMm);
      s.tempSt = getTempTier(s.tempA, s.absTemp);
    } else {
      s.rainA = rainAnomaly(s.x, s.z, state.tm, state.nino, state.scenario);
      s.tempA = tempAnomaly(s.x, s.z, state.tm, state.nino, state.scenario);
      s.absTemp = actualTempC(s.x, s.z, h, state.tm, state.nino, state.scenario);
      s.feelsLike = heatIndexC(s.x, s.z, h, state.tm, state.nino, state.scenario);
      const w = sampleWind(s.x, s.z, state.tm, state.nino, state.scenario);
      s.windKmh = w.speedKmh;
      s.windDir = w.dirDeg;
      s.precipMm = s.rainA > 15 ? s.rainA * 0.08 : 0;
      s.cloudCover = clamp(35 + s.rainA * 0.55, 10, 100);
      s.isRaining = s.rainA > 15;
      s.rainSt = getRainTier(s.rainA, false, 0);
      s.tempSt = getTempTier(s.tempA, s.absTemp);
    }
  });

  const meanTempAnom = sites.reduce((a, s) => a + s.tempA, 0) / sites.length;
  warmFillLight.intensity = 0.22 + clamp((meanTempAnom - 0.8) / 3.0, 0, 1) * 0.38;
}

// Camera Orbit & Close-Up Zoom Controller
const camSt = { th: 0.56, ph: 0.92, d: 142, tx: 0, tz: 0 };
const camTg = { ...camSt };
let phaseT = 10,
  hold = 0,
  focusIdx = 2, // Dar es Salaam
  pickCounter = 0;

const overviewDist = () => 122 / Math.min(1, cam.aspect * 1.3);
const sortedSites = () =>
  [...sites].sort((a, b) =>
    state.dataMode === 'temp'
      ? b.tempA + b.absTemp * 0.1 - (a.tempA + a.absTemp * 0.1)
      : Math.abs(b.rainA) - Math.abs(a.rainA)
  );

function openRegion(i) {
  state.cur = i;
  focusIdx = i;
  state.mode = 'focus';
  hold = 1e9;
  $('modal').classList.add('open');
  document.body.classList.add('mo');
  hud.drawModal();
}

function closeRegion() {
  state.cur = -1;
  $('modal').classList.remove('open');
  document.body.classList.remove('mo');
  hold = state.auto ? 3 : 0;
}

const hud = initHUD(state, sites, { openRegion, closeRegion });

// Initial world geometry placement
updateSiteMetrics();
updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario);
updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);

// Fetch Real-Time Open-Meteo Weather for Tanzania on startup
function syncLiveWeather(showToast = false) {
  fetchLiveTanzaniaWeather((ls) => {
    hud.updateScenarioHeader();
    if (ls.status === 'live' || ls.status === 'fallback') {
      updateSiteMetrics();
      hud.rebuildCurves();
      updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario, true);
      updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
      updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
      hud.updateHUD(10, true);
      if (showToast && ls.status === 'live') {
        hud.toast('Synced live Open-Meteo weather across Tanzania');
      }
    }
  });
}
syncLiveWeather(false);
setInterval(() => syncLiveWeather(false), 300000); // Auto-refresh live weather every 5 minutes

$('btn-refresh').onclick = () => syncLiveWeather(true);

function switchToFreeCam() {
  if (state.mode !== 'free' || state.auto) {
    state.mode = 'free';
    state.auto = false;
    hud.updateButtonsUI();
  }
}

function driveCamera(dt) {
  if (state.auto) {
    if (hold > 0) hold -= dt;
    else {
      phaseT -= dt;
      if (phaseT <= 0) {
        if (state.mode === 'over') {
          focusIdx = sortedSites()[pickCounter++ % 4].i;
          state.mode = 'focus';
          phaseT = 9;
        } else {
          state.mode = 'over';
          phaseT = 8;
        }
      }
    }
  }
  if (state.mode === 'over') {
    camTg.tx = 0;
    camTg.tz = 0;
    camTg.d = overviewDist();
    camTg.ph = 0.92;
    camTg.th += reducedMotion ? 0 : dt * 0.048;
  } else if (state.mode === 'focus') {
    const s = sites[focusIdx];
    camTg.tx = s.x;
    camTg.tz = s.z;
    // Zoom in close (d = 19) so 3D city skylines, trees, rivers & clouds are clearly visible!
    camTg.d = 19;
    camTg.ph = 1.02;
    camTg.th += reducedMotion ? 0 : dt * 0.085;
  }

  const k = 1 - Math.exp(-dt * 2.4);
  for (const p of ['th', 'ph', 'd', 'tx', 'tz']) {
    camSt[p] += (camTg[p] - camSt[p]) * k;
  }
  const focusY =
    state.mode === 'focus'
      ? relief(camSt.tx, camSt.tz) * 0.95 * state.relScale * 0.65
      : 0;
  cam.position.set(
    camSt.tx + camSt.d * Math.sin(camSt.ph) * Math.sin(camSt.th),
    focusY + camSt.d * Math.cos(camSt.ph),
    camSt.tz + camSt.d * Math.sin(camSt.ph) * Math.cos(camSt.th)
  );
  cam.lookAt(camSt.tx, focusY, camSt.tz);
}

// Pointer & Raycasting Interaction
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
let mx = -1,
  my = -1;

const castFromScreen = (x, y) => {
  mouseNDC.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouseNDC, cam);
};

const hitSite = (x, y) => {
  castFromScreen(x, y);
  const hits = raycaster.intersectObjects(sites.map((s) => s.hit));
  return hits.length ? hits[0].object.userData.s.i : -1;
};

function handleTap(x, y) {
  const idx = hitSite(x, y);
  if (idx >= 0) {
    openRegion(idx);
    return;
  }
  castFromScreen(x, y);
  const hits = raycaster.intersectObject(terr);
  if (hits.length) {
    state.probeP = hits[0].point.clone();
    probeGroup.visible = true;
    hud.updateHUD(10, true);
  } else {
    state.probeP = null;
    probeGroup.visible = false;
    $('probe').textContent =
      'Tap the terrain or any city pin to inspect 3D buildings, rivers & weather';
  }
}

const pointers = new Map();
const pinchDist = () => {
  const a = [...pointers.values()];
  return Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) || 1;
};
let downInfo = null;

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  downInfo = pointers.size === 1 ? [e.clientX, e.clientY, performance.now()] : null;
});

canvas.addEventListener('pointermove', (e) => {
  mx = e.clientX;
  my = e.clientY;
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  if (pointers.size === 1) {
    if (downInfo && Math.hypot(e.clientX - downInfo[0], e.clientY - downInfo[1]) < 6) return;
    camTg.th -= (e.clientX - prev[0]) * 0.006;
    camTg.ph = clamp(camTg.ph - (e.clientY - prev[1]) * 0.005, 0.22, 1.44);
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    switchToFreeCam();
  } else {
    const pv = pinchDist();
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    camTg.d = clamp((camTg.d * pv) / pinchDist(), 5.5, 320);
    switchToFreeCam();
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (
    downInfo &&
    pointers.size === 1 &&
    Math.hypot(e.clientX - downInfo[0], e.clientY - downInfo[1]) < 6 &&
    performance.now() - downInfo[2] < 500
  ) {
    handleTap(e.clientX, e.clientY);
  }
  pointers.delete(e.pointerId);
  downInfo = null;
});

canvas.addEventListener('pointercancel', (e) => {
  pointers.delete(e.pointerId);
  downInfo = null;
});
canvas.addEventListener('pointerleave', () => {
  mx = -1;
});
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    camTg.d = clamp(camTg.d * (1 + e.deltaY * 0.001), 5.5, 320);
    switchToFreeCam();
  },
  { passive: false }
);

// Bind UI Controls
const toggleDock = (forceMin) => {
  const isMin = typeof forceMin === 'boolean' ? forceMin : !$('dock').classList.contains('min');
  $('dock').classList.toggle('min', isMin);
  document.body.classList.toggle('dock-min', isMin);
};
$('dock-min').onclick = () => toggleDock(true);
$('dock-open').onclick = () => toggleDock(false);

document.querySelectorAll('.tab').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === b));
    document
      .querySelectorAll('#dock section')
      .forEach((s) => (s.hidden = s.dataset.s !== b.dataset.t));
  };
});

// Scenario Switcher (Live Now | El Niño + IOD | Cyclone | La Niña Drought | Highland Deluge)
const sl = $('tm');
document.querySelectorAll('.scen-btn').forEach((b) => {
  b.onclick = () => {
    state.scenario = b.dataset.sc;
    if (state.scenario === 'live') {
      state.tm = 0;
      sl.value = 0;
      state.playing = false;
    } else if (state.scenario === 'cyclone') {
      state.tm = 2.6; // Start right as cyclone approaches coast
      sl.value = 2.6;
      state.playing = !reducedMotion;
    } else {
      state.playing = !reducedMotion;
    }
    updateSiteMetrics();
    hud.rebuildCurves();
    hud.updateButtonsUI();
    updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario);
    updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
    updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
    hud.updateHUD(10, true);
    hud.toast(`Switched to ${SCENARIOS[state.scenario].title}`);
  };
});

document.querySelectorAll('.mode-btn[data-m]').forEach((b) => {
  b.onclick = () => {
    state.dataMode = b.dataset.m;
    hud.updateButtonsUI();
    updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario);
    updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
    updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
    hud.updateHUD(10, true);
  };
});

let radarChipBtn = null;
const syncRadarUI = () => {
  const on = !!state.layers.radar;
  const qb = $('q-radar');
  if (qb) {
    qb.classList.toggle('on', on);
    qb.textContent = on ? 'Radar: On' : 'Radar: Off';
  }
  if (radarChipBtn) {
    radarChipBtn.classList.toggle('on', on);
    radarChipBtn.setAttribute('aria-pressed', on);
  }
};
if ($('q-radar')) {
  $('q-radar').onclick = () => {
    state.layers.radar = !state.layers.radar;
    syncRadarUI();
  };
}

sl.oninput = () => {
  state.tm = +sl.value;
  state.playing = false;
  hud.updateButtonsUI();
  updateSiteMetrics();
  updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario);
  updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
  updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
  hud.updateHUD(10, true);
};

$('ply').onclick = () => {
  state.playing = !state.playing;
  hud.updateButtonsUI();
};

$('spd').onclick = () => {
  state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1;
  hud.updateButtonsUI();
};

const stepMonth = (d) => {
  state.tm = (Math.floor(state.tm) + d + 6) % 6;
  sl.value = state.tm;
  state.playing = false;
  hud.updateButtonsUI();
  updateSiteMetrics();
  updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario);
  updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
  updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
  hud.updateHUD(10, true);
};
$('pv').onclick = () => stepMonth(-1);
$('nx').onclick = () => stepMonth(1);

$('ns').oninput = (e) => {
  state.nino = +e.target.value;
  waterUniforms.uNino.value = state.nino;
  $('nl').textContent =
    '+' + state.nino.toFixed(1) + '°C' + (state.nino === 3.3 ? ' (strong)' : ' scenario');
  hud.rebuildCurves();
  updateSiteMetrics();
  updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario);
  updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
  hud.updateHUD(10, true);
};

$('rx').oninput = (e) => {
  state.relScale = +e.target.value;
  updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario);
  updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
  updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
};

$('auto').onclick = () => {
  state.auto = !state.auto;
  if (state.auto) {
    state.mode = 'over';
    phaseT = 1;
  }
  hud.updateButtonsUI();
};

$('rst').onclick = () => {
  closeRegion();
  state.auto = true;
  state.mode = 'over';
  phaseT = 9;
  camTg.th = 0.56;
  hud.updateButtonsUI();
};

const stepRegion = (d) => openRegion((state.cur + d + sites.length) % sites.length);
$('mx').onclick = closeRegion;
$('mpv').onclick = () => stepRegion(-1);
$('mnx').onclick = () => stepRegion(1);

function copyText(t) {
  const done = () => hud.toast('Copied to clipboard');
  try {
    navigator.clipboard.writeText(t).then(done, fallback);
  } catch {
    fallback();
  }
  function fallback() {
    const a = document.createElement('textarea');
    a.value = t;
    document.body.appendChild(a);
    a.select();
    try {
      document.execCommand('copy');
      done();
    } catch {
      hud.toast('Copy not available');
    }
    a.remove();
  }
}

const makeStamp = () => {
  const sc = SCENARIOS[state.scenario];
  const mi = Math.floor(state.tm);
  const timeStr =
    state.scenario === 'live'
      ? `Live (+${Math.round((state.tm / 6) * 24)}h)`
      : `${MONTHS[mi]} ${mi < 3 ? 2026 : 2027}`;
  return `Mdl TWS (Tanzania 3D Interactive Weather System) — ${sc.title} [${timeStr}]`;
};

$('mcp').onclick = () => {
  const s = sites[state.cur];
  copyText(
    `${makeStamp()}\n${s.n}: Rain ${fmtPct(s.rainA)} (${RAIN_STATUS[s.rainSt]}) | Temp ${fmtDeg(
      s.absTemp
    )} (${fmtTempAnom(s.tempA)}, ${TEMP_STATUS[s.tempSt]}, feels like ${fmtDeg(
      s.feelsLike
    )}) | Wind ${Math.round(s.windKmh)} km/h. ${
      getImpacts(s.rainA, s.tempA, s.absTemp, state.scenario, s.windKmh)[0]
    }.`
  );
};

$('cpall').onclick = () =>
  copyText(
    `${makeStamp()}\n` +
      sortedSites()
        .map(
          (s) =>
            `${s.n}: ${fmtDeg(s.absTemp)} (${fmtTempAnom(s.tempA)}) · Rain ${fmtPct(s.rainA)} (${
              RAIN_STATUS[s.rainSt]
            }) · Wind ${Math.round(s.windKmh)} km/h`
        )
        .join('\n')
  );

[
  ['surf', 'Terrain & beaches'],
  ['cities', '3D Cities & trees'],
  ['rivers', 'Rivers & basins'],
  ['reg', 'Station pins'],
  ['flow', 'Wind vectors'],
  ['cloud', '3D Clouds & storms'],
  ['lab', 'Labels'],
  ['radar', 'Radar sweep'],
].forEach(([k, label]) => {
  const b = document.createElement('button');
  b.className = state.layers[k] ? 'b on' : 'b';
  b.textContent = label;
  b.setAttribute('aria-pressed', !!state.layers[k]);
  b.onclick = () => {
    state.layers[k] = !state.layers[k];
    b.classList.toggle('on', !!state.layers[k]);
    b.setAttribute('aria-pressed', !!state.layers[k]);
    if (k === 'radar') syncRadarUI();
  };
  if (k === 'radar') radarChipBtn = b;
  $('chips').appendChild(b);
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === ' ' && state.scenario !== 'live') {
    e.preventDefault();
    state.playing = !state.playing;
    hud.updateButtonsUI();
  } else if (e.key === 'ArrowRight' && state.scenario !== 'live') stepMonth(1);
  else if (e.key === 'ArrowLeft' && state.scenario !== 'live') stepMonth(-1);
  else if (e.key === 'Escape') closeRegion();
  else if (e.key === 'h' || e.key === 'H') toggleDock();
});

function onResize() {
  const w = window.innerWidth,
    h = window.innerHeight;
  renderer.setSize(w, h, false);
  post.resize(w, h);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();
camSt.d = camTg.d = overviewDist();
hud.updateButtonsUI();

// Optional URL query deep-linking (?sc=cyclone|elnino|lanina|deluge|live & ?focus=0..8)
{
  const params = new URLSearchParams(window.location.search);
  const qSc = params.get('sc');
  if (qSc && SCENARIOS[qSc]) {
    const btn = document.querySelector(`.scen-btn[data-sc="${qSc}"]`);
    if (btn) btn.click();
  }
  const qFocus = params.get('focus');
  if (qFocus !== null && sites[+qFocus]) {
    openRegion(+qFocus);
    camSt.tx = camTg.tx;
    camSt.tz = camTg.tz;
    camSt.d = camTg.d = 17.5;
    camSt.ph = camTg.ph = 1.02;
  }
}

// Main Render & Simulation Loop
let T = 0,
  frameCount = 0,
  lastTime = performance.now();

renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  T += dt;

  if (state.playing) {
    state.tm = (state.tm + (dt / 8) * state.speed) % 6;
    sl.value = state.tm;
  }

  updateSiteMetrics();
  waterUniforms.uT.value = T;

  if (state.layers.surf && (state.playing || frameCount % 4 === 0)) {
    updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario);
    updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
    updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
  }

  driveCamera(dt);

  if (state.layers.flow) {
    updateStreams(dt, T, state.tm, state.nino, state.relScale, state.dataMode, state.scenario);
  }

  terr.visible =
    wf.visible =
    shelfMesh.visible =
    coastGlow.visible =
      !!state.layers.surf;
  detailsGroup.visible = !!state.layers.cities;
  townPoints.visible = !!state.layers.cities;
  riversGroup.visible = !!state.layers.rivers;
  regLines.visible = !!state.layers.reg;
  streamMesh.visible = !!state.layers.flow;
  rainMesh.visible = !!state.layers.cloud && state.dataMode !== 'temp';
  heatPts.visible = !!state.layers.cloud;
  sweep.visible = !!state.layers.radar;
  rings.forEach((r) => (r.visible = !!state.layers.radar));
  $('labels').style.display = state.layers.lab ? 'block' : 'none';

  if (frameCount % 3 === 0) {
    const h = mx >= 0 && !pointers.size ? hitSite(mx, my) : -1;
    if (h !== state.hov) {
      state.hov = h;
      canvas.style.cursor = h >= 0 ? 'pointer' : 'default';
    }
  }

  updateMarkers({
    T,
    relScale: state.relScale,
    liftFn: lift,
    dataMode: state.dataMode,
    hovIdx: state.hov,
    curIdx: state.cur,
    cam,
    camDist: camSt.d,
    focusMode: state.mode === 'focus',
    focusIdx,
    labelsVisible: !!state.layers.lab,
    regionsVisible: !!state.layers.reg,
  });

  updateWeather(T, dt, !!state.layers.cloud, state.dataMode, state.tm, state.scenario);

  if (state.probeP) {
    const py =
      relief(state.probeP.x, state.probeP.z) * 0.95 * state.relScale +
      lift(rainAnomaly(state.probeP.x, state.probeP.z, state.tm, state.nino, state.scenario));
    probeGroup.position.set(state.probeP.x, py, state.probeP.z);
    probeGroup.rotation.y = T * 1.4;
  }

  if (state.layers.radar) {
    rings.forEach((r, i) => {
      r.rotation.y += dt * (i % 2 ? -0.045 : 0.03) * (reducedMotion ? 0 : 1);
    });
  }

  if (frameCount++ % 2 === 0) hud.drawPacificDiagram(T);
  hud.updateHUD(dt);

  post.composer.render();
});
