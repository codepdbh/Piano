import * as THREE from "three";

const canvas = document.querySelector("#piano-canvas");
const labelLayer = document.querySelector("#label-layer");
const stagePanel = document.querySelector(".stage-panel");
const rangeReadout = document.querySelector("#range-readout");
const soundSelect = document.querySelector("#sound-select");
const volumeSlider = document.querySelector("#volume-slider");
const rangeButtons = [...document.querySelectorAll(".range-button")];

const NOTE_START = 48;
const NOTE_COUNT = 36;
const WHITE_WIDTH = 1;
const WHITE_COUNT = 21;
const KEY_CENTER = (WHITE_COUNT - 1) / 2;
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BLACK_PITCHES = new Set([1, 3, 6, 8, 10]);
const RANGE_OFFSETS = [0, 12];
const tempVector = new THREE.Vector3();

const KEY_BINDINGS = [
  { code: "KeyZ", label: "Z" },
  { code: "KeyS", label: "S" },
  { code: "KeyX", label: "X" },
  { code: "KeyD", label: "D" },
  { code: "KeyC", label: "C" },
  { code: "KeyV", label: "V" },
  { code: "KeyG", label: "G" },
  { code: "KeyB", label: "B" },
  { code: "KeyH", label: "H" },
  { code: "KeyN", label: "N" },
  { code: "KeyJ", label: "J" },
  { code: "KeyM", label: "M" },
  { code: "KeyQ", label: "Q" },
  { code: "Digit2", label: "2" },
  { code: "KeyW", label: "W" },
  { code: "Digit3", label: "3" },
  { code: "KeyE", label: "E" },
  { code: "KeyR", label: "R" },
  { code: "Digit5", label: "5" },
  { code: "KeyT", label: "T" },
  { code: "Digit6", label: "6" },
  { code: "KeyY", label: "Y" },
  { code: "Digit7", label: "7" },
  { code: "KeyU", label: "U" },
];

const PRESETS = {
  clavecin: {
    attack: 0.004,
    decay: 0.18,
    sustain: 0.012,
    release: 0.18,
    filterType: "highpass",
    filterFrequency: 180,
    q: 0.4,
    partials: [
      { type: "sawtooth", ratio: 1, gain: 0.38 },
      { type: "square", ratio: 2, gain: 0.14 },
      { type: "triangle", ratio: 3, gain: 0.08 },
    ],
  },
  organo: {
    attack: 0.035,
    decay: 0.08,
    sustain: 0.62,
    release: 0.75,
    filterType: "lowpass",
    filterFrequency: 6200,
    q: 0.6,
    partials: [
      { type: "sine", ratio: 0.5, gain: 0.14 },
      { type: "sine", ratio: 1, gain: 0.38 },
      { type: "triangle", ratio: 2, gain: 0.18 },
      { type: "sine", ratio: 3, gain: 0.08 },
    ],
  },
  cristal: {
    attack: 0.008,
    decay: 0.62,
    sustain: 0.16,
    release: 1.18,
    filterType: "lowpass",
    filterFrequency: 8400,
    q: 0.25,
    partials: [
      { type: "sine", ratio: 1, gain: 0.34 },
      { type: "triangle", ratio: 2.01, gain: 0.11 },
      { type: "sine", ratio: 3.01, gain: 0.08 },
    ],
  },
  bronce: {
    attack: 0.012,
    decay: 0.24,
    sustain: 0.24,
    release: 0.52,
    filterType: "lowpass",
    filterFrequency: 2800,
    q: 1.8,
    partials: [
      { type: "sawtooth", ratio: 1, gain: 0.32 },
      { type: "square", ratio: 1.99, gain: 0.1 },
      { type: "triangle", ratio: 0.5, gain: 0.08 },
    ],
  },
  analogico: {
    attack: 0.016,
    decay: 0.18,
    sustain: 0.34,
    release: 0.34,
    filterType: "lowpass",
    filterFrequency: 1900,
    q: 1.1,
    partials: [
      { type: "sawtooth", ratio: 1, gain: 0.35 },
      { type: "sawtooth", ratio: 1.005, gain: 0.24 },
      { type: "square", ratio: 0.5, gain: 0.06 },
    ],
  },
};

let currentPreset = soundSelect.value;
let currentRange = 0;
let noteToBinding = new Map();
let audioEngine;

