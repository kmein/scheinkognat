#!/usr/bin/env node
// Schreibt den Datensatz als CLDF-Generic-Datensatz (https://cldf.clld.org/).
// Generic statt Wordlist: Formen sind nach Gestalt gruppiert, nicht nach
// gemeinsamer Bedeutung — eine ParameterTable würde die Daten verfälschen.
// Aufruf: node scripts/build-cldf.mjs <outdir>
import fs from 'node:fs';
import path from 'node:path';

const outdir = process.argv[2];
if (!outdir) {
  console.error('usage: build-cldf.mjs <outdir>');
  process.exit(1);
}

const DATA = path.join(import.meta.dirname, '..', 'data');
const load = (p) => JSON.parse(fs.readFileSync(path.join(DATA, p), 'utf8'));

const languages = load('languages.json');
const contributors = load('contributors.json');
const entries = fs
  .readdirSync(path.join(DATA, 'entries'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => load(path.join('entries', f)))
  .sort((a, b) => a.id.localeCompare(b.id));

// --- CSV ---------------------------------------------------------------------
const cell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
};
const writeCsv = (name, header, rows) =>
  fs.writeFileSync(
    path.join(outdir, name),
    [header, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n'
  );

fs.mkdirSync(outdir, { recursive: true });

const PRIVATE_USE = /^q[a-t][a-z]$/; // ISO 639-3 Private-Use-Bereich qaa–qtz

writeCsv(
  'languages.csv',
  ['ID', 'Name', 'Glottocode', 'Latitude', 'Longitude', 'ISO639P3code', 'Constructed', 'Creator'],
  Object.entries(languages).map(([code, l]) => {
    const [lat, lng] = l.coords ?? [];
    const known = lat !== 0 || lng !== 0;
    return [
      code,
      l.name,
      l.glottocode,
      known ? lat : null,
      known ? lng : null,
      PRIVATE_USE.test(code) ? null : code,
      l.constructed ? 'true' : null,
      l.creator,
    ];
  })
);

for (const e of entries)
  for (const s of e.sources ?? [])
    if (s.includes(';')) throw new Error(`Quelle mit ';' in ${e.id} — Source-Separator anpassen`);

writeCsv(
  'entries.csv',
  ['ID', 'Comment', 'Contributor_ID', 'Added', 'Source'],
  entries.map((e) => [e.id, e.comment, e.contributor, e.added, (e.sources ?? []).join(';')])
);

writeCsv(
  'forms.csv',
  ['ID', 'Entry_ID', 'Language_ID', 'Form', 'Transliteration', 'Gloss', 'Etymology', 'Dialect'],
  entries.flatMap((e) =>
    e.forms.map((f, i) => [
      `${e.id}-${i + 1}`,
      e.id,
      f.lang,
      f.script ?? f.translit,
      f.translit,
      f.gloss,
      f.etymology,
      f.dialect,
    ])
  )
);

writeCsv(
  'contributors.csv',
  ['ID', 'Name', 'Url', 'Github', 'Orcid'],
  Object.entries(contributors).map(([id, c]) => [id, c.name, c.url, c.github, c.orcid])
);

// --- CLDF-Metadaten ----------------------------------------------------------
const term = (t) => `http://cldf.clld.org/v1.0/terms.rdf#${t}`;
const col = (name, opts = {}) => ({ name, datatype: 'string', ...opts });
const fk = (column, resource) => ({
  columnReference: [column],
  reference: { resource, columnReference: ['ID'] },
});

const metadata = {
  '@context': ['http://www.w3.org/ns/csvw', { '@language': 'de' }],
  'dc:conformsTo': term('Generic'),
  'dc:title': 'Scheinkognat',
  'dc:description':
    'Kuratierte Sammlung linguistischer Koinzidenzen — Wörter zwischen unverwandten Sprachen, die einander zufällig ähneln.',
  'dc:license': 'https://creativecommons.org/licenses/by/4.0/',
  'dc:identifier': 'https://kmein.github.io/scheinkognat/',
  tables: [
    {
      url: 'languages.csv',
      'dc:conformsTo': term('LanguageTable'),
      tableSchema: {
        primaryKey: ['ID'],
        columns: [
          col('ID', { propertyUrl: term('id'), required: true }),
          col('Name', { propertyUrl: term('name'), required: true }),
          col('Glottocode', { propertyUrl: term('glottocode') }),
          col('Latitude', { propertyUrl: term('latitude'), datatype: 'decimal' }),
          col('Longitude', { propertyUrl: term('longitude'), datatype: 'decimal' }),
          col('ISO639P3code', { propertyUrl: term('iso639P3code') }),
          col('Constructed', { datatype: 'boolean' }),
          col('Creator'),
        ],
      },
    },
    {
      url: 'entries.csv',
      'dc:description': 'Ein Eintrag = eine Gruppe zufällig ähnlicher Formen (Scheinkognaten).',
      tableSchema: {
        primaryKey: ['ID'],
        columns: [
          col('ID', { propertyUrl: term('id'), required: true }),
          col('Comment', { propertyUrl: term('comment') }),
          col('Contributor_ID'),
          col('Added', { datatype: 'date' }),
          col('Source', { separator: ';' }),
        ],
        foreignKeys: [fk('Contributor_ID', 'contributors.csv')],
      },
    },
    {
      url: 'forms.csv',
      'dc:description': 'Die einzelnen Wortformen; Form = Originalschrift, sonst Romanisierung.',
      tableSchema: {
        primaryKey: ['ID'],
        columns: [
          col('ID', { propertyUrl: term('id'), required: true }),
          col('Entry_ID', { required: true }),
          col('Language_ID', { propertyUrl: term('languageReference'), required: true }),
          col('Form', { propertyUrl: term('form'), required: true }),
          col('Transliteration'),
          col('Gloss'),
          col('Etymology'),
          col('Dialect'),
        ],
        foreignKeys: [fk('Entry_ID', 'entries.csv'), fk('Language_ID', 'languages.csv')],
      },
    },
    {
      url: 'contributors.csv',
      tableSchema: {
        primaryKey: ['ID'],
        columns: [
          col('ID', { propertyUrl: term('id'), required: true }),
          col('Name', { required: true }),
          col('Url'),
          col('Github'),
          col('Orcid'),
        ],
      },
    },
  ],
};

fs.writeFileSync(
  path.join(outdir, 'Generic-metadata.json'),
  JSON.stringify(metadata, null, 2) + '\n'
);

console.log(
  `CLDF: ${entries.length} entries, ${entries.reduce((n, e) => n + e.forms.length, 0)} forms, ` +
    `${Object.keys(languages).length} languages → ${outdir}`
);
