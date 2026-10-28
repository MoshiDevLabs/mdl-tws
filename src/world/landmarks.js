// Regional 3D Diorama Landmarks, Harbor Infrastructure & Focused Area Anemometer Ring
// Builds recognizable procedural 3D architectural & geographical models for each of the 9 regions
// (Tanzania & Kenya) with distance-based LOD and interactive vantage points when clicking an area.
import * as THREE from 'three';
import { REGIONS, wp, clamp, rainAnomaly } from '../data/climate.js';
import { getCountry } from '../data/countries/index.js';
import { relief } from './terrain.js';

export const REGION_LANDMARK_META = [];
export function syncCountryLandmarkMeta() {
  const nextMeta = getCountry().landmarkMeta || [];
  REGION_LANDMARK_META.length = 0;
  nextMeta.forEach((m) => REGION_LANDMARK_META.push(m));
}
syncCountryLandmarkMeta();

export function buildLandmarks(scene) {
  const landmarksGroup = new THREE.Group();
  scene.add(landmarksGroup);

  // Shared PBR Materials with crisp architectural finish
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xe6e2d8,
    roughness: 0.55,
    metalness: 0.15,
  });
  const glassTowerMat = new THREE.MeshStandardMaterial({
    color: 0x88c9e8,
    emissive: 0x163850,
    emissiveIntensity: 0.45,
    roughness: 0.18,
    metalness: 0.78,
  });
  const craneRedMat = new THREE.MeshStandardMaterial({
    color: 0xe0533c,
    roughness: 0.4,
    metalness: 0.45,
  });
  const ochreRoofMat = new THREE.MeshStandardMaterial({
    color: 0xd98a36,
    roughness: 0.5,
    metalness: 0.2,
  });
  const copperDomeMat = new THREE.MeshStandardMaterial({
    color: 0x38b29a,
    emissive: 0x0b362e,
    emissiveIntensity: 0.3,
    roughness: 0.32,
    metalness: 0.55,
  });
  const graniteMat = new THREE.MeshStandardMaterial({
    color: 0x9b9286,
    roughness: 0.85,
    metalness: 0.08,
  });
  const snowIceMat = new THREE.MeshStandardMaterial({
    color: 0xf5f9ff,
    emissive: 0x2a4868,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.1,
  });
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x263849,
    roughness: 0.5,
    metalness: 0.35,
  });
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xf7f2e7,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xff5533,
  });

  const regionGroups = [];
  const animatedParts = [];

  // Helper to build a ship/vessel
  function makeCargoShip(scale = 1) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.72), hullMat);
    hull.position.y = 0.05;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.14), concreteMat);
    bridge.position.set(0, 0.16, -0.2);
    const stack1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.22), craneRedMat);
    stack1.position.set(0, 0.13, 0.05);
    const stack2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.18), copperDomeMat);
    stack2.position.set(0, 0.13, 0.24);
    g.add(hull, bridge, stack1, stack2);
    g.scale.setScalar(scale);
    return g;
  }

  // Helper to build a traditional Swahili Dhow sailboat
  function makeDhow(scale = 1) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 5).rotateX(Math.PI / 2), ochreRoofMat);
    hull.scale.set(1, 0.5, 1);
    hull.position.y = 0.03;
    const sailGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([0, 0.06, -0.14, 0, 0.36, 0.06, 0, 0.08, 0.16]);
    sailGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    sailGeo.computeVertexNormals();
    const sail = new THREE.Mesh(sailGeo, sailMat);
    g.add(hull, sail);
    g.scale.setScalar(scale);
    return g;
  }

  function rebuildLandmarks() {
    syncCountryLandmarkMeta();
    const country = getCountry();
    while (landmarksGroup.children.length > 0) {
      landmarksGroup.remove(landmarksGroup.children[0]);
    }
    regionGroups.length = 0;
    animatedParts.length = 0;

    REGIONS.forEach((reg, idx) => {
      const [name, lon, lat] = reg;
      const [cx, cz] = wp(lon, lat);
      const baseH = relief(cx, cz);

      const group = new THREE.Group();
      group.userData = { idx, name, cx, cz, baseH };

      if (country.id === 'ke') {
        if (idx === 0) {
          // 0. NAIROBI: Iconic KICC Cylindrical Tower + Conical Helipad Crown + Plenary Amphitheatre + Britam/GTC Towers + Expressway Viaduct
          const kiccShaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.2, 1.55, 20),
            ochreRoofMat
          );
          kiccShaft.position.set(0.05, 0.78, 0.05);
          const helipadSaucer = new THREE.Mesh(
            new THREE.ConeGeometry(0.32, 0.16, 20),
            concreteMat
          );
          helipadSaucer.position.set(0.05, 1.62, 0.05);
          const helipadRim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.3, 0.05, 20),
            craneRedMat
          );
          helipadRim.position.set(0.05, 1.71, 0.05);
          const kiccBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), beaconMat);
          kiccBeacon.position.set(0.05, 1.82, 0.05);
          animatedParts.push({ mesh: kiccBeacon, type: 'pulse', phase: 0.2 });

          // KICC Plenary Hut Amphitheatre
          const plenary = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.26, 12), concreteMat);
          plenary.position.set(0.42, 0.15, 0.18);

          // Britam Prism Tower (Upper Hill)
          const britam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 1.75, 4), glassTowerMat);
          britam.position.set(-0.38, 0.88, 0.28);
          const britamSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.42, 6), concreteMat);
          britamSpire.position.set(-0.38, 1.95, 0.28);

          // Nairobi Expressway Elevated Viaduct
          const expDeck = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.14), concreteMat);
          expDeck.position.set(0, 0.24, -0.38);
          expDeck.rotation.y = -0.25;
          group.add(kiccShaft, helipadSaucer, helipadRim, kiccBeacon, plenary, britam, britamSpire, expDeck);
        } else if (idx === 1) {
          // 1. MOMBASA: Symbolic Moi Avenue Giant Elephant Tusks, Kilindini Port Gantry Cranes, Fort Jesus & Cargo Ships
          const tuskL = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.038, 8, 20, Math.PI * 0.75),
            concreteMat
          );
          tuskL.position.set(-0.18, 0.22, 0.05);
          tuskL.rotation.z = Math.PI * 0.12;
          const tuskR = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.038, 8, 20, Math.PI * 0.75),
            concreteMat
          );
          tuskR.position.set(0.12, 0.22, 0.05);
          tuskR.rotation.y = Math.PI;
          tuskR.rotation.z = Math.PI * 0.12;
          group.add(tuskL, tuskR);

          // Fort Jesus Coral Bastion
          const fort = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.32), ochreRoofMat);
          fort.position.set(0.35, 0.09, -0.25);
          group.add(fort);

          // Kilindini Container Terminal Quay & 3 Gantry Cranes
          const quay = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 1.05), concreteMat);
          quay.position.set(0.55, 0.04, 0.35);
          group.add(quay);
          for (let c = 0; c < 3; c++) {
            const zPos = 0.05 + c * 0.3;
            const mast = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), craneRedMat);
            mast.position.set(0.65, 0.28, zPos);
            const jib = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.05), craneRedMat);
            jib.position.set(0.75, 0.5, zPos);
            group.add(mast, jib);
          }
          const ship1 = makeCargoShip(1.05);
          ship1.position.set(1.18, -0.03, 0.28);
          const ship2 = makeCargoShip(0.85);
          ship2.position.set(1.48, -0.03, -0.25);
          group.add(ship1, ship2);
          animatedParts.push({ mesh: ship1, type: 'bob', baseY: -0.03, phase: 0.3 });
          animatedParts.push({ mesh: ship2, type: 'bob', baseY: -0.03, phase: 1.6 });
        } else if (idx === 2) {
          // 2. KISUMU: Winam Gulf Lake Victoria Pier, Ferry & Kit Mikayi Balanced Tor Rocks
          const pier = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.16), concreteMat);
          pier.position.set(-0.55, 0.04, 0.15);
          const ferry = makeCargoShip(0.85);
          ferry.position.set(-1.02, -0.02, 0.2);
          group.add(pier, ferry);
          animatedParts.push({ mesh: ferry, type: 'bob', baseY: -0.02, phase: 0.8 });

          const rocks = [
            [0.35, 0.14, -0.35, 0.26],
            [0.35, 0.42, -0.35, 0.22],
            [0.55, 0.16, -0.28, 0.2],
          ];
          rocks.forEach(([rx, ry, rz, rs], ri) => {
            const b = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 1), graniteMat);
            b.position.set(rx, ry, rz);
            b.rotation.set(ri * 0.4, ri * 0.9, 0);
            group.add(b);
          });
        } else if (idx === 3) {
          // 3. NAKURU: Menengai Volcanic Caldera Ring & Olkaria Geothermal Cooling Towers
          const caldera = new THREE.Mesh(
            new THREE.TorusGeometry(0.56, 0.12, 10, 24).rotateX(Math.PI / 2),
            copperDomeMat
          );
          caldera.position.set(0.15, 0.22, -0.45);
          group.add(caldera);

          for (let g = 0; g < 2; g++) {
            const hyperboloid = new THREE.Mesh(
              new THREE.CylinderGeometry(0.12, 0.18, 0.36, 14),
              concreteMat
            );
            hyperboloid.position.set(-0.35 + g * 0.34, 0.18, 0.38);
            group.add(hyperboloid);
          }
        } else if (idx === 4) {
          // 4. ELDORET: Uasin Gishu Rift Escarpment & Twin Grain Silo Complex
          for (let s = 0; s < 4; s++) {
            const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.48, 12), concreteMat);
            silo.position.set(-0.24 + s * 0.18, 0.24, 0.15);
            const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.1, 12), ochreRoofMat);
            cap.position.set(-0.24 + s * 0.18, 0.53, 0.15);
            group.add(silo, cap);
          }
        } else if (idx === 5) {
          // 5. NYERI & MT. KENYA: Twin Jagged Volcanic Plugs (Batian 5,199m & Nelion) + Highland Tea Terraces
          const [mkx, mkz] = wp(37.31, -0.15);
          const mGroup = new THREE.Group();
          mGroup.position.set(mkx - cx, 1.15, mkz - cz);
          const batian = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.95, 6), snowIceMat);
          batian.position.set(-0.15, 0.45, 0);
          const nelion = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.82, 6), snowIceMat);
          nelion.position.set(0.22, 0.38, 0.12);
          mGroup.add(batian, nelion);
          group.add(mGroup);

          for (let t = 0; t < 3; t++) {
            const step = new THREE.Mesh(
              new THREE.CylinderGeometry(0.48 + t * 0.22, 0.55 + t * 0.22, 0.08, 12),
              copperDomeMat
            );
            step.position.set(0, 0.2 - t * 0.06, 0.15);
            group.add(step);
          }
        } else if (idx === 6) {
          // 6. GARISSA: Tana River Suspension Bridge & Garissa 50 MW Solar Farm Array
          const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.16), concreteMat);
          bridge.position.set(0, 0.16, 0.12);
          const arch1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.18), craneRedMat);
          arch1.position.set(-0.28, 0.28, 0.12);
          const arch2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.18), craneRedMat);
          arch2.position.set(0.28, 0.28, 0.12);
          group.add(bridge, arch1, arch2);

          for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 3; c++) {
              const panel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.14), glassTowerMat);
              panel.position.set(-0.25 + c * 0.26, 0.08, -0.32 - r * 0.2);
              panel.rotation.x = 0.25;
              group.add(panel);
            }
          }
        } else if (idx === 7) {
          // 7. LODWAR & LAKE TURKANA: Lake Turkana Wind Power Farm Turbines & Central Island Crater
          for (let w = 0; w < 3; w++) {
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.68, 8), concreteMat);
            const tx = 0.25 + w * 0.32;
            const tz = -0.15 + (w % 2) * 0.28;
            mast.position.set(tx, 0.34, tz);

            const rotor = new THREE.Group();
            rotor.position.set(tx, 0.68, tz);
            for (let b = 0; b < 3; b++) {
              const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.015), concreteMat);
              blade.position.y = 0.14;
              const holder = new THREE.Group();
              holder.rotation.z = (b * Math.PI * 2) / 3;
              holder.add(blade);
              rotor.add(holder);
            }
            group.add(mast, rotor);
            animatedParts.push({ mesh: rotor, type: 'rotor', phase: w * 1.1 });
          }

          const islandCrater = new THREE.Mesh(
            new THREE.TorusGeometry(0.32, 0.08, 8, 16).rotateX(Math.PI / 2),
            copperDomeMat
          );
          islandCrater.position.set(0.85, 0.06, -0.35);
          group.add(islandCrater);
        } else if (idx === 8) {
          // 8. MALINDI: Vasco da Gama Coral Pillar on Promontory & Swahili Dhows
          const promontory = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.14, 10), graniteMat);
          promontory.position.set(0.42, 0.07, 0.12);
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.48, 10), concreteMat);
          pillar.position.set(0.42, 0.34, 0.12);
          const crossCap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), ochreRoofMat);
          crossCap.position.set(0.42, 0.62, 0.12);
          group.add(promontory, pillar, crossCap);

          const dhow1 = makeDhow(1.15);
          dhow1.position.set(0.98, -0.02, 0.32);
          const dhow2 = makeDhow(0.95);
          dhow2.position.set(1.22, -0.02, -0.18);
          group.add(dhow1, dhow2);
          animatedParts.push({ mesh: dhow1, type: 'bob', baseY: -0.02, phase: 0.5 });
          animatedParts.push({ mesh: dhow2, type: 'bob', baseY: -0.02, phase: 2.0 });
        }

        landmarksGroup.add(group);
        regionGroups.push(group);
        return;
      }

      if (idx === 0) {
      // 0. MOSHI & MT. KILIMANJARO: Kibo volcanic caldera crown, glacial ribs & Uhuru beacon + coffee terraces
      const [kx, kz] = wp(37.35, -3.07);
      const kOffX = kx - cx;
      const kOffZ = kz - cz;
      const kGroup = new THREE.Group();
      kGroup.position.set(kOffX, 1.35, kOffZ);

      const craterRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.14, 10, 24).rotateX(Math.PI / 2),
        snowIceMat
      );
      craterRim.scale.set(1.15, 0.65, 1.0);
      kGroup.add(craterRim);

      // Uhuru Peak survey obelisk
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.65, 6), ochreRoofMat);
      obelisk.position.set(-0.45, 0.35, 0.2);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), beaconMat);
      beacon.position.set(-0.45, 0.72, 0.2);
      kGroup.add(obelisk, beacon);
      animatedParts.push({ mesh: beacon, type: 'pulse', phase: 0 });
      group.add(kGroup);

      // Foothill coffee estate terrace steps around Moshi
      for (let t = 0; t < 3; t++) {
        const terrace = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55 + t * 0.25, 0.62 + t * 0.25, 0.08, 12),
          copperDomeMat
        );
        terrace.position.set(0.25, 0.22 - t * 0.07, -0.45);
        group.add(terrace);
      }
    } else if (idx === 1) {
      // 1. TANGA: Harbor jetty pier, port crane & Swahili dhows in Tanga Bay
      const jetty = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.16), concreteMat);
      jetty.position.set(0.65, 0.05, 0.18);
      group.add(jetty);

      for (let c = 0; c < 2; c++) {
        const crane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), craneRedMat);
        crane.position.set(0.55 + c * 0.28, 0.26, 0.18);
        const boom = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.04), craneRedMat);
        boom.position.set(0.62 + c * 0.28, 0.46, 0.18);
        group.add(crane, boom);
      }

      const dhow1 = makeDhow(1.2);
      dhow1.position.set(1.25, -0.02, 0.45);
      const dhow2 = makeDhow(1.0);
      dhow2.position.set(1.45, -0.02, -0.15);
      group.add(dhow1, dhow2);
      animatedParts.push({ mesh: dhow1, type: 'bob', baseY: -0.02, phase: 0.4 });
      animatedParts.push({ mesh: dhow2, type: 'bob', baseY: -0.02, phase: 1.9 });
    } else if (idx === 2) {
      // 2. DAR ES SALAAM: Tanzanite Cable-Stayed Bridge, TPA & PSPF Twin Towers, Port Gantry Cranes & Ships
      // Twin PSPF / TPA High-Rise Towers with spires
      for (let t = 0; t < 2; t++) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.55, 8), glassTowerMat);
        tower.position.set(-0.18 + t * 0.24, 0.78, -0.12 + t * 0.08);
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.06, 0.42, 6), concreteMat);
        spire.position.set(-0.18 + t * 0.24, 1.72, -0.12 + t * 0.08);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), beaconMat);
        tip.position.set(-0.18 + t * 0.24, 1.95, -0.12 + t * 0.08);
        group.add(tower, spire, tip);
        animatedParts.push({ mesh: tip, type: 'pulse', phase: t * 1.5 });
      }

      // Bank of Tanzania Twin Podium Towers
      const botA = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.25, 0.22), glassTowerMat);
      botA.position.set(-0.42, 0.62, 0.15);
      const botB = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.25, 0.22), glassTowerMat);
      botB.position.set(-0.42, 0.62, 0.42);
      const skybridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.32), concreteMat);
      skybridge.position.set(-0.42, 0.95, 0.28);
      group.add(botA, botB, skybridge);

      // Tanzanite Cable-Stayed Bridge across Oysterbay / Salender channel
      const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 1.35), concreteMat);
      bridgeDeck.position.set(0.52, 0.18, -0.55);
      bridgeDeck.rotation.y = 0.28;
      const pylon1 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.72, 4), concreteMat);
      pylon1.position.set(0.45, 0.42, -0.82);
      const pylon2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.72, 4), concreteMat);
      pylon2.position.set(0.58, 0.42, -0.28);
      group.add(bridgeDeck, pylon1, pylon2);

      // Kivukoni Port Container Quay & 3 Red Gantry Cranes
      const quay = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 1.1), concreteMat);
      quay.position.set(0.58, 0.04, 0.45);
      group.add(quay);

      for (let c = 0; c < 3; c++) {
        const zPos = 0.12 + c * 0.32;
        const mast = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.52, 0.07), craneRedMat);
        mast.position.set(0.68, 0.3, zPos);
        const jib = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.05), craneRedMat);
        jib.position.set(0.78, 0.52, zPos);
        group.add(mast, jib);
      }

      // Cargo vessels anchored in Dar Harbor channel
      const ship1 = makeCargoShip(1.1);
      ship1.position.set(1.22, -0.03, 0.35);
      ship1.rotation.y = 0.18;
      const ship2 = makeCargoShip(0.85);
      ship2.position.set(1.55, -0.03, -0.35);
      ship2.rotation.y = -0.25;
      group.add(ship1, ship2);
      animatedParts.push({ mesh: ship1, type: 'bob', baseY: -0.03, phase: 0.2 });
      animatedParts.push({ mesh: ship2, type: 'bob', baseY: -0.03, phase: 1.7 });
    } else if (idx === 3) {
      // 3. MOROGORO: Uluguru Mountain Meteorological Tower & SGR Electric Railway Viaduct
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.09, 1.15, 6), craneRedMat);
      mast.position.set(0.38, 0.62, 0.45);
      const radome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), concreteMat);
      radome.position.set(0.38, 1.22, 0.45);
      const blink = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), beaconMat);
      blink.position.set(0.38, 1.36, 0.45);
      group.add(mast, radome, blink);
      animatedParts.push({ mesh: blink, type: 'pulse', phase: 0.8 });

      // SGR Viaduct Arches
      const viaduct = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 0.12), concreteMat);
      viaduct.position.set(-0.1, 0.28, -0.35);
      group.add(viaduct);
      for (let p = -2; p <= 2; p++) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.1), concreteMat);
        pier.position.set(-0.1 + p * 0.28, 0.14, -0.35);
        group.add(pier);
      }
    } else if (idx === 4) {
      // 4. DODOMA: Bunge (Parliament) Stepped Rotunda & Copper Dome + Ceremonial Plaza
      const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.22, 16), concreteMat);
      podium.position.set(0.15, 0.11, 0.1);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.26, 16), ochreRoofMat);
      drum.position.set(0.15, 0.34, 0.1);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
        copperDomeMat
      );
      dome.position.set(0.15, 0.45, 0.1);
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.32, 6), concreteMat);
      spire.position.set(0.15, 0.88, 0.1);
      group.add(podium, drum, dome, spire);

      // Government City flanking wings
      for (let w = -1; w <= 1; w += 2) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.18), concreteMat);
        wing.position.set(0.15 + w * 0.62, 0.14, 0.22);
        wing.rotation.y = -w * 0.35;
        group.add(wing);
      }
    } else if (idx === 5) {
      // 5. MWANZA ("Rock City"): Bismarck Rock Balanced Granite Inselbergs & Lake Victoria Ferry
      const rockPositions = [
        [-0.48, 0.12, -0.42, 0.28],
        [-0.46, 0.42, -0.4, 0.34],
        [-0.25, 0.18, -0.52, 0.24],
        [-0.68, 0.16, -0.28, 0.22],
      ];
      rockPositions.forEach(([rx, ry, rz, rs], ri) => {
        const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 1), graniteMat);
        boulder.position.set(rx, ry, rz);
        boulder.scale.set(1.15, 0.85, 1.05);
        boulder.rotation.set(ri * 0.5, ri * 1.1, ri * 0.3);
        group.add(boulder);
      });

      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.07, 0.14), concreteMat);
      pier.position.set(-0.62, 0.04, 0.12);
      const ferry = makeCargoShip(0.82);
      ferry.position.set(-1.05, -0.02, 0.18);
      ferry.rotation.y = 0.45;
      group.add(pier, ferry);
      animatedParts.push({ mesh: ferry, type: 'bob', baseY: -0.02, phase: 1.1 });
    } else if (idx === 6) {
      // 6. KIGOMA: Historic Railway Terminus Hall, Deep-Water Lake Tanganyika Slipway & MV Liemba
      const stationHall = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.24, 0.22), concreteMat);
      stationHall.position.set(0.18, 0.12, 0.12);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.18, 4).rotateY(Math.PI / 4),
        ochreRoofMat
      );
      roof.scale.set(1.35, 1, 0.75);
      roof.position.set(0.18, 0.32, 0.12);
      const clockTower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), ochreRoofMat);
      clockTower.position.set(-0.08, 0.26, 0.12);
      group.add(stationHall, roof, clockTower);

      const jetty = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.15), concreteMat);
      jetty.position.set(-0.48, 0.04, 0.15);
      const liemba = makeCargoShip(0.85);
      liemba.position.set(-0.95, -0.02, 0.22);
      group.add(jetty, liemba);
      animatedParts.push({ mesh: liemba, type: 'bob', baseY: -0.02, phase: 2.3 });
    } else if (idx === 7) {
      // 7. MBEYA: Southern Highlands Rift Escarpment Rim, Ngozi Crater Ring & Tea Terraces
      const crater = new THREE.Mesh(
        new THREE.TorusGeometry(0.48, 0.11, 8, 20).rotateX(Math.PI / 2),
        copperDomeMat
      );
      crater.position.set(0.45, 0.28, 0.55);
      const craterLake = new THREE.Mesh(
        new THREE.CircleGeometry(0.38, 18).rotateX(-Math.PI / 2),
        glassTowerMat
      );
      craterLake.position.set(0.45, 0.29, 0.55);
      group.add(crater, craterLake);

      for (let s = 0; s < 3; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.75 - s * 0.15, 0.09, 0.35), copperDomeMat);
        step.position.set(-0.35, 0.12 + s * 0.1, -0.28);
        group.add(step);
      }
    } else if (idx === 8) {
      // 8. MTWARA: Deep-Water Natural Harbor Jetty & LNG / Coastal Storage Tanks
      const jetty = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.16), concreteMat);
      jetty.position.set(0.55, 0.04, 0.15);
      group.add(jetty);

      for (let t = 0; t < 3; t++) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 14), concreteMat);
        tank.position.set(0.18 + t * 0.36, 0.12, 0.42);
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.4),
          copperDomeMat
        );
        cap.position.set(0.18 + t * 0.36, 0.24, 0.42);
        group.add(tank, cap);
      }

      const tanker = makeCargoShip(1.0);
      tanker.position.set(1.15, -0.03, 0.18);
      group.add(tanker);
      animatedParts.push({ mesh: tanker, type: 'bob', baseY: -0.03, phase: 0.9 });
    }

    landmarksGroup.add(group);
    regionGroups.push(group);
  });
  }
  rebuildLandmarks();

  // ============================================================================
  // FOCUSED AREA INSTRUMENT RING: 3D Wind Compass Vane + Ground Rain Splash Rings
  // ============================================================================
  const focusRingGroup = new THREE.Group();
  focusRingGroup.visible = false;
  scene.add(focusRingGroup);

  // Outer degree tick ring
  const compassRingGeo = new THREE.RingGeometry(2.65, 2.82, 48).rotateX(-Math.PI / 2);
  const compassRingMat = new THREE.MeshBasicMaterial({
    color: 0x28c7b8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const compassRing = new THREE.Mesh(compassRingGeo, compassRingMat);
  focusRingGroup.add(compassRing);

  // Inner dashed target ring
  const innerRingGeo = new THREE.RingGeometry(1.55, 1.63, 36).rotateX(-Math.PI / 2);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0xe59a3c,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  focusRingGroup.add(innerRing);

  // 3D Wind Vector Arrow on the perimeter ring showing wind flow direction
  const windArrowGroup = new THREE.Group();
  const arrowHead = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.58, 4).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x28c7b8 })
  );
  arrowHead.position.z = 2.74;
  const arrowTail = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.04, 0.55),
    new THREE.MeshBasicMaterial({ color: 0xe59a3c })
  );
  arrowTail.position.z = -2.74;
  windArrowGroup.add(arrowHead, arrowTail);
  focusRingGroup.add(windArrowGroup);

  // Expanding Ground Rain Splash / Flood Pulse Ripples (3 concentric rings)
  const splashRings = [];
  for (let i = 0; i < 4; i++) {
    const sr = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.44, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x3fd6ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    sr.position.set(Math.cos(i * 1.6) * 0.9, 0.05, Math.sin(i * 1.6) * 0.9);
    focusRingGroup.add(sr);
    splashRings.push({ mesh: sr, phase: i * 0.25 });
  }

  function updateLandmarks({
    T,
    tm,
    nino,
    relScale,
    liftFn,
    dataMode,
    scenario,
    camDist,
    focusIdx,
    curIdx,
    sites,
    visible = true,
  }) {
    landmarksGroup.visible = visible;
    if (!visible) {
      focusRingGroup.visible = false;
      return;
    }

    // Distance-based LOD scale: full size when zoomed in (d < 35), compact silhouette at overview
    const zoomLod = clamp((95 - camDist) / 55, 0.38, 1.15);

    regionGroups.forEach((g, idx) => {
      const { cx, cz, baseH } = g.userData;
      const yLift =
        dataMode === 'temp' ? 0.15 : liftFn(rainAnomaly(cx, cz, tm, nino, scenario));
      const y = baseH * 0.95 * relScale + yLift;
      g.position.set(cx, y, cz);

      const isFocused = curIdx === idx || focusIdx === idx;
      const s = isFocused ? Math.max(1.05, zoomLod * 1.12) : zoomLod;
      g.scale.setScalar(s);
    });

    // Animate ship bobbing and aviation warning beacons
    animatedParts.forEach((ap) => {
      if (ap.type === 'bob') {
        ap.mesh.position.y = ap.baseY + Math.sin(T * 2.1 + ap.phase) * 0.025;
        ap.mesh.rotation.z = Math.sin(T * 1.6 + ap.phase) * 0.04;
      } else if (ap.type === 'pulse') {
        const on = Math.sin(T * 4.2 + ap.phase) > 0.15;
        ap.mesh.scale.setScalar(on ? 1.25 : 0.75);
      } else if (ap.type === 'rotor') {
        ap.mesh.rotation.z = T * 3.8 + ap.phase;
      }
    });

    // Update Focused Area Instrument Ring & Local Splash FX
    const activeIdx = curIdx >= 0 ? curIdx : -1;
    if (activeIdx >= 0 && sites[activeIdx]) {
      const site = sites[activeIdx];
      focusRingGroup.visible = true;
      focusRingGroup.position.set(site.x, site.y + 0.12, site.z);

      // Rotate outer compass ticks gently, point wind arrow in actual wind direction
      compassRing.rotation.z = T * 0.15;
      const windRad = (((site.windDir || 90) + 180) * Math.PI) / 180;
      windArrowGroup.rotation.y = -windRad;

      const isWet =
        scenario === 'live' ? !!site.isRaining || (site.precipMm || 0) > 0.1 : site.rainA > 18;
      splashRings.forEach((sr) => {
        if (!isWet) {
          sr.mesh.material.opacity = 0;
        } else {
          const f = (T * 0.85 + sr.phase) % 1;
          sr.mesh.scale.setScalar(0.5 + f * 2.4);
          sr.mesh.material.opacity = (1 - f) * 0.65;
        }
      });
    } else {
      focusRingGroup.visible = false;
    }
  }

  return {
    landmarksGroup,
    focusRingGroup,
    updateLandmarks,
    rebuildLandmarks,
  };
}
