// ═══════════════════════════════════════════════════════════════════
//  notifier — les notifications push de MyBoutiQ.
//
//  init     : crée la paire VAPID (la privée ne quitte jamais le serveur)
//  tournee  : la tournée du matin (tâche planifiée), une notif par compte
//  essai    : « Tester » dans Réglages — ses propres téléphones seulement
//  diffuser : une annonce de l'admin, aussi en notification
//
//  ⚠️ verify_jwt est coupé : la tâche planifiée n'a pas de jeton
//  utilisateur. Chaque action vérifie donc elle-même QUI appelle :
//  le secret de tournée (init, tournee) ou le jeton du compte (essai,
//  diffuser — et l'admin pour diffuser).
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { genererVapid, envoyer } from './webpush.js';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } });
const CONTACT = 'https://myboutiq.online';
// Même liste que `notif_abonner` : on ne poste QUE chez un vrai service de push.
const SERVICE_PUSH = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)\//;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const rep = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } });

function egal(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function lireCles() {
  const { data, error } = await db.from('notif_cles').select('publique, privee, secret_tournee').eq('id', 1).single();
  if (error || !data) throw new Error('cles-introuvables');
  return data as { publique: string | null; privee: Record<string, string> | null; secret_tournee: string };
}
async function clesPretes() {
  let c = await lireCles();
  if (!c.publique || !c.privee) {
    const v = await genererVapid();
    // Seulement si personne ne l'a fait entre-temps : une seule paire, à vie.
    await db.from('notif_cles').update({ publique: v.publique, privee: v.privee }).eq('id', 1).is('publique', null);
    c = await lireCles();
  }
  return { publique: c.publique!, privee: c.privee!, contact: CONTACT };
}

async function compteDe(req: Request) {
  const jeton = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jeton) return null;
  const { data } = await db.auth.getUser(jeton);
  return data && data.user ? data.user : null;
}

// ── Les textes (on tutoie, comme dans l'app) ──
function texte(type: string, langue: string, nom: string, jours: number) {
  const en = langue === 'en';
  switch (type) {
    case 'abonnement': {
      const quand = en ? (jours <= 0 ? 'today' : jours === 1 ? 'tomorrow' : `in ${jours} days`)
                       : (jours <= 0 ? "aujourd'hui" : jours === 1 ? 'demain' : `dans ${jours} jours`);
      return en ? { t: '⏳ Your MyBoutiQ subscription', b: `${nom}: your subscription ends ${quand}. Renew it to keep selling without interruption.` }
                : { t: '⏳ Ton abonnement MyBoutiQ', b: `${nom} : ton abonnement se termine ${quand}. Renouvelle-le pour continuer sans coupure.` };
    }
    case 'vide':
      return en ? { t: `🏪 ${nom} is waiting for you`, b: 'Add your first item: one minute is enough. Then you sell, even without network.' }
                : { t: `🏪 ${nom} t'attend`, b: 'Ajoute ton premier article : une minute suffit. Ensuite tu vends, même sans réseau.' };
    case 'premiere':
      return en ? { t: '🛒 Ready for your first sale?', b: `${nom} has its items. Tap an item, take the payment: the day's report builds itself.` }
                : { t: '🛒 Prêt pour ta première vente ?', b: `${nom} a ses articles. Touche un article, encaisse : le bilan du jour se fait tout seul.` };
    case 'absent':
      return en ? { t: `📒 ${nom}`, b: 'Record your sales in MyBoutiQ: your profit is calculated for you, even offline.' }
                : { t: `📒 ${nom}`, b: 'Note tes ventes dans MyBoutiQ : ton bénéfice se calcule tout seul, même sans réseau.' };
    default:
      return en ? { t: '🔔 MyBoutiQ', b: 'Notifications work on this phone. You will be told even when the app is closed.' }
                : { t: '🔔 MyBoutiQ', b: "Les notifications marchent sur ce téléphone. Tu seras prévenu même l'app fermée." };
  }
}

type Abo = { id: number; endpoint: string; p256dh: string; auth: string; echecs: number };

// Un message vers tous les téléphones actifs d'un compte, puis le bilan.
async function livrer(vapid: any, envoi: { id: number; jeton: string }, abos: Abo[],
                      msg: { t: string; b: string }, type: string, ttl: number) {
  const charge = { t: msg.t, b: msg.b, u: '/index.html', g: 'mb-' + type, j: envoi.jeton };
  let ok = 0;
  const detail: Record<string, number> = {};
  for (const a of abos) {
    if (!SERVICE_PUSH.test(a.endpoint)) continue;
    const r = await envoyer(a, charge, vapid, { ttl, sujet: type, urgence: type === 'essai' ? 'high' : 'normal' });
    detail[String(r.statut)] = (detail[String(r.statut)] || 0) + 1;
    if (r.ok) {
      ok++;
      await db.from('notif_abonnements').update({ dernier_ok: new Date().toISOString(), echecs: 0 }).eq('id', a.id);
    } else if (r.mort) {
      await db.from('notif_abonnements').update({ actif: false }).eq('id', a.id);
    } else {
      const n = (a.echecs || 0) + 1;
      await db.from('notif_abonnements').update({ echecs: n, actif: n < 8 }).eq('id', a.id);
    }
  }
  await db.from('notif_envois').update({ nb_appareils: abos.length, nb_ok: ok, detail }).eq('id', envoi.id);
  return ok;
}

