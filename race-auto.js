/* Pacecraft Runner race auto-discovery + owner-only Gemini console.
 * Keys live ONLY in Vercel environment variables; no secrets are embedded here.
 */
(function(){
  'use strict';
  const root=document.getElementById('race-auto-box');
  if(!root)return;
  const q=id=>document.getElementById(id);
  const info=q('race-auto-info'), list=q('race-auto-items'), showMore=q('race-auto-more');
  const admin=q('race-auto-admin'), adminInfo=q('race-auto-admin-status');
  const adminList=q('race-auto-admin-candidates'), aiInput=q('race-auto-ai-question'), aiOutput=q('race-auto-ai-answer');
  let publicRows=[]; let allRows=[]; let expand=false; let ownerLoggedIn=false; let busy=false;
  let dialog,dialogCard;
  const openAdminBtn=q('race-auto-open-admin');
  function showAdminDialog(){
    if(!ownerLoggedIn||!dialog)return;
    dialog.classList.remove('hidden');admin?.classList.remove('hidden');
    document.body.style.overflow='hidden';
  }
  function closeAdminDialog(){
    dialog?.classList.add('hidden');admin?.classList.add('hidden');
    document.body.style.overflow='';
  }
  function mountAdminDialog(){
    if(!admin)return;
    dialog=el('div','fixed inset-0 z-[120] hidden bg-slate-950/80 backdrop-blur-sm overflow-y-auto p-3 sm:p-6');
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','관리자 전용 대회 자동화 및 Gemini AI 설정');
    dialogCard=el('div','max-w-4xl mx-auto rounded-2xl bg-slate-50 dark:bg-slate-950 shadow-2xl p-4 sm:p-7 space-y-4 border border-slate-200 dark:border-slate-800');
    const top=el('div','flex items-center justify-between gap-3');
    top.appendChild(el('h2','text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white','🛡️ Pacecraft 운영자 콘솔'));
    const close=el('button','rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white py-2 px-4 text-xs font-bold','닫기 ✕');
    close.type='button';close.addEventListener('click',closeAdminDialog);top.appendChild(close);dialogCard.appendChild(top);
    admin.classList.remove('mt-3'); admin.classList.add('!block'); // The modal itself still controls visibility.
    admin.classList.add('space-y-4');
    const list=admin.querySelector('#race-auto-admin-candidates'); if(list)list.classList.replace('max-h-72','max-h-[350px]');
    dialogCard.appendChild(admin);dialog.appendChild(dialogCard);document.body.appendChild(dialog);
    dialog.addEventListener('click',event=>{if(event.target===dialog)closeAdminDialog();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dialog.classList.contains('hidden'))closeAdminDialog();});
    openAdminBtn?.addEventListener('click',showAdminDialog);
  }
  const todayStr=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
  function line(parent,text,cls){const n=el('p',cls||'text-[11px] text-slate-600 dark:text-slate-300',text);parent.appendChild(n);return n;}
  function makeLink(url,text){const a=el('a','text-[11px] font-bold text-indigo-600 dark:text-indigo-300 underline underline-offset-2',text);const u=String(url||'');if(/^https?:\/\//.test(u)){a.href=u;a.target='_blank';a.rel='noopener noreferrer nofollow';}else a.removeAttribute('href');return a;}
  function showError(message){if(info)info.textContent=message;}
  function statusDate(date){return date ? date.replace(/-/g,'. ') : '날짜 확인 필요';}
  function renderPublic(){
    if(!list)return;list.replaceChildren();
    const rows=expand?publicRows:publicRows.slice(0,10);
    if(!rows.length){line(list,'수집된 예정 대회가 없습니다. 출처를 확인해 주세요.','text-[10px] text-slate-400');}
    rows.forEach(c=>{
      const box=el('div','rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-white/60 dark:bg-slate-800/40 space-y-1');
      const header=el('div','flex items-start justify-between gap-2');
      header.appendChild(el('span','text-[11px] font-semibold leading-snug text-slate-800 dark:text-slate-100 break-words',c.name));
      const b=el('span','shrink-0 text-[9px] rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1 py-0.5','미확인');header.appendChild(b);
      box.appendChild(header);
      const bottom=el('div','flex flex-wrap gap-1.5 items-center justify-between');
      bottom.appendChild(el('span','text-[10px] text-slate-500 dark:text-slate-400',`📅 ${statusDate(c.date)}`));
      bottom.appendChild(makeLink(c.url,'대회 출처 ↗'));
      if(c.courses?.length)box.appendChild(el('span','text-[10px] text-slate-500','종목: '+c.courses.join(' · ')));
      if(c.location)box.appendChild(el('span','text-[10px] text-slate-500','장소: '+c.location));
      box.appendChild(bottom);list.appendChild(box);
    });
    if(showMore){showMore.hidden=publicRows.length<=10;showMore.textContent=expand?'접기':`전체 ${publicRows.length}건 보기`;}
  }
  function renderGoogleSuggestions(html){
    let box=q('race-auto-google-suggestions');
    if(!box){box=document.createElement('div');box.id='race-auto-google-suggestions';root.appendChild(box);}
    box.replaceChildren();
    if(!html)return;
    const label=document.createElement('p');label.className='text-[10px] text-slate-500 mt-2 mb-1';label.textContent='Google 검색 제안';box.appendChild(label);
    const frame=document.createElement('iframe');frame.title='Google 검색 제안';
    frame.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox');
    frame.style.cssText='width:100%;max-width:100%;height:60px;border:0;';
    frame.srcdoc=String(html).slice(0,20000);box.appendChild(frame);
  }
  async function loadPublic(){
    if(info)info.textContent='대회 검색 자료 확인 중…';
    try{
      const res=await fetch('/api/public-races',{cache:'default',signal:AbortSignal.timeout(40000)});
      const payload=await res.json();
      if(!res.ok||!payload.ok)throw new Error(payload.error||'목록 응답 오류');
      publicRows=Array.isArray(payload.candidates)?payload.candidates:[];
      const date=payload.updatedAt?new Date(payload.updatedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'미실행';
      if(info)info.textContent=`공개 대회 일정 · 출처 확인 · ${publicRows.length}개 후보 · 마지막 갱신 ${date}`;
      renderGoogleSuggestions('');
      renderPublic();
    }catch(e){publicRows=[];renderGoogleSuggestions('');renderPublic();showError('자동 검색 연결 대기 중 · '+(e.message||'환경설정 필요'));}
  }
  async function token(){
    if(typeof firebase==='undefined'||!firebase.auth)throw new Error('Firebase 인증 SDK가 필요합니다.');
    const user=firebase.auth().currentUser;
    if(!user)throw new Error('관리자 Google 로그인이 필요합니다.');
    return user.getIdToken();
  }
  async function callAdmin(action, data={}){
    const idToken=await token();
    const res=await fetch('/api/admin-races',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${idToken}`},body:JSON.stringify({action,...data})});
    const json=await res.json();
    if(!res.ok||!json.ok)throw new Error(json.error||`API 오류(${res.status})`);
    return json;
  }
  function setWorking(yes){busy=yes;admin?.querySelectorAll('button').forEach(b=>b.disabled=yes);}
  function displayAdminStatus(d){
    if(!adminInfo)return;
    adminInfo.replaceChildren();
    line(adminInfo,`Google AI 프로젝트: ${d.project}`,'text-xs font-bold text-slate-800 dark:text-white');
    line(adminInfo,`Gemini API: ${d.geminiConfigured?'연결 키 설정됨':'키 미설정'} · Google 검색 수집: ${d.geminiSearchConfigured?'키 설정됨':'키 미설정'}`);
    line(adminInfo,`일정 자동 수집: 매일 오전 9시(KST) 예약 · 검토대기 ${d.pending}건`);
    line(adminInfo,`확인된 정형 피드 자동 게시: ${d.autoPublishVerified?'사용':'사용 안 함'}`);
    if(d.lastSync?.updatedAt)line(adminInfo,`최종 작업: ${new Date(d.lastSync.updatedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (${d.lastSync.state||'-'})`);
    const projectField=q('race-auto-google-project'); if(projectField)projectField.value=d.project||'';
    const saveButton=q('race-auto-ai-save'); if(saveButton)saveButton.title=d.canStoreKey?'암호화 키 저장 가능':'서버 암호화 키 미설정';
    if(!d.geminiConfigured){line(adminInfo,'Gemini 사용은 Vercel 환경변수 GEMINI_API_KEY 등록 후 활성화됩니다.','text-[11px] text-amber-600 dark:text-amber-300');}
  }
  function renderAdminCandidates(){
    if(!adminList)return;adminList.replaceChildren();
    if(!allRows.length){line(adminList,'검토할 후보가 없습니다.','text-xs text-slate-500');return;}
    allRows.slice(0,60).forEach(c=>{
      const box=el('div','rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 space-y-2');
      line(box,c.name,'text-xs font-semibold break-words text-slate-800 dark:text-white');
      line(box,`${c.date||'개최일 확인 필요'} · ${c.source||'Google AI'} · ${c.confidence||'검토 필요'}`,'text-[10px] text-slate-500');
      const links=el('div','flex flex-wrap gap-2 items-center');
      links.appendChild(makeLink(c.url,'원본 확인 ↗'));
      const ask=el('button','px-2 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300','AI로 검토');
      ask.addEventListener('click',()=>{if(aiInput){aiInput.value=`다음은 Google AI 검색에서 찾은 마라톤 일정 후보입니다. 검증 전 자료이므로 공식 일정 여부 및 확인할 항목을 알려 주세요.\n대회명: ${c.name}\n날짜 후보: ${c.date||'없음'}\n출처: ${c.url}\n설명: ${c.description||''}`;aiInput.focus();}});
      links.appendChild(ask);
      const accept=el('button','px-2 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600','승인');
      accept.disabled=!c.date;
      if(!c.date)accept.title='날짜가 추출되지 않아 공식 확인 후 수동 등록이 필요합니다.';
      accept.addEventListener('click',()=>review('approve',c));links.appendChild(accept);
      const reject=el('button','px-2 py-1 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950','제외');
      reject.addEventListener('click',()=>review('reject',c));links.appendChild(reject);
      box.appendChild(links);adminList.appendChild(box);
    });
  }
  async function review(action,c){
    if(busy)return;
    const message=action==='approve'?`[${c.name}]\n개최일: ${c.date}\n원본 링크를 확인했습니까? 날짜가 정확할 때만 공개 등록합니다.`:`[${c.name}] 후보를 제외하시겠습니까?`;
    if(!window.confirm(message))return;
    try{setWorking(true);await callAdmin(action,{id:c.id});await Promise.all([loadCandidates(),loadPublic()]);if(info)info.textContent=`${c.name}: ${action==='approve'?'공식 목록에 승인 반영':'제외 완료'}`;}
    catch(e){window.alert(e.message);}
    finally{setWorking(false);}
  }
  async function loadCandidates(){
    const d=await callAdmin('candidates');allRows=d.items||[];renderAdminCandidates();
  }
  async function refreshAdmin(){
    if(busy)return;
    try{setWorking(true);const d=await callAdmin('status');displayAdminStatus(d);await loadCandidates();}
    catch(e){if(adminInfo){adminInfo.replaceChildren();line(adminInfo,`설정 확인 실패: ${e.message}`,'text-xs text-rose-600');}}
    finally{setWorking(false);}
  }
  async function syncNow(){
    if(busy)return;
    try{setWorking(true);if(adminInfo)adminInfo.textContent='Google AI 검색 후보를 동기화하는 중…';
      const d=await callAdmin('sync');await loadCandidates();await loadPublic();displayAdminStatus(await callAdmin('status'));
      window.alert(`수집 완료: 발견 ${d.found}건 / 신규 ${d.added}건 / 자동 반영 ${d.published}건${d.errors?.length?'\n주의: '+d.errors.join('; '):''}`);
    }catch(e){window.alert(`자동 수집 실패: ${e.message}`);await refreshAdmin();}
    finally{setWorking(false);}
  }
  async function saveAiSettings(remove=false){
    if(busy)return;
    if(remove&&!window.confirm('저장된 Gemini API 키를 삭제할까요? Vercel 환경변수의 키는 이 화면에서 삭제되지 않습니다.'))return;
    const project=q('race-auto-google-project')?.value.trim();
    const apiKey=remove?'':q('race-auto-google-key')?.value.trim();
    try{setWorking(true);const data=await callAdmin('configureAi',{project,apiKey,removeKey:remove});
      if(q('race-auto-google-key'))q('race-auto-google-key').value='';
      window.alert(remove?'저장된 키가 삭제되었습니다.':'Google AI 연결 설정을 서버에 저장했습니다.');
    }catch(e){window.alert(e.message);}
    finally{setWorking(false);await refreshAdmin();}
  }
  async function runAi(){
    if(busy||!aiInput||!aiOutput)return;
    const prompt=aiInput.value.trim();if(prompt.length<5)return window.alert('AI 검토 내용을 입력해 주세요.');
    try{setWorking(true);aiOutput.textContent='Gemini가 검토 중입니다…';const d=await callAdmin('ai',{prompt});aiOutput.textContent=d.answer||'답변 없음';}
    catch(e){aiOutput.textContent='AI 검토 실패: '+e.message;}
    finally{setWorking(false);}
  }
  function changeAuth(user){
    const signed=!!user;
    // Display private controls only when server-side verification also confirms owner UID.
    if(!signed){ownerLoggedIn=false;if(openAdminBtn)openAdminBtn.hidden=true;closeAdminDialog();return;}
    callAdmin('status').then(d=>{
      ownerLoggedIn=true;if(openAdminBtn)openAdminBtn.hidden=false;displayAdminStatus(d);loadCandidates().catch(e=>console.warn('candidate load',e));
    }).catch(()=>{ownerLoggedIn=false;if(openAdminBtn)openAdminBtn.hidden=true;closeAdminDialog();});
  }
  showMore?.addEventListener('click',()=>{expand=!expand;renderPublic();});
  q('race-auto-reload')?.addEventListener('click',loadPublic);
  q('race-auto-sync')?.addEventListener('click',syncNow);
  q('race-auto-refresh-admin')?.addEventListener('click',refreshAdmin);
  q('race-auto-ai-run')?.addEventListener('click',runAi);
  q('race-auto-ai-save')?.addEventListener('click',()=>saveAiSettings(false));
  q('race-auto-ai-remove')?.addEventListener('click',()=>saveAiSettings(true));
  mountAdminDialog();
  loadPublic();
  try{ if(typeof firebase!=='undefined'&&firebase.auth)firebase.auth().onAuthStateChanged(changeAuth); }
  catch(e){console.warn('race auto auth',e);}
})();