'use strict';
const R = require('./races');
let cache = null;
let inFlight = null;
function getKey() {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) throw Object.assign(new Error('GEMINI_API_KEY가 없습니다. Vercel Production에 Google AI Studio 키를 등록하세요.'), {status:503});
  return key;
}
function normalizedName(s) { return R.plain(s).replace(/[^0-9a-z가-힣]/gi,'').toLowerCase(); }
function sourceMatches(row, sources) {
  const desired = R.safeURL(row.sourceUrl);
  const exact = sources.find(s => s.url === desired);
  if (exact) return exact;
  if (desired) {
    const sameHost = sources.find(s => {try{return new URL(s.url).hostname === new URL(desired).hostname;}catch{return false;}});
    if (sameHost) return sameHost;
  }
  const norm = normalizedName(row.name).slice(0,6);
  return norm.length >= 3 ? sources.find(s => normalizedName(s.title).includes(norm)) : null;
}
function parseResponse(payload, today=R.kstToday()) {
  const item = payload.candidates?.[0] || {};
  const sources = (item.groundingMetadata?.groundingChunks || [])
    .filter(x=>x?.web?.uri && x?.web?.title)
    .map(x=>({url:R.safeURL(x.web.uri),title:R.plain(x.web.title)})).filter(x=>x.url);
  const text = (item.content?.parts||[]).map(p=>p.text||'').join('');
  let obj;
  try { obj=JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/gi,'')); }
  catch {return {rows:[],suggestions:'',errors:['Gemini JSON 결과를 해석하지 못했습니다.']};}
  const rows=[];
  for (const race of (Array.isArray(obj.races)?obj.races:[]).slice(0,25)) {
    if (!race || typeof race.name!=='string')continue;
    const source=sourceMatches(race,sources);
    if (!source) continue; // Never show an ungrounded AI claim.
    const candidate=R.normalizeCandidate({
      title:race.name,description:[R.validDate(race.date),R.plain(race.description)].join(' '),
      link:source.url
    },'Google AI · Google 검색 근거',today);
    if (!candidate)continue;
    candidate.date=R.validDate(race.date)>=today?R.validDate(race.date):'';
    candidate.confidence='미확인';
    rows.push(candidate);
  }
  const suggestions=item.groundingMetadata?.searchEntryPoint?.renderedContent;
  return {rows:[...new Map(rows.map(x=>[x.id,x])).values()].slice(0,30),
    suggestions:typeof suggestions==='string'?suggestions.slice(0,20000):'',errors:[]};
}
async function discover(force=false) {
  if (!force && cache?.until>Date.now())return cache.value;
  if (inFlight)return inFlight;
  inFlight=(async()=>{
    const key=getKey();
    const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
    if (!/^[a-z0-9.-]{4,60}$/i.test(model))throw Object.assign(new Error('GEMINI_MODEL 설정값 오류'),{status:422});
    const today=R.kstToday();
    const prompt='오늘 대한민국 날짜 '+today+'. Google 검색을 실제로 이용해 앞으로 12개월 내 대한민국 마라톤/하프/풀코스 대회의 최근 개최 예정 후보 10~15개를 찾아라. 검색 결과의 실제 출처 링크를 기록하고, 접수일과 개최일을 혼동하지 말 것. 모르면 빈 날짜로, 과거 대회는 제외. URL과 개최일을 만들어내지 말 것. 오직 JSON {"races":[{"name":"대회명","date":"YYYY-MM-DD 또는 빈 문자열","sourceUrl":"검색에서 확인된 URL","description":"요약"}]} 만 출력.';
    const request={
      contents:[{role:'user',parts:[{text:prompt}]}],
      tools:[{googleSearch:{}}],
      generationConfig:{responseMimeType:'application/json',maxOutputTokens:2300}
    };
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify(request),signal:AbortSignal.timeout(28000)
    });
    const result=await response.json().catch(()=>({}));
    if (!response.ok)throw Object.assign(new Error('Gemini Google 검색 HTTP '+response.status+' 오류 (모델·키·검색 기능·사용량 확인)'),{status:502});
    const parsed=parseResponse(result,today);
    const value={...parsed,updatedAt:new Date().toISOString(),state:parsed.errors.length?'partial':'ok'};
    cache={value,until:Date.now()+4*3600000};
    return value;
  })();
  try{return await inFlight;}finally{inFlight=null;}
}
module.exports={discover,parseResponse};