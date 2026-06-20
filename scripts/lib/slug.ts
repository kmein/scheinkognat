// ASCII-fold + lowercase + replace non-alphanumeric with '-', collapse, trim.
const FOLD_MAP: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss',
  Ä: 'ae', Ö: 'oe', Ü: 'ue',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  á: 'a', à: 'a', â: 'a',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o',
  ú: 'u', ù: 'u', û: 'u',
  ć: 'c', č: 'c', ç: 'c',
  ł: 'l', ñ: 'n', š: 's', ž: 'z', ř: 'r',
  ʿ: '', ʾ: '', ˤ: '', ˀ: '',
};

export function slugify(input: string): string {
  let out = input.normalize('NFD');
  let folded = '';
  for (const ch of out) {
    if (FOLD_MAP[ch] !== undefined) {
      folded += FOLD_MAP[ch];
    } else if (/[̀-ͯ]/.test(ch)) {
      // skip combining marks (after NFD)
    } else {
      folded += ch;
    }
  }
  folded = folded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return folded;
}
