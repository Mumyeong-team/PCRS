// ================================================================
//  Fashion Avatar - main.js (localStorage 연동 버전)
// ================================================================

let USER = { gender: null, height: null, shoulder: null, chest: null, waist: null };
let SERVER_BODY_DATA = null;

// ── localStorage에서 체형 데이터 읽기 ─────────────────────────
function loadFromLocalStorage() {
  try {
    const stored = localStorage.getItem('analysisResult');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const source =
      parsed.body_analysis ? parsed :
      parsed.apiResponse?.result ? parsed.apiResponse.result :
      parsed.result ? parsed.result :
      parsed.apiResponse;
    if (!source?.body_analysis) return null;
    return source;
  } catch (e) {
    console.warn('[localStorage] 파싱 실패:', e);
    return null;
  }
}

function applyStoredData(source) {
  if (!source) return;
  SERVER_BODY_DATA = source;
  const input   = source.user_input  ?? {};
  const metrics = source.body_metrics ?? {};
  if (input.gender)    USER.gender   = input.gender;
  if (input.height_cm) USER.height   = input.height_cm;
  if (metrics.shoulder_width) USER.shoulder = Math.round(metrics.shoulder_width * 200);
  if (metrics.waist_width)    USER.waist    = Math.round(metrics.waist_width    * 200);
  USER.chest  = USER.shoulder ? Math.round(USER.shoulder * 2.1) : 100;
  if (!USER.height) USER.height = 170;
  setApiStatus('ok', '● 체형 데이터 연동됨');
}

// ── 사이즈 스펙 ───────────────────────────────────────────────
const OUTFIT_SPECS = {
  outfit1: { sizes: {
    S:  { shoulder: 44, chest: 96,  waist: 80 },
    M:  { shoulder: 46, chest: 100, waist: 84 },
    L:  { shoulder: 48, chest: 104, waist: 88 },
    XL: { shoulder: 50, chest: 108, waist: 94 },
  }},
  outfit2: { sizes: {
    S:  { shoulder: 43, chest: 94,  waist: 78 },
    M:  { shoulder: 45, chest: 98,  waist: 82 },
    L:  { shoulder: 47, chest: 102, waist: 86 },
    XL: { shoulder: 49, chest: 106, waist: 92 },
  }},
  outfit3: { sizes: {
    S:  { shoulder: 44, chest: 96,  waist: 76 },
    M:  { shoulder: 46, chest: 100, waist: 80 },
    L:  { shoulder: 48, chest: 104, waist: 84 },
    XL: { shoulder: 50, chest: 108, waist: 90 },
  }},
};

const OUTFIT_LIST = {
  outfit1: { path: 'clothes/outfit1.glb' },
  outfit2: { path: 'clothes/outfit2.glb' },
  outfit3: { path: 'clothes/outfit3.glb' },
};

const SIZE_SCALE = { S: 0.88, M: 0.95, L: 1.03, XL: 1.11 };

// ── 핏 판정 ───────────────────────────────────────────────────
function judgePartFit(userVal, clothVal) {
  const diff = userVal - clothVal;
  if (diff < -4) return { label: '헐렁', icon: '↔', color: '#6a8fcc', score: -1 };
  if (diff > 3)  return { label: '타이트', icon: '!', color: '#cc6a6a', score: 1 };
  return              { label: '맞음', icon: '✓', color: '#6acc8f', score: 0 };
}

function getRecommendedSize(outfitKey) {
  const spec = OUTFIT_SPECS[outfitKey];
  if (!spec || !USER.shoulder) return 'M';
  let bestSize = 'M', bestScore = Infinity;
  ['S','M','L','XL'].forEach(sz => {
    const s = spec.sizes[sz];
    const score = Math.abs(USER.shoulder - s.shoulder) * 1.5
                + Math.abs(USER.chest    - s.chest)
                + Math.abs(USER.waist    - s.waist) * 0.8;
    if (score < bestScore) { bestScore = score; bestSize = sz; }
  });
  return bestSize;
}

