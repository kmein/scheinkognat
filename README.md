# Scheinkognat

Statische Website für *linguistische Koinzidenzen* zwischen Sprachen — überraschende Wortähnlichkeiten ohne nachweisbare gemeinsame Etymologie oder Entlehnung. Also: Wörter, die wie Verwandte klingen, aber keine sind.

Daten als strukturierte JSON-Dateien, Frontend mit Astro, Deploy auf GitHub Pages.

## Entwicklung

Voraussetzung: [Nix](https://nixos.org/) mit Flakes aktiviert. Die Devshell stellt Node 22 und pnpm 11 bereit.

```sh
nix develop
pnpm install
pnpm dev          # http://localhost:4321/scheinkognat/
```

Mit [`direnv`](https://direnv.net/) wird die Devshell automatisch geladen (`.envrc` ist enthalten).

## Daten

Quelle der Wahrheit: `data/entries/{slug}.json`, eine Datei pro Eintrag.

```jsonc
{
  "id": "mete-mitte",
  "forms": [
    { "lang": "cop", "script": "ⲙⲏⲧⲉ", "translit": "mēte", "gloss": "Mitte" },
    { "lang": "deu", "script": "Mitte" }
  ],
  "comment": "Optionale Anmerkung in Markdown.",
  "contributor": "kfm",
  "added": "2024-05-01",
  "sources": []
}
```

Regeln:

- `lang`: ISO 639-3 (Register in `data/languages.json`).
- `script`: Form in der Originalschrift — bei Latein-Alphabeten **das Wort selbst**, sonst die Originalschrift.
- `translit`: Romanisierung; nur bei nicht-lateinischer Schrift, IPA in `/…/` oder `[…]`.
- `dialect`, `gloss`, `etymology`, `comment`, `contributor`, `added`, `sources` sind optional.
- Mindestens zwei Sprachen pro Eintrag.

Schemata (JSON Schema Draft 2020-12) in `data/schema/`.

### Neuer Eintrag

```sh
pnpm new-entry        # interaktiv, fragt alle Felder ab
```

Oder direkt eine JSON-Datei in `data/entries/` anlegen — der Slug muss `id` und Dateinamen entsprechen.

```sh
pnpm validate         # prüft alle Daten gegen Schemata + Referenzintegrität
```

### Sprachregister

`data/languages.json` mappt ISO-639-3-Code → `{ name, script (ISO 15924), rtl, dialects, … }`. Neue Sprachen dort eintragen, bevor Einträge sie verwenden. Für Sprachen ohne ISO-Code (PIE u. Ä.) gibt es den Private-Use-Bereich `qaa`–`qtz`.

### Beiträger­register

`data/contributors.json` mappt kebab-case-ID → `{ name, url? }`.

## Build & Deploy

```sh
pnpm build            # erzeugt dist/ inkl. Pagefind-Suchindex
pnpm preview
```

Deploy läuft automatisch bei Push auf `main` (`.github/workflows/deploy.yml`, GitHub Pages). PRs werden von `.github/workflows/ci.yml` validiert und gebaut.

**Vor dem ersten Deploy:**

1. GitHub-Repository anlegen (öffentlich oder GitHub Pro).
2. In *Settings → Pages* die Quelle auf „GitHub Actions" stellen.
3. Falls der Owner nicht `kfm` ist, in `astro.config.mjs` (`site`, `base`) und `src/lib/config.ts` (`SITE.github`) anpassen.

## Einreichungen

Die `/einreichen/`-Seite öffnet ein vorausgefülltes GitHub-Issue mit dem JSON-Snippet. Es gibt kein Backend; Moderation ist gleich Issue-Review.

## Architektur

```
data/
  entries/*.json       Quelle der Wahrheit
  languages.json
  contributors.json
  schema/*.schema.json
scripts/
  new-entry.ts         Interaktiver Eintrags-Creator
  validate.ts          Ajv + Referenzintegrität
  lib/
src/
  pages/               Astro-Routen
  components/          Entry.astro, FilterBar.tsx (Preact-Insel)
  layouts/Base.astro
  lib/data.ts          typisierter Datenzugriff
  styles/global.css
.github/workflows/     ci.yml + deploy.yml
flake.nix              Nix-Devshell (Node + pnpm)
```

## Lizenz

Daten: CC BY 4.0. Code: MIT.
