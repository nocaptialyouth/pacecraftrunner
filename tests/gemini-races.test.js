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
