// HUD, Real-Time Live Telemetry Readouts, Wind Rose Anemometer, Basin List & Region/Point Dossiers
import {
  MONTHS,
  SCENARIOS,
  RAIN_STATUS,
  RAIN_HEX,
  TEMP_STATUS,
  TEMP_HEX,
  rainAnomaly,
  tempAnomaly,
  actualTempC,
  heatIndexC,
  sampleWind,
  sampleLiveWeather,
  getStationLiveWeather,
  getStationHourlySeries,
  getForecastTimeLabel,
  getRainTier,
  getImpacts,
  wp,
  unwp,
  clamp,
} from '../data/climate.js';
import { getCountry } from '../data/countries/index.js';
import { getLiveState } from '../data/liveWeather.js';
import { relief } from '../world/terrain.js';
import { RIVER_PATHS } from '../world/rivers.js';
import { REGION_LANDMARK_META } from '../world/landmarks.js';

export const $ = (id) => document.getElementById(id);
export const fmtPct = (a) => (a >= 0 ? '+' : '') + Math.round(a) + '%';
export const fmtTempAnom = (t) => (t >= 0 ? '+' : '') + t.toFixed(1) + '°C';
export const fmtDeg = (t) => Math.round(t) + '°C';
export const fmtMm = (mm) => (mm >= 0.08 ? `${mm.toFixed(1)} mm/h` : '0.0 mm/h');
export const fmtLat = (lat) =>
  lat >= 0 ? `${lat.toFixed(2)}°N` : `${Math.abs(lat).toFixed(2)}°S`;

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const degToCompass = (d) => COMPASS[Math.round((((d % 360) + 360) % 360) / 45) % 8];

function beaufortLabel(kmh) {
  if (kmh < 6) return 'Calm / Light air';
  if (kmh < 20) return 'Gentle breeze';
  if (kmh < 38) return 'Moderate breeze';
  if (kmh < 62) return 'Strong wind';
  if (kmh < 88) return 'Gale force';
  return 'Tropical storm / Cyclone';
}

function classifyBiome(lon, lat, elevM) {
  const country = getCountry();
  if (elevM > 3200) return 'Alpine Volcanic Zone';
  if (country.id === 'ke') {
    if (lat > 1.8 && lon < 37.8) return 'Turkana Rift & Jade Sea Arid Basin';
    if (lon > 39.0 && lat < -1.2 && elevM < 280) return 'Swahili Coastal Strip & Creek';
    if (lon > 38.2 && lat > -1.0) return 'Northeastern ASAL & Tana Plains';
    if (elevM > 1650) return 'Central & Rift Valley Montane Highlands';
    if (lon < 35.3 && lat < 0.8) return 'Lake Victoria Nyanza Basin';
    return 'Kenyan Highland Plateau & Savanna';
  }
  if (elevM > 1650 && lat < -7.5) return 'Southern Highlands Escarpment';
  if (elevM > 1500 && lat > -4.5) return 'Northern Volcanic Highlands';
  if (lon > 38.7 && elevM < 260) return 'Swahili Coastal Plain & Estuary';
  if (lat > -3.3 && lon < 34.5) return 'Lake Victoria Great Basin';
  if (lon < 31.2) return 'Albertine Rift / Tanganyika Escarpment';
  if (lat < -7.5 && lon > 36.0) return 'Selous / Rufiji Floodplain';
  return 'Central Plateau Miombo & Savanna';
}

