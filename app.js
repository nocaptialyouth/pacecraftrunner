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
        <p class="mb-3">본 웹사이트(이하 "MarathonLab PRO")는 이용자의 개인정보를 보호하며 『개인정보 보호법』, 공정거래위원회 추천·보증 등에 관한 표시·광고 심사지침 및 Google AdSense 정책을 엄격히 준수합니다.</p>
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
        <p class="mb-3">본 약관은 MarathonLab PRO가 제공하는 VDOT 분석, 스플릿 계산기, 에너지젤 보급 가이드 및 훈련 칼럼의 이용 기준을 규정합니다.</p>
        <h4 class="font-bold text-slate-900 dark:text-white mb-1">제2조 (의학적·전문적 면책 조항)</h4>
        <p class="mb-3">본 사이트가 산출하는 VDOT 레벨, 목표 달성 가능성(%), 권장 훈련 페이스 및 탄수화물·수분 섭취량은 스포츠 생리학 통계 모델(Jack Daniels Running Formula 및 Margaria 공식)에 기반한 참고용 추정치입니다. 당일 기상 조건과 개인의 심폐 건강 상태에 따라 실제 결과는 달라질 수 있으므로 무리한 주행을 피하시고 필요 시 전문의와 상담하시기 바랍니다.</p>
      `
    },
    contact: {
      title: '운영자 소개 및 제휴·광고 문의',
      html: `
        <p class="mb-3"><strong>MarathonLab PRO</strong>는 데이터 기반 마라톤 훈련 설계와 검증된 러닝 기어 큐레이션을 제공하는 러너 전용 웹 플랫폼입니다.</p>
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
  const CHECKLIST_STORAGE_KEY = 'marathon_pro_checklist_v1';

  const labState = {
    raceDate: '2027-03-21',
    courseType: 'flat',   // 'flat' | 'rolling' | 'hilly'
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

  function initProLabEvents() {
    // 1. 메이저 대회 프리셋 버튼 및 날짜·코스 변경
    const raceDateInput = document.getElementById('race-date-input');
    const raceCourseSelect = document.getElementById('race-course-select');
    document.querySelectorAll('.race-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        labState.raceDate = btn.getAttribute('data-date');
        labState.courseType = btn.getAttribute('data-course');
        if (raceDateInput) raceDateInput.value = labState.raceDate;
        if (raceCourseSelect) raceCourseSelect.value = labState.courseType;

        document.querySelectorAll('.race-preset-btn').forEach(b => {
          b.className = b === btn
            ? 'race-preset-btn px-3 py-1.5 rounded-xl text-xs font-extrabold bg-brand-600 text-white transition'
            : 'race-preset-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition';
        });
        calculateAndRender();
      });
    });

    if (raceDateInput) {
      raceDateInput.addEventListener('change', () => {
        labState.raceDate = raceDateInput.value;
        calculateAndRender();
      });
    }
    if (raceCourseSelect) {
      raceCourseSelect.addEventListener('change', () => {
        labState.courseType = raceCourseSelect.value;
        calculateAndRender();
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

  // 초기 실행
  initAffiliateLinkManager();
  initProLabEvents();
  syncRecentInputsFromSec();
  syncTargetInputsFromSec();
  calculateAndRender();
})();
