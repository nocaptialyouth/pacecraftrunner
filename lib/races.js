'use strict';
const crypto = require('node:crypto');
const ALLOWED = /^https?:\/\//i;
function safeURL(raw) {
  try { const url = new URL(String(raw || ''));
    return ALLOWED.test(url.protocol+'//') && ['https:', 'http:'].includes(url.protocol) ? url.href.slice(0,1500) : '';
  } catch { return ''; }
}
function plain(input) {
  return String(input || '').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, s=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"})[s.toLowerCase()]||' ')
    .replace(/\s+/g, ' ').trim().slice(0,300);
}
function validDate(raw) {
  const s = String(raw||'');
  const m = s.match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(+d) && d.toISOString().slice(0,10) === s ? s : '';
}
function parseRaceDates(text) {
  const matches = [...String(text || '').matchAll(/(20\d{2})\s*(?:[.\-/년]\s*)(\d{1,2})\s*(?:[.\-/월]\s*)(\d{1,2})(?:\s*일)?/g)];
  return [...new Set(matches.map(m=>validDate(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`)).filter(Boolean))];
}
function kstToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
function hashId(s) {return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,20);}
function normalizeName(s) {return plain(s).replace(/[^0-9a-z가-힣]/gi,'').toLowerCase();}
function normalizeCandidate(item, source, today = kstToday()) {
  const name = plain(item.title);
  const description = plain(item.description);
  const url = safeURL(item.link);
  if (!url || !name || !/(마라톤|달리기\s*대회|하프마라톤|트레일런|러닝\s*대회|로드레이스|걷기\s*대회|런페스타|run\b|marathon)/i.test(name+' '+description)) return null;
  const dates = parseRaceDates(name+' '+description);
  const maxDate = String(Number(today.slice(0,4))+2)+'-12-31';
  const date = dates.filter(d=>d >= today && d <= maxDate).sort()[0] || '';
  return {
    id:hashId(url), name:name.slice(0,150), description:description.slice(0,240),
    url, date, source, confidence:'미확인', status:'pending',
    lastSeen:new Date().toISOString()
  };
}
function sortCandidates(input, today = kstToday()) {
  return input.filter(row => row && row.status !== 'rejected' && row.status !== 'approved' && row.url && row.name)
    .sort((a,b)=>{
      const af=a.date && a.date>=today, bf=b.date && b.date>=today;
      if(af!==bf) return af?-1:1;
      if(af&&bf && a.date!==b.date) return a.date.localeCompare(b.date);
      return String(b.lastSeen||'').localeCompare(String(a.lastSeen||''));
    });
}
function mergeCandidates(oldList, fresh, now = new Date().toISOString()) {
  const result = oldList && typeof oldList==='object' && !Array.isArray(oldList)?{...oldList}:{};
  let added=0;
  fresh.forEach(row => {
    if(!row?.id || !/^[a-f0-9]{20}$/.test(row.id))return;
    const previous=result[row.id];
    if(!previous)added++;
    result[row.id]={...row, ...(previous?{status:previous.status||'pending',firstSeen:previous.firstSeen||now}: {firstSeen:now}), lastSeen:now};
    if (previous && previous.status==='approved')result[row.id].date=previous.date;
  });
  const pending=Object.values(result).filter(x=>x.status==='pending').sort((a,b)=>String(b.lastSeen).localeCompare(String(a.lastSeen)));
  pending.slice(500).forEach(x=>{delete result[x.id];});
  return {items:result, added};
}
function raceRecord(c, official=false) {
  return {
    id:'auto_'+hashId(c.name+'|'+c.date),
    name:c.name.slice(0,150), fullName:'🏃 '+c.name.slice(0,150), date:c.date,
    course:'rolling', url:safeURL(official?(c.officialUrl||c.url):c.url),
    source:official?'verified_feed':'admin_review', verified:!!official
  };
}
function isDuplicateRace(list, race) {
  return Object.values(list||{}).some(r=>r && r.date===race.date && normalizeName(r.name)===normalizeName(race.name));
}
module.exports={safeURL,plain,validDate,parseRaceDates,kstToday,hashId,normalizeCandidate,sortCandidates,mergeCandidates,raceRecord,isDuplicateRace};