const pressedCodes = new Map();
const activePointers = new Map();
const notePressCounts = Array.from({ length: NOTE_COUNT }, () => 0);
const keys = [];
const labels = [];
const pickableMeshes = [];

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x130b10, 0.032);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

const materials = {
  whiteKey: new THREE.MeshStandardMaterial({
    color: 0xf4ead8,
    roughness: 0.34,
    metalness: 0.03,
  }),
  blackKey: new THREE.MeshStandardMaterial({
    color: 0x100c10,
    roughness: 0.46,
    metalness: 0.16,
  }),
  lacquer: new THREE.MeshStandardMaterial({
    color: 0x170e14,
    roughness: 0.26,
    metalness: 0.12,
  }),
  wineWood: new THREE.MeshStandardMaterial({
    color: 0x4a1828,
    roughness: 0.42,
    metalness: 0.08,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xd4ae55,
    roughness: 0.22,
    metalness: 0.72,
  }),
  mutedGold: new THREE.MeshStandardMaterial({
    color: 0x8e6b27,
    roughness: 0.34,
    metalness: 0.52,
  }),
  felt: new THREE.MeshStandardMaterial({
    color: 0x15372f,
    roughness: 0.75,
    metalness: 0.02,
  }),
};

initLights();
buildPiano();
createLabels();
applyRange(0);
bindEvents();
resize();
animate();

class SynthEngine {
  constructor() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.output = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.delay = this.context.createDelay(1);
    this.feedback = this.context.createGain();
    this.wet = this.context.createGain();

    this.output.gain.value = Number(volumeSlider.value);
    this.delay.delayTime.value = 0.16;
    this.feedback.gain.value = 0.18;
    this.wet.gain.value = 0.12;

    this.output.connect(this.compressor);
    this.output.connect(this.delay);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.wet);
    this.wet.connect(this.compressor);
    this.compressor.connect(this.context.destination);
  }

  async resume() {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  setVolume(value) {
    const now = this.context.currentTime;
    this.output.gain.setTargetAtTime(value, now, 0.02);
  }

  noteOn(noteIndex) {
    const now = this.context.currentTime;
    const preset = PRESETS[currentPreset];
    const midi = NOTE_START + noteIndex;
    const frequency = midiToFrequency(midi);
    const voiceGain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const oscillators = [];

    filter.type = preset.filterType;
    filter.frequency.value = preset.filterFrequency;
    filter.Q.value = preset.q;

    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(0.86, now + preset.attack);
    voiceGain.gain.setTargetAtTime(preset.sustain, now + preset.attack, preset.decay);
    voiceGain.connect(this.output);
    filter.connect(voiceGain);

    for (const partial of preset.partials) {
      const oscillator = this.context.createOscillator();
      const partialGain = this.context.createGain();

      oscillator.type = partial.type;
      oscillator.frequency.value = frequency * partial.ratio;
      partialGain.gain.value = partial.gain;
      oscillator.connect(partialGain);
      partialGain.connect(filter);
      oscillator.start(now);
      oscillators.push(oscillator);
    }

    return {
      gain: voiceGain,
      oscillators,
      release: preset.release,
      stopped: false,
    };
  }

  noteOff(voice) {
    if (!voice || voice.stopped) {
      return;
    }

    const now = this.context.currentTime;
    voice.stopped = true;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.0001, now, Math.max(0.02, voice.release / 3));

    const stopAt = now + voice.release + 0.08;
    for (const oscillator of voice.oscillators) {
      oscillator.stop(stopAt);
    }

    window.setTimeout(() => {
      voice.gain.disconnect();
    }, (voice.release + 0.18) * 1000);
  }
}

