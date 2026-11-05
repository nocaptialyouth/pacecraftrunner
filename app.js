/**
 * app.js - 마라톤 페이스 & 레이스 전략 플래너 PRO
 * - Jack Daniels VDOT 산출 엔진 & 5km 구간별 스플릿 테이블
 * - 체중 기반 에너지젤/수분 보급 타임라인
 * - 목표 페이스별(Sub-3 / 싱글 3:10 / Sub-3:30 / Sub-4 / 4시간+ 완주) 베스트 픽 추천 쇼케이스
 * - 쿠팡 파트너스(4종) & 네이버 쇼핑 커넥트(14종) 인라인 제목/카테고리 수정 + 실시간 링크 자동 감지 등록기
 */

(function () {
  const STORAGE_KEY = 'marathon_pro_affiliate_links_v4';

  // 이전 버전의 캐시된 오매칭 타이틀 정리
  try {
    localStorage.removeItem('marathon_pro_affiliate_links_v1');
    localStorage.removeItem('marathon_pro_affiliate_links_v2');
    localStorage.removeItem('marathon_pro_affiliate_links_v3');
  } catch (e) {}

  // =========================================================================
  // 1. 기본 제휴 링크 데이터베이스 (쿠팡 파트너스 4개 + 네이버 쇼핑 커넥트 14개 = 총 18개)
  //    * 각 단축 URL의 실제 리다이렉트 도착 상품(에너지젤, 러닝양말, 러닝벨트, 러닝조끼,
  //      변색/편광 선글라스, 러닝장갑, 넥워머 바라클라바)과 100% 일치하도록 매칭했습니다.
  // =========================================================================
  const DEFAULT_AFFILIATE_LINKS = [
    // --- 쿠팡 파트너스 (4종: 에너지젤 & 아미노산 보급 라인업) ---
    {
      id: 'cp-1',
      platform: 'coupang',
      category: 'fuel',
      tier: 'sub330',
      url: 'https://link.coupang.com/a/imXiIz3QnA',
      name: '아미노바이탈 아미노샷 퍼펙트 에너지젤 4p (180g)'
    },
    {
      id: 'cp-2',
      platform: 'coupang',
      category: 'fuel',
      tier: 'sub3',
      url: 'https://link.coupang.com/a/imXjJvf18C',
      name: '요헤미티 에너지젤 마라톤용 지속형 보급 파워젤 (40g × 10포)'
    },
    {
      id: 'cp-3',
      platform: 'coupang',
      category: 'fuel',
      tier: 'sub4',
      url: 'https://link.coupang.com/a/imXk9XEyeO',
      name: '일동후디스 하이뮨 아미노포텐 고함량 아미노산 에너지젤 (10포)'
    },
    {
      id: 'cp-4',
      platform: 'coupang',
      category: 'fuel',
      tier: 'single',
      url: 'https://link.coupang.com/a/imXpAAqFfU',
      name: '마라톤 실전 레이스 보급용 에너지젤 & 부스터 패키지'
    },

    // --- 네이버 쇼핑 커넥트 (14종: 에너지젤 5종 + 양말·벨트·조끼 4종 + 선글라스 2종 + 방한기어 3종) ---
    {
      id: 'nv-1',
      platform: 'naver',
      category: 'fuel',
      tier: 'sub4',
      url: 'https://naver.me/FfsnsNFQ',
      name: '요헤미티 에너지젤 파워젤 대용량 박스 세트 (40g × 20포)'
    },
    {
      id: 'nv-2',
      platform: 'naver',
      category: 'fuel',
      tier: 'sub330',
      url: 'https://naver.me/5PWMWh8M',
      name: '요헤미티 에너지젤 파워젤 레이스 세트 (40g × 10포)'
    },
    {
      id: 'nv-3',
      platform: 'naver',
      category: 'fuel',
      tier: 'single',
      url: 'https://naver.me/xGFoiD1T',
      name: '마라톤 실전 에너지젤 & 아미노산 레이스 부스터 보급팩'
    },
    {
      id: 'nv-4',
      platform: 'naver',
      category: 'fuel',
      tier: 'finish',
      url: 'https://naver.me/x9V0V8SX',
      name: '풀코스·하프 완주용 마라톤 에너지젤 & 카보 보급 패키지'
    },
    {
      id: 'nv-5',
      platform: 'naver',
      category: 'fuel',
      tier: 'finish',
      url: 'https://naver.me/5qLpLN8l',
      name: '장거리 러닝 에너지 보충 파워젤 & 스포츠 뉴트리션'
    },
    {
      id: 'nv-6',
      platform: 'naver',
      category: 'socks_bag',
      tier: 'sub330',
      url: 'https://naver.me/G4dbd4av',
      name: '울티모(ULTIMO) 스포츠 러닝양말 물집방지 논슬립 쿠션 삭스'
    },
    {
      id: 'nv-7',
      platform: 'naver',
      category: 'socks_bag',
      tier: 'sub3',
      url: 'https://naver.me/xk9w9FZp',
      name: '아이언빅 러닝양말 운동 장목 압박 컴프레션 페이스 삭스'
    },
    {
      id: 'nv-8',
      platform: 'naver',
      category: 'winter_gear',
      tier: 'sub330',
      url: 'https://naver.me/5B0q0nkT',
      name: '아이언빅 겨울 방한 기모 러닝장갑 (스마트폰 터치)'
    },
    {
      id: 'nv-9',
      platform: 'naver',
      category: 'socks_bag',
      tier: 'sub330',
      url: 'https://naver.me/xbK3KSbu',
      name: '아이언빅 마라톤 러닝벨트 런닝가방 허리밴드 힙색 플립벨트'
    },
    {
      id: 'nv-10',
      platform: 'naver',
      category: 'eyewear',
      tier: 'single',
      url: 'https://naver.me/GlR1RiLH',
      name: '아이언빅(RNRN) 스포츠 변색 선글라스 자외선차단 러닝 고글'
    },
    {
      id: 'nv-11',
      platform: 'naver',
      category: 'eyewear',
      tier: 'sub3',
      url: 'https://naver.me/5VxixMPP',
      name: '아이언빅 스포츠 편광 선글라스 초경량 러닝 고글'
    },
    {
      id: 'nv-12',
      platform: 'naver',
      category: 'winter_gear',
      tier: 'sub3',
      url: 'https://naver.me/5suzuHzr',
      name: '아이언빅 겨울 러닝장갑 방한 기모 2in1 미튼 방풍 장갑'
    },
    {
      id: 'nv-13',
      platform: 'naver',
      category: 'winter_gear',
      tier: 'finish',
      url: 'https://naver.me/56XHXqsS',
      name: '아이언빅 겨울 러닝 넥워머 방한 기모 목토시 바라클라바'
    },
    {
      id: 'nv-14',
      platform: 'naver',
      category: 'socks_bag',
      tier: 'sub4',
      url: 'https://naver.me/FgEpE2Xq',
      name: '아이언빅(런런) 울트라라이트 경량 러닝조끼 트레일 베스트 가방'
    }
  ];

  const CATEGORY_LABELS = {
    fuel: '⚡ 에너지젤·아미노산',
    socks_bag: '🧦 러닝양말·벨트·조끼',
    eyewear: '🕶️ 러닝 선글라스·고글',
    winter_gear: '🧤 러닝장갑·넥워머'
  };

  const TIER_LABELS = {
    all: '전체 목표',
    sub3: '🏆 Sub-3 (2시간대)',
    single: '🔥 싱글 (3시간 00~15분)',
    sub330: '⚡ Sub-3:30 (3시간 30분)',
    sub4: '🏅 Sub-4 (3시간 59분)',
    finish: '🛡️ 4시간+ 안전 완주'
  };

  function loadAffiliateLinks() {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (!savedRaw) return [...DEFAULT_AFFILIATE_LINKS];
      const saved = JSON.parse(savedRaw);
      if (!Array.isArray(saved)) return [...DEFAULT_AFFILIATE_LINKS];

      const existingUrls = new Set(saved.map(item => item.url.trim()));
      const merged = [...saved];
      DEFAULT_AFFILIATE_LINKS.forEach(defItem => {
        if (!existingUrls.has(defItem.url.trim())) {
          merged.push(defItem);
        }
      });
      return merged;
    } catch (e) {
      return [...DEFAULT_AFFILIATE_LINKS];
    }
  }

  let affiliateLinks = loadAffiliateLinks();
  let currentCategoryFilter = 'all'; // 'all' | 'fuel' | 'recovery' | 'gear' | 'shoes_gear'
  let selectedShowcaseTier = 'auto'; // 'auto' (현재 목표 시간 자동 연동) | 'sub3' | 'single' | 'sub330' | 'sub4' | 'finish'

  function saveAffiliateLinks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(affiliateLinks));
    } catch (e) {}
  }

  function detectPlatformFromUrl(url) {
    const lower = url.toLowerCase();
    if (lower.includes('coupang.com') || lower.includes('coupa.ng')) return 'coupang';
    if (lower.includes('naver.me') || lower.includes('naver.com') || lower.includes('smartstore')) return 'naver';
    return 'custom';
  }

  // =========================================================================
  // 2. 애플리케이션 상태 정의
  // =========================================================================
  const state = {
    recentDist: 10,                 // 10 | 21.0975 | 42.195
    recentSec: 48 * 60 + 20,        // 기본 10km 48분 20초
    targetDist: 42.195,             // 10 | 21.0975 | 42.195
    targetSec: 3 * 3600 + 30 * 60,  // 기본 풀코스 3시간 30분 00초
    strategy: 'negative',           // 'even' | 'negative' | 'positive'
    height: 172,                    // cm (120 ~ 210)
    weight: 68                      // kg (30 ~ 130)
  };

  const DIST_LIMITS = {
    '10': { min: 1680, max: 5400, step: 10 },
    '21.0975': { min: 3900, max: 11400, step: 15 },
    '42.195': { min: 7800, max: 23400, step: 30 }
  };

  const TARGET_PRESETS = {
    '42.195': [
      { label: '🏆 Sub-3 (2:59:59)', sec: 2 * 3600 + 59 * 60 + 59 },
      { label: '🔥 싱글 (3:09:59)', sec: 3 * 3600 + 9 * 60 + 59 },
      { label: '⚡ Sub-3:30 (3:30:00)', sec: 3 * 3600 + 30 * 60 },
      { label: '🏅 Sub-4 (3:59:59)', sec: 3 * 3600 + 59 * 60 + 59 },
      { label: '🛡️ 4시간 30분', sec: 4 * 3600 + 30 * 60 },
      { label: '완주 목표 (5:00:00)', sec: 5 * 3600 }
    ],
    '21.0975': [
      { label: '🏆 1시간 25분 (Sub-3급)', sec: 1 * 3600 + 25 * 60 },
      { label: '🔥 Sub-1:30 (1:29:59)', sec: 1 * 3600 + 29 * 60 + 59 },
      { label: '⚡ 1시간 40분 (3:30급)', sec: 1 * 3600 + 40 * 60 },
      { label: '🏅 Sub-2 (1:59:59)', sec: 1 * 3600 + 59 * 60 + 59 },
      { label: '🛡️ 2시간 15분 완주', sec: 2 * 3600 + 15 * 60 }
    ],
    '10': [
      { label: '🏆 Sub-40 (39:59)', sec: 39 * 60 + 59 },
      { label: '🔥 45분 돌파 (45:00)', sec: 45 * 60 },
      { label: '⚡ Sub-50 (49:59)', sec: 49 * 60 + 59 },
      { label: '🏅 55분 (55:00)', sec: 55 * 60 },
      { label: '🛡️ Sub-1시간 (59:59)', sec: 59 * 60 + 59 },
      { label: '완주 목표 (1:10:00)', sec: 70 * 60 }
    ]
  };

  // =========================================================================
  // 3. 수학 및 VDOT · 신체 대사(키/체중/BMI) 계산 유틸리티
  // =========================================================================
  function secToHMS(totalSec) {
    const sec = Math.max(0, Math.round(totalSec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return { h, m, s };
  }

  function formatHMS(totalSec) {
    const { h, m, s } = secToHMS(totalSec);
    return [
      String(h).padStart(1, '0'),
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0')
    ].join(':');
  }

  function formatDurationClean(totalSec) {
    const { h, m, s } = secToHMS(totalSec);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatPace(secPerKm) {
    const rounded = Math.max(120, Math.round(secPerKm));
    const m = Math.floor(rounded / 60);
    const s = rounded % 60;
    return `${m}'${String(s).padStart(2, '0')}"`;
  }

  function calcVDOT(distKm, timeSec) {
    const dMeters = distKm * 1000;
    const tMin = timeSec / 60;
    if (tMin <= 0) return 30;
    const v = dMeters / tMin;

    const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
    const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * tMin) + 0.2989558 * Math.exp(-0.1932605 * tMin);
    return Math.max(20, Math.min(85, vo2 / pct));
  }

  function getPaceSecFromVDOTIntensity(vdot, intensityPct) {
    const targetVO2 = vdot * intensityPct;
    const a = 0.000104;
    const b = 0.182258;
    const c = -(4.60 + targetVO2);
    const v = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    if (v <= 0) return 360;
    return (1000 / v) * 60;
  }

  function predictEquivalentTimeSec(vdot, distKm) {
    let low = 900;
    let high = 30000;
    for (let i = 0; i < 32; i++) {
      const mid = (low + high) / 2;
      const est = calcVDOT(distKm, mid);
      if (est > vdot) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  }

  // 키(cm), 체중(kg), 거리(km), 주행 시간(sec)을 모두 반영한 정밀 칼로리·대사 계산
  function calcMetabolicProfile(heightCm, weightKg, distKm, timeSec) {
    const hMeter = Math.max(1.2, heightCm / 100);
    const bmi = weightKg / (hMeter * hMeter);
    // Mosteller 체표면적 (BSA, m^2) - 키와 체중이 모두 반영됨
    const bsa = Math.sqrt((heightCm * weightKg) / 3600);

    // 1) 신장(키)에 따른 공기저항 및 보폭 모멘트 보정 (170cm 기준)
    const heightFactor = 1 + (heightCm - 170) * 0.0018;
    // 2) BMI에 따른 러닝 경제성(Running Economy) 보정 (마라톤 최적 BMI 20.5 기준)
    const bmiFactor = 1 + Math.max(-0.04, (bmi - 20.5) * 0.0065);
    // 3) 주행 속도(km/h)에 따른 고강도 에너지 소모 보정
    const speedKmh = distKm / Math.max(0.25, timeSec / 3600);
    const speedFactor = 1 + Math.max(0, (speedKmh - 10) * 0.011);

    const kcalPerKgKm = 1.036 * heightFactor * bmiFactor * speedFactor;
    const totalKcal = Math.round(weightKg * distKm * kcalPerKgKm);

    let bmiType = '표준 러너형';
    if (bmi < 18.5) bmiType = '초경량 스피드형';
    else if (bmi < 21.5) bmiType = '엘리트 마라토너형';
    else if (bmi < 24.0) bmiType = '표준 밸런스형';
    else if (bmi < 26.5) bmiType = '파워 근육·체격형';
    else bmiType = '체중 부하 주의형';

    return {
      bmi,
      bsa,
      bmiType,
      totalKcal,
      kcalPerKgKm
    };
  }

  // 목표 페이스(초/km)로부터 목표 클래스(tier) 판별
  function detectTierFromTargetPace(targetPaceSec) {
    const equivFullHours = (targetPaceSec * 42.195) / 3600;
    if (equivFullHours <= 3.01) return 'sub3';     // Sub-3 (4'15"/km 이하, 10km 40분대 이하)
    if (equivFullHours <= 3.26) return 'single';   // 싱글 (3:00 ~ 3:15, 4'37"/km 이하)
    if (equivFullHours <= 3.55) return 'sub330';   // Sub-3:30 (4'58"/km 전후, 10km 48~50분)
    if (equivFullHours <= 4.05) return 'sub4';     // Sub-4 (5'40"/km 이하, 10km 55분)
    return 'finish';                               // 완주 목표
  }

  // =========================================================================
  // 4. DOM 요소 참조
  // =========================================================================
  const recentDistBtns = document.querySelectorAll('.recent-dist-btn');
  const recentH = document.getElementById('recent-h');
  const recentM = document.getElementById('recent-m');
  const recentS = document.getElementById('recent-s');
  const recentSlider = document.getElementById('recent-slider');
  const recentPaceBadge = document.getElementById('recent-pace-badge');

  const heightInput = document.getElementById('runner-height');
  const heightSlider = document.getElementById('height-slider');
  const heightMinus = document.getElementById('height-minus');
  const heightPlus = document.getElementById('height-plus');

  const weightInput = document.getElementById('runner-weight');
  const weightSlider = document.getElementById('weight-slider');
  const weightMinus = document.getElementById('weight-minus');
  const weightPlus = document.getElementById('weight-plus');
  const bmiStatusBadge = document.getElementById('bmi-status-badge');

  const targetDistBtns = document.querySelectorAll('.target-dist-btn');
  const presetContainer = document.getElementById('preset-buttons');
  const targetH = document.getElementById('target-h');
  const targetM = document.getElementById('target-m');
  const targetS = document.getElementById('target-s');
  const targetSlider = document.getElementById('target-slider');
  const targetSliderLabels = document.getElementById('target-slider-labels');
  const targetPaceBadge = document.getElementById('target-pace-badge');
  const strategyBtns = document.querySelectorAll('.strategy-btn');

  function updateButtonStyles() {
    recentDistBtns.forEach(btn => {
      const d = parseFloat(btn.dataset.dist);
      if (Math.abs(d - state.recentDist) < 0.01) {
        btn.className = 'recent-dist-btn py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold border transition bg-brand-600 text-white border-brand-600 shadow-sm';
      } else {
        btn.className = 'recent-dist-btn py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold border transition bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100';
      }
    });

    targetDistBtns.forEach(btn => {
      const d = parseFloat(btn.dataset.dist);
      if (Math.abs(d - state.targetDist) < 0.01) {
        btn.className = 'target-dist-btn py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold border transition flex flex-col sm:flex-row items-center justify-between gap-0.5 bg-brand-600 text-white border-brand-600 shadow-sm';
      } else {
        btn.className = 'target-dist-btn py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold border transition flex flex-col sm:flex-row items-center justify-between gap-0.5 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100';
      }
    });

    strategyBtns.forEach(btn => {
      const st = btn.dataset.strategy;
      if (st === state.strategy) {
        btn.className = 'strategy-btn p-3 rounded-xl border-2 text-left transition border-brand-600 dark:border-brand-400 bg-brand-50/50 dark:bg-brand-950/30';
      } else {
        btn.className = 'strategy-btn p-3 rounded-xl border text-left transition border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300';
      }
    });
  }

  function getTargetDistKey() {
    if (state.targetDist > 30) return '42.195';
    if (state.targetDist > 15) return '21.0975';
    return '10';
  }

  function renderPresets() {
    const key = getTargetDistKey();
    const list = TARGET_PRESETS[key] || TARGET_PRESETS['42.195'];
    presetContainer.innerHTML = list.map(item => {
      const active = Math.abs(state.targetSec - item.sec) <= 20;
      const cls = active
        ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-600 text-white transition shadow-xs'
        : 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition';
      return `<button type="button" data-sec="${item.sec}" class="preset-chip ${cls}">${item.label}</button>`;
    }).join('');

    presetContainer.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.targetSec = parseInt(chip.dataset.sec, 10);
        selectedShowcaseTier = 'auto';
        syncTargetInputsFromSec();
        calculateAndRender();
      });
    });
  }

  function syncRecentInputsFromSec() {
    const lim = DIST_LIMITS[String(state.recentDist)];
    recentSlider.min = lim.min;
    recentSlider.max = lim.max;
    recentSlider.step = lim.step;
    recentSlider.value = Math.min(lim.max, Math.max(lim.min, state.recentSec));

    const { h, m, s } = secToHMS(state.recentSec);
    recentH.value = h;
    recentM.value = m;
    recentS.value = s;
  }

  function syncTargetInputsFromSec() {
    const key = getTargetDistKey();
    const lim = DIST_LIMITS[key];
    targetSlider.min = lim.min;
    targetSlider.max = lim.max;
    targetSlider.step = lim.step;
    targetSlider.value = Math.min(lim.max, Math.max(lim.min, state.targetSec));

    if (key === '42.195') {
      targetSliderLabels.innerHTML = '<span>2:10:00</span><span>3:30:00</span><span>4:45:00</span><span>6:30:00</span>';
    } else if (key === '21.0975') {
      targetSliderLabels.innerHTML = '<span>1:05:00</span><span>1:45:00</span><span>2:25:00</span><span>3:10:00</span>';
    } else {
      targetSliderLabels.innerHTML = '<span>28:00</span><span>45:00</span><span>1:00:00</span><span>1:30:00</span>';
    }

    const { h, m, s } = secToHMS(state.targetSec);
    targetH.value = h;
    targetM.value = m;
    targetS.value = s;
  }

  // =========================================================================
  // 5. 메인 계산 및 대시보드 업데이트
  // =========================================================================
  function calculateAndRender() {
    updateButtonStyles();
    renderPresets();

    const recentPace = state.recentSec / state.recentDist;
    const targetPace = state.targetSec / state.targetDist;
    recentPaceBadge.textContent = `평균 ${formatPace(recentPace)}/km`;
    targetPaceBadge.textContent = `목표 평균 ${formatPace(targetPace)}/km`;

    const currentVDOT = calcVDOT(state.recentDist, state.recentSec);
    const targetVDOT = calcVDOT(state.targetDist, state.targetSec);
    const vdotDiff = targetVDOT - currentVDOT;

    const equivTargetSec = predictEquivalentTimeSec(currentVDOT, state.targetDist);

    // 키·체중(BMI) 및 종목 특성을 반영한 달성 확률 산출
    const metabolic = calcMetabolicProfile(state.height, state.weight, state.targetDist, state.targetSec);
    if (bmiStatusBadge) {
      bmiStatusBadge.textContent = `BMI ${metabolic.bmi.toFixed(1)} · ${metabolic.bmiType}`;
    }

    const bmiPenalty = state.targetDist > 20 && metabolic.bmi > 24.5 ? (metabolic.bmi - 24.5) * 0.25 : 0;
    const rawProb = 100 / (1 + Math.exp(0.68 * (vdotDiff + bmiPenalty - 2.1)));
    const prob = Math.max(5, Math.min(99, Math.round(rawProb)));

    document.getElementById('current-vdot-val').textContent = currentVDOT.toFixed(1);
    document.getElementById('target-vdot-val').textContent = targetVDOT.toFixed(1);

    const diffEl = document.getElementById('vdot-diff-val');
    if (vdotDiff > 0.05) {
      diffEl.textContent = `+${vdotDiff.toFixed(1)} 필요`;
      diffEl.className = 'text-xs font-mono font-bold text-amber-500';
    } else {
      diffEl.textContent = `${vdotDiff.toFixed(1)} 여유`;
      diffEl.className = 'text-xs font-mono font-bold text-emerald-500';
    }

    const targetName = state.targetDist > 30 ? '풀코스' : state.targetDist > 15 ? '하프' : '10km';
    document.getElementById('equiv-time-text').textContent = `동등 ${targetName}: ${formatHMS(equivTargetSec)}`;
    document.getElementById('target-pace-summary').textContent = `요구 페이스: ${formatPace(targetPace)}/km`;

    const probValEl = document.getElementById('prob-val');
    const probBarEl = document.getElementById('prob-bar');
    const badgeEl = document.getElementById('feasibility-badge');
    const adviceEl = document.getElementById('coach-advice-box');

    probValEl.textContent = prob;
    probBarEl.style.width = `${prob}%`;

    const autoTier = detectTierFromTargetPace(targetPace);
    const tierTitleMap = {
      sub3: 'Sub-3급 (고속 레이스)',
      single: '싱글급 (상급 레이스)',
      sub330: 'Sub-3:30급 (마스터즈)',
      sub4: 'Sub-4급 (중장거리)',
      finish: '안전 완주 클래스'
    };

    const bodyInfoText = `신장 <strong>${state.height}cm</strong> · 체중 <strong>${state.weight}kg</strong>(BMI <strong>${metabolic.bmi.toFixed(1)}</strong>, ${metabolic.bmiType})`;

    if (prob >= 80) {
      probValEl.className = 'text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400';
      probBarEl.className = 'h-full bg-emerald-500 rounded-full transition-all duration-300';
      badgeEl.textContent = '✅ 안정권 목표 (충분히 달성 가능)';
      badgeEl.className = 'self-start sm:self-auto px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
      adviceEl.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div><strong>💡 데이터 코치 진단:</strong> 현재 VDOT(<strong>${currentVDOT.toFixed(1)}</strong>)과 ${bodyInfoText} 조건에서 목표(${targetName} ${formatHMS(state.targetSec)}) 달성이 충분히 가능합니다! 초반 오버페이스만 주의하세요.</div>
          <a href="#gear-section" class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-extrabold hover:bg-brand-700 transition">🎁 ${tierTitleMap[autoTier]} 베스트 픽 보기 ↓</a>
        </div>`;
    } else if (prob >= 55) {
      probValEl.className = 'text-2xl sm:text-3xl font-extrabold font-mono text-sky-600 dark:text-sky-400';
      probBarEl.className = 'h-full bg-sky-500 rounded-full transition-all duration-300';
      badgeEl.textContent = '🔥 적정 도전 목표 (6~10주 훈련 권장)';
      badgeEl.className = 'self-start sm:self-auto px-3 py-1 rounded-full text-xs font-extrabold bg-sky-500/15 text-sky-600 dark:text-sky-400';
      adviceEl.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div><strong>💡 데이터 코치 진단:</strong> ${bodyInfoText} 기준 VDOT <strong>+${vdotDiff.toFixed(1)}</strong> 향상이 필요한 도전 목표입니다. 주 1회 <strong>T 페이스(역치주)</strong>와 레이스 보급 전략을 병행하세요.</div>
          <a href="#gear-section" class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-extrabold hover:bg-brand-700 transition">🎁 ${tierTitleMap[autoTier]} 베스트 픽 보기 ↓</a>
        </div>`;
    } else {
      probValEl.className = 'text-2xl sm:text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400';
      probBarEl.className = 'h-full bg-rose-500 rounded-full transition-all duration-300';
      badgeEl.textContent = '⚠️ 공격적 목표 (후반 퍼짐 주의)';
      badgeEl.className = 'self-start sm:self-auto px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400';
      adviceEl.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div><strong>💡 데이터 코치 진단:</strong> ${bodyInfoText} 대비 요구 VDOT 차이(<strong>+${vdotDiff.toFixed(1)}</strong>)가 커서 후반 에너지 고갈 위험이 높습니다. 충분한 훈련 기간 확보와 철저한 보급이 필수입니다.</div>
          <a href="#gear-section" class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-extrabold hover:bg-brand-700 transition">🎁 ${tierTitleMap[autoTier]} 베스트 픽 보기 ↓</a>
        </div>`;
    }

    const totalKcal = metabolic.totalKcal;
    const raceHours = state.targetSec / 3600;
    // 체표면적(BSA)과 체중을 함께 반영한 시간당 탄수화물 요구량
    const hourlyCarbGram = Math.min(78, Math.max(25, Math.round((state.weight * 0.72) + (metabolic.bsa * 8))));
    const totalCarbGram = Math.round(hourlyCarbGram * raceHours);

    document.getElementById('kcal-val').textContent = totalKcal.toLocaleString();
    document.getElementById('carb-need-text').textContent = `${state.height}cm·${state.weight}kg(BMI ${metabolic.bmi.toFixed(1)}) · 권장 탄수화물 ${totalCarbGram}g`;

    const eFast = getPaceSecFromVDOTIntensity(currentVDOT, 0.74);
    const eSlow = getPaceSecFromVDOTIntensity(currentVDOT, 0.65);
    const mPace = getPaceSecFromVDOTIntensity(currentVDOT, 0.81);
    const tPace = getPaceSecFromVDOTIntensity(currentVDOT, 0.88);
    const iPace = getPaceSecFromVDOTIntensity(currentVDOT, 0.975);

    document.getElementById('pace-e').textContent = `${formatPace(eFast)} ~ ${formatPace(eSlow)}`;
    document.getElementById('pace-m').textContent = `${formatPace(mPace)}/km`;
    document.getElementById('pace-t').textContent = `${formatPace(tPace)}/km`;
    document.getElementById('pace-i').textContent = `${formatPace(iPace)}/km`;

    renderSplitTable(targetPace);
    renderFuelingTimeline(targetPace, metabolic);
    renderCTAModule(targetPace);
    renderProLabTools(currentVDOT, targetVDOT, targetPace, metabolic, { eFast, eSlow, mPace, tPace, iPace });
  }

  function renderSplitTable(basePaceSec) {
    const key = getTargetDistKey();
    const milestones = key === '42.195'
      ? [5, 10, 15, 20, 21.0975, 25, 30, 35, 40, 42.195]
      : key === '21.0975'
        ? [5, 10, 15, 20, 21.0975]
        : [2, 4, 5, 6, 8, 10];

    const splitTitleEl = document.getElementById('split-table-title');
    if (splitTitleEl) {
      splitTitleEl.textContent = key === '10'
        ? '⏱️ 10km 레이스 구간별 목표 통과 시간표 (2km · 5km 반환점 스플릿)'
        : '⏱️ 5km 구간별 목표 통과 시간표 (Split Table)';
    }

    const segments = [];
    let prevKm = 0;

    milestones.forEach((km) => {
      const dist = km - prevKm;
      const progress = km / state.targetDist;
      let factor = 1.0;
      let guide = '일정 페이스 유지';

      if (state.strategy === 'negative') {
        factor = 1.022 - 0.044 * progress;
        if (progress <= 0.35) guide = '워밍업 & 글리코겐 비축 (+1.5~2%)';
        else if (progress <= 0.72) guide = '목표 크루징 리듬 안착';
        else guide = '후반 네거티브 스퍼트 (-1.5~2%)';
      } else if (state.strategy === 'positive') {
        factor = 0.982 + 0.036 * progress;
        if (progress <= 0.5) guide = '전반 시간 세이브 구간 (-1.5%)';
        else if (progress <= 0.8) guide = '페이스 방어 및 코어 유지';
        else guide = '후반 체력 저하 버퍼 구간 (+1.5%)';
      } else {
        factor = 1.0;
        if (progress <= 0.25) guide = '오버페이스 주의 · 리듬 찾기';
        else if (progress <= 0.75) guide = '등속 크루징 구간';
        else guide = '피니시 폼 유지 집중';
      }

      segments.push({
        startKm: prevKm,
        endKm: km,
        dist,
        rawTime: dist * basePaceSec * factor,
        guide
      });
      prevKm = km;
    });

    const rawSum = segments.reduce((acc, s) => acc + s.rawTime, 0);
    const scale = state.targetSec / rawSum;

    let cumSec = 0;
    const rowsHtml = segments.map(seg => {
      const segSec = seg.rawTime * scale;
      cumSec += segSec;
      const segPace = segSec / seg.dist;

      const isHalfMark = (key === '42.195' && Math.abs(seg.endKm - 21.0975) < 0.01) || (key === '10' && Math.abs(seg.endKm - 5) < 0.01);
      const isFinish = Math.abs(seg.endKm - state.targetDist) < 0.01;

      let label = `${seg.endKm} km`;
      if (isHalfMark && key === '42.195') label = 'Half (21.1km)';
      if (isHalfMark && key === '10') label = 'Half (5.0km 반환)';
      if (isFinish) label = `Finish (${seg.endKm}km)`;

      const rowHighlight = isFinish
        ? 'bg-brand-50/80 dark:bg-brand-950/40 font-extrabold text-brand-700 dark:text-brand-300'
        : isHalfMark
          ? 'bg-slate-50/90 dark:bg-slate-800/40 font-semibold'
          : '';

      return `
        <tr class="${rowHighlight}">
          <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap">${label}</td>
          <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap text-brand-600 dark:text-brand-400 font-bold">${formatPace(segPace)}/km</td>
          <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap text-slate-500 dark:text-slate-400">${formatDurationClean(segSec)}</td>
          <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap font-bold">${formatHMS(cumSec)}</td>
          <td class="py-2.5 px-2 sm:px-3 hidden sm:table-cell font-sans text-xs text-slate-500 dark:text-slate-400">${seg.guide}</td>
        </tr>
      `;
    }).join('');

    document.getElementById('split-table-body').innerHTML = rowsHtml;

    const chipMap = {
      even: '⚖️ 이븐 페이스 전략',
      negative: '🚀 네거티브 스플릿 전략',
      positive: '🔥 포지티브 스플릿 전략'
    };
    document.getElementById('split-strategy-chip').textContent = chipMap[state.strategy];
  }

  // =========================================================================
  // 6. 레이스 보급 타임라인 (키·체중·BMI 및 10km/하프/풀코스 종목별 맞춤 보급!)
  // =========================================================================
  function renderFuelingTimeline(basePaceSec, metabolic) {
    const bsa = metabolic ? metabolic.bsa : Math.sqrt((state.height * state.weight) / 3600);
    const bmi = metabolic ? metabolic.bmi : state.weight / Math.pow(state.height / 100, 2);
    document.getElementById('fuel-weight-label').textContent = `${state.height}cm · ${state.weight}kg (BMI ${bmi.toFixed(1)})`;

    // 신장(키)·체중 기반 체표면적(BSA)을 함께 반영하여 1회 탄수화물·수분 섭취량 산출
    const baseGelCarb = Math.round(Math.max(18, Math.min(38, state.weight * 0.34 + bsa * 3.5)));
    const baseWaterMl = Math.round(Math.max(120, Math.min(320, state.weight * 2.2 + bsa * 38)));

    const is10K = state.targetDist < 15;
    const isFull = state.targetDist > 30;

    const points = [
      {
        km: 0,
        title: '출발 30분 전 (Pre-Race)',
        type: '하이뮨 아미노포텐 (고함량 아미노산 에너지젤)',
        carb: baseGelCarb,
        water: Math.round(baseWaterMl * 1.1),
        tip: '간 글리코겐 충전 및 근손실·초반 혈당 스파이크 방지용 사전 아미노산 보급',
        isActive: true,
        skipLabel: '',
        linkUrl: 'https://link.coupang.com/a/imXk9XEyeO',
        linkText: '쿠팡: 하이뮨 아미노포텐 에너지젤 10포 보기 →'
      },
      {
        km: is10K ? 5 : 7,
        title: is10K ? '5km 반환점 (10K 중반 스퍼트)' : '7km 지점 (초반 보급)',
        type: '아미노바이탈 아미노샷 퍼펙트 에너지젤 1포',
        carb: is10K ? Math.round(baseGelCarb * 0.8) : baseGelCarb,
        water: baseWaterMl,
        tip: is10K
          ? '10km 반환점 통과 직후 후반 5km 페이스 유지를 위한 빠른 아미노샷·수분 보충'
          : '고갈 신호가 오기 전 선제적 탄수화물·아미노산 투입 (급수대 물과 함께 섭취)',
        isActive: true,
        skipLabel: '',
        linkUrl: 'https://link.coupang.com/a/imXiIz3QnA',
        linkText: '쿠팡: 아미노바이탈 아미노샷 퍼펙트 에너지젤 →'
      },
      {
        km: is10K ? 10 : 14,
        title: is10K ? '10km 피니시 직후 (즉시 리커버리)' : '14km 지점 (중반 진입)',
        type: is10K ? '요헤미티 파워젤 & 전해질 리커버리' : '요헤미티 에너지젤 지속형 파워젤 1포',
        carb: baseGelCarb,
        water: baseWaterMl,
        tip: is10K
          ? '10km 고강도 질주 직후 30분 골든타임 내 고갈된 글리코겐과 수분 즉시 회복'
          : '중반부 페이스 유지를 위한 지속형 파워젤 보급 및 수분 보충',
        isActive: true,
        skipLabel: '',
        linkUrl: 'https://naver.me/5PWMWh8M',
        linkText: '네이버: 요헤미티 에너지젤 파워젤 10포 세트 →'
      },
      {
        km: 21,
        title: '21km 지점 (하프 통과)',
        type: isFull ? '요헤미티 에너지젤 대용량 레이스 보급 1포' : '피니시 스퍼트 에너지젤 보충',
        carb: isFull ? baseGelCarb : Math.round(baseGelCarb * 0.5),
        water: baseWaterMl,
        tip: isFull
          ? '하프 반환점 통과 직후 후반 21km를 버티기 위한 메인 탄수화물 재충전'
          : '하프 마라톤 피니시 직전 라스트 스퍼트 에너지 공급',
        isActive: !is10K,
        skipLabel: '하프·풀코스 전용 구간 (10km 생략)',
        linkUrl: 'https://naver.me/FfsnsNFQ',
        linkText: '네이버: 요헤미티 에너지젤 파워젤 20포 세트 →'
      },
      {
        km: 28,
        title: '28km 지점 (마의 30k 벽 대비)',
        type: '요헤미티 마라톤 지속형 파워젤 (쿠팡 로켓)',
        carb: baseGelCarb + 3,
        water: Math.round(baseWaterMl * 1.15),
        tip: '30~32km 마의 벽(Bonking) 구간 진입 전 글리코겐 고갈을 막는 핵심 보급',
        isActive: isFull,
        skipLabel: is10K ? '풀코스 전용 구간 (10km 생략)' : '풀코스 전용 구간 (하프 생략)',
        linkUrl: 'https://link.coupang.com/a/imXjJvf18C',
        linkText: '쿠팡: 요헤미티 마라톤 지속형 파워젤 10포 →'
      },
      {
        km: 35,
        title: '35km 지점 (라스트 7.2km)',
        type: '라스트 스퍼트 실전 마라톤 에너지젤 1포',
        carb: baseGelCarb,
        water: baseWaterMl,
        tip: '피니시 라인까지 폼 무너짐과 후반 퍼짐을 방어하는 마지막 에너지 투입',
        isActive: isFull,
        skipLabel: is10K ? '풀코스 전용 구간 (10km 생략)' : '풀코스 전용 구간 (하프 생략)',
        linkUrl: 'https://naver.me/xGFoiD1T',
        linkText: '네이버: 마라톤 실전 레이스 에너지젤 보급팩 →'
      }
    ];

    let totalCarb = 0;
    let totalWater = 0;
    let gelCount = 0;

    const cardsHtml = points.map(pt => {
      const passSec = pt.km * basePaceSec;
      const timeLabel = pt.km === 0 ? '출발 -30분' : `예상 통과 ${formatHMS(passSec)}`;

      if (pt.isActive) {
        totalCarb += pt.carb;
        totalWater += pt.water;
        if (pt.carb >= 15) gelCount += 1;
      }

      const opacityCls = pt.isActive ? '' : 'opacity-45 bg-slate-50/40 dark:bg-slate-900/40 border-dashed';
      const badgeText = pt.isActive
        ? `탄수화물 ${pt.carb}g · 수분 ${pt.water}ml`
        : pt.skipLabel;

      return `
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col justify-between ${opacityCls}">
          <div>
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <span class="text-xs font-extrabold text-brand-600 dark:text-brand-400">${pt.title}</span>
              <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">${timeLabel}</span>
            </div>
            <div class="text-sm font-extrabold text-slate-900 dark:text-white mb-1">${pt.type}</div>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">${pt.tip}</p>
          </div>
          <div class="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div class="flex items-center justify-between text-xs font-mono font-bold">
              <span class="text-amber-600 dark:text-amber-400">🍯 ${pt.isActive ? `탄수화물 ${pt.carb}g` : '-'}</span>
              <span class="text-cyan-600 dark:text-cyan-400">💧 ${pt.isActive ? `수분 ${pt.water}ml` : badgeText}</span>
            </div>
            ${pt.isActive ? `
              <a
                href="${pt.linkUrl}"
                target="_blank"
                rel="noopener noreferrer sponsored"
                class="block w-full py-1.5 px-2.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-300 text-[11px] font-extrabold text-center transition"
              >
                ⚡ ${pt.linkText}
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('fueling-timeline').innerHTML = cardsHtml;
    document.getElementById('total-gel-badge').textContent = `권장 에너지젤 ${gelCount}포 (총 ${totalCarb}g)`;
    document.getElementById('total-water-badge').textContent = `총 수분 ${totalWater.toLocaleString()}ml`;
  }

  // =========================================================================
  // 7. 페이스별 베스트 픽 쇼케이스 (Sub-3 / 싱글 / 3:30 / Sub-4 / 완주)
  //    * 모든 카드의 제목·설명·버튼 문구가 연결된 URL의 실제 도착 상품과 100% 일치합니다.
  // =========================================================================
  const PACE_TIER_SHOWCASE = {
    sub3: {
      badge: '🏆 Sub-3 (2시간대 · 4\'15"/km 이하) 베스트 픽',
      headline: 'Sub-3 고속 주행을 위한 지속형 파워젤 & 장목 컴프레션 삭스·편광 고글 베스트 픽',
      summary: '4분 초반대 고속 페이스에서는 빠른 에너지 보급(요헤미티·하이뮨 아미노포텐)과 발목 흔들림을 잡아주는 압박 양말, 초경량 고글·벨트가 필수입니다.',
      cards: [
        {
          tag: 'BEST PICK 1 • 고속 주행 메인 에너지젤 & 아미노산',
          title: '요헤미티 지속형 파워젤 & 하이뮨 아미노포텐 10포',
          desc: '심박수 170bpm 이상의 고강도 Sub-3 주행 중 에너지를 공급하는 요헤미티 마라톤 파워젤과 고함량 아미노산 하이뮨 아미노포텐입니다.',
          buttons: [
            { platform: 'coupang', label: '🚀 쿠팡: 요헤미티 지속형 에너지젤 10포 보기', url: 'https://link.coupang.com/a/imXjJvf18C' },
            { platform: 'coupang', label: '🚀 쿠팡: 하이뮨 아미노포텐 에너지젤 10포 보기', url: 'https://link.coupang.com/a/imXk9XEyeO' }
          ]
        },
        {
          tag: 'BEST PICK 2 • 레이스 컴프레션 삭스 & 밀착 벨트',
          title: '아이언빅 장목 압박 페이스 러닝양말 & 마라톤 러닝벨트',
          desc: '고속 주행 시 발목과 아치를 탄탄하게 지지하는 장목 압박 페이스 삭스와 에너지젤 6포를 출렁임 없이 밀착 수납하는 마라톤 허리벨트입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 아이언빅 장목 압박 러닝양말 보기', url: 'https://naver.me/xk9w9FZp' },
            { platform: 'naver', label: '🟢 네이버: 아이언빅 마라톤 러닝벨트 힙색 보기', url: 'https://naver.me/xbK3KSbu' }
          ]
        },
        {
          tag: 'BEST PICK 3 • 초경량 편광 고글 & 2in1 방풍 미튼',
          title: '아이언빅 스포츠 편광 러닝 선글라스 & 2in1 미튼 장갑',
          desc: '아스팔트 난반사와 눈부심을 차단하는 초경량 편광 러닝 고글과 동계·새벽 대회 출발 시 손 시림을 막아주는 2in1 미튼 방한 러닝장갑입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 아이언빅 스포츠 편광 선글라스 보기', url: 'https://naver.me/5VxixMPP' },
            { platform: 'naver', label: '🟢 네이버: 아이언빅 2in1 방한 미튼 러닝장갑 보기', url: 'https://naver.me/5suzuHzr' }
          ]
        }
      ]
    },
    single: {
      badge: '🔥 싱글 (3시간 00분~15분 · 4\'30"/km) 베스트 픽',
      headline: '마라톤 싱글(3시간 초반) 달성을 위한 퍼펙트 에너지젤 & 변색 고글 베스트 픽',
      summary: '후반 32km 이후 페이스 저하를 방어하기 위한 아미노바이탈·요헤미티 대용량 보급팩과 전천후 변색 러닝 선글라스 조합입니다.',
      cards: [
        {
          tag: 'BEST PICK 1 • 싱글 달성 메인 에너지젤',
          title: '아미노바이탈 아미노샷 퍼펙트젤 & 요헤미티 20포 박스',
          desc: '7km 간격 정밀 탄수화물 로딩과 30km 벽 돌파를 책임지는 아미노바이탈 아미노샷 퍼펙트 에너지젤 및 요헤미티 20포 대용량 세트입니다.',
          buttons: [
            { platform: 'coupang', label: '🚀 쿠팡: 아미노바이탈 아미노샷 퍼펙트젤 4p 보기', url: 'https://link.coupang.com/a/imXiIz3QnA' },
            { platform: 'naver', label: '🟢 네이버: 요헤미티 에너지젤 20포 대용량 보기', url: 'https://naver.me/FfsnsNFQ' }
          ]
        },
        {
          tag: 'BEST PICK 2 • 실전 레이스 추가 에너지 보급팩',
          title: '마라톤 실전 레이스 에너지젤 & 부스터 뉴트리션 패키지',
          desc: '젖산역치 부근에서 달리는 싱글 러너의 후반 근피로와 에너지 고갈을 방어하는 실전 마라톤 에너지젤 라인업입니다.',
          buttons: [
            { platform: 'coupang', label: '🚀 쿠팡: 마라톤 실전 레이스 에너지젤 패키지 보기', url: 'https://link.coupang.com/a/imXpAAqFfU' },
            { platform: 'naver', label: '🟢 네이버: 마라톤 실전 에너지젤 & 부스터 보급팩 보기', url: 'https://naver.me/xGFoiD1T' }
          ]
        },
        {
          tag: 'BEST PICK 3 • 자외선 변색 고글 & 방한 바라클라바',
          title: '아이언빅(RNRN) 스포츠 변색 선글라스 & 기모 넥워머',
          desc: '일조량에 따라 렌즈 농도가 자동 조절되는 RNRN 스포츠 변색 러닝 고글과 찬 바람을 막아주는 겨울 러닝 기모 넥워머 바라클라바입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 아이언빅(RNRN) 변색 러닝 선글라스 보기', url: 'https://naver.me/GlR1RiLH' },
            { platform: 'naver', label: '🟢 네이버: 아이언빅 겨울 러닝 넥워머 바라클라바 보기', url: 'https://naver.me/56XHXqsS' }
          ]
        }
      ]
    },
    sub330: {
      badge: '⚡ Sub-3:30 (3시간 30분 · 4\'58"/km) 베스트 픽',
      headline: '3시간 30분(4\'58"/km) 목표 러너를 위한 베스트 픽 에너지젤 & 수납벨트·양말',
      summary: '마스터즈 러너들의 꿈의 무대인 Sub-3:30 달성을 위해 가장 많이 선택받는 요헤미티 10포 세트, 아이언빅 러닝벨트, 울티모 러닝양말 조합입니다.',
      cards: [
        {
          tag: 'BEST PICK 1 • 7km 주기 정석 에너지젤 패키지',
          title: '요헤미티 에너지젤 파워젤 10포 & 아미노바이탈 퍼펙트젤',
          desc: '출발 전부터 35km까지 총 6회 보급에 최적화된 요헤미티 에너지젤 10개입 레이스 세트와 아미노바이탈 아미노샷 퍼펙트 에너지젤입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 요헤미티 에너지젤 파워젤 10포 세트 보기', url: 'https://naver.me/5PWMWh8M' },
            { platform: 'coupang', label: '🚀 쿠팡: 아미노바이탈 아미노샷 퍼펙트젤 4p 보기', url: 'https://link.coupang.com/a/imXiIz3QnA' }
          ]
        },
        {
          tag: 'BEST PICK 2 • 에너지젤 수납 벨트 & 물집방지 양말',
          title: '아이언빅 마라톤 러닝벨트 힙색 & 울티모 스포츠 러닝양말',
          desc: '에너지젤 6포와 휴대폰을 흔들림 없이 수납하는 아이언빅 플립벨트 힙색과 장거리 주행 시 물집을 예방하는 울티모(ULTIMO) 스포츠 러닝양말입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 아이언빅 마라톤 러닝벨트 힙색 보기', url: 'https://naver.me/xbK3KSbu' },
            { platform: 'naver', label: '🟢 네이버: 울티모(ULTIMO) 스포츠 러닝양말 보기', url: 'https://naver.me/G4dbd4av' }
          ]
        },
        {
          tag: 'BEST PICK 3 • 편광 러닝 고글 & 스마트폰 터치 장갑',
          title: '아이언빅 스포츠 편광 선글라스 & 겨울 방한 기모 러닝장갑',
          desc: '대회 당일 자외선 눈부심을 잡아주는 편광 스포츠 고글과 가민·스마트폰 터치가 자유로운 아이언빅 겨울 방한 기모 러닝장갑입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 아이언빅 스포츠 편광 선글라스 보기', url: 'https://naver.me/5VxixMPP' },
            { platform: 'naver', label: '🟢 네이버: 아이언빅 겨울 방한 기모 러닝장갑 보기', url: 'https://naver.me/5B0q0nkT' }
          ]
        }
      ]
    },
    sub4: {
      badge: '🏅 Sub-4 (3시간 59분 · 5\'40"/km) 베스트 픽',
      headline: 'Sub-4 완주를 책임지는 대용량 에너지젤 & 물집방지 양말·초경량 러닝조끼',
      summary: '4시간 가까이 달리는 Sub-4 레이스에서는 넉넉한 에너지젤·아미노산 보급과 발바닥 물집 방지 양말, 편안한 수납 조끼·벨트가 핵심입니다.',
      cards: [
        {
          tag: 'BEST PICK 1 • 속 편한 장거리 에너지젤 & 아미노산',
          title: '요헤미티 에너지젤 20포 박스 & 하이뮨 아미노포텐 10포',
          desc: '장시간 주행 중에도 부담 없이 넘어가는 요헤미티 대용량 20포 세트와 후반부 근피로를 케어하는 일동후디스 하이뮨 아미노포텐입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 요헤미티 에너지젤 20포 대용량 보기', url: 'https://naver.me/FfsnsNFQ' },
            { platform: 'coupang', label: '🚀 쿠팡: 하이뮨 아미노포텐 에너지젤 10포 보기', url: 'https://link.coupang.com/a/imXk9XEyeO' }
          ]
        },
        {
          tag: 'BEST PICK 2 • 발바닥 물집 & 발목 보호 러닝양말 2종',
          title: '울티모 쿠션 스포츠 러닝양말 & 아이언빅 장목 압박 양말',
          desc: '30km 이후 발바닥 마찰열과 물집을 막아주는 울티모 쿠션 러닝양말과 발목 아치를 탄탄하게 받쳐주는 아이언빅 장목 압박 페이스 삭스입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 울티모(ULTIMO) 스포츠 러닝양말 보기', url: 'https://naver.me/G4dbd4av' },
            { platform: 'naver', label: '🟢 네이버: 아이언빅 장목 압박 러닝양말 보기', url: 'https://naver.me/xk9w9FZp' }
          ]
        },
        {
          tag: 'BEST PICK 3 • 대용량 수납 러닝조끼 & 허리벨트',
          title: '아이언빅(런런) 울트라라이트 러닝조끼 베스트 & 러닝벨트',
          desc: '다수의 에너지젤과 급수병, 경량 바람막이까지 넉넉하게 수납할 수 있는 런런 울트라라이트 경량 러닝조끼 가방과 마라톤 허리벨트입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 아이언빅(런런) 초경량 러닝조끼 보기', url: 'https://naver.me/FgEpE2Xq' },
            { platform: 'naver', label: '🟢 네이버: 아이언빅 마라톤 러닝벨트 힙색 보기', url: 'https://naver.me/xbK3KSbu' }
          ]
        }
      ]
    },
    finish: {
      badge: '🛡️ 4시간+ 안전 완주 & LSD 장거리 베스트 픽',
      headline: '4시간 이상 장시간 주행을 든든하게 지탱하는 완주 보급 & 러닝조끼·방한 기어',
      summary: '첫 풀코스·하프 완주 및 장거리 LSD 훈련 시 체력 고갈을 막아주는 완주용 에너지젤과 초경량 러닝 베스트, 체온 유지 방한 기어 구성입니다.',
      cards: [
        {
          tag: 'BEST PICK 1 • 지치지 않는 장거리 완주 에너지젤',
          title: '풀코스 완주용 마라톤 에너지젤 & 장거리 뉴트리션 보급팩',
          desc: '4시간 이상 지속되는 레이스에서 혈당 저하와 허기를 막아주는 풀코스 완주용 에너지젤 및 장거리 파워젤 보급 패키지입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 풀코스·하프 완주용 에너지젤 보급팩 보기', url: 'https://naver.me/x9V0V8SX' },
            { platform: 'naver', label: '🟢 네이버: 장거리 러닝 파워젤 & 뉴트리션 보기', url: 'https://naver.me/5qLpLN8l' }
          ]
        },
        {
          tag: 'BEST PICK 2 • 장거리 급수·보급품 수납 베스트 & 고글',
          title: '런런 울트라라이트 경량 러닝조끼 & RNRN 변색 선글라스',
          desc: '장시간 러닝 시 개인 수분과 보급품을 편리하게 휴대하는 초경량 트레일 러닝조끼 베스트와 눈의 피로를 덜어주는 변색 러닝 고글입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 아이언빅(런런) 초경량 러닝조끼 보기', url: 'https://naver.me/FgEpE2Xq' },
            { platform: 'naver', label: '🟢 네이버: 아이언빅(RNRN) 변색 러닝 선글라스 보기', url: 'https://naver.me/GlR1RiLH' }
          ]
        },
        {
          tag: 'BEST PICK 3 • 체온 유지 방한 러닝장갑 & 바라클라바',
          title: '아이언빅 겨울 방한 기모 러닝장갑 & 넥워머 바라클라바',
          desc: '출발 전 대기 시간과 장시간 야외 주행 시 체온 저하를 막아주는 스마트폰 터치 기모 러닝장갑 및 방한 목토시 바라클라바입니다.',
          buttons: [
            { platform: 'naver', label: '🟢 네이버: 아이언빅 겨울 방한 기모 러닝장갑 보기', url: 'https://naver.me/5B0q0nkT' },
            { platform: 'naver', label: '🟢 네이버: 아이언빅 겨울 러닝 넥워머 바라클라바 보기', url: 'https://naver.me/56XHXqsS' }
          ]
        }
      ]
    }
  };

  function renderCTAModule(targetPaceSec) {
    const autoTier = detectTierFromTargetPace(targetPaceSec);
    const activeTier = selectedShowcaseTier === 'auto' ? autoTier : selectedShowcaseTier;
    const tierData = PACE_TIER_SHOWCASE[activeTier] || PACE_TIER_SHOWCASE.sub330;

    // 페이스별 베스트 픽 탭 버튼 활성화 스타일 업데이트
    document.querySelectorAll('.tier-tab-btn').forEach(btn => {
      const t = btn.getAttribute('data-tier');
      const isSelected = (selectedShowcaseTier === 'auto' && t === 'auto') || (selectedShowcaseTier !== 'auto' && t === activeTier);
      if (isSelected) {
        btn.className = 'tier-tab-btn px-3 py-2 rounded-xl text-xs font-extrabold bg-brand-600 text-white shadow-sm transition';
      } else {
        btn.className = 'tier-tab-btn px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition';
      }
    });

    document.getElementById('cta-tier-badge').textContent = tierData.badge;
    document.getElementById('cta-headline').textContent = tierData.headline;
    const summaryEl = document.getElementById('cta-summary-text');
    if (summaryEl) summaryEl.textContent = tierData.summary;

    document.getElementById('cta-cards-container').innerHTML = tierData.cards.map(c => `
      <div class="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between hover:border-brand-500 transition shadow-sm">
        <div>
          <span class="inline-block text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-2">
            ${c.tag}
          </span>
          <h3 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mb-1.5">
            ${c.title}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            ${c.desc}
          </p>
        </div>
        <div class="flex flex-col gap-2">
          ${c.buttons.map(btn => `
            <a
              href="${btn.url}"
              target="_blank"
              rel="noopener noreferrer sponsored"
              class="${btn.platform === 'coupang' ? 'btn-coupang' : 'btn-naver'} w-full py-2.5 px-3 rounded-xl text-xs font-extrabold text-center flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>${btn.label}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `).join('');

    renderAffiliateCatalog();
  }

  // 전체 제휴 스토어 카탈로그 렌더링 (인라인 이름·카테고리 수정 기능 포함!)
  function renderAffiliateCatalog() {
    const allCatalogEl = document.getElementById('all-affiliate-catalog');
    const totalCountEl = document.getElementById('total-link-count-badge');
    if (!allCatalogEl) return;

    const filtered = currentCategoryFilter === 'all'
      ? affiliateLinks
      : affiliateLinks.filter(item => item.category === currentCategoryFilter);

    if (totalCountEl) {
      totalCountEl.textContent = `총 ${affiliateLinks.length}개 추천 링크 (현재 표시: ${filtered.length}개) · ✏️ 버튼으로 상품명/분류를 해당 링크에 맞게 즉시 변경할 수 있습니다`;
    }

    const coupangList = filtered.filter(item => item.platform === 'coupang');
    const naverList = filtered.filter(item => item.platform === 'naver');
    const customList = filtered.filter(item => item.platform === 'custom');

    const renderItemRow = (item, idx, badgePrefix, badgeBg, borderCls, textCls) => {
      const catTag = CATEGORY_LABELS[item.category] || '🎽 러닝기어';
      const tierTag = TIER_LABELS[item.tier] || '전체 목표';
      return `
        <div class="p-3 rounded-xl border ${borderCls} transition group">
          <div class="flex items-center justify-between gap-2">
            <a
              href="${item.url}"
              target="_blank"
              rel="noopener noreferrer sponsored"
              class="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <span class="shrink-0 px-2 py-0.5 rounded text-[10px] font-extrabold ${badgeBg} text-white">${badgePrefix} #${idx + 1}</span>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${item.name}</div>
                <div class="text-[10px] text-slate-400 truncate">${catTag} · ${tierTag} · ${item.url}</div>
              </div>
            </a>
            <div class="flex items-center gap-1 shrink-0">
              <a
                href="${item.url}"
                target="_blank"
                rel="noopener noreferrer sponsored"
                class="text-xs font-extrabold ${textCls} group-hover:translate-x-0.5 transition whitespace-nowrap mr-1"
              >
                보러가기 →
              </a>
              <button
                type="button"
                data-edit-id="${item.id}"
                title="이 링크의 상품명과 분류 수정"
                class="edit-link-btn text-[11px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-600 hover:text-white transition"
              >
                ✏️
              </button>
              <button
                type="button"
                data-delete-id="${item.id}"
                title="이 링크 삭제"
                class="delete-link-btn opacity-60 hover:opacity-100 text-slate-400 hover:text-rose-500 text-xs px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- 인라인 수정 폼 (✏️ 클릭 시 열림) -->
          <div id="edit-box-${item.id}" class="hidden mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-1.5">
            <input
              type="text"
              id="edit-name-${item.id}"
              value="${item.name.replace(/"/g, '&quot;')}"
              class="sm:col-span-6 px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
              placeholder="실제 링크에 맞는 상품명 입력"
            />
            <select
              id="edit-cat-${item.id}"
              class="sm:col-span-4 px-2 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
            >
              <option value="fuel" ${item.category === 'fuel' ? 'selected' : ''}>⚡ 에너지젤·아미노산</option>
              <option value="socks_bag" ${item.category === 'socks_bag' ? 'selected' : ''}>🧦 러닝양말·벨트·조끼</option>
              <option value="eyewear" ${item.category === 'eyewear' ? 'selected' : ''}>🕶️ 러닝 선글라스·고글</option>
              <option value="winter_gear" ${item.category === 'winter_gear' ? 'selected' : ''}>🧤 러닝장갑·넥워머</option>
            </select>
            <button
              type="button"
              data-save-id="${item.id}"
              class="save-edit-btn sm:col-span-2 px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-brand-600 text-white hover:bg-brand-700"
            >
              저장
            </button>
          </div>
        </div>
      `;
    };

    const coupangHtml = coupangList.length > 0
      ? coupangList.map((item, idx) => renderItemRow(
          item,
          idx,
          '쿠팡',
          'bg-rose-600',
          'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10',
          'text-rose-600 dark:text-rose-400'
        )).join('')
      : `<div class="text-xs text-slate-400 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">해당 카테고리의 쿠팡 파트너스 링크가 없습니다.</div>`;

    const naverHtml = naverList.length > 0
      ? naverList.map((item, idx) => renderItemRow(
          item,
          idx,
          'N쇼핑',
          'bg-emerald-600',
          'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10',
          'text-emerald-600 dark:text-emerald-400'
        )).join('')
      : `<div class="text-xs text-slate-400 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">해당 카테고리의 네이버 커넥트 링크가 없습니다.</div>`;

    const customHtml = customList.length > 0
      ? `
        <div class="md:col-span-2 space-y-2 pt-2">
          <div class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
            <span>🌐 추가 등록된 추천 사이트 &amp; 외부 스토어 (${customList.length}종)</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${customList.map((item, idx) => renderItemRow(
              item,
              idx,
              '추천링크',
              'bg-indigo-600',
              'border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10',
              'text-indigo-600 dark:text-indigo-400'
            )).join('')}
          </div>
        </div>
      `
      : '';

    allCatalogEl.innerHTML = `
      <div class="space-y-2">
        <div class="text-xs font-extrabold text-rose-600 dark:text-rose-400 mb-1 flex items-center justify-between">
          <span>🚀 쿠팡 파트너스 마라톤 보급·기어 라인업 (${coupangList.length}종)</span>
          <span class="text-[10px] font-semibold opacity-75">로켓배송 제휴</span>
        </div>
        <div class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          ${coupangHtml}
        </div>
      </div>
      <div class="space-y-2">
        <div class="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center justify-between">
          <span>🟢 네이버 쇼핑 커넥트 공식 추천 라인업 (${naverList.length}종)</span>
          <span class="text-[10px] font-semibold opacity-75">네이버페이 적립 제휴</span>
        </div>
        <div class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          ${naverHtml}
        </div>
      </div>
      ${customHtml}
    `;

    // ✏️ 인라인 수정 토글 이벤트
    allCatalogEl.querySelectorAll('.edit-link-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-edit-id');
        const box = document.getElementById(`edit-box-${id}`);
        if (box) box.classList.toggle('hidden');
      });
    });

    // 인라인 저장 이벤트
    allCatalogEl.querySelectorAll('.save-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-save-id');
        const nameInput = document.getElementById(`edit-name-${id}`);
        const catSelect = document.getElementById(`edit-cat-${id}`);
        const target = affiliateLinks.find(i => i.id === id);
        if (target && nameInput && catSelect) {
          target.name = nameInput.value.trim() || target.name;
          target.category = catSelect.value;
          saveAffiliateLinks();
          renderAffiliateCatalog();
          showToast('✅ 링크 상품명과 카테고리가 수정되었습니다!');
        }
      });
    });

    // ✕ 삭제 이벤트
    allCatalogEl.querySelectorAll('.delete-link-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const delId = btn.getAttribute('data-delete-id');
        affiliateLinks = affiliateLinks.filter(item => item.id !== delId);
        saveAffiliateLinks();
        renderAffiliateCatalog();
        showToast('🗑️ 선택한 링크가 목록에서 삭제되었습니다.');
      });
    });
  }

  // =========================================================================
  // 8. 실시간 링크·사이트 자동 감지 & 일괄 등록 매니저
  // =========================================================================
  function initAffiliateLinkManager() {
    const toggleManagerBtn = document.getElementById('toggle-link-manager-btn');
    const managerPanel = document.getElementById('link-manager-panel');
    const singleUrlInput = document.getElementById('new-link-url');
    const singleNameInput = document.getElementById('new-link-name');
    const singleCategorySelect = document.getElementById('new-link-category');
    const detectedPlatformBadge = document.getElementById('detected-platform-badge');
    const addSingleBtn = document.getElementById('add-single-link-btn');

    const bulkUrlsTextarea = document.getElementById('bulk-link-urls');
    const addBulkBtn = document.getElementById('add-bulk-links-btn');
    const copyJsonBtn = document.getElementById('export-links-code-btn');
    const resetLinksBtn = document.getElementById('reset-default-links-btn');

    // 페이스별 베스트픽 탭 클릭 이벤트 (Sub-3 / 싱글 / 3:30 / Sub-4 / 완주)
    document.querySelectorAll('.tier-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedShowcaseTier = btn.getAttribute('data-tier');
        renderCTAModule(state.targetSec / state.targetDist);
      });
    });

    // 카테고리 필터 탭
    document.querySelectorAll('.cat-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategoryFilter = btn.getAttribute('data-cat');
        document.querySelectorAll('.cat-filter-btn').forEach(b => {
          if (b.getAttribute('data-cat') === currentCategoryFilter) {
            b.className = 'cat-filter-btn px-3 py-1.5 rounded-xl text-xs font-extrabold bg-brand-600 text-white transition';
          } else {
            b.className = 'cat-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition';
          }
        });
        renderAffiliateCatalog();
      });
    });

    if (toggleManagerBtn && managerPanel) {
      toggleManagerBtn.addEventListener('click', () => {
        const isHidden = managerPanel.classList.toggle('hidden');
        toggleManagerBtn.innerHTML = isHidden
          ? '<span>➕ 내 제휴 링크 / 사이트 직접 추가·관리 열기</span>'
          : '<span>🔼 링크 관리 패널 닫기</span>';
      });
    }

    if (singleUrlInput && detectedPlatformBadge) {
      singleUrlInput.addEventListener('input', () => {
        const val = singleUrlInput.value.trim();
        if (!val) {
          detectedPlatformBadge.textContent = 'URL 입력 시 플랫폼 자동 감지';
          detectedPlatformBadge.className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500';
          return;
        }
        const plat = detectPlatformFromUrl(val);
        if (plat === 'coupang') {
          detectedPlatformBadge.textContent = '🚀 쿠팡 파트너스 링크 자동 감지됨';
          detectedPlatformBadge.className = 'text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400';
        } else if (plat === 'naver') {
          detectedPlatformBadge.textContent = '🟢 네이버 쇼핑 커넥트 링크 자동 감지됨';
          detectedPlatformBadge.className = 'text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
        } else {
          detectedPlatformBadge.textContent = '🌐 일반 외부 제휴 사이트 감지됨';
          detectedPlatformBadge.className = 'text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400';
        }
      });
    }

    if (addSingleBtn) {
      addSingleBtn.addEventListener('click', () => {
        const rawUrl = (singleUrlInput.value || '').trim();
        if (!rawUrl || !rawUrl.startsWith('http')) {
          showToast('⚠️ 올바른 주소(https://...)를 입력해 주세요!');
          return;
        }
        const platform = detectPlatformFromUrl(rawUrl);
        const category = singleCategorySelect ? singleCategorySelect.value : 'fuel';
        const defaultTitle = platform === 'coupang'
          ? `쿠팡 파트너스 추천 마라톤 아이템 (${CATEGORY_LABELS[category]})`
          : platform === 'naver'
            ? `네이버 커넥트 추천 마라톤 아이템 (${CATEGORY_LABELS[category]})`
            : `마라톤 추천 파트너 스토어 (${CATEGORY_LABELS[category]})`;

        const name = (singleNameInput.value || '').trim() || defaultTitle;

        affiliateLinks.unshift({
          id: 'link-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          platform,
          category,
          tier: 'all',
          url: rawUrl,
          name
        });

        saveAffiliateLinks();
        singleUrlInput.value = '';
        singleNameInput.value = '';
        renderAffiliateCatalog();
        showToast('✅ 새 제휴 링크가 스토어 목록에 즉시 등록되었습니다!');
      });
    }

    if (addBulkBtn && bulkUrlsTextarea) {
      addBulkBtn.addEventListener('click', () => {
        const rawText = bulkUrlsTextarea.value.trim();
        if (!rawText) {
          showToast('⚠️ 추가할 링크 주소를 한 줄에 하나씩 붙여넣어 주세요.');
          return;
        }

        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let addedCount = 0;
        const category = singleCategorySelect ? singleCategorySelect.value : 'fuel';

        lines.forEach((line, idx) => {
          const match = line.match(/(https?:\/\/[^\s]+)\s*(.*)/);
          if (!match) return;
          const url = match[1].trim();
          const customLabel = (match[2] || '').trim();
          const platform = detectPlatformFromUrl(url);

          const autoName = customLabel || (
            platform === 'coupang'
              ? `쿠팡 파트너스 마라톤 베스트 픽 #${affiliateLinks.filter(i => i.platform === 'coupang').length + 1}`
              : platform === 'naver'
                ? `네이버 쇼핑 커넥트 마라톤 베스트 픽 #${affiliateLinks.filter(i => i.platform === 'naver').length + 1}`
                : `마라톤 추천 파트너 링크 #${idx + 1}`
          );

          affiliateLinks.push({
            id: 'bulk-' + Date.now() + '-' + idx,
            platform,
            category,
            tier: 'all',
            url,
            name: autoName
          });
          addedCount++;
        });

        if (addedCount > 0) {
          saveAffiliateLinks();
          bulkUrlsTextarea.value = '';
          renderAffiliateCatalog();
          showToast(`🎉 총 ${addedCount}개의 링크가 자동으로 분류되어 등록되었습니다!`);
        } else {
          showToast('⚠️ 유효한 http/https 링크를 찾지 못했습니다.');
        }
      });
    }

    if (copyJsonBtn) {
      copyJsonBtn.addEventListener('click', async () => {
        const codeStr = JSON.stringify(affiliateLinks, null, 2);
        try {
          await navigator.clipboard.writeText(codeStr);
          showToast('📋 현재 등록된 전체 링크 JSON 데이터가 클립보드에 복사되었습니다!');
        } catch (e) {
          showToast('⚠️ 복사에 실패했습니다.');
        }
      });
    }

    if (resetLinksBtn) {
      resetLinksBtn.addEventListener('click', () => {
        affiliateLinks = [...DEFAULT_AFFILIATE_LINKS];
        saveAffiliateLinks();
        renderAffiliateCatalog();
        showToast('🔄 기본 18개(쿠팡 4종 + 네이버 14종) 링크로 복원되었습니다.');
      });
    }
  }

  // =========================================================================
  // 9. 사용자 입력 이벤트 바인딩
  // =========================================================================
  recentDistBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const newDist = parseFloat(btn.dataset.dist);
      const curVDOT = calcVDOT(state.recentDist, state.recentSec);
      state.recentDist = newDist;
      state.recentSec = Math.round(predictEquivalentTimeSec(curVDOT, newDist));
      syncRecentInputsFromSec();
      calculateAndRender();
    });
  });

  function onRecentHMSChange() {
    const h = parseInt(recentH.value || '0', 10);
    const m = parseInt(recentM.value || '0', 10);
    const s = parseInt(recentS.value || '0', 10);
    state.recentSec = Math.max(600, h * 3600 + m * 60 + s);
    recentSlider.value = state.recentSec;
    calculateAndRender();
  }
  [recentH, recentM, recentS].forEach(el => el.addEventListener('input', onRecentHMSChange));

  recentSlider.addEventListener('input', () => {
    state.recentSec = parseInt(recentSlider.value, 10);
    syncRecentInputsFromSec();
    calculateAndRender();
  });

  // 신장 / 키(cm) 이벤트 바인딩 (120cm ~ 210cm)
  if (heightInput && heightSlider) {
    heightInput.addEventListener('input', () => {
      state.height = Math.max(120, Math.min(210, parseFloat(heightInput.value || '172')));
      heightSlider.value = Math.max(130, Math.min(200, state.height));
      calculateAndRender();
    });
    heightSlider.addEventListener('input', () => {
      state.height = parseFloat(heightSlider.value);
      heightInput.value = state.height;
      calculateAndRender();
    });
    if (heightMinus) {
      heightMinus.addEventListener('click', () => {
        state.height = Math.max(120, state.height - 1);
        heightInput.value = state.height;
        heightSlider.value = Math.max(130, Math.min(200, state.height));
        calculateAndRender();
      });
    }
    if (heightPlus) {
      heightPlus.addEventListener('click', () => {
        state.height = Math.min(210, state.height + 1);
        heightInput.value = state.height;
        heightSlider.value = Math.max(130, Math.min(200, state.height));
        calculateAndRender();
      });
    }
  }

  // 체중(kg) 이벤트 바인딩 (30kg ~ 130kg 지원!)
  weightInput.addEventListener('input', () => {
    state.weight = Math.max(30, Math.min(130, parseFloat(weightInput.value || '68')));
    weightSlider.value = Math.max(30, Math.min(110, state.weight));
    calculateAndRender();
  });
  weightSlider.addEventListener('input', () => {
    state.weight = parseFloat(weightSlider.value);
    weightInput.value = state.weight;
    calculateAndRender();
  });
  weightMinus.addEventListener('click', () => {
    state.weight = Math.max(30, state.weight - 1);
    weightInput.value = state.weight;
    weightSlider.value = Math.max(30, Math.min(110, state.weight));
    calculateAndRender();
  });
  weightPlus.addEventListener('click', () => {
    state.weight = Math.min(130, state.weight + 1);
    weightInput.value = state.weight;
    weightSlider.value = Math.max(30, Math.min(110, state.weight));
    calculateAndRender();
  });

  targetDistBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const newDist = parseFloat(btn.dataset.dist);
      if (Math.abs(newDist - state.targetDist) < 0.01) return;
      state.targetDist = newDist;
      if (newDist > 30) {
        state.targetSec = 3 * 3600 + 30 * 60; // 풀코스 기본 3:30:00
      } else if (newDist > 15) {
        state.targetSec = 1 * 3600 + 45 * 60; // 하프 기본 1:45:00
      } else {
        state.targetSec = 49 * 60 + 59;       // 10km 기본 49:59 (Sub-50)
      }
      selectedShowcaseTier = 'auto';
      syncTargetInputsFromSec();
      calculateAndRender();
    });
  });

  function onTargetHMSChange() {
    const h = parseInt(targetH.value || '0', 10);
    const m = parseInt(targetM.value || '0', 10);
    const s = parseInt(targetS.value || '0', 10);
    const minAllowed = state.targetDist < 15 ? 900 : 1800;
    state.targetSec = Math.max(minAllowed, h * 3600 + m * 60 + s);
    targetSlider.value = state.targetSec;
    selectedShowcaseTier = 'auto';
    calculateAndRender();
  }
  [targetH, targetM, targetS].forEach(el => el.addEventListener('input', onTargetHMSChange));

  targetSlider.addEventListener('input', () => {
    state.targetSec = parseInt(targetSlider.value, 10);
    selectedShowcaseTier = 'auto';
    syncTargetInputsFromSec();
    calculateAndRender();
  });

  strategyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.strategy = btn.dataset.strategy;
      calculateAndRender();
    });
  });

  // 다크 모드 / 라이트 모드 전환
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  themeBtn.addEventListener('click', () => {
    const htmlEl = document.documentElement;
    const isDark = htmlEl.classList.toggle('dark');
    themeIcon.textContent = isDark ? '☀️' : '🌙';
    themeText.textContent = isDark ? '라이트 모드' : '다크 모드';
  });

  function showToast(message) {
    const toast = document.getElementById('toast-msg');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // 카카오톡 공유용 텍스트 복사
  document.getElementById('copy-kakao-btn').addEventListener('click', async () => {
    const curVDOT = calcVDOT(state.recentDist, state.recentSec).toFixed(1);
    const tarVDOT = calcVDOT(state.targetDist, state.targetSec).toFixed(1);
    const targetName = state.targetDist > 30 ? '풀코스(42.195km)' : state.targetDist > 15 ? '하프(21.0975km)' : '10km 레이스(10.0km)';
    const targetPace = formatPace(state.targetSec / state.targetDist);
    const prob = document.getElementById('prob-val').textContent;
    const kcal = document.getElementById('kcal-val').textContent;
    const strategyName = {
      even: '이븐 페이스',
      negative: '네거티브 스플릿',
      positive: '포지티브 스플릿'
    }[state.strategy];

    const rows = Array.from(document.querySelectorAll('#split-table-body tr'));
    const splitSummary = rows.map(r => {
      const cols = r.querySelectorAll('td');
      return `• ${cols[0].textContent.trim()}: ${cols[3].textContent.trim()} (${cols[1].textContent.trim()})`;
    }).join('\n');

    const shareText = [
      `🏃‍♂️ [마라톤 레이스 전략 리포트]`,
      `━━━━━━━━━━━━━━`,
      `🎯 목표 종목: ${targetName}`,
      `⏱️ 목표 기록: ${formatHMS(state.targetSec)} (평균 ${targetPace}/km)`,
      `🧭 주행 전략: ${strategyName}`,
      `📊 VDOT 진단: 현재 ${curVDOT} → 요구 ${tarVDOT} (달성 가능성 ${prob}%)`,
      `⚖️ 신체·대사: ${state.height}cm · ${state.weight}kg (예상 소모 ${kcal}kcal)`,
      `━━━━━━━━━━━━━━`,
      `📌 [구간별 통과 시간표]`,
      splitSummary,
      `━━━━━━━━━━━━━━`,
      `⚡ 보급 플랜: ${state.targetDist < 15 ? '출발 30분 전 + 5km 반환점 보급' : '출발 30분 전 + 매 7km 에너지젤 & 급수'}`,
      `🔥 훈련 권장 페이스: E(${document.getElementById('pace-e').textContent}) / M(${document.getElementById('pace-m').textContent}) / T(${document.getElementById('pace-t').textContent}) / I(${document.getElementById('pace-i').textContent})`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(shareText);
      showToast('💬 카카오톡 공유용 레이스 전략 텍스트가 복사되었습니다!');
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('💬 카카오톡 공유용 레이스 전략 텍스트가 복사되었습니다!');
    }
  });

  // 결과 이미지 저장 (html2canvas)
  document.getElementById('save-image-btn').addEventListener('click', async () => {
    const targetEl = document.getElementById('capture-dashboard');
    const btn = document.getElementById('save-image-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<span>⏳ 이미지 생성 중...</span>';
    btn.disabled = true;

    try {
      const isDark = document.documentElement.classList.contains('dark');
      const canvas = await html2canvas(targetEl, {
        backgroundColor: isDark ? '#020617' : '#f1f5f9',
        scale: 2,
        useCORS: true
      });
      const link = document.createElement('a');
      const targetName = state.targetDist > 30 ? 'Full' : 'Half';
      link.download = `marathon-strategy-${targetName}-${formatHMS(state.targetSec).replace(/:/g, '')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('📸 레이스 전략 이미지가 저장되었습니다!');
    } catch (e) {
      showToast('⚠️ 이미지 저장 중 오류가 발생했습니다. 브라우저 캡처를 이용해 주세요.');
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  });

  // =========================================================================
  // 10. 애드센스 승인용 법적 고지 모달
  // =========================================================================
  const policyModal = document.getElementById('policy-modal');
  const policyModalTitle = document.getElementById('policy-modal-title');
  const policyModalBody = document.getElementById('policy-modal-body');
  const policyCloseBtn = document.getElementById('policy-modal-close');

  const POLICY_CONTENTS = {
    privacy: {
      title: '개인정보처리방침 및 쿠키(AdSense)·제휴 고지',
      html: `
        <p class="mb-3">본 웹사이트(이하 "Pacecraft Runner")는 이용자의 개인정보를 보호하며 『개인정보 보호법』, 공정거래위원회 추천·보증 등에 관한 표시·광고 심사지침 및 Google AdSense 정책을 엄격히 준수합니다.</p>
        <h4 class="font-bold text-slate-900 dark:text-white mt-4 mb-1">1. 개인정보의 수집 및 로컬 저장 안내</h4>
        <p class="mb-2">본 사이트는 별도의 회원가입 없이 무료로 제공됩니다. 사용자가 입력하는 주행 기록, 체중 및 커스텀 링크 데이터는 서버로 전송되지 않으며 사용자의 브라우저(LocalStorage) 내에서만 처리됩니다.</p>
        <h4 class="font-bold text-slate-900 dark:text-white mt-4 mb-1">2. Google AdSense 광고 및 쿠키(Cookie) 정책</h4>
        <p class="mb-2">• Google을 포함한 제3자 광고 공급업체는 쿠키를 사용하여 사용자의 이전 웹사이트 방문 기록을 바탕으로 맞춤형 광고를 게재합니다.</p>
        <p class="mb-2">• 이용자는 언제든지 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" class="text-brand-500 underline">Google 광고 설정</a>에서 개인 맞춤형 광고를 해제할 수 있습니다.</p>
        <h4 class="font-bold text-slate-900 dark:text-white mt-4 mb-1">3. 쿠팡 파트너스 및 네이버 쇼핑 커넥트 제휴 고지</h4>
        <p>본 웹사이트에 게재된 상품 링크 중 일부는 쿠팡 파트너스 및 네이버 쇼핑 커넥트 활동의 일환으로 제공되며, 이용자가 해당 링크를 통해 구매할 경우 사이트 운영자에게 일정액의 수수료가 제공될 수 있습니다. 구매자에게는 어떠한 추가 비용도 발생하지 않습니다.</p>
      `
    },
    terms: {
      title: '서비스 이용약관 및 의학적 면책공고',
      html: `
        <h4 class="font-bold text-slate-900 dark:text-white mb-1">제1조 (목적)</h4>
        <p class="mb-3">본 약관은 Pacecraft Runner가 제공하는 VDOT 분석, 스플릿 계산기, 에너지젤 보급 가이드 및 훈련 칼럼의 이용 기준을 규정합니다.</p>
        <h4 class="font-bold text-slate-900 dark:text-white mb-1">제2조 (의학적·전문적 면책 조항)</h4>
        <p class="mb-3">본 사이트가 산출하는 VDOT 레벨, 목표 달성 가능성(%), 권장 훈련 페이스 및 탄수화물·수분 섭취량은 스포츠 생리학 통계 모델(Jack Daniels Running Formula 및 Margaria 공식)에 기반한 참고용 추정치입니다. 당일 기상 조건과 개인의 심폐 건강 상태에 따라 실제 결과는 달라질 수 있으므로 무리한 주행을 피하시고 필요 시 전문의와 상담하시기 바랍니다.</p>
      `
    },
    contact: {
      title: '운영자 소개 및 제휴·광고 문의',
      html: `
        <p class="mb-3"><strong>Pacecraft Runner</strong>는 데이터 기반 마라톤 훈련 설계와 검증된 러닝 기어 큐레이션을 제공하는 러너 전용 웹 플랫폼입니다.</p>
        <h4 class="font-bold text-slate-900 dark:text-white mt-4 mb-1">광고 및 파트너십 안내</h4>
        <p>본 사이트는 Google AdSense 디스플레이 광고, 쿠팡 파트너스, 네이버 쇼핑 커넥트 공식 제휴 프로그램과 함께 운영됩니다. 제휴 상품 등록이나 기능 개선 제안은 운영자 채널을 통해 문의해 주세요.</p>
      `
    }
  };

  document.querySelectorAll('[data-policy]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.getAttribute('data-policy');
      const data = POLICY_CONTENTS[key];
      if (!data) return;
      policyModalTitle.textContent = data.title;
      policyModalBody.innerHTML = data.html;
      policyModal.classList.remove('hidden');
      policyModal.classList.add('flex');
    });
  });

  if (policyCloseBtn) {
    policyCloseBtn.addEventListener('click', () => {
      policyModal.classList.add('hidden');
      policyModal.classList.remove('flex');
    });
  }

  if (policyModal) {
    policyModal.addEventListener('click', (e) => {
      if (e.target === policyModal) {
        policyModal.classList.add('hidden');
        policyModal.classList.remove('flex');
      }
    });
  }

  // =========================================================================
  // 11. 신규 10대 PRO 레이스 연구소 (10-in-1 Marathon Lab) 상태 및 렌더링
  // =========================================================================
  // [마라톤 랩 PRO 대회 커스텀 및 영구 저장 시스템]
  // =========================================================================
  const CHECKLIST_STORAGE_KEY = 'marathon_pro_checklist_v1';
  const RACE_DATE_STORAGE_KEY = 'marathon_pro_race_date_v1';
  const RACE_COURSE_STORAGE_KEY = 'marathon_pro_course_type_v1';
  const RACE_SELECTED_STORAGE_KEY = 'marathon_pro_selected_race_v2';
  const RACES_CUSTOM_STORAGE_KEY = 'marathon_pro_races_custom_v2';
  const ADMIN_PW_STORAGE_KEY = 'marathon_pro_admin_pw_v1';
  const ADMIN_MEMO_STORAGE_KEY = 'marathon_pro_admin_memo_v1';
  const DAILY_STORAGE_KEY = 'marathon_pro_daily_checklist_v1';

  const DEFAULT_MAJOR_RACES = {
    jtbc: {
      id: 'jtbc',
      name: 'JTBC 서울마라톤',
      fullName: '🔥 JTBC 서울마라톤 (후반 완만 언덕)',
      date: '2026-11-01',
      course: 'rolling',
      url: 'https://marathon.jtbc.com/'
    },
    seoul: {
      id: 'seoul',
      name: '서울마라톤 (동아)',
      fullName: '🏆 서울마라톤 (동아·평탄 고속)',
      date: '2027-03-21',
      course: 'flat',
      url: 'http://www.seoul-marathon.com/'
    },
    chuncheon: {
      id: 'chuncheon',
      name: '춘천마라톤',
      fullName: '🍁 춘천마라톤 (호반 업다운 코어)',
      date: '2026-10-25',
      course: 'hilly',
      url: 'http://marathon.chosun.com/'
    },
    daegu: {
      id: 'daegu',
      name: '대구국제마라톤',
      fullName: '⚡ 대구국제마라톤 (초고속 순환)',
      date: '2027-02-21',
      course: 'flat',
      url: 'https://daegumarathon.or.kr/'
    },
    gyeongju: {
      name: '경주마라톤',
      id: 'gyeongju',
      fullName: '🌸 경주마라톤 (완만 구릉지)',
      date: '2026-10-17',
      course: 'rolling',
      url: 'http://www.gyeongjumarathon.com/'
    }
  };

  function getCustomRaces() {
    try {
      const stored = localStorage.getItem(RACES_CUSTOM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_MAJOR_RACES));
  }

  function resetDefaultMajorRaces() {
    if (!isCurrentAdminApproved()) {
      openAdminAuthModal('기본 대회 목록 초기화');
      return;
    }
    if (!confirm('기본 5대 메이저 마라톤 대회 초기 설정(날짜·홈페이지 주소)으로 복원하시겠습니까?')) return;
    majorRaces = JSON.parse(JSON.stringify(DEFAULT_MAJOR_RACES));
    saveCustomRaces(majorRaces);
    currentSelectedRaceKey = 'seoul';
    renderRaceButtons();
    selectRace('seoul');
    showToast('🔄 기본 5대 메이저 대회 일정 및 주소가 복원되었습니다.');
  }

  function saveCustomRaces(races) {
    try {
      localStorage.setItem(RACES_CUSTOM_STORAGE_KEY, JSON.stringify(races));
    } catch (e) {}
  }

  let majorRaces = getCustomRaces();
  let currentSelectedRaceKey = 'jtbc';

  try {
    const savedKey = localStorage.getItem(RACE_SELECTED_STORAGE_KEY);
    if (savedKey && (majorRaces[savedKey] || savedKey === 'custom')) {
      currentSelectedRaceKey = savedKey;
    }
  } catch (e) {}

  let initialRaceDate = '2026-11-01';
  let initialCourseType = 'rolling';

  if (currentSelectedRaceKey !== 'custom' && majorRaces[currentSelectedRaceKey]) {
    initialRaceDate = majorRaces[currentSelectedRaceKey].date;
    initialCourseType = majorRaces[currentSelectedRaceKey].course;
  } else {
    try {
      const savedDate = localStorage.getItem(RACE_DATE_STORAGE_KEY);
      if (savedDate) initialRaceDate = savedDate;
      const savedCourse = localStorage.getItem(RACE_COURSE_STORAGE_KEY);
      if (savedCourse) initialCourseType = savedCourse;
    } catch (e) {}
  }

  const labState = {
    raceDate: initialRaceDate,
    courseType: initialCourseType,
    tempC: 10,            // -5 ~ 30
    humidity: 55,         // 30 ~ 95
    windMs: 2,            // 0 ~ 10
    age: 35,
    restHR: 58,
    cadenceSpm: 180,
    schedWeeks: 8
  };


  const CHECKLIST_ITEMS = [
    {
      id: 'chk-gel',
      title: '레이스 메인 에너지젤 (5~6포 여유분 포함)',
      desc: '출발 전 및 매 7km 보급용 요헤미티 파워젤 / 아미노바이탈 아미노샷',
      btnLabel: '🟢 네이버: 요헤미티 에너지젤 10포 보기',
      url: 'https://naver.me/5PWMWh8M',
      platform: 'naver'
    },
    {
      id: 'chk-amino',
      title: '출발 30분 전·하프 근피로 방지 아미노산',
      desc: '고함량 BCAA·아미노산 보급용 일동후디스 하이뮨 아미노포텐',
      btnLabel: '🚀 쿠팡: 하이뮨 아미노포텐 10포 보기',
      url: 'https://link.coupang.com/a/imXk9XEyeO',
      platform: 'coupang'
    },
    {
      id: 'chk-belt',
      title: '흔들림 없는 에너지젤·휴대폰 수납 러닝벨트',
      desc: '배번표 및 에너지젤 6포를 밀착 수납하는 아이언빅 플립벨트 힙색',
      btnLabel: '🟢 네이버: 아이언빅 마라톤 러닝벨트 보기',
      url: 'https://naver.me/xbK3KSbu',
      platform: 'naver'
    },
    {
      id: 'chk-socks',
      title: '장거리 물집 방지·발목 압박 러닝양말',
      desc: '울티모 논슬립 쿠션 러닝양말 또는 아이언빅 장목 압박 페이스 삭스',
      btnLabel: '🟢 네이버: 울티모 스포츠 러닝양말 보기',
      url: 'https://naver.me/G4dbd4av',
      platform: 'naver'
    },
    {
      id: 'chk-vest',
      title: '장거리 급수·방풍자켓 수납 초경량 러닝조끼',
      desc: 'LSD 및 풀코스 개인 급수 휴대용 아이언빅(런런) 울트라라이트 베스트',
      btnLabel: '🟢 네이버: 런런 초경량 러닝조끼 보기',
      url: 'https://naver.me/FgEpE2Xq',
      platform: 'naver'
    },
    {
      id: 'chk-sunglasses',
      title: '자외선·아스팔트 난반사 차단 러닝 고글',
      desc: '아이언빅 초경량 스포츠 편광 선글라스 또는 RNRN 변색 고글',
      btnLabel: '🟢 네이버: 아이언빅 편광 러닝 선글라스 보기',
      url: 'https://naver.me/5VxixMPP',
      platform: 'naver'
    },
    {
      id: 'chk-winter',
      title: '출발 대기·동계 보온 러닝장갑 & 넥워머',
      desc: '스마트폰 터치 기모 러닝장갑 및 바라클라바 목토시',
      btnLabel: '🟢 네이버: 아이언빅 방한 러닝장갑 보기',
      url: 'https://naver.me/5B0q0nkT',
      platform: 'naver'
    },
    {
      id: 'chk-bib',
      title: '대회 배번표 · 기록칩 확인 & 러닝워치 100% 충전',
      desc: '전날 밤 배번표 미리 장착 및 가민·애플워치 GPS 배터리 완충 필수',
      btnLabel: '🚀 쿠팡: 아미노바이탈 퍼펙트젤 보기',
      url: 'https://link.coupang.com/a/imXiIz3QnA',
      platform: 'coupang'
    }
  ];

  let checkedMap = {};
  try {
    const savedChk = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (savedChk) checkedMap = JSON.parse(savedChk) || {};
  } catch (e) {}

  function saveChecklistState() {
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checkedMap));
    } catch (e) {}
  }

  function renderProLabTools(currentVDOT, targetVDOT, targetPaceSec, metabolic, paces) {
    // --- 1. 대회 D-Day & 코스 난이도 ---
    const ddayBadge = document.getElementById('dday-counter-badge');
    const ddayCourseSummary = document.getElementById('dday-course-summary');
    if (ddayBadge && ddayCourseSummary) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(labState.raceDate + 'T00:00:00');
      const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        const weeksLeft = (diffDays / 7).toFixed(1);
        ddayBadge.textContent = `D-${diffDays} (${weeksLeft}주 남음)`;
      } else if (diffDays === 0) {
        ddayBadge.textContent = `🔥 D-DAY (오늘 대회!)`;
      } else {
        ddayBadge.textContent = `D+${Math.abs(diffDays)} (대회 종료·날짜 변경 가능)`;
      }

      const coursePenalties = { flat: 0, rolling: 2.5, hilly: 6.0 };
      const penSecPerKm = coursePenalties[labState.courseType] || 0;
      const totalCoursePenaltySec = Math.round(penSecPerKm * state.targetDist);
      const adjCourseTime = formatHMS(state.targetSec + totalCoursePenaltySec);

      const courseDescMap = {
        flat: `<strong>평지 고속 코스:</strong> 고도 편차가 적어 목표 기록(<strong>${formatHMS(state.targetSec)}</strong>) 달성에 최적입니다.`,
        rolling: `<strong>완만한 언덕 코스:</strong> 언덕 구간 페이스 저하(+2.5초/km) 감안 시 실전 보정 기록 <strong>${adjCourseTime}</strong> 예상`,
        hilly: `<strong>업다운 난코스:</strong> 오르막 체력 소모(+6초/km) 감안 시 보정 기록 <strong>${adjCourseTime}</strong> (전반 오버페이스 절대 금물)`
      };
      ddayCourseSummary.innerHTML = courseDescMap[labState.courseType];
    }

    // --- 2 & 3. 날씨(기온·습도·풍속) 페이스 보정기 & 기온별 러닝 복장 코디네이터 ---
    const tempValEl = document.getElementById('weather-temp-val');
    const humValEl = document.getElementById('weather-hum-val');
    const windValEl = document.getElementById('weather-wind-val');
    const weatherBadge = document.getElementById('weather-penalty-badge');
    const weatherResultBox = document.getElementById('weather-result-box');
    const outfitTempBadge = document.getElementById('outfit-temp-badge');
    const outfitBox = document.getElementById('outfit-recommendation-box');
    const outfitLinks = document.getElementById('outfit-affiliate-links');

    if (tempValEl && weatherResultBox) {
      const t = labState.tempC;
      const h = labState.humidity;
      const w = labState.windMs;

      let tempStatus = '마라톤 최적 기온';
      if (t < 3) tempStatus = '동계 저온 (보온 필수)';
      else if (t < 9) tempStatus = '쾌적·쌀쌀 (기록 단축 유리)';
      else if (t <= 14) tempStatus = '마라톤 최적 기온';
      else if (t <= 20) tempStatus = '다소 더움 (수분 보충 주의)';
      else tempStatus = '고온 주의 (페이스 하향 필수)';

      tempValEl.textContent = `${t}°C (${tempStatus})`;
      humValEl.textContent = `${h}%`;
      windValEl.textContent = `${w} m/s`;

      // 기온 보정 (최적 11°C 기준)
      let tempPenaltySec = 0;
      if (t > 13) tempPenaltySec = (t - 13) * 1.35;
      else if (t < 4) tempPenaltySec = (4 - t) * 0.65;

      // 습도 보정 (15°C 이상이면서 습도 65% 초과 시 발한 효율 저하)
      const humPenaltySec = (t >= 15 && h > 65) ? ((h - 65) * 0.18) : 0;
      // 맞바람 보정 (2m/s 초과 시 공기저항 증가)
      const windPenaltySec = w > 2 ? (w - 2) * 1.45 : 0;

      const totalWeatherPenaltyPerKm = Math.round((tempPenaltySec + humPenaltySec + windPenaltySec) * 10) / 10;
      const adjustedPaceSec = targetPaceSec + totalWeatherPenaltyPerKm;
      const adjustedTotalSec = adjustedPaceSec * state.targetDist;
      const extraWaterPerHour = t > 14 ? Math.round((t - 14) * 28 + Math.max(0, h - 60) * 3) : 0;

      if (totalWeatherPenaltyPerKm <= 1.5) {
        weatherBadge.textContent = `최적 조건 (+${totalWeatherPenaltyPerKm.toFixed(1)}"/km)`;
        weatherBadge.className = 'text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
      } else if (totalWeatherPenaltyPerKm <= 6) {
        weatherBadge.textContent = `주의 조건 (+${totalWeatherPenaltyPerKm.toFixed(1)}"/km 늦춤 권장)`;
        weatherBadge.className = 'text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400';
      } else {
        weatherBadge.textContent = `경고 조건 (+${totalWeatherPenaltyPerKm.toFixed(1)}"/km 감속 필수)`;
        weatherBadge.className = 'text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400';
      }

      weatherResultBox.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-slate-500 dark:text-slate-400">기존 목표 페이스 → <strong>날씨 보정 권장 페이스</strong></span>
          <span class="font-mono font-extrabold text-brand-600 dark:text-brand-400">${formatPace(targetPaceSec)}/km → ${formatPace(adjustedPaceSec)}/km</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500 dark:text-slate-400">날씨 반영 예상 완주 시간</span>
          <span class="font-mono font-bold">${formatHMS(adjustedTotalSec)} (${totalWeatherPenaltyPerKm > 0 ? `+${formatDurationClean(adjustedTotalSec - state.targetSec)} 보정` : '손실 없음'})</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500 dark:text-slate-400">기온·습도 따른 추가 수분 필요량</span>
          <span class="font-mono font-bold text-cyan-600 dark:text-cyan-400">${extraWaterPerHour > 0 ? `시간당 +${extraWaterPerHour}ml 추가 급수 필수` : '기본 급수량 유지'}</span>
        </div>
      `;

      // 기온별 러닝 복장 코디네이터
      if (outfitTempBadge && outfitBox && outfitLinks) {
        outfitTempBadge.textContent = `${t}°C 맞춤 레이스 착장`;
        let outfitItems = [];
        let gearBtns = [];

        if (t <= 4) {
          outfitItems = [
            '👕 <strong>상의:</strong> 기능성 긴팔 베이스레이어 + 경량 방풍 자켓(또는 싱글렛 레이어드)',
            '👖 <strong>하의:</strong> 롱 타이즈 또는 기모 하프타이즈 + <strong>장목 압박 러닝양말</strong>',
            '🧤 <strong>방한 필수템:</strong> <strong>기모 러닝장갑(또는 2in1 방풍 미튼)</strong> + <strong>기모 넥워머 바라클라바</strong>'
          ];
          gearBtns = [
            { label: '🟢 네이버: 아이언빅 겨울 방한 기모 러닝장갑', url: 'https://naver.me/5B0q0nkT' },
            { label: '🟢 네이버: 아이언빅 겨울 러닝 넥워머 바라클라바', url: 'https://naver.me/56XHXqsS' },
            { label: '🟢 네이버: 아이언빅 2in1 방한 미튼 장갑', url: 'https://naver.me/5suzuHzr' },
            { label: '🟢 네이버: 아이언빅 장목 압박 러닝양말', url: 'https://naver.me/xk9w9FZp' }
          ];
        } else if (t <= 11) {
          outfitItems = [
            '👕 <strong>상의:</strong> 레이싱 싱글렛(또는 반팔) + 출발 대기용 암슬리브(팔토시)',
            '🩳 <strong>하의:</strong> 레이싱 쇼츠(또는 하프타이즈) + <strong>물집방지 쿠션 러닝양말</strong>',
            '🧤 <strong>레이스 기어:</strong> 출발 초반 손 시림 방지용 <strong>러닝장갑</strong> + <strong>수납 러닝벨트</strong> + <strong>변색 고글</strong>'
          ];
          gearBtns = [
            { label: '🟢 네이버: 아이언빅 겨울 방한 러닝장갑', url: 'https://naver.me/5B0q0nkT' },
            { label: '🟢 네이버: 아이언빅(RNRN) 변색 러닝 선글라스', url: 'https://naver.me/GlR1RiLH' },
            { label: '🟢 네이버: 아이언빅 마라톤 러닝벨트 힙색', url: 'https://naver.me/xbK3KSbu' },
            { label: '🟢 네이버: 울티모(ULTIMO) 스포츠 러닝양말', url: 'https://naver.me/G4dbd4av' }
          ];
        } else {
          outfitItems = [
            '👕 <strong>상의:</strong> 통기성 극대화 초경량 레이싱 싱글렛',
            '🩳 <strong>하의:</strong> 3~4인치 스플릿 레이싱 쇼츠 + <strong>통풍 논슬립 러닝양말</strong>',
            '🕶️ <strong>자외선·급수 기어:</strong> <strong>초경량 편광 러닝 선글라스</strong> + <strong>울트라라이트 러닝조끼(개인 급수)</strong>'
          ];
          gearBtns = [
            { label: '🟢 네이버: 아이언빅 스포츠 편광 러닝 선글라스', url: 'https://naver.me/5VxixMPP' },
            { label: '🟢 네이버: 아이언빅(런런) 초경량 러닝조끼 베스트', url: 'https://naver.me/FgEpE2Xq' },
            { label: '🟢 네이버: 울티모(ULTIMO) 스포츠 러닝양말', url: 'https://naver.me/G4dbd4av' },
            { label: '🟢 네이버: 아이언빅 마라톤 러닝벨트 힙색', url: 'https://naver.me/xbK3KSbu' }
          ];
        }

        outfitBox.innerHTML = outfitItems.map(line => `
          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200">${line}</div>
        `).join('');

        outfitLinks.innerHTML = gearBtns.map(b => `
          <a href="${b.url}" target="_blank" rel="noopener noreferrer sponsored" class="btn-naver py-2 px-2.5 rounded-xl text-[11px] font-extrabold text-center truncate shadow-xs">
            ${b.label}
          </a>
        `).join('');
      }
    }

    // --- 4. 손목 페이스 밴드 생성기 ---
    const pacebandHeader = document.getElementById('paceband-header-title');
    const pacebandTbody = document.getElementById('paceband-tbody');
    if (pacebandHeader && pacebandTbody) {
      const distName = state.targetDist > 30 ? '풀코스 42.195K' : state.targetDist > 15 ? '하프 21.0975K' : '10K 레이스';
      pacebandHeader.textContent = `${distName} • ${formatHMS(state.targetSec)} (${formatPace(targetPaceSec)}/km)`;

      const splitRows = Array.from(document.querySelectorAll('#split-table-body tr'));
      pacebandTbody.innerHTML = splitRows.map(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 4) return '';
        const kmText = tds[0].textContent.trim();
        const paceText = tds[1].textContent.trim().replace('/km', '');
        const cumText = tds[3].textContent.trim();
        const kmNum = parseFloat(kmText.replace(/[^0-9.]/g, '')) || 0;

        let fuelMark = '-';
        if (state.targetDist < 15) {
          if (Math.abs(kmNum - 5) < 0.2) fuelMark = '⚡젤+💧';
        } else {
          if ([5, 15, 21.1, 25, 35].some(k => Math.abs(kmNum - k) < 0.3)) fuelMark = '⚡젤+💧';
          else if ([10, 20, 30, 40].some(k => Math.abs(kmNum - k) < 0.3)) fuelMark = '💧급수';
        }

        return `
          <tr>
            <td class="py-1 text-left font-bold text-slate-200">${kmText}</td>
            <td class="py-1 text-center text-brand-300">${paceText}</td>
            <td class="py-1 text-right font-extrabold text-white">${cumText}</td>
            <td class="py-1 text-right text-[10px] text-amber-400 font-sans font-bold">${fuelMark}</td>
          </tr>
        `;
      }).join('');
    }

    // --- 5. 대회 3일 전 카보로딩 계산기 ---
    const carboWeightBadge = document.getElementById('carboload-weight-badge');
    const carboCards = document.getElementById('carboload-summary-cards');
    const carboMealGuide = document.getElementById('carboload-meal-guide');
    if (carboWeightBadge && carboCards && carboMealGuide) {
      carboWeightBadge.textContent = `${state.height}cm · ${state.weight}kg 기준`;
      const carbPerKg = state.targetDist > 30 ? 8.5 : state.targetDist > 15 ? 6.8 : 5.2;
      const dailyTargetCarb = Math.round(state.weight * carbPerKg);
      const threeDayTotalCarb = dailyTargetCarb * 3;
      const raceDayGels = state.targetDist > 30 ? 6 : state.targetDist > 15 ? 3 : 2;
      const recommendedBoxSize = (raceDayGels + 4) >= 10 ? '20포 대용량 박스 (훈련 리허설 + 대회 당일)' : '10포 레이스 세트';

      const riceBowls = Math.max(2, Math.round((dailyTargetCarb * 0.55) / 65));
      const bananas = Math.max(1, Math.round((dailyTargetCarb * 0.2) / 27));
      const gelsPerDay = Math.max(1, Math.round((dailyTargetCarb * 0.15) / 28));

      carboCards.innerHTML = `
        <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div class="text-[11px] text-slate-500 dark:text-slate-400">일일 목표 탄수화물 (D-3~D-1)</div>
          <div class="text-lg font-mono font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">${dailyTargetCarb}g / 일</div>
          <div class="text-[10px] text-slate-400">체중 1kg당 ${carbPerKg}g 로딩</div>
        </div>
        <div class="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
          <div class="text-[11px] text-slate-500 dark:text-slate-400">3일 누적 글리코겐 충전량</div>
          <div class="text-lg font-mono font-extrabold text-brand-600 dark:text-brand-400 mt-0.5">${threeDayTotalCarb.toLocaleString()}g</div>
          <div class="text-[10px] text-slate-400">간·근육 글리코겐 100% 포화</div>
        </div>
        <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 col-span-2 sm:col-span-1">
          <div class="text-[11px] text-slate-500 dark:text-slate-400">필요 에너지젤 수량 (리허설+실전)</div>
          <div class="text-lg font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">최소 ${raceDayGels + 4}포</div>
          <div class="text-[10px] text-slate-400">${recommendedBoxSize} 권장</div>
        </div>
      `;

      carboMealGuide.innerHTML = `
        <div class="font-bold text-slate-900 dark:text-white">🍽️ ${state.weight}kg 러너를 위한 하루(${dailyTargetCarb}g) 카보로딩 실전 식단 예시:</div>
        <div class="text-slate-600 dark:text-slate-300">• <strong>주식(복합 탄수화물):</strong> 흰쌀밥 또는 파스타/베이글 <strong>약 ${riceBowls}공기 분량</strong> (${riceBowls * 65}g)</div>
        <div class="text-slate-600 dark:text-slate-300">• <strong>간식(과일·단당류):</strong> 바나나 <strong>${bananas}개</strong> + 꿀물/이온음료 500ml (${bananas * 27 + 30}g)</div>
        <div class="text-slate-600 dark:text-slate-300">• <strong>소화 부담 없는 액상 로딩:</strong> 식간에 <strong>요헤미티 에너지젤 ${gelsPerDay}포</strong> 추가 섭취 시 위장 팽만감 없이 목표량 100% 달성!</div>
      `;
    }

    // --- 6. 카보넨(Karvonen) 심박수 존 계산기 ---
    const maxHrBadge = document.getElementById('max-hr-badge');
    const hrZonesList = document.getElementById('hr-zones-list');
    if (maxHrBadge && hrZonesList) {
      const maxHR = Math.round(207 - 0.7 * labState.age);
      const hrr = Math.max(40, maxHR - labState.restHR);
      maxHrBadge.textContent = `최대심박 ${maxHR} bpm · 여유심박 ${hrr}`;

      const zones = [
        { name: 'Zone 1 • 회복주 (Recovery)', minPct: 0.50, maxPct: 0.60, matchPace: formatPace(paces.eSlow), color: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800' },
        { name: 'Zone 2 • 유산소 기반 LSD (E 페이스)', minPct: 0.60, maxPct: 0.70, matchPace: `${formatPace(paces.eFast)}~${formatPace(paces.eSlow)}`, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
        { name: 'Zone 3 • 마라톤 레이스 (M 페이스)', minPct: 0.70, maxPct: 0.80, matchPace: formatPace(paces.mPace), color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' },
        { name: 'Zone 4 • 젖산역치 지속주 (T 페이스)', minPct: 0.80, maxPct: 0.90, matchPace: formatPace(paces.tPace), color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
        { name: 'Zone 5 • VO₂max 인터벌 (I 페이스)', minPct: 0.90, maxPct: 1.00, matchPace: formatPace(paces.iPace), color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' }
      ];

      hrZonesList.innerHTML = zones.map(z => {
        const lowBpm = Math.round(labState.restHR + hrr * z.minPct);
        const highBpm = Math.round(labState.restHR + hrr * z.maxPct);
        return `
          <div class="p-2.5 rounded-xl ${z.color} flex items-center justify-between gap-2">
            <div>
              <div class="font-extrabold">${z.name}</div>
              <div class="text-[10px] opacity-80">매칭 훈련 페이스: ${z.matchPace}/km</div>
            </div>
            <div class="font-mono font-extrabold text-sm">${lowBpm} ~ ${highBpm} bpm</div>
          </div>
        `;
      }).join('');
    }

    // --- 7. 신장(키) 기반 최적 케이던스 & 보폭(Stride Length) 분석기 ---
    const strideHeightBadge = document.getElementById('stride-height-badge');
    const cadenceHeightText = document.getElementById('cadence-height-text');
    const cadenceSpmVal = document.getElementById('cadence-spm-val');
    const cadenceBox = document.getElementById('cadence-analysis-box');
    if (strideHeightBadge && cadenceBox) {
      strideHeightBadge.textContent = `신장 ${state.height}cm 기준`;
      if (cadenceHeightText) cadenceHeightText.textContent = state.height;

      const speedMeterPerMin = 1000 / (targetPaceSec / 60);
      const strideLengthM = speedMeterPerMin / labState.cadenceSpm;
      const strideToHeightRatio = (strideLengthM / (state.height / 100)) * 100;

      // 키와 속도를 고려한 이상적 케이던스 추천 (키가 클수록 적정 케이던스가 약간 낮고, 속도가 빠를수록 높음)
      const idealCadence = Math.round(Math.min(194, Math.max(170, 182 - (state.height - 170) * 0.25 + (speedMeterPerMin - 200) * 0.06)));
      const idealStrideM = speedMeterPerMin / idealCadence;

      cadenceSpmVal.textContent = `${labState.cadenceSpm} spm (보폭 ${strideLengthM.toFixed(2)}m)`;

      let strideDiagnosis = '✅ 신장 대비 이상적인 보폭·케이던스 밸런스입니다!';
      if (strideToHeightRatio > 72) {
        strideDiagnosis = `⚠️ <strong>오버스트라이딩(과보폭) 주의:</strong> 신장(${state.height}cm) 대비 보폭(${strideLengthM.toFixed(2)}m, ${strideToHeightRatio.toFixed(0)}%)이 넓어 무릎·정강이 충격이 큽니다. 케이던스를 <strong>${idealCadence} spm</strong> 이상으로 높여 보폭을 줄이세요.`;
      } else if (strideToHeightRatio < 50) {
        strideDiagnosis = `💡 <strong>종종걸음(단보폭) 경향:</strong> 현재 페이스 대비 보폭(${strideLengthM.toFixed(2)}m)이 좁습니다. 고관절 가동성과 후방 추진력을 조금 더 활용해 보세요.`;
      }

      cadenceBox.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-slate-500 dark:text-slate-400">목표 페이스(${formatPace(targetPaceSec)}/km) 주행 시 필요 보폭</span>
          <span class="font-mono font-extrabold text-brand-600 dark:text-brand-400">${strideLengthM.toFixed(2)}m (신장의 ${strideToHeightRatio.toFixed(1)}%)</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500 dark:text-slate-400">신장 ${state.height}cm 러너의 권장 케이던스 · 보폭</span>
          <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">${idealCadence} spm · ${idealStrideM.toFixed(2)}m</span>
        </div>
        <div class="pt-1.5 border-t border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 leading-relaxed">
          ${strideDiagnosis}
        </div>
      `;
    }

    // --- 8. 체중 감량(-1kg ~ -5kg) 시 예상 기록 단축 시뮬레이터 ---
    const weightSimLabel = document.getElementById('weight-sim-current-label');
    const weightSimTbody = document.getElementById('weight-sim-tbody');
    if (weightSimLabel && weightSimTbody) {
      weightSimLabel.textContent = `${state.height}cm · ${state.weight}kg (BMI ${metabolic.bmi.toFixed(1)})`;
      const base10k = predictEquivalentTimeSec(currentVDOT, 10);
      const baseHalf = predictEquivalentTimeSec(currentVDOT, 21.0975);
      const baseFull = predictEquivalentTimeSec(currentVDOT, 42.195);

      const deltas = [0, -1, -2, -3, -5];
      weightSimTbody.innerHTML = deltas.map(d => {
        const simWeight = Math.max(30, state.weight + d);
        const hMeter = state.height / 100;
        const simBmi = simWeight / (hMeter * hMeter);

        // 너무 낮은 BMI(17.5 미만)로 내려가는 감량은 근손실 경고를 표시
        const isUnderweight = simBmi < 17.5 && d < 0;
        // 체중 감소에 따른 상대적 VO2max(VDOT) 상승률 (근손실 없는 체지방 감량 가정 시 ~0.75 지수)
        const simVDOT = isUnderweight
          ? currentVDOT
          : currentVDOT * Math.pow(state.weight / simWeight, 0.72);

        const t10 = predictEquivalentTimeSec(simVDOT, 10);
        const tHalf = predictEquivalentTimeSec(simVDOT, 21.0975);
        const tFull = predictEquivalentTimeSec(simVDOT, 42.195);

        const diffFull = Math.round(baseFull - tFull);
        const diffBadge = d === 0
          ? '<span class="text-slate-400">(현재 기준)</span>'
          : isUnderweight
            ? '<span class="text-rose-500 text-[11px]">⚠️ 저체중·근손실 주의</span>'
            : `<span class="text-emerald-600 dark:text-emerald-400 font-bold">(-${formatDurationClean(diffFull)} 단축)</span>`;

        const rowCls = d === 0 ? 'bg-slate-50/80 dark:bg-slate-800/40 font-bold' : '';
        return `
          <tr class="${rowCls}">
            <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap">${d === 0 ? `현재 (${simWeight}kg)` : `${d}kg 감량 (${simWeight}kg)`}</td>
            <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap">BMI ${simBmi.toFixed(1)}</td>
            <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap text-brand-600 dark:text-brand-400 font-bold">${simVDOT.toFixed(1)}</td>
            <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap">${formatDurationClean(t10)}</td>
            <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap">${formatHMS(tHalf)}</td>
            <td class="py-2.5 px-2 sm:px-3 whitespace-nowrap">${formatHMS(tFull)} ${diffBadge}</td>
          </tr>
        `;
      }).join('');
    }

    // --- 9. 맞춤형 주간 훈련 스케줄 자동 생성기 (4주 / 8주 / 12주) ---
    const schedGrid = document.getElementById('weekly-schedule-grid');
    if (schedGrid) {
      const is10K = state.targetDist < 15;
      const isHalf = state.targetDist > 15 && state.targetDist < 30;
      const w = labState.schedWeeks;

      const lsdDist = is10K ? (w === 4 ? '12~14km' : '15~18km') : isHalf ? (w === 4 ? '16~18km' : '20~24km') : (w === 4 ? '24~28km' : '30~35km');
      const tempoDist = is10K ? '6~8km' : isHalf ? '8~10km' : '10~14km';

      const days = [
        {
          day: '화요일 (Speed / Interval)',
          badge: `${w}주 플랜 핵심 #1`,
          title: `VO₂max 인터벌 (I 페이스 ${formatPace(paces.iPace)}/km)`,
          desc: `800m~1000m 질주 × ${is10K ? '6~8세트' : '5~7세트'} (세트 사이 400m 천천히 조깅 회복). 심폐 최대산소섭취량을 끌어올립니다.`
        },
        {
          day: '목요일 (Threshold / Tempo)',
          badge: `${w}주 플랜 핵심 #2`,
          title: `젖산역치 지속주 (T 페이스 ${formatPace(paces.tPace)}/km)`,
          desc: `${tempoDist} 지속주 또는 M 페이스(${formatPace(paces.mPace)}/km) 페이스주. 후반부 젖산 축적에도 지치지 않는 지구력을 완성합니다.`
        },
        {
          day: '토요일 (Easy / Recovery)',
          badge: '부상 방지 & 회복',
          title: `이지런 회복 조깅 (${formatPace(paces.eFast)}~${formatPace(paces.eSlow)}/km)`,
          desc: `6~10km 편안한 대화 가능 페이스로 모세혈관 발달 및 하체 피로를 풀고 코어·스트레칭을 병행합니다.`
        },
        {
          day: '일요일 (Long Slow Distance)',
          badge: '실전 보급 리허설',
          title: `주말 LSD 장거리주 (${lsdDist})`,
          desc: `E 페이스(${formatPace(paces.eFast)}/km)로 달린 뒤 마지막 3~5km를 M 페이스로 빌드업! 실전처럼 7km마다 에너지젤 섭취를 반드시 연습하세요.`
        }
      ];

      schedGrid.innerHTML = days.map(d => `
        <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-[11px] font-extrabold text-brand-600 dark:text-brand-400 mb-1">
              <span>${d.day}</span>
              <span class="px-2 py-0.5 rounded bg-brand-500/10">${d.badge}</span>
            </div>
            <div class="text-sm font-extrabold text-slate-900 dark:text-white mb-1.5">${d.title}</div>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">${d.desc}</p>
          </div>
        </div>
      `).join('');
    }

    // --- 10. 대회 전날 밤 마라톤 준비물 체크리스트 ---
    renderChecklistUI();
  }

  function renderChecklistUI() {
    const container = document.getElementById('race-checklist-container');
    const progText = document.getElementById('checklist-progress-text');
    const progBar = document.getElementById('checklist-progress-bar');
    if (!container) return;

    const total = CHECKLIST_ITEMS.length;
    const doneCount = CHECKLIST_ITEMS.filter(item => !!checkedMap[item.id]).length;
    const pct = Math.round((doneCount / total) * 100);

    if (progText) progText.textContent = `준비 완료 ${doneCount}/${total} (${pct}%)`;
    if (progBar) progBar.style.width = `${pct}%`;

    container.innerHTML = CHECKLIST_ITEMS.map(item => {
      const isChecked = !!checkedMap[item.id];
      const boxCls = isChecked
        ? 'border-emerald-500/40 bg-emerald-500/5'
        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40';
      const titleCls = isChecked ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white';
      const btnCls = item.platform === 'coupang' ? 'btn-coupang' : 'btn-naver';

      return `
        <div class="p-3.5 rounded-xl border ${boxCls} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition">
          <label class="flex items-start gap-2.5 cursor-pointer flex-1">
            <input
              type="checkbox"
              data-chk-id="${item.id}"
              ${isChecked ? 'checked' : ''}
              class="race-chk-input mt-1 w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            />
            <div>
              <div class="text-xs sm:text-sm font-extrabold ${titleCls}">${item.title}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">${item.desc}</div>
            </div>
          </label>
          <a
            href="${item.url}"
            target="_blank"
            rel="noopener noreferrer sponsored"
            class="${btnCls} shrink-0 py-1.5 px-2.5 rounded-lg text-[11px] font-extrabold text-center shadow-xs"
          >
            ${item.btnLabel}
          </a>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.race-chk-input').forEach(inp => {
      inp.addEventListener('change', () => {
        const id = inp.getAttribute('data-chk-id');
        checkedMap[id] = inp.checked;
        saveChecklistState();
        renderChecklistUI();
      });
    });
  }


  // --- [대회 버튼 렌더링 및 실시간 동기화/자동 저장] ---
  
  // =========================================================================
  // [우측 사이드바: 전국 마라톤 대회 일정 목록 & 실시간 D-Day & 승인 관리자 제어]
  // =========================================================================
  function updateDDayBadge() {
    const ddayBadge = document.getElementById('dday-counter-badge');
    const ddayCourseSummary = document.getElementById('dday-course-summary');
    if (!ddayBadge) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(labState.raceDate + 'T00:00:00');
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        const weeksLeft = (diffDays / 7).toFixed(1);
        ddayBadge.textContent = `D-${diffDays} (${weeksLeft}주 남음)`;
        ddayBadge.className = 'self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-brand-600 text-white font-mono text-sm font-extrabold shadow-sm transition-all';
      } else if (diffDays === 0) {
        ddayBadge.textContent = '🔥 D-DAY (오늘 대회!)';
        ddayBadge.className = 'self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-red-600 text-white font-mono text-sm font-extrabold shadow-sm animate-pulse';
      } else {
        ddayBadge.textContent = `D+${Math.abs(diffDays)} (대회 종료·날짜 변경 가능)`;
        ddayBadge.className = 'self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-700 text-slate-300 font-mono text-sm font-extrabold shadow-sm';
      }

      if (ddayCourseSummary) {
        const cType = labState.courseType || 'flat';
        let desc = '<strong>평지 고속 코스:</strong> 고도 편차가 적어 목표 기록 달성에 최적입니다.';
        if (cType === 'rolling' || cType === 'gentle_hills') {
          desc = '<strong>완만한 언덕 코스:</strong> 언덕 구간 페이스 저하(+2~3초/km) 감안 시 후반 페이스 안배가 중요합니다.';
        } else if (cType === 'hilly' || cType === 'lake_updown') {
          desc = '<strong>호반 업다운 코스:</strong> 잦은 언덕과 맞바람에 대비하여 체력 비축 및 코어 유지가 필수입니다.';
        } else if (cType === 'super_flat') {
          desc = '<strong>초고속 순환 코스:</strong> 초반 내리막 오버페이스만 주의하면 최고 기록 경신에 유리합니다.';
        }
        ddayCourseSummary.innerHTML = desc;
      }
    } catch (e) {
      console.error('updateDDayBadge error:', e);
    }
  }


  // =========================================================================
  // [네이버 캘린더 & 구글 캘린더 & 애플·삼성 iCal 일정 등록 모듈]
  // =========================================================================
  let calendarTargetRaceKey = 'seoul';

  function getCalendarTargetRace(key) {
    const k = key || calendarTargetRaceKey || currentSelectedRaceKey;
    if (k && majorRaces[k]) return majorRaces[k];
    const firstKey = Object.keys(majorRaces)[0];
    return majorRaces[firstKey] || {
      name: '마라톤 대회',
      date: '2026-11-01',
      url: 'http://www.marathon.pe.kr/'
    };
  }

  function openCalendarExportModal(key) {
    const race = getCalendarTargetRace(key);
    calendarTargetRaceKey = (key && majorRaces[key]) ? key : currentSelectedRaceKey;

    const modal = document.getElementById('calendar-export-modal');
    if (!modal) return;

    const nameEl = document.getElementById('calendar-modal-race-name');
    const dateEl = document.getElementById('calendar-modal-race-date');
    const previewEl = document.getElementById('calendar-modal-details-preview');

    if (nameEl) nameEl.textContent = race.name;
    if (dateEl) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.round((new Date(race.date + 'T00:00:00') - today) / (1000 * 60 * 60 * 24));
      const ddayStr = diffDays > 0 ? `D-${diffDays}` : diffDays === 0 ? 'D-DAY' : `D+${Math.abs(diffDays)} 종료`;
      dateEl.textContent = `📅 ${race.date} (${ddayStr}) · 오전 07:00 ~ 13:00`;
    }

    if (previewEl) {
      previewEl.textContent = `[일정명]: [마라톤] ${race.name} 레이스 데이
[일시]: ${race.date} 07:00 ~ 13:00 (KST)
[장소]: ${race.name} 집결지 및 출발지
[상세]: 대회 공식 홈페이지: ${race.url || 'http://www.marathon.pe.kr/'}
• 06:30 대회장 도착 및 워밍업
• 07:00 물품보관소 마감 전 보관 & 에너지젤 1포
• 08:00 대회 출발 및 실전 페이스 유지!`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
  }

  function closeCalendarExportModal() {
    const modal = document.getElementById('calendar-export-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.style.display = 'none';
    }
  }

  function exportToGoogleCalendar(key) {
    const race = getCalendarTargetRace(key);
    const cleanDate = race.date.replace(/-/g, '');
    const title = `[마라톤] ${race.name} 레이스 데이`;
    const dates = `${cleanDate}T070000/${cleanDate}T130000`;
    const location = `${race.name} 집결지 및 출발지`;
    const details = `[Pacecraft Runner 마라톤 일정]
🏃 대회명: ${race.name}
📅 일자: ${race.date} (오전 7시 ~ 오후 1시)
🔗 공식 웹사이트: ${race.url || 'http://www.marathon.pe.kr/'}

⏱️ 대회 당일 추천 일정:
• 06:30 대회장 도착 및 환복/워밍업
• 07:00 물품보관소 짐 보관 & 에너지젤 1포
• 07:30 출발 그룹 집결
• 레이스 완주 후 수분/단백질 보충!
(마라톤 레이스 플래너: Pacecraft Runner)`;

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&ctz=Asia/Seoul&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
    window.open(gcalUrl, '_blank', 'noopener,noreferrer');
    showToast(`📅 [${race.name}] 구글 캘린더 등록 창이 열렸습니다.`);
  }

  function generateIcsFileContent(race) {
    const cleanDate = race.date.replace(/-/g, '');
    const uid = `marathon-${cleanDate}-${Date.now()}@marathonlab.pro`;
    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = `[마라톤] ${race.name} 레이스 데이`;
    const location = `${race.name} 집결지 및 출발지`;
    const details = `[Pacecraft Runner] ${race.name} 마라톤 일정\n일자: ${race.date}\n공식 사이트: ${race.url || 'http://www.marathon.pe.kr/'}\n\n06:30 대회장 도착 & 워밍업\n07:00 물품보관소 마감\n08:00 출발`;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Pacecraft Runner//Marathon Race Calendar//KO',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Seoul',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0900',
      'TZOFFSETTO:+0900',
      'TZNAME:KST',
      'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowStr}`,
      `DTSTART;TZID=Asia/Seoul:${cleanDate}T070000`,
      `DTEND;TZID=Asia/Seoul:${cleanDate}T130000`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details}`,
      `LOCATION:${location}`,
      `URL:${race.url || 'http://www.marathon.pe.kr/'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  function downloadCalendarIcs(key, platformName) {
    const race = getCalendarTargetRace(key);
    const icsString = generateIcsFileContent(race);
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeName = race.name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    link.download = `${safeName}_${race.date}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    const targetPlat = platformName || '캘린더';
    showToast(`📥 [${race.name}] ${targetPlat} 연동용 일정 파일(.ics)이 저장되었습니다!`);
  }

  function exportToNaverCalendar(key) {
    downloadCalendarIcs(key, '네이버 캘린더');
    setTimeout(() => {
      if (confirm('네이버 캘린더 웹페이지를 열어 방금 다운로드한 .ics 일정을 등록하시겠습니까?\n(네이버 캘린더 > 내 캘린더 > 가져오기)')) {
        window.open('https://calendar.naver.com/', '_blank');
      }
    }, 400);
  }

  function copyCalendarDetailsToClipboard(key) {
    const race = getCalendarTargetRace(key);
    const text = `[마라톤 일정 등록 안내]
대회명: ${race.name}
날짜: ${race.date} (오전 07:00 ~ 13:00)
공식 홈페이지: ${race.url || 'http://www.marathon.pe.kr/'}
집결지: ${race.name} 출발지

⏱️ 레이스 타임라인:
• 06:30 도착 및 준비운동
• 07:00 짐 보관 완료 & 에너지젤 섭취
• 08:00 출발`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 캘린더 일정 내용이 클립보드에 복사되었습니다.');
    }).catch(() => {
      showToast('📋 복사 완료되었습니다.');
    });
  }

  function renderRightRaceScheduleSidebar() {
    const listContainer = document.getElementById('right-race-schedule-list');
    const badgeEl = document.getElementById('right-admin-status-badge');
    const leftStatusBadge = document.getElementById('left-admin-status-badge');
    const leftAdminEmailEl = document.getElementById('left-admin-email-text');
    const leftAdminLoginBtn = document.getElementById('left-admin-login-toggle-btn');

    const isApproved = isCurrentAdminApproved();
    const email = getLoggedAdminEmail();

    // 우측 및 좌측 관리자 상태 뱃지 동기화
    if (badgeEl) {
      if (isApproved && email) {
        badgeEl.textContent = `🟢 승인됨 (${email.split('@')[0]})`;
        badgeEl.className = 'text-[10px] px-1.5 py-0.5 rounded font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 cursor-pointer';
      } else {
        badgeEl.textContent = '🔒 구글 승인 필요';
        badgeEl.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 cursor-pointer';
      }
    }

    if (leftStatusBadge) {
      if (isApproved && email) {
        leftStatusBadge.textContent = '인증 완료';
        leftStatusBadge.className = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400';
      } else {
        leftStatusBadge.textContent = '미인증 (게스트)';
        leftStatusBadge.className = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
      }
    }
    if (leftAdminEmailEl) {
      leftAdminEmailEl.textContent = (isApproved && email) ? email : '구글 관리자 로그인 필요';
    }
    if (leftAdminLoginBtn) {
      leftAdminLoginBtn.textContent = (isApproved && email) ? '🔓 관리자 계정 관리 / 로그아웃' : '🔑 관리자 구글 로그인';
    }

    if (!listContainer) return;

    listContainer.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const keys = Object.keys(majorRaces);
    keys.forEach(key => {
      const race = majorRaces[key];
      const targetDate = new Date(race.date + 'T00:00:00');
      const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));
      const isPast = diffDays < 0;
      const isSelected = (currentSelectedRaceKey === key);
      const isCustom = key.startsWith('custom_');

      let ddayText = '';
      let badgeColor = '';
      if (diffDays > 0) {
        ddayText = `D-${diffDays}`;
        badgeColor = 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-extrabold border border-indigo-500/30';
      } else if (diffDays === 0) {
        ddayText = 'D-DAY';
        badgeColor = 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-black animate-pulse border border-emerald-500/40';
      } else {
        ddayText = `D+${Math.abs(diffDays)} 종료`;
        badgeColor = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30';
      }

      // 날짜가 지난 대회는 제목 색상을 로즈/코랄 계열로 뚜렷하게 구분
      let titleColorClass = '';
      if (isPast) {
        titleColorClass = isSelected
          ? 'text-rose-600 dark:text-rose-300'
          : 'text-rose-500 dark:text-rose-400';
      } else {
        titleColorClass = isSelected
          ? 'text-indigo-600 dark:text-indigo-300'
          : 'text-slate-900 dark:text-white';
      }

      const card = document.createElement('div');
      if (isSelected) {
        card.className = isPast
          ? 'p-2.5 rounded-xl border-2 border-rose-500 bg-rose-500/10 dark:bg-rose-950/40 shadow-xs transition cursor-pointer'
          : 'p-2.5 rounded-xl border-2 border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/50 shadow-xs transition cursor-pointer';
      } else {
        card.className = isPast
          ? 'p-2.5 rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/30 dark:bg-slate-800/30 hover:bg-rose-50/70 dark:hover:bg-slate-800/70 transition cursor-pointer'
          : 'p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer';
      }

      card.onclick = (e) => {
        if (e.target.closest('a') || e.target.closest('button')) return;
        selectRace(key);
      };

      const pastTagHtml = isPast
        ? `<span class="text-[10px] font-bold text-rose-500 dark:text-rose-400 opacity-90 ml-0.5">(마감)</span>`
        : '';

      card.innerHTML = `
        <div class="flex items-center justify-between gap-1.5 mb-1">
          <span class="text-xs font-extrabold ${titleColorClass} truncate">${isSelected ? '🎯 ' : ''}${race.name}${pastTagHtml}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${badgeColor}">${ddayText}</span>
        </div>
        <div class="flex items-center justify-between text-[11px] ${isPast ? 'text-rose-400/90 dark:text-rose-400/75' : 'text-slate-500 dark:text-slate-400'}">
          <span class="font-mono text-[10px]">📅 ${race.date}</span>
          <div class="flex items-center gap-1">
            ${race.url ? `<a href="${race.url}" target="_blank" rel="noopener noreferrer" class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:underline font-bold" title="공식 홈페이지 바로가기">홈피 ↗</a>` : ''}
            <button type="button" data-cal-race="${key}" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 font-bold transition flex items-center gap-0.5" title="구글·네이버 캘린더에 일정 등록"><span>📅</span>일정</button>
            <button type="button" data-edit-race="${key}" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 font-bold transition" title="대회 날짜·홈페이지 주소 수정">수정</button>
            <button type="button" data-del-race="${key}" class="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 font-bold transition" title="대회 삭제">삭제</button>
          </div>
        </div>
      `;

      const editBtn = card.querySelector('[data-edit-race]');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditRaceModal(key);
        });
      }

      const calBtn = card.querySelector('[data-cal-race]');
      if (calBtn) {
        calBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openCalendarExportModal(key);
        });
      }

      const delBtn = card.querySelector('[data-del-race]');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteCustomRace(key);
        });
      }

      listContainer.appendChild(card);
    });
  }

  function deleteCustomRace(key) {
    if (!isCurrentAdminApproved()) {
      openAdminAuthModal('대회 일정 삭제');
      return;
    }
    if (!majorRaces[key]) return;
    const raceName = majorRaces[key].name;
    const remainingKeys = Object.keys(majorRaces).filter(k => k !== key);
    if (remainingKeys.length === 0) {
      alert('최소 1개 이상의 마라톤 대회가 남아있어야 합니다.');
      return;
    }
    if (!confirm(`[${raceName}] 대회를 일정 목록에서 삭제하시겠습니까?`)) return;
    delete majorRaces[key];
    saveCustomRaces(majorRaces);
    closeAddRaceModal();
    if (currentSelectedRaceKey === key || !majorRaces[currentSelectedRaceKey]) {
      currentSelectedRaceKey = Object.keys(majorRaces)[0];
    }
    renderRaceButtons();
    selectRace(currentSelectedRaceKey);
    showToast(`🗑️ [${raceName}] 대회가 삭제되었습니다.`);
  }

  let pendingActionAfterAuth = null;
  let editingRaceKey = null; // null이면 신규 추가, 값이 있으면 해당 key 대회 수정 모드

  // 관리자 전용 신규 대회 추가 핸들러 (구글 로그인으로 승인받은 아이디만 가능)
  function handleClickAddRaceWithAuth() {
    const isApproved = isCurrentAdminApproved();
    const email = getLoggedAdminEmail();

    if (!isApproved || !email) {
      pendingActionAfterAuth = { type: 'add_race' };
      openAdminAuthModal('신규 마라톤 대회 추가');
      return;
    }

    openAddRaceModal();
  }

  // 기존 대회 정보·날짜·사이트주소 수정 모달 오픈
  function openEditRaceModal(key) {
    const targetKey = key || currentSelectedRaceKey;
    if (!targetKey || !majorRaces[targetKey]) {
      alert('수정할 대회를 먼저 선택해 주세요.');
      return;
    }

    if (!isCurrentAdminApproved()) {
      pendingActionAfterAuth = { type: 'edit_race', key: targetKey };
      openAdminAuthModal('대회 날짜·홈페이지 주소 수정');
      return;
    }

    editingRaceKey = targetKey;
    const race = majorRaces[targetKey];
    const modal = document.getElementById('add-race-modal');
    if (!modal) return;

    const modalTitle = document.getElementById('race-modal-title');
    const modalDesc = document.getElementById('race-modal-desc');
    const submitBtn = document.getElementById('race-modal-submit-btn');
    const deleteInModalBtn = document.getElementById('race-modal-delete-btn');
    const nameInput = document.getElementById('new-race-name-input');
    const fullNameInput = document.getElementById('new-race-fullname-input');
    const dateInput = document.getElementById('new-race-date-input');
    const courseSelect = document.getElementById('new-race-course-select');
    const urlInput = document.getElementById('new-race-url-input');

    if (modalTitle) modalTitle.textContent = `대회 정보·날짜·주소 수정 (${race.name})`;
    if (modalDesc) modalDesc.textContent = '✏️ 대회 이름, 개최 날짜, 코스 난이도 및 공식 홈페이지 주소(URL)를 자유롭게 수정하거나 삭제할 수 있습니다.';
    if (submitBtn) submitBtn.textContent = '💾 수정 내용 저장 완료';
    if (deleteInModalBtn) {
      deleteInModalBtn.classList.remove('hidden');
      deleteInModalBtn.onclick = () => deleteCustomRace(targetKey);
    }

    if (nameInput) nameInput.value = race.name || '';
    if (fullNameInput) fullNameInput.value = race.fullName || `🏃 ${race.name || ''}`;
    if (dateInput) dateInput.value = race.date || '2026-11-15';
    if (courseSelect) courseSelect.value = race.course || 'flat';
    if (urlInput) urlInput.value = race.url || 'http://www.marathon.pe.kr/';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
    if (nameInput) setTimeout(() => nameInput.focus(), 50);
  }

  function openEditCurrentRaceModal() {
    openEditRaceModal(currentSelectedRaceKey);
  }

  function testRaceUrlInModal() {
    const urlInput = document.getElementById('new-race-url-input');
    const url = urlInput && urlInput.value.trim() ? urlInput.value.trim() : '';
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      alert('http:// 또는 https:// 로 시작하는 올바른 홈페이지 주소를 입력해 주세요.');
      if (urlInput) urlInput.focus();
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openAddRaceModal() {
    if (!isCurrentAdminApproved()) {
      pendingActionAfterAuth = { type: 'add_race' };
      openAdminAuthModal('신규 마라톤 대회 추가');
      return;
    }
    editingRaceKey = null;
    const modal = document.getElementById('add-race-modal');
    if (!modal) {
      openAddRacePrompt();
      return;
    }
    const modalTitle = document.getElementById('race-modal-title');
    const modalDesc = document.getElementById('race-modal-desc');
    const submitBtn = document.getElementById('race-modal-submit-btn');
    const deleteInModalBtn = document.getElementById('race-modal-delete-btn');
    const nameInput = document.getElementById('new-race-name-input');
    const fullNameInput = document.getElementById('new-race-fullname-input');
    const dateInput = document.getElementById('new-race-date-input');
    const courseSelect = document.getElementById('new-race-course-select');
    const urlInput = document.getElementById('new-race-url-input');

    if (modalTitle) modalTitle.textContent = '신규 마라톤 대회 일정 추가';
    if (modalDesc) modalDesc.textContent = '✅ 구글 승인 관리자 권한으로 새 대회를 추가합니다. 등록 즉시 중앙 버튼과 우측 일정표에 자동 저장됩니다.';
    if (submitBtn) submitBtn.textContent = '➕ 대회 일정 등록 완료';
    if (deleteInModalBtn) deleteInModalBtn.classList.add('hidden');

    if (nameInput) nameInput.value = '';
    if (fullNameInput) fullNameInput.value = '';
    if (dateInput) dateInput.value = '2026-11-15';
    if (courseSelect) courseSelect.value = 'flat';
    if (urlInput) urlInput.value = 'http://www.marathon.pe.kr/';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
    if (nameInput) setTimeout(() => nameInput.focus(), 50);
  }

  function closeAddRaceModal() {
    const modal = document.getElementById('add-race-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.style.display = 'none';
    }
  }

  function submitAddRaceModal() {
    if (!isCurrentAdminApproved()) {
      closeAddRaceModal();
      openAdminAuthModal('대회 추가 및 수정');
      return;
    }
    const nameInput = document.getElementById('new-race-name-input');
    const fullNameInput = document.getElementById('new-race-fullname-input');
    const dateInput = document.getElementById('new-race-date-input');
    const courseSelect = document.getElementById('new-race-course-select');
    const urlInput = document.getElementById('new-race-url-input');

    const name = nameInput ? nameInput.value.trim() : '';
    const fullNameRaw = fullNameInput ? fullNameInput.value.trim() : '';
    const date = dateInput ? dateInput.value.trim() : '';
    const course = courseSelect ? courseSelect.value : 'flat';
    const url = urlInput && urlInput.value.trim() ? urlInput.value.trim() : 'http://www.marathon.pe.kr/';

    if (!name) {
      alert('마라톤 대회 이름을 입력해 주세요.');
      if (nameInput) nameInput.focus();
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      alert('대회 개최 날짜(YYYY-MM-DD)를 선택해 주세요.');
      if (dateInput) dateInput.focus();
      return;
    }

    const fullName = fullNameRaw || `🏃 ${name}`;

    if (editingRaceKey && majorRaces[editingRaceKey]) {
      // 기존 대회 수정 모드
      const targetKey = editingRaceKey;
      majorRaces[targetKey] = {
        ...majorRaces[targetKey],
        id: targetKey,
        name: name,
        fullName: fullName,
        date: date,
        course: course,
        url: url
      };
      saveCustomRaces(majorRaces);
      closeAddRaceModal();
      renderRaceButtons();
      selectRace(targetKey);
      showToast(`✅ [${name}] 대회의 날짜(${date}) 및 사이트 주소가 수정되었습니다!`);
    } else {
      // 신규 대회 등록 모드
      const newKey = 'custom_' + Date.now();
      majorRaces[newKey] = {
        id: newKey,
        name: name,
        fullName: fullName,
        date: date,
        course: course,
        url: url
      };
      saveCustomRaces(majorRaces);
      closeAddRaceModal();
      renderRaceButtons();
      selectRace(newKey);
      showToast(`🎉 [${name}] (${date}) 대회가 일정에 추가되었습니다!`);
    }
  }

  function renderRaceButtons() {
    const container = document.getElementById('major-race-buttons');
    if (!container) return;

    container.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    Object.keys(majorRaces).forEach(key => {
      const race = majorRaces[key];
      const targetDate = new Date(race.date + 'T00:00:00');
      const isPast = Math.round((targetDate - today) / (1000 * 60 * 60 * 24)) < 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-race', key);
      const isSelected = currentSelectedRaceKey === key;
      if (isSelected) {
        btn.className = isPast
          ? 'race-preset-btn px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-600 text-white shadow-sm transition cursor-pointer'
          : 'race-preset-btn px-3 py-1.5 rounded-xl text-xs font-extrabold bg-brand-600 text-white shadow-sm transition cursor-pointer';
      } else {
        btn.className = isPast
          ? 'race-preset-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer'
          : 'race-preset-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer';
      }
      const baseTitle = race.fullName || `🏃 ${race.name}`;
      btn.textContent = isPast ? `${baseTitle} (종료)` : baseTitle;
      btn.addEventListener('click', () => {
        selectRace(key);
      });
      container.appendChild(btn);
    });

    // 새 대회 추가 버튼 (승인된 구글 관리자 전용)
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200/80 dark:bg-slate-800/80 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white border border-dashed border-slate-300 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer';
    addBtn.innerHTML = '<span>➕ 대회 추가</span>';
    addBtn.addEventListener('click', () => {
      handleClickAddRaceWithAuth();
    });
    container.appendChild(addBtn);

    // 선택된 대회 수정·삭제 버튼
    const editCurrentBtn = document.createElement('button');
    editCurrentBtn.type = 'button';
    editCurrentBtn.className = 'px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/30 transition flex items-center gap-1 cursor-pointer';
    editCurrentBtn.innerHTML = '<span>✏️ 선택 대회 수정·삭제</span>';
    editCurrentBtn.addEventListener('click', () => {
      openEditCurrentRaceModal();
    });
    container.appendChild(editCurrentBtn);
  }

  function selectRace(key) {
    if (!majorRaces[key]) return;
    currentSelectedRaceKey = key;
    try { localStorage.setItem(RACE_SELECTED_STORAGE_KEY, key); } catch (e) {}

    const race = majorRaces[key];
    labState.raceDate = race.date;
    labState.courseType = race.course;
    try {
      localStorage.setItem(RACE_DATE_STORAGE_KEY, race.date);
      localStorage.setItem(RACE_COURSE_STORAGE_KEY, race.course);
    } catch (e) {}

    updateRaceDOM();
    updateDDayBadge();
    renderRightRaceScheduleSidebar();
    calculateAndRender();
    showToast(`🎯 [${race.name}] ${race.date} 대회가 선택되었습니다.`);
  }

  function updateRaceDOM() {
    const raceDateInput = document.getElementById('race-date-input');
    const raceCourseSelect = document.getElementById('race-course-select');
    const nameEl = document.getElementById('selected-race-name');
    const linkEl = document.getElementById('race-official-link');
    const statusTag = document.getElementById('race-date-status-tag');

    if (raceDateInput && raceDateInput.value !== labState.raceDate) {
      raceDateInput.value = labState.raceDate;
    }
    if (raceCourseSelect && raceCourseSelect.value !== labState.courseType) {
      raceCourseSelect.value = labState.courseType;
    }

    if (currentSelectedRaceKey !== 'custom' && majorRaces[currentSelectedRaceKey]) {
      const race = majorRaces[currentSelectedRaceKey];
      if (nameEl) nameEl.textContent = `${race.name} (${race.date})`;
      if (linkEl) {
        linkEl.href = race.url || 'http://www.marathon.pe.kr/';
        linkEl.innerHTML = `<span>${race.name} 공식 홈페이지 바로가기</span><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`;
      }
      if (statusTag) {
        statusTag.textContent = `${race.name} 날짜 자동 저장됨`;
        statusTag.className = 'text-[10px] text-emerald-600 dark:text-emerald-400 font-bold';
      }
    } else {
      if (nameEl) nameEl.textContent = `직접 지정 대회 (${labState.raceDate})`;
      if (linkEl) {
        linkEl.href = 'http://www.marathon.pe.kr/';
        linkEl.innerHTML = `<span>전국 마라톤 대회 일정 조회 ↗</span>`;
      }
      if (statusTag) {
        statusTag.textContent = '직접 날짜 자동 저장';
        statusTag.className = 'text-[10px] text-cyan-600 dark:text-cyan-400 font-bold';
      }
    }

    // 버튼 스타일 동기화 (날짜가 지난 대회 색상 구분 포함)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    document.querySelectorAll('.race-preset-btn').forEach(btn => {
      const bKey = btn.getAttribute('data-race');
      const isMatch = (currentSelectedRaceKey === bKey);
      const rObj = majorRaces[bKey];
      const isPast = rObj ? (Math.round((new Date(rObj.date + 'T00:00:00') - today) / (1000 * 60 * 60 * 24)) < 0) : false;
      if (isMatch) {
        btn.className = isPast
          ? 'race-preset-btn px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-600 text-white shadow-sm transition cursor-pointer'
          : 'race-preset-btn px-3 py-1.5 rounded-xl text-xs font-extrabold bg-brand-600 text-white shadow-sm transition cursor-pointer';
      } else {
        btn.className = isPast
          ? 'race-preset-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer'
          : 'race-preset-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer';
      }
      if (rObj) {
        const baseTitle = rObj.fullName || `🏃 ${rObj.name}`;
        btn.textContent = isPast ? `${baseTitle} (종료)` : baseTitle;
      }
    });
  }

  // 사용자가 날짜를 변경했을 때: 현재 대회의 날짜로 자동 영구 저장!
  function handleRaceDateManualChange(newDate, isFinal) {
    if (!newDate) return;
    labState.raceDate = newDate;
    try { localStorage.setItem(RACE_DATE_STORAGE_KEY, newDate); } catch (e) {}

    if (currentSelectedRaceKey !== 'custom' && majorRaces[currentSelectedRaceKey]) {
      majorRaces[currentSelectedRaceKey].date = newDate;
      saveCustomRaces(majorRaces);
      if (isFinal) {
        showToast(`💾 [${majorRaces[currentSelectedRaceKey].name}] 날짜가 ${newDate}로 자동 저장되었습니다!`);
      }
    } else {
      if (isFinal) {
        showToast(`💾 대회 날짜가 ${newDate}로 자동 저장되었습니다.`);
      }
    }

    updateRaceDOM();
    updateDDayBadge();
    renderRightRaceScheduleSidebar();
    calculateAndRender();
  }

  // 사용자가 코스 난이도를 변경했을 때: 현재 대회에 자동 영구 저장!
  function handleCourseManualChange(newCourse) {
    if (!newCourse) return;
    labState.courseType = newCourse;
    try { localStorage.setItem(RACE_COURSE_STORAGE_KEY, newCourse); } catch (e) {}

    if (currentSelectedRaceKey !== 'custom' && majorRaces[currentSelectedRaceKey]) {
      majorRaces[currentSelectedRaceKey].course = newCourse;
      saveCustomRaces(majorRaces);
    }

    updateDDayBadge();
    calculateAndRender();
  }

  function openAddRacePrompt() {
    if (!checkAdminPermissionOrPrompt('대회 추가')) return;
    const modal = document.getElementById('add-race-modal');
    if (modal) {
      openAddRaceModal();
      return;
    }
    const name = prompt('새로 추가할 마라톤 대회 이름을 입력하세요:\n(예: 손기정평화마라톤)');
    if (!name || !name.trim()) return;

    const date = prompt(`[${name.trim()}] 대회 날짜를 입력하세요 (YYYY-MM-DD):\n(예: 2026-11-15)`);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      alert('❌ 날짜 형식이 올바르지 않습니다. (예: 2026-11-15)');
      return;
    }

    const url = prompt(`[${name.trim()}] 공식 사이트 주소 (생략 시 기본 일정 사이트):`, 'http://www.marathon.pe.kr/');

    const newKey = 'custom_' + Date.now();
    majorRaces[newKey] = {
      id: newKey,
      name: name.trim(),
      fullName: `🏃 ${name.trim()}`,
      date: date.trim(),
      course: 'flat',
      url: url ? url.trim() : 'http://www.marathon.pe.kr/'
    };

    saveCustomRaces(majorRaces);
    renderRaceButtons();
    selectRace(newKey);
    showToast(`🎉 [${name.trim()}] 대회가 성공적으로 추가되었습니다!`);
  }


  // =========================================================================
  // [구글 승인 관리자 인증 & rkstmtk@gmail.com 문의/신청 시스템]
  // =========================================================================
  const SUPER_ADMIN_EMAIL = 'rkstmtk@gmail.com';
  const APPROVED_ADMINS_STORAGE_KEY = 'marathon_pro_approved_admins_v2';
  const LOGGED_ADMIN_STORAGE_KEY = 'marathon_pro_logged_admin_email_v3';

  function getApprovedAdminEmails() {
    try {
      const stored = localStorage.getItem(APPROVED_ADMINS_STORAGE_KEY);
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          if (!list.map(e => e.toLowerCase()).includes(SUPER_ADMIN_EMAIL.toLowerCase())) {
            list.push(SUPER_ADMIN_EMAIL);
          }
          return list;
        }
      }
    } catch (e) {}
    return [SUPER_ADMIN_EMAIL];
  }

  function saveApprovedAdminEmails(list) {
    try {
      localStorage.setItem(APPROVED_ADMINS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function getLoggedAdminEmail() {
    try {
      return localStorage.getItem(LOGGED_ADMIN_STORAGE_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  function isCurrentAdminApproved() {
    const email = getLoggedAdminEmail();
    if (!email) return false;
    const approvedList = getApprovedAdminEmails().map(e => e.toLowerCase().trim());
    return approvedList.includes(email.toLowerCase().trim()) || email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
  }

  function checkAdminPermissionOrPrompt(actionName) {
    if (isCurrentAdminApproved()) {
      return true;
    }
    openAdminAuthModal(actionName || '관리자 전용 권한');
    return false;
  }

  // 소유자(rkstmtk@gmail.com) 구글 인증 로그인 완료 처리
  function quickLoginAsOwner() {
    try {
      localStorage.setItem(LOGGED_ADMIN_STORAGE_KEY, SUPER_ADMIN_EMAIL);
    } catch (e) {}
    updateAdminAuthModalView();
    renderRightRaceScheduleSidebar();
    closeAdminAuthModal();
    showToast(`👑 관리자(${SUPER_ADMIN_EMAIL}) 구글 로그인 인증이 완료되었습니다!`);
    if (pendingActionAfterAuth) {
      const act = pendingActionAfterAuth;
      pendingActionAfterAuth = null;
      setTimeout(() => {
        if (act === 'add_race' || act.type === 'add_race') openAddRaceModal();
        else if (act.type === 'edit_race') openEditRaceModal(act.key);
      }, 120);
    }
  }

  function openAdminAuthModal(actionName) {
    const modal = document.getElementById('admin-auth-modal');
    if (!modal) return;
    updateAdminAuthModalView();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
    const emailInput = document.getElementById('admin-google-email-input');
    if (emailInput && !isCurrentAdminApproved()) {
      setTimeout(() => emailInput.focus(), 50);
    }
    if (actionName) {
      showToast(`🔒 [${actionName}] 기능은 구글 로그인으로 승인받은 관리자만 가능합니다.`);
    }
  }

  function closeAdminAuthModal() {
    const modal = document.getElementById('admin-auth-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.style.display = 'none';
    }
  }

  function updateAdminAuthModalView() {
    const loginView = document.getElementById('admin-auth-login-view');
    const loggedView = document.getElementById('admin-auth-logged-view');
    const emailDisplay = document.getElementById('admin-logged-email-display');
    const managePermBtn = document.getElementById('admin-manage-perm-btn');
    const badge = document.getElementById('admin-auth-status-badge');
    const memoBtn = document.getElementById('admin-memo-edit-btn');

    const email = getLoggedAdminEmail();
    const approved = isCurrentAdminApproved();

    if (approved && email) {
      if (loginView) loginView.classList.add('hidden');
      if (loggedView) loggedView.classList.remove('hidden');
      if (emailDisplay) emailDisplay.textContent = `승인된 구글 계정: ${email}`;
      if (managePermBtn) {
        if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
          managePermBtn.classList.remove('hidden');
        } else {
          managePermBtn.classList.add('hidden');
        }
      }
      if (badge) {
        badge.textContent = `🟢 관리자 (${email})`;
        badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold';
      }
      if (memoBtn) {
        memoBtn.innerHTML = '<span>✏️ 공지 수정</span>';
      }
    } else {
      if (loginView) loginView.classList.remove('hidden');
      if (loggedView) loggedView.classList.add('hidden');
      if (badge) {
        badge.textContent = '구글 승인 관리자 전용';
        badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold';
      }
      if (memoBtn) {
        memoBtn.innerHTML = '<span>🔒 관리자 인증</span>';
      }
    }
  }

  // --- [운영자 문의 & 승인요청 모달] ---
  function openContactRequestModal(presetType) {
    const modal = document.getElementById('contact-request-modal');
    if (!modal) return;
    const typeSelect = document.getElementById('contact-type-select');
    if (typeSelect && presetType) {
      const validTypes = ['admin_approval', 'advertising', 'race_register', 'general_inquiry'];
      const mapped = validTypes.includes(presetType) ? presetType : 'admin_approval';
      typeSelect.value = mapped;
      triggerContactTypePlaceholder(mapped);
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
  }

  function closeContactRequestModal() {
    const modal = document.getElementById('contact-request-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.style.display = 'none';
    }
  }

  function triggerContactTypePlaceholder(type) {
    const textarea = document.getElementById('contact-content-textarea');
    if (!textarea) return;
    const placeholders = {
      admin_approval: '1. 신청 사유:\n2. 소속 러닝 크루/동호회 또는 역할:\n3. 관리 희망 대회/권한:\n(승인 완료 시 해당 구글 계정으로 관리자 권한이 활성화됩니다)',
      advertising: '1. 광고/제휴 형태 (배너, 제품 협찬, 스폰서십 등):\n2. 브랜드명 및 웹사이트 URL:\n3. 희망 기간 및 제안 내용:',
      race_register: '1. 추가 희망 대회 공식 명칭:\n2. 개최 일자 및 장소:\n3. 대회 공식 홈페이지 링크:\n4. 종목 (풀코스, 하프, 10km 등):',
      general_inquiry: '마라톤 플래너에 대한 문의 사항 또는 개선 건의 내용을 자유롭게 적어주세요.'
    };
    if (placeholders[type]) {
      textarea.placeholder = placeholders[type].replace(/\\n/g, '\n');
    }
  }

  function getMailPayload() {
    const typeSelect = document.getElementById('contact-type-select');
    const nameInput = document.getElementById('contact-name-input');
    const emailInput = document.getElementById('contact-email-input');
    const contentTextarea = document.getElementById('contact-content-textarea');

    const type = typeSelect ? typeSelect.value : 'general_inquiry';
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const content = contentTextarea ? contentTextarea.value.trim() : '';

    if (!name) {
      alert('신청자 성명 또는 닉네임을 입력해 주세요.');
      if (nameInput) nameInput.focus();
      return null;
    }
    if (!email || !email.includes('@')) {
      alert('올바른 구글(Google) 이메일 주소를 입력해 주세요.');
      if (emailInput) emailInput.focus();
      return null;
    }
    if (!content) {
      alert('신청 및 문의 상세 내용을 입력해 주세요.');
      if (contentTextarea) contentTextarea.focus();
      return null;
    }

    const typeTitles = {
      admin_approval: '[마라톤플래너] 관리자 권한 승인 요청',
      advertising: '[마라톤플래너] 광고 및 제휴/스폰서십 문의',
      race_register: '[마라톤플래너] 신규 마라톤 대회 등록 신청',
      general_inquiry: '[마라톤플래너] 일반 문의 및 건의'
    };

    const subject = `${typeTitles[type] || '[마라톤플래너 문의]'} - ${name}`;
    const body = `[신청 및 문의 구분]: ${typeTitles[type] || type}
[신청자 성명/닉네임]: ${name}
[신청자 구글 이메일]: ${email}
----------------------------------------
[문의 및 신청 상세 내용]:
${content}
----------------------------------------
(수신처: rkstmtk@gmail.com / Pacecraft Runner 문의 시스템)`;

    return { subject, body, email, name, content };
  }

  function sendContactMail(isWebGmail) {
    const payload = getMailPayload();
    if (!payload) return;

    const encSubject = encodeURIComponent(payload.subject);
    const encBody = encodeURIComponent(payload.body);

    if (isWebGmail) {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPER_ADMIN_EMAIL}&su=${encSubject}&body=${encBody}`;
      window.open(gmailUrl, '_blank');
      showToast('📬 새 창에서 웹 Gmail 작성 화면이 열렸습니다.');
    } else {
      const mailtoUrl = `mailto:${SUPER_ADMIN_EMAIL}?subject=${encSubject}&body=${encBody}`;
      window.open(mailtoUrl, '_blank');
      showToast('📧 메일 앱 발송 창이 열렸습니다.');
    }
  }

  function verifyGoogleAdminInput() {
    const emailInput = document.getElementById('admin-google-email-input');
    const val = emailInput ? emailInput.value.trim() : '';
    if (!val || !val.includes('@')) {
      alert('구글(Google) 이메일 주소를 입력해 주세요.\n(최고 관리자: rkstmtk@gmail.com)');
      if (emailInput) emailInput.focus();
      return;
    }

    const approvedList = getApprovedAdminEmails().map(e => e.toLowerCase().trim());
    if (approvedList.includes(val.toLowerCase())) {
      try {
        localStorage.setItem(LOGGED_ADMIN_STORAGE_KEY, val.toLowerCase());
      } catch (e) {}
      updateAdminAuthModalView();
      renderRightRaceScheduleSidebar();
      closeAdminAuthModal();
      showToast(`🎉 구글 관리자(${val}) 승인 확인 완료!`);
      if (pendingActionAfterAuth === 'add_race') {
        pendingActionAfterAuth = null;
        setTimeout(() => openAddRaceModal(), 120);
      }
    } else {
      alert(`❌ [${val}] 계정은 승인된 관리자 목록에 없습니다.\n\n대회 추가 및 공지 작성은 승인받은 구글 계정(rkstmtk@gmail.com 외 승인 아이디)만 가능합니다.\n하단 '관리자 승인 요청 보내기'를 통해 신청해 주세요.`);
    }
  }

  function initAdminAndContactSystem() {
    updateAdminAuthModalView();
    renderRightRaceScheduleSidebar();

    // 1. 관리자 인증 모달 제어
    const authModal = document.getElementById('admin-auth-modal');
    const authModalClose = document.getElementById('admin-auth-modal-close');
    if (authModalClose) authModalClose.addEventListener('click', closeAdminAuthModal);
    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeAdminAuthModal();
      });
    }

    // 2. 문의 / 승인신청 모달 제어
    const contactModal = document.getElementById('contact-request-modal');
    const contactModalClose = document.getElementById('contact-request-modal-close');
    if (contactModalClose) contactModalClose.addEventListener('click', closeContactRequestModal);
    if (contactModal) {
      contactModal.addEventListener('click', (e) => {
        if (e.target === contactModal) closeContactRequestModal();
      });
    }

    // 3. 신규 대회 등록 모달 제어
    const addRaceModal = document.getElementById('add-race-modal');
    const addRaceModalClose = document.getElementById('add-race-modal-close');
    if (addRaceModalClose) addRaceModalClose.addEventListener('click', closeAddRaceModal);
    if (addRaceModal) {
      addRaceModal.addEventListener('click', (e) => {
        if (e.target === addRaceModal) closeAddRaceModal();
      });
    }

    // 4. 캘린더 등록 모달 제어
    const calModal = document.getElementById('calendar-export-modal');
    const calModalClose = document.getElementById('calendar-export-modal-close');
    if (calModalClose) calModalClose.addEventListener('click', closeCalendarExportModal);
    if (calModal) {
      calModal.addEventListener('click', (e) => {
        if (e.target === calModal) closeCalendarExportModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAdminAuthModal();
        closeContactRequestModal();
        closeAddRaceModal();
        closeCalendarExportModal();
      }
    });

    const emailInput = document.getElementById('admin-google-email-input');
    const verifyBtn = document.getElementById('admin-google-verify-btn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', verifyGoogleAdminInput);
    }
    if (emailInput) {
      emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          verifyGoogleAdminInput();
        }
      });
    }

    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        try { localStorage.removeItem(LOGGED_ADMIN_STORAGE_KEY); } catch (e) {}
        updateAdminAuthModalView();
        renderRightRaceScheduleSidebar();
        closeAdminAuthModal();
        const formEl = document.getElementById('admin-memo-form');
        if (formEl) formEl.classList.add('hidden');
        showToast('🔒 관리자 계정에서 로그아웃되었습니다.');
      });
    }

    const managePermBtn = document.getElementById('admin-manage-perm-btn');
    if (managePermBtn) {
      managePermBtn.addEventListener('click', () => {
        const currentList = getApprovedAdminEmails();
        const addEmail = prompt(`[최고 관리자 전용] 현재 대회 추가·관리 승인된 구글 계정 목록:\n- ${currentList.join('\n- ')}\n\n새로 추가 승인할 구글 이메일을 입력하세요:`);
        if (addEmail && addEmail.includes('@')) {
          const trimmed = addEmail.trim().toLowerCase();
          if (!currentList.map(e => e.toLowerCase()).includes(trimmed)) {
            currentList.push(trimmed);
            saveApprovedAdminEmails(currentList);
            alert(`✅ [${trimmed}] 구글 계정이 관리자로 추가 승인되었습니다.`);
          } else {
            alert('이미 승인되어 있는 구글 계정입니다.');
          }
        }
      });
    }

    const openReqFromAuthBtn = document.getElementById('open-approval-request-from-auth-btn');
    if (openReqFromAuthBtn) {
      openReqFromAuthBtn.addEventListener('click', () => {
        closeAdminAuthModal();
        openContactRequestModal('admin_approval');
      });
    }

    const openContactBtn = document.getElementById('open-contact-modal-btn');
    if (openContactBtn) {
      openContactBtn.addEventListener('click', () => {
        openContactRequestModal('admin_approval');
      });
    }

    const typeSelect = document.getElementById('contact-type-select');
    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        triggerContactTypePlaceholder(typeSelect.value);
      });
    }

    const webGmailBtn = document.getElementById('send-via-web-gmail-btn');
    if (webGmailBtn) {
      webGmailBtn.addEventListener('click', () => sendContactMail(true));
    }

    const mailtoBtn = document.getElementById('send-via-mailto-btn');
    if (mailtoBtn) {
      mailtoBtn.addEventListener('click', () => sendContactMail(false));
    }

    const copyBtn = document.getElementById('copy-contact-content-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const payload = getMailPayload();
        if (!payload) return;
        navigator.clipboard.writeText(`[제목]: ${payload.subject}\n\n${payload.body}`).then(() => {
          showToast('📋 메일 내용이 클립보드에 복사되었습니다.');
        }).catch(() => {
          showToast('📋 복사 완료되었습니다.');
        });
      });
    }

    // 푸터의 '운영자 소개·문의' 버튼도 문의 모달로 연동
    document.querySelectorAll('[data-policy="contact"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openContactRequestModal('advertising');
      });
    });
  }

  // =========================================================================
  // [반응형 대시보드 탭 컨트롤러 & 레이아웃 관리자 (8개 독립 패널 원클릭 전환)]
  // =========================================================================
  const DASH_TAB_TO_PANEL = {
    'tab-calc': 'panel-calc',
    'tab-daily': 'panel-daily',
    'tab-dday': 'panel-dday',
    'tab-fueling': 'panel-fueling',
    'tab-lab': 'panel-lab',
    'tab-checklist': 'panel-checklist',
    'tab-gear': 'panel-gear',
    'tab-faq': 'panel-faq'
  };

  let currentActiveTabId = 'tab-calc';
  let isAllViewMode = false; // 기본: 한 화면씩 탭 모드

  function switchDashboardTab(tabId, shouldScroll = true) {
    if (!DASH_TAB_TO_PANEL[tabId]) tabId = 'tab-calc';
    currentActiveTabId = tabId;
    isAllViewMode = false;
    updateViewModeButtonUI();

    try {
      localStorage.setItem('marathon_active_tab_v3', tabId);
    } catch (e) {}

    // 1. 모든 패널 숨김 및 선택 패널만 즉시 표시 (0.001초 전환)
    const targetPanelId = DASH_TAB_TO_PANEL[tabId];
    document.querySelectorAll('.dash-panel').forEach(panel => {
      if (panel.id === targetPanelId) {
        panel.style.display = 'block';
        panel.classList.remove('hidden');
      } else {
        panel.style.display = 'none';
        panel.classList.add('hidden');
      }
    });

    // 2. PC 좌측 사이드바 & 모바일 상단 가로 탭 버튼 활성화 스타일 갱신
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
      const bTab = btn.getAttribute('data-dash-tab');
      const isMatch = (bTab === tabId);
      if (btn.classList.contains('dash-pc-btn')) {
        // PC 사이드바 메뉴 버튼 스타일
        btn.className = isMatch
          ? 'dash-tab-btn dash-pc-btn w-full px-3 py-2.5 rounded-xl text-xs font-extrabold bg-brand-600 text-white shadow-sm transition flex items-center gap-2.5 text-left'
          : 'dash-tab-btn dash-pc-btn w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2.5 text-left';
      } else {
        // 모바일 상단 가로 스크롤 탭 버튼 스타일
        btn.className = isMatch
          ? 'dash-tab-btn shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-brand-600 text-white shadow-sm transition'
          : 'dash-tab-btn shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition';
      }
    });

    // 3. 뷰포트 스크롤: 사용자 클릭 전환 시 부드럽게 정렬
    if (!shouldScroll) return;
    if (window.innerWidth < 1024) {
      const topBar = document.getElementById('mobile-tabs-bar');
      if (topBar) {
        topBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      const area = document.getElementById('dashboard-content-area');
      if (area) {
        const y = area.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }
  }

  function toggleViewMode() {
    setAllViewMode(!isAllViewMode);
  }

  function setAllViewMode(enabled) {
    isAllViewMode = enabled;
    updateViewModeButtonUI();

    document.querySelectorAll('.dash-panel').forEach(panel => {
      if (enabled) {
        panel.style.display = 'block';
        panel.classList.remove('hidden');
      }
    });

    if (!enabled) {
      switchDashboardTab(currentActiveTabId);
    } else {
      showToast('📜 전체 화면 펼쳐보기 모드로 전환되었습니다.');
    }
  }

  function updateViewModeButtonUI() {
    const textEl = document.getElementById('view-mode-text');
    if (textEl) {
      textEl.textContent = isAllViewMode
        ? '📜 전체 펼쳐보기 모드'
        : '📑 한 화면씩 보기 (탭)';
    }
  }

  function initDashboardNavigation() {
    // 탭 버튼 클릭 이벤트 바인딩
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-dash-tab');
        if (tabId) switchDashboardTab(tabId);
      });
    });

    // 화면 보기 방식 토글 버튼
    const toggleBtn = document.getElementById('toggle-view-mode-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleViewMode);
    }

    // 상단 네비게이션 헤더 앵커 연결
    const navMap = {
      '#calculator-section': 'tab-calc',
      '#fueling-section': 'tab-fueling',
      '#pro-lab-section': 'tab-lab',
      '#gear-section': 'tab-gear',
      '#checklist-section': 'tab-checklist',
      '#faq-section': 'tab-faq'
    };

    Object.keys(navMap).forEach(href => {
      document.querySelectorAll(`header a[href="${href}"], nav a[href="${href}"]`).forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          switchDashboardTab(navMap[href]);
        });
      });
    });

    const openContactFromSidebar = document.getElementById('open-contact-from-sidebar-btn');
    if (openContactFromSidebar) {
      openContactFromSidebar.addEventListener('click', () => {
        openContactRequestModal('admin_approval');
      });
    }

    // 기본 첫 화면은 1. VDOT 페이스·스플릿 (tab-calc)
    let savedTab = 'tab-calc';
    try {
      const s = localStorage.getItem('marathon_active_tab_v3');
      if (s && DASH_TAB_TO_PANEL[s]) savedTab = s;
    } catch (e) {}

    switchDashboardTab(savedTab, false);
  }

  // --- [관리자 전용 대회 메모 및 운영 공지 모듈] ---
  const DEFAULT_ADMIN_MEMO = `[관리자 대회 안내 & 메모]
• 대회 집결: 오전 07:00까지 배정 그룹 집결지 도착 권장
• 물품보관소 마감: 출발 30분 전 보관 마감되니 여유 있게 보관하세요.
• 에너지젤 보급: 7km, 14km, 21km, 28km, 35km 지점 전후 급수대에서 섭취 추천
• 레이스 후 회복: 결승선 통과 직후 수분 및 바나나/초코우유 보충 필수`;

  function initAdminMemo() {
    const displayEl = document.getElementById('admin-memo-display');
    const formEl = document.getElementById('admin-memo-form');
    const editBtn = document.getElementById('admin-memo-edit-btn');
    const inputEl = document.getElementById('admin-memo-input');
    const saveBtn = document.getElementById('admin-memo-save-btn');
    const cancelBtn = document.getElementById('admin-memo-cancel-btn');
    const templateBtn = document.getElementById('admin-memo-template-btn');
    const changePwBtn = document.getElementById('admin-change-pw-btn');

    function getAdminPw() {
      try {
        return localStorage.getItem(ADMIN_PW_STORAGE_KEY) || 'admin1234';
      } catch (e) {
        return 'admin1234';
      }
    }

    function renderMemo() {
      let memo = '';
      try {
        memo = localStorage.getItem(ADMIN_MEMO_STORAGE_KEY);
      } catch (e) {}
      if (!memo) memo = DEFAULT_ADMIN_MEMO;

      if (displayEl) {
        displayEl.textContent = memo;
      }
      if (inputEl) {
        inputEl.value = memo;
      }
    }

    renderMemo();

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (!isCurrentAdminApproved()) {
          openAdminAuthModal('대회 공지 수정');
          return;
        }
        if (formEl) {
          formEl.classList.toggle('hidden');
          if (!formEl.classList.contains('hidden') && inputEl) {
            inputEl.focus();
          }
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (formEl) formEl.classList.add('hidden');
        renderMemo();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const val = inputEl ? inputEl.value.trim() : '';
        try {
          localStorage.setItem(ADMIN_MEMO_STORAGE_KEY, val);
          showToast('✅ 관리자 메모가 저장되었습니다.');
        } catch (e) {}
        renderMemo();
        if (formEl) formEl.classList.add('hidden');
      });
    }

    if (templateBtn) {
      templateBtn.addEventListener('click', () => {
        if (inputEl) inputEl.value = DEFAULT_ADMIN_MEMO;
      });
    }

    if (changePwBtn) {
      changePwBtn.addEventListener('click', () => {
        const currPw = prompt('현재 관리자 비밀번호를 입력하세요:');
        if (currPw === null) return;
        if (currPw.trim() !== getAdminPw()) {
          alert('❌ 현재 비밀번호가 일치하지 않습니다.');
          return;
        }
        const newPw = prompt('새로운 관리자 비밀번호를 입력하세요 (4자 이상):');
        if (newPw && newPw.trim().length >= 4) {
          try {
            localStorage.setItem(ADMIN_PW_STORAGE_KEY, newPw.trim());
            alert('✅ 관리자 비밀번호가 성공적으로 변경되었습니다.');
          } catch (e) {}
        } else {
          alert('비밀번호 변경이 취소되었거나 너무 짧습니다.');
        }
      });
    }
  }

  // --- [게스트 이용 가능: 데일리 러너 수분 섭취 & 나만의 체크리스트 모듈] ---
  const DEFAULT_ROUTINE_TASKS = [
    '🏃 오늘의 목표 러닝 / 가벼운 조깅 완료',
    '🧘 폼롤러 & 발목·햄스트링 스트레칭 15분',
    '💊 비타민 / 마그네슘 / 영양제 섭취',
    '🥗 탄수화물·단백질 균형 식단 유지',
    '😴 7시간 이상 충분한 숙면과 휴식'
  ];

  const WATER_TIME_SLOTS = [
    { id: 'wake', label: '기상 직후', desc: '체내 수분 보충', ml: 250 },
    { id: 'am10', label: '오전 10시', desc: '갈증·피로 예방', ml: 250 },
    { id: 'lunch', label: '점심 식후', desc: '소화 흡수 돕기', ml: 250 },
    { id: 'pm3', label: '오후 3시', desc: '활력 충전', ml: 250 },
    { id: 'preRun', label: '러닝 1시간 전', desc: '근경련(쥐) 예방', ml: 350 },
    { id: 'postRun', label: '러닝 직후', desc: '땀 손실 보충', ml: 400 },
    { id: 'sleep', label: '취침 1시간 전', desc: '수면 중 회복', ml: 250 }
  ];

  function getTodayDateStr() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  let currentDailyDate = getTodayDateStr();

  function getDailyStore() {
    try {
      return JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveDailyStore(store) {
    try {
      localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  function getDayData(dateStr) {
    const store = getDailyStore();
    if (!store[dateStr]) {
      store[dateStr] = {
        waterGoalMl: 2000,
        waterCurrentMl: 0,
        timeSlots: {},
        tasks: DEFAULT_ROUTINE_TASKS.map((t, idx) => ({ id: 'def_' + idx, text: t, done: false }))
      };
      saveDailyStore(store);
    }
    return store[dateStr];
  }

  function updateDayData(dateStr, updater) {
    const store = getDailyStore();
    const cur = store[dateStr] || getDayData(dateStr);
    updater(cur);
    store[dateStr] = cur;
    saveDailyStore(store);
    renderDailyChecklistUI();
  }

  function renderDailyChecklistUI() {
    const datePicker = document.getElementById('daily-date-picker');
    if (datePicker) datePicker.value = currentDailyDate;

    const data = getDayData(currentDailyDate);

    // 수분 렌더링
    const currentText = document.getElementById('water-current-text');
    const goalText = document.getElementById('water-goal-text');
    const percentBadge = document.getElementById('water-percent-badge');
    const progressBar = document.getElementById('water-progress-bar');
    const goalSelect = document.getElementById('water-goal-select');

    const goal = data.waterGoalMl || 2000;
    const current = Math.max(0, data.waterCurrentMl || 0);
    const pct = Math.min(100, Math.round((current / goal) * 100));

    if (currentText) currentText.textContent = current.toLocaleString();
    if (goalText) goalText.textContent = goal.toLocaleString();
    if (percentBadge) {
      percentBadge.textContent = `${pct}% 달성 (${(current / 1000).toFixed(1)}L / ${(goal / 1000).toFixed(1)}L)`;
      if (pct >= 100) {
        percentBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
      } else {
        percentBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400';
      }
    }
    if (progressBar) {
      progressBar.style.width = `${pct}%`;
      progressBar.className = pct >= 100
        ? 'h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-300'
        : 'h-full bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full transition-all duration-300';
    }
    if (goalSelect && goalSelect.value != goal) {
      goalSelect.value = String(goal);
    }

    // 시간대별 체크박스 버튼 렌더링
    const slotsContainer = document.getElementById('water-time-slots');
    if (slotsContainer) {
      slotsContainer.innerHTML = '';
      const slots = data.timeSlots || {};
      WATER_TIME_SLOTS.forEach(slot => {
        const isChecked = !!slots[slot.id];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isChecked
          ? 'p-2 rounded-lg text-left border transition flex items-center justify-between bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200 font-bold'
          : 'p-2 rounded-lg text-left border transition flex items-center justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800';
        btn.innerHTML = `
          <div>
            <div class="text-[11px] font-extrabold">${slot.label}</div>
            <div class="text-[10px] opacity-70">${slot.ml}ml · ${slot.desc}</div>
          </div>
          <span class="text-xs">${isChecked ? '✅' : '⚪'}</span>
        `;
        btn.addEventListener('click', () => {
          updateDayData(currentDailyDate, d => {
            if (!d.timeSlots) d.timeSlots = {};
            const nextCheck = !d.timeSlots[slot.id];
            d.timeSlots[slot.id] = nextCheck;
            if (nextCheck) {
              d.waterCurrentMl = (d.waterCurrentMl || 0) + slot.ml;
              showToast(`💧 ${slot.label} 수분 +${slot.ml}ml 체크 완료!`);
            } else {
              d.waterCurrentMl = Math.max(0, (d.waterCurrentMl || 0) - slot.ml);
              showToast(`↩️ ${slot.label} 수분 체크 해제`);
            }
          });
        });
        slotsContainer.appendChild(btn);
      });
    }

    // 루틴 태스크 렌더링
    const tasksContainer = document.getElementById('daily-tasks-container');
    const taskSummaryBadge = document.getElementById('daily-task-summary-badge');
    const tasks = data.tasks || [];
    const completedCount = tasks.filter(t => t.done).length;

    if (taskSummaryBadge) {
      taskSummaryBadge.textContent = `${completedCount}/${tasks.length} 완료`;
      taskSummaryBadge.className = completedCount === tasks.length && tasks.length > 0
        ? 'px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        : 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }

    if (tasksContainer) {
      tasksContainer.innerHTML = '';
      if (tasks.length === 0) {
        tasksContainer.innerHTML = '<div class="text-center py-4 text-xs text-slate-400">등록된 데일리 루틴이 없습니다. 위에서 추가해보세요!</div>';
      } else {
        tasks.forEach(task => {
          const item = document.createElement('div');
          item.className = 'flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs transition';

          const left = document.createElement('label');
          left.className = 'flex items-center gap-2.5 flex-1 cursor-pointer select-none';

          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.checked = !!task.done;
          chk.className = 'w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500';

          const textSpan = document.createElement('span');
          textSpan.className = task.done
            ? 'line-through text-slate-400 dark:text-slate-500'
            : 'text-slate-800 dark:text-slate-200 font-semibold';
          textSpan.textContent = task.text;

          chk.addEventListener('change', () => {
            updateDayData(currentDailyDate, d => {
              const target = d.tasks.find(t => t.id === task.id);
              if (target) target.done = chk.checked;
            });
            if (chk.checked) showToast(`🎯 [${task.text}] 완료!`);
          });

          left.appendChild(chk);
          left.appendChild(textSpan);

          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'text-slate-400 hover:text-rose-500 px-1.5 py-0.5 text-xs font-bold transition';
          delBtn.textContent = '✕';
          delBtn.title = '항목 삭제';
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateDayData(currentDailyDate, d => {
              d.tasks = d.tasks.filter(t => t.id !== task.id);
            });
          });

          item.appendChild(left);
          item.appendChild(delBtn);
          tasksContainer.appendChild(item);
        });
      }
    }
  }

  function initDailyRoutineChecklist() {
    // 날짜 조작
    const datePicker = document.getElementById('daily-date-picker');
    const todayBtn = document.getElementById('daily-today-btn');
    const prevBtn = document.getElementById('daily-prev-date-btn');
    const nextBtn = document.getElementById('daily-next-date-btn');

    function shiftDate(days) {
      const parts = currentDailyDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + days);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      currentDailyDate = `${yyyy}-${mm}-${dd}`;
      renderDailyChecklistUI();
    }

    if (datePicker) {
      datePicker.value = currentDailyDate;
      datePicker.addEventListener('change', () => {
        if (datePicker.value) {
          currentDailyDate = datePicker.value;
          renderDailyChecklistUI();
        }
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        currentDailyDate = getTodayDateStr();
        renderDailyChecklistUI();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => shiftDate(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => shiftDate(1));
    }

    // 수분 목표 셀렉트
    const goalSelect = document.getElementById('water-goal-select');
    if (goalSelect) {
      goalSelect.addEventListener('change', () => {
        const val = parseInt(goalSelect.value, 10);
        updateDayData(currentDailyDate, d => {
          d.waterGoalMl = val;
        });
      });
    }

    // 퀵 버튼 (+250, +500, -250)
    document.querySelectorAll('.water-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const addMl = parseInt(btn.getAttribute('data-water-add'), 10) || 0;
        updateDayData(currentDailyDate, d => {
          d.waterCurrentMl = Math.max(0, (d.waterCurrentMl || 0) + addMl);
        });
        if (addMl > 0) {
          showToast(`💧 수분 +${addMl}ml 추가 완료!`);
        }
      });
    });

    // 수분 리셋 버튼
    const waterResetBtn = document.getElementById('water-reset-btn');
    if (waterResetBtn) {
      waterResetBtn.addEventListener('click', () => {
        if (confirm('오늘의 수분 섭취 기록을 0ml로 초기화하시겠습니까?')) {
          updateDayData(currentDailyDate, d => {
            d.waterCurrentMl = 0;
            d.timeSlots = {};
          });
          showToast('🔄 수분 섭취 기록이 초기화되었습니다.');
        }
      });
    }

    // 새 루틴 추가
    const newTaskInput = document.getElementById('daily-new-task-input');
    const addTaskBtn = document.getElementById('daily-add-task-btn');

    function addNewTask() {
      if (!newTaskInput) return;
      const text = newTaskInput.value.trim();
      if (!text) return;
      updateDayData(currentDailyDate, d => {
        if (!d.tasks) d.tasks = [];
        d.tasks.push({
          id: 'custom_' + Date.now(),
          text: text,
          done: false
        });
      });
      newTaskInput.value = '';
      showToast('✨ 새 데일리 루틴이 추가되었습니다.');
    }

    if (addTaskBtn) addTaskBtn.addEventListener('click', addNewTask);
    if (newTaskInput) {
      newTaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addNewTask();
        }
      });
    }

    // 기본 루틴 복원
    const resetTasksBtn = document.getElementById('daily-reset-tasks-btn');
    if (resetTasksBtn) {
      resetTasksBtn.addEventListener('click', () => {
        if (confirm('기본 5대 러너 루틴으로 복원하시겠습니까? (현재 체크 상태는 초기화됩니다)')) {
          updateDayData(currentDailyDate, d => {
            d.tasks = DEFAULT_ROUTINE_TASKS.map((t, idx) => ({ id: 'def_' + idx, text: t, done: false }));
          });
          showToast('🔄 기본 러너 루틴이 복원되었습니다.');
        }
      });
    }

    renderDailyChecklistUI();
  }


  function initProLabEvents() {
    // 1. 메이저 대회 프리셋 버튼 및 날짜·코스 실시간 즉시 변경 & 자동 영구 저장
    renderRaceButtons();

    const raceDateInput = document.getElementById('race-date-input');
    const raceCourseSelect = document.getElementById('race-course-select');

    if (raceDateInput) {
      raceDateInput.addEventListener('input', () => {
        handleRaceDateManualChange(raceDateInput.value, false);
      });
      raceDateInput.addEventListener('change', () => {
        handleRaceDateManualChange(raceDateInput.value, true);
      });
    }

    if (raceCourseSelect) {
      raceCourseSelect.addEventListener('change', () => {
        handleCourseManualChange(raceCourseSelect.value);
      });
    }

    // 2. 날씨 슬라이더 (기온·습도·풍속)
    const tempSlider = document.getElementById('weather-temp-slider');
    const humSlider = document.getElementById('weather-hum-slider');
    const windSlider = document.getElementById('weather-wind-slider');
    if (tempSlider) {
      tempSlider.addEventListener('input', () => {
        labState.tempC = parseInt(tempSlider.value, 10);
        calculateAndRender();
      });
    }
    if (humSlider) {
      humSlider.addEventListener('input', () => {
        labState.humidity = parseInt(humSlider.value, 10);
        calculateAndRender();
      });
    }
    if (windSlider) {
      windSlider.addEventListener('input', () => {
        labState.windMs = parseFloat(windSlider.value);
        calculateAndRender();
      });
    }

    // 4. 손목 페이스 밴드 단독 이미지 다운로드
    const pacebandBtn = document.getElementById('download-paceband-btn');
    if (pacebandBtn) {
      pacebandBtn.addEventListener('click', async () => {
        const bandEl = document.getElementById('wrist-pace-band-card');
        if (!bandEl) return;
        const orig = pacebandBtn.textContent;
        pacebandBtn.textContent = '⏳ 저장 중...';
        try {
          const canvas = await html2canvas(bandEl, { backgroundColor: '#0f172a', scale: 2, useCORS: true });
          const link = document.createElement('a');
          link.download = `wrist-paceband-${formatHMS(state.targetSec).replace(/:/g, '')}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          showToast('⌚ 손목 페이스 밴드 이미지가 저장되었습니다!');
        } catch (e) {
          showToast('⚠️ 이미지 저장에 실패했습니다.');
        } finally {
          pacebandBtn.textContent = orig;
        }
      });
    }

    // 6. 심박수 존 나이·안정시 심박수 입력
    const ageInput = document.getElementById('runner-age');
    const restHrInput = document.getElementById('runner-rest-hr');
    if (ageInput) {
      ageInput.addEventListener('input', () => {
        labState.age = Math.max(10, Math.min(95, parseInt(ageInput.value || '35', 10)));
        calculateAndRender();
      });
    }
    if (restHrInput) {
      restHrInput.addEventListener('input', () => {
        labState.restHR = Math.max(30, Math.min(110, parseInt(restHrInput.value || '58', 10)));
        calculateAndRender();
      });
    }

    // 7. 케이던스 슬라이더
    const cadenceSlider = document.getElementById('cadence-slider');
    if (cadenceSlider) {
      cadenceSlider.addEventListener('input', () => {
        labState.cadenceSpm = parseInt(cadenceSlider.value, 10);
        calculateAndRender();
      });
    }

    // 9. 주간 훈련 스케줄 주수 선택 (4주 / 8주 / 12주)
    document.querySelectorAll('.sched-week-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        labState.schedWeeks = parseInt(btn.getAttribute('data-weeks'), 10);
        document.querySelectorAll('.sched-week-btn').forEach(b => {
          b.className = b === btn
            ? 'sched-week-btn px-3 py-1.5 rounded-xl text-xs font-extrabold bg-brand-600 text-white shadow-sm'
            : 'sched-week-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
        });
        calculateAndRender();
      });
    });

    // 10. 체크리스트 초기화 버튼
    const resetChkBtn = document.getElementById('reset-checklist-btn');
    if (resetChkBtn) {
      resetChkBtn.addEventListener('click', () => {
        checkedMap = {};
        saveChecklistState();
        renderChecklistUI();
        showToast('🔄 대회 준비물 체크리스트가 초기화되었습니다.');
      });
    }
  }

    // 전역 윈도우 객체 바인딩 (인라인 onclick 지원)
  window.quickLoginAsOwner = quickLoginAsOwner;
  window.handleClickAddRaceWithAuth = handleClickAddRaceWithAuth;
  window.updateDDayBadge = updateDDayBadge;
  window.renderRightRaceScheduleSidebar = renderRightRaceScheduleSidebar;
  window.selectRace = selectRace;
  window.switchDashboardTab = switchDashboardTab;
  window.toggleViewMode = toggleViewMode;
  window.setAllViewMode = setAllViewMode;
  window.openAddRacePrompt = openAddRacePrompt;
  window.openAddRaceModal = openAddRaceModal;
  window.closeAddRaceModal = closeAddRaceModal;
  window.submitAddRaceModal = submitAddRaceModal;
  window.verifyGoogleAdminInput = verifyGoogleAdminInput;
  window.deleteCustomRace = deleteCustomRace;
  window.openEditRaceModal = openEditRaceModal;
  window.openEditCurrentRaceModal = openEditCurrentRaceModal;
  window.testRaceUrlInModal = testRaceUrlInModal;
  window.resetDefaultMajorRaces = resetDefaultMajorRaces;
  window.openCalendarExportModal = openCalendarExportModal;
  window.closeCalendarExportModal = closeCalendarExportModal;
  window.exportToGoogleCalendar = exportToGoogleCalendar;
  window.exportToNaverCalendar = exportToNaverCalendar;
  window.downloadCalendarIcs = downloadCalendarIcs;
  window.copyCalendarDetailsToClipboard = copyCalendarDetailsToClipboard;
  window.openAdminAuthModal = openAdminAuthModal;
  window.closeAdminAuthModal = closeAdminAuthModal;
  window.openContactRequestModal = openContactRequestModal;
  window.closeContactRequestModal = closeContactRequestModal;

  // 초기 실행 (개별 try-catch로 무중단 실행 보장)
  [
    ['AffiliateLinkManager', initAffiliateLinkManager],
    ['AdminAndContactSystem', initAdminAndContactSystem],
    ['DashboardNavigation', initDashboardNavigation],
    ['AdminMemo', initAdminMemo],
    ['DailyRoutineChecklist', initDailyRoutineChecklist],
    ['ProLabEvents', initProLabEvents],
    ['syncRecentInputsFromSec', syncRecentInputsFromSec],
    ['syncTargetInputsFromSec', syncTargetInputsFromSec],
    ['renderRaceButtons', renderRaceButtons],
    ['updateRaceDOM', updateRaceDOM],
    ['updateDDayBadge', updateDDayBadge],
    ['renderRightRaceScheduleSidebar', renderRightRaceScheduleSidebar],
    ['calculateAndRender', calculateAndRender]
  ].forEach(([name, fn]) => {
    try {
      if (typeof fn === 'function') fn();
    } catch (err) {
      console.warn(`[SafeInit warning in ${name}]:`, err);
    }
  });
})();
