// Multi-Country Registry & Dynamic Coordinate Projection Manager
// Supports Tanzania ('tz') and Kenya ('ke'), extensible to additional countries.
import { TANZANIA_PROFILE } from './tanzania.js';
import { KENYA_PROFILE } from './kenya.js';

export const COUNTRIES = {
  tz: TANZANIA_PROFILE,
  ke: KENYA_PROFILE,
};

export const COUNTRY_LIST = [TANZANIA_PROFILE, KENYA_PROFILE];

let activeCountryId = 'tz';

// Initialize from URL query ?country=ke|tz if present
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const qCountry = (params.get('country') || '').toLowerCase();
  if (COUNTRIES[qCountry]) {
    activeCountryId = qCountry;
  }
}

export function getCountry(id = activeCountryId) {
  return COUNTRIES[id] || COUNTRIES.tz;
}

export function getActiveCountryId() {
  return activeCountryId;
}

export function setActiveCountry(id) {
  if (COUNTRIES[id]) {
    activeCountryId = id;
  }
  return COUNTRIES[activeCountryId];
}

export const K = 8.5;
export const R = 68;

// Dynamic world projection centered on the currently active country's [centerLon, centerLat]
export function wp(lo, la, country = getCountry()) {
  return [(lo - country.centerLon) * K, (-la - -country.centerLat) * K];
}

export function unwp(x, z, country = getCountry()) {
  return [x / K + country.centerLon, -(z / K + -country.centerLat)];
}
