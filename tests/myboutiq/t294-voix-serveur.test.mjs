// t294 — la fonction serveur `voix` (23.80), contre une fausse base en mémoire.
// Le patron, le 20/11/2026 : la voix par un service payant à faible coût,
// pour les boutiques qui ont du wifi et du solaire. On recopie les fichiers
// du dépôt dans un dossier jetable (comme t153b) : supabase-js remplacé par
// tests/myboutiq/voix/faux-supa.mjs, le réseau par un faux fetch. Aucun appel
// ne part chez un vrai fournisseur.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RACINE, ICI } from './lib.mjs';
const D = path.join(RACINE, 'supabase/functions/voix');
const F = fs.mkdtempSync(path.join(os.tmpdir(), 'myboutiq-voix-'));
fs.copyFileSync(path.join(D, 'fournisseurs.js'), path.join(F, 'fournisseurs.js'));
for (const f of ['faux-supa.mjs', 'scenario.mjs']) fs.copyFileSync(path.join(ICI, 'voix', f), path.join(F, f));
const src = fs.readFileSync(path.join(D, 'index.ts'), 'utf8');
const imp = "import { createClient } from 'jsr:@supabase/supabase-js@2';";
if (!src.includes(imp)) { console.log('❌ import supabase-js introuvable dans voix/index.ts'); process.exit(1); }
fs.writeFileSync(path.join(F, 'index.ts'), src.replace(imp, "import { createClient } from './faux-supa.mjs';"));
const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scenario.mjs'], { encoding: 'utf8', cwd: F });
process.stdout.write((r.stdout || '') + (r.stderr || ''));
fs.rmSync(F, { recursive: true, force: true });
process.exit(r.status);
