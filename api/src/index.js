import { db, pool } from './db/index.js';
import { players, matches, users, ligues, ligueMembers } from './db/schema.js';
import { createApp } from './app.js';

const { app, initDb } = await createApp({ db, pool, players, matches, users, ligues, ligueMembers });

const port = Number(process.env.PORT || 33333);
await initDb();
await app.listen({ port, host: '0.0.0.0' });
