'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../lib/gemini-races');
test('Grounding이 없는 Gemini JSON은 대회로 노출하지 않는다',()=>{
 const payload={candidates:[{content:{parts:[{text:JSON.stringify({races:[{name:'2027 부산마라톤',date:'2027-02-20',sourceUrl:'https://invented.invalid',description:'마라톤'}]})}]}}]};
 assert.equal(G.parseResponse(payload,'2026-11-10').rows.length,0);
});
test('실제 검색 출처 있는 후보는 미확인으로 노출한다',()=>{
 const payload={candidates:[{content:{parts:[{text:JSON.stringify({races:[{name:'2027 부산마라톤',date:'2027-02-20',sourceUrl:'https://example.com/event',description:'국내 마라톤'}]})}]},groundingMetadata:{groundingChunks:[{web:{uri:'https://example.com/event',title:'2027 부산마라톤 행사 정보'}}]}}]};
 const rows=G.parseResponse(payload,'2026-11-10').rows;
 assert.equal(rows.length,1);assert.equal(rows[0].confidence,'미확인');assert.equal(rows[0].date,'2027-02-20');
});
test('지난 대회 일정은 예정 개최일로 표시하지 않는다',()=>{
 const payload={candidates:[{content:{parts:[{text:JSON.stringify({races:[{name:'2025 서울마라톤',date:'2025-03-01',sourceUrl:'https://example.com/2025',description:'대회'}]})}]},groundingMetadata:{groundingChunks:[{web:{uri:'https://example.com/2025',title:'2025 서울마라톤'}}]}}]};
 assert.equal(G.parseResponse(payload,'2026-11-10').rows[0].date,'');
});


test('Gemini 2.5 Google 검색은 JSON 출력 설정과 분리해서 요청한다',async()=>{
 const prevFetch=globalThis.fetch,prevKey=process.env.GEMINI_API_KEY,prevModel=process.env.GEMINI_MODEL;
 const requests=[];
 process.env.GEMINI_API_KEY='test-only-key-not-real';delete process.env.GEMINI_MODEL;
 globalThis.fetch=async (_url,options)=>{
   const request=JSON.parse(options.body);requests.push(request);
   const data=requests.length===1?
   {candidates:[{content:{parts:[{text:'2027 부산마라톤 2027-02-20 관련 행사 정보'}]},groundingMetadata:{
     groundingChunks:[{web:{uri:'https://example.com/busan',title:'2027 부산마라톤 일정'}}],
     searchEntryPoint:{renderedContent:'<div>검색 제안</div>'}}}]}:
   {candidates:[{content:{parts:[{text:JSON.stringify({races:[
     {name:'2027 부산마라톤',date:'2027-02-20',sourceIndex:0,description:'확인 후보'}
   ]})}]}}]};
   return{ok:true,status:200,json:async()=>data};
 };
 try{
   const result=await G.discover(true);
   assert.equal(requests.length,2);
   assert.ok(requests[0].tools?.[0]?.googleSearch);
   assert.equal(requests[0].generationConfig.responseMimeType,undefined);
   assert.equal(requests[1].tools,undefined);
   assert.equal(requests[1].generationConfig.responseMimeType,'application/json');
   assert.equal(result.rows.length,1);
   assert.equal(result.rows[0].url,'https://example.com/busan');
   assert.equal(result.rows[0].confidence,'미확인');
   assert.ok(result.suggestions.includes('검색 제안'));
 }finally{
   globalThis.fetch=prevFetch;
   if(prevKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=prevKey;
   if(prevModel===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=prevModel;
 }
});
test('출처 인덱스가 검색 근거 범위 밖이면 대회를 버린다',()=>{
 const grounded={candidates:[{groundingMetadata:{groundingChunks:[{web:{uri:'https://example.com/only',title:'2027 마라톤'}}]}}]};
 const structured={candidates:[{content:{parts:[{text:JSON.stringify({races:[{
  name:'2027 마라톤',date:'2027-02-20',sourceIndex:100,description:'검증할 수 없는 출처'
 }]})}]}}]};
 assert.equal(G.parseResponse(structured,'2026-11-10',grounded).rows.length,0);
});
