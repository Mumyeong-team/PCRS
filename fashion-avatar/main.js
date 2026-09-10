// ================================================================
//  Fashion Avatar - main.js
//  (URL 파라미터 연동 + 아바타 로드 + 체형 자동반영 + 핏 판정 고도화 +
//   남녀 실측 사이즈표 반영 버전)
// ================================================================

let USER = { gender: null, height: null, shoulder: null, chest: null, waist: null, legLength: null, preferredFit: null };
let SERVER_BODY_DATA = null;

// ── URL 파라미터 또는 localStorage에서 체형 데이터 읽기 ────────
function loadBodyData() {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('data');
    if (encoded) {
      const parsed = JSON.parse(decodeURIComponent(encoded));
      const source =
        parsed.body_analysis ? parsed :
        parsed.apiResponse?.result ? parsed.apiResponse.result :
        parsed.result ? parsed.result :
        parsed.apiResponse;
      if (source?.body_analysis) return source;
    }
  } catch (e) {
    console.warn('[URL] 파싱 실패:', e);
  }

  try {
    const stored = localStorage.getItem('analysisResult');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const source =
      parsed.body_analysis ? parsed :
      parsed.apiResponse?.result ? parsed.apiResponse.result :
      parsed.result ? parsed.result :
      parsed.apiResponse;
    if (source?.body_analysis) return source;
  } catch (e) {
    console.warn('[localStorage] 파싱 실패:', e);
  }

  return null;
}

// 정면 사진에서 잰 waist_width(몸통 가로 폭)는 실제 허리둘레보다 작게 나옴
// (원통형 몸통을 정면에서만 봐서 "폭"만 측정되기 때문 — 둘레의 절반 정도)
// 사이즈표는 실제 허리둘레 기준이라 보정 필요.
// ⚠️ 아래 1.9는 추정치 — 실측 허리둘레(줄자)로 실제 테스트해서 정확한 계수로 다시 맞춰야 함
const WAIST_CIRCUMFERENCE_FACTOR = 1.9;

function applyStoredData(source) {
  if (!source) return;
  SERVER_BODY_DATA = source;
  const input   = source.user_input  ?? {};
  const metrics = source.body_metrics ?? {};

  if (input.gender)        USER.gender       = input.gender;
  if (input.height_cm)     USER.height       = input.height_cm;
  if (input.preferred_fit) USER.preferredFit = input.preferred_fit;

  const bodySpanNormalized = (metrics.upper_body_length || 0) + (metrics.leg_length_avg || 0);

  if (bodySpanNormalized > 0 && USER.height) {
    const scale = USER.height / bodySpanNormalized;
    if (metrics.shoulder_width)  USER.shoulder  = Math.round(metrics.shoulder_width  * scale);
    if (metrics.waist_width)     USER.waist     = Math.round(metrics.waist_width     * scale * WAIST_CIRCUMFERENCE_FACTOR);
    if (metrics.leg_length_avg)  USER.legLength = Math.round(metrics.leg_length_avg  * scale);
  }

  USER.chest = USER.shoulder ? Math.round(USER.shoulder * 2.1) : 100;
  if (!USER.height) USER.height = 170;
  setApiStatus('ok', '● 체형 데이터 연동됨');
}

// ── 공통 사이즈표 (남녀 구분) ────────────────────────────────
// 무신사 스탠다드 실측 사이즈표 기준 (2026.09 확인)
// - 남성: 릴렉스 핏 크루넥 티셔츠 + 데님 디테일 와이드 스웨트 팬츠
// - 여성: 반소매 티셔츠 + 데님 팬츠
// ⚠️ outfit1/2/3 구분 없이 모두 이 공통 기준 사용 (졸업작품 범위상 단순화)
//    남성 S허리/여성 XL허리는 원본 표에 없어 인접 사이즈 간격으로 역산한 추정치
const SIZE_CHART_MALE = {
  S:  { shoulder: 49.5, chest: 106, waist: 68 },
  M:  { shoulder: 51.5, chest: 111, waist: 73 },
  L:  { shoulder: 53,   chest: 116, waist: 78 },
  XL: { shoulder: 54.5, chest: 121, waist: 83 },
};

const SIZE_CHART_FEMALE = {
  S:  { shoulder: 43,   chest: 98,  waist: 70 },
  M:  { shoulder: 44.5, chest: 102, waist: 74 },
  L:  { shoulder: 46,   chest: 107, waist: 78 },
  XL: { shoulder: 47.5, chest: 112, waist: 82 },
};