function initLights() {
  const ambient = new THREE.HemisphereLight(0xf8dfae, 0x150c15, 1.45);
  const keyLight = new THREE.DirectionalLight(0xffe6b2, 3.3);
  const fillLight = new THREE.PointLight(0x8ef0d0, 2.6, 30);
  const rimLight = new THREE.PointLight(0xb94165, 2.2, 32);

  keyLight.position.set(-4, 8, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 28;
  keyLight.shadow.camera.left = -13;
  keyLight.shadow.camera.right = 13;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  fillLight.position.set(7, 4, 2);
  rimLight.position.set(-8, 3, -6);

  scene.add(ambient, keyLight, fillLight, rimLight);
}

function buildPiano() {
  const piano = new THREE.Group();
  piano.rotation.x = -0.08;
  scene.add(piano);

  const keyboardWidth = WHITE_COUNT * WHITE_WIDTH;
  const base = makeBox(keyboardWidth + 1.6, 0.36, 6.25, materials.lacquer, 0, 0.28, 0.08);
  const felt = makeBox(keyboardWidth + 0.8, 0.06, 0.52, materials.felt, 0, 0.53, -2.55);
  const frontRail = makeBox(keyboardWidth + 1.9, 0.72, 0.42, materials.wineWood, 0, 0.76, 3.05);
  const backRail = makeBox(keyboardWidth + 2.2, 1.04, 0.52, materials.wineWood, 0, 0.98, -3.08);
  const leftCheek = makeBox(0.72, 1.08, 6.45, materials.wineWood, -keyboardWidth / 2 - 0.58, 0.9, 0.03);
  const rightCheek = makeBox(0.72, 1.08, 6.45, materials.wineWood, keyboardWidth / 2 + 0.58, 0.9, 0.03);
  const musicStand = makeBox(7.6, 1.96, 0.18, materials.lacquer, 0, 2.25, -3.92);
  const standTrim = makeBox(8.0, 0.08, 0.22, materials.gold, 0, 3.27, -3.81);

  musicStand.rotation.x = -0.14;
  standTrim.rotation.x = -0.14;
  piano.add(base, felt, frontRail, backRail, leftCheek, rightCheek, musicStand, standTrim);

  addTrim(piano, keyboardWidth);
  addLegs(piano, keyboardWidth);
  addBaroqueDetails(piano, keyboardWidth);
  addKeys(piano);
}

function addKeys(piano) {
  const whiteGeometry = new THREE.BoxGeometry(0.94, 0.24, 5.14);
  const blackGeometry = new THREE.BoxGeometry(0.56, 0.46, 3.05);
  let whiteSeen = 0;

  for (let index = 0; index < NOTE_COUNT; index += 1) {
    const midi = NOTE_START + index;
    const pitch = midi % 12;
    const isBlack = BLACK_PITCHES.has(pitch);
    const material = (isBlack ? materials.blackKey : materials.whiteKey).clone();
    const geometry = isBlack ? blackGeometry : whiteGeometry;
    let x;
    let y;
    let z;

    if (isBlack) {
      x = (whiteSeen - 0.5 - KEY_CENTER) * WHITE_WIDTH;
      y = 0.82;
      z = -0.82;
    } else {
      x = (whiteSeen - KEY_CENTER) * WHITE_WIDTH;
      y = 0.63;
      z = 0.3;
      whiteSeen += 1;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.noteIndex = index;
    mesh.userData.keyType = isBlack ? "black" : "white";

    const anchor = new THREE.Object3D();
    anchor.position.set(x, isBlack ? 1.24 : 1.0, isBlack ? -0.45 : 1.92);

    piano.add(mesh, anchor);
    pickableMeshes.push(mesh);
    keys[index] = {
      anchor,
      baseColor: material.color.clone(),
      baseY: y,
      isBlack,
      material,
      mesh,
    };
  }
}

function addTrim(piano, keyboardWidth) {
  const trimPieces = [
    [keyboardWidth + 2.05, 0.08, 0.08, 0, 1.15, 2.83],
    [keyboardWidth + 2.05, 0.08, 0.08, 0, 1.49, -3.35],
    [0.08, 0.08, 6.38, -keyboardWidth / 2 - 0.96, 1.4, 0],
    [0.08, 0.08, 6.38, keyboardWidth / 2 + 0.96, 1.4, 0],
    [7.2, 0.06, 0.08, 0, 2.34, -3.58],
    [5.8, 0.06, 0.08, 0, 1.6, -3.56],
  ];

  for (const [width, height, depth, x, y, z] of trimPieces) {
    piano.add(makeBox(width, height, depth, materials.gold, x, y, z));
  }
}

function addLegs(piano, keyboardWidth) {
  const legGeometry = new THREE.CylinderGeometry(0.18, 0.28, 2.3, 12);
  const footGeometry = new THREE.SphereGeometry(0.28, 16, 8);
  const legPositions = [
    [-keyboardWidth / 2 - 0.36, -0.94, 2.42],
    [keyboardWidth / 2 + 0.36, -0.94, 2.42],
    [-keyboardWidth / 2 - 0.36, -0.94, -2.62],
    [keyboardWidth / 2 + 0.36, -0.94, -2.62],
  ];

  for (const [x, y, z] of legPositions) {
    const leg = new THREE.Mesh(legGeometry, materials.lacquer);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 24), materials.gold);
    const foot = new THREE.Mesh(footGeometry, materials.mutedGold);

    leg.position.set(x, y, z);
    ring.position.set(x, y + 0.82, z);
    ring.rotation.x = Math.PI / 2;
    foot.position.set(x, y - 1.18, z);
    leg.castShadow = true;
    foot.castShadow = true;
    piano.add(leg, ring, foot);
  }
}

