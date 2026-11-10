// Supplier CSV limit is 5 MB; MySQL TEXT holds only 64 KiB.
export async function up(k){if(k.client.config.client==='mysql2')await k.schema.alterTable('import_batches',t=>{t.text('private_payload','longtext').alter();t.text('summary','longtext').alter();});}
export async function down(){/* Retain capacity: narrowing columns could truncate existing data. */}
