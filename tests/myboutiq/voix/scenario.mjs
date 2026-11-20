import { BASE } from './faux-supa.mjs';
let handler; const ENV = { SUPABASE_URL: 'https://x', SUPABASE_SERVICE_ROLE_KEY: 'srv', VOIX_CLE_GROQ: 'CLE-GROQ-SECRETE', VOIX_CLE_OPENAI: 'CLE-OPENAI-SECRETE' };
globalThis.Deno = { env: { get: k => ENV[k] }, serve: h => { handler = h; } };
const reseau = []; let panne = {};
globalThis.fetch = async (u, i) => {
  const url = String(u); reseau.push({ url, i });
  const hote = new URL(url).host;
  if (panne[hote]) return new Response('{}', { status: panne[hote] });
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
r = await etat({ code: 'MARI0001<script>', pin: '4321' });
t(r.s === 403, 'un code bizarre ne va même pas jusqu\'à la base');
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
console.log(`voix : ${ok} ✅ · ${ko} ❌`);
process.exit(ko ? 1 : 0);
