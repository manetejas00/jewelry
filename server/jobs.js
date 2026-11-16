const now = () => new Date().toISOString();
const json = value => JSON.stringify(value ?? null);
const parse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const drains = new WeakMap();

export function presentJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    attempts: row.attempts,
    last_error: row.last_error || null,
    result: parse(row.result, null),
    created_at: row.created_at,
    finished_at: row.finished_at || null
  };
}

export async function enqueueJob(db, {type, payload, dedupeKey, maxAttempts = 3}) {
  if (dedupeKey) {
    const existing = await db('jobs').where({dedupe_key: dedupeKey}).whereIn('status', ['pending', 'running']).orderBy('id', 'desc').first();
    if (existing) return {job: existing, duplicate: true};
  }
  const stamp = now();
  const row = {
    type,
    payload: json(payload || {}),
    status: 'pending',
    attempts: 0,
    max_attempts: maxAttempts,
    run_at: stamp,
    dedupe_key: dedupeKey || null,
    created_at: stamp,
    updated_at: stamp
  };
  const inserted = await db('jobs').insert(row);
  const id = Array.isArray(inserted) ? inserted[0] : inserted;
  return {job: {...row, id}, duplicate: false};
}

export async function claimDueJobs(db, {limit = 5, workerId = 'web'} = {}) {
  const stamp = now();
  return db.transaction(async trx => {
    const candidates = await trx('jobs').where({status: 'pending'}).where('run_at', '<=', stamp).orderBy('id', 'asc').limit(limit);
    const claimed = [];
    for (const row of candidates) {
      const updated = await trx('jobs').where({id: row.id, status: 'pending'}).update({
        status: 'running',
        attempts: Number(row.attempts || 0) + 1,
        locked_at: stamp,
        locked_by: workerId,
        updated_at: stamp
      });
      if (updated) claimed.push({...row, status: 'running', attempts: Number(row.attempts || 0) + 1, locked_at: stamp, locked_by: workerId});
    }
    return claimed;
  });
}

async function completeJob(db, job, result) {
  const stamp = now();
  await db('jobs').where({id: job.id, status: 'running'}).update({
    status: 'done',
    result: json(result),
    last_error: null,
    finished_at: stamp,
    updated_at: stamp
  });
}

async function failJob(db, job, error) {
  const stamp = now();
  const message = String(error?.message || error || 'Job failed').slice(0, 500);
  const retryable = error?.retryable !== false && Number(job.attempts) < Number(job.max_attempts);
  if (retryable) {
    await db('jobs').where({id: job.id, status: 'running'}).update({
      status: 'pending',
      run_at: new Date(Date.now() + Number(job.attempts) * 15000).toISOString(),
      last_error: message,
      locked_by: null,
      updated_at: stamp
    });
    return;
  }
  await db('jobs').where({id: job.id, status: 'running'}).update({
    status: 'failed',
    last_error: message,
    finished_at: stamp,
    updated_at: stamp
  });
}

export async function processDueJobs(db, handlers, options = {}) {
  const claimed = await claimDueJobs(db, options);
  const finished = [];
  for (const job of claimed) {
    const handler = handlers?.[job.type];
    try {
      if (!handler) throw Object.assign(new Error('Unknown job type'), {retryable: false});
      const payload = parse(job.payload, {});
      await completeJob(db, job, await handler(db, payload, job));
    } catch (error) {
      await failJob(db, job, error);
    }
    finished.push(job.id);
  }
  return finished;
}

export async function reclaimStaleJobs(db, olderThanMs = 120000) {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const stale = await db('jobs').where({status: 'running'}).where('locked_at', '<', cutoff);
  let count = 0;
  for (const job of stale) {
    const stamp = now();
    if (Number(job.attempts) < Number(job.max_attempts)) {
      count += await db('jobs').where({id: job.id, status: 'running'}).update({status: 'pending', locked_by: null, run_at: stamp, updated_at: stamp});
    } else {
      count += await db('jobs').where({id: job.id, status: 'running'}).update({
        status: 'failed',
        last_error: 'The job stopped before it finished.',
        finished_at: stamp,
        updated_at: stamp
      });
    }
  }
  return count;
}

export function scheduleDrain(db, handlers) {
  if (!db || drains.get(db)) return;
  drains.set(db, true);
  setImmediate(async () => {
    try {
      for (let pass = 0; pass < 5; pass++) {
        const done = await processDueJobs(db, handlers, {limit: 5, workerId: 'web'});
        if (!done.length) break;
      }
    } catch (error) {
      console.error(JSON.stringify({event: 'job_drain_failed', message: error?.message || 'Job drain failed'}));
    } finally {
      drains.set(db, false);
      const pending = await db('jobs').where({status: 'pending'}).where('run_at', '<=', now()).first().catch(() => null);
      if (pending) scheduleDrain(db, handlers);
    }
  });
}
