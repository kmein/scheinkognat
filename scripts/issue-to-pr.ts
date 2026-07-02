#!/usr/bin/env tsx
// Wird vom Workflow .github/workflows/issue-to-pr.yml aufgerufen.
// Erwartete Umgebungsvariablen:
//   ISSUE_NUMBER  — die Nummer des einreichenden Issues
//   ISSUE_BODY    — der Roh-Body des Issues
//   GH_TOKEN      — gesetzt vom Workflow (für gh CLI)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { generateId } from './lib/id.ts';

const ROOT = process.cwd();
const ENTRIES_DIR = path.join(ROOT, 'data', 'entries');
const SCHEMA_DIR = path.join(ROOT, 'data', 'schema');

const issueNumber = required('ISSUE_NUMBER');
const issueBody = process.env.ISSUE_BODY ?? '';

// --- 1. JSON aus dem Issue-Body holen ----------------------------------------
const fence = issueBody.match(/```(?:json|jsonc)?\s*\n([\s\S]*?)\n```/);
if (!fence) {
  fail('Kein JSON-Block im Issue gefunden. Bitte den Vorschlag in einem ```json … ``` Block einfügen.');
}

let entry: Record<string, unknown>;
try {
  entry = JSON.parse(fence![1]);
} catch (err) {
  fail(`JSON-Parse-Fehler: \`${(err as Error).message}\``);
}

if (!Array.isArray((entry as any).forms) || (entry as any).forms.length < 2) {
  fail('Der Vorschlag braucht mindestens zwei `forms`.');
}

// --- 2. Free-Text-Contributor abfangen ---------------------------------------
// SubmitForm wickelt unbekannte Beiträger-Namen in «…». Den nehmen wir hier
// raus und vermerken's auf dem PR — der Maintainer pflegt das contributors.json.
let freeTextContributor: string | null = null;
const c = entry.contributor;
if (typeof c === 'string' && c.startsWith('«') && c.endsWith('»')) {
  freeTextContributor = c.slice(1, -1);
  delete entry.contributor;
}

// --- 2b. Issue-Autor auf bekannten Beiträger mappen --------------------------
// Wenn kein `contributor` gesetzt ist und der Issue-Autor per `github`-Feld in
// contributors.json bekannt ist, tragen wir ihn automatisch ein.
const issueAuthor = (process.env.ISSUE_AUTHOR ?? '').toLowerCase();

// --- 3. ID generieren --------------------------------------------------------
fs.mkdirSync(ENTRIES_DIR, { recursive: true });
const existingIds = new Set(
  fs.readdirSync(ENTRIES_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
);
const id = typeof entry.id === 'string' && entry.id.trim()
  ? entry.id.trim()
  : generateId((entry as any).forms, existingIds);
entry.id = id;

// --- 4. Validieren (sammelt Fehler, schreibt trotzdem) -----------------------
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const entrySchema = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, 'entry.schema.json'), 'utf8'));
const validate = ajv.compile<unknown>(entrySchema);
const languages = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'languages.json'), 'utf8'));
const contributors = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'contributors.json'), 'utf8'));

if (!entry.contributor && issueAuthor) {
  const match = Object.entries(contributors).find(
    ([, v]) => typeof (v as any).github === 'string' && (v as any).github.toLowerCase() === issueAuthor
  );
  if (match) {
    entry.contributor = match[0];
    freeTextContributor = null;
  }
}

const errors: string[] = [];
if (!validate(entry)) {
  errors.push(`Schema: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
}
for (const [i, f] of (entry as any).forms.entries()) {
  if (f.lang && !languages[f.lang]) {
    errors.push(`forms[${i}].lang "${f.lang}" nicht in languages.json (vor Merge dort eintragen)`);
  }
}
if (entry.contributor && !contributors[entry.contributor as string]) {
  errors.push(`contributor "${entry.contributor}" nicht in contributors.json`);
}

// --- 5. Datei schreiben ------------------------------------------------------
const filePath = path.join('data', 'entries', `${id}.json`);
fs.writeFileSync(filePath, JSON.stringify(canonicalize(entry), null, 2) + '\n');

// --- 6. Branch, Commit, Push, PR --------------------------------------------
const branch = `submission/issue-${issueNumber}-${id}`;

sh(`git config user.name "github-actions[bot]"`);
sh(`git config user.email "41898282+github-actions[bot]@users.noreply.github.com"`);
sh(`git checkout -b ${branch}`);
sh(`git add ${filePath}`);
sh(`git commit -m "submission: ${id} (closes #${issueNumber})"`);
// Force-with-lease: bei Wiederholung desselben Issues überschreiben wir
// den eigenen Bot-Branch; gegen Race-Conditions schützt --force-with-lease.
sh(`git push --force-with-lease --set-upstream origin ${branch}`);

const prBody = [
  `Automatisch erstellt aus Issue #${issueNumber}.`,
  '',
  errors.length
    ? `**Validation-Fehler — vor Merge beheben:**\n\n${errors.map((e) => `- ${e}`).join('\n')}`
    : `\`pnpm validate\` läuft sauber durch. Bereit zum Review/Merge.`,
  freeTextContributor
    ? `\n_Beiträger im Issue genannt: **${freeTextContributor}**. Falls gewünscht in \`data/contributors.json\` eintragen und \`contributor\` setzen._`
    : '',
  `\nSchließt #${issueNumber} beim Merge.`,
].filter(Boolean).join('\n');

fs.writeFileSync('/tmp/pr-body.md', prBody);

const draftFlag = errors.length ? '--draft' : '';
const title = errors.length ? `Vorschlag: ${id} (Review nötig)` : `Vorschlag: ${id}`;

// PR existiert evtl. bereits von einem vorherigen Lauf — dann nicht neu anlegen,
// sondern Body aktualisieren.
const existingPr = sh(`gh pr list --head ${branch} --state open --json url -q '.[0].url'`).trim();
let prUrl: string;
if (existingPr) {
  sh(`gh pr edit ${existingPr} --title ${JSON.stringify(title)} --body-file /tmp/pr-body.md`);
  prUrl = existingPr;
} else {
  prUrl = sh(
    `gh pr create --title ${JSON.stringify(title)} --body-file /tmp/pr-body.md --base main --head ${branch} ${draftFlag}`
  ).trim();
}

// --- 7. Issue kommentieren ---------------------------------------------------
const note = errors.length
  ? `PR angelegt mit Validation-Fehlern — siehe ${prUrl}.`
  : `PR sauber validiert: ${prUrl}.`;
fs.writeFileSync('/tmp/issue-comment.md', note);
sh(`gh issue comment ${issueNumber} --body-file /tmp/issue-comment.md`);

console.log(`\n✓ ${note}`);

// --------------------------------------------------------------------------- helpers
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}
function sh(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8' });
}
function fail(msg: string): never {
  fs.writeFileSync('/tmp/issue-comment.md', `**Eintrag nicht übernommen.** ${msg}`);
  try {
    sh(`gh issue comment ${issueNumber} --body-file /tmp/issue-comment.md`);
  } catch {}
  console.error(msg);
  process.exit(0);
}
// Kanonisiert die Feldreihenfolge im JSON-Output.
function canonicalize(e: Record<string, unknown>): Record<string, unknown> {
  const order = ['id', 'forms', 'comment', 'contributor', 'added', 'sources'];
  const out: Record<string, unknown> = {};
  for (const k of order) if (k in e) out[k] = e[k];
  for (const k of Object.keys(e)) if (!(k in out)) out[k] = e[k];
  return out;
}
