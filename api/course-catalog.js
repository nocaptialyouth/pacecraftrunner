'use strict';
const catalog=require('../data/race-courses.json');
const raceList=catalog.races;
const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/&(?:quot|amp|lt|gt|nbsp|#39);/g,' ').replace(/\s+/g,' ').trim().slice(0,170);
const safeLink=url=>{try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
async function findSources(race, fetchFn=fetch, env=process.env){
  if(!env.NAVER_CLIENT_ID||!env.NAVER_CLIENT_SECRET)return {sources:[],warning:'네이버 검색 API 키가 없어 실시간 GPX 검색은 비활성화되었습니다. 공식 홈페이지는 확인할 수 있습니다.'};
  const term=`${race.edition} ${race.name} 풀코스 GPX 고도 코스`;
  const u='https://openapi.naver.com/v1/search/webkr.json?display=8&sort=sim&query='+encodeURIComponent(term);
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
  try{
    const res=await fetchFn(u,{headers:{'X-Naver-Client-Id':env.NAVER_CLIENT_ID,'X-Naver-Client-Secret':env.NAVER_CLIENT_SECRET},signal:ctl.signal});
    if(!res.ok)throw new Error('네이버 검색 응답 오류 ('+res.status+')');
    const json=await res.json();
    const sources=(Array.isArray(json.items)?json.items:[]).map(i=>({title:clean(i.title),url:safeLink(i.link),description:clean(i.description),verified:false})).filter(i=>i.url);
    return {sources,warning:'검색 결과는 GPX 원본 또는 공식 개최 정보를 보증하지 않습니다. 출처에서 확인 후 파일을 가져오세요.'};
  }catch(e){return {sources:[],warning:'실시간 검색 실패: '+(e.name==='AbortError'?'시간 초과':String(e.message||e).slice(0,90))};}
  finally{clearTimeout(timer);}
}
async function handler(req,res){
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=300, stale-while-revalidate=900');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET only'});
  const id=typeof req.query?.race==='string'?req.query.race:'';
  const race=raceList.find(r=>r.id===id);
  const lookup=req.query?.discover==='1';
  if(lookup&&!race)return res.status(400).json({ok:false,error:'등록된 대회를 선택하세요.'});
  const found=lookup?await findSources(race):{sources:[],warning:''};
  return res.status(200).json({ok:true,version:catalog.version,races:raceList,sources:found.sources,warning:found.warning});
}
module.exports=handler;
module.exports.findSources=findSources;
