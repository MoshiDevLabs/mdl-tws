// Real-Time Open-Meteo Weather Client, 24-Hour Hourly Forecast Engine & Spatial IDW Interpolator
// Queries https://api.open-meteo.com/v1/forecast (Free, No API Key Required)
// Each country ('tz', 'ke', etc.) has its own isolated 27-station live & 24-hour forecast store.
import { COUNTRIES, getCountry, getActiveCountryId, wp } from './countries/index.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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

function formatIsoHourEAT(isoStr, fallbackHour = 0) {
  if (typeof isoStr === 'string' && isoStr.length >= 16) {
    return `${isoStr.slice(11, 16)} EAT`;
  }
  const h = ((fallbackHour % 24) + 24) % 24;
  return `${String(h).padStart(2, '0')}:00 EAT`;
}

function buildDefaultHourlySeries(s) {
  const nowHour = new Date().getHours();
  const arr = [];
  for (let h = 0; h <= 24; h++) {
    const clockH = (nowHour + h) % 24;
    // Realistic diurnal temperature wave peaking around 14:00-15:00 local time
    const diurnal = Math.sin(((clockH - 9) / 24) * Math.PI * 2) * 3.1;
    const tempC = +(s.baseTemp + diurnal).toFixed(1);
    arr.push({
      hourOffset: h,
      timeLabel: `${String(clockH).padStart(2, '0')}:00 EAT`,
      tempC,
      feelsLikeC: +(tempC + 1.4).toFixed(1),
      humidity: 64,
      precipMm: 0.0,
      precipProb: 15,
      cloudCover: 25,
      windKmh: 14,
      windDir: 115,
      weatherCode: 1,
      weatherDesc: 'Mainly clear',
    });
  }
  return arr;
}

function createCountryLiveState(country) {
  const nowHour = new Date().getHours();
  const hourlyTimes = Array.from({ length: 25 }, (_, h) => {
    const clockH = (nowHour + h) % 24;
    return `${String(clockH).padStart(2, '0')}:00 EAT`;
  });

  return {
    countryId: country.id,
    status: 'idle', // 'loading' | 'live' | 'fallback'
    updatedAt: null,
    hourlyTimes,
    stations: country.stations27.map((s) => {
      const [x, z] = wp(s.lon, s.lat, country);
      return {
        ...s,
        x,
        z,
        tempC: s.baseTemp,
        feelsLikeC: s.baseTemp + 1.4,
        humidity: 64,
        precipMm: 0.0,
        precipProb: 15,
        cloudCover: 25,
        windKmh: 14,
        windDir: 115,
        weatherCode: 1,
        weatherDesc: 'Mainly clear',
        hourly: buildDefaultHourlySeries(s),
      };
    }),
  };
}

// Strictly isolated per-country live + 24h forecast weather store
export const liveStateByCountry = {};
Object.keys(COUNTRIES).forEach((cid) => {
  liveStateByCountry[cid] = createCountryLiveState(COUNTRIES[cid]);
});

export function getLiveState(countryId = getActiveCountryId()) {
  if (!liveStateByCountry[countryId]) {
    liveStateByCountry[countryId] = createCountryLiveState(getCountry(countryId));
  }
  return liveStateByCountry[countryId];
}

// Dynamic proxy so existing `liveState.status`, `liveState.updatedAt`, `liveState.stations` reads always reflect the active country
export const liveState = {
  get status() {
    return getLiveState().status;
  },
  set status(v) {
    getLiveState().status = v;
  },
  get updatedAt() {
    return getLiveState().updatedAt;
  },
  set updatedAt(v) {
    getLiveState().updatedAt = v;
  },
  get hourlyTimes() {
    return getLiveState().hourlyTimes;
  },
  get stations() {
    return getLiveState().stations;
  },
};

export function getForecastTimeLabel(tm = 0, countryId = getActiveCountryId()) {
  const stState = getLiveState(countryId);
  const hourOffset = clamp(Math.round((tm / 6) * 24), 0, 24);
  const clockStr =
    (stState.hourlyTimes && stState.hourlyTimes[hourOffset]) ||
    formatIsoHourEAT(null, new Date().getHours() + hourOffset);
  return {
    hourOffset,
    isNow: hourOffset === 0,
    shortLabel: hourOffset === 0 ? 'Live Now' : `+${hourOffset}h Forecast`,
    clockLabel: clockStr,
    fullLabel: hourOffset === 0 ? `Live Now (${clockStr})` : `+${hourOffset}h (${clockStr})`,
  };
}

