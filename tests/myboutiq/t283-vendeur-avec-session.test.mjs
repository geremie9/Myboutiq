// t283 — LE VENDEUR DONT LE TÉLÉPHONE GARDE UNE SESSION PATRON (23.63).
// Le patron, le 15/11, après la 23.61 : « toujours pas de liaison entre
// vendeurs et son patron, fouille même dans la base ».
// En base, « Ets koda » configurée le matin même : aucune vente de vendeur,
// aucune arrivée, seul le téléphone du patron y a écrit. Cause : `syncToSupa`
// ne prenait le chemin vendeur (code équipe) que si le téléphone n'avait
// AUCUNE session patron. Un vendeur qui a d'abord créé sa propre boutique,
// ou qui vend sur un téléphone de test, en a une : la barrière « session
// d'un autre patron » refusait alors tout, en silence.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { nouvelleBoutique, vendre } from './caisse.mjs';
import { fauxSupaScript } from './faux-supa.mjs';
const { t, fin } = compteur('t283');
const { s, port } = await serveur();
const b = await chromium.launch();
const CODE = 'MARI0001', PIN = '123456', EQUIPE = '4321';
const base = nouvelleBoutique(); base.cfg.facon = 'detail'; base.cfg.pinVendeur = EQUIPE; base.cfg.pvPose = 1;
base.cfg.ownerEmail = '237611111111@myboutiq.app'; base.cfg.ownerId = 'patron1';
base.equipe = base.equipe.filter(m => m.role === 'patron');
const rangee = d => ({ id: 'r1', code: CODE, nom: 'Ets Marie', owner_id: 'patron1', actif: true, plan: 'gratuit', updated_at: new Date().toISOString(), data: JSON.parse(JSON.stringify(d)), pin_vendeur_clair: null });

async function telephone(rg, { vendeur = null, session = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR', timezoneId: 'Africa/Douala' });
  await ctx.addInitScript(fauxSupaScript());
  const p = await ctx.newPage(); const errs = [], avert = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  p.on('console', m => { if (/autre patron/i.test(m.text())) avert.push(m.text()); });
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/politique-confidentialite.html`);
  await p.evaluate(db => { localStorage.clear(); localStorage.setItem('myboutiq_v6', JSON.stringify(db)); }, base);
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(1200);
  await p.evaluate(([rg, PIN, EQUIPE, CODE, vendeur, session]) => {
    __fs.boutiques = [rg]; __fs.pins[CODE] = PIN; __fs.pinsVendeur[CODE] = EQUIPE;
    __fs.comptes['237611111111@myboutiq.app'] = { id: 'patron1', pin: PIN };
    __fs.session = session;
    window.__toasts = []; const st = window.showToast; window.showToast = function (m) { window.__toasts.push(String(m)); try { return st.apply(this, arguments); } catch (e) {} };
    window.parler = () => {}; window.confirm = () => true; _demarre = true;
    try { assurerConnexionSupa(); } catch (e) {}
    if (vendeur) { _shopPin = EQUIPE; _ouvrirCaisseVendeur(vendeur, DB.cfg.code); }
    else { role = 'patron'; _shopPin = PIN; lancerApp(); }
  }, [rg, PIN, EQUIPE, CODE, vendeur, session]);
  await p.waitForTimeout(800);
  return { ctx, p, errs, avert };
}
const ligne = p => p.evaluate(() => JSON.parse(JSON.stringify(__fs.boutiques[0])));

// 1. Le téléphone du vendeur garde la session de SA boutique à lui (un autre compte).
const AUTRE = { user: { id: 'autre', email: '237622222222@myboutiq.app' } };
const V = await telephone(rangee(base), { vendeur: 'Kodji', session: AUTRE });
await vendre(V.p, { lignes: [[2, 1]] });
const ok = await V.p.evaluate(async () => { _suppressSync = false; return await syncToSupa(); });
await V.p.waitForTimeout(300);
let r = await ligne(V.p);
const appels = await V.p.evaluate(() => __fs.appels.map(a => a.quoi + ':' + a.table));
t(ok === true, `l'envoi du vendeur aboutit (avant : refusé en silence) — rendu ${ok}`);
t(r.data.ventes.some(v => v.vendeur === 'Kodji'), 'sa vente est au serveur');
t((r.data.arrivees || []).some(a => a.nm === 'Kodji'), 'son arrivée est au serveur');
t(appels.some(a => /boutique_ecrire2/.test(a)) && !appels.some(a => /^update:boutiques/.test(a)), `par le code équipe (boutique_ecrire2), jamais en propriétaire (${appels.filter(a => /ecrire|update|insert/.test(a)).join(', ')})`);
t(r.owner_id === 'patron1' && r.data.cfg.ownerId !== 'autre', `la boutique reste au patron (owner ${r.owner_id}, cfg.ownerId ${r.data.cfg.ownerId})`);
t(V.avert.length === 0, `plus de « session d'un autre patron » sur le téléphone du vendeur (${V.avert.length})`);
t(await V.p.evaluate(() => !!(__fs.session && __fs.session.user.id === 'autre')), 'sa session à lui n\'est pas fermée : il rouvrira sa boutique sans retaper son PIN');

// 2. Le patron (sa vraie session) relit : Kodji entre dans son équipe.
const P = await telephone(rangee(base), { session: { user: { id: 'patron1', email: '237611111111@myboutiq.app' } } });
await P.p.evaluate(rg => { __fs.boutiques = [rg]; }, r);
await P.p.evaluate(() => _rtRefetch(DB.cfg.code)); await P.p.waitForTimeout(1500);
const e = await P.p.evaluate(() => ({ eq: DB.equipe.map(m => m.nm), t: __toasts.join(' / '), vente: DB.ventes.some(v => v.vendeur === 'Kodji') }));
t(e.eq.includes('Kodji') && /Kodji est entré dans ton équipe/.test(e.t), `le patron voit Kodji entrer dans son équipe (${e.eq.join(', ')} · « ${e.t} »)`);
t(e.vente, 'et sa vente dans sa journée');
const okP = await P.p.evaluate(async () => { _suppressSync = false; return await syncToSupa(); });
r = await ligne(P.p);
t(okP === true && r.data.equipe.some(m => m.nm === 'Kodji'), 'le patron écrit toujours en propriétaire, et l\'équipe du serveur connaît Kodji');
t(V.errs.length === 0 && P.errs.length === 0, 'aucune erreur JS' + ([...V.errs, ...P.errs].length ? ' : ' + [...V.errs, ...P.errs].join(' | ') : ''));
await V.ctx.close(); await P.ctx.close(); await b.close(); s.close(); fin();
