// Realistic Cumulonimbus Cloud Decks, 3D Branching Lightning, 3D Tropical Cyclone Spiral Vortex & Vector Wind Trails
import * as THREE from 'three';
import { R, clamp, getCycloneEye, sampleWind } from '../data/climate.js';
import { relief } from './terrain.js';
import { mulberry } from './noise.js';

function createSoftCloudTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  g.addColorStop(0.0, 'rgba(255,255,255,0.96)');
  g.addColorStop(0.38, 'rgba(235,245,255,0.75)');
  g.addColorStop(0.72, 'rgba(180,210,238,0.25)');
  g.addColorStop(1.0, 'rgba(140,175,215,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHeatPlumeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0.0, 'rgba(255, 165, 70, 0.85)');
  g.addColorStop(0.5, 'rgba(255, 85, 35, 0.35)');
  g.addColorStop(1.0, 'rgba(255, 30, 15, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function buildWeatherSystems(scene, sites) {
  const rnd = mulberry(1337);
  const cloudTex = createSoftCloudTexture();
  const heatTex = createHeatPlumeTexture();

  // 1. Billowing Cumulonimbus Cloud Clusters at realistic altitude (y ~ 7.5 above terrain)
  const coreGeo = new THREE.IcosahedronGeometry(1, 3);
  const pAttr = coreGeo.attributes.position;
  for (let i = 0; i < pAttr.count; i++) {
    const vx = pAttr.getX(i),
      vy = pAttr.getY(i),
      vz = pAttr.getZ(i);
    const bump = 1 + 0.16 * Math.sin(vx * 3.4 + vy * 2.8) * Math.cos(vz * 3.6);
    pAttr.setXYZ(i, vx * bump, (vy > 0 ? vy * 1.12 : vy * 0.55) * bump, vz * bump);
  }
  coreGeo.computeVertexNormals();

  const puffOffsets = [
    [0, 0.15, 0, 1.2],
    [1.25, -0.1, 0.38, 0.92],
    [-1.2, -0.08, -0.32, 0.96],
    [0.55, 0.45, -0.88, 0.82],
    [-0.6, 0.35, 0.82, 0.82],
    [0.12, 0.68, 0.1, 0.75],
    [1.7, -0.2, -0.45, 0.68],
    [-1.6, -0.18, 0.5, 0.7],
  ];

  // 3D Branching Lightning Bolt Geometry & Flash PointLight
  const boltVerts = new Float32Array(24 * 3);
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(boltVerts, 3));
  const boltMesh = new THREE.LineSegments(
    boltGeo,
    new THREE.LineBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.95 })
  );
  boltMesh.visible = false;
  scene.add(boltMesh);

  const flashLight = new THREE.PointLight(0xaad8ff, 0, 28, 1.5);
  scene.add(flashLight);

  sites.forEach((s) => {
    s.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xf0f7ff,
      emissive: 0x1e3852,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    // Vertical self-shadowing: bright sunlit tops, dark slate storm undersides
    s.cloudMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vLocalY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalY = position.y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vLocalY;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float belly = smoothstep(-0.6, 0.75, vLocalY);
          diffuseColor.rgb = mix(vec3(0.32, 0.41, 0.52), diffuseColor.rgb * 1.12, belly);`
        );
    };

    s.cloudGroup = new THREE.Group();
    puffOffsets.forEach(([x, y, z, r]) => {
      const m = new THREE.Mesh(coreGeo, s.cloudMat);
      m.position.set(x * 1.9, y * 1.4, z * 1.9);
      m.scale.set(r * 2.1, r * 1.15, r * 2.1);
      m.rotation.y = rnd() * Math.PI * 2;
      s.cloudGroup.add(m);
    });

    s.sprites = [];
    for (let k = 0; k < 5; k++) {
      const spMat = new THREE.SpriteMaterial({
        map: cloudTex,
        color: 0xe6f4ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sp = new THREE.Sprite(spMat);
      const [ox, oy, oz, r] = puffOffsets[k];
      sp.position.set(ox * 1.9, oy * 1.3, oz * 1.9);
      sp.scale.set(r * 5.2, r * 3.2, 1);
      s.cloudGroup.add(sp);
      s.sprites.push(sp);
    }

    s.shadowMat = new THREE.MeshBasicMaterial({
      color: 0x02060c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    s.cloudShadow = new THREE.Mesh(
      new THREE.CircleGeometry(4.8, 32).rotateX(-Math.PI / 2),
      s.shadowMat
    );
    scene.add(s.cloudShadow);
    scene.add(s.cloudGroup);
    s.flashTimer = 0;
  });

  // 2. 3D Tropical Cyclone Spiral Eyewall Vortex (Active in 'cyclone' scenario)
  const cycloneGroup = new THREE.Group();
  const cycSprites = [];
  const arms = 4;
  const puffsPerArm = 18;
  for (let a = 0; a < arms; a++) {
    const armAngle = (a / arms) * Math.PI * 2;
    for (let p = 0; p < puffsPerArm; p++) {
      const frac = p / (puffsPerArm - 1);
      const rad = 2.4 + frac * 14.5;
      // Clockwise Southern Hemisphere spiral
      const theta = armAngle - frac * 3.6 + (rnd() - 0.5) * 0.25;
      const spMat = new THREE.SpriteMaterial({
        map: cloudTex,
        color: frac < 0.25 ? 0xf2f8ff : 0xc5dcf2,
        transparent: true,
        opacity: (1 - frac * 0.55) * 0.72,
        depthWrite: false,
      });
      const sp = new THREE.Sprite(spMat);
      const size = (3.4 + frac * 4.5) * (0.85 + 0.3 * rnd());
      sp.position.set(
        Math.cos(theta) * rad,
        (1 - frac) * 1.6 + (rnd() - 0.5) * 0.5,
        Math.sin(theta) * rad
      );
      sp.scale.set(size, size * 0.68, 1);
      cycloneGroup.add(sp);
      cycSprites.push({ sp, baseOp: (1 - frac * 0.55) * 0.72 });
    }
  }
  cycloneGroup.visible = false;
  scene.add(cycloneGroup);

  // 3. Rain Streak Curtain beneath stormy clouds
  const ND = 48;
  const rp3 = new Float32Array(sites.length * ND * 6);
  const rc3 = new Float32Array(sites.length * ND * 6);
  const rd = [];
  for (let i = 0; i < sites.length * ND; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = Math.sqrt(rnd()) * 3.8;
    rd.push([Math.cos(ang) * rad, Math.sin(ang) * rad, rnd(), 0.85 + rnd() * 0.45]);
  }
  const rgm = new THREE.BufferGeometry();
  rgm.setAttribute('position', new THREE.BufferAttribute(rp3, 3));
  rgm.setAttribute('color', new THREE.BufferAttribute(rc3, 3));
  const rainMesh = new THREE.LineSegments(
    rgm,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  rainMesh.frustumCulled = false;
  scene.add(rainMesh);

  // 4. Thermal Heat-Wave Plumes (Rising convective shimmer particles in hot zones)
  const HM = 18;
  const hp3 = new Float32Array(sites.length * HM * 3);
  const hc3 = new Float32Array(sites.length * HM * 3);
  const hd = [];
  for (let i = 0; i < sites.length * HM; i++) {
    hd.push([rnd() * Math.PI * 2, 0.6 + rnd() * 3.8, rnd(), 0.6 + rnd() * 0.6]);
  }
  const hgeo = new THREE.BufferGeometry();
  hgeo.setAttribute('position', new THREE.BufferAttribute(hp3, 3));
  hgeo.setAttribute('color', new THREE.BufferAttribute(hc3, 3));
  const heatPts = new THREE.Points(
    hgeo,
    new THREE.PointsMaterial({
      map: heatTex,
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  heatPts.frustumCulled = false;
  scene.add(heatPts);

  // 5. Windy.com-Style Vector Wind & Moisture Streamlines
  const NP = 135,
    TL = 16,
    SPs = [];
  const sg = new THREE.BufferGeometry();
  const sp3 = new Float32Array(NP * (TL - 1) * 6);
  const sc3 = new Float32Array(NP * (TL - 1) * 6);
  sg.setAttribute('position', new THREE.BufferAttribute(sp3, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(sc3, 3));
  const streamMesh = new THREE.LineSegments(
    sg,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  streamMesh.frustumCulled = false;
  scene.add(streamMesh);

  const respawn = (p, scenario) => {
    if (scenario === 'cyclone') {
      p.x = (rnd() - 0.35) * R * 1.5;
      p.z = (rnd() - 0.5) * R * 1.5;
    } else {
      p.x = (rnd() - 0.3) * R * 1.55;
      p.z = (rnd() - 0.5) * 112;
    }
    p.age = Math.floor(rnd() * 90);
    p.yOff = 1.9 + rnd() * 1.4;
    p.t = Array.from({ length: TL }, () => [p.x, 2.5, p.z]);
  };
  for (let i = 0; i < NP; i++) {
    const p = {};
    respawn(p, 'elnino');
    SPs.push(p);
  }

  function updateStreams(dt, T, tm, nino, relScale, dataMode, scenario) {
    let n = 0;
    const isTemp = dataMode === 'temp';
    const isCyclone = scenario === 'cyclone';

    SPs.forEach((p) => {
      const w = sampleWind(p.x, p.z, tm, nino, scenario);
      p.x += w.vx * dt;
      p.z += w.vz * dt;
      p.age++;
      if (!p.h || p.age % 3 === 0) p.h = relief(p.x, p.z);
      p.t.shift();
      p.t.push([p.x, p.h * 0.95 * relScale + p.yOff, p.z]);

      if (p.age > 140 || Math.hypot(p.x, p.z) > R + 6) {
        respawn(p, scenario);
      }

      const speedNorm = clamp(w.speedKmh / 65, 0.25, 1.25);
      for (let k = 0; k < TL - 1; k++) {
        const a = p.t[k],
          b = p.t[k + 1];
        const f = (k / TL) * (0.35 + 0.55 * speedNorm);
        sp3.set([a[0], a[1], a[2], b[0], b[1], b[2]], n);
        if (isTemp) {
          sc3.set([1.0 * f, 0.55 * f, 0.2 * f, 1.0 * f, 0.55 * f, 0.2 * f], n);
        } else if (isCyclone && w.speedKmh > 55) {
          sc3.set([0.65 * f, 0.92 * f, 1.0 * f, 0.65 * f, 0.92 * f, 1.0 * f], n);
        } else {
          sc3.set([0.32 * f, 0.85 * f, 1.0 * f, 0.32 * f, 0.85 * f, 1.0 * f], n);
        }
        n += 6;
      }
    });
    sg.attributes.position.needsUpdate = true;
    sg.attributes.color.needsUpdate = true;
  }

  function spawnLightningBolt(cx, topY, groundY, cz) {
    let x0 = cx,
      y0 = topY,
      z0 = cz;
    const steps = 8;
    for (let s = 0; s < steps; s++) {
      const u = (s + 1) / steps;
      const x1 = cx + (rnd() - 0.5) * 1.6 * (1 - u * 0.5);
      const y1 = topY - (topY - groundY) * u;
      const z1 = cz + (rnd() - 0.5) * 1.6 * (1 - u * 0.5);
      const idx = s * 6;
      boltVerts.set([x0, y0, z0, x1, y1, z1], idx);
      // Small side branch
      if (s < 4) {
        const bIdx = (steps + s) * 6;
        boltVerts.set(
          [x1, y1, z1, x1 + (rnd() - 0.5) * 2.2, y1 - 1.1, z1 + (rnd() - 0.5) * 2.2],
          bIdx
        );
      }
      x0 = x1;
      y0 = y1;
      z0 = z1;
    }
    boltGeo.attributes.position.needsUpdate = true;
    boltMesh.visible = true;
    flashLight.position.set(cx, groundY + 4.5, cz);
    flashLight.intensity = 9.0;
  }

  function updateWeather(T, dt, cloudEnabled, dataMode, tm, scenario) {
    let anyBoltActive = false;

    // Update 3D Tropical Cyclone Spiral Vortex
    if (scenario === 'cyclone' && cloudEnabled) {
      const eye = getCycloneEye(tm);
      cycloneGroup.visible = true;
      cycloneGroup.position.set(eye.x, 7.6, eye.z);
      // Clockwise rotation in Southern Hemisphere (negative Y rotation in right-handed coords)
      cycloneGroup.rotation.y = -T * 0.85;
      cycSprites.forEach((c) => {
        c.sp.material.opacity = c.baseOp * (0.65 + 0.35 * eye.strength);
      });
    } else {
      cycloneGroup.visible = false;
    }

    const isLive = scenario === 'live';

    sites.forEach((s, i) => {
      // In Live mode: clouds are driven by actual cloudCover %, while rain streaks are strictly gated by s.isRaining!
      const cloudFrac = isLive
        ? clamp(((s.cloudCover ?? 25) - 12) / 88, 0, 1)
        : clamp((s.rainA - 5) / 85, 0, 1);
      const showCloud = cloudFrac > 0.03 && cloudEnabled && dataMode !== 'temp';
      const activeRain = isLive ? showCloud && !!s.isRaining : showCloud;
      const rainIntensity = isLive
        ? activeRain
          ? clamp(0.32 + (s.precipMm || 0) * 0.24, 0.32, 1.0)
          : 0
        : cloudFrac;

      s.cloudGroup.visible = showCloud;
      s.cloudShadow.visible = showCloud;

      const canFlash = isLive
        ? activeRain && ((s.weatherCode || 0) >= 95 || (s.precipMm || 0) >= 4.0)
        : showCloud && s.rainSt === 3;

      if (s.flashTimer > 0) {
        s.flashTimer -= dt;
        anyBoltActive = true;
      } else if (canFlash && rnd() < 0.018) {
        s.flashTimer = 0.14;
        anyBoltActive = true;
        spawnLightningBolt(s.x, s.y + 7.2, s.y, s.z);
      }

      const isFlash = s.flashTimer > 0;
      const isStormy = isLive ? activeRain && (s.precipMm || 0) >= 1.5 : s.rainA > 70;
      s.cloudMat.emissive.setHex(isFlash ? 0xd8f0ff : isStormy ? 0x1a3048 : 0x24425e);
      s.cloudMat.opacity = 0.28 + 0.56 * cloudFrac;
      s.cloudMat.color.setHex(isStormy ? 0xb8cfe6 : 0xf4f9ff);

      const scale = 0.5 + 0.72 * cloudFrac;
      s.cloudGroup.scale.setScalar(scale);
      const cx = s.x + Math.sin(T * 0.3 + i) * 1.1;
      const cz = s.z + Math.cos(T * 0.25 + i) * 0.8;
      // Lower, realistic altitude (s.y + 7.5) right over the mountains & cities
      const cy = s.y + 7.5 + Math.sin(T * 0.5 + i) * 0.45;
      s.cloudGroup.position.set(cx, cy, cz);

      s.sprites.forEach((sp) => {
        sp.material.opacity = (0.22 + 0.45 * cloudFrac) * (isFlash ? 1.3 : 1);
        sp.material.color.setHex(isFlash ? 0xffffff : isStormy ? 0xa5c0de : 0xeaf6ff);
      });

      s.cloudShadow.position.set(cx + 0.9, s.y + 0.12, cz - 0.6);
      s.cloudShadow.scale.setScalar(0.6 + cloudFrac * 0.85);
      s.shadowMat.opacity = showCloud ? cloudFrac * 0.32 : 0;

      // Slanted rain curtains beneath cloud deck — strictly 0 when dry in Live mode!
      for (let d = 0; d < ND; d++) {
        const r = rd[i * ND + d];
        const f = (r[2] + T * 1.35 * r[3]) % 1;
        const top = cy - 0.8;
        const y = top - (top - s.y - 0.2) * f;
        const n = (i * ND + d) * 6;
        const k = activeRain ? rainIntensity * (1 - f * 0.5) * 0.88 : 0;
        const windDrift = (1 - f) * 0.45;
        rp3.set(
          [
            cx + r[0] + windDrift,
            y,
            cz + r[1],
            cx + r[0] + windDrift + 0.14,
            y + 0.95,
            cz + r[1],
          ],
          n
        );
        rc3.set([0.55 * k, 0.85 * k, 1.0 * k, 0.55 * k, 0.85 * k, 1.0 * k], n);
      }

      // Rising convective heat shimmer particles in hot/dry regions
      const heatScore = clamp((s.tempA - 0.8) / 2.6, 0, 1);
      const showHeat =
        cloudEnabled && (dataMode === 'temp' ? heatScore > 0.05 : heatScore > 0.3 || s.rainSt === 0);
      for (let d = 0; d < HM; d++) {
        const r = hd[i * HM + d];
        const n = (i * HM + d) * 3;
        const f = (r[2] + T * 0.18 * r[3]) % 1;
        const swirl = r[0] + T * 0.45 + f * 2.0;
        const rad = r[1] * (0.7 + 0.3 * Math.sin(f * Math.PI));
        hp3[n] = s.x + Math.cos(swirl) * rad;
        hp3[n + 1] = showHeat ? s.y + 0.4 + f * (6.5 + heatScore * 3.5) : -80;
        hp3[n + 2] = s.z + Math.sin(swirl) * rad;

        const alpha = Math.sin(f * Math.PI) * (0.4 + 0.5 * heatScore);
        hc3[n] = 1.0 * alpha;
        hc3[n + 1] = (0.58 - 0.35 * heatScore) * alpha;
        hc3[n + 2] = 0.15 * alpha;
      }
    });

    if (!anyBoltActive) {
      boltMesh.visible = false;
      flashLight.intensity *= 0.6;
    }

    rgm.attributes.position.needsUpdate = true;
    rgm.attributes.color.needsUpdate = true;
    hgeo.attributes.position.needsUpdate = true;
    hgeo.attributes.color.needsUpdate = true;
  }

  return { rainMesh, streamMesh, heatPts, cycloneGroup, updateStreams, updateWeather };
}
