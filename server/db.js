import 'dotenv/config';
import knex from 'knex';
import {validateRuntime} from './runtime.js';
validateRuntime();
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
fs.mkdirSync('private', {recursive:true, mode:0o700});
export const preview = process.env.PREVIEW_MODE === 'true' || (process.env.PREVIEW_MODE !== 'false' && process.env.NODE_ENV !== 'production');
export function createDb(filename) {
 const mysql = !filename && process.env.DB_CLIENT === 'mysql2';
 return knex(mysql ? {client:'mysql2', connection:{host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,timezone:'Z'},pool:{min:0,max:10}} : {client:'better-sqlite3',connection:{filename:filename || process.env.DB_FILENAME || 'private/store.sqlite'},useNullAsDefault:true,pool:{min:1,max:1},afterCreate:undefined});
}
export const db = createDb();
export async function migrate(database=db) {await database.migrate.latest({directory:fileURLToPath(new URL('../migrations', import.meta.url)),loadExtensions:['.js']});}
export const now=()=>new Date().toISOString();
export const json=x=>JSON.stringify(x);
export const parse=(x,fallback={})=>{try{return JSON.parse(x)}catch{return fallback}};
