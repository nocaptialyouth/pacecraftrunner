'use strict';
const {output,errorResponse,requireMethod,readPath}=require('../lib/backend');
const {sortCandidates}=require('../lib/races');
const Gemini=require('../lib/gemini-races');
module.exports=async function handler(req,res){
 try{
  requireMethod(req,'GET');
  let stored=[],meta=null;
  try{
   const [items,last]=await Promise.all([readPath('pacecraft_race_candidates'),readPath('pacecraft_race_sync_meta')]);
   meta=last;
   stored=sortCandidates(Object.values(items||{})).filter(x=>String(x.source||'').startsWith('Google AI')).slice(0,30);
  }catch(e){/* Firebase configuration may be missing; public Google AI results can still be read. */}
  const fresh=meta?.updatedAt && Date.now()-Date.parse(meta.updatedAt)<24*3600000;
  let rows=stored,updatedAt=meta?.updatedAt||null,suggestions=meta?.searchSuggestionsHtml||'',warning='',state=meta?.state||'ok';
  if(!rows.length||!fresh){
    const live=await Gemini.discover();
    rows=sortCandidates(live.rows).slice(0,30);
    updatedAt=live.updatedAt;
    suggestions=live.suggestions;
    state=live.state;
    warning=live.errors.length?'Gemini 검색 결과 형식을 확인해야 합니다.':'';
  }
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=3600');
  output(res,200,{
   ok:true,candidates:rows.map(c=>({id:c.id,name:c.name,date:c.date||'',url:c.url,source:c.source,confidence:'미확인',lastSeen:c.lastSeen})),
   updatedAt,state,source:'Gemini Google Search',count:rows.length,searchSuggestionsHtml:suggestions,
   warning:(warning?warning+' ':'')+'Google 검색 근거가 있어도 날짜와 개최 여부는 공식 확인 전까지 미확인입니다. Firebase 관리자 승인·저장은 별도 연결이 필요합니다.'
  });
 }catch(e){errorResponse(res,e);}
};