import crypto from 'node:crypto';import {db} from '../server/db.js';
const key='connection-check-'+crypto.randomUUID();const value=crypto.randomUUID();
try{await db('settings').insert({key,value});const row=await db('settings').where({key}).first();if(row?.value!==value)throw Error('Database round-trip mismatch');console.log('Database write/read verified.');}finally{await db('settings').where({key}).del();await db.destroy();}
