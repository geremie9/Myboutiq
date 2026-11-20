// ═══════════════════════════════════════════════════════════════════
//  voix — la dictée payante de MyBoutiQ (23.80).
//
//  etat        (JSON)      : ce téléphone a-t-il la voix payante ? reste ?
//  transcrire  (multipart) : une phrase courte → le texte
//
//  Le patron, le 20/11/2026 : « ceux qui sont prêts à payer cette
//  fonctionnalité ont souvent du wifi et du solaire de secours ».
//
//  ⚠️ verify_jwt est coupé : un téléphone de VENDEUR n'a pas de compte.
//  Chaque appel prouve donc lui-même qu'il appartient à la boutique — le
//  compte du patron (jeton), ou un PIN de la boutique, avec le même frein
//  aux essais que la lecture de la boutique (voix_autoriser, en SQL).
//  ⚠️ La clé du service ne quitte JAMAIS ce serveur : dans l'app, n'importe
//  qui la lirait et l'userait à nos frais.
//  ⚠️ On ne garde pas le son : il part chez le fournisseur et c'est tout.
//  Seule la durée est comptée (voix_compter), pour l'usage raisonnable.
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { transcrire, FOURNISSEURS, comprendre, MODELES_COMPRENDRE } from './fournisseurs.js';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } });
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const rep = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SON_MAX = 512 * 1024;      // ≈ 4 min d'opus à 16 kbit/s : une phrase en fait 8 Ko
// ⚠️ Les vrais codes ont un ESPACE (« 64972 08757 ») : vu le 20/11 en ouvrant
// le pilote — la première version les refusait toutes.
const CODE_OK = /^[A-Za-z0-9 _-]{4,40}$/;

// Les clés : d'abord les Secrets Supabase (VOIX_CLE_GROQ…), sinon la table
// fermée `voix_cles` — le patron n'arrivait pas à poser un Secret depuis son
// téléphone. Relue toutes les 5 minutes : changer de clé ne demande pas de
// redéployer.
let _cles: Record<string, string> = {}, _clesLues = 0;
async function lireCles() {
  if (Date.now() - _clesLues < 5 * 60e3) return;
  _clesLues = Date.now();
  try {
    const { data } = await db.from('voix_cles').select('fournisseur, cle');
    const m: Record<string, string> = {};
    (data || []).forEach((r: { fournisseur: string; cle: string }) => { if (r && r.fournisseur && r.cle) m[String(r.fournisseur).toLowerCase()] = String(r.cle); });
    _cles = m;
  } catch { /* la table manque : les Secrets seuls */ }
}
const cle = (n: string) => Deno.env.get('VOIX_CLE_' + n.toUpperCase()) || _cles[n] || '';
// Le fournisseur choisi d'abord, puis ceux qui ont une clé, en secours.
async function ordre() {
  await lireCles();
  const pref = (Deno.env.get('VOIX_FOURNISSEUR') || 'groq').toLowerCase();
  const l = [pref, 'groq', 'openai', 'assemblyai'].filter((n, i, a) => FOURNISSEURS[n as keyof typeof FOURNISSEURS] && a.indexOf(n) === i);
  return l.filter(n => cle(n));
}

async function compteDe(req: Request) {
  const jeton = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jeton || jeton.split('.').length !== 3) return null;
  try { const { data } = await db.auth.getUser(jeton); return data && data.user ? data.user : null; } catch { return null; }
}

