/* Pacecraft Runner — 공유 코스 보정 계산 엔진 (외부 라이브러리 불필요) */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.PacecraftCourseEngine = engine;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const VERSION = 1;
  const STORE_KEY = 'pacecraft_custom_raceplan_v1';
  const EPS = 1e-8;
  const roundDist = n => Math.round(n * 10000) / 10000;
  const validStrategy = s => ['even', 'negative', 'positive'].includes(s) ? s : 'even';
  const validMode = m => m === 'target' ? 'target' : 'add';
  const fmtTime = sec => {
    const s = Math.max(0, Math.round(sec));
    return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  const fmtPace = sec => {
    const s = Math.max(0, Math.round(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  function parsePace(value) {
    const match = String(value || '').trim().replace(/[\s'"’′″]/g, ':').replace(/:+$/,'').match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match || Number(match[2]) > 59) return NaN;
    return Number(match[1]) * 60 + Number(match[2]);
  }
  function parseTime(value) {
    const parts = String(value || '').trim().split(':').map(Number);
    if (![2, 3].includes(parts.length) || parts.some(n => !Number.isInteger(n) || n < 0)) return NaN;
    if (parts.length === 2) return parts[1] < 60 ? parts[0] * 60 + parts[1] : NaN;
    return parts[1] < 60 && parts[2] < 60 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : NaN;
  }
  function normalizedRules(rules, distanceKm) {
    if (!Array.isArray(rules)) return [];
    return rules.slice(0, 200).map((rule, index) => ({
      startKm: Number(rule.startKm),
      endKm: Number(rule.endKm),
      secPerKm: Number(rule.secPerKm),
      note: String(rule.note || '').slice(0, 160),
      id: String(rule.id || `segment-${index}`).slice(0, 64)
    })).filter(r => Number.isFinite(r.startKm) && Number.isFinite(r.endKm) &&
      Number.isFinite(r.secPerKm) && r.startKm >= 0 && r.endKm <= distanceKm + EPS &&
      r.endKm - r.startKm > EPS && Math.abs(r.secPerKm) <= 120);
  }
  function defaultPlan() {
    return {version: VERSION, race: 'custom', distanceKm: 42.195, targetSeconds: 12600,
      strategy: 'even', mode: 'add', applyToVDOT: false, rules: [], overrides: {},
      fueling: {}, notes: {}, startTime: '08:00', generalMemo: ''};
  }
  function sanitizeStored(data) {
    const base = defaultPlan();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return base;
    const allowed = [10, 21.0975, 42.195];
    const distanceKm = allowed.find(d => Math.abs(d - Number(data.distanceKm)) < 0.0001) || base.distanceKm;
    const targetSeconds = Number(data.targetSeconds);
    return {
      ...base,
      race: String(data.race || base.race).slice(0, 80),
      distanceKm,
      targetSeconds: Number.isFinite(targetSeconds) && targetSeconds >= 900 && targetSeconds <= 50000 ? targetSeconds : base.targetSeconds,
      strategy: validStrategy(data.strategy),
      mode: validMode(data.mode),
      applyToVDOT: data.applyToVDOT === true,
      rules: normalizedRules(data.rules, distanceKm),
      overrides: sanitizeMap(data.overrides, 100, v => Number.isFinite(Number(v)) && Number(v) >= 60 && Number(v) < 100000 ? Number(v) : null),
      fueling: sanitizeMap(data.fueling, 100, v => String(v || '').slice(0, 120)),
      notes: sanitizeMap(data.notes, 100, v => String(v || '').slice(0, 240)),
      startTime: /^\d{2}:\d{2}$/.test(data.startTime) ? data.startTime : '08:00',
      generalMemo: String(data.generalMemo || '').slice(0, 3000)
    };
  }
  function sanitizeMap(data, limit, convert) {
    const result = {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) return result;
    Object.keys(data).slice(0, limit).forEach(k => {
      if (!/^\d+(?:\.\d{1,4})?$/.test(k)) return;
      const v = convert(data[k]);
      if (v !== null) result[k] = v;
    });
    return result;
  }
  function load() {
    try { return sanitizeStored(JSON.parse(localStorage.getItem(STORE_KEY))); }
    catch (_) { return defaultPlan(); }
  }
  function save(data) {
    const clean = sanitizeStored(data);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(clean)); return true; }
    catch (_) { return false; }
  }
  /** Piecewise distance-precise terrain adjustments. All seconds are floats until display. */
  function calculate({distanceKm, targetSeconds, strategy, mode, rules}) {
    const distance = Number(distanceKm), target = Number(targetSeconds);
    if (!(distance > 0 && distance <= 100) || !(target >= 300 && target <= 50000)) throw new Error('거리/목표 시간이 올바르지 않습니다.');
    const selectedRules = normalizedRules(rules, distance);
    const selectedStrategy = validStrategy(strategy);
    const selectedMode = validMode(mode);
    const points = [0, distance];
    for (let d = 1; d < distance; d++) points.push(d);
    for (const rule of selectedRules) points.push(rule.startKm, rule.endKm);
    points.sort((a,b) => a-b);
    const marks = points.filter((p,i) => i === 0 || p-points[i-1] > EPS).map(roundDist);
    const parts = [];
    for (let i=1; i<marks.length; i++) {
      const a = marks[i-1], b = marks[i], length = b-a;
      if (length < EPS) continue;
      const midpoint = (a+b)/2, progress = midpoint / distance;
      let factor = 1;
      if (selectedStrategy === 'negative') factor = 1.022 - 0.044*progress;
      if (selectedStrategy === 'positive') factor = 0.982 + 0.036*progress;
      const matched = selectedRules.filter(r => midpoint >= r.startKm-EPS && midpoint < r.endKm-EPS);
      const penalty = length * matched.reduce((s,r) => s+r.secPerKm,0);
      parts.push({startKm:a,endKm:b,dist:length,weight:length*factor,penalty,affected:matched.length>0,matched});
    }
    const weight = parts.reduce((s,r) => s+r.weight,0);
    const terrainDelta = parts.reduce((s,r) => s+r.penalty,0);
    const available = parts.filter(r=>!r.affected).reduce((s,r)=>s+r.dist,0);
    const totalAvailable = available > EPS ? available : distance;
    let elapsed = 0;
    for (const p of parts) {
      const base = target * p.weight / weight;
      const compensation = selectedMode === 'target' && (available <= EPS || !p.affected)
        ? terrainDelta * p.dist / totalAvailable : 0;
      p.seconds = base + p.penalty - compensation;
      if (!(p.seconds > 0) || p.seconds / p.dist < 100) throw new Error('보정값이 과도해 일부 구간 페이스가 비정상적입니다. 보정값을 줄여 주세요.');
      elapsed += p.seconds;
      p.cumulative = elapsed;
    }
    function at(km) {
      const pos = Math.max(0, Math.min(distance, Number(km)));
      if (pos <= 0) return 0;
      for (const p of parts) {
        if (pos <= p.endKm + EPS) return p.cumulative - p.seconds + Math.max(0,Math.min(p.dist,pos-p.startKm)) * p.seconds/p.dist;
      }
      return elapsed;
    }
    function splits(milestones) {
      let lastKm = 0, lastTime = 0;
      return milestones.filter((d,i,a) => d>0 && d<=distance+EPS && (i===0 || d>a[i-1])).map(d => {
        const current = at(d);
        const row={startKm:lastKm,endKm:d,dist:d-lastKm,seconds:current-lastTime,paceSeconds:(current-lastTime)/(d-lastKm),cumulative:current,
          rules:selectedRules.filter(r => r.endKm>lastKm+EPS && r.startKm<d-EPS)};
        lastKm=d; lastTime=current; return row;
      });
    }
    const kms = [];
    for (let d=1;d<distance;d++) kms.push(d);
    kms.push(distance);
    return {distanceKm: distance, targetSeconds:target, strategy:selectedStrategy, mode:selectedMode, rules:selectedRules,
      terrainDelta, totalSeconds:elapsed, segments:parts, at, splits, kilometers:splits(kms)};
  }
  return {VERSION, STORE_KEY, defaultPlan, sanitizeStored, normalizedRules, load, save,
    calculate, formatHMS:fmtTime, formatPace:fmtPace, parseTime, parsePace};
});