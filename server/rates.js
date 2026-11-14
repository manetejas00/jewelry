import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';
import {parse as csvParse} from 'csv-parse/sync';
import {stringify} from 'csv-stringify/sync';
import {validationError} from './errors.js';
import {now,json,parse,preview} from './db.js';
import {activeRates,isFresh,todayIndia,fingerprint} from './pricing.js';

export const GOLD_PURITIES = ['24K', '22K', '20K', '18K', '14K'];
export const SILVER_PURITIES = ['999', '925'];
export const ALL_PURITIES = [...GOLD_PURITIES, ...SILVER_PURITIES];
export const RATE_COLUMNS = ['supplier', 'metal', 'purity', 'currency', 'unit', 'rate', 'effective_date', 'source_timestamp'];

const num = v => /^\d+(\.\d{1,4})?$/.test(String(v).trim()) && Number(v) <= 9999999999;
const timestamp = v => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(String(v).trim()) && !isNaN(Date.parse(v));

export function detectMetal(purity, explicitMetal) {
  if (explicitMetal && ['Gold', 'Silver'].includes(explicitMetal)) {
    return explicitMetal;
  }
  const cleanP = String(purity || '').trim().toUpperCase();
  if (SILVER_PURITIES.includes(cleanP) || cleanP === 'SILVER') return 'Silver';
  return 'Gold';
}

export function normaliseMetalRate(r) {
  const metal = detectMetal(r.purity, r.metal);
  const rateNum = new Decimal(r.rate);
  let inr_per_gram;
  if (r.unit === '10g') {
    inr_per_gram = rateNum.div(10).toFixed(4);
  } else if (r.unit === 'kg') {
    inr_per_gram = rateNum.div(1000).toFixed(4);
  } else {
    inr_per_gram = rateNum.toFixed(4);
  }
  return {
    ...r,
    metal,
    original_unit: r.unit,
    original_rate: Number(r.rate),
    inr_per_gram: Number(inr_per_gram)
  };
}

export function parseRateFileToCsv(input) {
  if (!input) throw validationError('No file content provided');
  // Handle base64 or buffer
  if (Buffer.isBuffer(input) || (typeof input === 'string' && (input.startsWith('data:application/vnd') || input.startsWith('UEsDB') || input.startsWith('0M8R4')))) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input.replace(/^data:[^;]+;base64,/, ''), 'base64');
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw validationError('Excel file contains no worksheets');
    return XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
  }
  return String(input);
}

export function validateRatesCsv(text) {
  const errors = [];
  let rows = [];
  const error = (row, field, value, correction) => errors.push({ row, field, value: String(value ?? ''), correction });

  try {
    rows = csvParse(text, {
      columns: headers => {
        const joined = headers.map(h => h.trim().toLowerCase()).join(',');
        const schema8 = RATE_COLUMNS.join(',');
        const schema7 = 'supplier,purity,currency,unit,rate,effective_date,source_timestamp';
        if (joined !== schema8 && joined !== schema7) {
          throw validationError('CSV headers must match the template: ' + RATE_COLUMNS.join(', '));
        }
        return headers.map(h => h.trim().toLowerCase());
      },
      skip_empty_lines: true,
      bom: true,
      trim: true,
      max_record_size: 100000
    });
  } catch (e) {
    return { rows: [], errors: [{ row: 1, field: 'file', value: 'File format', correction: e.message }] };
  }

  if (!rows.length) error(1, 'file', '', 'Add at least one rate row');
  if (rows.length > 1000) error(1, 'file', rows.length, 'Maximum 1,000 rows per batch');

  const seen = new Set();
  const today = todayIndia();

  rows.forEach((r, i) => {
    const rowNum = i + 2;
    const metal = detectMetal(r.purity, r.metal);
    r.metal = metal;

    for (const f of ['supplier', 'purity', 'currency', 'unit', 'rate', 'effective_date', 'source_timestamp']) {
      if (!r[f]) error(rowNum, f, r[f], `Supply a value for ${f}`);
    }

    if (r.currency !== 'INR') {
      error(rowNum, 'currency', r.currency, 'Only explicit INR currency is supported');
    }

    const cleanP = String(r.purity || '').trim().toUpperCase();
    r.purity = cleanP;

    if (metal === 'Gold') {
      if (!GOLD_PURITIES.includes(cleanP)) {
        error(rowNum, 'purity', r.purity, `Gold purity must be one of: ${GOLD_PURITIES.join(', ')}`);
      }
      if (!['g', '10g'].includes(r.unit)) {
        error(rowNum, 'unit', r.unit, 'Gold rate unit must be g or 10g');
      }
    } else {
      if (!SILVER_PURITIES.includes(cleanP)) {
        error(rowNum, 'purity', r.purity, `Silver purity must be one of: ${SILVER_PURITIES.join(', ')}`);
      }
      if (!['g', 'kg'].includes(r.unit)) {
        error(rowNum, 'unit', r.unit, 'Silver rate unit must be g or kg');
      }
    }

    if (!num(r.rate) || Number(r.rate) <= 0) {
      error(rowNum, 'rate', r.rate, 'Use a positive decimal rate');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.effective_date) || isNaN(Date.parse(r.effective_date)) || r.effective_date > today) {
      error(rowNum, 'effective_date', r.effective_date, 'Use YYYY-MM-DD effective date no later than today');
    }

    if (!timestamp(r.source_timestamp) || Date.parse(r.source_timestamp) > Date.now() + 300000) {
      error(rowNum, 'source_timestamp', r.source_timestamp, 'Use an ISO UTC timestamp no later than now');
    }

    const key = `${r.supplier}:${metal}:${cleanP}`;
    if (seen.has(key)) {
      error(rowNum, 'purity', key, `Remove duplicate entry for ${metal} ${cleanP}`);
    }
    seen.add(key);
  });

  return { rows, errors };
}

