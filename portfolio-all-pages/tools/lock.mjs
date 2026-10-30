// Locks the NDA case studies (Walgreens, eBay, Cisco) behind a password.
//
//   node tools/lock.mjs "your password"
//
// Reads the plain-text body of each case study from private/<slug>.html (kept out of git by .gitignore),
// encrypts it with AES-256-GCM using a key derived from the password (PBKDF2-SHA256, 250,000 rounds, fresh random
// salt and IV every run), and writes the result into <slug>.html. It also writes a small check value into
// index.html so the homepage can confirm a password before anyone opens a page. site.js does the decrypting.
// Edit the case studies in private/, then run this again. Without the password the pages hold only ciphertext.
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';

const password = process.argv[2];
if (!password) { console.error('Usage: node tools/lock.mjs "password"'); process.exit(1); }
const ROUNDS = 250000;

function seal(text){
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, ROUNDS, 32, 'sha256');
  const c = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(text, 'utf8'), c.final(), c.getAuthTag()]);   // tag on the end, as Web Crypto expects
  return [ROUNDS, salt.toString('base64'), iv.toString('base64'), body.toString('base64')].join('.');
}

for (const slug of ['walgreens', 'ebay', 'cisco']){
  const file = `${slug}.html`, plain = readFileSync(`private/${slug}.html`, 'utf8');
  const html = readFileSync(file, 'utf8');
  const re = /<div class="case-text"[^>]*>[\s\S]*?<\/div>(\s*<a class="case-page-cta")/;
  if (!re.test(html)) { console.error(`Couldn't find the case text in ${file}`); process.exit(1); }
  writeFileSync(file, html.replace(re, `<div class="case-text" data-locked="${seal(plain)}"></div>$1`));
  console.log(`locked ${file}`);
}
const index = readFileSync('index.html', 'utf8');
const re = /<meta name="case-lock" content="[^"]*">/;
const tag = `<meta name="case-lock" content="${seal('unlocked')}">`;
writeFileSync('index.html', re.test(index) ? index.replace(re, tag) : index.replace('<meta name="site-version"', tag + '\n<meta name="site-version"'));
console.log('updated the check value in index.html');