function updateFitUI() {
  const spec = OUTFIT_SPECS[currentOutfitKey];
  if (!spec || !USER.shoulder) return;
  const recSize = getRecommendedSize(currentOutfitKey);
  const s = spec.sizes[recSize];
  const sh = judgePartFit(USER.shoulder, s.shoulder);
  const ch = judgePartFit(USER.chest,    s.chest);
  const wa = judgePartFit(USER.waist,    s.waist);

  const recEl = document.getElementById('fit-rec-size');
  if (recEl) recEl.textContent = recSize;

  [
    { id: 'fit-shoulder', fit: sh, label: '어깨' },
    { id: 'fit-chest',    fit: ch, label: '가슴' },
    { id: 'fit-waist',    fit: wa, label: '허리' },
  ].forEach(({ id, fit, label }) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `
      <span class="fit-part-label">${label}</span>
      <span class="fit-part-val" style="color:${fit.color}">${fit.icon} ${fit.label}</span>
    `;
  });

  const scores = [sh.score, ch.score, wa.score];
  const tight  = scores.filter(s => s > 0).length;
  const loose  = scores.filter(s => s < 0).length;
  const msgEl  = document.getElementById('fit-summary');
  if (msgEl) {
    if (tight === 0 && loose === 0) {
      msgEl.textContent = '전체적으로 딱 맞아요!'; msgEl.style.color = '#6acc8f';
    } else if (tight > loose) {
      msgEl.textContent = `${recSize}보다 한 사이즈 크게 추천해요`; msgEl.style.color = '#cc6a6a';
    } else if (loose > tight) {
      msgEl.textContent = `${recSize}보다 한 사이즈 작게 추천해요`; msgEl.style.color = '#6a8fcc';
    } else {
      msgEl.textContent = `${recSize} 사이즈가 가장 잘 맞아요`; msgEl.style.color = '#c8b8ff';
    }
  }
}

// ── 온보딩 ────────────────────────────────────────────────────
let selectedGender = null;

function selectGender(g) {
  selectedGender = g;
  document.getElementById('btn-male').classList.toggle('selected',   g === 'male');
  document.getElementById('btn-female').classList.toggle('selected', g === 'female');
  checkSubmit();
}

function checkSubmit() {
  const h  = parseInt(document.getElementById('height-input').value);
  const sh = parseInt(document.getElementById('shoulder-input').value);
  const ch = parseInt(document.getElementById('chest-input').value);
  const wa = parseInt(document.getElementById('waist-input').value);
  const ok = selectedGender
    && h  >= 140 && h  <= 210
    && sh >= 30  && sh <= 65
    && ch >= 60  && ch <= 140
    && wa >= 50  && wa <= 130;
  document.getElementById('ob-submit').disabled = !ok;
}

function startApp() {
  const stored = loadFromLocalStorage();
  if (stored) {
    applyStoredData(stored);
  } else {
    USER.gender   = selectedGender;
    USER.height   = parseInt(document.getElementById('height-input').value);
    USER.shoulder = parseInt(document.getElementById('shoulder-input').value);
    USER.chest    = parseInt(document.getElementById('chest-input').value);
    USER.waist    = parseInt(document.getElementById('waist-input').value);
  }
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('loading').classList.add('show');
  setBarWidth(30);
  setLoadText('아바타 생성 중...');
  initScene();
}

// ── Three.js Scene ────────────────────────────────────────────
let scene, camera, renderer, composer;

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111118);
  scene.fog = new THREE.FogExp2(0x111118, 0.035);

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.2, 3.5);
  camera.lookAt(0, 1.0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.outputEncoding    = THREE.sRGBEncoding;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.physicallyCorrectLights = true;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envTexture = pmremGenerator.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  // 조명
  scene.add(new THREE.AmbientLight(0xffffff, 2.0));

  const key = new THREE.DirectionalLight(0xfff5ee, 3.0);
  key.position.set(0, 8, 8);
  key.target.position.set(0, 1, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 25;
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top   = 3;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.01;
  scene.add(key); scene.add(key.target);

  const fill = new THREE.DirectionalLight(0xaaccff, 2.0);
  fill.position.set(-6, 4, 4);
  fill.target.position.set(0, 1, 0);
  scene.add(fill); scene.add(fill.target);

  const right = new THREE.DirectionalLight(0xffeedd, 1.5);
  right.position.set(6, 4, 4);
  right.target.position.set(0, 1, 0);
  scene.add(right); scene.add(right.target);

  const low = new THREE.DirectionalLight(0xffffff, 1.5);
  low.position.set(0, 0, 6);
  low.target.position.set(0, 0.5, 0);
  scene.add(low); scene.add(low.target);

  const rim = new THREE.DirectionalLight(0xffffff, 2.0);
  rim.position.set(0, 6, -8);
  rim.target.position.set(0, 1, 0);
  scene.add(rim); scene.add(rim.target);

  // 바닥
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4, 64),
    new THREE.MeshStandardMaterial({ color: 0x0e0e1a, roughness: 0.3, metalness: 0.2 })
  );
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.52, 64),
    new THREE.MeshBasicMaterial({ color: 0x2a2040, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.001; scene.add(ring);

  initPostProcessing();
  window.addEventListener('resize', onResize);
  initOrbitControls();
  animate();
  loadOutfit('outfit1');
}

function initPostProcessing() {
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 0.25, 0.5, 0.82
  );
  composer.addPass(bloom);
  const fxaa = new THREE.ShaderPass(THREE.FXAAShader);
  fxaa.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
  composer.addPass(fxaa);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  const fxaaPass = composer.passes.find(p => p.uniforms && p.uniforms['resolution']);
  if (fxaaPass) fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
}

