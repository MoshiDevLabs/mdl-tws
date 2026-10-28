// Vibrant 3D Topographic & Climate Relief Map (Full Mountain Relief + Fast 60 FPS Caching)
import * as THREE from 'three';
import { K, R, wp, unwp, clamp, rainAnomaly, tempAnomaly } from '../data/climate.js';
import { getCountry } from '../data/countries/index.js';
import { makeNoise, smoothstep } from './noise.js';
import { createSatelliteTexture } from './satellite.js';

const { fbm, ridged } = makeNoise(42);

const toR = (f) => {
  const a = [];
  for (let i = 0; i < f.length; i += 2) a.push(wp(f[i], f[i + 1]));
  return a;
};

export const RINGS = [];
export const LAKES = [];
export const REG_BORDERS = [];
let PEAKS = [];

export function syncCountryTerrainData() {
  const country = getCountry();
  const nextRings = country.geo.c.map(toR);
  RINGS.length = 0;
  nextRings.forEach((r) => RINGS.push(r));

  const nextLakes = country.geo.l.map(toR);
  LAKES.length = 0;
  nextLakes.forEach((l) => LAKES.push(l));

  const nextBorders = (country.geo.r || []).map(toR);
  REG_BORDERS.length = 0;
  nextBorders.forEach((b) => REG_BORDERS.push(b));

  PEAKS = country.peaks.map(([lo, la, a, s]) => [wp(lo, la), a, s]);
}
syncCountryTerrainData();

export const inRing = (a, x, z) => {
  let c = false;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    const p = a[i],
      q = a[j];
    if (p[1] > z !== q[1] > z && x < ((q[0] - p[0]) * (z - p[1])) / (q[1] - p[1]) + p[0]) c = !c;
  }
  return c;
};

export const inLand = (x, z) => RINGS.some((r) => inRing(r, x, z));
export const inLake = (x, z) => LAKES.some((r) => inRing(r, x, z));

export const signedLandDist = (x, z) => (inLand(x, z) ? 1.0 : -1.0);
export const signedLakeDist = (x, z) => (inLake(x, z) ? 1.0 : -1.0);

export function relief(x, z) {
  let h = 0.95; // Lifted continental & island base height well above the y = 0.0 ocean everywhere in Tanzania
  for (let i = 0; i < PEAKS.length; i++) {
    const [c, a, s] = PEAKS[i];
    const d2 = (x - c[0]) ** 2 + (z - c[1]) ** 2;
    if (d2 < s * s * 12) h += a * Math.exp(-d2 / (2 * s * s));
  }
  const n1 = fbm(x * 0.08, z * 0.08, 3);
  const r1 = ridged(x * 0.14, z * 0.14, 3);
  const detail = (n1 * 0.55 + (r1 - 0.35) * 0.85) * (0.45 + Math.min(1.4, (h - 0.67) * 0.38));
  return Math.max(0.95, Math.min(9.5, h + detail));
}

// Snap any exterior grid corner onto the exact RINGS polygon boundary so country & island edges are smooth
function snapToNearestRing(x, z) {
  let bestX = x,
    bestZ = z,
    minD2 = Infinity;
  for (let rIdx = 0; rIdx < RINGS.length; rIdx++) {
    const ring = RINGS[rIdx];
    for (let i = 0, n = ring.length; i < n; i++) {
      const a = ring[i],
        b = ring[(i + 1) % n];
      const dx = b[0] - a[0],
        dz = b[1] - a[1];
      const len2 = dx * dx + dz * dz;
      let t = len2 > 1e-8 ? ((x - a[0]) * dx + (z - a[1]) * dz) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a[0] + t * dx,
        pz = a[1] + t * dz;
      const d2 = (x - px) ** 2 + (z - pz) ** 2;
      if (d2 < minD2) {
        minD2 = d2;
        bestX = px;
        bestZ = pz;
      }
    }
  }
  return [bestX, bestZ];
}

const normalMapCache = {};

