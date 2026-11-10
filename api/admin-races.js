'use strict';
const R=require('../lib/races');
const B=require('../lib/backend');
module.exports=async function handler(req,res){
  try{
    B.requireMethod(req,'POST');
    const length=Number(req.headers['content-length']||0);
    if(length>12000)return B.output(res,413,{ok:false,error:'요청 크기 제한 초과'});
    await B.isAdmin(req);
    const body=typeof req.body==='object'&&req.body!==null?req.body:JSON.parse(req.body||'{}');
    const action=body.action;
    if(action==='status'){
      const [meta,cands,lastSync]=await Promise.all([B.readPath('pacecraft_private_settings/gemini'),B.readPath('pacecraft_race_candidates'),B.readPath('pacecraft_race_sync_meta')]);
      const count=Object.values(cands||{}).filter(c=>c?.status==='pending').length;
      return B.output(res,200,{ok:true,...B.configSummary(meta,count),lastSync});
    }
    if(action==='candidates'){
      const list=Object.values(await B.readPath('pacecraft_race_candidates')||{});
      return B.output(res,200,{ok:true,items:R.sortCandidates(list).slice(0,100)});
    }
    if(action==='sync'){
      const data=await B.performSync();
      return B.output(res,data.state==='error'?502:200,{ok:data.state!=='error',...data,error:data.errors.join('; ')});
    }
    if(action==='approve'||action==='reject'){
      const id=String(body.id||'');if(!/^[a-f0-9]{20}$/.test(id))return B.output(res,422,{ok:false,error:'잘못된 후보 ID'});
      const ref=B.backend().db.ref('pacecraft_race_candidates/'+id);
      const snapshot=await ref.get(),c=snapshot.val();
      if(!c||c.status!=='pending')return B.output(res,409,{ok:false,error:'처리 대상이 없거나 이미 검토된 후보입니다.'});
      if(action==='approve'){
        if(!R.validDate(c.date)||c.date<R.kstToday())return B.output(res,422,{ok:false,error:'개최일이 없거나 지난 날짜입니다. 공식 정보를 확인하세요.'});
        const race=R.raceRecord(c);
        if(!race.url)return B.output(res,422,{ok:false,error:'원문 URL 오류'});
        await B.appendRaces([race]);
      }
      const tx=await ref.transaction(current=>{
        if(!current||current.status!=='pending')return;return {...current,status:action==='approve'?'approved':'rejected',reviewedAt:new Date().toISOString()};
      },undefined,false);
      if(!tx.committed)return B.output(res,409,{ok:false,error:'다른 요청에서 이미 검토된 후보입니다.'});
      return B.output(res,200,{ok:true});
    }
    if(action==='configureAi'){
      const project=String(body.project||process.env.GOOGLE_AI_PROJECT_ID||'gen-lang-client-0446173375').trim();
      if(!/^[a-z][a-z0-9-]{3,62}$/.test(project))return B.output(res,422,{ok:false,error:'Google 프로젝트 ID를 확인하세요.'});
      const key=String(body.apiKey||'').trim();
      if(key.length>250)return B.output(res,422,{ok:false,error:'API 키 형식 오류'});
      const old=await B.readPath('pacecraft_private_settings/gemini')||{};
      const next={project,updatedAt:new Date().toISOString()};
      if(body.removeKey===true)next.key=null;
      else if(key)next.key=B.encrypt(key);
      else next.key=old.key||null;
      await B.writePath('pacecraft_private_settings/gemini',next);
      return B.output(res,200,{ok:true,project,geminiConfigured:!!(next.key||process.env.GEMINI_API_KEY)});
    }
    if(action==='ai'){
      const prompt=String(body.prompt||'').trim();
      if(prompt.length<5||prompt.length>3000)return B.output(res,422,{ok:false,error:'질문은 5~3000자로 입력해 주세요.'});
      const meta=await B.readPath('pacecraft_private_settings/gemini')||{};
      let key=process.env.GEMINI_API_KEY;
      if(!key&&meta.key)key=B.decrypt(meta.key);
      if(!key)return B.output(res,503,{ok:false,error:'Gemini API 키를 관리자 설정에서 등록해야 합니다.'});
      const model=process.env.GEMINI_MODEL||'gemini-3.8-flash';
      if(!/^[a-z0-9.-]+$/i.test(model))throw new Error('Gemini 모델 이름 오류');
      const resp=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
        method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body:JSON.stringify({contents:[{role:'user',parts:[{text:'당신은 마라톤 행사 일정 검토 보조자입니다. 출처 확인 없이 개최일을 단정하지 마세요.\n\n'+prompt}]}],generationConfig:{maxOutputTokens:900}}),
        signal:AbortSignal.timeout(25000)
      });
      const payload=await resp.json().catch(()=>({}));
      if(!resp.ok)throw Object.assign(new Error('Gemini API 호출 실패: HTTP '+resp.status+' (모델/키/할당량 확인)'),{status:502});
      const answer=(payload.candidates||[]).flatMap(c=>c.content?.parts||[]).map(p=>p.text||'').join('\n').slice(0,9000);
      return B.output(res,200,{ok:true,answer:answer||'출력된 내용이 없습니다. 다시 질문해 주세요.'});
    }
    return B.output(res,400,{ok:false,error:'지원하지 않는 작업'});
  }catch(e){B.errorResponse(res,e);}
};
