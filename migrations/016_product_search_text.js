export async function up(k) {
  await k.schema.alterTable('products', t => {
    t.string('seo_title', 70).nullable();
    t.string('meta_description', 160).nullable();
  });
  if (!await k.schema.hasTable('ai_drafts')) return;
  const rows = await k('ai_drafts').where({skill: 'product-page-seo'}).select('id', 'output_json');
  for (const row of rows) {
    let output;
    try { output = JSON.parse(row.output_json); } catch { continue; }
    if (!output?.notes || !output.notes.includes('is not published')) continue;
    output.notes = output.notes.replace('Search text is a draft only and is not published.', 'Publish search text to set the page title and Google snippet. The on-page description stays as it is.');
    await k('ai_drafts').where({id: row.id}).update({output_json: JSON.stringify(output)});
  }
}

export async function down(k) {
  await k.schema.alterTable('products', t => {
    t.dropColumn('seo_title');
    t.dropColumn('meta_description');
  });
}