function addBaroqueDetails(piano, keyboardWidth) {
  const scrolls = [
    [-keyboardWidth / 2 + 2.2, 1.03, 3.29, 1],
    [-keyboardWidth / 2 + 4.2, 1.03, 3.29, -1],
    [keyboardWidth / 2 - 4.2, 1.03, 3.29, 1],
    [keyboardWidth / 2 - 2.2, 1.03, 3.29, -1],
  ];

  for (const [x, y, z, direction] of scrolls) {
    piano.add(makeScroll(x, y, z, direction));
  }

  for (const x of [-keyboardWidth / 2 + 0.82, keyboardWidth / 2 - 0.82]) {
    const rosette = new THREE.Mesh(new THREE.TorusKnotGeometry(0.2, 0.035, 80, 8), materials.gold);
    rosette.position.set(x, 1.02, 3.31);
    rosette.rotation.set(Math.PI / 2, 0, 0);
    rosette.castShadow = true;
    piano.add(rosette);
  }
}

function makeScroll(x, y, z, direction) {
  const points = [];
  for (let i = 0; i < 80; i += 1) {
    const t = i / 79;
    const angle = direction * (t * Math.PI * 3.8);
    const radius = 0.08 + t * 0.5;
    points.push(
      new THREE.Vector3(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius * 0.58,
        z,
      ),
    );
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.025, 8, false), materials.gold);
  mesh.castShadow = true;
  return mesh;
}

