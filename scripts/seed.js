import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import {db,migrate,preview} from '../server/db.js';
import {previewImport,publishImport} from '../server/importer.js';
import {writeSamples} from './samples.js';
export async function seed(k=db){if(!preview)throw Error('Fictional seed data is restricted to preview mode');if(!(await k('staff').first()))await k('staff').insert({email:'preview@veyora.local',password_hash:await bcrypt.hash('preview-veyora-2026',12),role:'owner'});if(!(await k('products').first())){writeSamples();for(const [kind,file] of [['gold','gold-rates'],['products','products']]){const batch=await previewImport(k,kind,fs.readFileSync(`samples/${file}-example.csv`,'utf8'));if(batch.errors.length)throw Error(JSON.stringify(batch.errors));await publishImport(k,batch.id);}}}
if(process.argv[1]?.endsWith('/seed.js')){await migrate();await seed();await db.destroy();}
