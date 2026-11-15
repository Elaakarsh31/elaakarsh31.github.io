#!/usr/bin/env node
// Requests every URL in src/content/portfolio.ts and reports anything that is not a 200.
// Failing links are listed, never removed.   npm run links

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, 'src/content/portfolio.ts'), 'utf8');
const urls = [...new Set(src.match(/https?:\/\/[^'"`\s)]+/g) ?? [])];

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': UA, accept: 'text/html,*/*' },
        signal: AbortSignal.timeout(90000), // free-tier hosts can take a while to wake up
      });
      if (method === 'GET') res.body?.cancel();
      if (res.status === 200 || method === 'GET') return { url, status: res.status, final: res.url };
    } catch (err) {
      if (method === 'GET') return { url, status: 'error', final: String(err.cause?.code ?? err.name) };
    }
  }
}

const results = await Promise.all(urls.map(check));
const bad = results.filter((r) => r.status !== 200);
for (const r of results) {
  const redirected = r.final && r.final !== r.url ? `  → ${r.final}` : '';
  console.log(`${String(r.status).padEnd(5)} ${r.url}${redirected}`);
}
console.log(`\n${results.length - bad.length}/${results.length} returned 200.`);
if (bad.length) {
  console.log(`Not 200 (kept in portfolio.ts, check by hand):\n  ${bad.map((r) => `${r.status} ${r.url}`).join('\n  ')}`);
  process.exitCode = 1;
}
