'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../scripts/sync-marathon-online');
test('대회 일정의 날짜·종목·원문 링크 추출',()=>{
 const h='<h1>2026 대회일정</h1><table><tr><td>11.14 (토)</td><td><a href="/race">2026 순천 남승룡마라톤</a></td><td>풀,하프,10km,5km</td><td>순천</td></tr><tr><td>10.20</td><td>2026 지난마라톤</td></tr></table>';
 const r=S.parseRows(h,'http://www.marathon.pe.kr/schedule','2026-11-11');
 assert.equal(r.length,1);assert.equal(r[0].date,'2026-11-14');
 assert.equal(r[0].url,'http://www.marathon.pe.kr/race');
 assert.deepEqual(r[0].courses,['풀','하프','10km','5km']);
});
test('부정확한 날짜와 차단된 robots 규칙은 반영하지 않는다',()=>{
 assert.equal(S.dateIn('접수중',2026),'');assert.equal(S.dateIn('2026.02.30',2026),'');
 assert.equal(S.allowed('User-agent: *\nDisallow: /\n','http://www.marathon.pe.kr/'),false);
 assert.equal(S.allowed('User-agent: *\nDisallow: /admin\n','http://www.marathon.pe.kr/schedule'),true);
});
