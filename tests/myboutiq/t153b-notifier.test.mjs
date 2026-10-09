// t153b — la fonction serveur `notifier`, contre une fausse base en mémoire.
// On recopie À CHAQUE FOIS les fichiers du dépôt dans un dossier jetable :
// on teste exactement ce qui part sur Supabase, avec supabase-js remplacé
// par une fausse base (notifier/faux-supa.mjs) et fetch par un faux réseau.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RACINE, ICI } from './lib.mjs';
const D = path.join(RACINE, 'supabase/functions/notifier');
const F = fs.mkdtempSync(path.join(os.tmpdir(), 'myboutiq-notifier-'));
fs.copyFileSync(path.join(D, 'webpush.js'), path.join(F, 'webpush.js'));
for (const f of ['faux-supa.mjs', 'scenario.mjs']) fs.copyFileSync(path.join(ICI, 'notifier', f), path.join(F, f));
const src = fs.readFileSync(path.join(D, 'index.ts'), 'utf8');
const imp = "import { createClient } from 'jsr:@supabase/supabase-js@2';";
if (!src.includes(imp)) { console.log('❌ import supabase-js introuvable dans index.ts'); process.exit(1); }
fs.writeFileSync(path.join(F, 'index.ts'), src.replace(imp, "import { createClient } from './faux-supa.mjs';"));
const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scenario.mjs'], { encoding: 'utf8', cwd: F });
process.stdout.write((r.stdout || '') + (r.stderr || ''));
fs.rmSync(F, { recursive: true, force: true });
process.exit(r.status);
