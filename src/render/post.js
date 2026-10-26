// Post-Processing Pipeline (UnrealBloomPass + ACES Filmic Output)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createPostPipeline(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.16, // subtle atmospheric bloom strength (prevents shoreline/beach washout)
    0.45, // radius
    0.92  // high threshold so only lightning flashes & bright beacon cores bloom
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  function resize(w, h) {
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
  }

  return { composer, bloomPass, resize };
}
