// t228 — CE QUE VAUT MA BOUTIQUE, ET L'INVENTAIRE (23.13).
// « Les clients me demandent souvent : est-ce que MyBoutiQ peut faire
// l'inventaire, de telle sorte que je connaisse la valeur exacte de ma
// boutique ? » Les chiffres attendus sont calculés ICI, à la main, depuis
// la boutique du banc — pas relus dans l'app.
//   Bière 48 × 520 · Riz 40 × 500 · Savon Azur 30 × 500 · Huile 20 × 1 100
//   Lait Nido 12 × 2 800 · Savon Mont Claire 96 × 500 · Piment 50 × (pas de
//   prix d'achat : pas compté, et dit) = 163 560 F de marchandise.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, nombre } from './caisse.mjs';
const { t, fin } = compteur('t228');
const { s, port } = await serveur();
const b = await chromium.launch();
const MARCH = 48 * 520 + 40 * 500 + 30 * 500 + 20 * 1100 + 12 * 2800 + 96 * 500;   // 163 560

const d = nouvelleBoutique(); d.clients[0].credit = 2500;               // Awa doit 2 500
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
await vendre(p, { lignes: [[2, 2]] });                                    // 2 riz en espèces : +1 200 en caisse, −1 000 de marchandise
await p.evaluate(() => navTo('stock', document.querySelectorAll('.ni')[1])); await p.waitForTimeout(400);

// ── 1) LA CARTE EN HAUT DU STOCK ─────────────────────────────────────
const carte = await p.evaluate(() => { const z = document.getElementById('stk-valeur');
  return { val: (z.querySelector('.vb-val b') || {}).textContent || '', inv: !!z.querySelector('.vb-inv'), trou: (z.querySelector('.stkv-trou') || {}).textContent || '' }; });
