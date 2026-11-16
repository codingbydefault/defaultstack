import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const result = spawnSync('bash', ['deploy/sync-domain.sh'], { encoding: 'utf8' });
assert.equal(result.status, 1);
assert.match(result.stderr, /uitgezet/);
console.log('PASS: obsolete domain rewrite is disabled');
