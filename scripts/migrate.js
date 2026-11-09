import {db,migrate} from '../server/db.js';
await migrate();console.log('Versioned migrations applied.');await db.destroy();
