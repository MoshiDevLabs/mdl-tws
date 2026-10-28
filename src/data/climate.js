// Mdl TWS — Multi-Country Climate & Live Real-Time Telemetry Engine
// Dynamically adapts projection, anomaly centers, cyclone track, stations & towns to the active country ('tz' or 'ke').
import {
  K,
  R,
  wp,
  unwp,
  COUNTRIES,
  COUNTRY_LIST,
  getCountry,
  getActiveCountryId,
  setActiveCountry,
} from './countries/index.js';
import {
  sampleLiveWeather,
  getStationLiveWeather,
  getStationHourlySeries,
  getForecastTimeLabel,
  liveState,
  getLiveState,
} from './liveWeather.js';

export {
  K,
  R,
  wp,
  unwp,
  COUNTRIES,
  COUNTRY_LIST,
  getCountry,
  getActiveCountryId,
  setActiveCountry,
  sampleLiveWeather,
  getStationLiveWeather,
  getStationHourlySeries,
  getForecastTimeLabel,
  getLiveState,
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
export const LIVE_HOURS = ['Now', '+4h', '+8h', '+12h', '+18h', '+24h'];

export const SCENARIOS = {
  live: {
    id: 'live',
    short: '● Live Now',
    title: '3D Interactive Weather & Basin System',
    badge: 'Real-time station & satellite telemetry',
    hotBadge: 'Current weather right now · Rain (mm/h) · Temp (°C)',
    note: 'Current real-time weather fetched across 27 national stations via Open-Meteo. Shows actual current rainfall right now (0.0 mm/h when dry), live cloud cover, temperature, and wind.',
  },
  elnino: {
    id: 'elnino',
    short: '🌊 El Niño + IOD',
    title: 'Super El Niño & Positive Indian Ocean Dipole',
    badge: 'Niño 3.4 + W. Indian Ocean SST coupling',
    hotBadge: 'Humid heat surge & basin floods',
    note: 'Warm Pacific & Western Indian Ocean waters pump heavy moisture into East Africa (Oct–Mar), driving coastal & highland deluges alongside +1.5°C to +4.2°C thermal anomalies.',
  },
  cyclone: {
    id: 'cyclone',
    short: '🌀 Cyclone Landfall',
    title: 'Tropical Cyclone Landfall (SW Indian Ocean Vortex)',
    badge: 'Cat 2–3 SW Indian Ocean Cyclone',
    hotBadge: '145 km/h winds · Coastal storm surge',
    note: 'Models a tropical cyclone tracking from the warm Indian Ocean onto the East African Swahili coast—compounding coastal storm surge and river basin flooding.',
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

function getCenters() {
  const c = getCountry().climateCenters;
  return {
    ne: wp(c.ne[0], c.ne[1]),
    vic: wp(c.vic[0], c.vic[1]),
    dar: wp(c.dar[0], c.dar[1]),
    sw: wp(c.sw[0], c.sw[1]),
    mt: wp(c.mt[0], c.mt[1]),
    cen: wp(c.cen[0], c.cen[1]),
    coast: wp(c.coast[0], c.coast[1]),
    shire: wp(c.shire[0], c.shire[1]),
  };
}

// Cyclone eye trajectory as tm goes 0 -> 6 (adapts to active country's coast)
export function getCycloneEye(tm) {
  const tr = getCountry().cycloneTrack;
  const u = clamp(tm / 5.8, 0, 1);
  const lon = tr.startLon + u * tr.lonDelta;
  const lat = tr.baseLat + Math.sin(u * Math.PI) * tr.latArc;
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

  const CENTERS = getCenters();
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

  const CENTERS = getCenters();
  const eastWarmth = clamp((lo - 32) / 10, 0, 1) * 0.45;
  const rain = rainAnomaly(x, z, t, nino, scenario);
  const dryBoost = rain < 0 ? (-rain / 60) * 1.15 : -clamp(rain / 180, 0, 0.28);
  const basinBoost =
    0.55 * gs(x, z, CENTERS.cen, 13) +
    0.65 * gs(x, z, CENTERS.coast, 11) +
    0.5 * gs(x, z, CENTERS.shire, 10);

  const wave = 0.22 * Math.sin(x * 0.22 + t * 1.1) * Math.cos(z * 0.24 - t * 0.8);
  return clamp((1.15 * seasonCurve + eastWarmth + dryBoost + basinBoost) * ninoFactor + wave, 0.4, 4.4);
}

export function actualTempC(x, z, h, t, nino = 3.3, scenario = 'elnino') {
  if (scenario === 'live') {
    return sampleLiveWeather(x, z, h, t).absTemp;
  }
  const [lo, la] = unwp(x, z);
  const baseSeason = li(SEASON_TEMP_BASE, t);
  const coastalBonus = clamp((lo - 36.5) / 3.5, 0, 1) * 1.8;
  const latFactor = clamp((la + 10) / 14, 0, 1) * 0.8;
  const elevDrop = Math.max(0, h - 1.1) * 2.55;
  const anom = tempAnomaly(x, z, t, nino, scenario);
  return clamp(baseSeason + coastalBonus + latFactor - elevDrop + anom * 0.72, 14, 41);
}

export function heatIndexC(x, z, h, t, nino = 3.3, scenario = 'elnino') {
  if (scenario === 'live') {
    return sampleLiveWeather(x, z, h, t).feelsLike;
  }
  const T = actualTempC(x, z, h, t, nino, scenario);
  const [lo] = unwp(x, z);
  const rain = rainAnomaly(x, z, t, nino, scenario);
  const humidityFactor = clamp((lo - 34) / 5.5, 0.2, 1.0) * (rain > 0 ? 1.25 : 0.75);
  return Math.round(T + Math.max(0, T - 25) * 0.32 * humidityFactor);
}

export function sampleWind(x, z, t, nino = 3.3, scenario = 'elnino') {
  if (scenario === 'live') {
    const lw = sampleLiveWeather(x, z, 1, t);
    return { vx: lw.vx, vz: lw.vz, speedKmh: lw.windKmh, dirDeg: lw.windDir };
  }

  if (scenario === 'cyclone') {
    const eye = getCycloneEye(t);
    const dx = x - eye.x;
    const dz = z - eye.z;
    const r = Math.hypot(dx, dz) + 0.4;
    const swirl = Math.exp(-((r - 4.2) ** 2) / (2 * 14 * 14)) * 28 * (0.7 + 0.4 * eye.strength);
    const tx = -dz / r;
    const tz = dx / r;
    const inx = (-dx / r) * 0.32;
    const inz = (-dz / r) * 0.32;
    const vx = -6.5 + (tx + inx) * swirl;
    const vz = -1.2 + (tz + inz) * swirl;
    const speedKmh = Math.hypot(vx, vz) * 4.2;
    const dirDeg = ((Math.atan2(-vx, vz) * 180) / Math.PI + 360) % 360;
    return { vx, vz, speedKmh, dirDeg };
  }

  const vx = -(10.5 + 3.8 * Math.sin(z * 0.08 + t) + (x > 6 ? 4.5 : 0)) * (0.68 + 0.1 * nino);
  const vz =
    (t < 2.5 ? 1 : -1) * 4.5 * Math.cos(x * 0.09 - t * 0.8) - 2.6 * Math.sin((z - 8) * 0.06);
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

export const REGIONS = [...getCountry().regions];
export const GEO_LABELS = [...getCountry().geoLabels];
export const TOWNS = [...getCountry().towns];

export function syncCountryClimateArrays() {
  const c = getCountry();
  REGIONS.length = 0;
  c.regions.forEach((r) => REGIONS.push(r));
  GEO_LABELS.length = 0;
  c.geoLabels.forEach((g) => GEO_LABELS.push(g));
  TOWNS.length = 0;
  c.towns.forEach((t) => TOWNS.push(t));
}

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
