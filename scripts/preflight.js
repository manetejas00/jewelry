import 'dotenv/config';
import fs from 'node:fs';
import {validateRuntime,commerceConfig} from '../server/runtime.js';
validateRuntime({...process.env,NODE_ENV:'production'});
if(!fs.existsSync('dist/index.html'))throw Error('Build frontend assets before preflight');
if(process.env.PAYMENT_MODE==='cod'&&!commerceConfig().checkoutEnabled)throw Error('COD requires approved merchant contact and policies');
console.log('Production configuration and frontend build checks passed. Remote database, backups and integrations still require host verification.');
