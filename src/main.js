// Mdl TWS v3.0 (Tanzania 3D Interactive Weather & Hydrological Atlas) — Main Application Entry
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
  wp,
  clamp,
  syncCountryClimateArrays,
} from './data/climate.js';
import { getCountry, getActiveCountryId, setActiveCountry, COUNTRIES } from './data/countries/index.js';
import { fetchLiveCountryWeather } from './data/liveWeather.js';
import { buildTerrain, relief, syncCountryTerrainData } from './world/terrain.js';
import { buildEnvironment } from './world/environment.js';
import { buildRivers, syncCountryRiverPaths } from './world/rivers.js';
import { buildWorldDetails } from './world/details.js';
import { buildLandmarks, REGION_LANDMARK_META, syncCountryLandmarkMeta } from './world/landmarks.js';
import { buildMarkers } from './world/markers.js';
import { buildWeatherSystems } from './world/weather.js';
import { createPostPipeline } from './render/post.js';
import { createDayNightSystem } from './world/sky.js';
import { initHUD, $, fmtPct, fmtDeg, fmtTempAnom } from './ui/hud.js';

// Check URL query param ?country=ke|tz before initial world build
{
  const initParams = new URLSearchParams(window.location.search);
  const qCountry = initParams.get('country');
  if (qCountry && COUNTRIES[qCountry]) {
    setActiveCountry(qCountry);
    syncCountryClimateArrays();
    syncCountryTerrainData();
    syncCountryRiverPaths();
    syncCountryLandmarkMeta();
  }
}

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Enable PCF Soft Shadows optimized for integrated GPUs & high visual realism
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.4, 720);

// Natural Daylight & Atmospheric Lighting
const ambientLight = new THREE.AmbientLight(0x9dc2e0, 0.95);
const hemiLight = new THREE.HemisphereLight(0xb2e2ff, 0x1e3024, 0.65);
const sunLight = new THREE.DirectionalLight(0xfff4e2, 1.55);
sunLight.position.set(-45, 72, 36);

// Tightly configured DirectionalLight shadow frustum covering Tanzania
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 240;
sunLight.shadow.camera.left = -78;
sunLight.shadow.camera.right = 78;
sunLight.shadow.camera.top = 78;
sunLight.shadow.camera.bottom = -78;
sunLight.shadow.bias = -0.0006;
sunLight.shadow.normalBias = 0.025;

const warmFillLight = new THREE.DirectionalLight(0xff965c, 0.32);
warmFillLight.position.set(55, 30, -18);

scene.add(ambientLight, hemiLight, sunLight, warmFillLight);

// 24h Diurnal Sun Arc & Celestial Sky System
const dayNight = createDayNightSystem(scene, renderer, sunLight, ambientLight, hemiLight);

const waterUniforms = {
  uT: { value: 0 },
  uNino: { value: 3.3 },
  uSunDir: { value: dayNight.getSunDir() },
  uSunColor: { value: dayNight.getSunColor() },
  uSkyHorizon: { value: dayNight.getHorizonColor() },
  uSkyZenith: { value: dayNight.getZenithColor() },
  uNight: { value: 0.0 },
};

// Build 3D World Modules
const { rings, regLines, sweep, updateCoastMask } = buildEnvironment(scene, waterUniforms);
let terrainObj = buildTerrain(scene, waterUniforms, renderer);
let { terr, wf, shelfMesh, coastGlow, updateSurface, lift } = terrainObj;
const { riversGroup, hitMeshes, setHoverRiver, updateRivers, rebuildRivers } = buildRivers(
  scene,
  waterUniforms
);
const { detailsGroup, updateDetails, rebuildDetails } = buildWorldDetails(scene, waterUniforms);
const { landmarksGroup, updateLandmarks, rebuildLandmarks } = buildLandmarks(scene);
const { sites, probeGroup, townPoints, updateMarkers, rebuildMarkers } = buildMarkers(
  scene,
  $('labels')
);
const { rainMesh, streamMesh, heatPts, updateStreams, updateWeather } = buildWeatherSystems(
  scene,
  sites
);
const post = createPostPipeline(renderer, scene, cam);

