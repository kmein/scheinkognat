#!/usr/bin/env node
// Sammelt data/entries/*.json + languages.json + contributors.json zu einem
// einzelnen JSON-Bundle für den Typst-Renderer. Bewusst depfreies plain Node,
// damit es im Nix-Sandbox ohne `node_modules` läuft.
//
// Aufruf: node scripts/build-pdf-data.mjs > pdf/entries.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'data');

const languages = JSON.parse(fs.readFileSync(path.join(DATA, 'languages.json'), 'utf8'));
const contributors = JSON.parse(fs.readFileSync(path.join(DATA, 'contributors.json'), 'utf8'));

const entriesDir = path.join(DATA, 'entries');
const entries = fs
  .readdirSync(entriesDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(entriesDir, f), 'utf8')))
  .sort((a, b) => a.id.localeCompare(b.id, 'de'));

process.stdout.write(JSON.stringify({ entries, languages, contributors }, null, 0));
