// High-Performance Post-Processing Pipeline
// UnrealBloomPass (Selective threshold) + Merged Single-Pass Cinematic Grade + Vignette + Film Grain + OutputPass
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const CinematicGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.30 },
    uGrain: { value: 0.008 },
    uContrast: { value: 1.05 },
    uSaturation: { value: 1.06 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uContrast;
    uniform float uSaturation;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 col = tex.rgb;

      // 1. Film S-curve contrast
      col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);

      // 2. Vibrance & Saturation
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(lum), col, uSaturation);

      // 3. Cinematic camera lens vignette
      vec2 coord = (vUv - 0.5) * 2.0;
      float rf = dot(coord, coord) * 0.5;
      float vig = clamp(1.0 - rf * uVignette, 0.0, 1.0);
      col *= vig;

      // 4. Subtle film grain (eliminates gradient banding on sky & ocean)
      float grain = (hash(vUv * 1200.0 + fract(uTime * 0.19)) - 0.5) * uGrain;
      col += grain;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), tex.a);
    }
  `,
};

export function createPostPipeline(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Atmospheric Bloom: High threshold so lightning flashes, ocean sunglint & night windows bloom without haze
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.14, // clean, subtle bloom
    0.35, // radius
    0.95  // high threshold: daylight land never blooms!
  );
  composer.addPass(bloomPass);

  // Merged Single-Pass Cinematic Grade
  const gradePass = new ShaderPass(CinematicGradeShader);
  composer.addPass(gradePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  function resize(w, h) {
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
  }

  function update(dt, time) {
    gradePass.uniforms.uTime.value = time;
  }

  return { composer, bloomPass, gradePass, update, resize };
}