async function abonnementsDe(uid: string): Promise<Abo[]> {
  const { data } = await db.from('notif_abonnements').select('id, endpoint, p256dh, auth, echecs')
    .eq('user_id', uid).eq('actif', true);
  return (data || []) as Abo[];
}

// Réserve l'envoi AVANT de l'envoyer : la même clé deux fois = refus (23505),
// donc une tournée relancée ne double jamais une notification.
async function reserver(ligne: Record<string, unknown>) {
  const { data, error } = await db.from('notif_envois').insert(ligne).select('id, jeton').single();
  if (error) { if (error.code === '23505') return null; throw new Error(error.message); }
  return data as { id: number; jeton: string };
}

async function enParallele<T>(liste: T[], n: number, f: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, liste.length) }, async () => {
    while (i < liste.length) { const x = liste[i++]; try { await f(x); } catch (_) { /* un compte n'arrête pas la tournée */ } }
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return rep({ erreur: 'methode' }, 405);
  let corps: any = {};
  try { corps = await req.json(); } catch (_) { /* corps vide */ }
  const action = String(corps.action || '');

  try {
    if (action === 'init' || action === 'tournee') {
      const c = await lireCles();
      if (!egal(req.headers.get('x-tournee') || '', c.secret_tournee)) return rep({ erreur: 'interdit' }, 403);
      const vapid = await clesPretes();
      if (action === 'init') return rep({ ok: true, publique: vapid.publique });

      const { data: cand, error } = await db.rpc('notif_tournee_candidats');
      if (error) throw new Error(error.message);
      const bilan = { candidats: (cand || []).length, envoyes: 0, recus: 0 };
      await enParallele(cand || [], 6, async (x: any) => {
        const abos = await abonnementsDe(x.user_id);
        if (!abos.length) return;
        const msg = texte(x.type, x.langue, x.nom, x.jours || 0);
        const envoi = await reserver({ user_id: x.user_id, code: x.code, type: x.type, cle: x.cle,
                                       titre: msg.t, corps: msg.b, url: '/index.html' });
        if (!envoi) return;
        bilan.envoyes++;
        if (await livrer(vapid, envoi, abos, msg, x.type, 3 * 86400) > 0) bilan.recus++;
      });
      return rep({ ok: true, ...bilan });
    }

    if (action === 'essai') {
      const u = await compteDe(req);
      if (!u) return rep({ erreur: 'non-connecte' }, 401);
      const depuis = new Date(Date.now() - 86400000).toISOString();
      const { count } = await db.from('notif_envois').select('id', { count: 'exact', head: true })
        .eq('user_id', u.id).eq('type', 'essai').gte('cree_le', depuis);
      if ((count || 0) >= 5) return rep({ erreur: 'trop-d-essais' }, 429);
      const abos = await abonnementsDe(u.id);
      if (!abos.length) return rep({ ok: true, appareils: 0, recus: 0 });
      const vapid = await clesPretes();
      const msg = texte('essai', corps.langue === 'en' ? 'en' : 'fr', '', 0);
      const envoi = await reserver({ user_id: u.id, type: 'essai', titre: msg.t, corps: msg.b, url: '/index.html' });
      const recus = await livrer(vapid, envoi!, abos, msg, 'essai', 600);
      return rep({ ok: true, appareils: abos.length, recus });
    }

    if (action === 'diffuser') {
      const u = await compteDe(req);
      if (!u) return rep({ erreur: 'non-connecte' }, 401);
      const { data: adm } = await db.from('app_admins').select('user_id').eq('user_id', u.id).maybeSingle();
      if (!adm) return rep({ erreur: 'reserve-admin' }, 403);
      const titre = String(corps.titre || '').trim().slice(0, 80);
      const message = String(corps.message || '').trim().slice(0, 300);
      const ref = String(corps.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
      if (!titre || !message || !ref) return rep({ erreur: 'titre-message-ref' }, 400);
      const { data: tous } = await db.from('notif_abonnements').select('id, endpoint, p256dh, auth, echecs, user_id').eq('actif', true);
      const parCompte = new Map<string, Abo[]>();
      for (const a of (tous || []) as any[]) { const l = parCompte.get(a.user_id) || []; l.push(a); parCompte.set(a.user_id, l); }
      const vapid = await clesPretes();
      const msg = { t: '📣 ' + titre, b: message };
      const bilan = { comptes: parCompte.size, envoyes: 0, recus: 0 };
      await enParallele([...parCompte.entries()], 6, async ([uid, abos]) => {
        const envoi = await reserver({ user_id: uid, type: 'annonce', cle: 'annonce:' + ref, titre: msg.t, corps: msg.b, url: '/index.html' });
        if (!envoi) return;
        bilan.envoyes++;
        if (await livrer(vapid, envoi, abos, msg, 'annonce', 3 * 86400) > 0) bilan.recus++;
      });
      return rep({ ok: true, ...bilan });
    }

    return rep({ erreur: 'action-inconnue' }, 400);
  } catch (e) {
    return rep({ erreur: String((e as Error)?.message || e).slice(0, 200) }, 500);
  }
});
