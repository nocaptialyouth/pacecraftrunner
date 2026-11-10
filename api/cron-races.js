'use strict';
const {output,errorResponse,requireMethod,performSync}=require('../lib/backend');
module.exports=async function handler(req,res){
  try{
    requireMethod(req,'GET');
    if(!process.env.CRON_SECRET) return output(res,503,{ok:false,error:'CRON_SECRET 미설정'});
    if(req.headers.authorization!==`Bearer ${process.env.CRON_SECRET}`)return output(res,401,{ok:false,error:'인증되지 않은 예약 작업'});
    const result=await performSync();
    output(res,result.state==='error'?502:200,{ok:result.state!=='error',...result});
  }catch(e){errorResponse(res,e);}
};
