import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const [id, app, status, image] = process.argv.slice(2);
if (!/^[a-z][a-z0-9-]{0,39}-\d{14}-\d+$/.test(id || '') || !/^[a-z][a-z0-9-]{0,39}$/.test(app || '') || !['building', 'ready', 'failed', 'rolled-back'].includes(status)) throw new Error('Invalid build metadata');
const directory = path.join(process.env.DEFAULTSTACK_STATE_DIR || path.join(os.homedir(), '.local/state/defaultstack'), 'builds');
mkdirSync(directory, { recursive: true, mode: 0o700 });
let previous = {};
try { previous = JSON.parse(readFileSync(path.join(directory, `${id}.json`), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const temporary = path.join(directory, `${id}-${process.pid}.tmp`);
writeFileSync(temporary, JSON.stringify({ id, app, status, image, startedAt: previous.startedAt || new Date().toISOString(), updatedAt: new Date().toISOString() }), { mode: 0o600 });
renameSync(temporary, path.join(directory, `${id}.json`));