export function initHUD(state, sites, callbacks) {
  const spCtx = $('sp').getContext('2d');
  const pcCtx = $('pac').getContext('2d');
  const listEl = $('list');
  const basinListEl = $('basin-list');
  let hudTimer = 0;
  let lastOrderKey = '';

  const rainCurve = [];
  const tempCurve = [];

  function rebuildCurves() {
    rainCurve.length = 0;
    tempCurve.length = 0;
    if (state.scenario === 'live') {
      for (let h = 0; h <= 24; h++) {
        const tm = (h / 24) * 6;
        const rAvg =
          sites.reduce((acc, s) => acc + getStationLiveWeather(s.i, tm).rainA, 0) / sites.length;
        const tAvg =
          sites.reduce((acc, s) => acc + getStationLiveWeather(s.i, tm).tempA, 0) / sites.length;
        rainCurve.push(rAvg);
        tempCurve.push(tAvg);
      }
      return;
    }
    for (let m = 0; m < 6; m += 0.15) {
      const rAvg =
        sites.reduce((acc, s) => acc + rainAnomaly(s.x, s.z, m, state.nino, state.scenario), 0) /
        sites.length;
      const tAvg =
        sites.reduce((acc, s) => acc + tempAnomaly(s.x, s.z, m, state.nino, state.scenario), 0) /
        sites.length;
      rainCurve.push(rAvg);
      tempCurve.push(tAvg);
    }
  }
  rebuildCurves();

  sites.forEach((s) => {
    s.el.onclick = (e) => {
      e.stopPropagation();
      callbacks.openRegion(s.i);
    };
  });

  const listButtons = sites.map((s) => {
    const meta = REGION_LANDMARK_META[s.i];
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<div><span class="r-name">${s.n}</span><span class="r-sub">${
      meta ? meta.landmarkName : s.note
    }</span></div><span class="r-stats"><em class="r-rain"></em><b class="t-val"></b></span>`;
    b.onclick = () => callbacks.openRegion(s.i);
    return b;
  });

  let basinButtons = [];
  function populateBasinButtons() {
    if (basinListEl) basinListEl.innerHTML = '';
    basinButtons = RIVER_PATHS.map((rv) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.setProperty('--c', '#28c7b8');
      b.innerHTML = `<div><span class="r-name">${rv.name}</span><span class="r-sub">${rv.basinName} · ${rv.catchmentKm2}</span></div><span class="r-stats"><em class="r-flow">${rv.lengthKm}</em></span>`;
      b.onclick = () => {
        if (callbacks.openRiverBasin) callbacks.openRiverBasin(rv);
      };
      if (basinListEl) basinListEl.appendChild(b);
      return { btn: b, rv };
    });
  }
  populateBasinButtons();

  function rebuildCountryHUD() {
    lastOrderKey = '';
    sites.forEach((s) => {
      const meta = REGION_LANDMARK_META[s.i];
      const b = listButtons[s.i];
      if (!b) return;
      const nameEl = b.querySelector('.r-name');
      const subEl = b.querySelector('.r-sub');
      if (nameEl) nameEl.textContent = s.n;
      if (subEl) subEl.textContent = meta ? meta.landmarkName : s.note;
    });
    populateBasinButtons();
    rebuildCurves();
    updateScenarioHeader();
  }

  function toast(msg) {
    const e = $('toast');
    e.textContent = msg;
    e.classList.add('s');
    clearTimeout(toast.h);
    toast.h = setTimeout(() => e.classList.remove('s'), 2100);
  }

  function updateScenarioHeader() {
    const country = getCountry();
    const ls = getLiveState();
    const sc = SCENARIOS[state.scenario] || SCENARIOS.live;
    if ($('inst-tag')) $('inst-tag').textContent = country.agencyTag;
    document.title = `Mdl TWS — ${country.name} 3D Synoptic Weather & Hydrological Atlas`;
    $('scen-title').textContent =
      state.scenario === 'live'
        ? country.subtitle
        : `${country.name} 3D Synoptic Atlas · ${sc.title}`;
    $('scen-note').textContent =
      state.scenario === 'live'
        ? `Current real-time weather across ${country.name} (${country.agencyName}) fetched via Open-Meteo. Switch scenarios above to simulate El Niño floods or a Tropical Cyclone.`
        : sc.note;

    const isLive = state.scenario === 'live';
    if ($('sim-controls')) $('sim-controls').hidden = false;
    if ($('intensity-wrap')) $('intensity-wrap').hidden = isLive;
    if ($('btn-now')) {
      $('btn-now').hidden = !isLive;
      $('btn-now').classList.toggle('on', state.tm <= 0.05);
    }

    if (isLive) {
      const fTime = getForecastTimeLabel(state.tm);
      const stTxt =
        ls.status === 'live'
          ? fTime.isNow
            ? `● Open-Meteo Live (${ls.updatedAt})`
            : `🔮 +${fTime.hourOffset}h Forecast (${fTime.clockLabel})`
          : ls.status === 'loading'
          ? `Syncing 27 live ${country.name} stations + 24h forecast…`
          : `Station telemetry (${ls.updatedAt || 'ready'})`;
      $('bdg-main').textContent = stTxt;
      $('bdg-sub').textContent = fTime.isNow
        ? 'Live weather now · Scrub below for 24h forecast'
        : `Open-Meteo 24h Forecast · ${fTime.clockLabel}`;
      $('btn-refresh').hidden = false;
      $('tm-range-lbl').textContent = fTime.isNow
        ? `Now → +24h Forecast (${fTime.clockLabel})`
        : `+${fTime.hourOffset}h · ${fTime.clockLabel}`;
    } else {
      $('bdg-main').textContent = sc.badge;
      $('bdg-sub').textContent = sc.hotBadge;
      $('btn-refresh').hidden = true;
      $('tm-range-lbl').textContent = 'Oct → Mar season';
    }

    document.querySelectorAll('.scen-btn').forEach((b) => {
      b.classList.toggle('on', b.dataset.sc === state.scenario);
    });
    document.querySelectorAll('.country-btn').forEach((b) => {
      b.classList.toggle('on', b.dataset.country === country.id);
    });
  }

  function updateButtonsUI() {
    const isLive = state.scenario === 'live';
    $('auto').textContent = state.auto ? 'Auto camera on' : 'Auto camera off';
    $('ply').textContent = state.playing ? 'Pause' : isLive ? 'Play 24h' : 'Play';
    $('spd').textContent = state.speed + 'x';
    document.querySelectorAll('.mode-btn[data-m]').forEach((b) => {
      b.classList.toggle('on', b.dataset.m === state.dataMode);
    });
    updateScenarioHeader();
  }

  function drawWindRose(windDir, windKmh) {
    const canvas = $('m-wind-rose');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width,
      H = canvas.height,
      cx = W / 2,
      cy = H / 2,
      r = W * 0.38;

    ctx.clearRect(0, 0, W, H);

    // Outer & inner instrument rings
    ctx.strokeStyle = 'rgba(148, 179, 204, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(40, 199, 184, 0.22)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.56, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = 'rgba(148, 179, 204, 0.18)';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Cardinal N/E/S/W labels
    ctx.fillStyle = '#94a7b8';
    ctx.font = '600 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - r - 6);
    ctx.fillText('S', cx, cy + r + 6);
    ctx.fillText('E', cx + r + 6, cy);
    ctx.fillText('W', cx - r - 6, cy);

    // Wind vector arrow (pointing in direction wind blows toward, with tail at source bearing)
    const rad = ((windDir - 90) * Math.PI) / 180;
    const len = r * clamp(0.45 + windKmh / 55, 0.48, 0.92);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad);

    // Vector shaft
    ctx.strokeStyle = '#28c7b8';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-len * 0.65, 0);
    ctx.lineTo(len * 0.85, 0);
    ctx.stroke();

    // Arrowhead at origin side showing wind flow
    ctx.fillStyle = '#e59a3c';
    ctx.beginPath();
    ctx.arc(len * 0.82, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#28c7b8';
    ctx.beginPath();
    ctx.moveTo(-len * 0.82, 0);
    ctx.lineTo(-len * 0.35, -4.5);
    ctx.lineTo(-len * 0.35, 4.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawPacificDiagram(T) {
    const W = 460,
      H = 108;
    pcCtx.clearRect(0, 0, W, H);
    const g = pcCtx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#071829');
    g.addColorStop(0.5, '#091d30');
    g.addColorStop(1, '#101928');
    pcCtx.fillStyle = g;
    pcCtx.fillRect(0, 0, W, H);

    const country = getCountry();
    const ls = getLiveState();
    // Mdl TWS reference box
    pcCtx.fillStyle = 'rgba(40, 199, 184, 0.14)';
    pcCtx.fillRect(20, 34, 72, 46);
    pcCtx.strokeStyle = 'rgba(40, 199, 184, 0.55)';
    pcCtx.strokeRect(20, 34, 72, 46);
    pcCtx.fillStyle = '#f2efe9';
    pcCtx.font = '600 12.5px Space Grotesk, sans-serif';
    pcCtx.fillText(country.name.toUpperCase(), 23, 24);
    pcCtx.fillStyle = '#28c7b8';
    pcCtx.font = '500 11px JetBrains Mono, monospace';
    pcCtx.fillText('27 Stns', 31, 61);

    if (state.scenario === 'live') {
      const fTime = getForecastTimeLabel(state.tm);
      const avgWind = sites.reduce((a, s) => a + s.windKmh, 0) / sites.length;
      const maxTemp = Math.max(...sites.map((s) => s.absTemp));
      const minTemp = Math.min(...sites.map((s) => s.absTemp));
      const rainingCount = ls.stations.filter((_, idx) => {
        const snap = getStationLiveWeather(idx, state.tm);
        return snap.isRaining;
      }).length;

      pcCtx.fillStyle = fTime.isNow ? '#5ef2d6' : '#e59a3c';
      pcCtx.font = '600 13px JetBrains Mono, monospace';
      pcCtx.fillText(
        ls.status === 'live'
          ? fTime.isNow
            ? `● LIVE OPEN-METEO (${country.name.toUpperCase()})`
            : `🔮 +${fTime.hourOffset}H FORECAST · ${fTime.clockLabel}`
          : '● LIVE TELEMETRY FEED',
        106,
        26
      );
      pcCtx.fillStyle = '#f2efe9';
      pcCtx.font = '12px JetBrains Mono, monospace';
      pcCtx.fillText(
        `Range: ${Math.round(minTemp)}°C–${Math.round(maxTemp)}°C · Active rain: ${rainingCount}/27 stations`,
        106,
        50
      );
      pcCtx.fillText(`Mean wind: ${Math.round(avgWind)} km/h · 24h Hourly Forecast`, 106, 72);
      pcCtx.fillStyle = '#94a7b8';
      pcCtx.fillText(
        fTime.isNow
          ? `Synced: ${ls.updatedAt || 'Now'} · Scrub for +24h`
          : `Showing ${fTime.fullLabel} · Synced ${ls.updatedAt || 'Now'}`,
        106,
        94
      );
      return;
    }

    if (state.scenario === 'cyclone') {
      const cx = 310 - (state.tm / 6) * 165;
      const cy = 58 + Math.sin(T * 3) * 3;
      const r = 28;
      const cg = pcCtx.createRadialGradient(cx, cy, 3, cx, cy, r);
      cg.addColorStop(0, 'rgba(242, 239, 233, 0.95)');
      cg.addColorStop(0.5, 'rgba(40, 199, 184, 0.55)');
      cg.addColorStop(1, 'rgba(40, 199, 184, 0)');
      pcCtx.fillStyle = cg;
      pcCtx.beginPath();
      pcCtx.arc(cx, cy, r, 0, Math.PI * 2);
      pcCtx.fill();
      pcCtx.fillStyle = '#f2efe9';
      pcCtx.fillText('🌀 Cyclone Eye', cx - 45, cy - 32);
      pcCtx.fillStyle = '#94a7b8';
      pcCtx.fillText('SW Indian Ocean → Coast landfall', 175, H - 8);
      return;
    }

    // El Niño + IOD Teleconnection
    const ioX = 128,
      ioY = 58,
      ioR = 22 + 8 * clamp(state.nino / 3.3, 0, 1.2) + 3 * Math.sin(T * 2.4);
    const ioG = pcCtx.createRadialGradient(ioX, ioY, 2, ioX, ioY, ioR);
    ioG.addColorStop(0, 'rgba(229, 154, 60, 0.78)');
    ioG.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pcCtx.fillStyle = ioG;
    pcCtx.beginPath();
    pcCtx.arc(ioX, ioY, ioR, 0, Math.PI * 2);
    pcCtx.fill();

    const px = 355,
      py = 56,
      r = 30 + 15 * clamp(state.nino / 3.3, 0, 1.2) + 4 * Math.sin(T * 2);
    const rg = pcCtx.createRadialGradient(px, py, 3, px, py, r);
    rg.addColorStop(0, 'rgba(224, 83, 60, 0.95)');
    rg.addColorStop(0.55, 'rgba(229, 154, 60, 0.5)');
    rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pcCtx.fillStyle = rg;
    pcCtx.beginPath();
    pcCtx.arc(px, py, r, 0, Math.PI * 2);
    pcCtx.fill();

    pcCtx.fillStyle = '#f2efe9';
    pcCtx.font = '600 13.5px JetBrains Mono, monospace';
    pcCtx.fillText('+' + state.nino.toFixed(1) + '°C', px - 28, py + 5);
    pcCtx.fillStyle = '#94a7b8';
    pcCtx.font = '12px JetBrains Mono, monospace';
    pcCtx.fillText('Niño 3.4 & W. Indian Ocean SST', px - 155, H - 8);

    pcCtx.strokeStyle = state.dataMode === 'temp' ? '#e59a3c' : '#28c7b8';
    pcCtx.lineWidth = 2.2;
    pcCtx.setLineDash([8, 6]);
    pcCtx.lineDashOffset = -T * 30;
    pcCtx.beginPath();
    pcCtx.moveTo(px - 45, py - 18);
    pcCtx.quadraticCurveTo(220, -6, 92, 46);
    pcCtx.stroke();
    pcCtx.setLineDash([]);
  }

  function drawModal() {
    if (state.cur < 0) return;
    const s = sites[state.cur];
    const isLive = state.scenario === 'live';
    const meta = REGION_LANDMARK_META[s.i] || REGION_LANDMARK_META[0];

    const latStr = fmtLat(s.lat);
    const lonStr = `${s.lon.toFixed(2)}°E`;
    if ($('m-coords')) {
      $('m-coords').textContent = `${latStr}, ${lonStr} · ELEV ${s.elevM}m`;
    }
    $('mn').textContent = s.n;
    $('mnote').textContent = `${s.note} · ${meta.archName}`;
    if ($('m-landmark-name')) {
      $('m-landmark-name').textContent = meta.landmarkName;
    }

    const pRain = $('mp');
    pRain.textContent = isLive
      ? s.isRaining
        ? `🌧️ ${s.weatherDesc}`
        : `☀️ ${s.weatherDesc || 'Dry'}`
      : RAIN_STATUS[s.rainSt];
    pRain.style.setProperty('--c', RAIN_HEX[s.rainSt]);

    const pTemp = $('mpt');
    pTemp.textContent = `${TEMP_STATUS[s.tempSt]} (${fmtDeg(s.absTemp)})`;
    pTemp.style.setProperty('--c', TEMP_HEX[s.tempSt]);

    if (isLive) {
      $('ma').textContent = fmtMm(s.precipMm || 0);
      $('ma').style.color = s.isRaining ? '#28c7b8' : '#58c496';
      const probTxt = typeof s.precipProb === 'number' ? ` · Rain prob ${Math.round(s.precipProb)}%` : '';
      $('ma-sub').textContent = `${s.isRaining ? s.weatherDesc : 'Dry condition'}${probTxt} · Clouds ${Math.round(
        s.cloudCover || 0
      )}%`;
    } else {
      $('ma').textContent = fmtPct(s.rainA);
      $('ma').style.color = RAIN_HEX[s.rainSt];
      $('ma-sub').textContent = `${RAIN_STATUS[s.rainSt]} vs seasonal baseline`;
    }

    $('mt').textContent = `${fmtDeg(s.absTemp)} (${fmtTempAnom(s.tempA)})`;
    $('mt').style.color = TEMP_HEX[s.tempSt];
    $('mfeel').textContent = `Heat index ${fmtDeg(s.feelsLike)} · Elev ${s.elevM}m`;

    // Update Wind Rose Compass & Anemometer Readout
    const compassDir = degToCompass(s.windDir);
    if ($('m-wind-val')) {
      $('m-wind-val').textContent = `${Math.round(s.windKmh)} km/h ${compassDir}`;
    }
    if ($('m-wind-sub')) {
      $('m-wind-sub').textContent = `${Math.round(s.windDir)}° · ${beaufortLabel(s.windKmh)}`;
    }
    drawWindRose(s.windDir, s.windKmh);

    // Update Basin Saturation Index Gauge
    const satPct = isLive
      ? clamp(Math.round(28 + (s.precipMm || 0) * 14 + (s.cloudCover || 0) * 0.25), 14, 98)
      : clamp(Math.round(45 + s.rainA * 0.45), 10, 99);
    const satLabel =
      satPct >= 78 ? 'High Flood Risk' : satPct >= 56 ? 'Elevated Flow' : satPct <= 24 ? 'Low / Dry' : 'Normal Flow';
    if ($('m-hydro-val')) {
      $('m-hydro-val').textContent = `${satPct}% · ${satLabel}`;
      $('m-hydro-val').style.color =
        satPct >= 78 ? '#e0533c' : satPct >= 56 ? '#e59a3c' : '#28c7b8';
    }
    if ($('m-hydro-fill')) {
      $('m-hydro-fill').style.width = `${satPct}%`;
    }
    if ($('m-hydro-sub')) {
      $('m-hydro-sub').textContent = meta.basinLabel;
    }

    $('mimp').innerHTML = getImpacts(
      s.rainA,
      s.tempA,
      s.absTemp,
      state.scenario,
      s.windKmh,
      s.precipMm || 0,
      s.weatherDesc || 'Clear'
    )
      .map((t) => `<li>${t}</li>`)
      .join('');

    // Draw Trajectory Chart in #mb (Real 24-Hour Open-Meteo Forecast in Live mode, Seasonal Oct-Mar in Sim mode)
    if ($('modal-chart-wrap')) $('modal-chart-wrap').hidden = false;
    const forecastSteps = [0, 4, 8, 12, 18, 24];
    const series = isLive ? getStationHourlySeries(s.i) : null;
    const labels = isLive ? ['Now', '+4h', '+8h', '+12h', '+18h', '+24h'] : MONTHS;
    const fTime = isLive ? getForecastTimeLabel(state.tm) : null;
    if ($('m-chart-title')) {
      $('m-chart-title').textContent = isLive
        ? `24-HOUR OPEN-METEO FORECAST (${fTime.shortLabel.toUpperCase()})`
        : 'SEASONAL TRAJECTORY (OCT – MAR)';
    }

    const hVal = relief(s.x, s.z);
    const rVals = [0, 1, 2, 3, 4, 5].map((m) => {
      if (isLive) {
        const hSlot = series[forecastSteps[m]] || series[0];
        const pMm = hSlot.precipMm || 0;
        const pProb = hSlot.precipProb || 0;
        const cCov = hSlot.cloudCover || 20;
        return pMm >= 0.05
          ? clamp(24 + pMm * 28 + pProb * 0.35, 18, 120)
          : clamp((pProb - 25) * 0.55 + (cCov - 45) * 0.35, -35, 25);
      }
      return rainAnomaly(s.x, s.z, m + 0.4, state.nino, state.scenario);
    });

    const tVals = [0, 1, 2, 3, 4, 5].map((m) => {
      if (isLive) {
        const hSlot = series[forecastSteps[m]] || series[0];
        return hSlot.tempC;
      }
      return actualTempC(s.x, s.z, hVal, m + 0.4, state.nino, state.scenario);
    });

    const pkRain = rVals.reduce((b, x, i) => (x > rVals[b] ? i : b), 0);
    const pkTemp = tVals.reduce((b, x, i) => (x > tVals[b] ? i : b), 0);

    if (isLive) {
      const maxProb = Math.max(...forecastSteps.map((h) => (series[h] ? series[h].precipProb || 0 : 0)));
      $('mpk').textContent = `Rain prob peak: ${Math.round(maxProb)}% (${labels[pkRain]}) · Max ${fmtDeg(
        tVals[pkTemp]
      )}`;
    } else {
      $('mpk').textContent = `Peak: ${labels[pkRain]} · Max ${fmtDeg(tVals[pkTemp])}`;
    }

    // Determine which of the 6 columns corresponds to current state.tm
    const activeCol = isLive
      ? forecastSteps.reduce(
          (bestIdx, hStep, idx) =>
            Math.abs(hStep - fTime.hourOffset) < Math.abs(forecastSteps[bestIdx] - fTime.hourOffset)
              ? idx
              : bestIdx,
          0
        )
      : Math.floor(state.tm);

    const c = $('mb').getContext('2d');
    const W = 460,
      H = 128,
      mid = 64;
    c.clearRect(0, 0, W, H);
    c.strokeStyle = 'rgba(148, 179, 204, 0.18)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, mid);
    c.lineTo(W, mid);
    c.stroke();

    rVals.forEach((x, m) => {
      const h = (clamp(x, -120, 120) / 120) * 46;
      const bx = 18 + m * 74;
      c.fillStyle = x < 0 ? 'rgba(229, 154, 60, 0.75)' : 'rgba(40, 199, 184, 0.78)';
      c.fillRect(bx, h >= 0 ? mid - h : mid, 44, Math.abs(h) || 2);
      if (m === activeCol) {
        c.strokeStyle = '#f2efe9';
        c.lineWidth = 1.5;
        c.strokeRect(bx - 3, 4, 50, H - 24);
      }
      c.fillStyle = '#94a7b8';
      c.font = '12px JetBrains Mono, monospace';
      c.fillText(labels[m], bx + 6, H - 5);
    });

    const tMin = Math.min(...tVals) - 1.5;
    const tMax = Math.max(...tVals) + 1.5;
    c.strokeStyle = '#e59a3c';
    c.lineWidth = 2.4;
    c.beginPath();
    tVals.forEach((tv, m) => {
      const x = 40 + m * 74;
      const y = H - 30 - ((tv - tMin) / Math.max(2, tMax - tMin)) * 72;
      m ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.stroke();

    tVals.forEach((tv, m) => {
      const x = 40 + m * 74;
      const y = H - 30 - ((tv - tMin) / Math.max(2, tMax - tMin)) * 72;
      c.fillStyle = '#e0533c';
      c.beginPath();
      c.arc(x, y, 3.4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#f2efe9';
      c.font = '11.5px JetBrains Mono, monospace';
      c.fillText(Math.round(tv) + '°', x - 10, Math.max(12, y - 6));
    });
  }

  function updateHUD(dt, force = false) {
    hudTimer -= dt;
    if (hudTimer > 0 && !force) return;
    hudTimer = 0.2;

    const mi = clamp(Math.floor(state.tm), 0, 5);
    const isLive = state.scenario === 'live';
    const fTime = isLive ? getForecastTimeLabel(state.tm) : null;
    const timeLabel = isLive
      ? fTime.isNow
        ? 'Live Now'
        : `+${fTime.hourOffset}h`
      : `${MONTHS[mi]} '${mi < 3 ? '26' : '27'}`;

    $('mv').textContent = timeLabel;
    $('mv-sub').textContent = isLive
      ? fTime.isNow
        ? `Current (${fTime.clockLabel})`
        : `Forecast · ${fTime.clockLabel}`
      : 'Season timeline';

    if (isLive) {
      const ls = getLiveState();
      $('mr').textContent =
        ls.status === 'live' ? (fTime.isNow ? '● LIVE' : `+${fTime.hourOffset}H`) : 'Ready';
      $('mr-sub').textContent = fTime.isNow ? 'Open-Meteo Live' : '24h Forecast';
      if ($('btn-now')) $('btn-now').classList.toggle('on', fTime.isNow);
    } else if (state.scenario === 'cyclone') {
      const maxGust = Math.max(...sites.map((s) => s.windKmh));
      $('mr').textContent = `${Math.round(maxGust)} km/h`;
      $('mr-sub').textContent = 'Peak cyclone wind';
    } else {
      $('mr').textContent = `+${state.nino.toFixed(1)}°C`;
      $('mr-sub').textContent = 'Niño 3.4 / IOD';
    }

    if ($('dock-mini-stat')) {
      $('dock-mini-stat').textContent = `${SCENARIOS[state.scenario].short} · ${timeLabel}`;
    }

    if (isLive) {
      const rainingHubs = sites.filter((s) => s.isRaining).length;
      $('mc').textContent = `${rainingHubs}/${sites.length}`;
      $('mc-sub').textContent = fTime.isNow
        ? 'Cities raining now'
        : `Cities raining (+${fTime.hourOffset}h)`;
    } else {
      $('mc').textContent = sites.filter((s) => s.rainSt >= 2).length;
      $('mc-sub').textContent = 'Wetter regions';
    }

    const avgTemp = sites.reduce((a, s) => a + s.absTemp, 0) / sites.length;
    const avgTempAnom = sites.reduce((a, s) => a + s.tempA, 0) / sites.length;
    const maxSite = sites.reduce((best, s) => (s.absTemp > best.absTemp ? s : best), sites[0]);
    $('mtavg').textContent = isLive ? `${Math.round(avgTemp)}°C avg` : fmtTempAnom(avgTempAnom);
    $('mhot').textContent = `Warmest: ${fmtDeg(maxSite.absTemp)} (${maxSite.n})`;

    // Dual Sparkline
    const W = 460,
      H = 72;
    spCtx.clearRect(0, 0, W, H);

    spCtx.strokeStyle = '#28c7b8';
    spCtx.lineWidth = 2.2;
    spCtx.beginPath();
    rainCurve.forEach((v, i) => {
      const x = (i / (rainCurve.length - 1)) * W;
      const y = H - 6 - clamp((v + 45) / 145, 0, 1) * (H - 14);
      i ? spCtx.lineTo(x, y) : spCtx.moveTo(x, y);
    });
    spCtx.stroke();

    spCtx.strokeStyle = '#e59a3c';
    spCtx.lineWidth = 2.2;
    spCtx.beginPath();
    tempCurve.forEach((v, i) => {
      const x = (i / (tempCurve.length - 1)) * W;
      const y = H - 6 - clamp((v - 0.2) / 3.8, 0, 1) * (H - 14);
      i ? spCtx.lineTo(x, y) : spCtx.moveTo(x, y);
    });
    spCtx.stroke();

    spCtx.fillStyle = '#f2efe9';
    spCtx.fillRect((state.tm / 6) * W - 1, 0, 2, H);

    const sortedSites = [...sites].sort((a, b) =>
      state.dataMode === 'temp'
        ? b.absTemp - a.absTemp
        : isLive
        ? (b.precipMm || 0) - (a.precipMm || 0) || b.absTemp - a.absTemp
        : Math.abs(b.rainA) - Math.abs(a.rainA)
    );
    sortedSites.forEach((s, r) => (s.rank = r));
    const orderKey = sortedSites.map((s) => s.i).join(',');
    if (orderKey !== lastOrderKey) {
      lastOrderKey = orderKey;
      sortedSites.forEach((s) => listEl.appendChild(listButtons[s.i]));
    }

    sites.forEach((s) => {
      const b = listButtons[s.i];
      const primaryHex = state.dataMode === 'temp' ? TEMP_HEX[s.tempSt] : RAIN_HEX[s.rainSt];
      b.style.setProperty('--c', primaryHex);
      b.style.setProperty('--tc', TEMP_HEX[s.tempSt]);

      const rainTxt = isLive
        ? s.isRaining
          ? `🌧️ ${s.precipMm.toFixed(1)}mm/h`
          : `0.0mm · ${s.weatherDesc || 'Dry'}`
        : fmtPct(s.rainA);

      b.querySelector('.r-rain').textContent = rainTxt;
      b.querySelector('.t-val').textContent = isLive
        ? `${fmtDeg(s.absTemp)} · ${Math.round(s.windKmh)}km/h`
        : `${fmtDeg(s.absTemp)} (${fmtTempAnom(s.tempA)})`;

      s.el.querySelector('.t-rain').textContent = isLive
        ? s.isRaining
          ? `🌧️ ${s.precipMm.toFixed(1)}mm/h`
          : `0.0mm`
        : fmtPct(s.rainA);
      s.el.querySelector('.t-temp').textContent = `${fmtDeg(s.absTemp)} · ${
        isLive ? s.weatherDesc || 'Clear' : `${Math.round(s.windKmh)}km/h`
      }`;
    });

    // Update River Basin flow status colors in the Basins tab
    basinButtons.forEach(({ btn, rv }) => {
      const [midLon, midLat] = rv.pts[Math.floor(rv.pts.length / 2)];
      const [rx, rz] = wp(midLon, midLat);
      const rA = rainAnomaly(rx, rz, state.tm, state.nino, state.scenario);
      const col = rA > 45 ? '#e0533c' : rA > 18 ? '#e59a3c' : '#28c7b8';
      btn.style.setProperty('--c', col);
      const flowEl = btn.querySelector('.r-flow');
      if (flowEl) {
        flowEl.style.color = col;
        flowEl.textContent = rA > 45 ? '⚠️ Flood' : rA > 18 ? 'High Flow' : rv.lengthKm;
      }
    });

    if (state.cur >= 0) drawModal();

    // Update Terrain Point-Probe Readout & Floating Probe Card
    const probeCard = $('probe-card');
    if (state.probeP) {
      const px = state.probeP.x,
        pz = state.probeP.z;
      const h = relief(px, pz);
      const [lon, lat] = unwp(px, pz);
      const elevM = Math.max(5, Math.round(h * 1120));
      const biome = classifyBiome(lon, lat, elevM);
      const coordStr = `${fmtLat(lat)}, ${lon.toFixed(2)}°E · ${elevM}m`;

      if (probeCard && state.cur < 0) {
        probeCard.hidden = false;
        $('pc-coords').textContent = coordStr;
        $('pc-biome').textContent = biome;
      }

      if (isLive) {
        const lw = sampleLiveWeather(px, pz, h, state.tm);
        $('probe').textContent = `Field Probe ${coordStr} (${biome}): ${fmtDeg(
          lw.absTemp
        )} · ${fmtMm(lw.precipMm)} (${lw.weatherDesc}) · Wind ${Math.round(
          lw.windKmh
        )} km/h ${degToCompass(lw.windDir)}`;
        if (probeCard) {
          $('pc-temp').textContent = fmtDeg(lw.absTemp);
          $('pc-feel').textContent = `Feels ${fmtDeg(lw.feelsLike)}`;
          $('pc-rain').textContent = fmtMm(lw.precipMm);
          $('pc-cond').textContent = lw.weatherDesc || 'Clear';
          $('pc-wind').textContent = `${Math.round(lw.windKmh)} km/h`;
          $('pc-dir').textContent = `${degToCompass(lw.windDir)} (${Math.round(lw.windDir)}°)`;
        }
      } else {
        const rA = rainAnomaly(px, pz, state.tm, state.nino, state.scenario);
        const absT = actualTempC(px, pz, h, state.tm, state.nino, state.scenario);
        const feelT = heatIndexC(px, pz, h, state.tm, state.nino, state.scenario);
        const w = sampleWind(px, pz, state.tm, state.nino, state.scenario);
        const rTier = getRainTier(rA);
        $('probe').textContent = `Field Probe ${coordStr} (${biome}): ${fmtDeg(
          absT
        )} · Rain ${fmtPct(rA)} (${RAIN_STATUS[rTier]}) · Wind ${Math.round(
          w.speedKmh
        )} km/h ${degToCompass(w.dirDeg)}`;
        if (probeCard) {
          $('pc-temp').textContent = fmtDeg(absT);
          $('pc-feel').textContent = `Feels ${fmtDeg(feelT)}`;
          $('pc-rain').textContent = fmtPct(rA);
          $('pc-cond').textContent = RAIN_STATUS[rTier];
          $('pc-wind').textContent = `${Math.round(w.speedKmh)} km/h`;
          $('pc-dir').textContent = `${degToCompass(w.dirDeg)} (${Math.round(w.dirDeg)}°)`;
        }
      }
    } else if (probeCard) {
      probeCard.hidden = true;
    }
  }

  return {
    rebuildCurves,
    rebuildCountryHUD,
    drawPacificDiagram,
    drawModal,
    updateHUD,
    updateButtonsUI,
    updateScenarioHeader,
    toast,
  };
}