async function autoriser(req: Request, code: string, pin: string) {
  if (!CODE_OK.test(code)) return { ok: false, motif: 'acces' };
  const u = await compteDe(req);
  const { data, error } = await db.rpc('voix_autoriser', { p_code: code, p_pin: pin || '', p_user: u ? u.id : null });
  if (error || !data) return { ok: false, motif: 'serveur' };
  return data as { ok: boolean; motif?: string; reste?: number; role?: string };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return rep({ ok: false, motif: 'methode' }, 405);
  const type = req.headers.get('content-type') || '';
  try {
    // ── etat : le téléphone demande s'il a la voix payante ──
    if (type.includes('application/json')) {
      const c = await req.json().catch(() => ({}));
      // ── comprendre (23.91) : un morceau de phrase → des lignes de panier ──
      if (c.action === 'comprendre') {
        const a = await autoriser(req, String(c.code || ''), String(c.pin || ''));
        if (!a.ok) return rep({ ok: false, motif: a.motif }, a.motif === 'abonnement' || a.motif === 'quota' ? 402 : 403);
        await lireCles();
        const k = cle('groq');
        if (!k) return rep({ ok: false, motif: 'ferme' }, 503);
        const texte = String(c.texte || '').slice(0, 300).trim();
        if (!texte) return rep({ ok: false, motif: 'texte' }, 400);
        const mod = (Deno.env.get('VOIX_MODELE_COMPRENDRE') || '').split(',').map(x => x.trim()).filter(Boolean);
        try {
          const r = await comprendre(k, texte, c.articles, { delai: 6000, modeles: mod.length ? mod : MODELES_COMPRENDRE });
          return rep({ ok: true, lignes: r.lignes, inconnus: r.inconnus });
        } catch (e) {
          return rep({ ok: false, motif: 'service', detail: String((e as Error).message || e).slice(0, 40) }, 502);
        }
      }
      if (c.action !== 'etat') return rep({ ok: false, motif: 'action' }, 400);
      const a = await autoriser(req, String(c.code || ''), String(c.pin || ''));
      // Pas de clé configurée : la voix payante n'est pas encore ouverte.
      if (a.ok && !(await ordre()).length) return rep({ ok: false, motif: 'ferme' });
      return rep(a.ok ? { ok: true, reste: a.reste } : { ok: false, motif: a.motif }, a.ok || a.motif === 'abonnement' || a.motif === 'quota' ? 200 : 403);
    }

    // ── transcrire : une phrase ──
    if (!type.includes('multipart/form-data')) return rep({ ok: false, motif: 'format' }, 400);
    const f = await req.formData();
    const code = String(f.get('code') || ''), pin = String(f.get('pin') || '');
    const son = f.get('son');
    if (!(son instanceof Blob) || !son.size) return rep({ ok: false, motif: 'son' }, 400);
    if (son.size > SON_MAX) return rep({ ok: false, motif: 'trop-long' }, 413);
    const a = await autoriser(req, code, pin);
    if (!a.ok) return rep({ ok: false, motif: a.motif }, a.motif === 'abonnement' || a.motif === 'quota' ? 402 : 403);
    const l = await ordre();
    if (!l.length) return rep({ ok: false, motif: 'ferme' }, 503);
    let mots: unknown = [];
    try { mots = JSON.parse(String(f.get('mots') || '[]')); } catch { mots = []; }
    const dite = Math.min(30, Math.max(0, Number(f.get('duree')) || 0));
    let dernier = '';
    for (const nom of l) {
      try {
        const r = await transcrire(nom, cle(nom), son, 'phrase.webm', mots as string[], { delai: 8000 });
        // La durée vient du fournisseur quand il la donne ; sinon celle du
        // téléphone, bornée par la taille du son (on ne croit pas un « 0 s »).
        const sec = r.secondes || Math.max(1, Math.min(dite || 30, son.size / 1500));
        // 23.84 — le compteur ne fait plus attendre la réponse : il s'écrit
        // après, en arrière-plan (EdgeRuntime.waitUntil), quand c'est possible.
        // Promise.resolve : la requête Supabase ne part que si on l'attend.
        const compte = Promise.resolve(db.rpc('voix_compter', { p_code: code, p_secondes: Math.round(sec * 10) / 10 }));
        const ER = (globalThis as unknown as { EdgeRuntime?: { waitUntil?: (p: unknown) => void } }).EdgeRuntime;
        if (ER && typeof ER.waitUntil === 'function') ER.waitUntil(compte); else await compte;
        return rep({ ok: true, texte: r.texte, fournisseur: nom, reste: Math.max(0, (a.reste || 0) - sec) });
      } catch (e) { dernier = String((e as Error).message || e); }
    }
    return rep({ ok: false, motif: 'service', detail: dernier.slice(0, 60) }, 502);
  } catch (e) {
    return rep({ ok: false, motif: 'erreur' }, 500);
  }
});
