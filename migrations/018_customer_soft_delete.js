export async function up(k) {
 await k.schema.alterTable('customers',t=>{t.string('deleted_at').nullable().index();});
}
export async function down(k) {
 await k.schema.alterTable('customers',t=>{t.dropColumn('deleted_at');});
}
