// Zoom-In 3D Micro-World: Instanced 3D City Skylines, ~7,500 Instanced 3D Forest & Acacia Trees, and Transport Corridors
import * as THREE from 'three';
import { REGIONS, TOWNS, R, wp, clamp, rainAnomaly } from '../data/climate.js';
import { relief, signedLandDist, signedLakeDist } from './terrain.js';
import { mulberry, makeNoise, smoothstep } from './noise.js';

export function buildWorldDetails(scene, waterUniforms) {
  const rnd = mulberry(2026);
  const { fbm } = makeNoise(77);
  const detailsGroup = new THREE.Group();
  scene.add(detailsGroup);

  // ============================================================================
  // 1. 3D INSTANCED CITY SKYLINES & SETTLEMENTS (~1,600 3D buildings in 1 draw call)
  // ============================================================================
  const cityHubs = [
    // Major regional cities [lon, lat, buildingCount, maxHeight, radius]
    [39.28, -6.82, 240, 2.6, 2.2],  // Dar es Salaam (high-rise CBD + port + sprawl)
    [39.20, -6.16, 110, 1.35, 1.2], // Zanzibar City / Stone Town
    [36.68, -3.37, 130, 1.55, 1.5], // Arusha
    [32.90, -2.52, 135, 1.6, 1.5],  // Mwanza
    [35.74, -6.17, 125, 1.45, 1.6], // Dodoma (Capital)
    [39.10, -5.07, 95, 1.25, 1.2],  // Tanga
    [33.46, -8.90, 105, 1.3, 1.4],  // Mbeya
    [37.66, -6.82, 95, 1.2, 1.3],   // Morogoro
    [37.34, -3.35, 90, 1.2, 1.2],   // Moshi
    [29.63, -4.88, 75, 1.1, 1.1],   // Kigoma
    [40.18, -10.27, 75, 1.1, 1.1],  // Mtwara
    ...TOWNS.filter((t) => t[0] !== 'Arusha' && t[0] !== 'Zanzibar City').map(([_, lo, la, sc]) => [
      lo,
      la,
      Math.round(32 * (sc || 1)),
      0.85 * (sc || 1),
      0.85,
    ]),
  ];

  const bldgData = [];
  cityHubs.forEach(([lo, la, count, maxH, rad]) => {
    const [cx, cz] = wp(lo, la);
    for (let i = 0; i < count; i++) {
      // Cluster denser near city center
      const u = rnd();
      const r = Math.pow(u, 1.45) * rad;
      const ang = rnd() * Math.PI * 2;
      const x = cx + Math.cos(ang) * r;
      const z = cz + Math.sin(ang) * r;

      if (signedLandDist(x, z) < 0.06 || signedLakeDist(x, z) > -0.08) continue;

      const centerFactor = 1.0 - r / (rad + 0.01);
      const tier = centerFactor > 0.65 ? 2 : centerFactor > 0.32 ? 1 : 0;
      const bh = (0.16 + Math.pow(centerFactor, 2.0) * maxH * (0.48 + 0.52 * rnd())) * 0.76;
      const bw = (tier === 2 ? 0.11 : 0.08) + rnd() * 0.1 + centerFactor * 0.04;
      const bd = (tier === 2 ? 0.11 : 0.08) + rnd() * 0.1 + centerFactor * 0.04;
      const rot = (Math.floor(rnd() * 4) * Math.PI) / 2 + (rnd() - 0.5) * 0.18;
      // Keep coastal cities (Dar, Tanga, Zanzibar, Mtwara) near coastal plain elevation
      const rawH = relief(x, z);
      const isCoastalHub = lo > 38.8 && la < -4.5;
      const baseH = isCoastalHub ? Math.min(rawH, 0.55 + rawH * 0.28) : rawH;
      bldgData.push({ x, z, baseH, bw, bh, bd, rot, tier, tone: 0.75 + rnd() * 0.25 });
    }
  });

  const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
  bldgGeo.translate(0, 0.5, 0); // Pivot at ground base

  const bldgMat = new THREE.MeshStandardMaterial({
    color: 0xdce8f2,
    roughness: 0.42,
    metalness: 0.35,
  });

  bldgMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = waterUniforms.uT;
    sh.uniforms.uNight = waterUniforms.uNight || { value: 0.0 };
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vLocalPos;
        varying vec3 vBldgNorm;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vLocalPos = position;
        vBldgNorm = normal;`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uNight;
        varying vec3 vLocalPos;
        varying vec3 vBldgNorm;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Architectural stories & illuminated facade windows on vertical walls
        if (abs(vBldgNorm.y) < 0.5) {
          float wx = step(0.32, fract(vLocalPos.x * 5.0 + vLocalPos.z * 5.0));
          float wy = step(0.38, fract(vLocalPos.y * 9.0));
          float win = wx * wy;
          vec3 wallCol = diffuseColor.rgb * (0.65 + 0.35 * vLocalPos.y);
          vec3 dayWin = vec3(1.0, 0.86, 0.58);
          vec3 nightWin = vec3(1.6, 1.25, 0.75);
          vec3 winCol = mix(dayWin, nightWin, uNight);
          diffuseColor.rgb = mix(wallCol, winCol, win * mix(0.55, 0.95, uNight));
        } else {
          // Rooftop concrete
          diffuseColor.rgb *= 0.82;
        }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // High-realism nocturnal window emission for Tanzanian cities
        if (abs(vBldgNorm.y) < 0.5 && uNight > 0.05) {
          float wx = step(0.32, fract(vLocalPos.x * 5.0 + vLocalPos.z * 5.0));
          float wy = step(0.38, fract(vLocalPos.y * 9.0));
          totalEmissiveRadiance += vec3(1.5, 1.05, 0.52) * (wx * wy) * (uNight * 2.2);
        }`
      );
  };

  const bldgMesh = new THREE.InstancedMesh(bldgGeo, bldgMat, bldgData.length);
  bldgMesh.castShadow = true;
  bldgMesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const cTmp = new THREE.Color();

  bldgData.forEach((b, i) => {
    if (b.tier === 2) {
      // Modern glass & anodized slate CBD high-rise
      cTmp.setRGB(0.68 * b.tone, 0.84 * b.tone, 0.95 * b.tone);
    } else if (b.tier === 1) {
      // Warm coral-stone / plaster commercial mid-rise
      cTmp.setRGB(0.92 * b.tone, 0.86 * b.tone, 0.76 * b.tone);
    } else {
      // Laterite terracotta & coastal peri-urban blocks
      cTmp.setRGB(0.88 * b.tone, 0.74 * b.tone, 0.64 * b.tone);
    }
    bldgMesh.setColorAt(i, cTmp);
  });
  if (bldgMesh.instanceColor) bldgMesh.instanceColor.needsUpdate = true;
  detailsGroup.add(bldgMesh);

  // Precompute urban hub centers in world space so trees don't spawn inside city cores or dwarf skyscrapers
  const hubXZ = cityHubs.map(([lo, la, , , rad]) => {
    const [hx, hz] = wp(lo, la);
    return { x: hx, z: hz, rad: rad || 1.1 };
  });

  // ============================================================================
  // 2. 3D INSTANCED FORESTS & SAVANNA TREES (~7,200 3D trees in 2 draw calls)
  // ============================================================================
  const montaneTrees = [];
  const savannaTrees = [];

  for (let attempt = 0; attempt < 26000; attempt++) {
    const x = (rnd() - 0.5) * 2 * (R - 4);
    const z = (rnd() - 0.5) * 2 * (R - 4);
    const lDist = signedLandDist(x, z);
    const lkDist = signedLakeDist(x, z);
    if (lDist < 0.35 || lkDist > -0.35) continue;

    const h = relief(x, z);
    if (h > 4.9) continue; // Above alpine tree line on Kilimanjaro

    const [lo, la] = [x / 8.5 + 35, -(z / 8.5 + 6.3)];
    const patch = fbm(x * 0.35, z * 0.35, 3);

    // Montane rainforests, Usambara/Uluguru/Southern Highlands, Miombo & Coastal Palms
    const isForestZone =
      (h > 1.55 && h < 4.6 && patch > -0.05) ||
      (lo > 37.8 && patch > 0.02) ||
      (la > -3.5 && lo < 33.5 && patch > 0.0);

    // Exclude dense city cores and scale down trees near urban perimeters
    let minUrbanFactor = 1.0;
    for (let hi = 0; hi < hubXZ.length; hi++) {
      const hb = hubXZ[hi];
      const d = Math.hypot(x - hb.x, z - hb.z);
      if (d < hb.rad * 0.68) {
        minUrbanFactor = 0;
        break;
      }
      if (d < hb.rad * 1.6) {
        minUrbanFactor = Math.min(minUrbanFactor, 0.48 + 0.52 * ((d - hb.rad * 0.68) / (hb.rad * 0.92)));
      }
    }
    if (minUrbanFactor <= 0.01) continue;

    if (isForestZone && montaneTrees.length < 4500) {
      const sc = (0.18 + rnd() * 0.21) * minUrbanFactor;
      montaneTrees.push({
        x,
        z,
        baseH: h,
        sc,
        rot: rnd() * Math.PI * 2,
        shade: 0.78 + rnd() * 0.35,
      });
    } else if (patch > 0.06 && savannaTrees.length < 2700) {
      // Acacia & Baobab savanna woodland across Serengeti, Ruaha, Tarangire & Central Plateau
      const sc = (0.16 + rnd() * 0.19) * minUrbanFactor;
      savannaTrees.push({
        x,
        z,
        baseH: h,
        sc,
        rot: rnd() * Math.PI * 2,
        shade: 0.78 + rnd() * 0.35,
      });
    }
  }

  // Montane / Miombo layered canopy cone geometry
  const montaneGeo = new THREE.ConeGeometry(0.55, 1.45, 6);
  montaneGeo.translate(0, 0.72, 0);
  const montaneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0.02,
  });

  // Flat-topped East African Acacia umbrella canopy geometry
  const acaciaGeo = new THREE.ConeGeometry(0.78, 0.55, 7);
  acaciaGeo.scale(1, 0.65, 1);
  acaciaGeo.translate(0, 0.68, 0);
  const acaciaMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.02,
  });

  // Gentle wind sway in vertex shader
  [montaneMat, acaciaMat].forEach((mat) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = waterUniforms.uT;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float sway = sin(uTime * 2.2 + instanceMatrix[3][0] * 0.8 + instanceMatrix[3][2] * 0.8) * 0.08 * position.y;
          transformed.x += sway;`
        );
    };
  });

  const montaneMesh = new THREE.InstancedMesh(montaneGeo, montaneMat, montaneTrees.length);
  const savannaMesh = new THREE.InstancedMesh(acaciaGeo, acaciaMat, savannaTrees.length);
  montaneMesh.castShadow = true;
  montaneMesh.receiveShadow = true;
  savannaMesh.castShadow = true;
  savannaMesh.receiveShadow = true;

  montaneTrees.forEach((t, i) => {
    cTmp.setRGB(0.11 * t.shade, 0.36 * t.shade, 0.16 * t.shade);
    montaneMesh.setColorAt(i, cTmp);
  });
  savannaTrees.forEach((t, i) => {
    cTmp.setRGB(0.26 * t.shade, 0.38 * t.shade, 0.15 * t.shade);
    savannaMesh.setColorAt(i, cTmp);
  });
  if (montaneMesh.instanceColor) montaneMesh.instanceColor.needsUpdate = true;
  if (savannaMesh.instanceColor) savannaMesh.instanceColor.needsUpdate = true;

  detailsGroup.add(montaneMesh, savannaMesh);

  // ============================================================================
  // 3. MAJOR TANZANIAN TRANSPORT & RAIL CORRIDORS
  // ============================================================================
  const CORRIDORS = [
    // Central Corridor: Dar -> Morogoro -> Dodoma -> Singida -> Tabora -> Kigoma
    [
      [39.28, -6.82],
      [38.6, -6.72],
      [37.66, -6.82],
      [36.6, -6.45],
      [35.74, -6.17],
      [34.76, -4.82],
      [33.8, -4.9],
      [32.8, -5.02],
      [31.3, -5.05],
      [29.63, -4.88],
    ],
    // Northern Highway: Chalinze -> Korogwe -> Same -> Moshi -> Arusha
    [
      [38.6, -6.72],
      [38.45, -5.15],
      [37.75, -4.07],
      [37.34, -3.35],
      [36.68, -3.37],
    ],
    // TANZAM Southern Highlands Highway: Morogoro -> Iringa -> Njombe -> Mbeya
    [
      [37.66, -6.82],
      [36.7, -7.4],
      [35.69, -7.77],
      [34.77, -9.34],
      [33.46, -8.9],
    ],
    // Lake Victoria Corridor: Singida -> Shinyanga -> Mwanza
    [
      [34.76, -4.82],
      [33.42, -3.66],
      [32.9, -2.52],
    ],
    // Southern Coastal Corridor: Dar -> Kibiti -> Kilwa -> Lindi -> Mtwara
    [
      [39.28, -6.82],
      [39.15, -7.85],
      [39.51, -8.91],
      [39.71, -9.99],
      [40.18, -10.27],
    ],
  ];

  const roadLines = [];
  const roadMat = new THREE.LineBasicMaterial({
    color: 0xe8b86d,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });

  CORRIDORS.forEach((path) => {
    const pts3 = path.map(([lo, la]) => {
      const [x, z] = wp(lo, la);
      return new THREE.Vector3(x, 0, z);
    });
    const curve = new THREE.CatmullRomCurve3(pts3);
    const sampled = curve.getPoints(56);
    const pos = new Float32Array(sampled.length * 3);
    const baseXZ = sampled.map((p) => ({ x: p.x, z: p.z, h: relief(p.x, p.z) }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(geo, roadMat);
    detailsGroup.add(line);
    roadLines.push({ geo, pos, baseXZ });
  });

  let lastKey = '';

  function updateDetails(tm, nino, relScale, liftFn, dataMode, scenario, force = false) {
    // Re-position instanced buildings, trees & roads smoothly with terrain relief & anomaly lift
    const key = `${tm.toFixed(1)}_${nino.toFixed(1)}_${relScale.toFixed(2)}_${dataMode}_${scenario}`;
    if (!force && key === lastKey) return;
    lastKey = key;

    const getSurfY = (x, z, baseH) => {
      const yLift =
        dataMode === 'temp'
          ? 0.15
          : liftFn(rainAnomaly(x, z, tm, nino, scenario));
      return baseH * 0.95 * relScale + yLift;
    };

    for (let i = 0; i < bldgData.length; i++) {
      const b = bldgData[i];
      const y = getSurfY(b.x, b.z, b.baseH);
      dummy.position.set(b.x, y - 0.04, b.z);
      dummy.rotation.set(0, b.rot, 0);
      dummy.scale.set(b.bw, b.bh, b.bd);
      dummy.updateMatrix();
      bldgMesh.setMatrixAt(i, dummy.matrix);
    }
    bldgMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < montaneTrees.length; i++) {
      const t = montaneTrees[i];
      const y = getSurfY(t.x, t.z, t.baseH);
      dummy.position.set(t.x, y - 0.02, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.setScalar(t.sc);
      dummy.updateMatrix();
      montaneMesh.setMatrixAt(i, dummy.matrix);
    }
    montaneMesh.instanceMatrix.needsUpdate = true;

    // Tint savanna trees greener in wet scenarios and drier amber-olive in La Niña drought
    const isDrought = scenario === 'lanina';
    for (let i = 0; i < savannaTrees.length; i++) {
      const t = savannaTrees[i];
      const y = getSurfY(t.x, t.z, t.baseH);
      dummy.position.set(t.x, y - 0.02, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.setScalar(t.sc);
      dummy.updateMatrix();
      savannaMesh.setMatrixAt(i, dummy.matrix);
      if (isDrought) {
        cTmp.setRGB(0.42 * t.shade, 0.34 * t.shade, 0.14 * t.shade);
      } else {
        cTmp.setRGB(0.24 * t.shade, 0.39 * t.shade, 0.15 * t.shade);
      }
      savannaMesh.setColorAt(i, cTmp);
    }
    savannaMesh.instanceMatrix.needsUpdate = true;
    if (savannaMesh.instanceColor) savannaMesh.instanceColor.needsUpdate = true;

    roadLines.forEach((rl) => {
      for (let i = 0; i < rl.baseXZ.length; i++) {
        const b = rl.baseXZ[i];
        rl.pos[i * 3] = b.x;
        rl.pos[i * 3 + 1] = getSurfY(b.x, b.z, b.h) + 0.12;
        rl.pos[i * 3 + 2] = b.z;
      }
      rl.geo.attributes.position.needsUpdate = true;
    });
  }

  return { detailsGroup, updateDetails };
}