// ── Outfit ────────────────────────────────────────────────────
let currentOutfit    = null;
let currentOutfitKey = 'outfit1';
let clothOpacity     = 1.0;
const HEIGHT_SCALE   = () => (USER.height || 170) / 170;

function selectOutfit(key) {
  currentOutfitKey = key;
  Object.keys(OUTFIT_LIST).forEach(k => {
    document.getElementById('btn-' + k)?.classList.toggle('active', k === key);
  });
  loadOutfit(key);
}

function loadOutfit(key) {
  const info = OUTFIT_LIST[key];
  if (!info) return;
  if (currentOutfit) { scene.remove(currentOutfit); currentOutfit = null; }

  new THREE.GLTFLoader().load(info.path, (gltf) => {
    const model = gltf.scene;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach(m => {
            if (m.roughness < 0.6) m.roughness = 0.6;
            m.envMapIntensity = 0.5;
            if (m.map)          m.map.anisotropy = maxAniso;
            if (m.normalMap)    { m.normalMap.anisotropy = maxAniso; m.normalScale.set(0.8, 0.8); }
            if (m.roughnessMap) m.roughnessMap.anisotropy = maxAniso;
            if (m.metalnessMap) m.metalnessMap.anisotropy = maxAniso;
            if (clothOpacity < 1) { m.transparent = true; m.opacity = clothOpacity; }
            m.needsUpdate = true;
          });
        }
      }
    });

    const box  = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const recSize   = getRecommendedSize(key) || 'M';
    const sizeScale = SIZE_SCALE[recSize] || 0.95;
    const targetH   = HEIGHT_SCALE() * 1.8;
    const maxDim    = Math.max(size.x, size.y, size.z);
    if (maxDim > 0.001) model.scale.setScalar((targetH / maxDim) * sizeScale);

    const newBox = new THREE.Box3().setFromObject(model);
    model.position.y = -newBox.min.y;
    currentOutfit = model;
    scene.add(model);

    updateBodyUI();
    updateFitUI();

    setBarWidth(100);
    setTimeout(() => {
      document.getElementById('loading').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('loading').classList.remove('show');
        document.getElementById('loading').style.opacity = '1';
        document.getElementById('ui').style.display = 'flex';
      }, 500);
    }, 300);
  },
  null,
  () => setLoadText('❌ clothes/ 폴더에 outfit 파일 넣어주세요'));
}

function updateBodyUI() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('ui-gender',   USER.gender === 'male' ? '남성' : '여성');
  set('ui-height',   (USER.height   || '—') + (USER.height   ? ' cm' : ''));
  set('ui-shoulder', (USER.shoulder || '—') + (USER.shoulder ? ' cm' : ''));
  set('ui-chest',    (USER.chest    || '—') + (USER.chest    ? ' cm' : ''));
  set('ui-waist',    (USER.waist    || '—') + (USER.waist    ? ' cm' : ''));

  if (SERVER_BODY_DATA?.body_analysis) {
    const BODY_TYPE_MAP = {
      inverted_triangle: '역삼각형', triangle: '삼각형',
      rectangle: '직사각형', hourglass: '모래시계형',
      round: '둥근형', balanced: '균형형',
    };
    const PROPORTION_MAP = {
      long_upper_body: '상체가 긴 비율',
      long_legs: '다리가 긴 비율',
      balanced_proportion: '균형 비율',
    };
    const b = SERVER_BODY_DATA.body_analysis;
    set('ui-body-type',  BODY_TYPE_MAP[b.body_type]   || b.body_type  || '—');
    set('ui-proportion', PROPORTION_MAP[b.proportion] || b.proportion || '—');
  }
}

function updateOpacity() {
  clothOpacity = parseInt(document.getElementById('op-slider').value) / 100;
  document.getElementById('op-out').textContent = Math.round(clothOpacity * 100) + '%';
  if (!currentOutfit) return;
  currentOutfit.traverse((node) => {
    if (node.isMesh && node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(m => { m.transparent = clothOpacity < 1; m.opacity = clothOpacity; });
    }
  });
}

