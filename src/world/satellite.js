// Photorealistic Satellite Earth Texture Generator & Real Web-Mercator Tile Mosaic Stitcher
// 1. Synchronously synthesizes a 1024x1024 bright, full-country natural satellite Earth texture
//    covering 100% of Tanzania (Serengeti savanna, Eastern Arc & Southern Highlands forests,
//    Selous/Ruvuma miombo woodlands, Kilimanjaro snowcap, Rift lakes, and coastal beaches).
// 2. Asynchronously fetches & composites real satellite imagery tiles (Esri ArcGIS World Imagery
//    & EOX Sentinel-2 Cloudless), applying gamma shadow-lifting & land-mask clipping so zero dark
//    or black patches ever appear anywhere on the country.

import * as THREE from 'three';
import { makeNoise } from './noise.js';
import { RINGS, LAKES, relief } from './terrain.js';
import { R } from '../data/climate.js';

const { fbm, ridged: rmf } = makeNoise(77);

const LON_MIN = 27.0;
const LON_SPAN = 16.0; // 27.0°E -> 43.0°E
const LAT_MAX = 1.7;
const LAT_SPAN = 16.0; // +1.7°N -> -14.3°S

function latFromTileY(ty, n) {
  const rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n)));
  return (rad * 180) / Math.PI;
}

