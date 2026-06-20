#!/usr/bin/env tsx
// Interaktiver Creator für neue Einträge.
//   pnpm new-entry
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { generateId } from './lib/id.ts';

const ROOT = path.join(import.meta.dirname!, '..');
const ENTRIES_DIR = path.join(ROOT, 'data', 'entries');
const LANG_FILE = path.join(ROOT, 'data', 'languages.json');
const CONTRIB_FILE = path.join(ROOT, 'data', 'contributors.json');

interface LangEntry { name: string; rtl?: boolean; dialects?: string[]; constructed?: boolean }
interface Form {
  lang: string;
  dialect?: string;
  script?: string;
  translit?: string;
  gloss?: string;
  etymology?: string;
}

const languages: Record<string, LangEntry> = JSON.parse(fs.readFileSync(LANG_FILE, 'utf8'));
const contributors: Record<string, { name: string }> = JSON.parse(fs.readFileSync(CONTRIB_FILE, 'utf8'));

// Build a lookup: case-insensitive lookup from German name OR code → code
const langLookup = new Map<string, string>();
for (const [code, entry] of Object.entries(languages)) {
  langLookup.set(code.toLowerCase(), code);
  langLookup.set(entry.name.toLowerCase(), code);
}

const rl = readline.createInterface({ input: stdin, output: stdout });

async function prompt(q: string): Promise<string> {
  const a = await rl.question(q);
  return a.trim();
}

async function promptOptional(q: string): Promise<string | undefined> {
  const a = await prompt(q);
  return a === '' ? undefined : a;
}

async function readLang(label: string): Promise<string | null> {
  while (true) {
    const input = await prompt(`${label} (ISO 639-3 oder deutscher Name, leer = fertig): `);
    if (input === '') return null;
    const code = langLookup.get(input.toLowerCase());
    if (code) return code;
    console.log(`  ⚠  unbekannt: "${input}". Beispiele: deu, ara, "Koptisch", "Sanskrit"`);
  }
}

async function readForm(idx: number): Promise<Form | null> {
  const lang = await readLang(`Sprache ${idx}`);
  if (!lang) return null;
  const langEntry = languages[lang]!;
  console.log(`  → ${langEntry.name} (${lang})`);

  const form: Form = { lang };

  const dialect = await promptOptional(
    `  Dialekt/Variante${langEntry.dialects ? ` [${langEntry.dialects.join(', ')}]` : ''} (optional): `
  );
  if (dialect) form.dialect = dialect;

  const script = await promptOptional('  Originalform (das Wort selbst oder die Originalschrift): ');
  if (script) form.script = script;

  const translit = await promptOptional('  Transliteration (optional, IPA in /…/): ');
  if (translit) form.translit = translit;

  const gloss = await promptOptional('  Bedeutung (deutsch): ');
  if (gloss) form.gloss = gloss;

  const etym = await promptOptional('  Etymologie (optional, z. B. "< Old French costa"): ');
  if (etym) form.etymology = etym;

  return form;
}

async function readMultiline(q: string): Promise<string | undefined> {
  console.log(q);
  console.log('  (mit einer leeren Zeile abschließen)');
  const lines: string[] = [];
  while (true) {
    const l = await rl.question('  > ');
    if (l === '') break;
    lines.push(l);
  }
  return lines.length ? lines.join('\n') : undefined;
}

async function main() {
  console.log('Neuer Eintrag — Felder ausfüllen, leer = überspringen.\n');

  const forms: Form[] = [];
  let idx = 1;
  while (true) {
    const f = await readForm(idx);
    if (!f) {
      if (forms.length < 2) {
        console.log('  ⚠  Mindestens zwei Sprachen sind nötig.');
        continue;
      }
      break;
    }
    forms.push(f);
    idx++;
  }

  const comment = await readMultiline('Kommentar (optional, Markdown erlaubt):');

  let contributor: string | undefined;
  while (true) {
    const c = await promptOptional(
      `Beiträger-ID (optional, z. B. "kenneth-wehr"; verfügbar: ${Object.keys(contributors).slice(0, 5).join(', ')}, …): `
    );
    if (!c) break;
    if (!contributors[c]) {
      console.log(`  ⚠  "${c}" nicht im Register. Bitte zuerst in data/contributors.json aufnehmen.`);
      continue;
    }
    contributor = c;
    break;
  }

  const added =
    (await promptOptional(`Datum YYYY-MM-DD (default heute): `)) ??
    new Date().toISOString().slice(0, 10);

  const sourcesRaw = await readMultiline('Quellen (URLs, Zitierschlüssel — eine pro Zeile):');
  const sources = sourcesRaw ? sourcesRaw.split('\n').filter(Boolean) : undefined;

  const id = generateId(forms, new Set(fs.readdirSync(ENTRIES_DIR).map(f => f.replace(/\.json$/, ''))));

  const entry: Record<string, unknown> = { id, forms };
  if (comment) entry.comment = comment;
  if (contributor) entry.contributor = contributor;
  if (added) entry.added = added;
  if (sources) entry.sources = sources;

  console.log('\n--- Vorschau ---');
  console.log(JSON.stringify(entry, null, 2));
  const confirm = await prompt(`\nSpeichern als data/entries/${id}.json? [Y/n] `);
  if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'nein') {
    console.log('Abgebrochen.');
    rl.close();
    return;
  }

  const out = path.join(ENTRIES_DIR, `${id}.json`);
  fs.writeFileSync(out, JSON.stringify(entry, null, 2) + '\n');
  console.log(`✓ Gespeichert: ${out}`);
  rl.close();
}

main().catch(err => { console.error(err); rl.close(); process.exit(1); });