// Application State (Opens in 'live' Open-Meteo mode by default)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  scenario: 'live', // 'live' | 'elnino' | 'cyclone'
  tm: 0,
  playing: false,
  speed: 1,
  nino: 3.3,
  relScale: 1,
  dataMode: 'both', // 'both' | 'rain' | 'temp'
  quality: 'high', // 'high' | 'low'
  vantage: 'skyline', // 'skyline' | 'landmark' | 'basin'
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
      s.precipProb = lw.precipProb;
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

// Camera Orbit & Close-Up Diorama Controller
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

function syncVantageButtons() {
  document.querySelectorAll('.vantage-btn').forEach((b) => {
    b.classList.toggle('on', b.dataset.v === state.vantage);
  });
}

function applyVantageCamera(idx, vantageKey) {
  const s = sites[idx];
  const meta = REGION_LANDMARK_META[idx] || REGION_LANDMARK_META[0];
  const v = (meta.vantages && meta.vantages[vantageKey]) || {
    dx: 0,
    dz: 0,
    d: 15.5,
    ph: 1.05,
    thOff: 0.25,
  };
  camTg.tx = s.x + v.dx;
  camTg.tz = s.z + v.dz;
  camTg.d = v.d;
  camTg.ph = v.ph;
  camTg.th = 0.45 + v.thOff;
}

function openRegion(i, vantageKey = 'skyline') {
  state.cur = i;
  focusIdx = i;
  state.vantage = vantageKey;
  state.mode = 'focus';
  state.probeP = null;
  probeGroup.visible = false;
  if ($('probe-card')) $('probe-card').hidden = true;
  hold = 1e9;
  syncVantageButtons();
  applyVantageCamera(i, vantageKey);
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

// River Basin Intelligence Modal Handler (Fixed missing wp import!)
let activeRiver = null;
function openRiverBasin(rv) {
  activeRiver = rv;
  $('rm-name').textContent = rv.name;
  $('rm-sub').textContent = rv.basinName;
  $('rm-catchment').textContent = rv.catchmentKm2;
  $('rm-length').textContent = rv.lengthKm;
  $('rm-desc').textContent = rv.significance;
  $('rm-hydro').textContent = rv.hydro;
  $('rm-outlet').textContent = rv.outlet;

  const [midLon, midLat] = rv.pts[Math.floor(rv.pts.length / 2)];
  const [rx, rz] = wp(midLon, midLat);
  const rainA = rainAnomaly(rx, rz, state.tm, state.nino, state.scenario);

  let pillText = 'Normal Seasonal Flow';
  let pillColor = '#28c7b8';
  if (state.scenario === 'cyclone' || rainA > 50) {
    pillText = '⚠️ Major Inundation Alert';
    pillColor = '#e0533c';
  } else if (rainA > 20) {
    pillText = '🌊 Swelling / High Flow';
    pillColor = '#e59a3c';
  } else if (rainA < -25) {
    pillText = '🍂 Low Seasonal Discharge';
    pillColor = '#e59a3c';
  }
  $('rm-status-pill').textContent = pillText;
  $('rm-status-pill').style.setProperty('--c', pillColor);

  closeRegion();
  state.probeP = null;
  probeGroup.visible = false;
  if ($('probe-card')) $('probe-card').hidden = true;

  $('river-modal').style.display = 'block';
  requestAnimationFrame(() => $('river-modal').classList.add('open'));

  // Fly camera to river basin midpoint
  camTg.tx = rx;
  camTg.tz = rz;
  camTg.d = 26;
  camTg.ph = 1.02;
  switchToFreeCam();
}

function closeRiverBasin() {
  activeRiver = null;
  $('river-modal').classList.remove('open');
  setHoverRiver(-1);
  setTimeout(() => {
    if (!activeRiver) $('river-modal').style.display = 'none';
  }, 350);
}

const hud = initHUD(state, sites, { openRegion, closeRegion, openRiverBasin });

// Bind 3D Diorama Vantage Buttons inside the Region Modal
document.querySelectorAll('.vantage-btn').forEach((btn) => {
  btn.onclick = () => {
    if (state.cur < 0) return;
    state.vantage = btn.dataset.v;
    syncVantageButtons();
    state.mode = 'focus';
    applyVantageCamera(state.cur, state.vantage);
  };
});

// Initial world geometry placement
updateSiteMetrics();
updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario);
updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario);
updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);