export function createSatelliteTexture(renderer) {
  const SIZE = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // 1. Build a lake mask on an offscreen canvas
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = SIZE;
  maskCanvas.height = SIZE;
  const mCtx = maskCanvas.getContext('2d');
  const sc = SIZE / (2 * R);

  mCtx.fillStyle = '#000';
  mCtx.fillRect(0, 0, SIZE, SIZE);

  // Outer perimeter earthy brownish-tan rim in Green channel (RINGS only — never paint brown around inland lakes!)
  mCtx.save();
  mCtx.strokeStyle = 'rgb(0, 255, 0)';
  mCtx.shadowColor = 'rgb(0, 255, 0)';
  mCtx.shadowBlur = 10;
  mCtx.lineWidth = 8;
  mCtx.beginPath();
  RINGS.forEach((r) => {
    r.forEach((p, i) => {
      const X = (p[0] + R) * sc;
      const Y = (p[1] + R) * sc;
      i ? mCtx.lineTo(X, Y) : mCtx.moveTo(X, Y);
    });
    mCtx.closePath();
  });
  mCtx.stroke();
  mCtx.restore();

  // Great Lakes in Blue channel (also overwrites Green channel = 0 around all lakes so Lake Victoria & Lake Tanganyika NEVER get brown beach rims!)
  mCtx.save();
  mCtx.fillStyle = 'rgb(0, 0, 255)';
  mCtx.strokeStyle = 'rgb(0, 0, 255)';
  mCtx.shadowColor = 'rgb(0, 0, 255)';
  mCtx.shadowBlur = 12;
  mCtx.lineWidth = 14;
  mCtx.beginPath();
  LAKES.forEach((l) => {
    l.forEach((p, i) => {
      const X = (p[0] + R) * sc;
      const Y = (p[1] + R) * sc;
      i ? mCtx.lineTo(X, Y) : mCtx.moveTo(X, Y);
    });
    mCtx.closePath();
  });
  mCtx.stroke();
  mCtx.fill();
  mCtx.restore();

  const maskData = mCtx.getImageData(0, 0, SIZE, SIZE).data;
  const imgData = ctx.createImageData(SIZE, SIZE);
  const dst = imgData.data;

  // 2. Synthesize bright, full-coverage satellite Earth base across 100% of Tanzania
  for (let py = 0; py < SIZE; py++) {
    const z = (py / SIZE) * 2 * R - R;
    const lat = LAT_MAX - (py / SIZE) * LAT_SPAN;
    for (let px = 0; px < SIZE; px++) {
      const idx = (py * SIZE + px) * 4;
      const isLake = maskData[idx + 2] > 100;
      const x = (px / SIZE) * 2 * R - R;
      const lon = LON_MIN + (px / SIZE) * LON_SPAN;

      if (isLake) {
        const n = fbm(x * 0.25, z * 0.25, 3);
        dst[idx] = Math.round(18 + n * 20);
        dst[idx + 1] = Math.round(74 + n * 32);
        dst[idx + 2] = Math.round(124 + n * 38);
        dst[idx + 3] = 255;
        continue;
      }

      const hRaw = relief(x, z);
      const h = Math.max(0.28, hRaw - 0.67);
      const hx = relief(x + 0.35, z) - hRaw;
      const hz = relief(x, z + 0.35) - hRaw;
      // Bright satellite illumination (never drops below 0.82 so no slope is ever dark!)
      const slopeShade = Math.max(0.82, Math.min(1.24, 1.02 - hx * 0.52 - hz * 0.38));

      const n1 = fbm(x * 0.22 + 5.1, z * 0.22 - 3.4, 4);
      const n2 = fbm(x * 0.85 - 11.2, z * 0.85 + 7.8, 3);
      const ridge = rmf(x * 0.45, z * 0.45, 3);

      // Ecological zones across all of Tanzania:
      // - Coastal & Selous/Ruvuma (East & South-East): lush tropical & miombo green
      // - Lake Victoria & Western Tanganyika/Katavi: emerald woodland
      // - Southern Highlands (Mbeya, Iringa, Songea): rich montane forest & grassland
      // - Central Dodoma/Singida & Serengeti: warm golden-olive savanna
      const coastalLush = Math.max(0, Math.min(1, (lon - 36.2) / 3.4));
      const vicLush = Math.exp(-((lon - 32.2) ** 2 + (lat + 2.2) ** 2) / 7.5);
      const westLush = Math.exp(-((lon - 30.8) ** 2 + (lat + 5.8) ** 2) / 9.0);
      const southLush = Math.exp(-((lon - 35.5) ** 2 + (lat + 9.5) ** 2) / 14.0);
      const aridCore = Math.exp(-((lon - 35.0) ** 2 + (lat + 5.4) ** 2) / 6.5);
      const vegIndex = Math.max(
        0.15,
        Math.min(
          0.95,
          0.44 +
            coastalLush * 0.38 +
            vicLush * 0.35 +
            westLush * 0.32 +
            southLush * 0.38 -
            aridCore * 0.36 +
            (n1 - 0.5) * 0.32
        )
      );

      let r, g, b;
      if (h < 0.32) {
        // Darker earthy brownish-tan coastal rim & lowland palms
        const f = Math.max(0, (h - 0.22) / 0.1);
        const sandR = 118 + n2 * 16,
          sandG = 95 + n2 * 14,
          sandB = 66 + n2 * 12;
        const lowR = 72 + (1 - vegIndex) * 75,
          lowG = 128 + vegIndex * 22,
          lowB = 68;
        r = sandR * (1 - f) + lowR * f;
        g = sandG * (1 - f) + lowG * f;
        b = sandB * (1 - f) + lowB * f;
      } else if (h < 1.45) {
        // Lowland plains, Selous/Ruvuma miombo woodlands & coastal hinterland
        const f = (h - 0.32) / 1.13;
        const forestR = 58 + f * 18,
          forestG = 124 + f * 16,
          forestB = 64 + f * 10;
        const savR = 166 + f * 12,
          savG = 146 + f * 10,
          savB = 92 + f * 8;
        r = savR * (1 - vegIndex) + forestR * vegIndex;
        g = savG * (1 - vegIndex) + forestG * vegIndex;
        b = savB * (1 - vegIndex) + forestB * vegIndex;
      } else if (h < 2.55) {
        // Central & Western plateau, Serengeti savanna & Southern Uplands
        const f = (h - 1.45) / 1.1;
        const lushR = 64,
          lushG = 132,
          lushB = 68;
        const dryR = 178 - f * 14,
          dryG = 152 - f * 10,
          dryB = 98 - f * 8;
        r = dryR * (1 - vegIndex * 0.85) + lushR * (vegIndex * 0.85);
        g = dryG * (1 - vegIndex * 0.85) + lushG * (vegIndex * 0.85);
        b = dryB * (1 - vegIndex * 0.85) + lushB * (vegIndex * 0.85);
      } else if (h < 3.85) {
        // Montane forest & highland ridges (Kilimanjaro, Meru, Ngorongoro, Mbeya, Songea)
        const f = (h - 2.55) / 1.3;
        r = 68 + f * 64 + ridge * 22;
        g = 118 - f * 4 + ridge * 18;
        b = 68 + f * 30 + ridge * 14;
      } else {
        // High alpine scree & Mount Kilimanjaro Kibo glacial snowcap
        const snow = Math.max(0, Math.min(1, (h - 3.85) / 0.85));
        r = 132 * (1 - snow) + 248 * snow;
        g = 124 * (1 - snow) + 252 * snow;
        b = 118 * (1 - snow) + 255 * snow;
      }

      // Darker, warm earthy brownish-tan rim along the perimeter & islands (never bright glare)
      const beachFactor = Math.min(1, (maskData[idx + 1] / 255) * 0.85);
      if (beachFactor > 0.02) {
        r = r * (1 - beachFactor) + 115 * beachFactor;
        g = g * (1 - beachFactor) + 92 * beachFactor;
        b = b * (1 - beachFactor) + 64 * beachFactor;
      }

      const grain = 0.92 + n2 * 0.18;
      dst[idx] = Math.max(42, Math.min(255, Math.round(r * grain * slopeShade)));
      dst[idx + 1] = Math.max(58, Math.min(255, Math.round(g * grain * slopeShade)));
      dst[idx + 2] = Math.max(44, Math.min(255, Math.round(b * grain * slopeShade)));
      dst[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const satTex = new THREE.CanvasTexture(canvas);
  satTex.colorSpace = THREE.SRGBColorSpace;
  satTex.wrapS = satTex.wrapT = THREE.ClampToEdgeWrapping;
  if (renderer && renderer.capabilities) {
    satTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  // 3. Asynchronously fetch & composite real Web-Mercator satellite tiles (Esri ArcGIS World Imagery)
  // Gamma-correct & shadow-lift every satellite pixel so dark forests or ocean edges NEVER create dark patches!
  const Z = 6;
  const N = 1 << Z;
  const txMin = 36,
    txMax = 39;
  const tyMin = 31,
    tyMax = 34;

  const tileLayer = document.createElement('canvas');
  tileLayer.width = SIZE;
  tileLayer.height = SIZE;
  const tCtx = tileLayer.getContext('2d');

  let loadedCount = 0;
  const totalTiles = (txMax - txMin + 1) * (tyMax - tyMin + 1);

  const blendTilesOntoBase = () => {
    const tileImg = tCtx.getImageData(0, 0, SIZE, SIZE).data;
    const outImg = ctx.createImageData(SIZE, SIZE);
    const out = outImg.data;

    for (let i = 0; i < dst.length; i += 4) {
      const ta = tileImg[i + 3];
      if (ta < 128 || maskData[i + 2] > 100) {
        out[i] = dst[i];
        out[i + 1] = dst[i + 1];
        out[i + 2] = dst[i + 2];
        out[i + 3] = 255;
        continue;
      }

      // Gamma shadow-lift on real satellite tile RGB so dark vegetation/shadows become bright & detailed
      const tr = Math.pow(tileImg[i] / 255, 0.68) * 235 + 28;
      const tg = Math.pow(tileImg[i + 1] / 255, 0.66) * 240 + 32;
      const tb = Math.pow(tileImg[i + 2] / 255, 0.72) * 225 + 24;

      // Preserve the golden sandy beach band around the perimeter so dark tile water never overwrites beaches
      const beachW = Math.min(1, (maskData[i + 1] / 255) * 1.15);
      const tileW = 0.65 * (1 - beachW);
      const baseW = 1 - tileW;

      out[i] = Math.min(255, Math.round(tr * tileW + dst[i] * baseW));
      out[i + 1] = Math.min(255, Math.round(tg * tileW + dst[i + 1] * baseW));
      out[i + 2] = Math.min(255, Math.round(tb * tileW + dst[i + 2] * baseW));
      out[i + 3] = 255;
    }
    ctx.putImageData(outImg, 0, 0);
    satTex.needsUpdate = true;
  };

  for (let ty = tyMin; ty <= tyMax; ty++) {
    const latTop = latFromTileY(ty, N);
    const latBot = latFromTileY(ty + 1, N);
    const destY0 = ((LAT_MAX - latTop) / LAT_SPAN) * SIZE;
    const destY1 = ((LAT_MAX - latBot) / LAT_SPAN) * SIZE;

    for (let tx = txMin; tx <= txMax; tx++) {
      const lonLeft = (tx / N) * 360 - 180;
      const lonRight = ((tx + 1) / N) * 360 - 180;
      const destX0 = ((lonLeft - LON_MIN) / LON_SPAN) * SIZE;
      const destX1 = ((lonRight - LON_MIN) / LON_SPAN) * SIZE;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      const primaryUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${ty}/${tx}`;
      const fallbackUrl = `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/${Z}/${ty}/${tx}.jpg`;

      img.onload = () => {
        tCtx.drawImage(img, destX0, destY0, destX1 - destX0 + 0.6, destY1 - destY0 + 0.6);
        loadedCount++;
        if (loadedCount % 4 === 0 || loadedCount === totalTiles) {
          blendTilesOntoBase();
        }
      };

      img.onerror = () => {
        if (img.src !== fallbackUrl) {
          img.src = fallbackUrl;
        }
      };

      img.src = primaryUrl;
    }
  }

  return satTex;
}