export async function fetchLiveCountryWeather(onUpdate, countryId = getActiveCountryId()) {
  const country = getCountry(countryId);
  const stState = getLiveState(countryId);

  // Re-sync station world coordinates using this country's projection
  stState.stations.forEach((st) => {
    const [x, z] = wp(st.lon, st.lat, country);
    st.x = x;
    st.z = z;
  });

  stState.status = 'loading';
  if (onUpdate) onUpdate(stState, countryId);

  const lats = country.stations27.map((s) => s.lat).join(',');
  const lons = country.stations27.map((s) => s.lon).join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m` +
    `&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m` +
    `&forecast_days=2&timezone=${encodeURIComponent(country.timezone)}`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data];

    list.forEach((item, idx) => {
      const st = stState.stations[idx];
      if (!st || !item.current) return;
      const c = item.current;
      st.tempC = typeof c.temperature_2m === 'number' ? c.temperature_2m : st.tempC;
      st.feelsLikeC =
        typeof c.apparent_temperature === 'number' ? c.apparent_temperature : st.tempC + 1.4;
      st.humidity = typeof c.relative_humidity_2m === 'number' ? c.relative_humidity_2m : 65;

      const rawPrecip = Math.max(c.precipitation || 0, c.rain || 0, c.showers || 0);
      st.precipMm = rawPrecip >= 0.05 ? rawPrecip : 0.0;
      st.cloudCover = typeof c.cloud_cover === 'number' ? c.cloud_cover : 25;
      st.windKmh = typeof c.wind_speed_10m === 'number' ? c.wind_speed_10m : 14;
      st.windDir = typeof c.wind_direction_10m === 'number' ? c.wind_direction_10m : 110;
      st.weatherCode = typeof c.weather_code === 'number' ? c.weather_code : 0;
      st.weatherDesc = WMO_CODES[st.weatherCode] || 'Clear';

      // Parse 24-hour hourly forecast window (h = 0..24) aligned to current observation hour
      const hr = item.hourly;
      if (hr && Array.isArray(hr.time) && hr.time.length >= 25) {
        const curPrefix = typeof c.time === 'string' ? c.time.slice(0, 13) : '';
        let startIdx = curPrefix
          ? hr.time.findIndex((t) => typeof t === 'string' && t.slice(0, 13) === curPrefix)
          : -1;
        if (startIdx < 0) {
          startIdx = clamp(new Date().getHours(), 0, Math.max(0, hr.time.length - 25));
        }

        const hourlySeries = [];
        for (let h = 0; h <= 24; h++) {
          const k = Math.min(hr.time.length - 1, startIdx + h);
          const timeLabel = formatIsoHourEAT(hr.time[k], h);
          if (idx === 0) {
            stState.hourlyTimes[h] = timeLabel;
          }

          if (h === 0) {
            const pProb0 =
              typeof hr.precipitation_probability?.[k] === 'number'
                ? hr.precipitation_probability[k]
                : st.precipMm > 0
                ? 85
                : 15;
            st.precipProb = pProb0;
            hourlySeries.push({
              hourOffset: 0,
              timeLabel,
              tempC: st.tempC,
              feelsLikeC: st.feelsLikeC,
              humidity: st.humidity,
              precipMm: st.precipMm,
              precipProb: pProb0,
              cloudCover: st.cloudCover,
              windKmh: st.windKmh,
              windDir: st.windDir,
              weatherCode: st.weatherCode,
              weatherDesc: st.weatherDesc,
            });
          } else {
            const hTemp =
              typeof hr.temperature_2m?.[k] === 'number' ? hr.temperature_2m[k] : st.tempC;
            const hFeel =
              typeof hr.apparent_temperature?.[k] === 'number'
                ? hr.apparent_temperature[k]
                : hTemp + 1.3;
            const hHum =
              typeof hr.relative_humidity_2m?.[k] === 'number' ? hr.relative_humidity_2m[k] : 65;
            const hRawP = Math.max(
              hr.precipitation?.[k] || 0,
              hr.rain?.[k] || 0,
              hr.showers?.[k] || 0
            );
            const hPrecip = hRawP >= 0.05 ? hRawP : 0.0;
            const hProb =
              typeof hr.precipitation_probability?.[k] === 'number'
                ? hr.precipitation_probability[k]
                : hPrecip > 0
                ? 75
                : 10;
            const hCloud =
              typeof hr.cloud_cover?.[k] === 'number' ? hr.cloud_cover[k] : st.cloudCover;
            const hWind =
              typeof hr.wind_speed_10m?.[k] === 'number' ? hr.wind_speed_10m[k] : st.windKmh;
            const hDir =
              typeof hr.wind_direction_10m?.[k] === 'number' ? hr.wind_direction_10m[k] : st.windDir;
            const hCode =
              typeof hr.weather_code?.[k] === 'number' ? hr.weather_code[k] : st.weatherCode;

            hourlySeries.push({
              hourOffset: h,
              timeLabel,
              tempC: hTemp,
              feelsLikeC: hFeel,
              humidity: hHum,
              precipMm: hPrecip,
              precipProb: hProb,
              cloudCover: hCloud,
              windKmh: hWind,
              windDir: hDir,
              weatherCode: hCode,
              weatherDesc: WMO_CODES[hCode] || 'Clear',
            });
          }
        }
        st.hourly = hourlySeries;
      }
    });

    const now = new Date();
    stState.updatedAt =
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' EAT';
    stState.status = 'live';
  } catch (err) {
    console.warn(
      `[Mdl TWS] Open-Meteo live fetch fallback for ${country.name}:`,
      err?.message || err
    );
    stState.status = 'fallback';
    stState.updatedAt = 'Climatology baseline';
  }

  if (onUpdate) onUpdate(stState, countryId);
  return stState;
}

// Backwards-compatible alias
export const fetchLiveTanzaniaWeather = fetchLiveCountryWeather;

// Smooth temporal interpolation across the 25 hourly forecast slots (0h .. +24h)
function sampleStationAtHour(st, hourOffset = 0) {
  const hr = st.hourly;
  if (!hr || !hr.length || hourOffset <= 0.001) {
    const slot0 = hr && hr[0];
    return {
      tempC: st.tempC,
      feelsLikeC: st.feelsLikeC,
      humidity: st.humidity,
      precipMm: st.precipMm,
      precipProb: slot0 ? slot0.precipProb : st.precipProb || 15,
      cloudCover: st.cloudCover,
      windKmh: st.windKmh,
      windDir: st.windDir,
      weatherCode: st.weatherCode,
      weatherDesc: st.weatherDesc,
      timeLabel: slot0 ? slot0.timeLabel : 'Now',
    };
  }

  const maxIdx = hr.length - 1;
  const clampedH = clamp(hourOffset, 0, maxIdx);
  const h0 = Math.floor(clampedH);
  const h1 = Math.min(maxIdx, h0 + 1);
  const f = clampedH - h0;
  const a = hr[h0];
  const b = hr[h1];
  const near = f < 0.5 ? a : b;

  const dDir = ((b.windDir - a.windDir + 540) % 360) - 180;
  const windDir = (a.windDir + dDir * f + 360) % 360;

  return {
    tempC: a.tempC + (b.tempC - a.tempC) * f,
    feelsLikeC: a.feelsLikeC + (b.feelsLikeC - a.feelsLikeC) * f,
    humidity: a.humidity + (b.humidity - a.humidity) * f,
    precipMm: a.precipMm + (b.precipMm - a.precipMm) * f,
    precipProb: a.precipProb + (b.precipProb - a.precipProb) * f,
    cloudCover: a.cloudCover + (b.cloudCover - a.cloudCover) * f,
    windKmh: a.windKmh + (b.windKmh - a.windKmh) * f,
    windDir,
    weatherCode: near.weatherCode,
    weatherDesc: near.weatherDesc,
    timeLabel: near.timeLabel,
  };
}

export function getStationHourlySeries(idx) {
  const stState = getLiveState();
  const st = stState.stations[idx] || stState.stations[0];
  return st.hourly || buildDefaultHourlySeries(st);
}

export function getStationLiveWeather(idx, tm = 0) {
  const stState = getLiveState();
  const st = stState.stations[idx] || stState.stations[0];
  const hourOffset = clamp((tm / 6) * 24, 0, 24);
  const snap = sampleStationAtHour(st, hourOffset);

  const isRaining = isWmoRaining(snap.weatherCode, snap.precipMm);
  const rainA = isRaining
    ? clamp(22 + snap.precipMm * 28 + (snap.cloudCover - 50) * 0.4, 18, 135)
    : clamp((snap.cloudCover - 45) * 0.35 + (snap.precipProb - 30) * 0.15, -28, 14);
  const tempA = clamp(snap.tempC - st.baseTemp + 1.2, -1.5, 4.2);

  return {
    tempC: snap.tempC,
    feelsLike: snap.feelsLikeC,
    humidity: snap.humidity,
    precipMm: snap.precipMm,
    precipProb: snap.precipProb,
    cloudCover: snap.cloudCover,
    windKmh: snap.windKmh,
    windDir: snap.windDir,
    weatherCode: snap.weatherCode,
    weatherDesc: snap.weatherDesc,
    timeLabel: snap.timeLabel,
    hourOffset,
    isRaining,
    rainA,
    tempA,
  };
}

export function sampleLiveWeather(x, z, h = 1, tm = 0) {
  const stState = getLiveState();
  const stations = stState.stations;
  const hourOffset = clamp((tm / 6) * 24, 0, 24);

  let wSum = 0;
  let tempC = 0;
  let feelsLike = 0;
  let precipMm = 0;
  let precipProb = 0;
  let cloudCover = 0;
  let tempA = 0;
  let vx = 0;
  let vz = 0;
  let nearestDist2 = Infinity;
  let nearestCode = 0;

  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    const snap = sampleStationAtHour(s, hourOffset);
    const d2 = (x - s.x) ** 2 + (z - s.z) ** 2;
    if (d2 < nearestDist2) {
      nearestDist2 = d2;
      nearestCode = snap.weatherCode;
    }
    const w = 1 / (d2 + 8.5);
    const rad = ((snap.windDir + 180) * Math.PI) / 180;

    wSum += w;
    tempC += snap.tempC * w;
    feelsLike += snap.feelsLikeC * w;
    precipMm += snap.precipMm * w;
    precipProb += snap.precipProb * w;
    cloudCover += snap.cloudCover * w;
    tempA += (snap.tempC - s.baseTemp + 1.2) * w;
    vx += Math.sin(rad) * (snap.windKmh / 2.4) * w;
    vz += -Math.cos(rad) * (snap.windKmh / 2.4) * w;
  }

  tempC /= wSum;
  feelsLike /= wSum;
  precipMm /= wSum;
  precipProb /= wSum;
  cloudCover /= wSum;
  tempA = clamp(tempA / wSum, -1.5, 4.2);
  vx /= wSum;
  vz /= wSum;

  const elevDrop = Math.max(0, h - 1.1) * 1.65;
  const adjTemp = clamp(tempC - elevDrop, 10, 41);
  const adjFeel = clamp(feelsLike - elevDrop, 10, 46);
  const speedKmh = Math.hypot(vx, vz) * 2.4;
  const dirDeg = ((Math.atan2(-vx, vz) * 180) / Math.PI + 360) % 360;

  const isRaining = isWmoRaining(nearestCode, precipMm);
  const rainA = isRaining
    ? clamp(20 + precipMm * 28 + (cloudCover - 45) * 0.4, 15, 135)
    : clamp((cloudCover - 45) * 0.3 + (precipProb - 30) * 0.12, -25, 12);

  return {
    absTemp: adjTemp,
    feelsLike: adjFeel,
    precipMm: isRaining ? precipMm : 0.0,
    precipProb: Math.round(precipProb),
    cloudCover,
    weatherCode: nearestCode,
    weatherDesc: WMO_CODES[nearestCode] || 'Clear',
    isRaining,
    rainA,
    tempA,
    vx,
    vz,
    windKmh: speedKmh,
    windDir: dirDeg,
  };
}
