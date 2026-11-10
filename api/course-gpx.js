'use strict';
const hosts=new Set(['marathon.jtbc.com','cdn.imweb.me','www.chuncheonmarathon.com','chuncheonmarathon.com','www.gyeongjumarathon.com','gyeongjumarathon.com','seoul-marathon.com','www.seoul-marathon.com','daegumarathon.daegu.go.kr','www.jinma.co.kr','jinma.co.kr','busanmarathon.com','www.busanmarathon.com']);
const maxBytes=8_000_000;
function validateUrl(s){
  const u=new URL(s);
  if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.has(u.hostname.toLowerCase())||!(/\.gpx$/i.test(u.pathname)))throw new Error('허용된 주최측 HTTPS .gpx 직접 링크만 가져올 수 있습니다. 다른 파일은 다운로드 후 직접 업로드하세요.');
  return u.href;
}
async function fetchGPX(url,fetchFn=fetch){
  const parsed=validateUrl(url),ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);
  try{
    const r=await fetchFn(parsed,{signal:ctl.signal,redirect:'error',headers:{Accept:'application/gpx+xml,text/xml,application/xml,text/plain'}});
    if(!r.ok)throw new Error('GPX 다운로드 오류 ('+r.status+')');
    if(Number(r.headers.get('content-length')||0)>maxBytes)throw new Error('파일이 8MB를 초과합니다.');
    const reader=r.body?.getReader();if(!reader)throw new Error('파일 응답이 비어 있습니다.');
    const chunks=[];let n=0;
    while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>maxBytes){await reader.cancel();throw new Error('파일이 8MB를 초과합니다.');}chunks.push(value);}
    const buf=Buffer.concat(chunks.map(v=>Buffer.from(v)));
    const text=new TextDecoder('utf-8',{fatal:false}).decode(buf);
    if(!/<(?:[A-Za-z0-9_-]+:)?gpx(?:\s|>)/i.test(text.slice(0,5000)))throw new Error('GPX 파일 형식이 아닙니다.');
    return text;
  }finally{clearTimeout(timer);}
}
async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST only'});
  try{
    const url=req.body?.url;
    if(typeof url!=='string'||url.length>2048)throw new Error('유효한 GPX 주소를 입력하세요.');
    const gpx=await fetchGPX(url);
    return res.status(200).json({ok:true,gpx});
  }catch(e){return res.status(400).json({ok:false,error:e.name==='AbortError'?'GPX 서버 응답 시간 초과':e.message||'GPX 파일을 읽지 못했습니다.'});}
}
module.exports=handler;module.exports.validateUrl=validateUrl;module.exports.fetchGPX=fetchGPX;
