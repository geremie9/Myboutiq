// t280 — LE VENDEUR QUI SE CONNECTE ENTRE DANS L'ÉQUIPE DU PATRON (23.61).
// Le patron, le 15/11 : « un vendeur se connecte, le patron ne le voit pas
// dans ses équipes, même avec une bonne connexion ». Lu sur le vrai serveur :
// `boutique_ecrire2` remplace l'équipe écrite par un vendeur par la sienne.
// Le téléphone du vendeur s'ajoutait lui-même à l'équipe : effacé aussitôt.
// En base, « G » : Yeng, Kodji, Test, hamadou ont vendu, aucun n'est dans
// l'équipe. Le faux serveur du banc acceptait tout : il fait maintenant
// comme le vrai (code équipe → ni équipe, ni PIN).
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { nouvelleBoutique, vendre } from './caisse.mjs';
import { fauxSupaScript } from './faux-supa.mjs';
const { t, fin } = compteur('t280');
const { s, port } = await serveur();
const b = await chromium.launch();
const CODE = 'MARI0001', PIN = '123456', EQUIPE = '4321';

const base = nouvelleBoutique(); base.cfg.facon = 'detail'; base.cfg.pinVendeur = EQUIPE; base.cfg.pvPose = 1;
base.equipe = base.equipe.filter(m => m.role === 'patron');               // le patron seul, au départ
async function telephone(db, rangee, { vendeur = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR', timezoneId: 'Africa/Douala' });
  await ctx.addInitScript(fauxSupaScript());
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/politique-confidentialite.html`);
  await p.evaluate(db => { localStorage.clear(); localStorage.setItem('myboutiq_v6', JSON.stringify(db)); }, db);
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(1200);
  await p.evaluate(([rangee, PIN, EQUIPE, vendeur, CODE]) => {
    __fs.boutiques = [rangee]; __fs.pins[CODE] = PIN; __fs.pinsVendeur[CODE] = EQUIPE;
    window.__toasts = []; const st = window.showToast; window.showToast = function (m) { window.__toasts.push(String(m)); try { return st.apply(this, arguments); } catch (e) {} };
    window.parler = () => {}; window.confirm = () => true; _demarre = true;
    try { assurerConnexionSupa(); } catch (e) {}
    if (vendeur) { _shopPin = EQUIPE; _ouvrirCaisseVendeur(vendeur, DB.cfg.code); }
    else { role = 'patron'; _shopPin = PIN; lancerApp(); }
  }, [rangee, PIN, EQUIPE, vendeur, CODE]);
  await p.waitForTimeout(800);
  return { ctx, p, errs };
}
const rangee = d => ({ id: 'r1', code: CODE, nom: 'Ets Marie', owner_id: 'x', actif: true, plan: 'gratuit', updated_at: new Date().toISOString(), data: JSON.parse(JSON.stringify(d)), pin_vendeur_clair: null });
const ligneServeur = p => p.evaluate(() => JSON.parse(JSON.stringify(__fs.boutiques[0])));
const envoyer = async p => { await p.evaluate(async () => { _suppressSync = false; await syncToSupa(); }); await p.waitForTimeout(300); };

// 1. Le vendeur entre (par son lien), et vend.
const V = await telephone(base, rangee(base), { vendeur: 'Yeng' });
await vendre(V.p, { lignes: [[2, 1]] });
await envoyer(V.p);
let r = await ligneServeur(V.p);
const nmEq = r.data.equipe.map(m => m.nm);
t(!nmEq.includes('Yeng'), `le faux serveur fait comme le vrai : l'équipe écrite par un vendeur ne passe pas (${nmEq.join(', ')})`);
t((r.data.arrivees || []).some(a => a.nm === 'Yeng') && r.data.ventes.some(v => v.vendeur === 'Yeng'), 'son arrivée et sa vente, elles, sont au serveur');

// 2. Le téléphone du patron reçoit le signal, relit, et l'accueille.
const P = await telephone(base, rangee(base));
await P.p.evaluate(rg => { __fs.boutiques = [rg]; }, r);
await P.p.evaluate(() => _rtRefetch(DB.cfg.code)); await P.p.waitForTimeout(1500);
const e = await P.p.evaluate(() => ({ eq: DB.equipe.map(m => ({ nm: m.nm, role: m.role, actif: m.actif, perms: m.perms })), t: __toasts.join(' / '),
  vente: DB.ventes.some(v => v.vendeur === 'Yeng'), liste: (document.getElementById('equipe-lst') || {}).innerText || '' }));
const yeng = e.eq.find(m => m.nm === 'Yeng');
t(!!yeng && yeng.role === 'vendeur' && yeng.actif, `Yeng est dans l'équipe du patron (${e.eq.map(m => m.nm).join(', ')})`);
t(yeng && Object.keys(yeng.perms).filter(k => yeng.perms[k]).join(',') === 'vente', `avec les droits de départ seulement : vendre (${yeng && JSON.stringify(yeng.perms)})`);
t(/Yeng est entré dans ton équipe/.test(e.t), `le patron le lit : « ${e.t} »`);
t(/Yeng/.test(e.liste), 'et le voit dans « Mon équipe »');
t(e.vente, 'la vente de Yeng est dans sa journée');
await envoyer(P.p);
r = await ligneServeur(P.p);
t(r.data.equipe.some(m => m.nm === 'Yeng'), 'le patron l\'écrit au serveur : l\'équipe de la boutique le connaît maintenant');

// 3. Relu une seconde fois : pas de doublon, pas de second message.
await P.p.evaluate(() => { __toasts = []; _rtRefetch(DB.cfg.code); }); await P.p.waitForTimeout(800);
const e2 = await P.p.evaluate(() => ({ n: DB.equipe.filter(m => m.nm === 'Yeng').length, t: __toasts.join(' / ') }));
t(e2.n === 1 && !/entré/.test(e2.t), `relu : toujours un seul Yeng, pas de nouveau message (${e2.n})`);

// 4. Un vendeur que le patron a désactivé ne revient pas actif par son annonce.
await P.p.evaluate(() => { DB.equipe.find(m => m.nm === 'Yeng').actif = false; DB.arrivees.push({ id: 'dev2_' + Date.now() + '_z', nm: 'Yeng', ts: Date.now() }); _accueillirArrivees(); });
t(await P.p.evaluate(() => DB.equipe.find(m => m.nm === 'Yeng').actif === false), 'désactivé par le patron, il le reste malgré une nouvelle annonce');

// 5. Une annonce piégée reste du texte, sans droit.
await P.p.evaluate(() => { const d = JSON.parse(JSON.stringify(DB)); d.arrivees.push({ id: 'x<b>_1', nm: '<img src=x onerror=window.__xss=1>Bob', ts: Date.now(), perms: { stock: true } }); d.cfg._rev = DB.cfg._rev; _applyRemoteDB(d, true); });
await P.p.waitForTimeout(400);
const x = await P.p.evaluate(() => { const m = DB.equipe.find(m => /Bob/.test(m.nm)); return { nm: m && m.nm, perms: m && m.perms, xss: !!window.__xss }; });
t(x.nm && !/[<>"]/.test(x.nm) && !x.xss && !x.perms.stock, `une annonce piégée : « ${x.nm} », sans balise ni droit en plus`);
t(V.errs.length === 0 && P.errs.length === 0, 'aucune erreur JS' + ([...V.errs, ...P.errs].length ? ' : ' + [...V.errs, ...P.errs].join(' | ') : ''));
await V.ctx.close(); await P.ctx.close(); await b.close(); s.close(); fin();
