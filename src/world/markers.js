// Compact Mapbox-Style 3D Weather Station Pins, Circular City Nodes & Terrain Probe Marker
// (Replaces the oversized bullseye discs and laser columns that previously obscured the terrain)
import * as THREE from 'three';
import {
  REGIONS,
  TOWNS,
  GEO_LABELS,
  wp,
  RAIN_COL,
  RAIN_HEX,
  TEMP_COL,
  TEMP_HEX,
} from '../data/climate.js';
import { relief } from './terrain.js';

function createCircleDotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 3, 32, 32, 28);
  g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  g.addColorStop(0.35, 'rgba(180, 235, 255, 0.85)');
  g.addColorStop(0.7, 'rgba(63, 214, 255, 0.25)');
  g.addColorStop(1.0, 'rgba(63, 214, 255, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function buildMarkers(scene, labelsContainer) {
  const dotTex = createCircleDotTexture();

  // 1. Sleek, Unobtrusive 3D Region Weather Pins
  const sites = REGIONS.map((a, i) => {
    const q = wp(a[1], a[2]);
    const s = {
      i,
      n: a[0],
      lon: a[1],
      lat: a[2],
      note: a[3],
      elevM: a[4],
      x: q[0],
      z: q[1],
      rainA: 0,
      tempA: 0,
      absTemp: 30,
      feelsLike: 32,
      windKmh: 14,
      windDir: 110,
      rainSt: 1,
      tempSt: 1,
      rank: i,
      y: 0,
    };

    // Sleek glowing 3D beacon column
    s.stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.42, 1, 14, 1, true).translate(0, 0.5, 0),
      new THREE.MeshBasicMaterial({
        color: 0x3fd6ff,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );

    // Balanced ground pulse ring
    s.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.85, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x3fd6ff,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );

    // 3D sensor head + dual-metric halo ring
    s.headGroup = new THREE.Group();
    s.headCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 1),
      new THREE.MeshStandardMaterial({
        color: 0x3fd6ff,
        emissive: 0x1b6ca8,
        roughness: 0.2,
        metalness: 0.5,
      })
    );
    s.headHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.06, 10, 28).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff8c42, transparent: true, opacity: 0.85 })
    );
    s.headGroup.add(s.headCore, s.headHalo);

    // Invisible raycast cylinder for easy clicking/tapping
    s.hit = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 10, 8).translate(0, 4.5, 0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    s.hit.userData.s = s;

    [s.stem, s.ring, s.headGroup, s.hit].forEach((o) => scene.add(o));

    // Clean floating telemetry pill
    s.el = document.createElement('div');
    s.el.className = 'tag region-tag';
    s.el.style.pointerEvents = 'auto';
    s.el.style.cursor = 'pointer';
    s.el.innerHTML = `<span class="t-name">${s.n}</span><span class="t-metrics"><em class="t-rain"></em><b class="t-temp"></b></span>`;
    labelsContainer.appendChild(s.el);

    return s;
  });

  // 2. Secondary Towns & Urban Centers (Rendered with smooth circular glow sprites, no white squares!)
  const townCoords = TOWNS.map((a) => ({ name: a[0], xz: wp(a[1], a[2]) }));
  const tg3 = new Float32Array(townCoords.length * 3);
  const tgeo = new THREE.BufferGeometry();
  tgeo.setAttribute('position', new THREE.BufferAttribute(tg3, 3));
  const townPoints = new THREE.Points(
    tgeo,
    new THREE.PointsMaterial({
      map: dotTex,
      color: 0xffe4b5,
      size: 3.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  townPoints.frustumCulled = false;
  scene.add(townPoints);

  // 3. Geographic Feature Labels (Peaks, Lakes, National Parks, Islands)
  const geoLabels = GEO_LABELS.map(([n, lo, la, h, kind]) => {
    const q = wp(lo, la);
    const e = document.createElement('div');
    e.className = `tag geo geo-${kind}`;
    e.textContent = n;
    labelsContainer.appendChild(e);
    return { x: q[0], z: q[1], baseH: relief(q[0], q[1]), h, e };
  });

  // 4. Interactive Terrain Probe Marker (Compact 3D pin)
  const probeGroup = new THREE.Group();
  const pRing = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.78, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  const pStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 4.2, 8).translate(0, 2.1, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  const pTip = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.35, 0),
    new THREE.MeshBasicMaterial({ color: 0x3fd6ff })
  );
  pTip.position.y = 4.35;
  probeGroup.add(pRing, pStem, pTip);
  probeGroup.visible = false;
  scene.add(probeGroup);

  const tmpVec = new THREE.Vector3();

  function updateMarkers({
    T,
    relScale,
    liftFn,
    dataMode,
    hovIdx,
    curIdx,
    cam,
    camDist,
    focusMode,
    focusIdx,
    labelsVisible,
    regionsVisible,
  }) {
    sites.forEach((s) => {
      const rel = (s.baseH || (s.baseH = relief(s.x, s.z))) * 0.95 * relScale;
      const yLift = dataMode === 'temp' ? s.tempA * 0.18 : liftFn(s.rainA);
      const y = rel + yLift;
      s.y = y;

      const isTempMode = dataMode === 'temp';
      const hgt = isTempMode
        ? 3.6 + Math.max(0, s.tempA * 1.4) + (s.absTemp - 20) * 0.14
        : 3.6 + Math.min(7.5, Math.abs(s.rainA) * 0.042 + s.tempA * 0.35);
      const hv = hovIdx === s.i || curIdx === s.i;

      const primaryCol = isTempMode ? TEMP_COL[s.tempSt] : RAIN_COL[s.rainSt];
      const primaryHex = isTempMode ? TEMP_HEX[s.tempSt] : RAIN_HEX[s.rainSt];
      const tempCol = TEMP_COL[s.tempSt];

      s.stem.visible = regionsVisible;
      s.ring.visible = regionsVisible;
      s.headGroup.visible = regionsVisible;

      s.stem.material.color.setHex(primaryCol);
      s.ring.material.color.setHex(primaryCol);
      s.headCore.material.color.setHex(primaryCol);
      s.headCore.material.emissive.setHex(primaryCol);
      s.headCore.material.emissiveIntensity = hv ? 0.95 : 0.55;
      s.headHalo.material.color.setHex(tempCol);

      // Distance-adaptive scale: shrink vertical beacon by 72% when zoomed in or focused so 3D city models shine!
      const isFocusedSite = curIdx === s.i || (focusMode && focusIdx === s.i);
      const zoomShrink = isFocusedSite
        ? 0.26
        : camDist < 38
        ? 0.32 + 0.68 * Math.max(0, (camDist - 16) / 22)
        : 1.0;

      const effHgt = hgt * zoomShrink;
      const stemRad = (hv ? 1.25 : 0.95) * (isFocusedSite ? 0.45 : zoomShrink);

      s.stem.position.set(s.x, y, s.z);
      s.stem.scale.set(stemRad, effHgt, stemRad);
      s.stem.material.opacity = isFocusedSite ? 0.22 : hv ? 0.68 : 0.38;

      s.headGroup.position.set(s.x, y + effHgt, s.z);
      s.headGroup.scale.setScalar((hv ? 1.25 : 0.92) * (isFocusedSite ? 0.42 : zoomShrink));
      s.headCore.rotation.y = T * 1.1 + s.i;
      s.headHalo.rotation.z = -T * 0.85;
      s.hit.position.set(s.x, y, s.z);

      // Balanced ground pulse ring
      const f = (T * 0.75 + s.i * 0.3) % 1;
      s.ring.position.set(s.x, y + 0.16, s.z);
      s.ring.scale.setScalar((1.1 + f * 2.1) * (hv ? 1.25 : 1));
      s.ring.material.opacity = (1 - f) * (isFocusedSite ? 0.35 : 0.72);

      // Project 3D pin head to 2D floating badge
      tmpVec.set(s.x, y + effHgt + 0.55, s.z).project(cam);
      const show =
        labelsVisible &&
        regionsVisible &&
        tmpVec.z < 1 &&
        (hv || isFocusedSite || s.rank < 6 || camDist < 95);
      s.screenX = (tmpVec.x * 0.5 + 0.5) * innerWidth;
      s.screenY = (-tmpVec.y * 0.5 + 0.5) * innerHeight - 10;
      s.showLabel = show;
      s.priority = isFocusedSite ? 100 : hv ? 90 : 50 - s.rank;
      s.primaryHex = primaryHex;
      s.hv = hv;
    });

    townCoords.forEach((t, i) => {
      const h = (t.baseH || (t.baseH = relief(t.xz[0], t.xz[1]))) * 0.95 * relScale;
      tg3[i * 3] = t.xz[0];
      tg3[i * 3 + 1] = h + 0.45;
      tg3[i * 3 + 2] = t.xz[1];
    });
    tgeo.attributes.position.needsUpdate = true;

    // Smart Screen-Space Label Collision Avoidance across Region Tags, Geo Labels & HUD Panels
    const occupied = [
      // Reserve top-left synoptic header area so map labels never drift behind HUD text
      { x: 215, y: 115, w: 430, h: 220 },
      // Reserve top-right dock area
      { x: innerWidth - 180, y: 190, w: 360, h: 360 },
    ];
    if (curIdx >= 0) {
      // Reserve bottom-left modal area when dossier is open
      occupied.push({ x: 215, y: innerHeight - 300, w: 410, h: 590 });
    }
    const orderedSites = [...sites].sort((a, b) => b.priority - a.priority);
    orderedSites.forEach((s) => {
      if (!s.showLabel) {
        s.el.style.display = 'none';
        return;
      }
      const w = 152,
        h = 24;
      let sx = s.screenX,
        sy = s.screenY;
      let collided = false;
      for (let i = 0; i < occupied.length; i++) {
        const b = occupied[i];
        if (Math.abs(sx - b.x) < (w + b.w) * 0.46 && Math.abs(sy - b.y) < (h + b.h) * 0.55) {
          if (s.priority >= 90) {
            sy = b.y - h - 6;
          } else {
            collided = true;
            break;
          }
        }
      }
      if (collided) {
        s.el.style.display = 'none';
      } else {
        occupied.push({ x: sx, y: sy, w, h });
        s.el.style.display = 'flex';
        s.el.classList.toggle('h', s.hv);
        s.el.style.setProperty('--c', s.primaryHex);
        s.el.style.setProperty('--tc', TEMP_HEX[s.tempSt]);
        s.el.style.transform = `translate(-50%,-100%) translate(${Math.round(sx)}px,${Math.round(sy)}px)`;
      }
    });

    geoLabels.forEach((g) => {
      tmpVec.set(g.x, g.baseH * 0.95 * relScale + g.h + 1.1, g.z).project(cam);
      let on = labelsVisible && tmpVec.z < 1 && camDist < 155;
      const sx = (tmpVec.x * 0.5 + 0.5) * innerWidth;
      const sy = (-tmpVec.y * 0.5 + 0.5) * innerHeight;
      if (on) {
        const gw = 128,
          gh = 18;
        for (let i = 0; i < occupied.length; i++) {
          const b = occupied[i];
          if (Math.abs(sx - b.x) < (gw + b.w) * 0.45 && Math.abs(sy - b.y) < (gh + b.h) * 0.55) {
            on = false;
            break;
          }
        }
        if (on) occupied.push({ x: sx, y: sy, w: gw, h: gh });
      }
      g.e.style.display = on ? 'block' : 'none';
      if (on) {
        g.e.style.transform = `translate(-50%,-100%) translate(${Math.round(sx)}px,${Math.round(sy)}px)`;
      }
    });
  }

  return { sites, probeGroup, townPoints, updateMarkers };
}
