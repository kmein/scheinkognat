import { slugify } from './slug.ts';

export interface FormForId {
  translit?: string | null;
  script?: string | null;
  gloss?: string | null;
}

function pick(form: FormForId): string {
  return form.translit ?? form.script ?? form.gloss ?? '';
}

export function generateId(forms: FormForId[], existing: Set<string>): string {
  const a = forms[0] ? slugify(pick(forms[0])) : '';
  const b = forms[1] ? slugify(pick(forms[1])) : '';
  let base = [a, b].filter(Boolean).join('-');
  if (!base) base = 'eintrag';
  if (!existing.has(base)) {
    existing.add(base);
    return base;
  }
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  const id = `${base}-${n}`;
  existing.add(id);
  return id;
}
