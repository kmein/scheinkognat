#!/usr/bin/env node
// Trägt fehlende `added`-Daten aus der Git-Historie nach (Datum des Commits,
// der die Datei angelegt hat). Idempotent: Einträge mit `added` bleiben unberührt.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(import.meta.dirname, '..', 'data', 'entries');
const order = ['id', 'forms', 'comment', 'contributor', 'added', 'sources'];

let n = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const file = path.join(dir, f);
  const entry = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (entry.added) continue;
  const log = execSync(
    `git log --diff-filter=A --follow --format=%as -- "${file}"`,
    { encoding: 'utf8' }
  ).trim();
  const date = log.split('\n').pop();
  if (!date) {
    console.error(`kein Anlege-Commit gefunden: ${f}`);
    continue;
  }
  entry.added = date;
  const out = {};
  for (const k of order) if (k in entry) out[k] = entry[k];
  for (const k of Object.keys(entry)) if (!(k in out)) out[k] = entry[k];
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  n++;
}
console.log(`${n} Einträge nachgetragen`);
