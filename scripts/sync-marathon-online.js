'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const BASE='http://www.marathon.pe.kr/';
const OUT='data/marathon-online-races.json';
const BOT='PacecraftRunnerScheduleBot/1.0 (+https://pacecraftrunner.vercel.app/)';
const HOSTS=new Set(['www.marathon.pe.kr','marathon.pe.kr']);
function plain(s){return String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&(nbsp|amp|lt|gt|quot);/gi,(_,n)=>({nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"'}[n.toLowerCase()])).replace(/\s+/g,' ').trim().slice(0,200);}
function kst(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function validDate(v){if(!/^20\d{2}-\d{2}-\d{2}$/.test(v||''))return '';const d=new Date(v+'T00:00:00Z');return Number.isNaN(+d)||d.toISOString().slice(0,10)!==v?'':v;}
function dateIn(s,year){const t=plain(s);let m=t.match(/(20\d{2})\s*[.\/\-년]\s*(\d{1,2})\s*[.\/\-월]\s*(\d{1,2})/);if(!m)m=t.match(/(?:^|\s)(\d{1,2})\s*[.\/\-월]\s*(\d{1,2})(?:\s*일)?(?:\s|$)/);if(!m)return '';const parts=m.length===4?[m[1],m[2],m[3]]:[year,m[1],m[2]];return validDate(String(parts[0])+'-'+String(parts[1]).padStart(2,'0')+'-'+String(parts[2]).padStart(2,'0'));}
function courses(s){const t=plain(s).toLowerCase(),r=[];if(/풀\s*코스|(?:^|[^\w])풀(?:[^\w]|$)|full|42\.195\s*km/.test(t))r.push('풀');if(/하프|half|21\.0975\s*km/.test(t))r.push('하프');for(const n of ['100','65','50','30','15','10','5','4.4','3'])if(new RegExp('(?:^|[^0-9])'+n.replace('.','\\.')+'\\s*(?:km|k)(?![0-9])','i').test(t))r.push(n+'km');return r;}
function safeUrl(s,base){try{const u=new URL(String(s||'').replace(/&amp;/g,'&'),base);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href.slice(0,800):'';}catch{return '';}}
function links(html,base){const arr=[];for(const m of String(html).matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)){const url=safeUrl(m[1]||m[2]||m[3],base);if(url)arr.push({url,label:plain(m[4])});}return arr;}
function raceName(s){return /(마라톤|달리기|하프|러닝|트레일|런페스타|로드레이스|marathon)/i.test(s)&&s.length>=5;}
function parseRows(html,pageUrl,today=kst()){
 const head=String(html).slice(0,6000),ym=head.match(/20\d{2}/),year=ym?Number(ym[0]):Number(today.slice(0,4));
 const out=[];
 for(const m of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const body=m[1],cells=[...body.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>plain(x[1]));
  if(cells.length<2)continue;
  const date=dateIn(cells.slice(0,3).join(' '),year);
  if(!date||date<today||date>String(+today.slice(0,4)+2)+'-12-31')continue;
  const anchors=links(body,pageUrl),raceLink=anchors.find(x=>raceName(x.label));
  const name=(raceLink?.label||cells.find((x,i)=>i>0&&raceName(x)))?.slice(0,140);
  if(!name)continue;
  const location=cells.find((x,i)=>i>1&&i<6&&x.length>2&&x.length<60&&!raceName(x)&&!courses(x).length)||'';
  out.push({id:crypto.createHash('sha256').update(name+'|'+date).digest('hex').slice(0,20),name,date,
   url:raceLink?.url||pageUrl,sourceUrl:pageUrl,source:'마라톤온라인 대회일정',location,courses:courses(cells.join(' ')),confidence:'미확인',status:'pending'});
 }
 return out;
}
function nextPages(html,url){const result=[];
 for(const a of links(html,url))if(/대회일정|국내대회|일정표|roadrun|schedule/i.test(a.label+' '+a.url))result.push(a.url);
 for(const m of String(html).matchAll(/<(?:frame|iframe)\b[^>]*src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi))result.push(safeUrl(m[1]||m[2]||m[3],url));
 return [...new Set(result)].filter(s=>s&&HOSTS.has(new URL(s).hostname)).slice(0,8);
}
function allowed(robots,target){
 const rules=String(robots).split(/\r?\n/),agent=BOT.toLowerCase().split('/')[0];let match=false,best=-1,permit=true;
 for(const raw of rules){const line=raw.split('#')[0].trim(),m=line.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);if(!m)continue;
 const key=m[1].toLowerCase(),v=m[2].trim();if(key==='user-agent'){match=v==='*'||agent.includes(v.toLowerCase());continue;}
 if(!match||!v)continue;const p=v.split('*')[0].replace(/\$$/,'');
 if(new URL(target).pathname.startsWith(p)&&p.length>=best){if(p.length>best||key==='allow'){best=p.length;permit=key==='allow';}}
 }
 return permit;
}
async function get(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
 try{const res=await fetch(url,{headers:{'User-Agent':BOT,'Accept':'text/html, text/plain'},signal:controller.signal});
 if(!HOSTS.has(new URL(res.url).hostname))throw Error('다른 호스트 리디렉션 거부: '+new URL(res.url).hostname);
 if(!res.ok)throw Error('HTTP '+res.status+' '+url);
 const b=Buffer.from(await res.arrayBuffer());if(b.length>1500000)throw Error('응답 크기 초과');
 const c=res.headers.get('content-type')||'',charset=c.match(/charset=["']?([\w-]+)/i)?.[1]||b.toString('ascii',0,600).match(/charset=["']?([\w-]+)/i)?.[1]||'euc-kr';
 let html;try{html=new TextDecoder(charset).decode(b)}catch{html=new TextDecoder('utf-8').decode(b)}
 return {url:res.url,html};
 }finally{clearTimeout(timer);}
}
async function collect(){
 let robots='';
 try{robots=(await get(new URL('/robots.txt',BASE).href)).html;}catch(e){if(!/HTTP 404\b/.test(e.message))throw Error('robots.txt 확인 실패: '+e.message);}
 const queue=[BASE],seen=new Set(),items=[],errors=[];
 while(queue.length&&seen.size<6){const url=queue.shift();if(seen.has(url))continue;seen.add(url);
 if(!allowed(robots,url)){errors.push('robots.txt 수집 제한: '+url);continue;}
 try{const page=await get(url);items.push(...parseRows(page.html,page.url));for(const link of nextPages(page.html,page.url))if(!seen.has(link)&&!queue.includes(link))queue.push(link);}
 catch(e){errors.push(e.message);}
 if(queue.length)await new Promise(done=>setTimeout(done,550));
 }
 const rows=[...new Map(items.map(x=>[x.name+'|'+x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,50);
 if(!rows.length)throw Error('원본에서 유효한 대회 날짜를 수집하지 못했습니다. 이전 파일 보존: '+errors.slice(0,4).join('; '));
 const result={schemaVersion:1,sourceName:'마라톤온라인 (Roadrun)',sourceUrl:BASE,
  asOf:kst(),updatedAt:new Date().toISOString(),status:'auto',races:rows};
 fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');console.log('일정 수집 성공:',rows.length,'건');
}
if(require.main===module)collect().catch(e=>{console.error('[marathon-sync]',e.message);process.exitCode=1});
module.exports={plain,kst,validDate,dateIn,courses,parseRows,allowed,nextPages,collect};
