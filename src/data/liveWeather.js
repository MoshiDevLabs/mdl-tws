// Real-Time Open-Meteo Weather Client & Spatial IDW Interpolator for Tanzania
// Queries https://api.open-meteo.com/v1/forecast (Free, No API Key Required)
// Strictly fetches CURRENT live weather right now (no forecast playback) across 27 Tanzanian stations.

const K = 8.5;
const wp = (lo, la) => [(lo - 35) * K, (-la - 6.3) * K];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// WMO Weather interpretation codes
export const WMO_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light rain',
  67: 'Heavy rain',
  80: 'Light rain showers',
  81: 'Moderate showers',
  82: 'Heavy downpour',
  95: 'Thunderstorm',
  96: 'Thunderstorm & hail',
  99: 'Severe thunderstorm',
};

export function isWmoRaining(code, precipMm = 0) {
  return precipMm >= 0.08 || (typeof code === 'number' && code >= 51);
}

// 27 Real-Time Stations across Tanzania (first 9 match REGIONS[0..8] 1-to-1)
const STATION_COORDS = [
  // 9 Primary Regional Hubs (indices 0..8)
  { name: 'Moshi', lon: 37.34, lat: -3.35, baseTemp: 26.5 },
  { name: 'Tanga', lon: 39.1, lat: -5.07, baseTemp: 29.2 },
  { name: 'Dar es Salaam', lon: 39.28, lat: -6.82, baseTemp: 29.6 },
  { name: 'Morogoro', lon: 37.66, lat: -6.82, baseTemp: 28.2 },
  { name: 'Dodoma', lon: 35.74, lat: -6.17, baseTemp: 27.8 },
  { name: 'Mwanza', lon: 32.9, lat: -2.52, baseTemp: 26.8 },
  { name: 'Kigoma', lon: 29.63, lat: -4.88, baseTemp: 27.0 },
  { name: 'Mbeya', lon: 33.46, lat: -8.9, baseTemp: 22.4 },
  { name: 'Mtwara', lon: 40.18, lat: -10.27, baseTemp: 29.4 },
  // 18 Secondary Stations for nationwide spatial precision
  { name: 'Arusha', lon: 36.68, lat: -3.37, baseTemp: 24.8 },
  { name: 'Zanzibar', lon: 39.2, lat: -6.16, baseTemp: 29.5 },
  { name: 'Pemba', lon: 39.77, lat: -5.25, baseTemp: 29.2 },
  { name: 'Mafia Island', lon: 39.67, lat: -7.91, baseTemp: 29.4 },
  { name: 'Iringa', lon: 35.69, lat: -7.77, baseTemp: 23.8 },
  { name: 'Tabora', lon: 32.8, lat: -5.02, baseTemp: 28.4 },
  { name: 'Songea', lon: 35.66, lat: -10.68, baseTemp: 25.2 },
  { name: 'Bukoba', lon: 31.81, lat: -1.33, baseTemp: 25.0 },
  { name: 'Musoma', lon: 33.8, lat: -1.5, baseTemp: 26.4 },
  { name: 'Sumbawanga', lon: 31.62, lat: -7.97, baseTemp: 23.5 },
  { name: 'Lindi', lon: 39.71, lat: -9.99, baseTemp: 29.4 },
  { name: 'Singida', lon: 34.76, lat: -4.82, baseTemp: 26.8 },
  { name: 'Shinyanga', lon: 33.42, lat: -3.66, baseTemp: 28.0 },
  { name: 'Babati', lon: 35.75, lat: -4.22, baseTemp: 25.0 },
  { name: 'Njombe', lon: 34.77, lat: -9.34, baseTemp: 20.5 },
  { name: 'Mpanda', lon: 31.07, lat: -6.35, baseTemp: 27.2 },
  { name: 'Kilwa Masoko', lon: 39.51, lat: -8.91, baseTemp: 29.4 },
  { name: 'Same', lon: 37.75, lat: -4.07, baseTemp: 27.2 },
];

export const liveState = {
  status: 'idle', // 'loading' | 'live' | 'fallback'
  updatedAt: null,
  stations: STATION_COORDS.map((s) => {
    const [x, z] = wp(s.lon, s.lat);
    return {
      ...s,
      x,
      z,
      tempC: s.baseTemp,
      feelsLikeC: s.baseTemp + 1.4,
      humidity: 64,
      precipMm: 0.0, // Strictly 0.0 mm (dry) unless Open-Meteo reports active rain right now
      cloudCover: 25,
      windKmh: 14,
      windDir: 115,
      weatherCode: 1,
      weatherDesc: 'Mainly clear',
    };
  }),
};

