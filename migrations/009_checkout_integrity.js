export async function up(k){
 await k.schema.alterTable('orders',t=>{t.string('retry_fingerprint',64).nullable();});
}
export async function down(k){await k.schema.alterTable('orders',t=>{t.dropColumn('retry_fingerprint');});}