// Fetch Real-Time Open-Meteo Weather for the Active Country (Strictly Isolated per Country)
function syncLiveWeather(showToast = false, countryId = getActiveCountryId()) {
  const cProfile = COUNTRIES[countryId] || getCountry();
  fetchLiveCountryWeather((ls, cid) => {
    if (cid !== getActiveCountryId()) return; // Ignore if user switched country mid-flight
    hud.updateScenarioHeader();
    if (ls.status === 'live' || ls.status === 'fallback') {
      updateSiteMetrics();
      hud.rebuildCurves();
      updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario, true);
      updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
      updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
      hud.updateHUD(10, true);
      if (showToast && ls.status === 'live') {
        hud.toast(
          `${cProfile.flag} Synced live Open-Meteo telemetry across 27 ${cProfile.name} stations`
        );
      }
    }
  }, countryId);
}
syncLiveWeather(false);
setInterval(() => syncLiveWeather(false), 300000);

$('btn-refresh').onclick = () => {
  state.tm = 0;
  if ($('tm')) $('tm').value = 0;
  state.playing = false;
  syncLiveWeather(true);
};

if ($('btn-now')) {
  $('btn-now').onclick = () => {
    state.tm = 0;
    if ($('tm')) $('tm').value = 0;
    state.playing = false;
    updateSiteMetrics();
    hud.updateButtonsUI();
    updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario, true);
    updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
    updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
    hud.updateHUD(10, true);
    hud.toast('● Viewing Live Now (+0h)');
  };
}

// Multi-Country Switcher (🇹🇿 Tanzania ↔ 🇰🇪 Kenya) with Strict Land & Weather Isolation
function switchCountry(countryId) {
  if (!COUNTRIES[countryId] || countryId === getActiveCountryId()) return;

  closeRegion();
  closeRiverBasin();
  state.probeP = null;
  probeGroup.visible = false;
  if ($('probe-card')) $('probe-card').hidden = true;

  // 1. Switch active country profile & synchronize climate/topography/hydrology arrays
  const country = setActiveCountry(countryId);
  syncCountryClimateArrays();
  syncCountryTerrainData();

  // 2. Dispose previous country 3D terrain & build new country's 3D terrain + satellite texture
  if (terrainObj && terrainObj.dispose) {
    terrainObj.dispose();
  }
  terrainObj = buildTerrain(scene, waterUniforms, renderer);
  terr = terrainObj.terr;
  wf = terrainObj.wf;
  shelfMesh = terrainObj.shelfMesh;
  coastGlow = terrainObj.coastGlow;
  updateSurface = terrainObj.updateSurface;
  lift = terrainObj.lift;

  // 3. Re-bake Indian Ocean coastline cutout mask for new country's landmass
  updateCoastMask();

  // 4. Rebuild 3D rivers, instanced cities/forests/corridors, 3D regional landmarks, and station markers
  rebuildRivers();
  rebuildDetails();
  rebuildLandmarks();
  rebuildMarkers();

  // 5. Update isolated weather metrics & refresh HUD
  updateSiteMetrics();
  hud.rebuildCountryHUD();
  updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario, true);
  updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
  updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
  hud.updateHUD(10, true);

  // 6. Reset camera smoothly to overview of the newly selected country
  focusIdx = country.defaultFocusIdx || 0;
  state.mode = 'over';
  phaseT = 9;
  camTg.tx = 0;
  camTg.tz = 0;
  camTg.d = overviewDist();
  camTg.ph = 0.92;

  // 7. Fetch or display isolated live Open-Meteo weather for the selected country
  syncLiveWeather(true, countryId);
  hud.toast(`${country.flag} Switched to ${country.name} (${country.agencyName})`);
}

document.querySelectorAll('.country-btn').forEach((btn) => {
  btn.onclick = () => switchCountry(btn.dataset.country);
});

function switchToFreeCam() {
  if (state.mode !== 'free' || state.auto) {
    state.mode = 'free';
    state.auto = false;
    hud.updateButtonsUI();
  }
}

