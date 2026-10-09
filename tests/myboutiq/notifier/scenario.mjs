import { BASE } from './faux-supa.mjs';
import { b64u } from './webpush.js';
let handler;
globalThis.Deno = { env: { get: k => 'x' }, serve: h => { handler = h; } };
let posts = [], reponse = () => 201;
globalThis.fetch = async (u, i) => { posts.push({ u, i }); return new Response('', { status: reponse(u) }); };
await import('./index.ts');
let ok = 0, ko = 0; const t = (c, m) => { if (c) { ok++; console.log('✅', m); } else { ko++; console.log('❌', m); } };
const appel = async (corps, h = {}) => { const r = await handler(new Request('https://x/f', { method: 'POST', headers: h, body: JSON.stringify(corps) })); return { s: r.status, j: await r.json() }; };
BASE.notif_cles.push({ id: 1, publique: null, privee: null, secret_tournee: 'S'.repeat(64) });
const s = crypto.subtle;
async function tel(uid, endpoint) { const k = await s.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  BASE.notif_abonnements.push({ id: BASE.notif_abonnements.length + 100, endpoint, user_id: uid, actif: true, echecs: 0,
    p256dh: b64u(new Uint8Array(await s.exportKey('raw', k.publicKey))), auth: b64u(crypto.getRandomValues(new Uint8Array(16))) }); }

t((await appel({ action: 'init' })).s === 403, 'init sans secret : refusé');
t((await appel({ action: 'tournee' }, { 'x-tournee': 'S'.repeat(63) + 'T' })).s === 403, 'tournée avec un faux secret : refusée');
const i1 = await appel({ action: 'init' }, { 'x-tournee': 'S'.repeat(64) });
t(i1.s === 200 && /^B[A-Za-z0-9_-]{86}$/.test(i1.j.publique) && BASE.notif_cles[0].privee.d, 'init : paire VAPID créée, privée gardée en base');
const i2 = await appel({ action: 'init' }, { 'x-tournee': 'S'.repeat(64) });
t(i2.j.publique === i1.j.publique, 'init relancé : la même paire, jamais remplacée');

await tel('A', 'https://fcm.googleapis.com/fcm/send/a1'); await tel('A', 'https://fcm.googleapis.com/fcm/send/a2');
await tel('B', 'https://updates.push.services.mozilla.com/wpush/v2/b1');
await tel('C', 'https://evil.example.com/c1');
BASE._rpc.notif_tournee_candidats = () => [
  { user_id: 'A', code: 'AAA', nom: 'Chez Ama', langue: 'fr', type: 'vide', cle: 'vide:2026-10-04', jours: 0 },
  { user_id: 'B', code: 'BBB', nom: 'Bob Shop', langue: 'en', type: 'abonnement', cle: 'abonnement:BBB:2026-10-06', jours: 2 },
  { user_id: 'C', code: 'CCC', nom: 'Pirate', langue: 'fr', type: 'absent', cle: 'absent:2026-10-04', jours: 0 },
];
reponse = u => u.endsWith('/a2') ? 410 : 201;
posts = [];
const r1 = await appel({ action: 'tournee' }, { 'x-tournee': 'S'.repeat(64) });
t(r1.s === 200 && r1.j.candidats === 3 && r1.j.envoyes === 3 && r1.j.recus === 2, 'tournée : 3 comptes, 2 reçus (le 3e n\'a qu\'une adresse pirate) ' + JSON.stringify(r1.j));
t(!posts.some(p => p.u.includes('evil')), '⚠️ aucune requête vers une adresse qui n\'est pas un service de push');
t(BASE.notif_abonnements.find(a => a.endpoint.endsWith('/a2')).actif === false, '410 : le téléphone disparu est éteint');
t(BASE.notif_abonnements.find(a => a.endpoint.endsWith('/a1')).dernier_ok, 'reçu : dernier_ok noté');
const eB = BASE.notif_envois.find(e => e.user_id === 'B');
t(eB.titre.includes('subscription') && eB.corps.includes('in 2 days') && eB.corps.includes('Bob Shop'), 'anglais pour une boutique anglaise : ' + eB.corps);
const eA = BASE.notif_envois.find(e => e.user_id === 'A');
t(eA.titre === "🏪 Chez Ama t'attend" && eA.nb_appareils === 2 && eA.nb_ok === 1, 'français, nom de la boutique, bilan 1/2 appareils');
const pA = posts.find(p => p.u.endsWith('/a1'));
t(pA.i.headers.Topic === 'vide' && pA.i.headers.TTL === String(3 * 86400), 'TTL 3 jours (livrée au retour du réseau), Topic = type');
posts = [];
const r2 = await appel({ action: 'tournee' }, { 'x-tournee': 'S'.repeat(64) });
t(r2.j.envoyes === 0 && posts.length === 0, '⚠️ tournée relancée le même jour : rien n\'est envoyé deux fois');

// essai
BASE._users['jeton-A'] = { id: 'A' }; BASE._users['jeton-Z'] = { id: 'Z' };
t((await appel({ action: 'essai' })).s === 401, 'essai sans compte : refusé');
const e1 = await appel({ action: 'essai', langue: 'fr' }, { authorization: 'Bearer jeton-A' });
t(e1.j.appareils === 1 && e1.j.recus === 1, 'essai : ses propres téléphones seulement (1 actif)');
const e0 = await appel({ action: 'essai' }, { authorization: 'Bearer jeton-Z' });
t(e0.j.appareils === 0, 'essai sans téléphone inscrit : 0, sans erreur');
for (let i = 0; i < 4; i++) await appel({ action: 'essai' }, { authorization: 'Bearer jeton-A' });
t((await appel({ action: 'essai' }, { authorization: 'Bearer jeton-A' })).s === 429, 'au-delà de 5 essais par jour : refusé');

// diffuser
const d0 = await appel({ action: 'diffuser', titre: 'x', message: 'y', ref: 'r1' }, { authorization: 'Bearer jeton-A' });
t(d0.s === 403, 'diffuser par un patron ordinaire : refusé');
BASE.app_admins.push({ user_id: 'A' });
posts = [];
const d1 = await appel({ action: 'diffuser', titre: 'Merci', message: 'Bonne semaine', ref: 'r1' }, { authorization: 'Bearer jeton-A' });
t(d1.s === 200 && d1.j.comptes === 3 && d1.j.recus === 2, 'diffuser (admin) : tous les comptes ' + JSON.stringify(d1.j));
const d2 = await appel({ action: 'diffuser', titre: 'Merci', message: 'Bonne semaine', ref: 'r1' }, { authorization: 'Bearer jeton-A' });
t(d2.j.envoyes === 0, 'la même annonce deux fois (double appui) : pas de doublon');
t((await appel({ action: 'rien' })).s === 400, 'action inconnue : 400');
console.log(ko ? 'ÉCHECS ' + ko : 't153b : ' + ok + ' vérifications'); process.exit(ko ? 1 : 0);
