import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Form {
  lang: string;
  dialect?: string | null;
  script?: string | null;
  translit?: string | null;
  gloss?: string | null;
  etymology?: string | null;
}

export interface Entry {
  id: string;
  forms: Form[];
  comment?: string | null;
  contributor?: string | null;
  added?: string | null;
  sources?: string[];
}

export interface Language {
  name: string;
  rtl?: boolean;
  constructed?: boolean;
  creator?: string | null;
  dialects?: string[];
  wikipedia?: string | null;
  glottocode?: string | null;
}

export interface Contributor {
  name: string;
  url?: string | null;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(here, '..', '..', 'data');

function loadJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

export const languages: Record<string, Language> = loadJson(
  path.join(DATA, 'languages.json')
);

export const contributors: Record<string, Contributor> = loadJson(
  path.join(DATA, 'contributors.json')
);

function readEntries(): Entry[] {
  const dir = path.join(DATA, 'entries');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => loadJson<Entry>(path.join(dir, f)))
    .sort((a, b) => {
      // Newest first by `added`, fall back to id
      const da = a.added ?? '';
      const db = b.added ?? '';
      if (da !== db) return db.localeCompare(da);
      return a.id.localeCompare(b.id);
    });
}

export const entries: Entry[] = readEntries();

// Helpers
export function languageName(code: string): string {
  return languages[code]?.name ?? code;
}

export function contributorName(id: string): string {
  return contributors[id]?.name ?? id;
}

// BCP-47 for HTML lang attr. Falls back to the ISO 639-3 code.
export function bcp47(code: string): string {
  // ISO 639-3 alpha-3 is valid as a language subtag.
  return code;
}

export function isRtl(code: string): boolean {
  return Boolean(languages[code]?.rtl);
}

// Aggregations for facets / index pages
export function entriesByLang(): Map<string, Entry[]> {
  const out = new Map<string, Entry[]>();
  for (const e of entries) {
    for (const f of e.forms) {
      if (!out.has(f.lang)) out.set(f.lang, []);
      out.get(f.lang)!.push(e);
    }
  }
  return out;
}

export function entriesByContributor(): Map<string, Entry[]> {
  const out = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!e.contributor) continue;
    if (!out.has(e.contributor)) out.set(e.contributor, []);
    out.get(e.contributor)!.push(e);
  }
  return out;
}

export function languageFrequencies(): Array<{ code: string; count: number }> {
  const counts = new Map<string, number>();
  for (const e of entries) {
    for (const f of e.forms) {
      counts.set(f.lang, (counts.get(f.lang) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}
