import { openSync, writeSync, closeSync } from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const fd = openSync(process.argv[2], 'w', 0o600);
let bytes = 0;
const limit = 5 * 1024 * 1024;
let truncated = false;
try {
  await pipeline(process.stdin, new Transform({ transform(chunk, encoding, callback) {
    const remaining = limit - bytes;
    if (remaining > 0) { const part = chunk.subarray(0, remaining); writeSync(fd, part); bytes += part.length; }
    if (chunk.length > remaining && !truncated) { writeSync(fd, '\n[Stored log truncated at 5 MiB]\n'); truncated = true; }
    callback(null, chunk);
  } }), process.stdout);
} finally { closeSync(fd); }
