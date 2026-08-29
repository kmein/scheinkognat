import fs from 'node:fs';
import path from 'node:path';
import type { APIContext } from 'astro';

// Serviert die JSON-Schemata unverändert unter ihren $id-URLs (/schema/*.json).
const SCHEMA_DIR = path.join(process.cwd(), 'data', 'schema');

export function getStaticPaths() {
  return ['entry', 'languages', 'contributors'].map((name) => ({ params: { name } }));
}

export const GET = ({ params }: APIContext) =>
  new Response(
    fs.readFileSync(path.join(SCHEMA_DIR, `${params.name}.schema.json`)),
    { headers: { 'Content-Type': 'application/schema+json' } }
  );
