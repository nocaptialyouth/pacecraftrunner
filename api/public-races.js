'use strict';
const {backend,output,errorResponse,requireMethod,readPath}=require('../lib/backend');
const {sortCandidates}=require('../lib/races');
module.exports=async function handler(req,res){
  try{
    requireMethod(req,'GET');backend();
    const [items,meta]=await Promise.all([readPath('pacecraft_race_candidates'),readPath('pacecraft_race_sync_meta')]);
    const rows=sortCandidates(Object.values(items||{})).slice(0,100)
      .map(c=>({id:c.id,name:c.name,date:c.date||'',url:c.url,source:c.source,confidence:'미확인',lastSeen:c.lastSeen}));
    output(res,200,{ok:true,candidates:rows.slice(0,30),updatedAt:meta?.updatedAt||null,state:meta?.state||'never',warning:meta?.state==='error'?'마지막 자동 갱신에 실패했습니다.':'',count:rows.length});
  }catch(e){errorResponse(res,e);}
};
