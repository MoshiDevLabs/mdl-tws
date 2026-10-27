// Major Tanzanian River Basins (Rufiji, Great Ruaha, Kilombero, Pangani, Wami, Ruvu, Ruvuma, Malagarasi, Kagera, Mara)
// Rendered as terrain-draped 3D ribbon meshes that swell during El Niño/Cyclone floods and narrow in La Niña drought.
// Includes clickable raycast hit-proxies, dynamic bioluminescent hover glow, and basin hydrology telemetry.
import * as THREE from 'three';
import { wp, clamp, rainAnomaly } from '../data/climate.js';
import { relief, inLand, inLake } from './terrain.js';

// Geographically accurate coordinate polylines [lon, lat] with basin hydrology intelligence
export const RIVER_PATHS = [
  // 1. Rufiji + Kilombero
  {
    id: 0,
    name: 'Rufiji & Kilombero River Basin',
    basinName: 'Rufiji Basin',
    catchmentKm2: '177,429 km²',
    lengthKm: '600 km',
    outlet: 'Indian Ocean at Mafia Channel / Rufiji Delta',
    hydro: 'Julius Nyerere Hydropower Project (2,115 MW / JNHPP), Stiegler’s Gorge',
    significance: 'Tanzania’s largest river basin, draining 20% of the entire country. High flood risk during El Niño.',
    width: 0.42,
    pts: [
      [35.2, -9.2],
      [35.85, -8.85],
      [36.45, -8.35],
      [36.95, -7.95],
      [37.55, -7.85],
      [38.25, -7.9],
      [38.85, -7.92],
      [39.32, -7.95],
    ],
  },
  // 2. Great Ruaha
  {
    id: 1,
    name: 'Great Ruaha River',
    basinName: 'Rufiji Sub-Basin',
    catchmentKm2: '83,970 km²',
    lengthKm: '475 km',
    outlet: 'Confluence with Rufiji River in Selous',
    hydro: 'Mtera Reservoir Dam (80 MW) & Kidatu Hydroelectric Plant (204 MW)',
    significance: 'Southern Highlands & Usangu wetlands lifeline; vital for Ruaha National Park wildlife & national power grid.',
    width: 0.32,
    pts: [
      [33.85, -8.85],
      [34.45, -8.4],
      [34.95, -7.85],
      [35.65, -7.45],
      [36.45, -7.5],
      [37.15, -7.65],
      [37.55, -7.85],
    ],
  },
  // 3. Pangani River
  {
    id: 2,
    name: 'Pangani River Basin',
    basinName: 'Pangani Basin',
    catchmentKm2: '43,650 km²',
    lengthKm: '500 km',
    outlet: 'Indian Ocean at Pangani / Tanga Bay',
    hydro: 'Nyumba ya Mungu Reservoir (8 MW), Hale (21 MW), New Pangani Falls (68 MW)',
    significance: 'Fed by glacial meltwaters from Mt. Kilimanjaro (5,895m) and Mt. Meru. Intensive agricultural irrigation.',
    width: 0.3,
    pts: [
      [37.15, -3.38],
      [37.45, -3.75],
      [37.65, -4.35],
      [38.05, -4.85],
      [38.55, -5.18],
      [38.98, -5.42],
    ],
  },
  // 4. Wami River
  {
    id: 3,
    name: 'Wami River',
    basinName: 'Wami-Ruvu Basin',
    catchmentKm2: '43,946 km²',
    lengthKm: '450 km',
    outlet: 'Indian Ocean at Saadani National Park',
    hydro: 'Proposed Kinyasungwe flood control reservoirs',
    significance: 'Connects semi-arid Dodoma / Kaguru mountains to the Indian Ocean through Saadani coastal mangroves.',
    width: 0.25,
    pts: [
      [36.4, -6.15],
      [37.1, -6.28],
      [37.85, -6.25],
      [38.45, -6.18],
      [38.85, -6.12],
    ],
  },
  // 5. Ruvu River
  {
    id: 4,
    name: 'Ruvu River (Dar Water Lifeline)',
    basinName: 'Wami-Ruvu Basin',
    catchmentKm2: '17,700 km²',
    lengthKm: '316 km',
    outlet: 'Indian Ocean at Bagamoyo',
    hydro: 'Upper Ruvu & Lower Ruvu Water Treatment Plants',
    significance: 'The critical freshwater source supplying 6+ million residents and commercial industries of Dar es Salaam.',
    width: 0.25,
    pts: [
      [37.65, -7.05],
      [38.05, -6.88],
      [38.55, -6.68],
      [38.92, -6.42],
    ],
  },
  // 6. Ruvuma River
  {
    id: 5,
    name: 'Ruvuma Border River',
    basinName: 'Ruvuma Basin',
    catchmentKm2: '155,540 km²',
    lengthKm: '800 km',
    outlet: 'Indian Ocean south of Mtwara',
    hydro: 'Transboundary conservation corridor',
    significance: 'Defines the southern international border between Tanzania and Mozambique.',
    width: 0.36,
    pts: [
      [35.45, -11.35],
      [36.45, -11.45],
      [37.45, -11.35],
      [38.45, -11.22],
      [39.35, -10.95],
      [40.15, -10.55],
      [40.42, -10.42],
    ],
  },
  // 7. Malagarasi River
  {
    id: 6,
    name: 'Malagarasi River (Tanganyika Inflow)',
    basinName: 'Lake Tanganyika Basin',
    catchmentKm2: '130,000 km²',
    lengthKm: '475 km',
    outlet: 'Lake Tanganyika (25 km south of Kigoma)',
    hydro: 'Malagarasi Hydropower Project (49.5 MW)',
    significance: 'Second largest river basin in Tanzania; feeds the Muyovozi-Malagarasi Ramsar Wetland.',
    width: 0.32,
    pts: [
      [31.25, -3.85],
      [31.15, -4.55],
      [31.35, -5.08],
      [30.65, -5.18],
      [30.05, -5.18],
      [29.78, -5.2],
    ],
  },
  // 8. Kagera River
  {
    id: 7,
    name: 'Kagera River (White Nile Source)',
    basinName: 'Lake Victoria / Nile Basin',
    catchmentKm2: '60,000 km²',
    lengthKm: '400 km',
    outlet: 'Lake Victoria at Bukoba',
    hydro: 'Rusumo Falls Regional Hydro Project (80 MW)',
    significance: 'The largest fluvial inflow into Lake Victoria, forming the primary remote headstream of the Nile River.',
    width: 0.28,
    pts: [
      [30.55, -2.15],
      [30.82, -1.35],
      [31.25, -1.25],
      [31.78, -1.28],
    ],
  },
  // 9. Mara River
  {
    id: 8,
    name: 'Mara River (Serengeti Migration)',
    basinName: 'Lake Victoria Basin',
    catchmentKm2: '13,504 km²',
    lengthKm: '395 km',
    outlet: 'Lake Victoria at Musoma Bay',
    hydro: 'Cross-border Mara River Basin Initiative',
    significance: 'World-famous crossing point for 1.5M wildebeest & zebras during the Great Serengeti Migration.',
    width: 0.25,
    pts: [
      [35.15, -1.55],
      [34.65, -1.62],
      [34.15, -1.55],
      [33.85, -1.52],
    ],
  },
];

