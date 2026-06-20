#!/usr/bin/env tsx
// Holt einmalig (oder bei Bedarf) Koordinaten aus dem Glottolog-CLDF-CSV
// und schreibt sie in data/languages.json als `coords: [lat, lng]`.
// Match-Priorität: glottocode → ISO 639-3 (Registry-Key) → Fallback [0, 0].
import fs from 'node:fs';
import path from 'node:path';

const CSV_URL =
  'https://raw.githubusercontent.com/glottolog/glottolog-cldf/master/cldf/languages.csv';
const LANG_FILE = path.join(import.meta.dirname!, '..', 'data', 'languages.json');

console.log('→ Glottolog-CSV laden …');
const res = await fetch(CSV_URL);
if (!res.ok) {
  console.error(`Fehler beim Laden: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const csv = await res.text();
const rows = parseCsv(csv);
const header = rows[0]!;
const idxId = header.indexOf('ID');
const idxLat = header.indexOf('Latitude');
const idxLng = header.indexOf('Longitude');
const idxIso = header.indexOf('ISO639P3code');
const idxGlotto = header.indexOf('Glottocode');

const byGlotto = new Map<string, [number, number]>();
const byIso = new Map<string, [number, number]>();
for (const row of rows.slice(1)) {
  const lat = parseFloat(row[idxLat] ?? '');
  const lng = parseFloat(row[idxLng] ?? '');
  if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
  const glotto = row[idxGlotto] || row[idxId];
  const iso = row[idxIso];
  if (glotto) byGlotto.set(glotto, [lat, lng]);
  if (iso) byIso.set(iso, [lat, lng]);
}
console.log(`  ${byGlotto.size} Glottocode-Einträge mit Koordinaten geladen.`);

const langs = JSON.parse(fs.readFileSync(LANG_FILE, 'utf8')) as Record<
  string,
  { glottocode?: string; coords?: [number, number]; [k: string]: unknown }
>;
let matched = 0;
const fallbacks: string[] = [];

for (const [iso, lang] of Object.entries(langs)) {
  let coords: [number, number] | null = null;
  if (lang.glottocode && byGlotto.has(lang.glottocode)) {
    coords = byGlotto.get(lang.glottocode)!;
  } else if (byIso.has(iso)) {
    coords = byIso.get(iso)!;
  }
  if (coords) {
    lang.coords = coords;
    matched++;
  } else if (lang.coords && (lang.coords[0] !== 0 || lang.coords[1] !== 0)) {
    // Manuell gesetzte Koordinaten beibehalten
    matched++;
  } else {
    lang.coords = [0, 0];
    fallbacks.push(`${iso} (${(lang as any).name})`);
  }
}

fs.writeFileSync(LANG_FILE, JSON.stringify(langs, null, 2) + '\n');

console.log(
  `\n✓ ${matched}/${Object.keys(langs).length} Sprachen mit Koordinaten,` +
    ` ${fallbacks.length} ohne (→ [0, 0]):`
);
for (const f of fallbacks) console.log(`  · ${f}`);

// --------------------------------------------------------------------------- helpers
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuote = false;
      } else cell += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') {
        row.push(cell);
        cell = '';
      } else if (c === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else if (c === '\r') {
        // skip
      } else cell += c;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