export async function fetchLiveTanzaniaWeather(onUpdate) {
  liveState.status = 'loading';
  if (onUpdate) onUpdate(liveState);

  const lats = STATION_COORDS.map((s) => s.lat).join(',');
  const lons = STATION_COORDS.map((s) => s.lon).join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m` +
    `&timezone=Africa%2FDar_es_Salaam`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data];

    list.forEach((item, idx) => {
      const st = liveState.stations[idx];
      if (!st || !item.current) return;
      const c = item.current;
      st.tempC = typeof c.temperature_2m === 'number' ? c.temperature_2m : st.tempC;
      st.feelsLikeC =
        typeof c.apparent_temperature === 'number' ? c.apparent_temperature : st.tempC + 1.4;
      st.humidity = typeof c.relative_humidity_2m === 'number' ? c.relative_humidity_2m : 64;

      const pTotal = typeof c.precipitation === 'number' ? c.precipitation : 0;
      const pRain =
        (typeof c.rain === 'number' ? c.rain : 0) +
        (typeof c.showers === 'number' ? c.showers : 0);
      st.precipMm = Math.max(pTotal, pRain);

      st.cloudCover = typeof c.cloud_cover === 'number' ? c.cloud_cover : 25;
      st.windKmh = typeof c.wind_speed_10m === 'number' ? c.wind_speed_10m : 12;
      st.windDir = typeof c.wind_direction_10m === 'number' ? c.wind_direction_10m : 110;
      st.weatherCode = typeof c.weather_code === 'number' ? c.weather_code : 1;
      st.weatherDesc =
        WMO_CODES[st.weatherCode] || (st.precipMm > 0 ? 'Rain' : 'Clear / Partly cloudy');
    });

    const firstTime = list[0]?.current?.time;
    liveState.updatedAt = firstTime
      ? firstTime.replace('T', ' ') + ' EAT'
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    liveState.status = 'live';
  } catch (err) {
    liveState.status = 'fallback';
    liveState.updatedAt = 'Baseline telemetry';
  }

  if (onUpdate) onUpdate(liveState);
  return liveState;
}

// Exact current live reading for the 9 primary regional cities (indices 0..8)
export function getStationLiveWeather(idx) {
  const s = liveState.stations[idx] || liveState.stations[0];
  const isRaining = isWmoRaining(s.weatherCode, s.precipMm);
  const effectiveMm = isRaining ? Math.max(s.precipMm, s.weatherCode >= 61 ? 0.6 : 0.15) : 0;
  const rainA = isRaining ? clamp(18 + effectiveMm * 32, 18, 125) : 0;
  const tempA = clamp(s.tempC - s.baseTemp, -2.5, 4.5);

  return {
    tempC: s.tempC,
    tempA,
    feelsLike: s.feelsLikeC,
    precipMm: effectiveMm,
    cloudCover: s.cloudCover,
    humidity: s.humidity,
    windKmh: s.windKmh,
    windDir: s.windDir,
    weatherCode: s.weatherCode,
    weatherDesc: WMO_CODES[s.weatherCode] || s.weatherDesc,
    isRaining,
    rainA,
  };
}

// Spatial Inverse-Distance Weighting (IDW) interpolation across the 3D map right now
export function sampleLiveWeather(x, z, h = 1) {
  let wSum = 0;
  let tempC = 0,
    tempAnom = 0,
    feelsC = 0,
    precipMm = 0,
    cloud = 0,
    windVx = 0,
    windVz = 0,
    windKmh = 0,
    humidity = 0;

  let nearestDist2 = 1e9;
  let nearestCode = 1;

  for (let i = 0; i < liveState.stations.length; i++) {
    const s = liveState.stations[i];
    const d2 = (x - s.x) ** 2 + (z - s.z) ** 2 + 2.5;
    const w = 1 / (d2 * d2);
    wSum += w;

    if (d2 < nearestDist2) {
      nearestDist2 = d2;
      nearestCode = s.weatherCode;
    }

    const stEffectivePrecip = isWmoRaining(s.weatherCode, s.precipMm)
      ? Math.max(s.precipMm, s.weatherCode >= 61 ? 0.5 : 0.12)
      : 0;

    const sAnom = s.tempC - s.baseTemp;
    tempC += s.tempC * w;
    tempAnom += sAnom * w;
    feelsC += s.feelsLikeC * w;
    precipMm += stEffectivePrecip * w;
    cloud += s.cloudCover * w;
    windKmh += s.windKmh * w;
    humidity += s.humidity * w;

    const rad = (s.windDir * Math.PI) / 180;
    windVx += -Math.sin(rad) * s.windKmh * w;
    windVz += Math.cos(rad) * s.windKmh * w;
  }

  tempC /= wSum;
  tempAnom /= wSum;
  feelsC /= wSum;
  precipMm /= wSum;
  cloud /= wSum;
  windKmh /= wSum;
  windVx /= wSum;
  windVz /= wSum;
  humidity /= wSum;

  const highElevCooling = Math.max(0, h - 1.8) * 2.4;
  tempC -= highElevCooling;
  feelsC -= highElevCooling;

  const isRaining = precipMm >= 0.08;
  const cleanPrecip = isRaining ? precipMm : 0;
  const rainA = isRaining ? clamp(18 + cleanPrecip * 32, 18, 125) : 0;
  const windDir = ((Math.atan2(-windVx, windVz) * 180) / Math.PI + 360) % 360;

  return {
    rainA,
    tempA: clamp(tempAnom, -2.5, 4.5),
    absTemp: tempC,
    feelsLike: feelsC,
    precipMm: cleanPrecip,
    cloudCover: cloud,
    humidity: Math.round(humidity),
    weatherCode: nearestCode,
    weatherDesc: WMO_CODES[nearestCode] || (isRaining ? 'Rain' : 'Clear / Partly cloudy'),
    isRaining,
    windVx,
    windVz,
    windKmh,
    windDir,
  };
}