function getSizeChart() {
  return USER.gender === 'female' ? SIZE_CHART_FEMALE : SIZE_CHART_MALE;
}

const OUTFIT_LIST = {
  outfit1: { path: 'clothes/outfit1.glb' },
  outfit2: { path: 'clothes/outfit2.glb' },
  outfit3: { path: 'clothes/outfit3.glb' },
};

const SIZE_SCALE = { S: 0.88, M: 0.95, L: 1.03, XL: 1.11 };

// ── 아바타 기준 체형값 (레퍼런스) ────────────────────────────
// ⚠️ 임시 추정치. avatar_male.glb / avatar_female.glb를 실측한 값으로 교체 필요
const AVATAR_BASE_METRICS = {
  male:   { shoulder: 45, waist: 82, legLength: 90 },
  female: { shoulder: 40, waist: 72, legLength: 85 },
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ── 체형 JSON → 본 스케일 자동 반영 ─────────────────────────────
function applyBodyMetricsToBones(model, userData) {
  if (!model || !userData?.shoulder || !userData?.waist) return;

  const base = AVATAR_BASE_METRICS[userData.gender] || AVATAR_BASE_METRICS.male;

  const shoulderRatio = clamp(userData.shoulder / base.shoulder, 0.85, 1.3);
  const waistRatio    = clamp(userData.waist    / base.waist,    0.85, 1.3);
  const legRatio      = userData.legLength
    ? clamp(userData.legLength / base.legLength, 0.85, 1.3)
    : 1;

  model.traverse((node) => {
    if (!node.isBone) return;
    const n = node.name;

    if (n === 'mixamorigLeftShoulder' || n === 'mixamorigRightShoulder' || n === 'mixamorigLeftArm' || n === 'mixamorigRightArm') {
      node.scale.set(1, 1, shoulderRatio);
    } else if (n === 'mixamorigSpine' || n === 'mixamorigSpine1' || n === 'mixamorigSpine2' || n === 'mixamorigHips') {
      node.scale.set(waistRatio, 1, waistRatio);
    } else if (n === 'mixamorigLeftUpLeg' || n === 'mixamorigRightUpLeg' || n === 'mixamorigLeftLeg' || n === 'mixamorigRightLeg') {
      node.scale.set(1, legRatio, 1);
    }
    // 키는 본 스케일이 아니라 전체 model.scale(HEIGHT_SCALE)로 처리 (아래 loadAvatar/loadOutfit 참고)
  });
}

// ── 핏 판정 ───────────────────────────────────────────────────

// 부위별 "여유(ease)" 기준값
// - 어깨: 거의 여유 없어야 핏이 삼 (허용 범위 좁음)
// - 가슴/허리: 원래도 여유 있게 만드는 부위 (허용 범위 넓음)
const FIT_THRESHOLDS = {
  shoulder: { loose: -2, tight: 2 },
  chest:    { loose: -6, tight: 4 },
  waist:    { loose: -5, tight: 3 },
};

// 선호 핏(preferred_fit)에 따른 기준 보정
// slim: 범위를 좁혀서(더 엄격하게) 판정, loose: 범위를 넓혀서 관대하게 판정
function getAdjustedThreshold(part, preferredFit) {
  const base = FIT_THRESHOLDS[part];
  const adjust = {
    slim:    { loose: +1.5, tight: -1.5 },
    regular: { loose: 0,    tight: 0 },
    loose:   { loose: -1.5, tight: +1.5 },
  };
  const a = adjust[preferredFit] || adjust.regular;
  return {
    loose: base.loose + a.loose,
    tight: base.tight + a.tight,
  };
}

function judgePartFit(userVal, clothVal, part, preferredFit) {
  const diff = userVal - clothVal;
  const { loose, tight } = getAdjustedThreshold(part, preferredFit);

  if (diff < loose) return { label: '헐렁', icon: '↔', color: '#6a8fcc', score: -1 };
  if (diff > tight) return { label: '타이트', icon: '!', color: '#cc6a6a', score: 1 };
  return              { label: '맞음', icon: '✓', color: '#6acc8f', score: 0 };
}

function getRecommendedSize(outfitKey) {
  const spec = getSizeChart();
  if (!spec || !USER.shoulder) return 'M';
  let bestSize = 'M', bestScore = Infinity;
  ['S','M','L','XL'].forEach(sz => {
    const s = spec[sz];
    const score = Math.abs(USER.shoulder - s.shoulder) * 1.5
                + Math.abs(USER.chest    - s.chest)
                + Math.abs(USER.waist    - s.waist) * 0.8;
    if (score < bestScore) { bestScore = score; bestSize = sz; }
  });
  return bestSize;
}

function updateFitUI() {
  const spec = getSizeChart();
  if (!spec || !USER.shoulder) return;

  const recSize = getRecommendedSize(currentOutfitKey);
  const s = spec[recSize];
  const preferredFit = USER.preferredFit || 'regular';

  const sh = judgePartFit(USER.shoulder, s.shoulder, 'shoulder', preferredFit);
  const ch = judgePartFit(USER.chest,    s.chest,    'chest',    preferredFit);
  const wa = judgePartFit(USER.waist,    s.waist,    'waist',    preferredFit);

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
  const sizeOrder = ['S', 'M', 'L', 'XL'];
  const recIndex = sizeOrder.indexOf(recSize);
  const msgEl  = document.getElementById('fit-summary');

  if (msgEl) {
    if (tight === 0 && loose === 0) {
      msgEl.textContent = '전체적으로 딱 맞아요!';
      msgEl.style.color = '#6acc8f';
    } else if (tight > loose) {
      if (recIndex === sizeOrder.length - 1) {
        msgEl.textContent = `${recSize}가 이 라인 중 가장 큰 사이즈예요 (그래도 다소 타이트할 수 있어요)`;
      } else {
        msgEl.textContent = `${recSize}보다 한 사이즈 크게 추천해요`;
      }
      msgEl.style.color = '#cc6a6a';
    } else if (loose > tight) {
      if (recIndex === 0) {
        msgEl.textContent = `${recSize}가 이 라인 중 가장 작은 사이즈예요 (그래도 다소 헐렁할 수 있어요)`;
      } else {
        msgEl.textContent = `${recSize}보다 한 사이즈 작게 추천해요`;
      }
      msgEl.style.color = '#6a8fcc';
    } else {
      msgEl.textContent = `${recSize} 사이즈가 가장 잘 맞아요`;
      msgEl.style.color = '#c8b8ff';
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
  const stored = loadBodyData();
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

// ── Avatar (몸) ───────────────────────────────────────────────
let currentAvatar = null;
const HEIGHT_SCALE = () => (USER.height || 170) / 170;

function loadAvatar(gender) {
  // ⚠️ 실제 파일명 확인 필요: models/avatar.glb 인지, avatar_male.glb/avatar_female.glb 인지
  const path = gender === 'female' ? 'models/avatar_female.glb' : 'models/avatar_male.glb';

  new THREE.GLTFLoader().load(path, (gltf) => {
    const model = gltf.scene;

    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    const targetH = HEIGHT_SCALE() * 1.8;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0.001) model.scale.setScalar(targetH / size.y);

    const newBox = new THREE.Box3().setFromObject(model);
    model.position.y = -newBox.min.y;

    currentAvatar = model;
    scene.add(model);

    applyBodyMetricsToBones(model, USER);
  },
  null,
  () => console.warn('❌ 아바타 glb 로드 실패 — 경로 확인 필요:', path));
}

// ── Outfit ────────────────────────────────────────────────────
let currentOutfit    = null;
let currentOutfitKey = 'outfit1';
let clothOpacity     = 1.0;

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

    // 옷도 몸과 같은 체형 비율로 자동 반영 (몸-옷 스켈레톤이 별개일 경우 대비)
    applyBodyMetricsToBones(model, USER);

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

// 수동 슬라이더 (데모용 미세조정 — 자동반영과 별개로 유지)
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

// ── 이벤트 연결 + 자동 시작 ───────────────────────────────────
function initEventListeners() {
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
}

function tryAutoStart() {
  const stored = loadBodyData();
  if (stored) {
    applyStoredData(stored);
    document.getElementById('onboarding').style.display = 'none';
    document.getElementById('loading').classList.add('show');
    setBarWidth(60);
    setLoadText('체형 데이터 불러오는 중...');
    setTimeout(() => initScene(), 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    tryAutoStart();
  });
} else {
  initEventListeners();
  tryAutoStart();
}
