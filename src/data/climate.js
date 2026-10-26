// Mdl TWS — Tanzania 3D Interactive Weather System (Climate & Live Real-Time Telemetry Engine)
// Supports:
// 1. 'live'    — Real-time Open-Meteo API telemetry + 24h forecast across 27 Tanzanian stations
// 2. 'elnino'  — Super El Niño + Positive Indian Ocean Dipole (Deluge & Heat Surge)
// 3. 'cyclone' — Tropical Cyclone Landfall (Cyclone Hidaya / Kenneth coastal vortex)

import { sampleLiveWeather, getStationLiveWeather, liveState } from './liveWeather.js';

export { sampleLiveWeather, getStationLiveWeather };

export const K = 8.5;
export const R = 68;
export const wp = (lo, la) => [(lo - 35) * K, (-la - 6.3) * K];
export const unwp = (x, z) => [x / K + 35, -(z / K + 6.3)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
export const LIVE_HOURS = ['Now', '+4h', '+8h', '+12h', '+18h', '+24h'];

export const SCENARIOS = {
  live: {
    id: 'live',
    short: '● Live Now',
    title: 'Tanzania 3D Interactive Weather System',
    badge: 'Real-time station & satellite telemetry',
    hotBadge: 'Current weather right now · Rain (mm/h) · Temp (°C)',
    note: 'Current real-time weather fetched across 27 Tanzanian stations via Open-Meteo. Shows actual current rainfall right now (0.0 mm/h when dry), live cloud cover, temperature, and wind.',
  },
  elnino: {
    id: 'elnino',
    short: '🌊 El Niño + IOD',
    title: 'Super El Niño & Positive Indian Ocean Dipole',
    badge: 'Niño 3.4 + W. Indian Ocean SST coupling',
    hotBadge: 'Humid heat surge & basin floods',
    note: 'Warm Pacific & Western Indian Ocean waters pump heavy moisture into East Africa (Oct–Mar), driving coastal & northern deluges alongside +1.5°C to +4.2°C thermal anomalies.',
  },
  cyclone: {
    id: 'cyclone',
    short: '🌀 Cyclone Landfall',
    title: 'Tropical Cyclone Landfall (Hidaya / Kenneth)',
    badge: 'Cat 2–3 SW Indian Ocean Cyclone',
    hotBadge: '145 km/h winds · Coastal storm surge',
    note: 'Models a tropical cyclone tracking from the warm Indian Ocean into Kibiti, Dar es Salaam, Kilwa, and Mtwara—compounding coastal storm surge and river basin flooding.',
  },
};

const SEASON_TEMP_BASE = [30.2, 31.0, 31.8, 32.3, 32.6, 31.7, 31.2];
const SEASON_HEAT_ANOM = [0.72, 0.85, 0.98, 1.12, 1.18, 1.05, 0.95];
const WN = [0.6, 0.95, 1.0, 0.75, 0.5, 0.35, 0.35];
const WS = [0.1, 0.2, 0.4, 0.7, 0.9, 0.95, 0.95];

const li = (a, t) => {
  const i = Math.min(5, Math.max(0, Math.floor(t)));
  const f = t - i;
  return a[i] + (a[i + 1] - a[i]) * f;
};

const gs = (x, z, c, s) => Math.exp(-((x - c[0]) ** 2 + (z - c[1]) ** 2) / (2 * s * s));

const CENTERS = {
  ne: wp(38.2, -4.5),
  vic: wp(32.5, -2.5),
  dar: wp(39.0, -7.0),
  sw: wp(33.0, -9.0),
  mt: wp(38.0, -10.5),
  cen: wp(35.8, -6.1),
  coast: wp(39.3, -6.8),
  shire: wp(36.8, -8.2),
};

// Cyclone eye trajectory as tm goes 0 -> 6
export function getCycloneEye(tm) {
  const u = clamp(tm / 5.8, 0, 1);
  const lon = 42.2 - u * 4.6;
  const lat = -8.4 + Math.sin(u * Math.PI) * 1.15;
  const [x, z] = wp(lon, lat);
  const strength = Math.sin(clamp(u * 1.15, 0.15, 0.95) * Math.PI);
  return { x, z, lon, lat, strength, u };
}

function smoothstep(a, b, x) {
  const u = clamp((x - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
}

export function rainAnomaly(x, z, t, nino = 3.3, scenario = 'elnino') {
  if (scenario === 'live') {
    return sampleLiveWeather(x, z, 1, t).rainA;
  }

  const mult = nino / 3.3;

  if (scenario === 'cyclone') {
    const eye = getCycloneEye(t);
    const dist = Math.hypot(x - eye.x, z - eye.z);
    const eyewall = Math.exp(-((dist - 3.8) ** 2) / (2 * 6.5 * 6.5)) * 135;
    const outerBands =
      Math.exp(-(dist ** 2) / (2 * 18 * 18)) *
      (55 + 25 * Math.sin(dist * 0.65 - t * 4.0 + Math.atan2(z - eye.z, x - eye.x) * 2));
    const inlandDry = -18 * smoothstep(22, 48, dist);
    return clamp((eyewall + outerBands + inlandDry) * (0.75 + 0.35 * eye.strength) * mult, -45, 145);
  }

  // Default: 'elnino'
  const n = Math.min(
    1.15,
    gs(x, z, CENTERS.ne, 14) + 0.65 * gs(x, z, CENTERS.vic, 9.5) + 0.75 * gs(x, z, CENTERS.dar, 10.5)
  );
  const s = Math.min(1.15, gs(x, z, CENTERS.sw, 14) + 0.72 * gs(x, z, CENTERS.mt, 10.5));
  return (
    mult *
    (100 * (1.25 * li(WN, t) * n - 0.85 * li(WS, t) * s) +
      12 * Math.sin(x * 0.35 + t * 1.3) * Math.cos(z * 0.3 - t))
  );
}

export function tempAnomaly(x, z, t, nino = 3.3, scenario = 'elnino') {
  if (scenario === 'live') {
    return sampleLiveWeather(x, z, 1, t).tempA;
  }

  const ninoFactor = Math.pow(nino / 2.2, 1.18);
  const seasonCurve = li(SEASON_HEAT_ANOM, t);
  const [lo] = unwp(x, z);

  if (scenario === 'cyclone') {
    const eye = getCycloneEye(t);
    const dist = Math.hypot(x - eye.x, z - eye.z);
    const warmFeed = 1.9 + clamp((lo - 34) / 6, 0, 1) * 1.1 - Math.exp(-(dist ** 2) / 90) * 0.7;
    return clamp(warmFeed * (nino / 3.0), 0.6, 3.8);
  }

  const eastWarmth = clamp((lo - 30) / 10, 0, 1) * 0.45;
  const rain = rainAnomaly(x, z, t, nino, scenario);
  const dryBoost = rain < 0 ? (-rain / 60) * 1.15 : -clamp(rain / 180, 0, 0.28);
  const basinBoost =
    0.55 * gs(x, z, CENTERS.cen, 13) +
    0.65 * gs(x, z, CENTERS.coast, 11) +
    0.5 * gs(x, z, CENTERS.shire, 10);

  const wave = 0.18 * Math.sin(x * 0.22 - t * 0.9) * Math.cos(z * 0.25 + t * 0.7);
  const baseAnom = (1.15 + eastWarmth + basinBoost + dryBoost * 0.65) * seasonCurve * ninoFactor + wave;
  return clamp(baseAnom, 0.3, 4.8);
}

export function actualTempC(x, z, h, t, nino = 3.3, scenario = 'elnino') {
  if (scenario === 'live') {
    return sampleLiveWeather(x, z, h, t).absTemp;
  }
  const [lo, la] = unwp(x, z);
  const seaLevelBase = li(SEASON_TEMP_BASE, t) + (lo - 34) * 0.22 + (la + 6) * 0.08;
  const lapseRate = h * 2.55;
  const anom = tempAnomaly(x, z, t, nino, scenario);
  return seaLevelBase - lapseRate + anom;
}

export function heatIndexC(x, z, h, t, nino = 3.3, scenario = 'elnino') {
  if (scenario === 'live') {
    return sampleLiveWeather(x, z, h, t).feelsLike;
  }
  const temp = actualTempC(x, z, h, t, nino, scenario);
  const [lo] = unwp(x, z);
  const rain = rainAnomaly(x, z, t, nino, scenario);
  const coastalHumidity = clamp((lo - 35.5) / 4.5, 0, 1) * 2.8;
  const wetHumidity = clamp((rain + 20) / 100, 0, 1) * 2.1 * (nino / 3.0);
  return temp + coastalHumidity + wetHumidity;
}

export function sampleWind(x, z, t, nino = 3.3, scenario = 'elnino') {
  if (scenario === 'live') {
    const lw = sampleLiveWeather(x, z, 1, t);
    return {
      vx: lw.windVx * 0.55,
      vz: lw.windVz * 0.55,
      speedKmh: lw.windKmh,
      dirDeg: lw.windDir,
    };
  }

  if (scenario === 'cyclone') {
    const eye = getCycloneEye(t);
    const dx = x - eye.x;
    const dz = z - eye.z;
    const r = Math.hypot(dx, dz) + 0.4;
    const tangX = -dz / r;
    const tangZ = dx / r;
    const inX = -dx / r;
    const inZ = -dz / r;
    const vortexProfile = Math.exp(-((r - 3.5) ** 2) / (2 * 14 * 14));
    const speedKmh = 22 + 125 * vortexProfile * eye.strength * (nino / 3.0);
    const vx = (tangX * 0.84 + inX * 0.36) * (speedKmh * 0.18) - 4.0;
    const vz = (tangZ * 0.84 + inZ * 0.36) * (speedKmh * 0.18);
    const dirDeg = ((Math.atan2(-vx, vz) * 180) / Math.PI + 360) % 360;
    return { vx, vz, speedKmh, dirDeg };
  }

  const wet = 0.65 * (nino / 3.3);
  const vx = -(6.2 + wet * 7.5);
  const vz = -2.2 * Math.sin((x + z) * 0.06 + t * 0.5) - wet * 1.8;
  const speedKmh = Math.hypot(vx, vz) * 2.4;
  const dirDeg = ((Math.atan2(-vx, vz) * 180) / Math.PI + 360) % 360;
  return { vx, vz, speedKmh, dirDeg };
}

export const RAIN_STATUS = ['Drier', 'Near normal', 'Wetter', 'Much wetter'];
export const RAIN_HEX = ['#f2a03d', '#58c496', '#3fd6ff', '#4b7bff'];
export const RAIN_COL = [0xf2a03d, 0x58c496, 0x3fd6ff, 0x4b7bff];

export const TEMP_STATUS = ['Pleasant / Warm', 'Hot', 'Very Hot', 'Extreme Heat'];
export const TEMP_HEX = ['#ffd166', '#ff9233', '#ff5238', '#ff1e56'];
export const TEMP_COL = [0xffd166, 0xff9233, 0xff5238, 0xff1e56];

export function getRainTier(a, isLive = false, precipMm = 0) {
  if (isLive) {
    return precipMm < 0.08 ? 1 : precipMm < 2.0 ? 2 : 3;
  }
  return a < -15 ? 0 : a < 25 ? 1 : a < 70 ? 2 : 3;
}

export function getTempTier(anom, absTemp = 30) {
  const score = Math.max(0, anom) + Math.max(0, (absTemp - 30.5) * 0.32);
  return score < 1.2 ? 0 : score < 2.1 ? 1 : score < 3.0 ? 2 : 3;
}

export const REGIONS = [
  ['Moshi', 37.34, -3.35, 'Kilimanjaro slopes & Pare foothills', 890],
  ['Tanga', 39.1, -5.07, 'Northern coast & Pangani basin', 45],
  ['Dar es Salaam', 39.28, -6.82, 'Coastal metropolis & Msimbazi basin', 24],
  ['Morogoro', 37.66, -6.82, 'Uluguru slopes & Kilombero valley', 510],
  ['Dodoma', 35.74, -6.17, 'Central semi-arid plateau capital', 1120],
  ['Mwanza', 32.9, -2.52, 'Lake Victoria southern shoreline', 1140],
  ['Kigoma', 29.63, -4.88, 'Lake Tanganyika eastern escarpment', 780],
  ['Mbeya', 33.46, -8.9, 'Southern Highlands agricultural belt', 1700],
  ['Mtwara', 40.18, -10.27, 'Southern coast & Ruvuma basin', 110],
];

export const GEO_LABELS = [
  ['Mt. Kilimanjaro · 5,895 m', 37.35, -3.07, 4.4, 'peak'],
  ['Mt. Meru · 4,562 m', 36.75, -3.24, 3.1, 'peak'],
  ['Ngorongoro Crater', 35.58, -3.18, 2.6, 'peak'],
  ['Serengeti National Park', 34.8, -2.4, 1.4, 'land'],
  ['Rufiji River Delta', 39.15, -7.85, 0.7, 'lake'],
  ['Lake Victoria', 32.7, -1.9, 0.8, 'lake'],
  ['Lake Tanganyika', 29.9, -6.4, 0.8, 'lake'],
  ['Lake Nyasa', 34.5, -10.8, 0.8, 'lake'],
  ['Zanzibar (Unguja)', 39.35, -6.15, 0.9, 'island'],
  ['Indian Ocean', 41.1, -7.5, 0.6, 'ocean'],
];

export const TOWNS = [
  ['Arusha', 36.68, -3.37, 1.4],
  ['Iringa', 35.69, -7.77, 1.0],
  ['Songea', 35.66, -10.68, 0.95],
  ['Singida', 34.76, -4.82, 0.9],
  ['Tabora', 32.8, -5.02, 1.05],
  ['Lindi', 39.71, -9.99, 0.85],
  ['Bukoba', 31.81, -1.33, 0.95],
  ['Musoma', 33.8, -1.5, 0.85],
  ['Sumbawanga', 31.62, -7.97, 0.9],
  ['Shinyanga', 33.42, -3.66, 0.95],
  ['Babati (Hanang)', 35.75, -4.22, 0.85],
  ['Njombe', 34.77, -9.34, 0.85],
  ['Mpanda', 31.07, -6.35, 0.8],
  ['Kilwa Masoko', 39.51, -8.91, 0.8],
  ['Bagamoyo', 38.9, -6.44, 0.9],
  ['Same', 37.75, -4.07, 0.75],
  ['Korogwe', 38.45, -5.15, 0.8],
  ['Zanzibar City', 39.2, -6.16, 1.35],
];

export function getImpacts(
  rainA,
  tempA,
  absTemp,
  scenario = 'elnino',
  windKmh = 15,
  precipMm = 0,
  weatherDesc = 'Clear'
) {
  const items = [];
  if (scenario === 'live') {
    const statusStr =
      liveState.status === 'live' ? 'Live Open-Meteo station feed' : 'Station telemetry';
    items.push(`${statusStr}: ${weatherDesc} · ${precipMm.toFixed(1)} mm/h precipitation`);
    if (precipMm >= 2.5) {
      items.push('Active downpour in progress: localized surface runoff & wet roads');
    } else if (precipMm >= 0.1) {
      items.push('Light to moderate live rainfall reported at station');
    } else {
      items.push('Currently dry (0.0 mm/h) — no active precipitation at this station');
    }
    items.push(`Surface wind ${Math.round(windKmh)} km/h · Ambient ${Math.round(absTemp)}°C`);
    return items;
  }

  if (scenario === 'cyclone' && windKmh > 55) {
    items.push(`Destructive cyclonic gusts (${Math.round(windKmh)} km/h) & coastal storm surge hazard`);
    items.push('Secure marine vessels, coastal roofs, and power transmission lines');
  }
  if (tempA >= 2.5 || absTemp >= 34.0) {
    items.push('High thermal stress & heat-index: reduce midday outdoor exertion and hydrate');
    items.push('Elevated crop evapotranspiration and peak cooling electricity demand');
  } else if (tempA >= 1.6 || absTemp >= 31.5) {
    items.push('Warm daytime & nighttime conditions above seasonal average');
  }

  if (rainA >= 70) {
    items.push('High flash-flood risk along river basins, low-lying wards, and steep escarpments');
    items.push('Bridges, culverts, and unpaved transport corridors vulnerable to washouts');
  } else if (rainA >= 25) {
    items.push('Favourable soil moisture for planting on well-drained upland slopes');
  } else if (rainA >= -15) {
    items.push('Near-normal moisture balance; standard agricultural & reservoir operations');
  } else {
    items.push('Severe rainfall deficit & dry-spell stress on rain-fed maize and pasture');
  }
  return items;
}
