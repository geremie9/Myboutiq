import { BASE } from './faux-supa.mjs';
let handler; const ENV = { SUPABASE_URL: 'https://x', SUPABASE_SERVICE_ROLE_KEY: 'srv', VOIX_CLE_GROQ: 'CLE-GROQ-SECRETE', VOIX_CLE_OPENAI: 'CLE-OPENAI-SECRETE' };
globalThis.Deno = { env: { get: k => ENV[k] }, serve: h => { handler = h; } };
const reseau = []; let panne = {};
// 23.91 — la réponse du modèle de langue (comprendre), et les modèles « retirés ».
let chat = { lignes: [] }, retires = [];
globalThis.fetch = async (u, i) => {
  const url = String(u); reseau.push({ url, i });
  const hote = new URL(url).host;
  if (panne[hote]) return new Response('{}', { status: panne[hote] });
  if (url.includes('/chat/completions')) {
    const m = JSON.parse(i.body).model;
    if (retires.includes(m)) return new Response('{"error":{"code":"model_decommissioned"}}', { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { content: typeof chat === 'string' ? chat : JSON.stringify(chat) } }] }), { status: 200 });
  }
  if (hote === 'api.groq.com') return new Response(JSON.stringify({ text: ' deux Mützig et un Tangui ', duration: 2.4 }), { status: 200 });
  if (hote === 'api.openai.com') return new Response(JSON.stringify({ text: 'mille cinq cents' }), { status: 200 });
  return new Response('{}', { status: 404 });
};
await import('./index.ts');
let ok = 0, ko = 0; const t = (c, m) => { if (c) { ok++; console.log('✅', m); } else { ko++; console.log('❌', m); } };
const etat = async (corps, h = {}) => { const r = await handler(new Request('https://x/voix', { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify({ action: 'etat', ...corps }) })); return { s: r.status, j: await r.json() }; };
const dire = async (champs, h = {}, taille = 8000) => {
  const fd = new FormData(); for (const [k, v] of Object.entries(champs)) fd.append(k, v);
  fd.append('son', new Blob([new Uint8Array(taille)], { type: 'audio/webm' }), 'phrase.webm');
  const r = await handler(new Request('https://x/voix', { method: 'POST', headers: h, body: fd })); return { s: r.status, j: await r.json() };
};

// ── Qui a le droit ──
let r = await etat({ code: 'MARI0001', pin: '0000' });
t(r.s === 403 && r.j.motif === 'acces', 'un mauvais PIN : refusé');
r = await etat({ code: 'MARI0001', pin: '4321' });
t(r.s === 200 && r.j.ok && r.j.reste === 36000, `le PIN de l'équipe (un vendeur) : oui, 600 min ce mois (${r.j.reste} s)`);
r = await etat({ code: 'MARI0001' }, { authorization: 'Bearer aaa.bbb.ccc' });
t(r.j.ok, 'le patron connecté, sans PIN : oui (son compte possède la boutique)');
r = await etat({ code: 'SANS0001', pin: '9999' });
t(r.s === 200 && !r.j.ok && r.j.motif === 'abonnement', 'une boutique sans abonnement : « abonnement », pas une erreur');
r = await etat({ code: '64972 08757', pin: '1212' });
t(r.j.ok, 'un vrai code, avec son espace (« 64972 08757 ») : accepté');
r = await etat({ code: 'MARI0001<script>', pin: '4321' });
t(r.s === 403, 'un code bizarre ne va même pas jusqu\'à la base');
for (let i = 0; i < 8; i++) await etat({ code: 'MARI0001' });
t(!BASE.echecs.MARI0001, 'un téléphone sans PIN qui redemande ne bloque pas la boutique (aucun essai compté)');
for (let i = 0; i < 5; i++) await etat({ code: 'MARI0001', pin: '0' + i });
r = await etat({ code: 'MARI0001', pin: '4321' });
t(r.j.motif === 'bloque', 'cinq PIN faux de suite : la boutique est freinée, même avec le bon ensuite');
BASE.echecs.MARI0001 = 0;

