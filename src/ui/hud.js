// HUD, Real-Time Live Telemetry Readouts, Dual Sparklines & Region Detail Modal
import {
  MONTHS,
  LIVE_HOURS,
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
  getRainTier,
  getTempTier,
  getImpacts,
  unwp,
  clamp,
} from '../data/climate.js';
import { liveState } from '../data/liveWeather.js';
import { relief } from '../world/terrain.js';

export const $ = (id) => document.getElementById(id);
export const fmtPct = (a) => (a >= 0 ? '+' : '') + Math.round(a) + '%';
export const fmtTempAnom = (t) => (t >= 0 ? '+' : '') + t.toFixed(1) + '°C';
export const fmtDeg = (t) => Math.round(t) + '°C';
export const fmtMm = (mm) => (mm >= 0.08 ? `${mm.toFixed(1)} mm/h` : '0.0 mm (Dry)');

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const degToCompass = (d) => COMPASS[Math.round((((d % 360) + 360) % 360) / 45) % 8];

export function initHUD(state, sites, callbacks) {
  const spCtx = $('sp').getContext('2d');
  const pcCtx = $('pac').getContext('2d');
  const listEl = $('list');
  let hudTimer = 0;
  let lastOrderKey = '';

  const rainCurve = [];
  const tempCurve = [];

  function rebuildCurves() {
    rainCurve.length = 0;
    tempCurve.length = 0;
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
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="r-name">${s.n}</span><span class="r-stats"><em class="r-rain"></em><b class="t-val"></b></span>`;
    b.onclick = () => callbacks.openRegion(s.i);
    return b;
  });

  function toast(msg) {
    const e = $('toast');
    e.textContent = msg;
    e.classList.add('s');
    clearTimeout(toast.h);
    toast.h = setTimeout(() => e.classList.remove('s'), 1900);
  }

  function updateScenarioHeader() {
    const sc = SCENARIOS[state.scenario] || SCENARIOS.live;
    $('scen-title').textContent =
      state.scenario === 'live'
        ? 'Tanzania 3D Interactive Weather System'
        : `Tanzania 3D Interactive Weather System · ${sc.title}`;
    $('scen-note').textContent = sc.note;

    const isLive = state.scenario === 'live';
    if ($('sim-controls')) $('sim-controls').hidden = isLive;

    if (isLive) {
      const stTxt =
        liveState.status === 'live'
          ? `● Open-Meteo Live (${liveState.updatedAt})`
          : liveState.status === 'loading'
          ? 'Syncing 27 live Tanzanian stations…'
          : `Station telemetry (${liveState.updatedAt || 'ready'})`;
      $('bdg-main').textContent = stTxt;
      $('bdg-sub').textContent = sc.hotBadge;
      $('btn-refresh').hidden = false;
    } else {
      $('bdg-main').textContent = sc.badge;
      $('bdg-sub').textContent = sc.hotBadge;
      $('btn-refresh').hidden = true;
      $('tm-range-lbl').textContent = 'Oct → Mar season';
    }

    document.querySelectorAll('.scen-btn').forEach((b) => {
      b.classList.toggle('on', b.dataset.sc === state.scenario);
    });
  }

  function updateButtonsUI() {
    $('auto').textContent = state.auto ? 'Auto camera on' : 'Auto camera off';
    $('ply').textContent = state.playing ? 'Pause' : 'Play';
    $('spd').textContent = state.speed + 'x';
    document.querySelectorAll('.mode-btn[data-m]').forEach((b) => {
      b.classList.toggle('on', b.dataset.m === state.dataMode);
    });
    updateScenarioHeader();
  }

  function drawPacificDiagram(T) {
    const W = 460,
      H = 108;
    pcCtx.clearRect(0, 0, W, H);
    const g = pcCtx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#0a253d');
    g.addColorStop(0.5, '#091f34');
    g.addColorStop(1, '#121b2c');
    pcCtx.fillStyle = g;
    pcCtx.fillRect(0, 0, W, H);

    // Mdl TWS reference box
    pcCtx.fillStyle = '#183d54';
    pcCtx.fillRect(22, 36, 68, 44);
    pcCtx.strokeStyle = 'rgba(63,214,255,0.55)';
    pcCtx.strokeRect(22, 36, 68, 44);
    pcCtx.fillStyle = '#e2eff8';
    pcCtx.font = '500 13px JetBrains Mono,monospace';
    pcCtx.fillText('Mdl TWS', 24, 26);

    if (state.scenario === 'live') {
      const avgWind = sites.reduce((a, s) => a + s.windKmh, 0) / sites.length;
      const maxTemp = Math.max(...sites.map((s) => s.absTemp));
      const minTemp = Math.min(...sites.map((s) => s.absTemp));
      const rainingCount = liveState.stations.filter((st) => st.precipMm >= 0.08 || st.weatherCode >= 51).length;

      pcCtx.fillStyle = '#58f2a8';
      pcCtx.font = '600 13.5px JetBrains Mono,monospace';
      pcCtx.fillText(
        liveState.status === 'live' ? '● LIVE OPEN-METEO SATELLITE & STATIONS' : '● LIVE TELEMETRY',
        106,
        26
      );
      pcCtx.fillStyle = '#e2eff8';
      pcCtx.font = '12.5px JetBrains Mono,monospace';
      pcCtx.fillText(
        `Temp: ${Math.round(minTemp)}°C–${Math.round(maxTemp)}°C · Active rain: ${rainingCount}/27 stations`,
        106,
        50
      );
      pcCtx.fillText(`Mean wind: ${Math.round(avgWind)} km/h · Satellite relief active`, 106, 72);
      pcCtx.fillStyle = '#82a0b8';
      pcCtx.fillText(`Synced: ${liveState.updatedAt || 'Now'}`, 106, 94);
      return;
    }

    if (state.scenario === 'cyclone') {
      const cx = 310 - (state.tm / 6) * 165;
      const cy = 58 + Math.sin(T * 3) * 3;
      const r = 28;
      const cg = pcCtx.createRadialGradient(cx, cy, 3, cx, cy, r);
      cg.addColorStop(0, 'rgba(180, 220, 255, 0.95)');
      cg.addColorStop(0.5, 'rgba(75, 135, 255, 0.55)');
      cg.addColorStop(1, 'rgba(75, 135, 255, 0)');
      pcCtx.fillStyle = cg;
      pcCtx.beginPath();
      pcCtx.arc(cx, cy, r, 0, Math.PI * 2);
      pcCtx.fill();
      pcCtx.fillStyle = '#fff';
      pcCtx.fillText('🌀 Cyclone Eye', cx - 45, cy - 32);
      pcCtx.fillStyle = '#82a0b8';
      pcCtx.fillText('SW Indian Ocean → Coast landfall', 175, H - 8);
      return;
    }

    // El Niño + IOD Teleconnection
    const ioX = 128,
      ioY = 58,
      ioR = 22 + 8 * clamp(state.nino / 3.3, 0, 1.2) + 3 * Math.sin(T * 2.4);
    const ioG = pcCtx.createRadialGradient(ioX, ioY, 2, ioX, ioY, ioR);
    ioG.addColorStop(0, 'rgba(255, 145, 55, 0.78)');
    ioG.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pcCtx.fillStyle = ioG;
    pcCtx.beginPath();
    pcCtx.arc(ioX, ioY, ioR, 0, Math.PI * 2);
    pcCtx.fill();

    const px = 355,
      py = 56,
      r = 30 + 15 * clamp(state.nino / 3.3, 0, 1.2) + 4 * Math.sin(T * 2);
    const rg = pcCtx.createRadialGradient(px, py, 3, px, py, r);
    rg.addColorStop(0, 'rgba(255, 85, 45, 0.95)');
    rg.addColorStop(0.55, 'rgba(255, 130, 50, 0.5)');
    rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pcCtx.fillStyle = rg;
    pcCtx.beginPath();
    pcCtx.arc(px, py, r, 0, Math.PI * 2);
    pcCtx.fill();

    pcCtx.fillStyle = '#fff';
    pcCtx.font = '600 14px JetBrains Mono,monospace';
    pcCtx.fillText('+' + state.nino.toFixed(1) + '°C', px - 28, py + 5);
    pcCtx.fillStyle = '#82a0b8';
    pcCtx.font = '12.5px JetBrains Mono,monospace';
    pcCtx.fillText('Niño 3.4 & W. Indian Ocean heat', px - 155, H - 8);

    pcCtx.strokeStyle = state.dataMode === 'temp' ? '#ff7b47' : '#3fd6ff';
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

    $('mn').textContent = s.n;
    $('mnote').textContent = `${s.note} · ${s.elevM}m · Wind ${Math.round(s.windKmh)} km/h ${degToCompass(s.windDir)}`;

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
      $('ma').style.color = s.isRaining ? '#3fd6ff' : '#58c496';
      $('ma-sub').textContent = `${s.weatherDesc || 'Clear'} · Cloud cover ${Math.round(
        s.cloudCover || 0
      )}%`;
    } else {
      $('ma').textContent = fmtPct(s.rainA);
      $('ma').style.color = RAIN_HEX[s.rainSt];
      $('ma-sub').textContent = 'Moisture / Rain vs normal';
    }

    $('mt').textContent = `${fmtDeg(s.absTemp)} (${fmtTempAnom(s.tempA)})`;
    $('mt').style.color = TEMP_HEX[s.tempSt];
    $('mfeel').textContent = `Feels like ${fmtDeg(s.feelsLike)} · Wind ${Math.round(s.windKmh)} km/h`;

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

    if ($('modal-chart-wrap')) $('modal-chart-wrap').hidden = isLive;
    if (isLive) return;

    const labels = MONTHS;
    const rVals = [0, 1, 2, 3, 4, 5].map((m) =>
      rainAnomaly(s.x, s.z, m + 0.4, state.nino, state.scenario)
    );
    const hVal = relief(s.x, s.z);
    const tVals = [0, 1, 2, 3, 4, 5].map((m) =>
      actualTempC(s.x, s.z, hVal, m + 0.4, state.nino, state.scenario)
    );

    const pkRain = rVals.reduce((b, x, i) => (Math.abs(x) > Math.abs(rVals[b]) ? i : b), 0);
    const pkTemp = tVals.reduce((b, x, i) => (x > tVals[b] ? i : b), 0);

    $('mpk').textContent = `Peak moisture: ${labels[pkRain]} (${fmtPct(
      rVals[pkRain]
    )}) · Hottest: ${labels[pkTemp]} (${fmtDeg(tVals[pkTemp])})`;

    const c = $('mb').getContext('2d');
    const W = 460,
      H = 140,
      mid = 68;
    c.clearRect(0, 0, W, H);
    c.strokeStyle = '#1c354a';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, mid);
    c.lineTo(W, mid);
    c.stroke();

    rVals.forEach((x, m) => {
      const h = (clamp(x, -130, 130) / 130) * 52;
      const bx = 16 + m * 74;
      c.fillStyle = x < 0 ? 'rgba(242,160,61,0.82)' : 'rgba(63,214,255,0.82)';
      c.fillRect(bx, h >= 0 ? mid - h : mid, 46, Math.abs(h) || 2);
      if (m === Math.floor(state.tm)) {
        c.strokeStyle = '#fff';
        c.lineWidth = 1.8;
        c.strokeRect(bx - 4, 4, 54, H - 26);
      }
      c.fillStyle = '#82a0b8';
      c.font = '13.5px JetBrains Mono,monospace';
      c.fillText(labels[m], bx + 6, H - 5);
    });

    const tMin = Math.min(...tVals) - 1.5;
    const tMax = Math.max(...tVals) + 1.5;
    c.strokeStyle = '#ff6b35';
    c.lineWidth = 2.5;
    c.beginPath();
    tVals.forEach((tv, m) => {
      const x = 39 + m * 74;
      const y = H - 34 - ((tv - tMin) / Math.max(2, tMax - tMin)) * 78;
      m ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.stroke();

    tVals.forEach((tv, m) => {
      const x = 39 + m * 74;
      const y = H - 34 - ((tv - tMin) / Math.max(2, tMax - tMin)) * 78;
      c.fillStyle = '#ff9233';
      c.beginPath();
      c.arc(x, y, 3.6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffd166';
      c.font = '12px JetBrains Mono,monospace';
      c.fillText(Math.round(tv) + '°', x - 10, Math.max(13, y - 7));
    });
  }

  function updateHUD(dt, force = false) {
    hudTimer -= dt;
    if (hudTimer > 0 && !force) return;
    hudTimer = 0.2;

    const mi = Math.floor(state.tm);
    const isLive = state.scenario === 'live';
    const timeLabel = isLive ? 'Right Now' : `${MONTHS[mi]} '${mi < 3 ? '26' : '27'}`;

    $('mv').textContent = timeLabel;
    $('mv-sub').textContent = isLive ? 'Current weather' : 'Season timeline';

    if (isLive) {
      $('mr').textContent = liveState.status === 'live' ? '● LIVE' : 'Ready';
      $('mr-sub').textContent = 'Open-Meteo API';
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
      $('mc-sub').textContent = 'Cities raining now';
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

    spCtx.strokeStyle = '#3fd6ff';
    spCtx.lineWidth = 2.2;
    spCtx.beginPath();
    rainCurve.forEach((v, i) => {
      const x = (i / (rainCurve.length - 1)) * W;
      const y = H - 6 - clamp((v + 45) / 145, 0, 1) * (H - 14);
      i ? spCtx.lineTo(x, y) : spCtx.moveTo(x, y);
    });
    spCtx.stroke();

    spCtx.strokeStyle = '#ff6b35';
    spCtx.lineWidth = 2.2;
    spCtx.beginPath();
    tempCurve.forEach((v, i) => {
      const x = (i / (tempCurve.length - 1)) * W;
      const y = H - 6 - clamp((v - 0.2) / 3.8, 0, 1) * (H - 14);
      i ? spCtx.lineTo(x, y) : spCtx.moveTo(x, y);
    });
    spCtx.stroke();

    spCtx.fillStyle = '#ffffff';
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

    if (state.cur >= 0) drawModal();

    if (state.probeP) {
      const px = state.probeP.x,
        pz = state.probeP.z;
      const h = relief(px, pz);
      const [lon, lat] = unwp(px, pz);
      if (isLive) {
        const lw = sampleLiveWeather(px, pz, h, state.tm);
        $('probe').textContent = `Live Probe ${lat.toFixed(2)}°, ${lon.toFixed(2)}°: ${fmtDeg(
          lw.absTemp
        )} (feels ${fmtDeg(lw.feelsLike)}) · Rain ${fmtMm(lw.precipMm)} (${
          lw.weatherDesc
        }) · Clouds ${Math.round(lw.cloudCover)}% · Wind ${Math.round(lw.windKmh)} km/h ${degToCompass(
          lw.windDir
        )}`;
      } else {
        const rA = rainAnomaly(px, pz, state.tm, state.nino, state.scenario);
        const absT = actualTempC(px, pz, h, state.tm, state.nino, state.scenario);
        const feelT = heatIndexC(px, pz, h, state.tm, state.nino, state.scenario);
        const w = sampleWind(px, pz, state.tm, state.nino, state.scenario);
        const rTier = getRainTier(rA);
        $('probe').textContent = `Probe ${lat.toFixed(2)}°, ${lon.toFixed(2)}°: ${fmtDeg(
          absT
        )} (feels ${fmtDeg(feelT)}) · Rain ${fmtPct(rA)} (${RAIN_STATUS[rTier]}) · Wind ${Math.round(
          w.speedKmh
        )} km/h ${degToCompass(w.dirDeg)}`;
      }
    }
  }

  return {
    rebuildCurves,
    drawPacificDiagram,
    drawModal,
    updateHUD,
    updateButtonsUI,
    updateScenarioHeader,
    toast,
  };
}
