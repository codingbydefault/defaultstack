import { randomBytes, scryptSync } from 'node:crypto';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
if (password.length < 10 || password.length > 200) {
  console.error('Het wachtwoord moet 10 tot 200 tekens zijn. Geef het via stdin, niet als argument.');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
process.stdout.write(`scrypt$16384$8$1$${salt.toString('base64url')}$${hash.toString('base64url')}\n`);
