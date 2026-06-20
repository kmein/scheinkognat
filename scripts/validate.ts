#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import Ajv, { type AnySchema } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = path.join(import.meta.dirname!, '..');
const SCHEMA_DIR = path.join(ROOT, 'data', 'schema');
const ENTRIES_DIR = path.join(ROOT, 'data', 'entries');
const LANG_FILE = path.join(ROOT, 'data', 'languages.json');
const CONTRIB_FILE = path.join(ROOT, 'data', 'contributors.json');

interface Form {
  lang: string;
  dialect?: string | null;
  script?: string | null;
  translit?: string | null;
  gloss?: string | null;
  etymology?: string | null;
}
interface Entry {
  id: string;
  forms: Form[];
  comment?: string | null;
  contributor?: string | null;
  added?: string | null;
  sources?: string[];
}

const errors: string[] = [];
const warnings: string[] = [];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function loadSchema(name: string): AnySchema {
  return JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, name), 'utf8'));
}
const entrySchema = loadSchema('entry.schema.json');
const langSchema = loadSchema('languages.schema.json');
const contribSchema = loadSchema('contributors.schema.json');

const validateEntry = ajv.compile<Entry>(entrySchema);
const validateLangs = ajv.compile(langSchema);
const validateContribs = ajv.compile(contribSchema);

function loadJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

// 1. Validate languages.json
const languages = loadJson<Record<string, { name: string; script: string; dialects?: string[] }>>(LANG_FILE);
if (!validateLangs(languages)) {
  errors.push(`languages.json: ${ajv.errorsText(validateLangs.errors)}`);
}

// 2. Validate contributors.json
const contributors = loadJson<Record<string, { name: string }>>(CONTRIB_FILE);
if (!validateContribs(contributors)) {
  errors.push(`contributors.json: ${ajv.errorsText(validateContribs.errors)}`);
}

// 3. Validate entries + referential integrity
const ids = new Set<string>();
const entryFiles = fs.readdirSync(ENTRIES_DIR).filter(f => f.endsWith('.json'));

for (const file of entryFiles) {
  const fullPath = path.join(ENTRIES_DIR, file);
  let entry: Entry;
  try {
    entry = loadJson<Entry>(fullPath);
  } catch (e) {
    errors.push(`${file}: JSON parse error: ${(e as Error).message}`);
    continue;
  }

  if (!validateEntry(entry)) {
    errors.push(`${file}: ${ajv.errorsText(validateEntry.errors)}`);
    continue;
  }

  const expectedFile = `${entry.id}.json`;
  if (file !== expectedFile) {
    errors.push(`${file}: id "${entry.id}" doesn't match filename`);
  }
  if (ids.has(entry.id)) {
    errors.push(`${file}: duplicate id "${entry.id}"`);
  }
  ids.add(entry.id);

  const langs = new Set<string>();
  for (const [i, form] of entry.forms.entries()) {
    if (!languages[form.lang]) {
      errors.push(`${file}: forms[${i}].lang "${form.lang}" not in languages.json`);
    }
    langs.add(form.lang);
    if (form.dialect && languages[form.lang]?.dialects) {
      if (!languages[form.lang]!.dialects!.includes(form.dialect)) {
        warnings.push(`${file}: forms[${i}].dialect "${form.dialect}" not declared in languages[${form.lang}].dialects`);
      }
    }
  }
  if (langs.size < 2) {
    errors.push(`${file}: needs at least 2 different languages (got ${langs.size})`);
  }
  if (entry.contributor && !contributors[entry.contributor]) {
    errors.push(`${file}: contributor "${entry.contributor}" not in contributors.json`);
  }
}

console.log(`Validated ${entryFiles.length} entries against schemas + registries.`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ⚠  ${w}`);
}

if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  ✗  ${e}`);
  process.exit(1);
}

console.log('\n✓ all data valid');