// ── Transcrire ──
reseau.length = 0;
r = await dire({ code: 'MARI0001', pin: '4321', mots: JSON.stringify(['Mützig 65 cl', 'Eau Tangui', 'Tasty Tom']), duree: '3' });
const g = reseau.find(x => x.url.includes('api.groq.com'));
t(r.s === 200 && r.j.texte === 'deux Mützig et un Tangui' && r.j.fournisseur === 'groq', `la phrase revient en texte (« ${r.j.texte} », ${r.j.fournisseur})`);
t(!!g && g.i.headers.Authorization === 'Bearer CLE-GROQ-SECRETE', 'la clé part chez le fournisseur, depuis le serveur');
const fd = g && g.i.body; const prompt = fd && fd.get('prompt');
t(/Mützig 65 cl/.test(prompt) && /Tasty Tom/.test(prompt) && fd.get('language') === 'fr', `les articles de la boutique accompagnent la phrase (« ${String(prompt).slice(0, 70)}… »)`);
t(!JSON.stringify(r.j).includes('SECRETE'), 'la clé n\'est jamais renvoyée au téléphone');
t(BASE.usage.MARI0001 === 2.4, `la durée donnée par le fournisseur est comptée (${BASE.usage.MARI0001} s)`);

// Un mot de la liste ne peut pas casser l'invite.
r = await dire({ code: 'MARI0001', pin: '4321', mots: JSON.stringify(['a\u0000b<script>', ...Array.from({ length: 400 }, (_, i) => 'art' + i)]) });
const p2 = reseau.filter(x => x.url.includes('groq')).pop().i.body.get('prompt');
t(p2.length <= 800 && !/<script>|\u0000/.test(p2), `liste bornée et nettoyée (${p2.length} caractères)`);

// ── Secours, quota, limites ──
panne['api.groq.com'] = 500;
const avant = BASE.usage.MARI0001;
r = await dire({ code: 'MARI0001', pin: '4321', duree: '2' });
t(r.s === 200 && r.j.fournisseur === 'openai' && r.j.texte === 'mille cinq cents', 'Groq en panne : OpenAI prend le relais, la phrase passe quand même');
t(BASE.usage.MARI0001 - avant === 2, `sans durée du fournisseur : celle dite par le téléphone, bornée par la taille du son (${BASE.usage.MARI0001 - avant} s)`);
panne['api.openai.com'] = 503;
r = await dire({ code: 'MARI0001', pin: '4321' });
t(r.s === 502 && r.j.motif === 'service', 'tous les fournisseurs en panne : « service », le téléphone repassera au tactile');
panne = {};
r = await dire({ code: 'MARI0001', pin: '4321' }, {}, 600 * 1024);
t(r.s === 413, 'un son trop gros est refusé avant tout appel payant');
r = await dire({ code: 'SANS0001', pin: '9999' });
t(r.s === 402 && r.j.motif === 'abonnement', 'sans abonnement : rien n\'est envoyé chez le fournisseur (402)');
BASE.usage.MARI0001 = 36000;
r = await dire({ code: 'MARI0001', pin: '4321' });
t(r.s === 402 && r.j.motif === 'quota', 'les 600 minutes du mois sont passées : « quota »');
BASE.usage.MARI0001 = 0;

// ── Pas de clé : la voix payante n'est pas ouverte ──
delete ENV.VOIX_CLE_GROQ; delete ENV.VOIX_CLE_OPENAI;
r = await etat({ code: 'MARI0001', pin: '4321' });
t(!r.j.ok && r.j.motif === 'ferme', 'aucune clé configurée : « fermé », le téléphone garde la dictée gratuite');
ENV.VOIX_CLE_OPENAI = 'CLE-OPENAI-SECRETE'; ENV.VOIX_FOURNISSEUR = 'openai';
reseau.length = 0;
r = await dire({ code: 'MARI0001', pin: '4321' });
t(r.j.fournisseur === 'openai' && reseau.every(x => !x.url.includes('groq')), 'le fournisseur se change par un réglage serveur, sans toucher au code');
// ── La clé rangée en base (le patron ne pouvait pas poser un Secret) ──
delete ENV.VOIX_CLE_OPENAI; delete ENV.VOIX_FOURNISSEUR;
BASE.cles.push({ fournisseur: 'groq', cle: 'CLE-GROQ-EN-BASE' });
const _vrai = Date.now; Date.now = () => _vrai() + 6 * 60e3;   // la relecture des 5 minutes
reseau.length = 0;
r = await dire({ code: 'MARI0001', pin: '4321' });
const g2 = reseau.find(x => x.url.includes('api.groq.com'));
t(r.j.fournisseur === 'groq' && g2 && g2.i.headers.Authorization === 'Bearer CLE-GROQ-EN-BASE' && !JSON.stringify(r.j).includes('EN-BASE'), 'sans Secret, la clé rangée dans la table fermée sert, et ne revient jamais au téléphone');
Date.now = _vrai;

