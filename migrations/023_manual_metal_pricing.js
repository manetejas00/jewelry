export async function up(k) {
  // 1. Add manual pricing and metal columns to rates table if not existing
  const hasMetal = await k.schema.hasColumn('rates', 'metal');
  if (!hasMetal) {
    await k.schema.table('rates', (t) => {
      t.string('metal', 50).defaultTo('Gold').index();
      t.integer('staff_id').nullable();
      t.string('staff_name', 100).nullable();
      t.string('source_type', 50).defaultTo('manual');
      t.text('notes').nullable();
    });
  }

  // 2. Backfill existing rows with metal
  await k('rates').whereNull('metal').update({ metal: 'Gold' });
  await k('rates').whereIn('purity', ['999', '925', 'Silver']).update({ metal: 'Silver' });

  // 3. For persistent non-test instances, ensure baseline initial rates exist if rates table is populated
  const isMemory = k.client?.config?.connection?.filename === ':memory:';
  if (!isMemory && process.env.NODE_ENV !== 'test') {
    const todayIndia = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
    const nowIso = new Date().toISOString();

    const standardRates = [
      { metal: 'Gold', purity: '24K', original_unit: '10g', original_rate: 100000, inr_per_gram: 10000 },
      { metal: 'Gold', purity: '22K', original_unit: 'g', original_rate: 9200, inr_per_gram: 9200 },
      { metal: 'Gold', purity: '20K', original_unit: 'g', original_rate: 8350, inr_per_gram: 8350 },
      { metal: 'Gold', purity: '18K', original_unit: 'g', original_rate: 7500, inr_per_gram: 7500 },
      { metal: 'Gold', purity: '14K', original_unit: 'g', original_rate: 5850, inr_per_gram: 5850 },
      { metal: 'Silver', purity: '999', original_unit: 'kg', original_rate: 120000, inr_per_gram: 120 },
      { metal: 'Silver', purity: '925', original_unit: 'g', original_rate: 110, inr_per_gram: 110 }
    ];

    for (const item of standardRates) {
      const existing = await k('rates').where({ metal: item.metal, purity: item.purity }).first();
      if (!existing) {
        await k('rates').insert({
          metal: item.metal,
          supplier: 'Veyora Internal',
          purity: item.purity,
          currency: 'INR',
          original_unit: item.original_unit,
          original_rate: item.original_rate,
          inr_per_gram: item.inr_per_gram,
          effective_date: todayIndia,
          source_timestamp: nowIso,
          published_at: nowIso,
          batch_id: null,
          staff_id: null,
          staff_name: 'System Initializer',
          source_type: 'initial_baseline',
          notes: `Initial default rate for ${item.metal} ${item.purity}`
        });
      }
    }

    const silver999 = await k('rates').where({ metal: 'Silver', purity: '999' }).orderBy('id', 'desc').first();
    if (silver999) {
      const silverRate = String(silver999.inr_per_gram);
      const hasSilverSetting = await k('settings').where({ key: 'SILVER_RATE_PER_GRAM' }).first();
      if (!hasSilverSetting) {
        await k('settings').insert({ key: 'SILVER_RATE_PER_GRAM', value: silverRate });
      } else {
        await k('settings').where({ key: 'SILVER_RATE_PER_GRAM' }).update({ value: silverRate });
      }

      const hasSilverUpdatedSetting = await k('settings').where({ key: 'SILVER_RATE_UPDATED_AT' }).first();
      if (!hasSilverUpdatedSetting) {
        await k('settings').insert({ key: 'SILVER_RATE_UPDATED_AT', value: nowIso });
      } else {
        await k('settings').where({ key: 'SILVER_RATE_UPDATED_AT' }).update({ value: nowIso });
      }
    }
  }
}

export async function down(k) {
  try {
    await k.schema.table('rates', (t) => {
      t.dropColumn('notes');
      t.dropColumn('source_type');
      t.dropColumn('staff_name');
      t.dropColumn('staff_id');
      t.dropColumn('metal');
    });
  } catch {}
}
