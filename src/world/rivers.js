// Major Tanzanian River Basins (Rufiji, Great Ruaha, Kilombero, Pangani, Wami, Ruvu, Ruvuma, Malagarasi, Kagera, Mara)
// Rendered as terrain-draped 3D ribbon meshes that visibly swell during El Niño / Cyclone floods and narrow in La Niña drought.
import * as THREE from 'three';
import { wp, clamp, rainAnomaly } from '../data/climate.js';
import { relief, inLand, inLake } from './terrain.js';

// Geographically accurate coordinate polylines [lon, lat] from headwaters to ocean/lake mouth
const RIVER_PATHS = [
  // 1. Rufiji + Kilombero (Tanzania's largest river basin -> Indian Ocean at Mafia Channel)
  {
    name: 'Rufiji & Kilombero',
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
  // 2. Great Ruaha (Southern Highlands / Usangu -> joins Rufiji)
  {
    name: 'Great Ruaha',
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
  // 3. Pangani River (Mt Kilimanjaro & Meru -> Tanga / Pangani coast)
  {
    name: 'Pangani',
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
  // 4. Wami River (Central/Morogoro uplands -> Bagamoyo/Sadani coast)
  {
    name: 'Wami',
    width: 0.25,
    pts: [
      [36.4, -6.15],
      [37.1, -6.28],
      [37.85, -6.25],
      [38.45, -6.18],
      [38.85, -6.12],
    ],
  },
  // 5. Ruvu River (Uluguru slopes -> Bagamoyo / Dar es Salaam water supply)
  {
    name: 'Ruvu',
    width: 0.25,
    pts: [
      [37.65, -7.05],
      [38.05, -6.88],
      [38.55, -6.68],
      [38.92, -6.42],
    ],
  },
  // 6. Ruvuma River (Southern border river -> Mtwara / Indian Ocean)
  {
    name: 'Ruvuma',
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
  // 7. Malagarasi River (Western Highlands -> Lake Tanganyika near Kigoma)
  {
    name: 'Malagarasi',
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
  // 8. Kagera River (Karagwe/Bukoba -> Lake Victoria)
  {
    name: 'Kagera',
    width: 0.28,
    pts: [
      [30.55, -2.15],
      [30.82, -1.35],
      [31.25, -1.25],
      [31.78, -1.28],
    ],
  },
  // 9. Mara River (Serengeti -> Lake Victoria at Musoma)
  {
    name: 'Mara',
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
  };

  const riverVS = `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const riverFS = `
    uniform float uT;
    uniform float uFlood;
    varying vec2 vUv;
    varying vec3 vWorldPos;
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

      gl_FragColor = vec4(col, edgeAlpha * clamp(0.65 + (uFlood - 1.0) * 0.25, 0.35, 0.92));
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

  RIVER_PATHS.forEach((rv) => {
    const worldPts = rv.pts.map(([lo, la]) => {
      const [x, z] = wp(lo, la);
      return new THREE.Vector3(x, 0, z);
    });
    const curve = new THREE.CatmullRomCurve3(worldPts);
    const segs = 64;
    const cPts = curve.getPoints(segs);

    const pos = new Float32Array((segs + 1) * 2 * 3);
    const uvs = new Float32Array((segs + 1) * 2 * 2);
    const baseXZ = [];
    const indices = [];

    for (let i = 0; i <= segs; i++) {
      const p = cPts[i];
      const tang = curve.getTangent(i / segs);
      const nx = -tang.z;
      const nz = tang.x;
      // River widens naturally as it approaches its mouth (i / segs -> 1)
      const downstreamScale = 0.45 + 0.85 * (i / segs);
      const hw = rv.width * downstreamScale * 0.5;

      baseXZ.push({ x: p.x, z: p.z, nx, nz, hw, h: relief(p.x, p.z) });

      uvs[(i * 2) * 2] = (i / segs) * 6;
      uvs[(i * 2) * 2 + 1] = 0;
      uvs[(i * 2 + 1) * 2] = (i / segs) * 6;
      uvs[(i * 2 + 1) * 2 + 1] = 1;

      if (i < segs) {
        const a = i * 2,
          b = i * 2 + 1,
          c = (i + 1) * 2,
          d = (i + 1) * 2 + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    const mesh = new THREE.Mesh(geo, riverMat);
    riversGroup.add(mesh);
    ribbons.push({ geo, pos, baseXZ });
  });

  scene.add(riversGroup);

  let lastRiverKey = '';

  function updateRivers(tm, nino, relScale, liftFn, dataMode, scenario, force = false) {
    const key = `${tm.toFixed(2)}_${nino.toFixed(1)}_${relScale.toFixed(2)}_${dataMode}_${scenario}`;
    if (!force && key === lastRiverKey) return;
    lastRiverKey = key;

    let totalSwelling = 0;
    ribbons.forEach((rb) => {
      const { pos, baseXZ, geo } = rb;
      for (let i = 0; i < baseXZ.length; i++) {
        const b = baseXZ[i];
        const rainA = rainAnomaly(b.x, b.z, tm, nino, scenario);
        const swell = clamp(1.0 + rainA / 95, 0.45, 2.15);
        totalSwelling += swell;

        const hw = b.hw * swell;
        const lx = b.x - b.nx * hw,
          lz = b.z - b.nz * hw;
        const rx = b.x + b.nx * hw,
          rz = b.z + b.nz * hw;

        const yOff = dataMode === 'temp' ? 0.22 : liftFn(rainA) + 0.14;
        const y = b.h * 0.95 * relScale + yOff;

        pos[(i * 2) * 3] = lx;
        pos[(i * 2) * 3 + 1] = y;
        pos[(i * 2) * 3 + 2] = lz;

        pos[(i * 2 + 1) * 3] = rx;
        pos[(i * 2 + 1) * 3 + 1] = y;
        pos[(i * 2 + 1) * 3 + 2] = rz;
      }
      geo.attributes.position.needsUpdate = true;
    });
    riverUniforms.uFlood.value = totalSwelling / (ribbons.length * 65);
  }

  return { riversGroup, updateRivers };
}
