'use strict';
const crypto=require('node:crypto');
const R=require('./races');
const Google=require('./gemini-races');
let cached;
function backend(){
 if(cached)return cached;
 const value=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 if(!value)throw Object.assign(new Error('FIREBASE_SERVICE_ACCOUNT_JSON 환경변수를 설정해 주세요.'),{status:503});
 let cred;try{cred=JSON.parse(value);}catch{throw Object.assign(new Error('Firebase 서비스 계정 JSON 형식 오류'),{status:503});}
 if(!process.env.FIREBASE_DATABASE_URL)throw Object.assign(new Error('FIREBASE_DATABASE_URL 환경변수를 설정해 주세요.'),{status:503});
 const {getApps,getApp,initializeApp,cert}=require('firebase-admin/app');
 const {getAuth}=require('firebase-admin/auth');
 const {getDatabase}=require('firebase-admin/database');
 const app=getApps().length?getApp():initializeApp({credential:cert(cred),databaseURL:process.env.FIREBASE_DATABASE_URL});
 cached={auth:getAuth(app),db:getDatabase(app)};return cached;
}
function output(res,status,data){
 res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));
}
function errorResponse(res,e){
 const status=Number.isInteger(e?.status)?e.status:500;
 console.error('[race-api]',status,e?.message||e);
 return output(res,status,{ok:false,error:status>=500?'서버 설정 또는 외부 데이터 연결을 확인해 주세요.':String(e.message||'잘못된 요청입니다.')});
}
function requireMethod(req,expected){if(req.method!==expected)throw Object.assign(new Error('허용되지 않는 요청 방식'),{status:405});}
async function isAdmin(req){
 const uid=process.env.ADMIN_FIREBASE_UID?.trim();
 if(!uid)throw Object.assign(new Error('운영자 UID가 설정되지 않았습니다.'),{status:503});
 const match=String(req.headers.authorization||'').match(/^Bearer\s+(\S+)$/i);
 if(!match)throw Object.assign(new Error('관리자 로그인이 필요합니다.'),{status:401});
 let decoded;try{decoded=await backend().auth.verifyIdToken(match[1],true);}catch{throw Object.assign(new Error('로그인 인증이 만료되었거나 올바르지 않습니다.'),{status:401});}
 if(decoded.uid!==uid)throw Object.assign(new Error('운영자 계정에 권한이 없습니다.'),{status:403});
 return decoded;
}
async function readPath(path){return(await backend().db.ref(path).get()).val();}
async function writePath(path,data){await backend().db.ref(path).set(data);}
function configSummary(meta,count){return{
 project:meta?.project||process.env.GOOGLE_AI_PROJECT_ID||'gen-lang-client-0446173375',
 geminiConfigured:!!(process.env.GEMINI_API_KEY||meta?.key),
 geminiSearchConfigured:!!process.env.GEMINI_API_KEY,
 canStoreKey:!!process.env.RACE_SECRET_ENCRYPTION_KEY,
 autoPublishVerified:process.env.RACE_AUTO_PUBLISH_VERIFIED==='true'&&!!process.env.RACE_VERIFIED_FEED_URL,
 pending:count
};}
function keyBytes(){const key=Buffer.from(process.env.RACE_SECRET_ENCRYPTION_KEY||'','base64');if(key.length!==32)throw Object.assign(new Error('RACE_SECRET_ENCRYPTION_KEY는 Base64로 인코딩한 32바이트여야 합니다.'),{status:422});return key;}
function encrypt(s){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',keyBytes(),iv);const payload=Buffer.concat([cipher.update(s,'utf8'),cipher.final()]);return{iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:payload.toString('base64')};}
function decrypt(o){if(!o?.ciphertext)return'';const dec=crypto.createDecipheriv('aes-256-gcm',keyBytes(),Buffer.from(o.iv,'base64'));dec.setAuthTag(Buffer.from(o.tag,'base64'));return Buffer.concat([dec.update(Buffer.from(o.ciphertext,'base64')),dec.final()]).toString('utf8');}
async function externalJson(url,{headers={},timeout=9500}={}){
 const resp=await fetch(url,{headers,signal:AbortSignal.timeout(timeout),redirect:'follow'});
 if(!resp.ok)throw new Error(`외부 정보 제공처 응답: HTTP ${resp.status}`);return resp.json();
}
async function verifiedFeed(){
 const url=process.env.RACE_VERIFIED_FEED_URL;
 if(!/^https:\/\//.test(url||''))throw new Error('검증 피드 HTTPS 주소 오류');
 const json=await externalJson(url,{timeout:10000});
 const items=Array.isArray(json)?json:(json.races||[]);
 return items.filter(c=>c&&c.verified===true&&R.validDate(c.date)&&c.date>=R.kstToday()&&typeof c.officialUrl==='string'&&c.officialUrl.startsWith('https://')&&typeof c.name==='string'&&c.name.length>2&&c.name.length<=150).map(c=>R.raceRecord(c,true));
}
async function appendRaces(records){
 if(!records.length)return 0;
 let added=0;
 await backend().db.ref('pacecraft_races').transaction(current=>{
  const all=current&&typeof current==='object'&&!Array.isArray(current)?{...current}:{};
  let count=0;for(const r of records){if(!R.isDuplicateRace(all,r)){all[r.id]=r;count++;}}
  added=count;return all;
 },undefined,false);
 return added;
}
async function performSync(){
 const errors=[];let rows=[];
 try{const d=await Google.discover(true);rows=d.rows;errors.push(...d.errors);}catch(e){errors.push(e.message);}
 let added=0;
 if(rows.length){try{await backend().db.ref('pacecraft_race_candidates').transaction(old=>{const m=R.mergeCandidates(old,rows);added=m.added;return m.items;},undefined,false);}catch(e){errors.push('Firebase 후보 저장 불가. 서비스 계정 설정을 확인하세요.');}}
 let published=0;
 if(process.env.RACE_AUTO_PUBLISH_VERIFIED==='true'&&process.env.RACE_VERIFIED_FEED_URL){
  try{published=await appendRaces(await verifiedFeed());}catch(e){errors.push('신뢰 피드: '+e.message);}
 }
 const state=(!rows.length&&!published)?'error':(errors.length?'partial':'ok');
 const summary={updatedAt:new Date().toISOString(),state,found:rows.length,added,published,errors:errors.slice(0,5)};
 try{await writePath('pacecraft_race_sync_meta',summary);}catch(e){summary.state=rows.length?'partial':'error';summary.errors.push('Firebase 상태 저장 불가');}return summary;
}
module.exports={backend,output,errorResponse,requireMethod,isAdmin,readPath,writePath,configSummary,encrypt,decrypt,externalJson,performSync,appendRaces};
