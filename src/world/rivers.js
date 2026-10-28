// Major East African River Basins (Tanzania & Kenya)
// Rendered as terrain-draped 3D ribbon meshes that swell during El Niño/Cyclone floods and narrow in La Niña drought.
// Includes clickable raycast hit-proxies, dynamic bioluminescent hover glow, and basin hydrology telemetry.
import * as THREE from 'three';
import { wp, clamp, rainAnomaly } from '../data/climate.js';
import { getCountry } from '../data/countries/index.js';
import { relief } from './terrain.js';

// Geographically accurate coordinate polylines [lon, lat] with basin hydrology intelligence
export const RIVER_PATHS = [];
export function syncCountryRiverPaths() {
  const nextRivers = getCountry().rivers || [];
  RIVER_PATHS.length = 0;
  nextRivers.forEach((rv) => RIVER_PATHS.push(rv));
}
syncCountryRiverPaths();

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

  let lastRiverKey = '';

  function rebuildRivers() {
    syncCountryRiverPaths();
    // Dispose and remove existing river meshes
    ribbons.forEach((rb) => {
      rb.geo.dispose();
      rb.hitGeo.dispose();
    });
    while (riversGroup.children.length > 0) {
      riversGroup.remove(riversGroup.children[0]);
    }
    ribbons.length = 0;
    hitMeshes.length = 0;
    lastRiverKey = '';

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
  }

  rebuildRivers();
  scene.add(riversGroup);

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
    rebuildRivers,
  };
}
