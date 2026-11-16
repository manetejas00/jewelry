import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createDb, migrate} from '../server/db.js';
import {enqueueJob, processDueJobs, reclaimStaleJobs, presentJob} from '../server/jobs.js';

let db;

before(async () => {
  db = createDb(':memory:');
  await migrate(db);
});

after(async () => {
  await db.destroy();
});

test('a queued job runs once and stores its result', async () => {
  await db('jobs').del();
  const {job} = await enqueueJob(db, {type: 'test.echo', payload: {n: 4}});
  const done = await processDueJobs(db, {'test.echo': async (_db, payload) => ({heard: payload.n})});
  assert.deepEqual(done, [job.id]);
  const stored = presentJob(await db('jobs').where({id: job.id}).first());
  assert.equal(stored.status, 'done');
  assert.equal(stored.result.heard, 4);
  const again = await processDueJobs(db, {'test.echo': async () => ({heard: 0})});
  assert.equal(again.length, 0);
});

test('a second request for the same draft waits on the job already queued', async () => {
  await db('jobs').del();
  const first = await enqueueJob(db, {type: 'copy.draft', dedupeKey: 'copy.draft:KT-1:title', payload: {sku: 'KT-1'}});
  const second = await enqueueJob(db, {type: 'copy.draft', dedupeKey: 'copy.draft:KT-1:title', payload: {sku: 'KT-1'}});
  assert.equal(second.duplicate, true);
  assert.equal(second.job.id, first.job.id);
  assert.equal((await db('jobs')).length, 1);
});

test('a validation failure is not retried', async () => {
  await db('jobs').del();
  const {job} = await enqueueJob(db, {type: 'test.fail', maxAttempts: 3, payload: {}});
  await processDueJobs(db, {'test.fail': async () => { throw Object.assign(new Error('Item not found'), {retryable: false}); }});
  const stored = presentJob(await db('jobs').where({id: job.id}).first());
  assert.equal(stored.status, 'failed');
  assert.equal(stored.last_error, 'Item not found');
});

test('a job left running is closed instead of being started again', async () => {
  await db('jobs').del();
  const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const [id] = await db('jobs').insert({
    type: 'copy.draft',
    payload: '{}',
    status: 'running',
    attempts: 1,
    max_attempts: 1,
    run_at: old,
    locked_at: old,
    locked_by: 'web',
    created_at: old,
    updated_at: old
  });
  assert.equal(await reclaimStaleJobs(db), 1);
  assert.equal((await db('jobs').where({id}).first()).status, 'failed');
});
