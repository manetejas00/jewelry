import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import {validationError} from './errors.js';
export const resetConfigured=(env=process.env)=>Boolean(env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASSWORD&&env.SMTP_FROM&&env.APP_URL);
export async function sendResetMail({email,url}){
 if(!resetConfigured())throw validationError('Password recovery is not configured. Contact the merchant.',503);
 const port=Number(process.env.SMTP_PORT||465);
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:port===465,requireTLS:true,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},connectionTimeout:10000,socketTimeout:15000,logger:false,debug:false});
 try{await transport.sendMail({from:process.env.SMTP_FROM,to:email,subject:'Reset your Veyora password',text:`Open this link to reset your password within 30 minutes:\n${url}\n\nIf you did not request this, ignore this email.`});}finally{transport.close();}
}
const hash=token=>crypto.createHash('sha256').update(token).digest('hex');
export async function requestReset(k,email,send=sendResetMail){
 const normal=String(email||'').trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(normal)||normal.length>254)throw validationError('Enter a valid email address.');
 const customer=await k('customers').where({email:normal}).first();
 if(!customer)return;
 const token=crypto.randomBytes(32).toString('hex'),token_hash=hash(token);
 await k('password_resets').insert({token_hash,customer_id:customer.id,expires:Date.now()+30*60000});
 const url=new URL('/account',process.env.APP_URL);url.searchParams.set('reset',token);
 try{await send({email:customer.email,url:url.href});}catch{await k('password_resets').where({token_hash}).del();throw validationError('Password recovery is temporarily unavailable. Try again later.',503);}
}
export async function replacePassword(k, customerId, password) {
 if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) throw validationError('Choose a password of at least 12 characters, up to 72 UTF-8 bytes.');
 const password_hash = await bcrypt.hash(password, 12);
 await k('customers').where({id: customerId}).update({password_hash, session_version: k.raw('session_version + 1')});
 await k('password_resets').where({customer_id: customerId}).del();
}
export async function completeReset(k,{token,password}){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw validationError('Reset link is invalid or expired.');
 if(typeof password!=='string'||password.length<12||Buffer.byteLength(password)>72)throw validationError('Choose a password of at least 12 characters, up to 72 UTF-8 bytes.');
 const password_hash=await bcrypt.hash(password,12);
 await k.transaction(async t=>{
  const row=await t('password_resets').where({token_hash:hash(token)}).forUpdate().first();
  if(!row||Number(row.expires)<=Date.now())throw validationError('Reset link is invalid or expired.');
  // Concurrent use is serialized by the reset row; all account links expire together.
  await t('customers').where({id:row.customer_id}).update({password_hash,session_version:t.raw('session_version + 1')});
  await t('password_resets').where({customer_id:row.customer_id}).del();
 });
}
