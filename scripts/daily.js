import {db} from '../server/db.js';import {daily} from '../server/daily.js';
try{const r=await daily(db,'scheduled');console.log(JSON.stringify(r));if(Object.values(r.result).some(x=>!x.ok))process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.destroy();}
