/* Pacecraft PRO cockpit — vanilla JS, no backend or paid API. Data remains local unless manually shared. */
(() => {
  'use strict';
  const E=window.PacecraftCourseEngine, P=window.PacecraftRacePlanner;
  const host=document.getElementById('rp-pro-suite');
  if(!E || !P || !host) return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=E.formatHMS, pace=E.formatPace;
  const KEY='pacecraft_pro_suite_v2', PROFILE_KEY='pacecraft_pro_profiles_v2';
  const baseChecklist=['배번호·핀·칩 확인','검증된 러닝화·양말 준비','대회 코스·출발 지점 확인','에너지젤·보급 동선 확인','시계 충전·페이스 밴드 준비','교통·출발 60분 전 도착 계획','대회 당일 기상·복장 확인'];
  const defaults=()=>({version:2,activeSection:'overview',gpx:null,gpxSource:'',gpxFactor:1,
    supplies:[],checkpoints:[],actual:[],goals:{distance:'10',time:'00:50:00',weeklyKm:'',longestKm:''},
    checklist:baseChecklist.map((name,i)=>({id:'c'+i,name,done:false})),selectedKm:1});
  const num=(v,min,max)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):min;};
  const str=(v,max=180)=>String(v??'').slice(0,max);
  const safeExtras=v=>{
    const b=defaults(); if(!v||typeof v!=='object'||Array.isArray(v))return b;
    const s={...b,activeSection:['overview','gpx','nutrition','results','library','race'].includes(v.activeSection)?v.activeSection:b.activeSection,
      gpxFactor:num(v.gpxFactor,0,3),gpxSource:str(v.gpxSource,150),selectedKm:num(v.selectedKm,0,100),
      goals:{distance:['5','10','21.0975','42.195'].includes(String(v.goals?.distance))?String(v.goals.distance):'10',
        time:/^\d{1,2}:\d{2}:\d{2}$/.test(v.goals?.time)?v.goals.time:'00:50:00',
        weeklyKm:v.goals?.weeklyKm===''?'':String(num(v.goals?.weeklyKm,0,400)),
        longestKm:v.goals?.longestKm===''?'':String(num(v.goals?.longestKm,0,100))},
      supplies:Array.isArray(v.supplies)?v.supplies.slice(0,100).map(r=>({id:str(r.id,64),km:num(r.km,0,100),name:str(r.name,80),type:['젤','물','스포츠음료','기타'].includes(r.type)?r.type:'기타',carbs:num(r.carbs,0,150),caffeine:num(r.caffeine,0,500),water:num(r.water,0,1500)})):[],
      checkpoints:Array.isArray(v.checkpoints)?v.checkpoints.slice(0,90).map(r=>({id:str(r.id,64),km:num(r.km,0,100),name:str(r.name,80),source:str(r.source,100)})):[],
      actual:Array.isArray(v.actual)?v.actual.slice(0,200).map(r=>({km:num(r.km,0,100),seconds:num(r.seconds,0,100000)})):[],
      checklist:Array.isArray(v.checklist)?v.checklist.slice(0,50).map(r=>({id:str(r.id,64),name:str(r.name,120),done:r.done===true})):b.checklist};
    // GPX data is downsampled for browser storage and checked before use.
    if(v.gpx && Array.isArray(v.gpx.points)){
      const pts=v.gpx.points.slice(0,1000).map(p=>({km:Number(p.km),ele:Number(p.ele)}))
        .filter(p=>Number.isFinite(p.km)&&p.km>=0&&p.km<=300&&Number.isFinite(p.ele)&&Math.abs(p.ele)<10000);
      if(pts.length>2&&pts.every((p,i)=>!i||p.km>=pts[i-1].km))s.gpx={points:pts,lengthKm:pts[pts.length-1].km,
        ascent:num(v.gpx.ascent,0,30000),descent:num(v.gpx.descent,0,30000),trackCount:num(v.gpx.trackCount,0,300000)};
    }
    return s;
  };
  function loadStore(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch(_){return fallback;}}
  let extra=safeExtras(loadStore(KEY,null));
  let profiles=loadStore(PROFILE_KEY,[]);
  if(!Array.isArray(profiles)) profiles=[];
  profiles=profiles.slice(0,16).filter(x=>x&&typeof x==='object'&&x.base&&x.extra&&typeof x.name==='string');
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(extra));}catch(_){status('저장 공간이 부족합니다. 통합 JSON 백업을 다운로드하세요.',true);}}
  function persistProfiles(){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profiles));}catch(_){status('프로필 저장 공간 부족: 통합 JSON으로 백업해 주세요.',true);}}
  function status(msg,bad=false){const el=$('pr-status');if(!el)return;el.textContent=msg;el.classList.toggle('pr-error',bad);}
  function current(){return P.getData();}
  function rows(){return P.getRows();}
  function labelKm(n){return Number.isInteger(n)?String(n):Number(n).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');}
  function nearest(km){const rs=rows();return rs.find(r=>r.endKm>=km-1e-6)||rs[rs.length-1];}
  function at(km){if(km<=0)return 0;const rs=rows();let previous=0;for(const r of rs){if(km<=r.endKm+1e-6)return previous+Math.max(0,Math.min(1,(km-r.startKm)/r.dist))*r.seconds;previous=r.cumulative;}return previous;}
  function elapsedToClock(seconds){const parts=(current().startTime||'08:00').split(':').map(Number);const t=((parts[0]*3600+parts[1]*60+Math.round(seconds))%86400+86400)%86400;return [Math.floor(t/3600),Math.floor(t%3600/60),t%60].map(n=>String(n).padStart(2,'0')).join(':');}
  function dl(name,content,type='application/json;charset=utf-8'){
    const b=new Blob([content],{type}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const csvEsc=v=>{let t=String(v??'');if(/^\s*[=+@-]/.test(t)&&!/^\s*-?\d+(\.\d+)?\s*$/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
  const csv=records=>'\ufeff'+records.map(r=>r.map(csvEsc).join(',')).join('\r\n');
  const simpleCsv=text=>{
    const lines=String(text).replace(/^\ufeff/,'').split(/\r?\n/).filter(v=>v.trim());
    return lines.map(line=>{let out=[],cell='',q=false;for(let i=0;i<line.length;i++){
      if(line[i]==='"'&&q&&line[i+1]==='"'){cell+='"';i++;}
      else if(line[i]==='"')q=!q;
      else if(line[i]===','&&!q){out.push(cell.trim());cell='';}
      else cell+=line[i];
    }out.push(cell.trim());return out;});
  };
  const uid=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,7);
  const iconCard=(label,value,sub)=>`<div class="pr-stat"><div class="pr-stat-label">${esc(label)}</div><div class="pr-stat-value">${esc(value)}</div><div class="pr-stat-sub">${esc(sub)}</div></div>`;
  host.innerHTML=`
    <section class="pr-hero">
      <button type="button" id="pc-open-gear" class="pr-hero-gear">⚡ 보급 준비하기<span>에너지젤 · 러닝용품 ↗</span></button><div class="pr-hero-top"><span class="pr-pill">PACECRAFT · PRO STUDIO</span><span class="pr-pill pr-pill-sub">2026 · 맞춤형 레이스 전략</span></div>
      <h3>완주 목표를 <em>실행 가능한 전략</em>으로.</h3>
      <p>코스 고도부터 A/B/C 시나리오, 젤·급수, 실제 기록 분석과 계획 저장까지 한 곳에서.</p>
      <div id="pr-hero-stats" class="pr-stat-grid"></div>
    </section>
    <section class="pr-shell">
      <div class="pr-head"><div><h3>전략 스튜디오</h3><p>각 도구는 위의 레이스 계획표와 자동 연결됩니다.</p></div>
        <span class="pr-local-badge">🔐 기기 내 저장</span></div>
      <div id="pr-tabs" class="pr-tabs" role="tablist" aria-label="전략 도구 선택">
        <button type="button" data-pr-tab="overview">📊 전략·그래프</button>
        <button type="button" data-pr-tab="gpx">⛰️ GPX 코스</button>
        <button type="button" data-pr-tab="nutrition">⚡ 보급 설계</button>
        <button type="button" data-pr-tab="results">📈 기록·목표</button>
        <button type="button" data-pr-tab="library">💾 계획 보관함</button>
        <button type="button" data-pr-tab="race">🏁 대회 당일</button>
      </div>
      <div id="pr-status" class="pr-status" role="status" aria-live="polite">레이스 전략 스튜디오가 준비되었습니다.</div>
      <div data-pr-section="overview" class="pr-section">
        <div class="pr-section-title"><h4>목표 페이스 시뮬레이션</h4><span>실제 경사도 측정값 아님</span></div><div id="pc-chart-explain" class="pr-chart-explain"></div><div class="pr-chart-controls"><button type="button" id="pc-flat" class="rp-button rp-button-outline">⚖️ 평탄 코스 기준으로 초기화</button></div>
        <div id="pr-chart" class="pr-chart" role="img" aria-label="거리별 목표 페이스 선그래프"></div>
        <div class="pr-range-line"><label for="pr-chart-km">구간 살펴보기</label><input id="pr-chart-km" type="range" min="1" step="1" value="28"><strong id="pr-chart-detail"></strong></div>
        <div class="pr-section-title"><h4>A / B / C 레이스 전략</h4><span>수치가 아닌 실현 확률은 표시하지 않습니다</span></div>
        <div id="pr-scenarios" class="pr-variants"></div>
        <div class="pr-tip">A는 현재 예상 페이스, B와 C는 시간을 늘린 대비 시나리오입니다. 선택 시 기존 코스 규칙과 보급 메모를 유지하면서 목표기록만 변경합니다.</div>
        <div class="pr-section-title"><h4>자동 레이스 전략 점검</h4><span>현재 계획을 계산 규칙으로 분석</span></div>
        <div id="pr-insights" class="pr-insights" aria-live="polite"></div>
        <div class="pr-section-title"><h4>계측·급수 체크포인트</h4><span>실제 위치는 대회 공식 공지로 확인</span></div>
        <div class="pr-inline"><label>지점(km)<input id="pr-check-km" type="number" min="0.1" max="42.195" step="0.1" class="rp-input" placeholder="21.0975"></label><label>이름<input id="pr-check-name" class="rp-input" maxlength="80" placeholder="하프 계측 / 급수대"></label><button type="button" id="pr-add-check" class="rp-button rp-button-primary">+ 체크포인트</button><button type="button" id="pr-auto-check" class="rp-button rp-button-outline">기본 5km 지점 만들기</button></div>
        <div id="pr-checks" class="pr-scroll"></div>
      </div>
      <div data-pr-section="gpx" class="pr-section" hidden>
        <div class="pr-section-title"><h4>전국 주요 풀코스 대회 선택</h4><span>공식 홈페이지·코스 출처 안내</span></div><p class="pr-desc">공식 코스맵과 GPX 출처를 확인하세요. 실제 고도 보정은 GPX를 직접 불러와야만 적용됩니다.</p><div class="pr-race-grid" id="pc-races"><p>대회 목록을 불러오는 중…</p></div><div class="pr-section-title"><h4>GPX 고도 분석</h4><span>파일을 직접 가져와 주세요</span></div>
        <p class="pr-desc">GPX 파일의 위치·고도 트랙을 브라우저에서 읽습니다. 분석 거리와 선택 종목이 유사할 때만 보정값을 자동 생성할 수 있습니다.</p>
        <div class="pr-actions"><label class="rp-button rp-button-primary" for="pr-gpx-file">📁 GPX 파일 가져오기</label><input id="pr-gpx-file" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" hidden><button id="pr-gpx-clear" type="button" class="rp-button rp-button-ghost">GPX 분석 삭제</button></div>
        <div id="pr-gpx-stats" class="pr-stat-grid pr-stat-grid-small"></div>
        <div id="pr-gpx-chart" class="pr-chart pr-chart-low"></div>
        <div class="pr-inline"><label>지형 보정 강도 <strong id="pr-gpx-factor-label">1.0×</strong><input id="pr-gpx-factor" type="range" min="0" max="2" step="0.1" value="1"></label><button id="pr-gpx-apply" type="button" class="rp-button rp-button-primary">분석 고도를 코스 보정에 적용</button><button id="pr-gpx-export" type="button" class="rp-button rp-button-outline">추정 구간 CSV</button></div>
        <p class="pr-tip">고도와 경사도는 GPS 오차·고도 센서 품질의 영향을 받습니다. 보정은 검증된 페이스 예측값이 아니라 **조절 가능한 휴리스틱 추정치**입니다. 공식 코스나 기록 예측을 보증하지 않습니다.</p>
      </div>
      <div data-pr-section="nutrition" class="pr-section" hidden>
        <div class="pr-section-title"><h4>에너지젤 · 급수 전략</h4><span>탄수화물·카페인·물 섭취량 집계</span></div>
        <div class="pr-inline"><label>보급 지점(km)<input id="pr-supply-km" type="number" min="0" step="0.5" class="rp-input" placeholder="10"></label><label>종류<select id="pr-supply-type" class="rp-input"><option>젤</option><option>물</option><option>스포츠음료</option><option>기타</option></select></label><label>제품/메모<input id="pr-supply-name" class="rp-input" maxlength="80" placeholder="훈련 때 사용한 젤"></label><label>탄수화물(g)<input id="pr-supply-carbs" type="number" min="0" max="150" value="25" class="rp-input"></label><label>카페인(mg)<input id="pr-supply-caffeine" type="number" min="0" max="500" value="0" class="rp-input"></label><label>물(ml)<input id="pr-supply-water" type="number" min="0" max="1500" value="0" class="rp-input"></label><button id="pr-add-supply" type="button" class="rp-button rp-button-primary">+ 보급 추가</button></div>
        <div id="pr-nutrition-stats" class="pr-stat-grid pr-stat-grid-small"></div>
        <div id="pr-supplies" class="pr-scroll"></div><button id="pc-nutrition-gear" class="pr-gear-banner" type="button"><span>⚡</span><span><strong>보급용품 · 에너지젤 · 러닝용품 구매</strong><small>추천 레이스 기어와 네이버쇼핑·쿠팡 링크 바로가기</small></span><span>쇼핑 이동 ↗</span></button>
        <div class="pr-actions"><button id="pr-supply-auto" type="button" class="rp-button rp-button-outline">40분 간격 입력 예시 생성</button><button id="pr-supply-to-plan" type="button" class="rp-button rp-button-primary">보급 계획을 1km 표에 반영</button><button id="pr-supply-csv" type="button" class="rp-button rp-button-outline">보급 CSV 다운로드</button></div>
        <p class="pr-tip">40분 간격은 기능 예시이며 개인별 영양 처방이 아닙니다. 탄수화물·카페인·수분 섭취량은 본인이 확인한 제품 함량을 직접 입력하고, 훈련 중 안전성과 위장 적응을 확인하세요. 공식 급수대 위치는 자동 검증하지 않습니다.</p>
      </div>
      <div data-pr-section="results" class="pr-section" hidden>
        <div class="pr-section-title"><h4>실제 기록 vs 계획</h4><span>거리, 누적 넷타임 CSV 또는 수기 입력</span></div>
        <div class="pr-inline"><label>통과 거리(km)<input id="pr-actual-km" type="number" min="0.1" step="0.1" class="rp-input" placeholder="10"></label><label>실제 누적 넷타임<input id="pr-actual-time" class="rp-input" placeholder="00:50:30"></label><button id="pr-actual-add" type="button" class="rp-button rp-button-primary">+ 통과 기록</button><label class="rp-button rp-button-outline" for="pr-actual-file">CSV 기록 가져오기</label><input type="file" id="pr-actual-file" accept=".csv,text/csv" hidden><button id="pr-actual-clear" type="button" class="rp-button rp-button-ghost">기록 지우기</button></div>
        <div id="pr-actual-summary" class="pr-stat-grid pr-stat-grid-small"></div>
        <div id="pr-actual" class="pr-scroll"></div>
        <div class="pr-section-title"><h4>최근 경기 기록으로 목표 검토</h4><span>Riegel 1.06 지수 활용한 간이 계산</span></div>
        <div class="pr-inline"><label>최근 기록 거리<select id="pr-goal-distance" class="rp-input"><option value="5">5km</option><option value="10">10km</option><option value="21.0975">하프</option><option value="42.195">풀코스</option></select></label><label>최근 완주 넷타임<input id="pr-goal-time" class="rp-input" placeholder="00:50:00"></label><label>최근 주간 훈련거리(km)<input id="pr-goal-weekly" type="number" min="0" max="400" class="rp-input" placeholder="선택"></label><label>최장 훈련거리(km)<input id="pr-goal-longest" type="number" min="0" max="100" class="rp-input" placeholder="선택"></label><button id="pr-goal-calc" type="button" class="rp-button rp-button-primary">목표 검토하기</button></div>
        <div id="pr-goal-output"></div>
        <p class="pr-tip">Riegel 예측은 동일한 준비 상태를 전제하는 통계적 근사식이며 개인의 완주 성공 확률이 아닙니다. 특히 마라톤은 장거리 훈련·기온·코스·경험에 따라 크게 달라질 수 있습니다.</p>
      </div>
      <div data-pr-section="library" class="pr-section" hidden>
        <div class="pr-section-title"><h4>내 레이스 계획 보관함</h4><span>최대 16개 프로필을 브라우저에 저장</span></div>
        <div class="pr-inline"><label>저장 이름<input id="pr-profile-name" class="rp-input" maxlength="60" placeholder="예: 2027 춘천 A안"></label><button id="pr-profile-save" type="button" class="rp-button rp-button-primary">+ 현재 계획 저장</button></div>
        <div id="pr-profiles" class="pr-cards"></div>
        <div class="pr-section-title"><h4>계획 공유 · 통합 백업</h4><span>개인 메모는 공유 링크에서 제외</span></div>
        <div class="pr-actions"><button id="pr-share-link" type="button" class="rp-button rp-button-primary">🔗 목표·코스 공유 링크 복사</button><button id="pr-share-text" type="button" class="rp-button rp-button-outline">📋 레이스 요약 복사</button><button id="pr-export-all" type="button" class="rp-button rp-button-outline">⬇ 통합 백업 JSON</button><label class="rp-button rp-button-outline" for="pr-import-all-file">⬆ 통합 백업 복원</label><input id="pr-import-all-file" type="file" accept=".json,application/json" hidden></div>
        <p class="pr-tip">프로필·보급·실제 기록은 현재 브라우저에만 저장됩니다. 기기 간 동기화는 지원하지 않으며, URL 공유에는 대회·기록·구간 보정값만 넣고 개인 메모는 제외합니다.</p>
      </div>
      <div data-pr-section="race" class="pr-section" hidden>
        <div class="pr-section-title"><h4>대회 당일 빠른 보기</h4><span>시계를 보며 확인하기 쉬운 큰 숫자</span></div>
        <div class="pr-day-card"><div id="pr-race-title" class="pr-day-title">RACE DAY</div><div id="pr-race-km" class="pr-day-km">0 km</div><div class="pr-day-fields"><div><small>구간 목표 페이스</small><strong id="pr-race-pace">--:--</strong></div><div><small>예상 누적 넷타임</small><strong id="pr-race-net">--:--:--</strong></div><div><small>예상 시각</small><strong id="pr-race-clock">--:--:--</strong></div></div><p id="pr-race-fuel"></p></div>
        <label class="pr-range-line" for="pr-race-slider">거리 선택 <input id="pr-race-slider" type="range" min="1" step="1" value="1"></label>
        <div class="pr-actions"><button id="pr-race-prev" type="button" class="rp-button rp-button-outline">← 이전 1km</button><button id="pr-race-next" type="button" class="rp-button rp-button-primary">다음 1km →</button><button id="pr-race-full" type="button" class="rp-button rp-button-outline">전체 화면</button><button id="pr-image-export" type="button" class="rp-button rp-button-outline">요약 카드 PNG</button></div>
        <div class="pr-section-title"><h4>레이스 준비물 확인</h4><span>나만의 체크리스트 저장</span></div>
        <div id="pr-checklist"></div><div class="pr-inline"><input id="pr-checklist-input" class="rp-input" maxlength="120" placeholder="준비물 추가"><button id="pr-checklist-add" type="button" class="rp-button rp-button-outline">+ 추가</button></div>
        <p class="pr-tip">GPS·실시간 위치 추적 모드는 아닙니다. 화면에서 직접 km를 선택해 확인하는 오프라인 데이터 참조용 화면이며, 최초 접속에는 네트워크가 필요할 수 있습니다.</p>
      </div>
    </section>`;

  function tab(name){if(!['overview','gpx','nutrition','results','library','race'].includes(name))return;
    extra.activeSection=name;persist();
    host.querySelectorAll('[data-pr-tab]').forEach(b=>{const on=b.dataset.prTab===name;b.classList.toggle('pr-active',on);b.setAttribute('aria-selected',String(on));});
    host.querySelectorAll('[data-pr-section]').forEach(el=>el.hidden=el.dataset.prSection!==name);
    if(name==='overview')renderChart();
  }
  function renderHero(){const d=current(),r=rows(),last=r[r.length-1],seconds=last?.cumulative||d.targetSeconds;
    $('pr-hero-stats').innerHTML=iconCard('코스 적용 예상',fmt(seconds),'수동 수정 포함')+iconCard('평균 목표 페이스',pace(seconds/d.distanceKm)+'/km','현재 예상 평균')+iconCard('보정 구간',d.rules.length+'개','수동 + GPX 지원')+iconCard('완주 거리',d.distanceKm+' km','10K · 하프 · 풀코스');
  }
  function graphSVG({points,yKey='pace',minLabel='',maxLabel='',selected=0,secondary=null,height=225}){
    if(!points.length)return '<div class="pr-empty">표시할 데이터가 없습니다.</div>';
    const w=760,h=height,left=46,right=16,top=20,bottom=33,usableX=w-left-right,usableY=h-top-bottom;
    const xs=points.map(p=>p.km),ys=points.map(p=>Number(p[yKey]));
    const x0=Math.min(...xs),x1=Math.max(...xs);const mn=Math.min(...ys),mx=Math.max(...ys),range=Math.max(1,(mx-mn)*1.35),mid=(mx+mn)/2;
    const ymin=mid-range/2,ymax=mid+range/2;
    const x=d=>left+(d-x0)/(x1-x0||1)*usableX, y=v=>top+(ymax-v)/(ymax-ymin)*usableY;
    const path=points.map((p,i)=>(i?'L':'M')+x(p.km).toFixed(1)+' '+y(p[yKey]).toFixed(1)).join(' ');
    let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`;
    for(let i=0;i<=4;i++){const yy=top+usableY*i/4;s+=`<line x1="${left}" y1="${yy}" x2="${w-right}" y2="${yy}" stroke="currentColor" opacity=".09"/><text x="${left-7}" y="${yy+4}" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">${esc(yKey==='pace'?pace(ymax-(ymax-ymin)*i/4):Math.round(ymax-(ymax-ymin)*i/4))}</text>`;}
    for(let i=0;i<=4;i++){const xx=left+usableX*i/4;s+=`<text x="${xx}" y="${h-8}" text-anchor="middle" font-size="11" fill="currentColor" opacity=".65">${(x0+(x1-x0)*i/4).toFixed(1)} km</text>`;}
    if(secondary?.length){const ss=secondary.map(p=>p.ele),low=Math.min(...ss),high=Math.max(...ss),dr=Math.max(1,high-low);
      const secondaryPath=secondary.map((p,i)=>(i?'L':'M')+x(p.km).toFixed(1)+' '+(top+(high-p.ele)/dr*usableY).toFixed(1)).join(' ');
      s+=`<path d="${secondaryPath}" fill="none" stroke="#a78bfa" stroke-width="1.8" opacity=".72"/>`;
    }
    s+=`<path d="${path}" fill="none" stroke="#10b981" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    const sel=points.reduce((a,b)=>Math.abs(b.km-selected)<Math.abs(a.km-selected)?b:a,points[0]);
    if(selected){s+=`<line x1="${x(sel.km)}" y1="${top}" x2="${x(sel.km)}" y2="${h-bottom}" stroke="#f59e0b" stroke-dasharray="5 4" stroke-width="2"/><circle cx="${x(sel.km)}" cy="${y(sel[yKey])}" r="5" fill="#10b981" stroke="white" stroke-width="2"/>`;}
    return s+'</svg>';
  }
  function renderChart(){const r=rows(),distance=current().distanceKm;extra.selectedKm=num(extra.selectedKm,1,Math.ceil(distance));
    $('pr-chart-km').max=String(Math.ceil(distance));$('pr-chart-km').value=String(Math.round(extra.selectedKm));
    $('pr-chart').innerHTML=graphSVG({points:r.map(p=>({km:p.endKm,pace:p.paceSeconds})),selected:extra.selectedKm,
      secondary:extra.gpx?.points});
    const chosen=nearest(extra.selectedKm);
    $('pr-chart-detail').textContent=`${chosen.endKm.toFixed(1)}km · ${pace(chosen.paceSeconds)}/km · ${fmt(chosen.cumulative)}`;
  }
  function renderScenarios(){const d=current(),total=rows().at(-1)?.cumulative||d.targetSeconds;
    const items=[{name:'A · 현재 전략',factor:1,desc:'기본 전략'},{name:'B · 안정 완주',factor:1.03,desc:'+3% 여유'},{name:'C · 대안 계획',factor:1.06,desc:'+6% 여유'}];
    $('pr-scenarios').innerHTML=items.map(item=>`<article class="pr-variant"><div class="pr-variant-header">${item.name}</div><strong>${fmt(total*item.factor)}</strong><small>${item.desc} · ${pace(total*item.factor/d.distanceKm)}/km</small><button data-scenario="${item.factor}" class="rp-button rp-button-outline" type="button">이 기록을 목표로 설정</button></article>`).join('');
  }
  function renderInsights(){const d=current(),r=rows(),secs=r.map(x=>x.paceSeconds),max=Math.max(...secs),min=Math.min(...secs),avg=r.at(-1).cumulative/d.distanceKm;
    const warnings=[];
    if(max-min>avg*.17) warnings.push('현재 페이스의 구간별 편차가 큽니다. 의도한 오르막·내리막 보정인지 확인하세요.');
    if(d.rules.length)warnings.push(`코스 구간 보정 ${d.rules.length}개가 적용되었습니다. 보정 원본과 대회 코스 연도를 대조하세요.`);
    if(!extra.checkpoints.length)warnings.push('급수대·계측 지점을 추가하면 예상 통과시각까지 확인할 수 있습니다.');
    if(!extra.supplies.length)warnings.push('보급 계획을 등록하면 탄수화물·카페인·물 총량을 자동 합산합니다.');
    if(extra.gpx&&!gpxMatching())warnings.push('GPX 트랙과 목표 종목 거리 차이가 3%를 넘습니다. 해당 GPX의 코스를 확인하세요.');
    if(!extra.actual.length)warnings.push('대회 종료 후 실제 누적 넷타임을 입력하면 구간별 계획 오차를 비교할 수 있습니다.');
    if(!warnings.length)warnings.push('주요 입력이 갖춰져 있습니다. 대회 공식 공지와 훈련 중 시험한 전략을 마지막으로 확인하세요.');
    $('pr-insights').innerHTML=warnings.map((x,i)=>`<div class="pr-insight"><span>${i+1}</span><p>${esc(x)}</p></div>`).join('');
  }
  function renderChecks(){const ordered=extra.checkpoints.filter(p=>p.km>0&&p.km<=current().distanceKm+1e-6).sort((a,b)=>a.km-b.km);
    $('pr-checks').innerHTML=ordered.length?`<table class="pr-table"><thead><tr><th>지점</th><th>구분</th><th>예상 넷타임</th><th>예상 통과시각</th><th>삭제</th></tr></thead><tbody>`+ordered.map(c=>`<tr><td>${c.km.toFixed(2)}km</td><td>${esc(c.name)}<small>${esc(c.source)}</small></td><td>${fmt(at(c.km))}</td><td>${elapsedToClock(at(c.km))}</td><td><button class="pr-delete" type="button" data-del-check="${esc(c.id)}">삭제</button></td></tr>`).join('')+`</tbody></table>`:'<p class="pr-empty">체크포인트가 없습니다. 5km 지점을 생성하거나 직접 등록하세요.</p>';
    $('pr-check-km').max=String(current().distanceKm);
  }
  const hav=(a,b)=>{const rad=Math.PI/180,p1=a.lat*rad,p2=b.lat*rad,dl=(b.lat-a.lat)*rad,lo=(b.lon-a.lon)*rad,
    h=Math.sin(dl/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(lo/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(h)));};
  function parseGPX(text){const dom=new DOMParser().parseFromString(text,'application/xml');
    if(dom.querySelector('parsererror'))throw new Error('GPX XML 형식이 올바르지 않습니다.');
    const nodes=Array.from(dom.getElementsByTagName('*')).filter(el=>['trkpt','rtept'].includes(el.localName));
    if(nodes.length<4)throw new Error('좌표가 최소 4개 이상 포함된 GPX 트랙이 필요합니다.');
    if(nodes.length>250000)throw new Error('트랙 좌표 수가 너무 많습니다 (25만 개 초과).');
    let raw=[],total=0,ascent=0,descent=0,last=null;
    for(const node of nodes){const lat=Number(node.getAttribute('lat')),lon=Number(node.getAttribute('lon'));
      const eleNode=Array.from(node.children).find(ch=>ch.localName==='ele');const elevation=eleNode?Number(eleNode.textContent):NaN;
      if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(elevation))continue;
      const cur={lat,lon,ele:elevation}; if(last){const step=hav(last,cur);if(step>0.5){last=cur;continue;}total+=step;
        // Filter sub-2m altimetric noise to avoid inflating gain/loss.
        const d=elevation-last.ele;if(d>2)ascent+=d;else if(d< -2)descent+=-d;}
      raw.push({km:total,ele:elevation});last=cur;
    }
    if(raw.length<4||total<0.1)throw new Error('유효한 GPS 거리 또는 고도 정보가 부족합니다.');
    const stride=Math.max(1,Math.ceil(raw.length/880)),sampled=raw.filter((_,i)=>i%stride===0);
    if(sampled.at(-1)?.km!==raw.at(-1).km)sampled.push(raw.at(-1));
    return {points:sampled.map(p=>({km:Math.round(p.km*10000)/10000,ele:p.ele})),lengthKm:total,ascent,descent,trackCount:nodes.length};
  }
  function eleAt(km){const arr=extra.gpx?.points;if(!arr?.length)return null;
    if(km<=0)return arr[0].ele;if(km>=arr.at(-1).km)return arr.at(-1).ele;
    let lo=0,hi=arr.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(arr[m].km<km)lo=m;else hi=m;}
    const a=arr[lo],b=arr[hi],t=(km-a.km)/Math.max(1e-8,b.km-a.km);return a.ele+(b.ele-a.ele)*t;
  }
  function generatedRules(){if(!extra.gpx)return [];
    const len=current().distanceKm,step=.5,ret=[];
    for(let begin=0;begin<len-1e-6;begin+=step){const end=Math.min(len,begin+step);
      const e0=eleAt(Math.max(0,begin-.12)),e1=eleAt(Math.min(len,end+.12));
      const grade=(e1-e0)/(Math.min(len,end+.12)-Math.max(0,begin-.12))/10; // m per km / 10 => percent
      let delta=grade>=0?grade*7:grade*2.8;
      delta=Math.round(num(delta*extra.gpxFactor,-25,60));
      if(Math.abs(delta)<1)continue;
      ret.push({startKm:Math.round(begin*1000)/1000,endKm:Math.round(end*1000)/1000,secPerKm:delta,
        note:`GPX 고도 추정 ${grade>=0?'+':''}${grade.toFixed(1)}% · 공식 보정값 아님`});
    }
    return ret;
  }
  function gpxMatching(){const g=extra.gpx;return !!(g && Math.abs(g.lengthKm-current().distanceKm)/current().distanceKm<=.03);}
  function renderGPX(){const g=extra.gpx; $('pr-gpx-factor').value=String(extra.gpxFactor);$('pr-gpx-factor-label').textContent=extra.gpxFactor.toFixed(1)+'×';
    if(!g){$('pr-gpx-stats').innerHTML=iconCard('GPX 분석','아직 없음','파일을 선택하세요');$('pr-gpx-chart').innerHTML='<div class="pr-empty">고도 프로필이 여기에 표시됩니다.</div>';}
    else{$('pr-gpx-stats').innerHTML=iconCard('GPS 트랙 거리',g.lengthKm.toFixed(2)+' km',extra.gpxSource)+iconCard('상승 누적',Math.round(g.ascent)+' m','고도 2m 이상 변화 합계')+iconCard('하강 누적',Math.round(g.descent)+' m','측정 오차 가능')+iconCard('코스 거리 일치',gpxMatching()?'±3% 이내':'불일치','목표: '+current().distanceKm+'km');
      $('pr-gpx-chart').innerHTML=graphSVG({points:g.points.map(p=>({km:p.km,ele:p.ele})),yKey:'ele',height:180});}
    $('pr-gpx-apply').disabled=!gpxMatching();$('pr-gpx-export').disabled=!gpxMatching();
  }
  function renderSupplies(){const totalHours=Math.max(.01,(rows().at(-1)?.cumulative||3600)/3600);const supplies=extra.supplies.filter(s=>s.km<=current().distanceKm);
    const carb=supplies.reduce((a,s)=>a+s.carbs,0),caffeine=supplies.reduce((a,s)=>a+s.caffeine,0),water=supplies.reduce((a,s)=>a+s.water,0);
    $('pr-nutrition-stats').innerHTML=iconCard('보급 횟수',supplies.length+'회','직접 등록')+iconCard('탄수화물 합계',carb+'g',(carb/totalHours).toFixed(1)+'g/h')+iconCard('카페인 합계',caffeine+'mg','제품 함량 직접 입력')+iconCard('물 합계',water+'ml',(water/totalHours).toFixed(0)+'ml/h');
    $('pr-supplies').innerHTML=supplies.length?`<table class="pr-table"><thead><tr><th>거리</th><th>보급</th><th>예상 시각</th><th>탄수 / 카페인 / 물</th><th>삭제</th></tr></thead><tbody>`+supplies.slice().sort((a,b)=>a.km-b.km).map(s=>`<tr><td>${s.km}km</td><td>${esc(s.type)} · ${esc(s.name)}</td><td>${fmt(at(s.km))}</td><td>${s.carbs}g / ${s.caffeine}mg / ${s.water}ml</td><td><button class="pr-delete" data-del-supply="${esc(s.id)}">삭제</button></td></tr>`).join('')+`</tbody></table>`:'<p class="pr-empty">현재 등록된 보급품이 없습니다.</p>';
    $('pr-supply-km').max=String(current().distanceKm);
  }
  function renderActual(){const arr=extra.actual.slice().sort((a,b)=>a.km-b.km),last=arr.at(-1),delta=last?last.seconds-at(last.km):0;
    $('pr-actual-summary').innerHTML=iconCard('비교 지점',arr.length+'개','직접 입력·CSV')+iconCard('마지막 기록',last?fmt(last.seconds):'—',last?last.km+'km':'미입력')+iconCard('계획 대비',last?(delta>=0?'+':'−')+fmt(Math.abs(delta)):'—',delta>0?'예정보다 늦음':delta<0?'예정보다 빠름':'계획과 동일');
    $('pr-actual').innerHTML=arr.length?`<table class="pr-table"><thead><tr><th>거리</th><th>계획 누적</th><th>실제 누적</th><th>차이</th><th>삭제</th></tr></thead><tbody>`+arr.map(a=>{const d=a.seconds-at(a.km);return `<tr><td>${a.km}km</td><td>${fmt(at(a.km))}</td><td>${fmt(a.seconds)}</td><td class="${d>0?'pr-late':'pr-fast'}">${d>=0?'+':'−'}${fmt(Math.abs(d))}</td><td><button class="pr-delete" data-del-actual="${a.km}">삭제</button></td></tr>`;}).join('')+`</tbody></table>`:'<p class="pr-empty">기록이 없습니다. km와 실제 누적 넷타임을 입력하세요.</p>';
    $('pr-actual-km').max=String(current().distanceKm);
  }
  function renderGoal(){const g=extra.goals;$('pr-goal-distance').value=g.distance;$('pr-goal-time').value=g.time;$('pr-goal-weekly').value=g.weeklyKm;$('pr-goal-longest').value=g.longestKm;}
  function calculateGoal(){const g=extra.goals,sec=E.parseTime(g.time),dist=Number(g.distance),targetDist=current().distanceKm;
    if(!(sec>0&&sec<=60000)){status('최근 기록 형식은 00:50:00 처럼 입력해 주세요.',true);return;}
    const forecast=sec*Math.pow(targetDist/dist,1.06),goal=current().targetSeconds,diff=forecast-goal;
    const notes=[];
    if(g.weeklyKm!=='')notes.push(`입력 주간 거리 ${g.weeklyKm}km`);
    if(g.longestKm!=='')notes.push(`입력 최장 훈련 ${g.longestKm}km`);
    if(targetDist>dist*1.7)notes.push('최근 경기보다 목표 거리가 길어 오차가 커질 수 있습니다');
    $('pr-goal-output').innerHTML=`<div class="pr-goal-box"><span>Riegel 공식 기반 간이 예상</span><strong>${fmt(forecast)}</strong><p>현재 목표 ${fmt(goal)} · 간이 예상과의 차이 ${diff>=0?'+':'−'}${fmt(Math.abs(diff))}</p><small>${esc(notes.join(' · ')||'훈련 정보는 아직 입력하지 않았습니다.')} · 검증된 달성확률 아님</small></div>`;
  }
  function renderProfiles(){$('pr-profiles').innerHTML=profiles.length?profiles.map((p,i)=>`<div class="pr-profile"><div><strong>${esc(p.name)}</strong><small>${esc(p.savedAt||'')} · ${esc(String(p.base?.distanceKm||''))}km · ${fmt(Number(p.base?.targetSeconds)||0)}</small></div><div class="pr-actions"><button data-load-profile="${i}" class="rp-button rp-button-outline">불러오기</button><button data-delete-profile="${i}" class="rp-button rp-button-ghost">삭제</button></div></div>`).join(''):'<p class="pr-empty">저장한 계획이 없습니다. 현재 계획에 이름을 붙여 저장하세요.</p>';}
  function renderRace(){const r=rows();let i=Math.min(r.length-1,Math.max(0,Math.round(extra.selectedKm)-1)),s=r[i];if(!s)return;
    $('pr-race-title').textContent='PACECRAFT · '+current().race.toUpperCase();$('pr-race-km').textContent=labelKm(s.endKm)+' km';
    $('pr-race-pace').textContent=pace(s.paceSeconds)+'/km';$('pr-race-net').textContent=fmt(s.cumulative);$('pr-race-clock').textContent=elapsedToClock(s.cumulative);
    const supply=extra.supplies.filter(x=>x.km>=s.startKm-1e-6&&x.km<=s.endKm+1e-6);
    $('pr-race-fuel').textContent=supply.length?'보급 예정: '+supply.map(x=>x.type+' · '+x.name).join(' / '):'보급 예정 없음 · 실제 공식 급수대 위치 확인';
    $('pr-race-slider').max=String(r.length);$('pr-race-slider').value=String(i+1);
  }
  function renderChecklist(){$('pr-checklist').innerHTML=extra.checklist.map(c=>`<div class="pr-task"><label><input type="checkbox" data-check-task="${esc(c.id)}" ${c.done?'checked':''}><span class="${c.done?'pr-done':''}">${esc(c.name)}</span></label><button type="button" data-delete-task="${esc(c.id)}" class="pr-delete">삭제</button></div>`).join('');}
  function renderAll(){renderHero();renderChart();renderScenarios();renderInsights();renderChecks();renderGPX();renderSupplies();renderActual();renderGoal();renderProfiles();renderRace();renderChecklist();}
  const readFile=async(input,limit)=>{const f=input.files?.[0];input.value='';if(!f)return null;if(f.size>limit)throw new Error('파일 크기가 허용 범위를 초과했습니다.');return {name:f.name,text:await f.text()};};
  async function copy(str){if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(str);return;}
    const el=document.createElement('textarea');el.value=str;el.style.position='fixed';el.style.opacity='0';document.body.append(el);el.select();const ok=document.execCommand('copy');el.remove();if(!ok)throw new Error('클립보드 복사 실패');}
  function validActual(arr){if(arr.some(x=>!(x.km>0&&x.km<=current().distanceKm+1e-6&&x.seconds>0)))throw new Error('거리 또는 누적 시간이 범위를 벗어납니다.');
    let oldKm=0,oldSec=0;for(const r of arr.slice().sort((a,b)=>a.km-b.km)){if(r.km<=oldKm||r.seconds<=oldSec)throw new Error('통과 거리는 중복 없이 증가하고, 누적시간도 증가해야 합니다.');oldKm=r.km;oldSec=r.seconds;}}
  function on(id,event,fn){$(id).addEventListener(event,fn);}
  host.addEventListener('click',async ev=>{
    const b=ev.target.closest('button');if(!b)return;
    try{
      if(b.dataset.prTab){tab(b.dataset.prTab);return;}
      if(b.dataset.scenario){const factor=Number(b.dataset.scenario),base=current();const s=rows().at(-1).cumulative;
        if(!confirm(`${fmt(s*factor)}를 새로운 예상 완주 기록으로 설정할까요? 수동 페이스 입력은 초기화되지만 코스 구간·보급 메모는 유지됩니다.`))return;
        const terrain=E.calculate({distanceKm:base.distanceKm,targetSeconds:base.targetSeconds,strategy:base.strategy,mode:base.mode,rules:base.rules}).terrainDelta;
        const target=Math.round(s*factor)-(base.mode==='add'?terrain:0);
        P.applyData({...base,targetSeconds:target},'A/B/C 목표를 반영했습니다.',true);status('새 목표 기록을 반영했습니다.');return;}
      if(b.dataset.delCheck){extra.checkpoints=extra.checkpoints.filter(x=>x.id!==b.dataset.delCheck);persist();renderChecks();return;}
      if(b.dataset.delSupply){extra.supplies=extra.supplies.filter(x=>x.id!==b.dataset.delSupply);persist();renderSupplies();renderRace();return;}
      if(b.dataset.delActual){extra.actual=extra.actual.filter(x=>String(x.km)!==b.dataset.delActual);persist();renderActual();return;}
      if(b.dataset.checkTask)return;
      if(b.dataset.deleteTask){extra.checklist=extra.checklist.filter(x=>x.id!==b.dataset.deleteTask);persist();renderChecklist();return;}
      if(b.dataset.loadProfile!==undefined){const p=profiles[Number(b.dataset.loadProfile)];if(!p||!confirm(`'${p.name}' 계획을 불러오면 현재 편집 중인 계획이 교체됩니다. 계속할까요?`))return;
        extra=safeExtras(p.extra);persist();P.applyData(E.sanitizeStored(p.base),'저장된 레이스 계획을 복원했습니다.',false);renderAll();tab(extra.activeSection);return;}
      if(b.dataset.deleteProfile!==undefined){if(!confirm('이 저장 프로필을 삭제할까요?'))return;profiles.splice(Number(b.dataset.deleteProfile),1);persistProfiles();renderProfiles();return;}
    }catch(err){status(err.message,true);}
  });
  host.addEventListener('change',ev=>{const id=ev.target.dataset.checkTask;if(id){const task=extra.checklist.find(t=>t.id===id);if(task)task.done=ev.target.checked;persist();renderChecklist();}});
  on('pr-chart-km','input',e=>{extra.selectedKm=Number(e.target.value);persist();renderChart();renderRace();});
  on('pr-add-check','click',()=>{const km=Number($('pr-check-km').value),name=$('pr-check-name').value.trim();if(!(km>0&&km<=current().distanceKm)||!name){status('거리와 체크포인트 이름을 올바르게 입력하세요.',true);return;}
    extra.checkpoints.push({id:uid(),km,name,source:'사용자 입력'});persist();renderChecks();$('pr-check-name').value='';status('체크포인트를 추가했습니다.');});
  on('pr-auto-check','click',()=>{const d=current().distanceKm,arr=[];for(let km=5;km<d;km+=5)arr.push({id:uid(),km,name:'일반 5km 분할점',source:'공식 계측점 아님'});
    if(d>21)arr.push({id:uid(),km:21.0975,name:'하프 거리',source:'거리 계산상 중간점'});
    extra.checkpoints=[...extra.checkpoints,...arr.filter(p=>!extra.checkpoints.some(e=>Math.abs(e.km-p.km)<.01))];persist();renderChecks();status('기본 거리 지점을 생성했습니다. 공식 위치는 아닙니다.');});
  on('pr-gpx-file','change',async e=>{try{const f=await readFile(e.target,8_000_000);if(!f)return;if(!/\.gpx$/i.test(f.name))throw new Error('.gpx 파일만 업로드할 수 있습니다.');
      const g=parseGPX(f.text);extra.gpx=g;extra.gpxSource=f.name.slice(0,150);persist();renderGPX();renderChart();tab('gpx');status(`${g.lengthKm.toFixed(2)}km, 트랙 ${g.trackCount}개 포인트를 읽었습니다.`,false);
    }catch(err){status('GPX 분석 실패: '+err.message,true);}});
  on('pr-gpx-factor','input',e=>{extra.gpxFactor=Number(e.target.value);$('pr-gpx-factor-label').textContent=extra.gpxFactor.toFixed(1)+'×';persist();});
  on('pr-gpx-clear','click',()=>{if(!extra.gpx||!confirm('GPX 분석 자료를 삭제할까요? 이미 적용한 구간 보정은 유지됩니다.'))return;extra.gpx=null;extra.gpxSource='';persist();renderGPX();renderChart();status('GPX 파일 분석 자료를 삭제했습니다.');});
  on('pr-gpx-apply','click',()=>{if(!gpxMatching()){status('GPX 거리와 목표 레이스 거리의 차이가 3%를 초과하여 적용할 수 없습니다.',true);return;}
    const r=generatedRules();if(!r.length){status('보정할 경사가 감지되지 않았습니다. 강도를 조절해 보세요.',true);return;}
    if(!confirm(`GPX 추정 구간 ${r.length}개를 기존 코스 규칙 대신 적용할까요? 공식 보정값이 아닌 추정값입니다.`))return;
    P.applyData({...current(),rules:r},'GPX 기반 임시 코스 보정을 적용했습니다. 값을 검토하세요.',true);status(`GPX 추정 보정 ${r.length}개 구간 적용 완료`);});
  on('pr-gpx-export','click',()=>{if(!gpxMatching())return;const rules=generatedRules();dl('pacecraft_gpx_estimated_rules.csv',csv([['startKm','endKm','secPerKm','note'],...rules.map(r=>[r.startKm,r.endKm,r.secPerKm,r.note])]),'text/csv;charset=utf-8');});
  on('pr-add-supply','click',()=>{const km=Number($('pr-supply-km').value),name=$('pr-supply-name').value.trim();if(!Number.isFinite(km)||km<0||km>current().distanceKm||!name){status('보급 거리(0~레이스거리)와 제품명을 입력하세요.',true);return;}
    extra.supplies.push({id:uid(),km,type:$('pr-supply-type').value,name,carbs:num($('pr-supply-carbs').value,0,150),caffeine:num($('pr-supply-caffeine').value,0,500),water:num($('pr-supply-water').value,0,1500)});
    persist();renderSupplies();renderRace();status('보급 항목을 추가했습니다.');});
  on('pr-supply-auto','click',()=>{if(extra.supplies.length&&!confirm('현재 보급 항목을 40분 간격 예시로 교체할까요?'))return;
    const finish=rows().at(-1)?.cumulative||0,added=[];for(let sec=2400;sec<finish-600;sec+=2400){const r=rows().find(x=>x.cumulative>=sec);if(!r)continue;
      added.push({id:uid(),km:r.endKm,type:'젤',name:'제품 및 함량 직접 확인',carbs:0,caffeine:0,water:0});}
    extra.supplies=added;persist();renderSupplies();renderRace();status('40분 간격의 입력 템플릿을 만들었습니다. 영양 성분은 0으로 두었으니 실제 제품 정보를 입력하세요.');});
  on('pr-supply-to-plan','click',()=>{if(!extra.supplies.length){status('먼저 보급 항목을 추가하세요.',true);return;}
    const d=current(),fuel={...d.fueling};for(const s of extra.supplies){const r=nearest(Math.max(.01,s.km));if(!r)continue;
      const key=String(Math.round(r.endKm*10000)/10000),entry=`${s.type} ${s.name}`.slice(0,100);
      if(!fuel[key]?.includes(entry))fuel[key]=[fuel[key],entry].filter(Boolean).join(' · ').slice(0,120);
    }P.applyData({...d,fueling:fuel},'보급 계획을 기존 1km 표에 반영했습니다.',false);status('보급 정보를 1km 표에도 반영했습니다.');});
  on('pr-supply-csv','click',()=>dl('pacecraft_fuel_plan.csv',csv([['km','type','name','carbs_g','caffeine_mg','water_ml','nettime'],...extra.supplies.map(s=>[s.km,s.type,s.name,s.carbs,s.caffeine,s.water,fmt(at(s.km))])]),'text/csv;charset=utf-8'));
  on('pr-actual-add','click',()=>{const km=Number($('pr-actual-km').value),seconds=E.parseTime($('pr-actual-time').value);
    try{const arr=[...extra.actual.filter(x=>x.km!==km),{km,seconds}];validActual(arr);extra.actual=arr;persist();renderActual();$('pr-actual-time').value='';status('실제 통과 기록을 추가했습니다.');}catch(err){status(err.message,true);}});
  on('pr-actual-file','change',async e=>{try{const f=await readFile(e.target,300000);if(!f)return;const lines=simpleCsv(f.text);
      const arr=lines.filter(c=>c.length>=2&&Number.isFinite(Number(c[0]))&&Number(c[0])>0).map(c=>({km:Number(c[0]),seconds:E.parseTime(c[1])}));
      if(!arr.length||arr.length>200||arr.some(x=>!Number.isFinite(x.seconds)))throw new Error('CSV는 km,HH:MM:SS 형식으로 최대 200행 입력하세요.');
      validActual(arr);if(extra.actual.length&&!confirm('기존 실제 기록을 교체할까요?'))return;
      extra.actual=arr;persist();renderActual();status(`${arr.length}개 실제 통과 기록을 불러왔습니다.`);
    }catch(err){status('실제 기록 CSV 실패: '+err.message,true);}});
  on('pr-actual-clear','click',()=>{if(extra.actual.length&&confirm('실제 기록을 모두 삭제할까요?')){extra.actual=[];persist();renderActual();}});
  on('pr-goal-calc','click',()=>{extra.goals={distance:$('pr-goal-distance').value,time:$('pr-goal-time').value.trim(),weeklyKm:$('pr-goal-weekly').value,longestKm:$('pr-goal-longest').value};
    const sec=E.parseTime(extra.goals.time);if(!(sec>0)){status('최근 기록 형식: HH:MM:SS',true);return;}persist();calculateGoal();});
  on('pr-profile-save','click',()=>{const name=$('pr-profile-name').value.trim();if(name.length<2){status('계획 이름을 2자 이상 입력하세요.',true);return;}
    if(profiles.length>=16){status('프로필은 최대 16개까지 저장됩니다. 필요없는 프로필을 삭제하세요.',true);return;}
    profiles.unshift({name:name.slice(0,60),savedAt:new Date().toLocaleDateString('ko-KR'),base:current(),extra:safeExtras(extra)});persistProfiles();renderProfiles();$('pr-profile-name').value='';status(`'${name}' 프로필을 저장했습니다.`);});
  on('pr-share-link','click',async()=>{try{const d=current(),share={r:d.race,d:d.distanceKm,t:Math.round(d.targetSeconds),s:d.strategy,m:d.mode,
      rules:d.rules.slice(0,12).map(r=>[r.startKm,r.endKm,r.secPerKm])};const encoded=btoa(JSON.stringify(share));
      const base=new URL(location.href);base.searchParams.set('pcplan',encoded);if(base.href.length>1800)throw new Error('링크가 너무 깁니다. JSON 백업을 이용하세요.');
      await copy(base.href);status('개인 메모·보급정보를 제외한 공유 링크를 복사했습니다.');
    }catch(err){status('링크 복사 실패: '+err.message,true);}});
  on('pr-share-text','click',async()=>{try{const d=current(),r=rows().at(-1),t=`[Pacecraft Runner 레이스 계획]\n대회: ${d.race}\n거리: ${d.distanceKm}km\n목표: ${fmt(d.targetSeconds)}\n코스 보정 후: ${fmt(r.cumulative)}\n평균 페이스: ${pace(r.cumulative/d.distanceKm)}/km\n코스 규칙: ${d.rules.length}개\n※ 개인 메모는 포함되지 않습니다.`;
      await copy(t);status('레이스 요약을 복사했습니다.');}catch(err){status(err.message,true);}});
  on('pr-export-all','click',()=>{const payload={app:'Pacecraft Runner',format:'pro-suite-v2',exportedAt:new Date().toISOString(),base:current(),extra,profiles};
    dl('Pacecraft_전체백업_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(payload,null,2));status('코스·보급·기록·저장 프로필 전체를 JSON으로 백업했습니다.');});
  on('pr-import-all-file','change',async e=>{try{const f=await readFile(e.target,3_000_000);if(!f)return;const parsed=JSON.parse(f.text);
      if(parsed?.format!=='pro-suite-v2'||!parsed.base||!parsed.extra||!Array.isArray(parsed.profiles))throw new Error('Pacecraft 통합 백업 파일이 아닙니다.');
      if(!confirm('현재 편집 중인 데이터와 저장 프로필을 백업 파일로 교체할까요?'))return;
      const newExtra=safeExtras(parsed.extra);const newProfiles=parsed.profiles.slice(0,16).filter(p=>typeof p?.name==='string'&&p.base&&p.extra)
        .map(p=>({name:str(p.name,60),savedAt:str(p.savedAt,40),base:E.sanitizeStored(p.base),extra:safeExtras(p.extra)}));
      extra=newExtra;profiles=newProfiles;persist();persistProfiles();P.applyData(E.sanitizeStored(parsed.base),'통합 백업을 복원했습니다.',false);renderAll();tab(extra.activeSection);status('통합 백업 복원을 완료했습니다.');
    }catch(err){status('통합 백업 복원 실패: '+err.message,true);}});
  function shiftKm(v){extra.selectedKm=num(Math.round(extra.selectedKm)+v,1,rows().length);persist();renderRace();renderChart();}
  on('pr-race-slider','input',e=>{extra.selectedKm=Number(e.target.value);persist();renderRace();renderChart();});
  on('pr-race-prev','click',()=>shiftKm(-1));on('pr-race-next','click',()=>shiftKm(1));
  on('pr-race-full','click',async()=>{try{const el=host.querySelector('[data-pr-section="race"]');if(!document.fullscreenElement)await el.requestFullscreen();else await document.exitFullscreen();}catch(err){status('전체화면을 사용할 수 없는 브라우저입니다.');}});
  on('pr-image-export','click',async()=>{const card=host.querySelector('.pr-day-card');if(typeof window.html2canvas!=='function'){status('이미지 라이브러리가 로드되지 않았습니다. PDF 인쇄 기능을 사용하세요.',true);return;}
    try{const canvas=await window.html2canvas(card,{backgroundColor:'#111c36',scale:2});canvas.toBlob(b=>{if(!b){status('이미지 만들기 실패',true);return;}const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='pacecraft_raceday.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);});}catch(err){status('이미지 저장 실패: '+err.message,true);}});
  on('pr-checklist-add','click',()=>{const s=$('pr-checklist-input').value.trim();if(!s||extra.checklist.length>=50){status('1~50개 준비물 범위에서 이름을 입력하세요.',true);return;}extra.checklist.push({id:uid(),name:s,done:false});$('pr-checklist-input').value='';persist();renderChecklist();});
  // External edits to the existing 1km table are reflected in charts, comparisons and race-day mode.
  document.addEventListener('pacecraft:plan-updated',()=>{renderHero();renderChart();renderScenarios();renderInsights();renderChecks();renderGPX();renderSupplies();renderActual();renderRace();});
  // Share link: public race/strategy/rules only; never merges private notes silently.
  try{const token=new URLSearchParams(location.search).get('pcplan');if(token){if(token.length>1800)throw new Error('공유 링크가 너무 깁니다.');
    const obj=JSON.parse(atob(token));const candidate={...current(),race:str(obj.r,80),distanceKm:Number(obj.d),targetSeconds:Number(obj.t),strategy:obj.s,mode:obj.m,
      rules:Array.isArray(obj.rules)?obj.rules.slice(0,12).map(x=>({startKm:Number(x[0]),endKm:Number(x[1]),secPerKm:Number(x[2]),note:'공유된 코스 보정값 (공식 데이터 아님)'})):[]};
    if(![10,21.0975,42.195].includes(candidate.distanceKm)||!Number.isFinite(candidate.targetSeconds)||candidate.targetSeconds<900||candidate.targetSeconds>50000)throw new Error('올바르지 않은 공유 정보');
    if(confirm('Pacecraft 공유 레이스 전략을 불러올까요? 기존 저장 내용은 변경됩니다.')){
      candidate.overrides={};candidate.fueling={};candidate.notes={};candidate.generalMemo='';P.applyData(candidate,'공유 전략을 불러왔습니다.',true);
    }
  }}catch(err){setTimeout(()=>status('공유 링크 오류: '+err.message,true),100);}
  renderAll();tab(extra.activeSection);
  window.PacecraftPro={getData:()=>JSON.parse(JSON.stringify(extra)),parseGPX,generatedRules,calculateGoal};
})();
;(()=>{'use strict';
  const root=document.getElementById('rp-pro-suite'), P=window.PacecraftRacePlanner;
  if(!root||!P)return;
  const $=id=>document.getElementById(id);
  const gear=()=>{if(typeof window.switchDashboardTab==='function')window.switchDashboardTab('tab-gear');else document.querySelector('[data-dash-tab="tab-gear"]')?.click();setTimeout(()=>document.getElementById('gear-section')?.scrollIntoView({block:'start',behavior:'smooth'}),80)};
  $('pc-open-gear')?.addEventListener('click',gear);$('pc-nutrition-gear')?.addEventListener('click',gear);
  function explain(){
    const d=P.getData(), el=$('pc-chart-explain');if(!el)return;
    const example=(d.rules||[]).filter(x=>String(x.id||'').startsWith('example-')||/설명용 예시/.test(x.note||'')).length;
    let msg=example?'⚠ 가상 28km 예시 보정이 '+example+'개 적용되어 있습니다. 실제 대회 지형 정보가 아닙니다.':(d.rules?.length?'⚠ 수동/추정 보정 '+d.rules.length+'개 적용 중입니다. 공식 GPX와 반드시 비교하세요.':d.strategy==='negative'?'후반이 빨라지는 이유는 네거티브 스플릿 전략 때문입니다. 실제 고도는 반영되지 않았습니다.':d.strategy==='positive'?'후반 감속 전략입니다. 실제 고도는 반영되지 않았습니다.':'평탄 코스 기준의 이븐 페이스입니다. GPX 고도 미적용.');
    el.textContent='🏁 '+(d.race==='custom'?'대회 미지정':'대회: '+d.race)+' · '+msg+' 녹색 선은 목표 페이스 시뮬레이션이지 고도 그래프가 아닙니다.';
  }
  $('pc-flat')?.addEventListener('click',()=>{const d=P.getData();if(!confirm('목표 기록을 유지하면서 전략을 이븐 페이스로 바꾸고 코스 보정과 수기 페이스를 삭제할까요?'))return;P.applyData({...d,strategy:'even',rules:[],overrides:{},applyToVDOT:false},'평탄 코스 기준으로 초기화했습니다.',true);explain()});
  document.addEventListener('pacecraft:plan-updated',explain);explain();
  const grid=$('pc-races'),known=['busan','jinju','daegu','seoul','jtbc','chuncheon','gyeongju'];
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function link(url,name){try{const u=new URL(url);if(u.protocol!=='https:')return document.createTextNode('');const a=document.createElement('a');a.href=u.href;a.textContent=name+' ↗';a.className='pr-race-link';a.target='_blank';a.rel='noopener noreferrer nofollow';return a}catch{return document.createTextNode('')}}
  function render(races){if(!grid)return;grid.replaceChildren();races.sort((a,b)=>(a.date>=today?0:1)-(b.date>=today?0:1)||a.date.localeCompare(b.date)).forEach(r=>{
    const card=document.createElement('article');card.className='pr-race-card';const title=document.createElement('strong');title.textContent=r.edition+' '+r.name;card.appendChild(title);
    const date=document.createElement('p');date.className='pr-race-meta';date.textContent='📅 '+r.date+' · 풀코스 42.195km · '+(r.location||'');card.appendChild(date);
    const note=document.createElement('p');note.className='pr-race-meta';note.textContent=(r.gpxStatus==='official'?'공식 GPX 안내':r.gpxStatus==='community'?'비공식 참고 GPX':'GPX 미확인')+' · '+(r.note||'');card.appendChild(note);
    const actions=document.createElement('div');actions.className='pr-race-actions';actions.append(link(r.officialUrl,'공식 홈페이지'),link(r.courseUrl,'코스 확인'));if(r.gpxInfoUrl)actions.append(link(r.gpxInfoUrl,'GPX 출처'));
    const btn=document.createElement('button');btn.type='button';btn.className='rp-button rp-button-primary';btn.textContent='풀코스 계획 적용';btn.onclick=()=>{if(!confirm(r.edition+' '+r.name+'의 풀코스를 적용할까요? 기존 코스 보정/페이스 설정은 초기화되며 목표 시간은 유지됩니다.'))return;const d=P.getData();P.applyData({...d,race:known.includes(r.id)?r.id:'custom',distanceKm:42.195,rules:[],overrides:{},applyToVDOT:false,startTime:r.startTime||d.startTime},r.name+' 풀코스 계획을 적용했습니다.',true);explain()};actions.appendChild(btn);card.appendChild(actions);grid.appendChild(card)
  });}
  async function init(){if(!grid)return;for(const url of ['/api/course-catalog','./data/race-courses.json'])try{const rsp=await fetch(url,{cache:'no-store'});if(!rsp.ok)continue;const d=await rsp.json();if(Array.isArray(d.races)){render(d.races);return}}catch{}grid.textContent='대회 카탈로그를 불러오지 못했습니다. GPX 파일은 수동으로 가져올 수 있습니다.'}
  init();
})();
