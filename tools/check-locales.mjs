import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { games } from './games.mjs';

let errors = 0;
for (const game of games) {
  const dir = resolve('apps', game.id, 'locales');
  const enPath = resolve(dir, 'en.json');
  if (!existsSync(enPath)) { console.error(`${game.code}: missing en.json`); errors++; continue; }
  const en = JSON.parse(readFileSync(enPath, 'utf8'));
  const keys = Object.keys(en);
  for (const key of keys) if (!key || typeof en[key] !== 'string' || !en[key].trim()) { console.error(`${game.code}: invalid ${key}`); errors++; }
  for (const file of readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'en.json')) {
    const other = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    for (const key of keys) if (!(key in other)) { console.error(`${game.code}/${file}: missing ${key}`); errors++; }
    for (const key of Object.keys(other)) if (!(key in en)) { console.error(`${game.code}/${file}: extra ${key}`); errors++; }
  }
  console.log(`${game.code}: ${keys.length} English keys`);
}
if (errors) process.exitCode = 1;
