/** @jsxImportSource preact */
import { useState } from 'preact/hooks';

interface LangOption {
  code: string;
  name: string;
  rtl?: boolean;
}
interface Props {
  languages: LangOption[];
  githubOwner: string;
  githubRepo: string;
  entriesPath: string;
}

interface FormRow {
  lang: string;       // freier String, vorzugsweise ISO-Code
  dialect: string;
  script: string;
  translit: string;
  gloss: string;
  etymology: string;
}

const emptyForm = (): FormRow => ({
  lang: '',
  dialect: '',
  script: '',
  translit: '',
  gloss: '',
  etymology: '',
});

function resolveLang(input: string, langs: LangOption[]): string {
  const t = input.trim();
  if (!t) return '';
  // direct ISO match
  const direct = langs.find((l) => l.code === t.toLowerCase());
  if (direct) return direct.code;
  // German name match (case-insensitive)
  const name = langs.find((l) => l.name.toLowerCase() === t.toLowerCase());
  if (name) return name.code;
  return t; // free text — will land in review
}

function buildEntry(forms: FormRow[], langs: LangOption[], extras: {
  comment: string; sources: string[]; contributor: string;
}) {
  const out: Record<string, unknown> = {};
  out.forms = forms.map((f) => {
    const code = resolveLang(f.lang, langs);
    const obj: Record<string, string> = { lang: code };
    if (f.dialect.trim()) obj.dialect = f.dialect.trim();
    if (f.script.trim()) obj.script = f.script.trim();
    if (f.translit.trim()) obj.translit = f.translit.trim();
    if (f.gloss.trim()) obj.gloss = f.gloss.trim();
    if (f.etymology.trim()) obj.etymology = f.etymology.trim();
    return obj;
  });
  if (extras.comment.trim()) out.comment = extras.comment.trim();
  if (extras.sources.length) out.sources = extras.sources;
  if (extras.contributor.trim()) out.contributor = `«${extras.contributor.trim()}»`;
  return out;
}

export default function SubmitForm({ languages, githubOwner, githubRepo, entriesPath }: Props) {
  const [forms, setForms] = useState<FormRow[]>([emptyForm(), emptyForm()]);
  const [comment, setComment] = useState('');
  const [sourcesText, setSourcesText] = useState('');
  const [contributor, setContributor] = useState('');

  const update = (i: number, patch: Partial<FormRow>) =>
    setForms((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addForm = () => setForms((rows) => [...rows, emptyForm()]);
  const removeForm = (i: number) =>
    setForms((rows) => (rows.length > 2 ? rows.filter((_, idx) => idx !== i) : rows));

  const onSubmit = (e: Event) => {
    e.preventDefault();
    const sources = sourcesText.split('\n').map((s) => s.trim()).filter(Boolean);
    const entry = buildEntry(forms, languages, { comment, sources, contributor });

    const langSummary = (entry.forms as Array<{ lang: string }>).map((f) => f.lang).join(' ↔ ');
    const title = `Neuer Eintrag: ${langSummary}`;
    const body = [
      'Vorschlag für einen neuen Eintrag:',
      '',
      '```json',
      JSON.stringify(entry, null, 2),
      '```',
      contributor.trim()
        ? `\nBeiträger: ${contributor.trim()} (bitte in data/contributors.json eintragen, falls noch nicht vorhanden)`
        : '',
    ].filter(Boolean).join('\n');

    const url = new URL(`https://github.com/${githubOwner}/${githubRepo}/issues/new`);
    url.searchParams.set('title', title);
    url.searchParams.set('body', body);
    url.searchParams.set('labels', 'einreichung');
    window.open(url.toString(), '_blank');
  };

  return (
    <form class="einreichen" onSubmit={onSubmit}>
      <datalist id="langlist">
        {languages.map((l) => (
          <option value={l.code}>{l.name}</option>
        ))}
      </datalist>

      {forms.map((f, i) => {
        const code = resolveLang(f.lang, languages);
        const known = languages.find((l) => l.code === code);
        return (
          <fieldset>
            <legend>
              Form {i + 1}
              {forms.length > 2 && (
                <button
                  type="button"
                  class="secondary"
                  style="float:right;font-size:0.825rem;padding:0.125rem 0.5rem;"
                  onClick={() => removeForm(i)}
                >
                  Entfernen
                </button>
              )}
            </legend>

            <label>
              Sprache
              <input
                list="langlist"
                value={f.lang}
                placeholder={'z. B. „Arabisch", „ara" oder Freitext'}
                onInput={(e) => update(i, { lang: (e.target as HTMLInputElement).value })}
              />
              <span class="help">
                {known
                  ? `→ ${known.name} (${known.code})${known.rtl ? ' · RTL' : ''}`
                  : f.lang.trim()
                    ? '(noch nicht im Register — wird beim Review angelegt)'
                    : 'ISO 639-3 oder deutscher Name. Freitext erlaubt.'}
              </span>
            </label>

            <label>
              Dialekt / Sprachstufe <span class="help">(optional, z. B. „Bohairisch", „Mittelägyptisch")</span>
              <input
                value={f.dialect}
                onInput={(e) => update(i, { dialect: (e.target as HTMLInputElement).value })}
              />
            </label>

            <label>
              Originalform <span class="help">(das Wort selbst oder die Originalschrift)</span>
              <input
                value={f.script}
                onInput={(e) => update(i, { script: (e.target as HTMLInputElement).value })}
              />
            </label>

            <label>
              Transliteration <span class="help">(optional, IPA in /…/ oder […])</span>
              <input
                value={f.translit}
                onInput={(e) => update(i, { translit: (e.target as HTMLInputElement).value })}
              />
            </label>

            <label>
              Bedeutung (deutsch)
              <input
                value={f.gloss}
                onInput={(e) => update(i, { gloss: (e.target as HTMLInputElement).value })}
              />
            </label>

            <label>
              Etymologie <span class="help">{'(optional, z. B. „< Old French coste")'}</span>
              <input
                value={f.etymology}
                onInput={(e) => update(i, { etymology: (e.target as HTMLInputElement).value })}
              />
            </label>
          </fieldset>
        );
      })}

      <button type="button" class="secondary" onClick={addForm}>
        + Weitere Sprache hinzufügen
      </button>

      <fieldset>
        <legend>Weiteres</legend>
        <label>
          Kommentar / Anmerkung
          <textarea
            rows={4}
            value={comment}
            onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
            placeholder="Markdown erlaubt. Hinweise zu bekanntem Lehnweg, Etymologie, Beobachtungen…"
          />
        </label>
        <label>
          Quellen <span class="help">(URLs oder Zitate, eine pro Zeile)</span>
          <textarea
            rows={3}
            value={sourcesText}
            onInput={(e) => setSourcesText((e.target as HTMLTextAreaElement).value)}
          />
        </label>
        <label>
          Dein Name <span class="help">(optional)</span>
          <input
            value={contributor}
            onInput={(e) => setContributor((e.target as HTMLInputElement).value)}
          />
        </label>
      </fieldset>

      <button type="submit">Issue auf GitHub öffnen</button>
      <p class="help">
        Falls du lieber direkt eine JSON-Datei einreichst:{' '}
        <a href={`https://github.com/${githubOwner}/${githubRepo}/tree/main/${entriesPath}`}>{entriesPath}</a> via Pull-Request.
      </p>
    </form>
  );
}