// Camera Momentum & Inertia Controller
let velTh = 0,
  velPh = 0,
  velD = 0;
let lastPointerTime = 0;

function driveCamera(dt) {
  if (state.auto) {
    if (hold > 0) hold -= dt;
    else {
      phaseT -= dt;
      if (phaseT <= 0) {
        if (state.mode === 'over') {
          focusIdx = sortedSites()[pickCounter++ % 4].i;
          state.mode = 'focus';
          state.vantage = 'skyline';
          applyVantageCamera(focusIdx, 'skyline');
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
    camTg.th += reducedMotion ? 0 : dt * 0.045;
  } else if (state.mode === 'focus') {
    const s = sites[focusIdx];
    const meta = REGION_LANDMARK_META[focusIdx] || REGION_LANDMARK_META[0];
    const v = (meta.vantages && meta.vantages[state.vantage]) || {
      dx: 0,
      dz: 0,
      d: 15.5,
      ph: 1.05,
    };
    camTg.tx = s.x + v.dx;
    camTg.tz = s.z + v.dz;
    camTg.d = v.d;
    camTg.ph = v.ph;
    camTg.th += reducedMotion ? 0 : dt * 0.068;
  } else if (state.mode === 'free' && !pointers.size) {
    camTg.th += velTh * dt;
    camTg.ph = clamp(camTg.ph + velPh * dt, 0.2, 1.45);
    camTg.d = clamp(camTg.d + velD * dt, 5.5, 320);

    const decay = Math.pow(0.04, dt);
    velTh *= decay;
    velPh *= decay;
    velD *= decay;
    if (Math.abs(velTh) < 0.0001) velTh = 0;
    if (Math.abs(velPh) < 0.0001) velPh = 0;
    if (Math.abs(velD) < 0.01) velD = 0;
  }

  const k = 1 - Math.exp(-dt * 2.6);
  for (const p of ['th', 'ph', 'd', 'tx', 'tz']) {
    camSt[p] += (camTg[p] - camSt[p]) * k;
  }
  const focusY =
    state.mode === 'focus' || camSt.d < 38
      ? relief(camSt.tx, camSt.tz) * 0.95 * state.relScale * 0.72
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

if ($('rm-close')) $('rm-close').onclick = closeRiverBasin;
if ($('rm-btn-close2')) $('rm-btn-close2').onclick = closeRiverBasin;
if ($('rm-btn-focus')) {
  $('rm-btn-focus').onclick = () => {
    if (activeRiver) {
      const [mouthLon, mouthLat] = activeRiver.pts[activeRiver.pts.length - 1];
      const [fx, fz] = wp(mouthLon, mouthLat);
      camTg.tx = fx;
      camTg.tz = fz;
      camTg.d = 15.5;
      camTg.ph = 1.12;
      switchToFreeCam();
    }
  };
}
if ($('rm-btn-source')) {
  $('rm-btn-source').onclick = () => {
    if (activeRiver) {
      const [srcLon, srcLat] = activeRiver.pts[0];
      const [fx, fz] = wp(srcLon, srcLat);
      camTg.tx = fx;
      camTg.tz = fz;
      camTg.d = 16.5;
      camTg.ph = 1.08;
      switchToFreeCam();
    }
  };
}

// Probe Card Controls
if ($('pc-close')) {
  $('pc-close').onclick = () => {
    state.probeP = null;
    probeGroup.visible = false;
    if ($('probe-card')) $('probe-card').hidden = true;
  };
}
if ($('pc-zoom')) {
  $('pc-zoom').onclick = () => {
    if (state.probeP) {
      camTg.tx = state.probeP.x;
      camTg.tz = state.probeP.z;
      camTg.d = 18;
      camTg.ph = 1.06;
      switchToFreeCam();
    }
  };
}

function handleTap(x, y) {
  const idx = hitSite(x, y);
  if (idx >= 0) {
    closeRiverBasin();
    openRegion(idx, 'skyline');
    return;
  }

  // Interactive Clickable Rivers Check
  castFromScreen(x, y);
  const riverHits = raycaster.intersectObjects(hitMeshes);
  if (riverHits.length) {
    openRiverBasin(riverHits[0].object.userData.info);
    return;
  }

  const hits = raycaster.intersectObject(terr);
  if (hits.length) {
    closeRiverBasin();
    closeRegion();
    state.probeP = hits[0].point.clone();
    probeGroup.visible = true;
    hud.updateHUD(10, true);
  } else {
    closeRiverBasin();
    state.probeP = null;
    probeGroup.visible = false;
    if ($('probe-card')) $('probe-card').hidden = true;
    $('probe').textContent =
      'Click any city, river basin, or terrain coordinate to inspect 3D models & telemetry';
  }
}

const pointers = new Map();
const pinchDist = () => {
  const a = [...pointers.values()];
  return Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) || 1;
};
let downInfo = null;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  downInfo = pointers.size === 1 ? [e.clientX, e.clientY, performance.now()] : null;
  lastPointerTime = performance.now();
  velTh = 0;
  velPh = 0;
  velD = 0;
});

canvas.addEventListener('pointermove', (e) => {
  mx = e.clientX;
  my = e.clientY;
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const now = performance.now();
  const dtPtr = Math.max(0.001, (now - lastPointerTime) * 0.001);
  const dx = e.clientX - prev[0];
  const dy = e.clientY - prev[1];

  if (pointers.size === 1) {
    if (downInfo && Math.hypot(e.clientX - downInfo[0], e.clientY - downInfo[1]) < 6) return;

    if (e.buttons === 2 || e.shiftKey) {
      const panSpeed = camTg.d * 0.0016;
      const sinTh = Math.sin(camTg.th);
      const cosTh = Math.cos(camTg.th);
      camTg.tx -= (dx * cosTh - dy * sinTh) * panSpeed;
      camTg.tz -= (dx * sinTh + dy * cosTh) * panSpeed;
      camTg.tx = clamp(camTg.tx, -68, 68);
      camTg.tz = clamp(camTg.tz, -68, 68);
      velTh = 0;
      velPh = 0;
    } else {
      const dTh = -dx * 0.0055;
      const dPh = -dy * 0.0045;
      camTg.th += dTh;
      camTg.ph = clamp(camTg.ph + dPh, 0.2, 1.45);
      velTh = dTh / dtPtr;
      velPh = dPh / dtPtr;
    }
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    switchToFreeCam();
  } else {
    const pv = pinchDist();
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    const nextD = pinchDist();
    camTg.d = clamp((camTg.d * pv) / nextD, 5.5, 320);
    velD = 0;
    switchToFreeCam();
  }
  lastPointerTime = now;
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
  setHoverRiver(-1);
});
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    velD += e.deltaY * 0.06;
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

// Scenario Switcher (Live Now | El Niño + IOD | Cyclone)
const sl = $('tm');
document.querySelectorAll('.scen-btn').forEach((b) => {
  b.onclick = () => {
    state.scenario = b.dataset.sc;
    if (state.scenario === 'live') {
      state.tm = 0;
      sl.value = 0;
      state.playing = false;
    } else if (state.scenario === 'cyclone') {
      state.tm = 2.6;
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

// Quality Toggle for Integrated GPUs (High vs Low)
if ($('q-quality')) {
  $('q-quality').onclick = () => {
    state.quality = state.quality === 'high' ? 'low' : 'high';
    const isHigh = state.quality === 'high';
    $('q-quality').textContent = isHigh ? 'Quality: High' : 'Quality: Fast';
    $('q-quality').classList.toggle('on', !isHigh);
    renderer.setPixelRatio(isHigh ? Math.min(window.devicePixelRatio, 1.5) : 1.0);
    renderer.shadowMap.enabled = isHigh;
    sunLight.castShadow = isHigh;
    onResize();
    hud.toast(
      isHigh
        ? 'High quality mode enabled (soft shadows & native DPI)'
        : 'Fast integrated-GPU mode enabled (1.0x DPI, shadows off)'
    );
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
  if (state.scenario === 'live') {
    const curHour = Math.round((state.tm / 6) * 24);
    const nextHour = (curHour + d * 3 + 27) % 27;
    state.tm = Math.min(6, (nextHour / 24) * 6);
  } else {
    state.tm = (Math.floor(state.tm) + d + 6) % 6;
  }
  sl.value = state.tm;
  state.playing = false;
  hud.updateButtonsUI();
  updateSiteMetrics();
  updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario, true);
  updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
  updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
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
  if ($('rx-val')) $('rx-val').textContent = state.relScale.toFixed(2) + '×';
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
  closeRiverBasin();
  state.probeP = null;
  probeGroup.visible = false;
  if ($('probe-card')) $('probe-card').hidden = true;
  state.auto = true;
  state.mode = 'over';
  phaseT = 9;
  camTg.th = 0.56;
  hud.updateButtonsUI();
};

const stepRegion = (d) => openRegion((state.cur + d + sites.length) % sites.length, state.vantage);
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
  const country = getCountry();
  const sc = SCENARIOS[state.scenario];
  const mi = Math.floor(state.tm);
  const timeStr =
    state.scenario === 'live'
      ? `Live (+${Math.round((state.tm / 6) * 24)}h)`
      : `${MONTHS[mi]} ${mi < 3 ? 2026 : 2027}`;
  return `Mdl TWS (${country.name} 3D Synoptic Atlas) — ${sc.title} [${timeStr}]`;
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
  ['cities', '3D Cities & landmarks'],
  ['rivers', 'Rivers & basins'],
  ['reg', 'Station pins'],
  ['flow', 'Wind vectors'],
  ['cloud', '3D Clouds & storms'],
  ['lab', 'Map labels'],
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
  if (e.key === ' ') {
    e.preventDefault();
    state.playing = !state.playing;
    hud.updateButtonsUI();
  } else if (e.key === 'ArrowRight') stepMonth(1);
  else if (e.key === 'ArrowLeft') stepMonth(-1);
  else if (e.key === 'Escape') {
    closeRegion();
    closeRiverBasin();
  } else if (e.key === 'h' || e.key === 'H') toggleDock();
});

// Sun / Night Cycle HUD Controls
function formatTimeOfDay(h) {
  const hr = Math.floor(h);
  const min = Math.floor((h - hr) * 60);
  const pad = (n) => String(n).padStart(2, '0');
  let label = 'Daylight';
  if (h >= 5.0 && h < 7.0) label = 'Dawn / Sunrise';
  else if (h >= 7.0 && h < 11.5) label = 'Morning';
  else if (h >= 11.5 && h < 14.5) label = 'Midday Peak';
  else if (h >= 14.5 && h < 17.5) label = 'Afternoon';
  else if (h >= 17.5 && h < 19.0) label = 'Golden Hour';
  else if (h >= 19.0 && h < 20.5) label = 'Dusk Twilight';
  else label = 'Starry Night';
  return `${pad(hr)}:${pad(min)} (${label})`;
}

const sunSlider = $('sun-time-slider');
const sunTimeVal = $('sun-time-val');
const sunAutoBtn = $('sun-auto-btn');

if (sunSlider && sunTimeVal) {
  sunSlider.oninput = (e) => {
    const val = parseFloat(e.target.value);
    dayNight.setTime(val);
    sunTimeVal.textContent = formatTimeOfDay(val);
  };
}

if (sunAutoBtn) {
  sunAutoBtn.onclick = () => {
    const nextAuto = !dayNight.getAutoProgress();
    dayNight.setAutoProgress(nextAuto);
    sunAutoBtn.textContent = nextAuto ? 'Auto ▶' : 'Auto ⏸';
    sunAutoBtn.classList.toggle('on', nextAuto);
  };
}

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

// URL query deep-linking (?sc=cyclone|elnino|live & ?focus=0..8 & ?vantage=skyline|landmark|basin & ?river=0..8)
{
  const params = new URLSearchParams(window.location.search);
  const qSc = params.get('sc');
  if (qSc && SCENARIOS[qSc]) {
    const btn = document.querySelector(`.scen-btn[data-sc="${qSc}"]`);
    if (btn) btn.click();
  }
  const qHour = params.get('hour');
  if (qHour !== null && !Number.isNaN(+qHour)) {
    state.tm = clamp((+qHour / 24) * 6, 0, 6);
    sl.value = state.tm;
    updateSiteMetrics();
    hud.updateButtonsUI();
    updateSurface(state.tm, state.nino, state.relScale, state.dataMode, state.scenario, true);
    updateRivers(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
    updateDetails(state.tm, state.nino, state.relScale, lift, state.dataMode, state.scenario, true);
    hud.updateHUD(10, true);
  }
  const qFocus = params.get('focus');
  const qVantage = params.get('vantage') || 'skyline';
  if (qFocus !== null && sites[+qFocus]) {
    openRegion(+qFocus, qVantage);
    camSt.tx = camTg.tx;
    camSt.tz = camTg.tz;
    camSt.d = camTg.d;
    camSt.ph = camTg.ph;
    camSt.th = camTg.th;
  }
  const qRiver = params.get('river');
  if (qRiver !== null && hitMeshes[+qRiver]) {
    openRiverBasin(hitMeshes[+qRiver].userData.info);
    camSt.tx = camTg.tx;
    camSt.tz = camTg.tz;
    camSt.d = camTg.d;
    camSt.ph = camTg.ph;
  }
}

// Main Render & Simulation Loop
let T = 0,
  frameCount = 0,
  surfaceAccum = 0,
  lastTime = performance.now();

renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  T += dt;

  if (state.playing) {
    state.tm = (state.tm + (dt / 8) * state.speed) % 6;
    sl.value = state.tm;
  }

  // Update 24h Sun & Night Cycle
  dayNight.update(dt);
  if (dayNight.getAutoProgress() && sunSlider && sunTimeVal) {
    const curH = dayNight.getTime();
    sunSlider.value = curH;
    sunTimeVal.textContent = formatTimeOfDay(curH);
  }

  // Synchronize dynamic lighting & reflections into water and world shaders
  waterUniforms.uT.value = T;
  waterUniforms.uSunDir.value.copy(dayNight.getSunDir());
  waterUniforms.uSunColor.value.copy(dayNight.getSunColor());
  waterUniforms.uSkyHorizon.value.copy(dayNight.getHorizonColor());
  waterUniforms.uSkyZenith.value.copy(dayNight.getZenithColor());
  waterUniforms.uNight.value = dayNight.getNightFactor();

  updateSiteMetrics();

  // Throttle heavy 23,000-vertex terrain rebuilds during playback to ~12 Hz for smooth iGPU performance
  surfaceAccum += dt;
  const surfInterval = state.quality === 'low' ? 0.14 : 0.08;
  if (state.layers.surf && surfaceAccum >= surfInterval) {
    surfaceAccum = 0;
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
  landmarksGroup.visible = !!state.layers.cities;
  townPoints.visible = !!state.layers.cities;
  riversGroup.visible = !!state.layers.rivers;
  regLines.visible = !!state.layers.reg;
  streamMesh.visible = !!state.layers.flow;
  rainMesh.visible = !!state.layers.cloud && state.dataMode !== 'temp';
  heatPts.visible = !!state.layers.cloud;
  sweep.visible = !!state.layers.radar;
  rings.forEach((r) => (r.visible = !!state.layers.radar));
  $('labels').style.display = state.layers.lab ? 'block' : 'none';

  // Raycasting hover check: sites and clickable rivers
  if (frameCount % 2 === 0) {
    let cursor = 'default';
    const h = mx >= 0 && !pointers.size ? hitSite(mx, my) : -1;
    if (h >= 0) {
      cursor = 'pointer';
      setHoverRiver(-1);
    } else if (mx >= 0 && !pointers.size && state.layers.rivers) {
      castFromScreen(mx, my);
      const rHits = raycaster.intersectObjects(hitMeshes);
      if (rHits.length) {
        cursor = 'pointer';
        setHoverRiver(rHits[0].object.userData.index);
      } else {
        setHoverRiver(-1);
      }
    } else {
      setHoverRiver(-1);
    }
    if (h !== state.hov) {
      state.hov = h;
    }
    canvas.style.cursor = cursor;
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

  updateLandmarks({
    T,
    tm: state.tm,
    nino: state.nino,
    relScale: state.relScale,
    liftFn: lift,
    dataMode: state.dataMode,
    scenario: state.scenario,
    camDist: camSt.d,
    focusIdx,
    curIdx: state.cur,
    sites,
    visible: !!state.layers.cities,
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

  // Update post-processing shaders
  post.update(dt, T);
  post.composer.render();
});
