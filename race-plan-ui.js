/* Pacecraft Runner — 코스 보정 · 전체 레이스 계획표 UI */
(function () {
  'use strict';
  const E = window.PacecraftCourseEngine;
  const panel = document.getElementById('panel-plan');
  if (!E || !panel) return;
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const digits = n => String(Math.round(n));
  const labelFor = {chuncheon:'춘천마라톤', seoul:'서울마라톤 (동아)', jtbc:'JTBC 서울마라톤', daegu:'대구국제마라톤', gyeongju:'경주마라톤', busan:'부산브릿지마라톤', jinju:'진주마라톤', custom:'사용자 대회'};
  const hadSavedData = (() => { try { return !!localStorage.getItem(E.STORE_KEY); } catch (_) { return false; } })();
  let data = E.load();
  let course = null;
  let displayRows = [];
  let sequence = 1;

  if (!hadSavedData && window.PacecraftBridge) {
    const current = window.PacecraftBridge.getGoals();
    data = {...data, distanceKm:current.distanceKm, targetSeconds:current.targetSeconds,
      strategy:current.strategy, race:'custom'};
  }
  const keyFor = distance => String(Math.round(distance * 10000)/10000);
  function clockAt(elapsed) {
    const parts = String(data.startTime || '08:00').split(':').map(Number);
    const total = ((parts[0] * 3600 + parts[1] * 60 + Math.round(elapsed)) % 86400 + 86400) % 86400;
    return `${String(Math.floor(total/3600)).padStart(2,'0')}:${String(Math.floor(total%3600/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  }

  function status(message, isError) {
    const el = $('rp-status');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('rp-status-error', !!isError);
  }
  function persist() {
    if (!E.save(data)) status('브라우저 저장 공간을 사용할 수 없습니다. JSON으로 백업해 주세요.', true);
  }
  function updateVDOT() {
    if (window.PacecraftBridge && typeof window.PacecraftBridge.recalculate === 'function') {
      try { window.PacecraftBridge.recalculate(); } catch (e) { console.warn('[Race Plan] VDOT 표 갱신 실패', e); }
    }
  }
  function formFromData() {
    $('rp-race').value = labelFor[data.race] ? data.race : 'custom';
    $('rp-distance').value = String(data.distanceKm);
    $('rp-strategy').value = data.strategy;
    $('rp-mode').value = data.mode;
    $('rp-start-time').value = data.startTime;
    $('rp-apply-vdot').checked = data.applyToVDOT;
    const sec = Math.round(data.targetSeconds);
    $('rp-hours').value = Math.floor(sec/3600);
    $('rp-minutes').value = Math.floor(sec%3600/60);
    $('rp-seconds').value = sec%60;
    $('rp-general-memo').value = data.generalMemo;
  }
  function takeFormData() {
    const hours = Number($('rp-hours').value), mins=Number($('rp-minutes').value), secs=Number($('rp-seconds').value);
    const distance=Number($('rp-distance').value);
    if (![hours,mins,secs].every(Number.isInteger) || hours<0 || hours>13 || mins<0 || mins>59 || secs<0 || secs>59)
      throw new Error('목표 시간을 시 0~13 / 분 0~59 / 초 0~59 범위로 입력하세요.');
    const target=hours*3600+mins*60+secs;
    if (target<900) throw new Error('목표 기록은 15분 이상이어야 합니다.');
    return {...data, race:$('rp-race').value, distanceKm:distance,
      targetSeconds:target, strategy:$('rp-strategy').value,
      mode:$('rp-mode').value, startTime:$('rp-start-time').value || '08:00',
      applyToVDOT:$('rp-apply-vdot').checked};
  }
  function candidateCourse(candidate) {
    return E.calculate({distanceKm:candidate.distanceKm, targetSeconds:candidate.targetSeconds,
      strategy:candidate.strategy,mode:candidate.mode,rules:candidate.rules});
  }
  function applyData(next, message, resetPace) {
    try {
      const sanitized=E.sanitizeStored(next);
      const newCourse=candidateCourse(sanitized);
      if (resetPace) sanitized.overrides={};
      data=sanitized;
      course=newCourse;
      formFromData();
      renderRules();
      renderPlan();
      persist();
      updateVDOT();
      status(message || '계획표가 갱신되고 브라우저에 저장되었습니다.');
    } catch (err) {
      formFromData();
      status(err.message || '입력값을 확인해 주세요.', true);
    }
  }
  function renderRules() {
    const body=$('rp-rules-body');
    body.innerHTML=data.rules.map((r,i) => `<tr data-rule-index="${i}">
      <td><input aria-label="시작 거리" data-rule-field="startKm" type="number" step="0.1" min="0" max="${data.distanceKm}" value="${r.startKm}" class="rp-input rp-rule-number"></td>
      <td><input aria-label="끝 거리" data-rule-field="endKm" type="number" step="0.1" min="0.1" max="${data.distanceKm}" value="${r.endKm}" class="rp-input rp-rule-number"></td>
      <td><input aria-label="페이스 보정 초/km" data-rule-field="secPerKm" type="number" step="1" min="-120" max="120" value="${r.secPerKm}" class="rp-input rp-rule-number"></td>
      <td><input aria-label="구간 메모" data-rule-field="note" type="text" maxlength="160" value="${esc(r.note)}" class="rp-input" placeholder="오르막 · 내리막 등"></td>
      <td><button data-remove-rule="${i}" type="button" class="rp-button rp-button-ghost" aria-label="보정 구간 삭제">✕</button></td>
    </tr>`).join('');
    $('rp-no-rules').classList.toggle('hidden',data.rules.length>0);
  }
  function createAutoFuel(rowList) {
    const fuel={};
    // 실측 급수대 지도가 아닌, 사용자가 수정할 수 있는 일반적인 연료 보급 예시입니다.
    rowList.forEach(row => {
      const d=row.endKm;
      if (Number.isInteger(d) && d%5===0 && d< data.distanceKm) fuel[keyFor(d)]='물 (급수대 위치 확인)';
    });
    if (rowList[rowList.length-1].cumulative < 3600) return fuel;
    for (let second=2400;second < rowList[rowList.length-1].cumulative-600;second+=2400) {
      const row = rowList.find(r => r.cumulative >= second);
      if (!row) continue;
      const k=keyFor(row.endKm);
      fuel[k]=fuel[k] ? `에너지젤 1개 · ${fuel[k]}` : '에너지젤 1개 · 물';
    }
    return fuel;
  }
  function computeDisplayRows() {
    let cumulative=0;
    return course.kilometers.map((s,i) => {
      const key=keyFor(s.endKm);
      const rawOverride=data.overrides[key];
      const duration=(Number.isFinite(rawOverride) && rawOverride>=60) ? rawOverride : s.seconds;
      cumulative+=duration;
      const note=s.rules.map(r => `${r.startKm}~${r.endKm}km ${r.secPerKm>=0?'+':''}${r.secPerKm}초/km ${r.note}`.trim()).join(' / ');
      return {...s,key,index:i,seconds:duration,paceSeconds:duration/s.dist,cumulative,ruleHint:note,
        fueling:data.fueling[key] || '',note:data.notes[key] || ''};
    });
  }
  function renderSummary() {
    const prediction=displayRows.length ? displayRows[displayRows.length-1].cumulative : 0;
    const courseOnly=course.totalSeconds;
    const manualDiff=prediction-courseOnly;
    const isTarget=course.mode==='target';
    const items=[
      ['목표 넷타임', E.formatHMS(data.targetSeconds)],
      ['코스 적용 예상', E.formatHMS(courseOnly)],
      ['수정 후 최종 예상', E.formatHMS(prediction)],
      ['보정 합계 / 수기 차이', `${course.terrainDelta>=0?'+':''}${Math.round(course.terrainDelta)}초 / ${manualDiff>=0?'+':''}${Math.round(manualDiff)}초`]
    ];
    $('rp-summary').innerHTML=items.map(([label,value])=>`<div class="rp-summary-cell"><div class="rp-summary-label">${esc(label)}</div><div class="rp-summary-value">${esc(value)}</div></div>`).join('');
    const note = $('rp-mode').parentElement.querySelector('.rp-mode-hint');
    if (note) note.textContent = isTarget ? '다른 구간에 시간을 분산해 목표 넷타임을 유지합니다.' : '구간 보정 시간만큼 최종 예상 기록도 변합니다.';
  }
  function renderPlan() {
    displayRows=computeDisplayRows();
    renderSummary();
    $('rp-plan-body').innerHTML=displayRows.map(row => {
      const isFinish=Math.abs(row.endKm-data.distanceKm)<0.001;
      const from=Number.isInteger(row.startKm)? row.startKm:row.startKm.toFixed(3);
      const to=Number.isInteger(row.endKm)? row.endKm:row.endKm.toFixed(3);
      return `<tr data-plan-index="${row.index}" class="${isFinish?'rp-finish':''}">
        <td class="rp-distance-cell">${from}–${to}km ${isFinish?'<span class="rp-finish-label">FINISH</span>':''}</td>
        <td><input type="text" data-edit="pace" value="${E.formatPace(row.paceSeconds)}" aria-label="${to}km 페이스 수정" class="rp-input rp-pace-field"></td>
        <td class="rp-mono">${E.formatHMS(row.seconds)}</td>
        <td><input type="text" data-edit="net" value="${E.formatHMS(row.cumulative)}" aria-label="${to}km 누적 넷타임 수정" class="rp-input rp-net-field"></td>
        <td class="rp-mono">${clockAt(row.cumulative)}</td>
        <td><input type="text" data-edit="fuel" maxlength="120" value="${esc(row.fueling)}" placeholder="젤 / 물 / 이온음료" aria-label="${to}km 보급 메모" class="rp-input rp-fuel-field"></td>
        <td><input type="text" data-edit="note" maxlength="240" value="${esc(row.note)}" placeholder="${esc(row.ruleHint || '코스 전략·개인 메모')}" title="${esc(row.ruleHint)}" aria-label="${to}km 개인 메모" class="rp-input rp-note-field"></td>
      </tr>`;
    }).join('');
    document.dispatchEvent(new CustomEvent('pacecraft:plan-updated'));
  }
  function parseRuleFile(content, filename) {
    const str=String(content).replace(/^\uFEFF/,'').trim();
    let raw=[];
    if (filename.toLowerCase().endsWith('.json')) {
      const obj=JSON.parse(str);
      raw=Array.isArray(obj) ? obj : obj.rules;
    } else {
      const lines=str.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
      // CSV: startKm,endKm,secPerKm,note — 주석/헤더는 무시
      function parseLine(line) {
        const cells=[]; let value=''; let quoted=false;
        for (let i=0;i<line.length;i++) {
          const c=line[i];
          if (c==='"' && quoted && line[i+1]==='"') {value+='"';i++;}
          else if (c==='"') quoted=!quoted;
          else if (c===',' && !quoted) {cells.push(value);value='';}
          else value+=c;
        }
        cells.push(value);
        return cells;
      }
      raw=lines.filter(l=>!l.startsWith('#')).map(parseLine).filter(cols=>Number.isFinite(Number(cols[0])) && cols[0]!=='' && cols.length>=3)
        .map(cols=>({startKm:Number(cols[0]),endKm:Number(cols[1]),secPerKm:Number(cols[2]),note:cols[3] || ''}));
    }
    if (!Array.isArray(raw) || !raw.length) throw new Error('구간 데이터가 없습니다. CSV 양식을 확인해 주세요.');
    if (raw.length>200) throw new Error('코스 구간은 최대 200개까지 가져올 수 있습니다.');
    const result=E.normalizedRules(raw,data.distanceKm);
    if (result.length !== raw.length) throw new Error('코스 거리 범위 또는 ±120초/km 조건에 맞지 않는 구간이 있습니다.');
    return result;
  }
  function readFile(input, fn) {
    const file=input.files && input.files[0];
    input.value='';
    if (!file) return;
    if (file.size>1_000_000) {status('파일 크기는 1MB 이하여야 합니다.',true);return;}
    file.text().then(str=>fn(str,file.name)).catch(err=>status(`파일 읽기 실패: ${err.message}`,true));
  }
  function download(name, contents, mime) {
    const blob = new Blob([contents],{type:mime});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url;a.download=name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const csvCell = v => { let t=String(v??''); if (/^[\s]*[=+@\-]/.test(t) && !/^-?\d+(?:\.\d+)?$/.test(t.trim())) t="'"+t; return `"${t.replace(/"/g,'""')}"`; };
  const makeCSV=rows=> '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
  const safeFileName = () => `${labelFor[data.race]||'마라톤'}_${Math.round(data.distanceKm)}km_레이스계획`.replace(/[^가-힣a-zA-Z0-9_\-]/g,'_');

  const controls=['rp-race','rp-distance','rp-strategy','rp-mode','rp-start-time','rp-hours','rp-minutes','rp-seconds','rp-apply-vdot'];
  controls.forEach(id=>$(id).addEventListener('change',()=>{
    try {
      const next=takeFormData();
      const raceChanged = next.race!==data.race;
      const distanceChanged = next.distanceKm!==data.distanceKm;
      if (raceChanged || distanceChanged) {
        const hasOldRaceData = data.rules.length || Object.keys(data.overrides).length || Object.keys(data.fueling).length || Object.keys(data.notes).length;
        if (raceChanged && hasOldRaceData && !confirm('대회를 변경하면 이전 대회의 코스 보정, 수기 페이스, 보급·구간 메모를 초기화합니다. 먼저 JSON 백업을 권장합니다. 변경할까요?')) { formFromData();return; }
        next.rules=[];next.fueling={};next.notes={};next.overrides={};next.applyToVDOT=false;
        applyData(next,raceChanged?'대회 변경: 이전 대회 코스 보정과 구간 계획을 초기화했습니다. 공식 GPX는 별도로 가져와야 합니다.':'거리 변경: 이전 코스 규칙과 보급 기록을 초기화했습니다.',true);
      } else {
        applyData(next,'목표·전략·코스 설정을 반영했습니다. 수기 페이스는 새 기준에 맞춰 초기화됩니다.',true);
      }
    } catch(e) {formFromData();status(e.message,true);}
  }));
  $('rp-load-vdot').addEventListener('click',()=>{
    if (!window.PacecraftBridge) {status('VDOT 값을 가져올 수 없습니다.',true);return;}
    const goal=window.PacecraftBridge.getGoals();
    const next={...data,distanceKm:goal.distanceKm,targetSeconds:goal.targetSeconds,strategy:goal.strategy};
    if (data.distanceKm!==goal.distanceKm) {next.rules=[];next.fueling={};next.notes={};}
    applyData(next,'현재 VDOT 목표 거리·넷타임·전략을 가져왔습니다.',true);
  });
  $('rp-rebuild').addEventListener('click',()=>applyData({...data,overrides:{}},'수기 페이스·넷타임 수정값을 지우고 자동 계획을 다시 계산했습니다.',true));
  $('rp-add-rule').addEventListener('click',()=>{
    const end=Math.min(data.distanceKm,29),start=Math.max(0,end-1);
    const rule={id:`manual-${Date.now()}-${sequence++}`,startKm:start,endKm:end,secPerKm:0,note:''};
    applyData({...data,rules:[...data.rules,rule]},'새 코스 보정 구간을 추가했습니다. 아래 입력값을 수정하세요.',true);
  });
  $('rp-example-rule').addEventListener('click',()=>{
    if (data.distanceKm<29) {status('28~29km 예시는 풀코스에서만 적용됩니다.',true);return;}
    if (!confirm('28~29km +2초/km는 가상 예시이며 실제 대회 고도 자료가 아닙니다. 추가할까요?'))return;
    const rule={id:`example-${Date.now()}`,startKm:28,endKm:29,secPerKm:2,note:'설명용 예시 · 실제 코스/고도 데이터 아님'};
    applyData({...data,rules:[...data.rules,rule]},'⚠ 실제 고도 데이터가 아닌 가상 예시입니다.',true);
  });
  $('rp-clear-rules').addEventListener('click',()=>{
    if (!data.rules.length) return;
    if (confirm('코스 보정 구간을 모두 삭제하시겠습니까?')) applyData({...data,rules:[],applyToVDOT:false},'코스 보정을 모두 삭제했습니다.',true);
  });
  $('rp-rules-body').addEventListener('click',ev=>{
    const btn=ev.target.closest('[data-remove-rule]');
    if (!btn) return;
    const idx=Number(btn.dataset.removeRule);
    applyData({...data,rules:data.rules.filter((_,i)=>i!==idx)},'구간을 삭제하고 넷타임을 재계산했습니다.',true);
  });
  $('rp-rules-body').addEventListener('change',ev=>{
    const field=ev.target.dataset.ruleField;
    if (!['startKm','endKm','secPerKm','note'].includes(field)) return;
    const tr=ev.target.closest('[data-rule-index]');
    const idx=Number(tr.dataset.ruleIndex);
    const val=field==='note'? ev.target.value : Number(ev.target.value);
    const nextRules=data.rules.map((r,i)=>i===idx?{...r,[field]:val}:r);
    const cleaned=E.normalizedRules(nextRules,data.distanceKm);
    if (cleaned.length!==nextRules.length) {renderRules();status('구간은 0~레이스 거리 사이, 시작 < 끝, 보정 ±120초/km이어야 합니다.',true);return;}
    applyData({...data,rules:nextRules},'코스 구간 보정을 갱신했습니다.',true);
  });
  $('rp-plan-body').addEventListener('input',ev=>{
    const input=ev.target;
    const kind=input.dataset.edit;
    if (kind!=='fuel' && kind!=='note') return;
    const tr=input.closest('[data-plan-index]');
    const row=displayRows[Number(tr.dataset.planIndex)];
    if (!row) return;
    (kind==='fuel'?data.fueling:data.notes)[row.key]=input.value.slice(0,kind==='fuel'?120:240);
    persist();
  });
  $('rp-plan-body').addEventListener('change',ev=>{
    const input=ev.target,kind=input.dataset.edit;
    if (kind!=='pace' && kind!=='net') return;
    const tr=input.closest('[data-plan-index]');
    const idx=Number(tr.dataset.planIndex), row=displayRows[idx];
    if (!row) return;
    const parsed=kind==='pace'? E.parsePace(input.value):E.parseTime(input.value);
    const prev=idx>0?displayRows[idx-1].cumulative:0;
    const seconds=kind==='pace'?parsed*row.dist:parsed-prev;
    if (!Number.isFinite(seconds) || seconds/row.dist<100 || seconds/row.dist>1800) {
      status('페이스는 1:40~30:00/km, 넷타임은 이전 구간보다 커야 합니다. 예: 5:02 또는 2:20:00',true);
      renderPlan();return;
    }
    data.overrides[row.key]=seconds;
    persist();renderPlan();
    status(`${row.endKm}km 구간 수기 수정 반영: 이후 누적 넷타임을 다시 계산했습니다.`);
  });
  $('rp-general-memo').addEventListener('input',ev=>{
    data.generalMemo=ev.target.value.slice(0,3000);
    persist();
  });
  $('rp-auto-fuel').addEventListener('click',()=>{
    if (Object.keys(data.fueling).length && !confirm('기존 보급 기록을 자동 추천값으로 덮어쓸까요?')) return;
    data.fueling=createAutoFuel(displayRows);
    persist();renderPlan();status('약 40분 간격 보급 예시를 배치했습니다. 실제 급수대와 개인 섭취 적응을 확인하고 수정하세요.');
  });
  $('rp-save').addEventListener('click',()=>{
    persist();status('현재 계획표를 이 브라우저에 저장했습니다. 다른 기기는 JSON 백업으로 옮길 수 있습니다.');
  });
  $('rp-download-template').addEventListener('click',()=>{
    download('pacecraft_course_rules_template.csv',makeCSV([
      ['startKm','endKm','secPerKm','note'],['28','29','2','설명용 예시 · 실제 코스 데이터 아님']
    ]),'text/csv;charset=utf-8');
  });
  $('rp-import-rules').addEventListener('click',()=>$('rp-import-rules-file').click());
  $('rp-import-rules-file').addEventListener('change',()=>readFile($('rp-import-rules-file'),(text,name)=>{
    try {const rules=parseRuleFile(text,name);applyData({...data,rules},`${rules.length}개 코스 구간을 불러왔습니다.`,true);}
    catch(e) {status('구간 불러오기 실패: '+e.message,true);}
  }));
  $('rp-download-csv').addEventListener('click',()=>{
    const rows=[['대회','구간시작km','구간끝km','페이스(분:초/km)','구간시간','누적넷타임','예상통과시각','에너지젤/급수','메모','코스보정']];
    displayRows.forEach(r=>rows.push([labelFor[data.race]||data.race,r.startKm,r.endKm,E.formatPace(r.paceSeconds),E.formatHMS(r.seconds),E.formatHMS(r.cumulative),clockAt(r.cumulative),data.fueling[r.key]||'',data.notes[r.key]||'',r.ruleHint]));
    rows.push(['종합메모','','','','','','','',data.generalMemo,'']);
    download(safeFileName()+'.csv',makeCSV(rows),'text/csv;charset=utf-8');
    status('엑셀에서 열 수 있는 UTF-8 CSV 파일을 저장했습니다.');
  });
  $('rp-export-json').addEventListener('click',()=>{
    download(safeFileName()+'.json',JSON.stringify({application:'Pacecraft Runner',version:1,exportedAt:new Date().toISOString(),plan:E.sanitizeStored(data)},null,2),'application/json;charset=utf-8');
    status('개인 계획표 전체를 JSON으로 백업했습니다.');
  });
  $('rp-import-json').addEventListener('click',()=>$('rp-import-json-file').click());
  $('rp-import-json-file').addEventListener('change',()=>readFile($('rp-import-json-file'),text=>{
    try {
      const parsed=JSON.parse(text);
      const obj=parsed && parsed.plan ? parsed.plan : parsed;
      if (!obj || !Array.isArray(obj.rules) || !('distanceKm' in obj) || !('targetSeconds' in obj)) throw new Error('레이스 계획표 JSON 파일이 아닙니다.');
      applyData(E.sanitizeStored(obj),'백업한 개인 레이스 계획표를 불러왔습니다.',false);
    } catch(e) {status('계획 복원 실패: '+e.message,true);}
  }));
  $('rp-print').addEventListener('click',()=>window.print());

  formFromData();
  try {course=candidateCourse(data);} catch(e) {data=E.defaultPlan();course=candidateCourse(data);formFromData();status(e.message,true);}
  renderRules();
  renderPlan();
  // 최초 계획 생성 시에만 보급 예시 제공; 이후 사용자의 수기 기록을 보호합니다.
  if (!hadSavedData && !Object.keys(data.fueling).length) {
    data.fueling=createAutoFuel(displayRows);
    renderPlan();
  }
  persist();
  window.PacecraftRacePlanner = {getData:()=>E.sanitizeStored(data),getRows:()=>displayRows.map(r=>({...r})),applyData};
})();