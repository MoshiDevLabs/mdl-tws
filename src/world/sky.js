// Atmospheric 24-Hour Sky, Diurnal Sun Arc & Celestial Night Dome Manager
// Uses dynamic background gradient canvas + directional sun light with smooth day/night transitions.
// 100% free of 3D Mie scattering haze or HDR bloom washout.
import * as THREE from 'three';

export function createDayNightSystem(scene, renderer, sunLight, ambientLight, hemiLight) {
  // 1. Dynamic 24h Atmospheric Background Sky Texture
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 16;
  skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;

  // 2. High-Altitude Night Celestial Star Sphere
  const starCount = 1800;
  const starPos = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);

  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < starCount; i++) {
    const theta = rnd() * Math.PI * 2;
    const phi = Math.acos(rnd() * 0.95 + 0.05); // Upper hemisphere
    const r = 480;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    starSizes[i] = rnd() * 1.5 + 0.8;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

  const starMat = new THREE.PointsMaterial({
    color: 0xe8f4ff,
    size: 1.6,
    sizeAttenuation: false,
    fog: false,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // Time state (default 14:00 - beautiful afternoon sun casting shadows across Great Rift Valley)
  let currentTime = 14.0;
  let autoProgress = false;
  let timeSpeed = 0.25;

  const sunPos = new THREE.Vector3();
  const sunDir = new THREE.Vector3();
  const moonDir = new THREE.Vector3();

  // Natural color definitions (rich, deep, non-glare)
  const daySunCol = new THREE.Color(0xfff5e6);
  const sunsetSunCol = new THREE.Color(0xff6824);
  const duskSunCol = new THREE.Color(0xbf4565);
  const moonCol = new THREE.Color(0x8cb0d8);
  const curSunCol = new THREE.Color();

  const daySkyHorizon = new THREE.Color(0x285c80);
  const dawnSkyHorizon = new THREE.Color(0xd26838);
  const sunsetSkyHorizon = new THREE.Color(0xdd5522);
  const nightSkyHorizon = new THREE.Color(0x061120);

  const daySkyZenith = new THREE.Color(0x061426);
  const sunsetSkyZenith = new THREE.Color(0x180a22);
  const nightSkyZenith = new THREE.Color(0x02050b);

  const curHorizonCol = new THREE.Color();
  const curZenithCol = new THREE.Color();

  let nightFactor = 0.0;

  function updateLighting(t) {
    currentTime = ((t % 24) + 24) % 24;

    // Solar angle: 0h = midnight, 6h = sunrise (East, +X), 12h = noon, 18h = sunset (West, -X)
    const sunAngle = ((currentTime - 6.0) / 24.0) * Math.PI * 2.0;
    const elev = Math.sin(sunAngle);
    const azim = Math.cos(sunAngle);

    const sunHeight = Math.max(elev * 85.0, -25.0);
    const sunX = azim * 80.0;
    const sunZ = 22.0 + Math.sin(sunAngle * 0.5) * 12.0;

    sunPos.set(sunX, Math.max(sunHeight, 2.0), sunZ);
    sunDir.copy(sunPos).normalize();

    // Night factor transition
    if (currentTime >= 6.5 && currentTime <= 17.5) {
      nightFactor = 0.0;
    } else if (currentTime > 17.5 && currentTime < 19.5) {
      nightFactor = (currentTime - 17.5) / 2.0;
    } else if (currentTime >= 19.5 || currentTime <= 5.0) {
      nightFactor = 1.0;
    } else {
      nightFactor = 1.0 - (currentTime - 5.0) / 1.5;
    }
    nightFactor = THREE.MathUtils.clamp(nightFactor, 0.0, 1.0);

    // 1. Directional Sun / Moon Light
    if (elev > -0.05) {
      sunLight.position.set(sunX, Math.max(sunHeight, 4.0), sunZ);
      sunLight.visible = true;

      if (elev > 0.25) {
        // High daylight / afternoon: clear, comfortable, non-glare intensity
        curSunCol.copy(daySunCol);
        sunLight.intensity = 0.92;
      } else if (elev > 0.05) {
        // Golden hour / sunset
        const f = (elev - 0.05) / 0.2;
        curSunCol.copy(sunsetSunCol).lerp(daySunCol, f);
        sunLight.intensity = 0.85;
      } else {
        // Dawn / Dusk twilight
        const f = Math.max(0.0, (elev + 0.05) / 0.1);
        curSunCol.copy(duskSunCol).lerp(sunsetSunCol, f);
        sunLight.intensity = 0.50 * f;
      }
      sunLight.color.copy(curSunCol);
      if (sunLight.shadow) {
        sunLight.shadow.bias = elev < 0.2 ? -0.0003 : -0.0006;
      }
    } else {
      // Nighttime: gentle moonlight
      moonDir.set(-azim * 75.0, 55.0, -sunZ).normalize();
      sunLight.position.copy(moonDir).multiplyScalar(85.0);
      curSunCol.copy(moonCol);
      sunLight.color.copy(curSunCol);
      sunLight.intensity = 0.18;
      sunLight.visible = true;
    }

    // 2. Ambient & Hemisphere Base Light
    if (ambientLight) {
      ambientLight.intensity = THREE.MathUtils.lerp(0.52, 0.10, nightFactor);
      ambientLight.color.setHex(nightFactor > 0.5 ? 0x142036 : 0x9dc2e0);
    }
    if (hemiLight) {
      hemiLight.intensity = THREE.MathUtils.lerp(0.38, 0.08, nightFactor);
      hemiLight.color.setHex(nightFactor > 0.5 ? 0x223c60 : 0xb2e2ff);
      hemiLight.groundColor.setHex(nightFactor > 0.5 ? 0x050810 : 0x1e3024);
    }

    // 3. Sky Colors (Horizon & Zenith)
    if (nightFactor > 0.7) {
      curHorizonCol.copy(nightSkyHorizon);
      curZenithCol.copy(nightSkyZenith);
    } else if (currentTime >= 5.0 && currentTime <= 7.0) {
      const f = (currentTime - 5.0) / 2.0;
      curHorizonCol.copy(dawnSkyHorizon).lerp(daySkyHorizon, f);
      curZenithCol.copy(nightSkyZenith).lerp(daySkyZenith, f);
    } else if (elev > 0.0 && elev < 0.25) {
      const f = elev / 0.25;
      curHorizonCol.copy(sunsetSkyHorizon).lerp(daySkyHorizon, f);
      curZenithCol.copy(sunsetSkyZenith).lerp(daySkyZenith, f);
    } else {
      curHorizonCol.copy(daySkyHorizon);
      curZenithCol.copy(daySkyZenith);
    }

    // 4. Render Dynamic 2D Sky Gradient Canvas (Zero 3D Mie Haze!)
    const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, `#${curZenithCol.getHexString()}`);
    const midCol = curZenithCol.clone().lerp(curHorizonCol, 0.42);
    grad.addColorStop(0.55, `#${midCol.getHexString()}`);
    grad.addColorStop(1.0, `#${curHorizonCol.getHexString()}`);
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 16, 512);
    skyTex.needsUpdate = true;

    // 5. Update Stars
    starMat.opacity = Math.pow(nightFactor, 1.8) * 0.92;
    starField.visible = starMat.opacity > 0.02;
    starField.rotation.y = (currentTime / 24.0) * Math.PI * 2.0;
  }

  // Initial update
  updateLighting(currentTime);

  return {
    setTime(h) {
      updateLighting(h);
    },
    getTime() {
      return currentTime;
    },
    setAutoProgress(v) {
      autoProgress = !!v;
    },
    getAutoProgress() {
      return autoProgress;
    },
    setTimeSpeed(s) {
      timeSpeed = s;
    },
    getNightFactor() {
      return nightFactor;
    },
    getSunDir() {
      return sunDir;
    },
    getSunColor() {
      return curSunCol;
    },
    getHorizonColor() {
      return curHorizonCol;
    },
    getZenithColor() {
      return curZenithCol;
    },
    update(dt) {
      if (autoProgress) {
        updateLighting(currentTime + dt * timeSpeed);
      }
    },
  };
}