export function buildTerrain(scene, waterUniforms, renderer) {
  syncCountryTerrainData();
  const country = getCountry();
  const satTex = createSatelliteTexture(renderer);

  // Bake 512x512 Outer Perimeter Proximity Map (RINGS only, with LAKES explicitly masked out in black so Lake Tanganyika & Lake Victoria never get brown rims!)
  const shoreCanvas = document.createElement('canvas');
  shoreCanvas.width = shoreCanvas.height = 512;
  const sCtx = shoreCanvas.getContext('2d');
  const sScale = 512 / (2 * R);
  sCtx.fillStyle = '#000';
  sCtx.fillRect(0, 0, 512, 512);
  sCtx.save();
  sCtx.strokeStyle = 'rgb(255, 255, 255)';
  sCtx.shadowColor = '#fff';
  sCtx.shadowBlur = 10;
  sCtx.lineWidth = 6;
  sCtx.beginPath();
  RINGS.forEach((r) => {
    r.forEach((p, i) => {
      const X = (p[0] + R) * sScale;
      const Y = (p[1] + R) * sScale;
      i ? sCtx.lineTo(X, Y) : sCtx.moveTo(X, Y);
    });
    sCtx.closePath();
  });
  sCtx.stroke();
  sCtx.restore();

  // Erase any brown beach rim around Lake Tanganyika, Lake Victoria, Lake Nyasa & Rift lakes
  sCtx.save();
  sCtx.fillStyle = '#000';
  sCtx.strokeStyle = '#000';
  sCtx.shadowColor = '#000';
  sCtx.shadowBlur = 12;
  sCtx.lineWidth = 18;
  sCtx.beginPath();
  LAKES.forEach((l) => {
    l.forEach((p, i) => {
      const X = (p[0] + R) * sScale;
      const Y = (p[1] + R) * sScale;
      i ? sCtx.lineTo(X, Y) : sCtx.moveTo(X, Y);
    });
    sCtx.closePath();
  });
  sCtx.stroke();
  sCtx.fill();
  sCtx.restore();
  const shoreData = sCtx.getImageData(0, 0, 512, 512).data;

  // Bake 512x512 High-Precision Inland Lakes Water Mask (Lake Victoria, Tanganyika, Nyasa, Rukwa, Manyara, Eyasi, Natron)
  const lakeCanvas = document.createElement('canvas');
  lakeCanvas.width = lakeCanvas.height = 512;
  const lCtx = lakeCanvas.getContext('2d');
  lCtx.fillStyle = '#000';
  lCtx.fillRect(0, 0, 512, 512);
  lCtx.save();
  lCtx.fillStyle = 'rgb(255, 255, 255)';
  lCtx.strokeStyle = 'rgb(255, 255, 255)';
  lCtx.shadowColor = 'rgb(255, 255, 255)';
  lCtx.shadowBlur = 5;
  lCtx.lineWidth = 8;
  lCtx.beginPath();
  LAKES.forEach((l) => {
    l.forEach((p, i) => {
      const X = (p[0] + R) * sScale;
      const Y = (p[1] + R) * sScale;
      i ? lCtx.lineTo(X, Y) : lCtx.moveTo(X, Y);
    });
    lCtx.closePath();
  });
  lCtx.stroke();
  lCtx.fill();
  lCtx.restore();
  const lakeData = lCtx.getImageData(0, 0, 512, 512).data;
  const lakeMaskTex = new THREE.CanvasTexture(lakeCanvas);
  lakeMaskTex.wrapS = lakeMaskTex.wrapT = THREE.ClampToEdgeWrapping;

  // Fast, crisp grid spacing G = 0.60 (~23,000 vertices)
  const G = 0.6;
  const NXn = Math.round((2 * R) / G);
  const vid = new Map();
  const vx = [],
    vz = [],
    vr = [],
    vbiome = [],
    vbeach = [],
    vlake = [],
    idx = [];

  const gv = (i, j) => {
    const k = i * (NXn + 1) + j;
    let v = vid.get(k);
    if (v === undefined) {
      v = vx.length;
      vid.set(k, v);
      let x = -R + i * G;
      let z = -R + j * G;
      if (!inLand(x, z)) {
        [x, z] = snapToNearestRing(x, z);
      }
      const sx = clamp(Math.floor((x + R) * sScale), 0, 511);
      const sy = clamp(Math.floor((z + R) * sScale), 0, 511);
      const isLk = inLake(x, z) || lakeData[(sy * 512 + sx) * 4] > 80;
      const h = relief(x, z);
      vx.push(x);
      vz.push(z);
      vr.push(h);
      vlake.push(isLk ? 1 : 0);

      const beachVal = isLk ? 0 : shoreData[(sy * 512 + sx) * 4] / 255;
      vbeach.push(beachVal);

      const [lo, la] = unwp(x, z);
      const coastalLush = smoothstep(36.5, 39.5, lo) * 0.45;
      const highlandLush = smoothstep(2.4, 5.1, h) * 0.55;
      const lakeLush = smoothstep(-4.0, 1.5, la) * smoothstep(31, 35, lo) * 0.4;
      const nVar = fbm(x * 0.18 + 9, z * 0.18 - 4, 2) * 0.25;
      vbiome.push(clamp(0.32 + coastalLush + highlandLush + lakeLush + nVar, 0, 1));
    }
    return v;
  };

  for (let i = 0; i < NXn; i++) {
    for (let j = 0; j < NXn; j++) {
      const cx = -R + (i + 0.5) * G;
      const cz = -R + (j + 0.5) * G;
      // Cover 100% of Tanzania including Lake Victoria & all Great Lakes so lakes never punch holes to brown base
      if (!inLand(cx, cz)) continue;
      const a = gv(i, j),
        b = gv(i + 1, j),
        c = gv(i, j + 1),
        d = gv(i + 1, j + 1);
      idx.push(a, c, b, b, c, d);
    }
  }

  const nv = vx.length;
  const pos = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 3);
  const uvs = new Float32Array(nv * 2);
  const anomAttr = new Float32Array(nv * 2);
  const beachAttr = new Float32Array(nv);

  for (let k = 0; k < nv; k++) {
    pos[k * 3] = vx[k];
    pos[k * 3 + 1] = vr[k];
    pos[k * 3 + 2] = vz[k];
    uvs[k * 2] = (vx[k] + R) / (2 * R);
    uvs[k * 2 + 1] = 1.0 - (vz[k] + R) / (2 * R);
    beachAttr[k] = vbeach[k];
  }

  const tgm = new THREE.BufferGeometry();
  tgm.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  tgm.setAttribute('color', new THREE.BufferAttribute(col, 3));
  tgm.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  tgm.setAttribute('aAnom', new THREE.BufferAttribute(anomAttr, 2));
  tgm.setAttribute('aBeach', new THREE.BufferAttribute(beachAttr, 1));
  tgm.setIndex(idx);
  tgm.computeVertexNormals();

  const terrainUniforms = {
    uTime: waterUniforms.uT,
    uMode: { value: 0 },
    uOverlayStrength: { value: 0.78 },
    uLakeTex: { value: lakeMaskTex },
  };

  // High-Precision Sobel Elevation Normal Map for Tanzania's Topography
  function bakeTerrainNormalMap(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const data = img.data;

    // Fast height grid pre-sampling
    const hGrid = new Float32Array(size * size);
    for (let py = 0; py < size; py++) {
      const v = py / size;
      const z = (1.0 - v) * (2 * R) - R;
      for (let px = 0; px < size; px++) {
        const u = px / size;
        const x = u * (2 * R) - R;
        hGrid[py * size + px] = relief(x, z);
      }
    }

    const strength = 1.95;
    for (let py = 1; py < size - 1; py++) {
      for (let px = 1; px < size - 1; px++) {
        const h00 = hGrid[(py - 1) * size + (px - 1)];
        const h10 = hGrid[(py - 1) * size + px];
        const h20 = hGrid[(py - 1) * size + (px + 1)];
        const h01 = hGrid[py * size + (px - 1)];
        const h21 = hGrid[py * size + (px + 1)];
        const h02 = hGrid[(py + 1) * size + (px - 1)];
        const h12 = hGrid[(py + 1) * size + px];
        const h22 = hGrid[(py + 1) * size + (px + 1)];

        const dX = (h20 + 2.0 * h21 + h22) - (h00 + 2.0 * h01 + h02);
        const dY = (h02 + 2.0 * h12 + h22) - (h00 + 2.0 * h10 + h20);

        const nx = -dX * strength;
        const ny = -dY * strength;
        const nz = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        const idx = (py * size + px) * 4;
        data[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  if (!normalMapCache[country.id]) {
    normalMapCache[country.id] = bakeTerrainNormalMap(512);
  }
  const normalMapTex = normalMapCache[country.id];

  const tmat = new THREE.MeshStandardMaterial({
    map: satTex,
    normalMap: normalMapTex,
    normalScale: new THREE.Vector2(0.85, 0.85),
    vertexColors: true,
    roughness: 0.78,
    metalness: 0.05,
  });

  tmat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = terrainUniforms.uTime;
    sh.uniforms.uMode = terrainUniforms.uMode;
    sh.uniforms.uOverlayStrength = terrainUniforms.uOverlayStrength;
    sh.uniforms.uLakeTex = terrainUniforms.uLakeTex;

    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec2 aAnom;
        attribute float aBeach;
        varying float vH;
        varying vec2 vWorldXZ;
        varying vec2 vAnom;
        varying float vSlope;
        varying float vBeach;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vH = position.y;
        vWorldXZ = position.xz;
        vAnom = aAnom;
        vSlope = 1.0 - clamp(abs(normal.y), 0.0, 1.0);
        vBeach = aBeach;`
      );

    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uMode;
        uniform float uOverlayStrength;
        uniform sampler2D uLakeTex;
        varying float vH;
        varying vec2 vWorldXZ;
        varying vec2 vAnom;
        varying float vSlope;
        varying float vBeach;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 lakeUv = vec2((vWorldXZ.x + 68.0) / 136.0, 1.0 - (vWorldXZ.y + 68.0) / 136.0);
        float lakeMask = texture2D(uLakeTex, clamp(lakeUv, 0.0, 1.0)).r;

        // Darker, warm earthy brownish-tan rim around the outer perimeter (never on lakeshores)
        if (vBeach > 0.04 && lakeMask < 0.1) {
          vec3 drySand = vec3(0.45, 0.36, 0.25);
          vec3 wetSand = vec3(0.30, 0.23, 0.16);
          float wetEdge = smoothstep(0.55, 0.95, vBeach);
          vec3 sandCol = mix(drySand, wetSand, wetEdge);
          diffuseColor.rgb = mix(diffuseColor.rgb, sandCol, smoothstep(0.04, 0.65, vBeach) * 0.78);
        }

        // Animated 3D Blue Water for Lake Victoria, Lake Tanganyika, Lake Nyasa & Rift Valley Lakes
        if (lakeMask > 0.04) {
          float lW1 = sin(vWorldXZ.x * 1.15 + vWorldXZ.y * 0.75 + uTime * 1.65);
          float lW2 = cos(vWorldXZ.y * 1.35 - vWorldXZ.x * 0.85 - uTime * 1.35);
          float lW3 = sin((vWorldXZ.x - vWorldXZ.y) * 2.8 + uTime * 2.6);
          float waveMix = clamp((lW1 * 0.45 + lW2 * 0.35 + lW3 * 0.20) * 0.5 + 0.5, 0.0, 1.0);
          vec3 deepLake = vec3(0.03, 0.22, 0.42);
          vec3 midLake = vec3(0.06, 0.38, 0.62);
          vec3 crestLake = vec3(0.15, 0.58, 0.80);
          vec3 lakeCol = mix(deepLake, midLake, waveMix);
          lakeCol = mix(lakeCol, crestLake, smoothstep(0.68, 0.96, waveMix) * 0.55);
          float glint = pow(max(0.0, sin(vWorldXZ.x * 3.6 + uTime * 2.4) * cos(vWorldXZ.y * 3.4 - uTime * 2.1)), 10.0);
          lakeCol += vec3(0.78, 0.94, 1.0) * glint * 0.48;
          diffuseColor.rgb = mix(diffuseColor.rgb, lakeCol, smoothstep(0.04, 0.32, lakeMask));
        }

        // Kilimanjaro & Meru high-altitude glacial snowcap
        float snowLine = smoothstep(6.2, 7.4, vH - vSlope * 1.1);
        vec3 snowCol = vec3(0.96, 0.99, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, snowLine * (1.0 - lakeMask));

        // Subtle topographic elevation contour lines
        float ct = abs(fract(vH * 0.65) - 0.5);
        float contour = smoothstep(0.46, 0.495, ct);
        diffuseColor.rgb += vec3(0.35, 0.78, 0.98) * contour * 0.08 * (1.0 - vBeach) * (1.0 - lakeMask);

        // Thermal shimmer pulse on extreme heat zones
        float heatIntensity = clamp(vAnom.y, 0.0, 1.0);
        if (heatIntensity > 0.48 && lakeMask < 0.2) {
          float pulse = 0.5 + 0.5 * sin(vWorldXZ.x * 0.6 + vWorldXZ.y * 0.6 - uTime * 2.8);
          float rim = smoothstep(0.48, 0.95, heatIntensity) * pulse * 0.12 * uOverlayStrength;
          diffuseColor.rgb += vec3(1.0, 0.28, 0.08) * rim;
        }`
      );
  };

  const terr = new THREE.Mesh(tgm, tmat);
  terr.receiveShadow = true;
  scene.add(terr);

  // Subtle holographic wireframe overlay
  const wf = new THREE.Mesh(
    tgm,
    new THREE.MeshBasicMaterial({
      color: 0x48d6ff,
      wireframe: true,
      transparent: true,
      opacity: 0.025,
      depthWrite: false,
    })
  );
  wf.position.y = 0.03;
  scene.add(wf);

  // Custom 3D Brownish-Earth Perimeter Border Wall & Rim Coping around Mainland Tanzania + Zanzibar + Pemba + Mafia (all of RINGS)
  const wallPos = [];
  const wallCol = [];
  const wallIdx = [];
  const wallMeta = []; // [x, z, h] for each 4-vertex profile so updateSurface keeps the wall locked to lifted terrain

  RINGS.forEach((ring) => {
    // 1. Subdivide ring edges so perimeter samples are spaced every ~0.38 units
    const sub = [];
    for (let i = 0, n = ring.length; i < n; i++) {
      const a = ring[i],
        b = ring[(i + 1) % n];
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (dist < 1e-4) continue;
      const steps = Math.max(1, Math.ceil(dist / 0.38));
      for (let s = 0; s < steps; s++) {
        const f = s / steps;
        sub.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      }
    }
    const M = sub.length;
    if (M < 3) return;

    const baseV = wallPos.length / 3;
    for (let m = 0; m < M; m++) {
      const prev = sub[(m - 1 + M) % M];
      const curr = sub[m];
      const next = sub[(m + 1) % M];
      const tx = next[0] - prev[0],
        tz = next[1] - prev[1];
      const tLen = Math.hypot(tx, tz) || 1;
      let nx = -tz / tLen,
        nz = tx / tLen;
      // Ensure [nx, nz] points strictly OUTWARD away from the landmass/island
      if (inRing(ring, curr[0] + nx * 0.22, curr[1] + nz * 0.22)) {
        nx = -nx;
        nz = -nz;
      }

      const x = curr[0],
        z = curr[1];
      const h = relief(x, z);
      const wx = clamp(Math.floor((x + R) * sScale), 0, 511);
      const wy = clamp(Math.floor((z + R) * sScale), 0, 511);
      const isLakeWall = inLake(x, z) || lakeData[(wy * 512 + wx) * 4] > 40;
      wallMeta.push(x, z, h, isLakeWall ? 1 : 0);

      const nStrata = fbm(x * 0.35 + 3.1, z * 0.35 - 2.7, 2) * 0.08 - 0.04;
      const topY = h * 0.95;
      const midY = topY * 0.38 - 0.22;

      if (isLakeWall) {
        // Along Lake Tanganyika, Lake Victoria & Lake Nyasa borders: keep coping tucked below lake water & colored sapphire-blue (never brown!)
        wallPos.push(x - nx * 0.12, topY - 0.05, z - nz * 0.12);
        wallCol.push(0.05, 0.34, 0.56);

        wallPos.push(x + nx * 0.12, topY - 0.02, z + nz * 0.12);
        wallCol.push(0.05, 0.30, 0.50);
      } else {
        // v0: Inner Rim Coping (overlaps terrain perimeter so zero gap can ever appear)
        wallPos.push(x - nx * 0.24, topY - 0.015, z - nz * 0.24);
        wallCol.push(0.45 + nStrata, 0.35 + nStrata * 0.8, 0.24 + nStrata * 0.6);

        // v1: Outer Rim Crest
        wallPos.push(x + nx * 0.14, topY, z + nz * 0.14);
        wallCol.push(0.42 + nStrata, 0.32 + nStrata * 0.8, 0.22 + nStrata * 0.6);
      }

      // v2: Mid Cliff Sedimentary Stratum
      wallPos.push(x + nx * 0.24, midY, z + nz * 0.24);
      wallCol.push(0.31 + nStrata, 0.23 + nStrata * 0.8, 0.16 + nStrata * 0.6);

      // v3: Submerged Bedrock Base (below sea level)
      wallPos.push(x + nx * 0.34, -1.25, z + nz * 0.34);
      wallCol.push(0.18, 0.14, 0.10);
    }

    for (let m = 0; m < M; m++) {
      const mNext = (m + 1) % M;
      const i0 = baseV + m * 4;
      const j0 = baseV + mNext * 4;
      for (let band = 0; band < 3; band++) {
        const a = i0 + band,
          b = i0 + band + 1,
          c = j0 + band,
          d = j0 + band + 1;
        wallIdx.push(a, b, c, c, b, d);
      }
    }
  });

  const wallGeo = new THREE.BufferGeometry();
  const wallPosArr = new Float32Array(wallPos);
  wallGeo.setAttribute('position', new THREE.BufferAttribute(wallPosArr, 3));
  wallGeo.setAttribute('color', new THREE.Float32BufferAttribute(wallCol, 3));
  wallGeo.setIndex(wallIdx);
  wallGeo.computeVertexNormals();

  const shelfMesh = new THREE.Mesh(
    wallGeo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
      side: THREE.DoubleSide,
    })
  );
  scene.add(shelfMesh);

  // Solid interior earthy base floor for offshore islands (Zanzibar, Pemba, Mafia)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x6e563b,
    roughness: 0.9,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const floorGroup = new THREE.Group();
  RINGS.slice(1).forEach((r) => {
    const sh = new THREE.Shape();
    r.forEach((p, i) => (i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1])));
    const fm = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), floorMat);
    floorGroup.add(fm);
  });
  floorGroup.position.y = 0.85;
  shelfMesh.add(floorGroup);

  // Coastline glow disabled so sandy beaches & coastal edges are never washed out by neon bloom
  const coastGlow = new THREE.Group();
  coastGlow.visible = false;

  // Inland lakes (Lake Victoria, Tanganyika, Nyasa, Rukwa, Manyara, Eyasi, Natron) are rendered directly on the 3D terrain surface via uLakeTex
  const lakeMeshes = [];

  // Fast 32x32 Climate Grid Cache so updateSurface never calls heavy station loops 23,000 times
  const CG = 32;
  const gridRain = new Float32Array(CG * CG);
  const gridTemp = new Float32Array(CG * CG);

  // Never allow negative rainA to pull the terrain downward below sea level!
  const lift = (rainA) => (clamp(rainA, 0, 120) / 120) * 1.05;
  let lastStateKey = '';

  function updateSurface(tm, nino, relScale, dataMode = 'both', scenario = 'elnino', force = false) {
    terrainUniforms.uMode.value = dataMode === 'rain' ? 1 : dataMode === 'temp' ? 2 : 0;

    // Dirty check: zero CPU work when paused & orbiting/zooming!
    const stateKey = `${tm.toFixed(2)}_${nino.toFixed(1)}_${relScale.toFixed(2)}_${dataMode}_${scenario}`;
    if (!force && stateKey === lastStateKey) return;
    lastStateKey = stateKey;

    // 1. Sample climate field onto fast 32x32 grid (1,024 samples instead of 23,000)
    for (let j = 0; j < CG; j++) {
      const z = -R + (j / (CG - 1)) * 2 * R;
      for (let i = 0; i < CG; i++) {
        const x = -R + (i / (CG - 1)) * 2 * R;
        const idxG = j * CG + i;
        gridRain[idxG] = rainAnomaly(x, z, tm, nino, scenario);
        gridTemp[idxG] = tempAnomaly(x, z, tm, nino, scenario);
      }
    }

    // 2. Interpolate onto vertices & preserve full-country photorealistic satellite imagery
    for (let k = 0; k < nv; k++) {
      const x = vx[k],
        z = vz[k],
        h = vr[k],
        isLk = vlake[k] === 1;

      const u = clamp(((x + R) / (2 * R)) * (CG - 1), 0, CG - 1.001);
      const v = clamp(((z + R) / (2 * R)) * (CG - 1), 0, CG - 1.001);
      const gi = u | 0,
        gj = v | 0;
      const fx = u - gi,
        fz = v - gj;
      const gIdx = gj * CG + gi;

      const rainA =
        (gridRain[gIdx] * (1 - fx) + gridRain[gIdx + 1] * fx) * (1 - fz) +
        (gridRain[gIdx + CG] * (1 - fx) + gridRain[gIdx + CG + 1] * fx) * fz;
      const tempA =
        (gridTemp[gIdx] * (1 - fx) + gridTemp[gIdx + 1] * fx) * (1 - fz) +
        (gridTemp[gIdx + CG] * (1 - fx) + gridTemp[gIdx + CG + 1] * fx) * fz;

      const extraLift = isLk
        ? 0.02
        : scenario === 'live'
        ? lift(rainA) * 0.45
        : dataMode === 'temp'
        ? Math.max(0, tempA * 0.28)
        : lift(rainA);
      // Keep the entire country, lakes, and islands lifted high above the ocean
      pos[k * 3 + 1] = Math.max(0.88, h * 0.95 * relScale + extraLift);

      if (isLk) {
        anomAttr[k * 2] = 0;
        anomAttr[k * 2 + 1] = 0;
        col[k * 3] = 1.05;
        col[k * 3 + 1] = 1.08;
        col[k * 3 + 2] = 1.12;
        continue;
      }

      // Base multiplier (1.16 = crisp, bright photorealistic satellite Earth across 100% of Tanzania)
      const br = 1.16;
      const bg = 1.16;
      const bb = 1.16;

      const rNorm = rainA < 0 ? -clamp(-rainA / 60, 0, 1) : clamp(rainA / 110, 0, 1);
      const tNorm = clamp((tempA - 0.6) / 3.4, 0, 1);

      anomAttr[k * 2] = rNorm;
      anomAttr[k * 2 + 1] = tNorm;

      let cr = br,
        cg = bg,
        cb = bb;

      if (scenario === 'live' && dataMode !== 'temp') {
        // In Live Weather mode: 100% pure photorealistic satellite Earth everywhere it is dry,
        // with a translucent cyan glaze only where it is actively raining right now
        if (rNorm > 0.05) {
          const w = clamp(rNorm * 0.48, 0, 0.48);
          cr = br * (1 - w) + 0.68 * w;
          cg = bg * (1 - w) + 1.38 * w;
          cb = bb * (1 - w) + 1.68 * w;
        }
      } else if (dataMode === 'rain') {
        if (rNorm >= 0) {
          const w = clamp(rNorm * 0.52, 0, 0.52);
          cr = br * (1 - w) + 0.62 * w;
          cg = bg * (1 - w) + 1.36 * w;
          cb = bb * (1 - w) + 1.68 * w;
        } else {
          const d = clamp(-rNorm * 0.45, 0, 0.45);
          cr = br * (1 - d) + 1.52 * d;
          cg = bg * (1 - d) + 1.05 * d;
          cb = bb * (1 - d) + 0.68 * d;
        }
      } else if (dataMode === 'temp') {
        const t = Math.pow(tNorm, 0.9);
        const mixF = 0.18 + t * 0.42;
        cr = br * (1 - mixF) + 1.58 * mixF;
        cg = bg * (1 - mixF) + clamp(1.18 - t * 0.52, 0.58, 1.2) * mixF;
        cb = bb * (1 - mixF) + 0.62 * mixF;
      } else {
        // Combined Mode for El Niño / Cyclone: keep satellite land imagery clear underneath translucent weather glaze
        if (rNorm > 0.1) {
          const w = clamp(rNorm * 0.48, 0, 0.48);
          cr = cr * (1 - w) + 0.65 * w;
          cg = cg * (1 - w) + 1.35 * w;
          cb = cb * (1 - w) + 1.65 * w;
        } else if (rNorm < -0.1) {
          const d = clamp(-rNorm * 0.42, 0, 0.42);
          cr = cr * (1 - d) + 1.48 * d;
          cg = cg * (1 - d) + 1.05 * d;
          cb = cb * (1 - d) + 0.68 * d;
        }
      }

      const shade = 0.96 + 0.03 * (h - 0.67);
      col[k * 3] = cr * shade;
      col[k * 3 + 1] = cg * shade;
      col[k * 3 + 2] = cb * shade;
    }

    // 3. Synchronize the 3D Border Wall top rim around Mainland Tanzania, Zanzibar, Pemba & Mafia with the lifted terrain
    const nWallProfiles = wallMeta.length / 4;
    for (let m = 0; m < nWallProfiles; m++) {
      const wx = wallMeta[m * 4],
        wz = wallMeta[m * 4 + 1],
        wh = wallMeta[m * 4 + 2],
        isLkW = wallMeta[m * 4 + 3] === 1;
      const u = clamp(((wx + R) / (2 * R)) * (CG - 1), 0, CG - 1.001);
      const v = clamp(((wz + R) / (2 * R)) * (CG - 1), 0, CG - 1.001);
      const gi = u | 0,
        gj = v | 0;
      const fx = u - gi,
        fz = v - gj;
      const gIdx = gj * CG + gi;
      const rainA =
        (gridRain[gIdx] * (1 - fx) + gridRain[gIdx + 1] * fx) * (1 - fz) +
        (gridRain[gIdx + CG] * (1 - fx) + gridRain[gIdx + CG + 1] * fx) * fz;
      const tempA =
        (gridTemp[gIdx] * (1 - fx) + gridTemp[gIdx + 1] * fx) * (1 - fz) +
        (gridTemp[gIdx + CG] * (1 - fx) + gridTemp[gIdx + CG + 1] * fx) * fz;
      const extraLift = isLkW
        ? 0.02
        : scenario === 'live'
        ? lift(rainA) * 0.45
        : dataMode === 'temp'
        ? Math.max(0, tempA * 0.28)
        : lift(rainA);
      const topY = Math.max(0.88, wh * 0.95 * relScale + extraLift);
      const midY = topY * 0.38 - 0.22;
      const baseIdx = m * 12; // 4 vertices * 3 floats per profile
      wallPosArr[baseIdx + 1] = isLkW ? topY - 0.05 : topY - 0.015; // v0 Inner Rim Coping
      wallPosArr[baseIdx + 4] = isLkW ? topY - 0.02 : topY;         // v1 Outer Rim Crest
      wallPosArr[baseIdx + 7] = midY;                               // v2 Mid Cliff Stratum
    }
    floorGroup.position.y = Math.max(0.82, 0.85 * relScale);
    wallGeo.attributes.position.needsUpdate = true;
    wallGeo.computeVertexNormals();

    tgm.attributes.position.needsUpdate = true;
    tgm.attributes.color.needsUpdate = true;
    tgm.attributes.aAnom.needsUpdate = true;
    tgm.computeVertexNormals();
  }

  function dispose() {
    scene.remove(terr);
    scene.remove(wf);
    scene.remove(shelfMesh);
    tgm.dispose();
    tmat.dispose();
    wallGeo.dispose();
    shelfMesh.material.dispose();
    floorGroup.children.forEach((c) => {
      if (c.geometry) c.geometry.dispose();
    });
    floorMat.dispose();
  }

  return { terr, wf, shelfMesh, coastGlow, lakeMeshes, updateSurface, lift, dispose };
}
