import { entries, languages, contributors } from '../lib/data.ts';

// Maschinenlesbarer Gesamtdatensatz (FAIR A1): /scheinkognat.json
export const GET = () =>
  new Response(
    JSON.stringify({
      meta: {
        title: 'Scheinkognat',
        license: 'CC-BY-4.0',
        source: 'https://github.com/kmein/scheinkognat',
        generated: new Date().toISOString().slice(0, 10),
      },
      entries,
      languages,
      contributors,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
