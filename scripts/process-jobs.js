// Drain queued work, then exit. Hostinger cron can run this every minute:
// /opt/alt/alt-nodejs22/root/bin/node --env-file=/home/u382139760/domains/test3.avinyacarefoundation.org/app/.env /home/u382139760/domains/test3.avinyacarefoundation.org/app/scripts/process-jobs.js
import {db} from '../server/db.js';
import {processDueJobs, reclaimStaleJobs} from '../server/jobs.js';
import {jobHandlers} from '../server/job-handlers.js';
import {runHousekeeping} from '../server/maintenance.js';

const reclaimed = await reclaimStaleJobs(db);
const processed = await processDueJobs(db, jobHandlers, {limit: 5, workerId: 'cron'});
const housekeeping = await runHousekeeping(db);
console.log(JSON.stringify({reclaimed, processed, housekeeping}));
await db.destroy();