function onSliderChange() {
  const sh = parseFloat(document.getElementById('sh-slider').value);
  const wa = parseFloat(document.getElementById('wa-slider').value);
  const lg = parseFloat(document.getElementById('lg-slider').value);
  document.getElementById('sh-out').textContent = sh.toFixed(2);
  document.getElementById('wa-out').textContent = wa.toFixed(2);
  document.getElementById('lg-out').textContent = lg.toFixed(2);
  if (!currentOutfit) return;
  currentOutfit.traverse((node) => {
    if (node.isBone) {
      const n = node.name;
      if (n.includes('Shoulder')) node.scale.set(1, 1, sh);
      else if (n.includes('Spine') && !n.includes('1') && !n.includes('2')) node.scale.set(wa, 1, wa);
      else if (n.includes('UpLeg') || n.includes('Leg')) node.scale.set(1, lg, 1);
      else node.scale.set(1, 1, 1);
    }
  });
}

// ── OrbitControls ─────────────────────────────────────────────
let isDragging = false, prevMouse = { x: 0, y: 0 };
let sph = { theta: 0, phi: Math.PI / 3, radius: 3.5 };
const lookTarget = new THREE.Vector3(0, 1.0, 0);

function initOrbitControls() {
  const el = renderer.domElement;
  el.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    sph.theta -= (e.clientX - prevMouse.x) * 0.008;
    sph.phi    = Math.max(0.12, Math.min(Math.PI * 0.88, sph.phi + (e.clientY - prevMouse.y) * 0.005));
    prevMouse  = { x: e.clientX, y: e.clientY };
  });
  el.addEventListener('wheel', e => {
    sph.radius = Math.max(1.5, Math.min(8, sph.radius + e.deltaY * 0.005));
  }, { passive: true });
  el.addEventListener('touchstart', e => { isDragging = true; prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; });
  window.addEventListener('touchend', () => isDragging = false);
  window.addEventListener('touchmove', e => {
    if (!isDragging) return;
    sph.theta -= (e.touches[0].clientX - prevMouse.x) * 0.008;
    sph.phi    = Math.max(0.12, Math.min(Math.PI * 0.88, sph.phi + (e.touches[0].clientY - prevMouse.y) * 0.005));
    prevMouse  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (!camera || !renderer || !scene) return;
  camera.position.x = lookTarget.x + sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta);
  camera.position.y = lookTarget.y + sph.radius * Math.cos(sph.phi);
  camera.position.z = lookTarget.z + sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta);
  camera.lookAt(lookTarget);
  composer.render();
}

function setLoadText(t) { const el = document.getElementById('load-text'); if (el) el.textContent = t; }
function setBarWidth(p)  { const el = document.getElementById('bar-fill');  if (el) el.style.width = p + '%'; }
function setApiStatus(cls, text) { const el = document.getElementById('api-status'); if (el) { el.className = cls; el.textContent = text; } }

// ── DOM 이벤트 연결 ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-male')?.addEventListener('click',    () => selectGender('male'));
  document.getElementById('btn-female')?.addEventListener('click',  () => selectGender('female'));
  document.getElementById('ob-submit')?.addEventListener('click',   () => startApp());
  document.getElementById('btn-outfit1')?.addEventListener('click', () => selectOutfit('outfit1'));
  document.getElementById('btn-outfit2')?.addEventListener('click', () => selectOutfit('outfit2'));
  document.getElementById('btn-outfit3')?.addEventListener('click', () => selectOutfit('outfit3'));
  document.getElementById('op-slider')?.addEventListener('input',   updateOpacity);
  document.getElementById('sh-slider')?.addEventListener('input',   onSliderChange);
  document.getElementById('wa-slider')?.addEventListener('input',   onSliderChange);
  document.getElementById('lg-slider')?.addEventListener('input',   onSliderChange);
  ['height-input','shoulder-input','chest-input','waist-input'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', checkSubmit);
  });

  // localStorage 데이터 있으면 온보딩 스킵하고 바로 시작
  const stored = loadFromLocalStorage();
  if (stored) {
    applyStoredData(stored);
    document.getElementById('onboarding').style.display = 'none';
    document.getElementById('loading').classList.add('show');
    setBarWidth(60);
    setLoadText('체형 데이터 불러오는 중...');
    setTimeout(() => initScene(), 100);
  }
});