// ── 23.91 — comprendre : un morceau de phrase en lignes de panier ──
const CAT = [{ id: '40', nm: 'Mützig 65 cl' }, { id: '2', nm: 'Riz', m: 1 }, { id: '50', nm: 'Top', s: [{ id: '501', nm: 'Ananas' }, { id: '502', nm: 'Pamplemousse' }] }];
const comp = async (corps, h = {}) => { const r = await handler(new Request('https://x/voix', { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify({ action: 'comprendre', ...corps }) })); return { s: r.status, j: await r.json() }; };
r = await comp({ code: 'MARI0001', pin: '0000', texte: 'trois mutzig', articles: CAT });
t(r.s === 403, 'comprendre : un mauvais PIN est refusé, comme la transcription');
chat = { lignes: [{ id: '40', sorte: null, qte: 3 }, { id: '2', montant: 200 }, { id: '999', qte: 1 }, { id: '50', sorte: '777', qte: 2 }, { id: '50', sorte: '502', qte: 1e9 }], inconnus: ['sardine'] };
reseau.length = 0;
r = await comp({ code: 'MARI0001', pin: '4321', texte: 'mets-moi trois grosses mutzig et pour 200 de riz', articles: CAT });
const L = r.j.lignes || [];
t(r.s === 200 && L.length === 4 && L[0].id === '40' && L[0].qte === 3 && L[1].id === '2' && L[1].montant === 200, `« trois grosses mutzig et pour 200 de riz » : 3 Mützig, riz pour 200 (${JSON.stringify(L.slice(0, 2))})`);
t(!L.some(x => x.id === '999') && L[2].sorte === null && L[3].qte === null, 'un numéro hors catalogue est jeté, une sorte inconnue devient « à choisir », une quantité folle est effacée');
const ch = reseau.find(x => x.url.includes('/chat/completions')), envoi = ch ? JSON.parse(ch.i.body) : {};
t(ch && ch.i.headers.Authorization === 'Bearer CLE-GROQ-EN-BASE' && /40 \| Mützig 65 cl/.test(envoi.messages[1].content) && /502 Pamplemousse/.test(envoi.messages[1].content) && envoi.response_format.type === 'json_object', 'le modèle reçoit le catalogue de LA boutique (numéros et sortes), en réponse JSON obligatoire');
t(JSON.stringify(r.j.inconnus) === '["sardine"]' && !JSON.stringify(r.j).includes('EN-BASE'), 'ce qui n\'est pas au catalogue revient en « inconnus » ; la clé ne revient jamais');
retires = ['llama-3.3-70b-versatile']; reseau.length = 0;
r = await comp({ code: 'MARI0001', pin: '4321', texte: 'deux mutzig', articles: CAT });
const mods = reseau.filter(x => x.url.includes('/chat/completions')).map(x => JSON.parse(x.i.body).model);
t(r.j.ok && mods.join(',') === 'llama-3.3-70b-versatile,llama-3.1-8b-instant', `un modèle retiré par le fournisseur : le suivant prend le relais (${mods.join(' → ')})`);
retires = []; chat = 'pas du json {';
r = await comp({ code: 'MARI0001', pin: '4321', texte: 'deux mutzig', articles: CAT });
t(r.j.ok && r.j.lignes.length === 0, 'une réponse illisible du modèle : aucune ligne, jamais une erreur au comptoir');
r = await comp({ code: 'MARI0001', pin: '4321', texte: '', articles: CAT });
t(r.s === 400, 'une phrase vide ne part pas chez le fournisseur');
console.log(`voix : ${ok} ✅ · ${ko} ❌`);
process.exit(ko ? 1 : 0);
