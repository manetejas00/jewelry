export async function up(k){
 await k.schema.alterTable('customers',t=>{t.integer('session_version').notNullable().defaultTo(0);});
 await k.schema.createTable('password_resets',t=>{t.string('token_hash',64).primary();t.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('CASCADE');t.bigInteger('expires').index();});
}
export async function down(k){await k.schema.dropTable('password_resets');await k.schema.alterTable('customers',t=>{t.dropColumn('session_version');});}
