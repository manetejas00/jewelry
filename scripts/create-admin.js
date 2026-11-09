import bcrypt from 'bcryptjs';
import {db,migrate} from '../server/db.js';
if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<16)throw Error('Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 16 characters');
const role=process.env.STAFF_ROLE||'owner';if(!['owner','manager','viewer'].includes(role))throw Error('Invalid STAFF_ROLE');
await migrate();await db('staff').insert({email:process.env.ADMIN_EMAIL.toLowerCase(),password_hash:await bcrypt.hash(process.env.ADMIN_PASSWORD,12),role});console.log('Owner created. Remove ADMIN_PASSWORD from environment.');await db.destroy();