function makeBox(width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createLabels() {
  for (let index = 0; index < NOTE_COUNT; index += 1) {
    const label = document.createElement("div");
    label.className = `key-label${keys[index].isBlack ? " black" : ""}`;
    label.style.opacity = "0";
    label.style.visibility = "hidden";
    labelLayer.append(label);
    labels[index] = label;
  }
}

function bindEvents() {
  soundSelect.addEventListener("change", () => {
    currentPreset = soundSelect.value;
  });

  volumeSlider.addEventListener("input", () => {
    getAudioEngine().setVolume(Number(volumeSlider.value));
  });

  for (const button of rangeButtons) {
    button.addEventListener("click", () => {
      applyRange(Number(button.dataset.range));
    });
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", releaseAllHeldNotes);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerUp);
  window.addEventListener("resize", resize);

  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(stagePanel);
  }
}

function getAudioEngine() {
  if (!audioEngine) {
    audioEngine = new SynthEngine();
  }

  return audioEngine;
}

function startNote(noteIndex) {
  const engine = getAudioEngine();
  engine.resume();
  pressVisual(noteIndex);
  return engine.noteOn(noteIndex);
}

function stopNote(noteIndex, voice) {
  getAudioEngine().noteOff(voice);
  releaseVisual(noteIndex);
}

function handleKeyDown(event) {
  if (event.code === "AltLeft" && !event.repeat) {
    event.preventDefault();
    applyRange((currentRange + 1) % RANGE_OFFSETS.length);
    return;
  }

  if (event.repeat || isFormElementFocused()) {
    return;
  }

  const bindingIndex = noteToBinding.get(event.code);
  if (bindingIndex === undefined) {
    return;
  }

  event.preventDefault();
  const noteIndex = RANGE_OFFSETS[currentRange] + bindingIndex;
  if (noteIndex >= NOTE_COUNT || pressedCodes.has(event.code)) {
    return;
  }

  const voice = startNote(noteIndex);
  pressedCodes.set(event.code, { noteIndex, voice });
}

function handleKeyUp(event) {
  const held = pressedCodes.get(event.code);
  if (!held) {
    return;
  }

  pressedCodes.delete(event.code);
  stopNote(held.noteIndex, held.voice);
}

function handlePointerDown(event) {
  const noteIndex = pickNote(event);
  if (noteIndex === null) {
    return;
  }

  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  const voice = startNote(noteIndex);
  activePointers.set(event.pointerId, { noteIndex, voice });
}

function handlePointerUp(event) {
  const held = activePointers.get(event.pointerId);
  if (!held) {
    return;
  }

  activePointers.delete(event.pointerId);
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  stopNote(held.noteIndex, held.voice);
}

function pickNote(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(pickableMeshes, false);
  if (!intersections.length) {
    return null;
  }

  return intersections[0].object.userData.noteIndex;
}

function applyRange(rangeIndex) {
  releaseAllHeldNotes();
  currentRange = rangeIndex;
  noteToBinding = new Map();

  labels.forEach((label) => {
    label.textContent = "";
    label.style.opacity = "0";
    label.style.visibility = "hidden";
  });

  KEY_BINDINGS.forEach((binding, bindingIndex) => {
    const noteIndex = RANGE_OFFSETS[currentRange] + bindingIndex;
    if (noteIndex >= NOTE_COUNT) {
      return;
    }

    const label = labels[noteIndex];
    label.textContent = binding.label;
    label.style.opacity = "1";
    label.style.visibility = "visible";
    noteToBinding.set(binding.code, bindingIndex);
  });

  rangeButtons.forEach((button, index) => {
    button.classList.toggle("active", index === currentRange);
  });

  const start = NOTE_START + RANGE_OFFSETS[currentRange];
  const end = Math.min(start + KEY_BINDINGS.length - 1, NOTE_START + NOTE_COUNT - 1);
  rangeReadout.textContent = `${midiToName(start)} - ${midiToName(end)}`;
}

function releaseAllHeldNotes() {
  for (const [code, held] of pressedCodes) {
    getAudioEngine().noteOff(held.voice);
    releaseVisual(held.noteIndex);
    pressedCodes.delete(code);
  }

  for (const [pointerId, held] of activePointers) {
    getAudioEngine().noteOff(held.voice);
    releaseVisual(held.noteIndex);
    activePointers.delete(pointerId);
  }
}

function pressVisual(noteIndex) {
  const key = keys[noteIndex];
  const label = labels[noteIndex];
  notePressCounts[noteIndex] += 1;

  if (notePressCounts[noteIndex] > 1) {
    return;
  }

  key.mesh.position.y = key.baseY - (key.isBlack ? 0.09 : 0.13);
  key.material.color.set(key.isBlack ? 0x2c2026 : 0xffefbd);
  key.material.emissive.set(key.isBlack ? 0x72511d : 0xb68c35);
  key.material.emissiveIntensity = key.isBlack ? 0.5 : 0.28;
  label.classList.add("playing");
}

function releaseVisual(noteIndex) {
  const key = keys[noteIndex];
  const label = labels[noteIndex];
  notePressCounts[noteIndex] = Math.max(0, notePressCounts[noteIndex] - 1);

  if (notePressCounts[noteIndex] > 0) {
    return;
  }

  key.mesh.position.y = key.baseY;
  key.material.color.copy(key.baseColor);
  key.material.emissive.set(0x000000);
  key.material.emissiveIntensity = 0;
  label.classList.remove("playing");
}

function updateLabels() {
  const rect = canvas.getBoundingClientRect();
  for (let index = 0; index < NOTE_COUNT; index += 1) {
    const label = labels[index];
    if (!label.textContent) {
      continue;
    }

    keys[index].anchor.getWorldPosition(tempVector);
    tempVector.project(camera);

    const visible = tempVector.z > -1 && tempVector.z < 1;
    label.style.visibility = visible ? "visible" : "hidden";
    if (!visible) {
      continue;
    }

    const x = (tempVector.x * 0.5 + 0.5) * rect.width;
    const y = (-tempVector.y * 0.5 + 0.5) * rect.height;
    label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  }
}

function resize() {
  const rect = stagePanel.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const isCompact = width < 760;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.set(0, isCompact ? 10.4 : 7.8, isCompact ? 18.2 : 14.2);
  camera.lookAt(0, 0.48, -0.45);
  camera.updateProjectionMatrix();
}

function animate() {
  const time = clock.getElapsedTime();
  camera.position.x = Math.sin(time * 0.16) * 0.34;
  camera.lookAt(0, 0.48, -0.45);
  updateLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function midiToName(midi) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function isFormElementFocused() {
  const tagName = document.activeElement?.tagName;
  return tagName === "SELECT" || tagName === "INPUT" || tagName === "BUTTON";
}
