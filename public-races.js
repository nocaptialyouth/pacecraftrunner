'use strict';
const {output,errorResponse,requireMethod,readPath}=require('../lib/backend');
const R=require('../lib/races');
const data=require('../data/marathon-online-races.json');
const catalog=require('../data/race-courses.json');
module.exports=async function handler(req,res){
 try{
  requireMethod(req,'GET');const today=R.kstToday();
  let approved=[];
  try{
   const cloud=await readPath('pacecraft_races');
   if(cloud&&typeof cloud==='object'){
    approved=Object.values(cloud).filter(r=>r&&R.validDate(r.date)&&r.date>=today&&r.name&&r.url).map(r=>({
     id:String(r.id||R.hashId(r.name+'|'+r.date)),name:String(r.name).slice(0,150),date:r.date,
     url:R.safeURL(r.url),source:r.source==='verified_feed'?'검증 피드':'Firebase 승인 일정',
     sourceUrl:R.safeURL(r.url),location:r.location||'',courses:Array.isArray(r.courses)?r.courses:[],
     confidence:'미확인',lastSeen:data.updatedAt||data.asOf,status:'pending'
    })).filter(r=>r.url);
   }
  }catch(_){}
  const base=(data.races||[]).map(r=>({...r,lastSeen:data.updatedAt||data.asOf,status:'pending'}));
  const merged=[...new Map([...approved,...base].map(r=>[(r.name||'').replace(/\s+/g,'')+'|'+r.date,r])).values()];
  let candidates=R.sortCandidates(merged,today)
   .filter(x=>x.date&&x.date>=today).slice(0,10);
  let source=data.sourceName||'대회 일정',warning=data.status==='auto'?'':'초기 참고 목록입니다. 원본 자동수집 성공 후 교체되며, 개최일과 접수는 공식 홈페이지에서 확인하세요.';
  if(!candidates.length){
   source='주요 대회 코스 참고 목록';warning='최근 원본 일정 수집이 지연되어 기본 대회 목록을 표시합니다.';
   candidates=(catalog.races||[]).filter(x=>x.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,10).map(x=>({
    id:x.id,name:x.name,date:x.date,url:x.officialUrl,source,sourceUrl:x.officialUrl,
    location:x.location||'',courses:[],confidence:'미확인',status:'pending'
   }));
  }
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=7200');
  return output(res,200,{ok:true,source,sourceUrl:data.sourceUrl,updatedAt:data.updatedAt||data.asOf,
   state:candidates.length?'ok':'empty',count:candidates.length,warning,searchSuggestionsHtml:'',
   candidates:candidates.map(x=>({id:x.id,name:x.name,date:x.date,url:x.url,source:x.source||source,
    sourceUrl:x.sourceUrl||data.sourceUrl,courses:x.courses||[],location:x.location||'',
    confidence:'미확인',lastSeen:x.lastSeen||null}))});
 }catch(e){return errorResponse(res,e)}
};