export function registerRateRoutes(app, { db, route, auth, audit }) {
  // 1. GET /api/admin/rates - Current active rates + paginated history
  app.get('/api/admin/rates', auth(), route(async (req, res) => {
    const active = await activeRates(db);
    const goldPurities = ['24K', '22K', '20K', '18K', '14K'];
    const silverPurities = ['999', '925'];

    // Assemble current active rates for standard purities
    const current = {
      gold: {},
      silver: {}
    };

    for (const p of goldPurities) {
      const r = active[p] || active[`Gold_${p}`] || null;
      current.gold[p] = r ? {
        metal: 'Gold',
        purity: p,
        inr_per_gram: Number(r.inr_per_gram),
        rate_per_10g: Number(r.inr_per_gram) * 10,
        original_rate: Number(r.original_rate),
        original_unit: r.original_unit,
        effective_date: r.effective_date,
        source_timestamp: r.source_timestamp,
        published_at: r.published_at,
        staff_name: r.staff_name || r.supplier || 'Admin',
        source_type: r.source_type || 'manual',
        notes: r.notes || null,
        is_fresh: isFresh(r)
      } : null;
    }

    for (const p of silverPurities) {
      const r = active[p] || active[`Silver_${p}`] || null;
      current.silver[p] = r ? {
        metal: 'Silver',
        purity: p,
        inr_per_gram: Number(r.inr_per_gram),
        rate_per_kg: Number(r.inr_per_gram) * 1000,
        original_rate: Number(r.original_rate),
        original_unit: r.original_unit,
        effective_date: r.effective_date,
        source_timestamp: r.source_timestamp,
        published_at: r.published_at,
        staff_name: r.staff_name || r.supplier || 'Admin',
        source_type: r.source_type || 'manual',
        notes: r.notes || null,
        is_fresh: isFresh(r)
      } : null;
    }

    // Settings fallback check for silver
    const silverSetting = await db('settings').where({ key: 'SILVER_RATE_PER_GRAM' }).first();
    const silverUpdated = await db('settings').where({ key: 'SILVER_RATE_UPDATED_AT' }).first();
    const silverPerGram = current.silver['999']?.inr_per_gram || Number(silverSetting?.value || 120);

    // Paginated history with filtering
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let query = db('rates');
    let countQuery = db('rates');

    if (req.query.metal && ['Gold', 'Silver'].includes(req.query.metal)) {
      query = query.where({ metal: req.query.metal });
      countQuery = countQuery.where({ metal: req.query.metal });
    }

    if (req.query.purity && ALL_PURITIES.includes(req.query.purity)) {
      query = query.where({ purity: req.query.purity });
      countQuery = countQuery.where({ purity: req.query.purity });
    }

    if (req.query.q) {
      const search = `%${req.query.q.trim()}%`;
      const filterClause = function () {
        this.where('staff_name', 'like', search)
          .orWhere('notes', 'like', search)
          .orWhere('supplier', 'like', search)
          .orWhere('purity', 'like', search);
      };
      query = query.where(filterClause);
      countQuery = countQuery.where(filterClause);
    }

    if (req.query.from) {
      query = query.where('effective_date', '>=', req.query.from);
      countQuery = countQuery.where('effective_date', '>=', req.query.from);
    }
    if (req.query.to) {
      query = query.where('effective_date', '<=', req.query.to);
      countQuery = countQuery.where('effective_date', '<=', req.query.to);
    }

    const [totalRow] = await countQuery.count('id as count');
    const totalCount = Number(totalRow.count || 0);

    const history = await query
      .select('id', 'metal', 'purity', 'currency', 'original_unit', 'original_rate', 'inr_per_gram', 'effective_date', 'source_timestamp', 'published_at', 'staff_id', 'staff_name', 'source_type', 'notes')
      .orderBy('effective_date', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      current,
      silverPerGram,
      silverUpdated: silverUpdated?.value || null,
      history,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1
      }
    });
  }));

  // 2. POST /api/admin/rates - Manual price update (single or multiple)
  app.post('/api/admin/rates', auth(['owner', 'manager']), route(async (req, res) => {
    const rawRates = Array.isArray(req.body.rates) ? req.body.rates : [req.body];
    if (!rawRates.length) throw validationError('Provide at least one metal rate to update');

    const staffId = req.session.staff.id;
    const staffName = req.session.staff.email || 'Admin Staff';
    const nowIso = now();
    const today = todayIndia();

    const normalized = [];
    for (const r of rawRates) {
      if (!r || typeof r !== 'object') throw validationError('Invalid rate object');
      const metal = detectMetal(r.purity, r.metal);
      const purity = String(r.purity || '').trim().toUpperCase();

      if (metal === 'Gold') {
        if (!GOLD_PURITIES.includes(purity)) {
          throw validationError(`Gold purity must be one of: ${GOLD_PURITIES.join(', ')}`);
        }
        if (!['g', '10g'].includes(r.unit)) {
          throw validationError('Gold unit must be g or 10g');
        }
      } else {
        if (!SILVER_PURITIES.includes(purity)) {
          throw validationError(`Silver purity must be one of: ${SILVER_PURITIES.join(', ')}`);
        }
        if (!['g', 'kg'].includes(r.unit)) {
          throw validationError('Silver unit must be g or kg');
        }
      }

      const rateVal = Number(r.rate);
      if (!Number.isFinite(rateVal) || rateVal <= 0) {
        throw validationError(`Rate for ${metal} ${purity} must be a positive number`);
      }

      const effDate = r.effective_date ? String(r.effective_date).slice(0, 10) : today;
      if (effDate > today) {
        throw validationError('Effective date cannot be in the future');
      }

      let inrPerGram;
      if (r.unit === '10g') inrPerGram = new Decimal(rateVal).div(10).toNumber();
      else if (r.unit === 'kg') inrPerGram = new Decimal(rateVal).div(1000).toNumber();
      else inrPerGram = rateVal;

      normalized.push({
        metal,
        supplier: 'Veyora Internal',
        purity,
        currency: 'INR',
        original_unit: r.unit,
        original_rate: rateVal,
        inr_per_gram: inrPerGram,
        effective_date: effDate,
        source_timestamp: nowIso,
        published_at: nowIso,
        batch_id: null,
        staff_id: staffId,
        staff_name: staffName,
        source_type: 'manual',
        notes: r.notes ? String(r.notes).trim() : null
      });
    }

    await db.transaction(async (t) => {
      for (const row of normalized) {
        await t('rates').insert(row);
        // Synchronize silver settings if silver 999 is updated
        if (row.metal === 'Silver' && row.purity === '999') {
          await t('settings').insert({ key: 'SILVER_RATE_PER_GRAM', value: String(row.inr_per_gram) }).onConflict('key').merge();
          await t('settings').insert({ key: 'SILVER_RATE_UPDATED_AT', value: nowIso }).onConflict('key').merge();
        }
      }
      await audit(req, 'rate_manual_update', { count: normalized.length, rates: normalized.map(r => ({ metal: r.metal, purity: r.purity, rate: r.inr_per_gram })) });
    });

    res.json({ ok: true, count: normalized.length, message: `Successfully updated ${normalized.length} metal rate(s)` });
  }));

  // 3. POST /api/admin/rates/preview - Preview CSV or Excel upload
  app.post('/api/admin/rates/preview', auth(['owner', 'manager']), route(async (req, res) => {
    let csvText = '';
    if (req.body.file) {
      csvText = parseRateFileToCsv(req.body.file);
    } else if (typeof req.body.csv === 'string') {
      csvText = parseRateFileToCsv(req.body.csv);
    } else {
      throw validationError('Upload a CSV or Excel (.xlsx/.xls) file');
    }

    const checksum = fingerprint(csvText);
    const check = validateRatesCsv(csvText);
    const supplier = check.rows[0]?.supplier || 'Veyora Internal';

    if (!preview && check.rows.some(r => r.supplier === 'Fictional Preview')) {
      check.errors.push({ row: 1, field: 'supplier', value: 'Fictional Preview', correction: 'Fictional rates are restricted to preview/test environments' });
    }

    const existing = await db('import_batches').where({ kind: 'rates', supplier, checksum }).first();
    if (existing) {
      return res.json({
        ...existing,
        summary: parse(existing.summary),
        errors: await db('import_errors').where({ batch_id: existing.id }),
        duplicate: true
      });
    }

    const active = await activeRates(db);
    const changes = [];
    for (const r of check.rows) {
      const norm = normaliseMetalRate(r);
      const prev = active[r.purity] || active[`${norm.metal}_${r.purity}`];
      changes.push({
        metal: norm.metal,
        purity: r.purity,
        unit: r.unit,
        entered_rate: Number(r.rate),
        inr_per_gram: norm.inr_per_gram,
        before: prev?.inr_per_gram ?? null,
        after: norm.inr_per_gram,
        diff: prev ? Number((norm.inr_per_gram - Number(prev.inr_per_gram)).toFixed(2)) : 0
      });
    }

    const summary = {
      total_rows: check.rows.length,
      valid_rows: check.rows.length - check.errors.length,
      rejected: check.errors.length,
      changes
    };

    const batchData = {
      kind: 'rates',
      supplier,
      checksum,
      source_timestamp: check.rows[0]?.source_timestamp || now(),
      status: check.errors.length ? 'failed' : 'staged',
      summary: json(summary),
      private_payload: csvText,
      created_at: now(),
      staff_id: req.session.staff.id
    };

    const [id] = await db('import_batches').insert(batchData);
    for (const e of check.errors) {
      await db('import_errors').insert({ ...e, batch_id: id });
    }

    res.json({
      id,
      ...batchData,
      summary,
      errors: check.errors,
      changes
    });
  }));

  // 4. POST /api/admin/rates/publish - Commit staged batch
  app.post('/api/admin/rates/publish', auth(['owner', 'manager']), route(async (req, res) => {
    const id = Number(req.body.id || req.params.id);
    if (!id) throw validationError('Provide a batch ID to publish');

    const result = await db.transaction(async (t) => {
      const batch = await t('import_batches').where({ id }).first();
      if (!batch) throw validationError('Batch not found');
      if (batch.status === 'published') return { duplicate: true, ...parse(batch.summary) };
      if (batch.status !== 'staged') throw validationError('Batch is rejected; upload a corrected file');

      const { rows, errors } = validateRatesCsv(batch.private_payload);
      if (errors.length) throw validationError('Batch data contains validation errors and cannot be published');

      const staffName = req.session.staff.email || 'Admin Staff';
      const nowIso = now();
      let created = 0;

      for (const r of rows) {
        const norm = normaliseMetalRate(r);
        await t('rates').insert({
          metal: norm.metal,
          supplier: r.supplier,
          purity: r.purity,
          currency: r.currency,
          original_unit: norm.original_unit,
          original_rate: norm.original_rate,
          inr_per_gram: norm.inr_per_gram,
          effective_date: r.effective_date,
          source_timestamp: r.source_timestamp,
          published_at: nowIso,
          batch_id: batch.id,
          staff_id: req.session.staff.id,
          staff_name: staffName,
          source_type: 'bulk_import',
          notes: `Imported via Batch #${batch.id}`
        });
        created++;

        if (norm.metal === 'Silver' && norm.purity === '999') {
          await t('settings').insert({ key: 'SILVER_RATE_PER_GRAM', value: String(norm.inr_per_gram) }).onConflict('key').merge();
          await t('settings').insert({ key: 'SILVER_RATE_UPDATED_AT', value: nowIso }).onConflict('key').merge();
        }
      }

      await t('import_batches').where({ id }).update({ status: 'published', published_at: nowIso });
      await audit(req, 'rate_batch_published', { batch_id: id, count: created });
      return { ok: true, created, batch_id: id };
    });

    res.json(result);
  }));

  // 5. GET /api/admin/rates/export - Export rates history as CSV or Excel
  app.get('/api/admin/rates/export', auth(), route(async (req, res) => {
    const format = (req.query.format || 'csv').toLowerCase();
    const rows = await db('rates')
      .select('id', 'metal', 'purity', 'currency', 'original_unit', 'original_rate', 'inr_per_gram', 'effective_date', 'source_timestamp', 'published_at', 'staff_name', 'source_type', 'notes')
      .orderBy('effective_date', 'desc')
      .orderBy('id', 'desc');

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `metal-rates-${dateStr}`;

    if (format === 'xlsx' || format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Metal Rates');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return res.send(buffer);
    }

    const csvText = stringify(rows, { header: true });
    res.type('text/csv').attachment(`${filename}.csv`).send(csvText);
  }));
}
