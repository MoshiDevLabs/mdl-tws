// Real 3D Moving Indian Ocean (3D Gerstner Waves, Shallow Seabed Caustics,
// Subsurface Scattering, Fresnel Sky Reflection & Full-Perimeter Surf), Sky Dome & Graticule
import * as THREE from 'three';
import { R, wp } from '../data/climate.js';
import { RINGS } from './terrain.js';
import { mulberry } from './noise.js';

export function buildEnvironment(scene, waterUniforms) {
  const rnd = mulberry(99);

  // Atmospheric gradient sky & horizon scattering dome
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 8;
  skyCanvas.height = 512;
  const ctx = skyCanvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#030914');
  grad.addColorStop(0.38, '#081b31');
  grad.addColorStop(0.7, '#113556');
  grad.addColorStop(0.9, '#1e4e72');
  grad.addColorStop(1.0, '#2e6588');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 8, 512);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.FogExp2(0x0b2238, 0.0022);

  // Subtle stars in upper zenith
  const starCount = 700;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = rnd() * Math.PI * 2;
    const v = rnd() * 0.8 + 0.2;
    const r = 440;
    const q = Math.sqrt(1 - v * v);
    starPos[i * 3] = Math.cos(u) * q * r;
    starPos[i * 3 + 1] = v * r * 0.72;
    starPos[i * 3 + 2] = Math.sin(u) * q * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xc8e8ff,
      size: 1.25,
      sizeAttenuation: false,
      fog: false,
      transparent: true,
      opacity: 0.45,
    })
  );
  scene.add(stars);

  // Bake 512x512 Full-Perimeter Bathymetry & Shoreline Wave-Lap Map around all of RINGS
  const coastCanvas = document.createElement('canvas');
  coastCanvas.width = coastCanvas.height = 512;
  const cCtx = coastCanvas.getContext('2d');
  const sc = 512 / (2 * R);
  cCtx.fillStyle = '#000';
  cCtx.fillRect(0, 0, 512, 512);

  const traceCoast = () => {
    cCtx.beginPath();
    RINGS.forEach((r) => {
      r.forEach((p, i) => {
        const X = (p[0] + R) * sc;
        const Y = (p[1] + R) * sc;
        i ? cCtx.lineTo(X, Y) : cCtx.moveTo(X, Y);
      });
      cCtx.closePath();
    });
  };

  // Gentle shallow turquoise shelf around the entire perimeter (Red channel)
  cCtx.save();
  cCtx.strokeStyle = 'rgba(220, 120, 0, 0.75)';
  cCtx.shadowColor = '#ff8800';
  cCtx.shadowBlur = 14;
  cCtx.lineWidth = 5;
  traceCoast();
  cCtx.stroke();
  cCtx.restore();

  // Subtle shoreline wave-lap zone around the outer wall perimeter (Blue channel)
  cCtx.save();
  cCtx.strokeStyle = 'rgba(0, 180, 255, 0.85)';
  cCtx.shadowColor = '#00b4ff';
  cCtx.shadowBlur = 4;
  cCtx.lineWidth = 4;
  traceCoast();
  cCtx.stroke();
  cCtx.restore();

  // Solid interior land & island mask (Green channel = 1.0) so ocean water never goes inland
  cCtx.save();
  cCtx.fillStyle = 'rgb(0, 255, 0)';
  traceCoast();
  cCtx.fill();
  cCtx.restore();

  const coastTex = new THREE.CanvasTexture(coastCanvas);
  coastTex.wrapS = coastTex.wrapT = THREE.ClampToEdgeWrapping;
  waterUniforms.uCoastTex = { value: coastTex };

  // Real 3D Moving Ocean Shader (4-train Gerstner Swells + Capillary Waves + Caustics + Fresnel)
  const oceanVS = `
    uniform float uT;
    uniform sampler2D uCoastTex;
    varying vec2 vP;
    varying vec3 vWorldPos;
    varying float vWaveElev;

    vec3 evalGerstner(vec2 p, float t) {
      vec3 disp = vec3(0.0);

      // Wave 1: Primary ESE Indian Ocean trade swell
      vec2 d1 = vec2(-0.88, -0.47);
      float ph1 = dot(d1, p) * 0.42 + t * 1.45;
      disp.xz += d1 * (0.14 * cos(ph1));
      disp.y  += 0.22 * sin(ph1);

      // Wave 2: Cross-swell from NE monsoon
      vec2 d2 = vec2(-0.62, 0.78);
      float ph2 = dot(d2, p) * 0.65 + t * 1.85;
      disp.xz += d2 * (0.09 * cos(ph2));
      disp.y  += 0.14 * sin(ph2);

      // Wave 3: Medium chop
      vec2 d3 = vec2(-0.95, 0.31);
      float ph3 = dot(d3, p) * 1.15 - t * 2.2;
      disp.y  += 0.08 * sin(ph3);

      // Wave 4: Short wind waves
      vec2 d4 = vec2(-0.38, -0.92);
      float ph4 = dot(d4, p) * 1.75 + t * 2.75;
      disp.y  += 0.05 * sin(ph4);

      return disp;
    }

    void main() {
      vec2 baseXZ = position.xz;
      vec2 coastUV = vec2((baseXZ.x + 68.0) / 136.0, 1.0 - (baseXZ.y + 68.0) / 136.0);
      vec4 cMask = texture2D(uCoastTex, clamp(coastUV, 0.0, 1.0));
      float wallDamp = 1.0 - smoothstep(0.08, 0.55, cMask.g);

      vec3 d = evalGerstner(baseXZ, uT) * wallDamp;
      float rimFade = 1.0 - smoothstep(56.0, 68.0, length(baseXZ));
      vec3 displaced = position + vec3(d.x, d.y * rimFade, d.z) * rimFade;

      vP = displaced.xz;
      vWaveElev = d.y * rimFade;
      vec4 wp = modelMatrix * vec4(displaced, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const oceanFS = `
    uniform float uT;
    uniform float uNino;
    uniform sampler2D uCoastTex;
    varying vec2 vP;
    varying vec3 vWorldPos;
    varying float vWaveElev;

    float waterHeight(vec2 p, float t) {
      float h = 0.0;
      h += 0.22 * sin(dot(vec2(-0.88, -0.47), p) * 0.42 + t * 1.45);
      h += 0.14 * sin(dot(vec2(-0.62,  0.78), p) * 0.65 + t * 1.85);
      h += 0.08 * sin(dot(vec2(-0.95,  0.31), p) * 1.15 - t * 2.20);
      h += 0.05 * sin(dot(vec2(-0.38, -0.92), p) * 1.75 + t * 2.75);
      h += 0.025 * sin(p.x * 3.4 + p.y * 2.1 + t * 3.8) * cos(p.y * 3.1 - p.x * 1.8 - t * 3.2);
      h += 0.015 * cos(p.x * 5.8 - p.y * 4.6 + t * 4.5);
      return h;
    }

    float causticsPattern(vec2 p, float t) {
      vec2 uv1 = p * 0.85 + vec2(t * 0.35, -t * 0.28);
      vec2 uv2 = p * 1.15 + vec2(-t * 0.42, t * 0.31);
      float c1 = abs(sin(uv1.x + sin(uv1.y * 1.4)) * cos(uv1.y + cos(uv1.x * 1.3)));
      float c2 = abs(sin(uv2.x - cos(uv2.y * 1.5)) * cos(uv2.y - sin(uv2.x * 1.2)));
      return pow(1.0 - min(c1, c2), 4.0);
    }

    void main() {
      float rad = length(vP);
      if (rad > 68.0) discard;

      vec2 uv = vec2((vP.x + 68.0) / 136.0, 1.0 - (vP.y + 68.0) / 136.0);
      vec4 coastSample = texture2D(uCoastTex, clamp(uv, 0.0, 1.0));
      // Strictly clip ocean water outside Mainland Tanzania, Zanzibar, Pemba & Mafia
      if (coastSample.g > 0.42) discard;

      float reefShelf = coastSample.r;
      float surfZone = coastSample.b;

      float eps = 0.16;
      float hC = waterHeight(vP, uT);
      float hX = waterHeight(vP + vec2(eps, 0.0), uT) - hC;
      float hZ = waterHeight(vP + vec2(0.0, eps), uT) - hC;
      vec3 waveN = normalize(vec3(-hX * 3.2, 1.0, -hZ * 3.2));

      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 sunDir = normalize(vec3(-0.42, 0.68, 0.32));

      float cosTheta = max(0.0, dot(viewDir, waveN));
      float fresnel = 0.04 + 0.96 * pow(1.0 - cosTheta, 4.0);

      vec3 abyssalOcean = vec3(0.02, 0.09, 0.18);
      vec3 pelagicOcean = vec3(0.04, 0.24, 0.39);
      vec3 turquoiseReef = vec3(0.05, 0.30, 0.42);
      vec3 skyRefl = mix(vec3(0.18, 0.42, 0.64), vec3(0.45, 0.72, 0.92), cosTheta);

      float swellFactor = clamp(hC * 1.8 + 0.5, 0.0, 1.0);
      vec3 col = mix(abyssalOcean, pelagicOcean, swellFactor * 0.85);

      // Subsurface turquoise scattering through wave crests
      float sss = clamp(vWaveElev * 2.2 + 0.2, 0.0, 1.0) * pow(max(0.0, dot(viewDir, -sunDir + waveN * 0.6)), 2.0);
      col += vec3(0.04, 0.28, 0.36) * sss * 0.38;

      // Subtle deeper coastal shelf water where the ocean meets the 3D border wall
      if (reefShelf > 0.02) {
        float cPat = causticsPattern(vP, uT);
        vec3 lagoonCol = turquoiseReef + vec3(0.06, 0.12, 0.14) * cPat * reefShelf;
        col = mix(col, lagoonCol, clamp(reefShelf * 0.55, 0.0, 0.48));
      }

      col = mix(col, skyRefl, fresnel * 0.50);

      // Subtle, muted water lap at the base of the outer border wall (no bright glare)
      if (surfZone > 0.15) {
        float lap = sin(surfZone * 20.0 - uT * 2.4 + hC * 3.5) * 0.5 + 0.5;
        float foam = smoothstep(0.68, 0.94, lap) * smoothstep(0.15, 0.80, surfZone);
        col = mix(col, vec3(0.52, 0.65, 0.74), foam * 0.16);
      }

      vec3 halfV = normalize(sunDir + viewDir);
      float specBroad = pow(max(0.0, dot(waveN, halfV)), 28.0) * 0.22;
      float specSharp = pow(max(0.0, dot(waveN, halfV)), 140.0) * 0.75;
      col += vec3(0.95, 0.96, 0.92) * (specBroad + specSharp);

      float edgeFade = 1.0 - smoothstep(0.82, 1.0, rad / 68.0) * 0.65;
      col *= edgeFade;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const oceanMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * R, 2 * R, 160, 160).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      vertexShader: oceanVS,
      fragmentShader: oceanFS,
    })
  );
  scene.add(oceanMesh);

  // Optional meteorological radar sweep (off by default)
  const sweepVS = `
    varying vec2 vP;
    void main() {
      vP = position.xz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const sweepFS = `
    uniform float uT;
    varying vec2 vP;
    void main() {
      float r = length(vP) / 68.0;
      if (r > 1.0) discard;
      float a = atan(vP.y, vP.x);
      float s = fract((a - uT * 0.42) / 6.2831853);
      float alpha = pow(1.0 - s, 8.0) * 0.11 * (1.0 - smoothstep(0.85, 1.0, r));
      gl_FragColor = vec4(0.28, 0.85, 1.0, alpha);
    }
  `;
  const sweep = new THREE.Mesh(
    new THREE.CircleGeometry(R, 96).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: sweepVS,
      fragmentShader: sweepFS,
    })
  );
  sweep.position.y = 10.2;
  sweep.visible = false;
  scene.add(sweep);

  const rings = [];
  [
    [R + 1.5, 0, 0x3fd6ff, 0.75, 8, 1.2],
    [R + 4.2, -0.8, 0x2a6f94, 0.45, 3, 2],
    [R + 7.2, -1.6, 0xff7b3d, 0.32, 4, 2.5],
  ].forEach(([r, y, c, o, d, g]) => {
    const pts = [];
    for (let k = 0; k <= 160; k++) {
      const a = (k / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const l = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineDashedMaterial({ color: c, dashSize: d, gapSize: g, transparent: true, opacity: o })
    );
    l.computeLineDistances();
    l.position.y = y;
    l.visible = false;
    scene.add(l);
    rings.push(l);
  });

  const makeLineSeg = (arr, color, opacity) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const m = new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    );
    scene.add(m);
    return m;
  };

  // Subtle lat/lon graticule on ocean
  const gp = [];
  const addGridLine = (f) => {
    for (let u = -R; u < R; u += 1.5) {
      const a = f(u),
        b = f(u + 1.5);
      if (Math.hypot(a[0], a[1]) < R - 1 && Math.hypot(b[0], b[1]) < R - 1) {
        gp.push(a[0], 0.05, a[1], b[0], 0.05, b[1]);
      }
    }
  };
  for (let lo = 30; lo <= 42; lo += 2) addGridLine((u) => [wp(lo, 0)[0], u]);
  for (let la = 0; la >= -14; la -= 2) addGridLine((u) => [u, wp(0, la)[1]]);
  makeLineSeg(gp, 0x2a6f94, 0.14);

  // Country & regional line borders kept off so natural satellite terrain & full-perimeter beaches are unobstructed
  const countryBorder = new THREE.Group();
  const regLines = new THREE.Group();

  return { oceanMesh, rings, regLines, countryBorder, sweep };
}
