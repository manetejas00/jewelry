import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {db} from '../server/db.js';
import {ProductSeeder} from './ProductSeeder.js';
// Explicit catalogue command. The web server's startup seeder stays unchanged.
export async function DatabaseSeeder(k=db){return {products:await ProductSeeder(k)}}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await DatabaseSeeder(),null,2))}catch(e){console.error(e.message);process.exitCode=1}finally{await db.destroy()}
}