export function buildRivers(scene, waterUniforms) {
  const riverUniforms = {
    uT: waterUniforms.uT,
    uFlood: { value: 1.0 },
    uHoverRiver: { value: -1.0 },
  };

  const riverVS = `
    attribute float aRiverId;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vRiverId;
    void main() {
      vUv = uv;
      vRiverId = aRiverId;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const riverFS = `
    uniform float uT;
    uniform float uFlood;
    uniform float uHoverRiver;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vRiverId;

    void main() {
      // Soft riverbank feathering
      float bank = 1.0 - abs(vUv.y * 2.0 - 1.0);
      float edgeAlpha = smoothstep(0.0, 0.45, bank);

      // Animated downstream current ripples
      float flow = sin(vUv.x * 42.0 - uT * 3.8 + sin(vUv.y * 8.0) * 1.2) * 0.5 + 0.5;
      vec3 baseRiver = vec3(0.06, 0.38, 0.56);
      vec3 floodTint = vec3(0.18, 0.68, 0.88);
      vec3 col = mix(baseRiver, floodTint, clamp((uFlood - 0.8) * 0.65, 0.0, 1.0));
      col += vec3(0.45, 0.85, 1.0) * flow * 0.28 * bank;

      // Dynamic hover bioluminescence pulse
      if (abs(vRiverId - uHoverRiver) < 0.5) {
        float pulse = 0.5 + 0.5 * sin(uT * 5.0 + vUv.x * 12.0);
        col = mix(col, vec3(0.25, 0.92, 1.0), 0.72);
        col += vec3(0.65, 0.98, 1.0) * pulse * 0.45;
        edgeAlpha = max(edgeAlpha, 0.85);
      }

      gl_FragColor = vec4(col, edgeAlpha * clamp(0.68 + (uFlood - 1.0) * 0.25, 0.40, 0.95));
    }
  `;

  const riverMat = new THREE.ShaderMaterial({
    uniforms: riverUniforms,
    vertexShader: riverVS,
    fragmentShader: riverFS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const riversGroup = new THREE.Group();
  const ribbons = [];
  const hitMeshes = [];

  // Invisible material for raycasting hit proxies (dilated width for easy mouse clicking)
  const hitMat = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide,
  });

  RIVER_PATHS.forEach((rv, rIdx) => {
    const worldPts = rv.pts.map(([lo, la]) => {
      const [x, z] = wp(lo, la);
      return new THREE.Vector3(x, 0, z);
    });
    const curve = new THREE.CatmullRomCurve3(worldPts);
    const segs = 64;
    const cPts = curve.getPoints(segs);

    const pos = new Float32Array((segs + 1) * 2 * 3);
    const uvs = new Float32Array((segs + 1) * 2 * 2);
    const riverIds = new Float32Array((segs + 1) * 2);
    const hitPos = new Float32Array((segs + 1) * 2 * 3);
    const baseXZ = [];
    const indices = [];

    for (let i = 0; i <= segs; i++) {
      const p = cPts[i];
      const tang = curve.getTangent(i / segs);
      const nx = -tang.z;
      const nz = tang.x;
      const downstreamScale = 0.45 + 0.85 * (i / segs);
      const hw = rv.width * downstreamScale * 0.5;

      baseXZ.push({ x: p.x, z: p.z, nx, nz, hw, h: relief(p.x, p.z) });

      uvs[(i * 2) * 2] = (i / segs) * 6;
      uvs[(i * 2) * 2 + 1] = 0;
      uvs[(i * 2 + 1) * 2] = (i / segs) * 6;
      uvs[(i * 2 + 1) * 2 + 1] = 1;

      riverIds[i * 2] = rIdx;
      riverIds[i * 2 + 1] = rIdx;

      if (i < segs) {
        const a = i * 2,
          b = i * 2 + 1,
          c = (i + 1) * 2,
          d = (i + 1) * 2 + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    // 1. Rendered Visual Ribbon Mesh
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aRiverId', new THREE.BufferAttribute(riverIds, 1));
    geo.setIndex(indices);

    const mesh = new THREE.Mesh(geo, riverMat);
    mesh.userData = { type: 'river', index: rIdx, info: rv };
    riversGroup.add(mesh);

    // 2. Dilated Invisible Hit Mesh for Smooth Raycasting
    const hitGeo = new THREE.BufferGeometry();
    hitGeo.setAttribute('position', new THREE.BufferAttribute(hitPos, 3));
    hitGeo.setIndex(indices);

    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData = { type: 'river', index: rIdx, info: rv };
    riversGroup.add(hitMesh);
    hitMeshes.push(hitMesh);

    ribbons.push({ geo, pos, hitGeo, hitPos, baseXZ, rv });
  });

  scene.add(riversGroup);

  let lastRiverKey = '';

  function updateRivers(tm, nino, relScale, liftFn, dataMode, scenario, force = false) {
    const key = `${tm.toFixed(2)}_${nino.toFixed(1)}_${relScale.toFixed(2)}_${dataMode}_${scenario}`;
    if (!force && key === lastRiverKey) return;
    lastRiverKey = key;

    let totalSwelling = 0;
    ribbons.forEach((rb) => {
      const { pos, hitPos, baseXZ, geo, hitGeo } = rb;
      for (let i = 0; i < baseXZ.length; i++) {
        const b = baseXZ[i];
        const rainA = rainAnomaly(b.x, b.z, tm, nino, scenario);
        const swell = clamp(1.0 + rainA / 95, 0.45, 2.15);
        totalSwelling += swell;

        const hw = b.hw * swell;
        const hitHw = Math.max(hw * 2.8, 1.4); // dilated hit proxy

        const lx = b.x - b.nx * hw,
          lz = b.z - b.nz * hw;
        const rx = b.x + b.nx * hw,
          rz = b.z + b.nz * hw;

        const hitLx = b.x - b.nx * hitHw,
          hitLz = b.z - b.nz * hitHw;
        const hitRx = b.x + b.nx * hitHw,
          hitRz = b.z + b.nz * hitHw;

        const yOff = dataMode === 'temp' ? 0.22 : liftFn(rainA) + 0.14;
        const y = b.h * 0.95 * relScale + yOff;

        pos[(i * 2) * 3] = lx;
        pos[(i * 2) * 3 + 1] = y;
        pos[(i * 2) * 3 + 2] = lz;

        pos[(i * 2 + 1) * 3] = rx;
        pos[(i * 2 + 1) * 3 + 1] = y;
        pos[(i * 2 + 1) * 3 + 2] = rz;

        // Hit proxy geometry
        hitPos[(i * 2) * 3] = hitLx;
        hitPos[(i * 2) * 3 + 1] = y + 0.35;
        hitPos[(i * 2) * 3 + 2] = hitLz;

        hitPos[(i * 2 + 1) * 3] = hitRx;
        hitPos[(i * 2 + 1) * 3 + 1] = y + 0.35;
        hitPos[(i * 2 + 1) * 3 + 2] = hitRz;
      }
      geo.attributes.position.needsUpdate = true;
      hitGeo.attributes.position.needsUpdate = true;
    });
    riverUniforms.uFlood.value = totalSwelling / (ribbons.length * 65);
  }

  return {
    riversGroup,
    hitMeshes,
    setHoverRiver(idx) {
      riverUniforms.uHoverRiver.value = idx;
    },
    updateRivers,
  };
}
