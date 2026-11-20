// t307 — LA VOIX SANS INTERNET, DANS LE TÉLÉPHONE (23.92).
// Le patron, le 20/11/2026 : « Go 1+2 » (couche 1 : la voix hors ligne).
// Les Chrome récents reconnaissent la parole sur l'appareil
// (SpeechRecognition.available / install, processLocally) et favorisent une
// liste de mots (SpeechRecognitionPhrase). Ici une fausse API, pilotée par le
// banc : on vérifie ce que l'app lui demande et ce qu'elle fait du texte.
// Avant : la dictée gratuite passait par les serveurs (rien hors ligne) et ne
// remplissait QUE la recherche — ni panier, ni relecture.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t307');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles[1].um = 'kg'; d.articles[1].px = 700;
d.articles.push({ id: 40, nm: 'Mützig 65 cl', e: '', cat: 'Boissons', px: 650, pa: 520, stk0: 48, al: 0, vd: 9 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
// La fausse reconnaissance du téléphone.
await p.evaluate(() => {
  window.__sr = { etat: 'available', installs: 0, dernier: null, texte: '' };
  window.SpeechRecognitionPhrase = function (phrase, boost) { this.phrase = phrase; this.boost = boost; };
  function SR() { window.__sr.dernier = this; this.start = () => { const r = this; setTimeout(() => r.onresult && r.onresult({ results: [[{ transcript: window.__sr.texte }]] }), 50); }; this.stop = () => {}; this.abort = () => {}; }
  SR.available = async (o) => { window.__sr.demande = o; return window.__sr.etat; };
  SR.install = async (o) => { window.__sr.installs++; window.__sr.etat = 'available'; return true; };
  window.SpeechRecognition = window.webkitSpeechRecognition = SR;
  parler = window.__parlerVrai;   // 23.93 — la voix parle par défaut : la relecture passe par elle
  window.__dit = []; window.speechSynthesis.speak = u => window.__dit.push(u.text); window.speechSynthesis.cancel = () => {};
  _vpro = { ok: false, ts: Date.now(), code: DB.cfg.code };   // pas de voix payante
});
const dire = async (phrase, horsLigne) => {
  await p.evaluate(([ph, hl]) => { window.__sr.texte = ph; window.__toasts = []; window.__dit = []; viderPanier(); document.getElementById('src-c').value = '';
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => !hl }); voiceSearch(); }, [phrase, horsLigne]);
  await p.waitForTimeout(500);
  return p.evaluate(() => ({ panier: JSON.parse(JSON.stringify(panier)), total: calcTotal(), dit: window.__dit.join(' | '), toast: window.__toasts.join(' / '), local: window.__sr.dernier && window.__sr.dernier.processLocally, phrases: (window.__sr.dernier && window.__sr.dernier.phrases || []).map(x => x.phrase), q: document.getElementById('src-c').value }));
};

// ── 1. Le téléphone sait : sans internet, la commande va au panier ──
const e = await p.evaluate(async () => await voixLocaleEtat());
t(e === 'available', 'l\'app demande au téléphone s\'il reconnaît le français sans internet');
let r = await dire('deux Mützig et pour 200 de riz', true);
t(r.local === true, 'hors ligne : la reconnaissance est demandée DANS le téléphone (processLocally)');
t(r.phrases.includes('Mützig 65 cl') && r.phrases.length >= 5, `avec les mots de la boutique en favoris (${r.phrases.slice(0, 3).join(', ')}…)`);
t(r.panier['40-0'] === 2 && r.total === 1500, `sans internet : 2 Mützig + riz pour 200 = ${r.total} F au panier`);
t(/2 Mützig/.test(r.dit) && /total/.test(r.dit), `et relu à voix haute : « ${r.dit} »`);

// ── 2. Pas encore téléchargée : en wifi, l'app la prépare ; sans internet, elle le dit ──
await p.evaluate(() => { window.__sr.etat = 'downloadable'; window.__sr.installs = 0; navigator.connection && Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ type: 'cellular', saveData: false }) }); });
await p.evaluate(async () => { _voixLocalePreparer(); await new Promise(r => setTimeout(r, 100)); });
t(await p.evaluate(() => window.__sr.installs) === 0, 'sur les données mobiles : la langue ne se télécharge pas toute seule');
await p.evaluate(async () => { window.__sr.etat = 'downloadable'; Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ type: 'wifi', saveData: false }) }); _voixLocalePreparer(); await new Promise(r => setTimeout(r, 100)); });
t(await p.evaluate(() => window.__sr.installs === 1 && _vLoc.etat === 'available'), 'en wifi : la langue se télécharge une fois, puis la voix marche sans internet');
await p.evaluate(() => { window.__sr.etat = 'downloadable'; _vLoc.etat = 'downloadable'; });
r = await dire('deux Mützig', true);
t(!Object.keys(r.panier).length && /Pas d'internet/.test(r.toast), `sans internet et pas encore prête : « ${r.toast} », rien de faux au panier`);

// ── 3. Un vieux téléphone (pas de voix locale) : comme avant, mais la commande va au panier ──
await p.evaluate(() => { delete window.SpeechRecognition.available; delete window.SpeechRecognition.install; });
const e3 = await p.evaluate(async () => await voixLocaleEtat());
r = await dire('trois Mützig', false);
t(e3 === 'absent' && !r.local && r.panier['40-0'] === 3 && /3 Mützig/.test(r.dit), `vieux téléphone, avec internet : la dictée de toujours, et « 3 Mützig » au panier, relu (avant : la recherche seulement)`);
r = await dire('tomate', false);
t(r.q === 'tomate', 'un mot inconnu reste une recherche');
// ── 4. Le verrou : une question qui a fait planter la page n'est plus jamais reposée ──
const v4 = await p.evaluate(async () => { window.SpeechRecognition.available = async () => 'available'; localStorage.setItem('myboutiq_vloc', 'essai'); const a = await voixLocaleEtat(); const m1 = localStorage.getItem('myboutiq_vloc'); const b2 = await voixLocaleEtat(); return { a, m1, b2 }; });
t(v4.a === 'absent' && v4.m1 === 'casse' && v4.b2 === 'absent', 'la page est morte pendant la question (marque « essai » restée) : ce téléphone ne la repose plus, la dictée de toujours reprend');
// ── 5. Jamais au démarrage ──
const v5 = await p.evaluate(() => { const src = String(lancerApp) + String(voixProEtat); return /_voixLocalePreparer|voixLocaleEtat/.test(src); });
t(!v5, 'rien ne demande la voix du téléphone au démarrage : seulement quand il touche le micro');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