t(nombre(carte.val) === MARCH - 1000, `en haut du stock : la marchandise vaut ${carte.val} (calculé : ${MARCH - 1000})`);
t(carte.inv && /1 article sans prix d'achat/.test(carte.trou), `le bouton « Faire l'inventaire », et le Piment dit non compté (« ${carte.trou} »)`);

// ── 2) CE QUE VAUT MA BOUTIQUE ───────────────────────────────────────
await p.locator('#stk-valeur .vb-val').click(); await p.waitForTimeout(300);
const v = await p.evaluate(() => { const c = document.getElementById('vb-corps');
  return { total: c.querySelector('.vb-total b').textContent, lignes: Array.from(c.querySelectorAll('.vb-l')).map(x => x.querySelector('b').textContent), txt: c.innerText }; });
const caisse = await p.evaluate(() => caisseAttendue());
t(nombre(v.lignes[0]) === MARCH - 1000 && nombre(v.lignes[2]) === 2500, `marchandise ${v.lignes[0]} · crédits à recevoir ${v.lignes[2]}`);
t(nombre(v.lignes[1]) === caisse && caisse >= 1200, `l'argent attendu dans la caisse, le même que la clôture (${v.lignes[1]})`);
t(nombre(v.total) === MARCH - 1000 + 2500 + caisse, `le total : ${v.total} = marchandise + caisse + crédits`);
t(/sans prix d'achat n'est pas compté/.test(v.txt) && /Si tu vends tout ton stock/.test(v.txt) && /Pas encore d'inventaire/.test(v.txt),
  'il dit ce qu\'il ne compte pas, ce que rapporterait tout le stock, et qu\'aucun inventaire n\'a encore été fait');
await p.evaluate(() => closeSheet('ov-valeur'));

// ── 3) L'INVENTAIRE : COMPTER, VOIR L'ÉCART, VALIDER ──────────────────
await p.locator('#stk-valeur .vb-inv').click(); await p.waitForTimeout(300);
const tape = (k, x) => p.locator(`#inv-lst .inv-l[data-k="${k}"] .inv-in`).fill(x);
await tape('1-0', '45');      // Bière : 3 manquantes
await tape('2-0', '38');      // Riz : juste (40 − 2 vendus)
await tape('3-0', '32');      // Savon Azur : 2 en trop
await p.waitForTimeout(150);
const e = await p.evaluate(() => ({ b: document.getElementById('inv-e-1-0').textContent, r: document.getElementById('inv-e-2-0').textContent,
  a: document.getElementById('inv-e-3-0').textContent, prog: document.getElementById('inv-prog').textContent, res: document.querySelector('#inv-pied .inv-res').textContent }));
t(/−3 manquants/.test(e.b) && /1\s?560/.test(e.b), `Bière : « ${e.b} »`);
t(e.r === 'Juste' && /\+2 en trop/.test(e.a), `Riz « ${e.r} » · Savon Azur « ${e.a} »`);
t(/^3 \/ 7 comptés/.test(e.prog) && /Manque 3/.test(e.res) && /En trop 2/.test(e.res), `« ${e.prog} » — « ${e.res} »`);
// Il s'arrête : le brouillon reste, même après un rechargement.
await p.evaluate(() => closeSheet('ov-inv'));
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(() => { try { const ov = document.getElementById('ov-pin-v'); } catch (x) {} });
const rep = await p.evaluate(() => { ouvrirInventaire(); return document.querySelector('#inv-lst .inv-l[data-k="1-0"] .inv-in').value; });
t(rep === '45', `le comptage commencé est gardé, même après un rechargement (« ${rep} »)`);
const avant = await p.evaluate(() => ({ bi: getStk(DB.articles.find(a => a.id === 1)), ri: getStk(DB.articles.find(a => a.id === 2)),
  az: getStk(DB.articles.find(a => a.id === 3)), hu: getStk(DB.articles.find(a => a.id === 4)), n: DB.appros.length }));
await p.locator('#inv-ok').click(); await p.waitForTimeout(200);
const conf = await p.evaluate(() => ({ btn: document.getElementById('inv-ok').textContent, bi: getStk(DB.articles.find(a => a.id === 1)) }));
t(/Confirmer : corriger 2 articles/.test(conf.btn) && conf.bi === avant.bi, `une première touche montre ce qui va changer, sans rien toucher (« ${conf.btn} »)`);
await p.locator('#inv-ok').click(); await p.waitForTimeout(500);
const apres = await p.evaluate(() => ({ bi: getStk(DB.articles.find(a => a.id === 1)), ri: getStk(DB.articles.find(a => a.id === 2)),
  az: getStk(DB.articles.find(a => a.id === 3)), hu: getStk(DB.articles.find(a => a.id === 4)),
  adj: DB.appros.slice(-2).map(x => ({ pid: x.pid, qty: x.qty, adj: !!x.adj })), n: DB.appros.length,
  der: DB.cfg.dernierInventaire, j: (DB.journal || []).filter(x => /Inventaire/.test(x.art)).length,
  brouillon: localStorage.getItem('mb_inv_' + DB.cfg.code), ferme: !document.querySelector('#ov-inv.show'),
  garde: JSON.parse(localStorage.getItem('myboutiq_v6')).appros.length }));
t(apres.bi === 45 && apres.az === 32 && apres.ri === avant.ri && apres.hu === avant.hu, `le stock suit le comptage : Bière ${apres.bi}, Savon Azur ${apres.az} ; Riz et Huile ne bougent pas`);
t(apres.n === avant.n + 2 && apres.adj.every(x => x.adj) && apres.adj.map(x => x.qty).sort().join() === '-3,2', `deux MOUVEMENTS d'ajustement (−3, +2), pas un stock réécrit (${JSON.stringify(apres.adj)})`);
t(apres.garde === apres.n, 'et ils sont gardés sur le téléphone');
t(apres.der && apres.der.n === 3 && apres.der.ch === 2 && apres.der.ecart === -3 * 520 + 2 * 500, `le dernier inventaire est retenu : ${JSON.stringify(apres.der)}`);
t(apres.j === 1 && apres.brouillon === null && apres.ferme, 'une ligne au journal, le brouillon effacé, la feuille fermée');
const v2 = await p.evaluate(() => document.getElementById('vb-corps').innerText);
const der = (v2.match(/Dernier inventaire[^\n]*/) || [''])[0];
t(/3 articles/.test(der) && Math.abs(nombre(der.split('écart')[1] || '')) === 560 && /−/.test(der), `la valeur dit le dernier inventaire et son écart (« ${der} »)`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();

// ── 4) LE VENDEUR NE FAIT PAS L'INVENTAIRE ───────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { vendeur: 'Ibrahim' });
  const r = await p.evaluate(() => { window.__t = []; const st = showToast; showToast = m => __t.push(m); ouvrirInventaire(); showToast = st;
    return { ouvert: !!document.querySelector('#ov-inv.show'), dit: __t.join(' ') }; });
  t(!r.ouvert && /patron/i.test(r.dit), `un vendeur sans le droit « stock » ne l'ouvre pas (« ${r.dit} »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
