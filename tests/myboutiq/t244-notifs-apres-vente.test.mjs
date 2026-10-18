// t244 — « ET SI JE VEUX FAIRE UNE ANNONCE POUR QUE, MÊME SANS AVOIR OUVERT
// L'APP, L'ANNONCE VIENNE ? » (23.25).
// Mesuré en base le 18/10 : un seul téléphone inscrit aux notifications sur
// 64 boutiques. L'app ne le proposait presque jamais. Elle le propose
// maintenant sur l'écran « Vente enregistrée », au patron, deux fois au plus.
// Et Rapports : à 390 px, le montant de tête était coupé (« FCFA 36 … »).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t244');
const { s, port } = await serveur();
const b = await chromium.launch();
// Le téléphone du banc fait comme un vrai téléphone : il peut recevoir, il
// n'a encore rien répondu. `pushActiver` est observé, pas exécuté.
const preparer = p => p.evaluate(() => {
  window._pushPossible = () => true;
  try { Object.defineProperty(Notification, 'permission', { get: () => 'default', configurable: true }); } catch (e) {}
  window.__push = 0; window.pushActiver = async () => { window.__push++; return true; };
});
const ecran = p => p.evaluate(() => ({ succ: document.getElementById('succ').classList.contains('show'),
  offre: getComputedStyle(document.getElementById('succ-push')).display !== 'none', txt: document.getElementById('succ-push').innerText }));
const vente = async p => { await p.evaluate(async () => { viderPanier(); addPanier(DB.articles.find(x => x.id === 2), 0); procederPmt(); selPmntVente('orange'); await encaisser(); }); await p.waitForTimeout(300); };

{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await preparer(p);
  await vente(p);
  let e = await ecran(p);
  t(e.succ && e.offre && /même app fermée/.test(e.txt), `après la vente, le patron se voit proposer les notifications (« ${e.txt.split('\n')[0]} »)`);
  await p.waitForTimeout(4500);
  t((await ecran(p)).succ, 'tant que la question est là, l’écran ne se ferme pas tout seul (4,5 s)');
  await p.locator('#succ-push-oui').tap(); await p.waitForTimeout(300);
  e = await ecran(p);
  t(!e.succ && await p.evaluate(() => __push === 1), '« Oui, préviens-moi » : l’inscription est lancée, l’écran se ferme');
  await vente(p); e = await ecran(p);
  t(e.succ && !e.offre, 'la vente suivante, le même jour : on ne redemande pas');
  await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('mb_push_offre')); o.t -= 8 * 864e5; localStorage.setItem('mb_push_offre', JSON.stringify(o)); });
  await vente(p); e = await ecran(p);
  t(e.offre, 'une semaine plus tard, une seconde et dernière fois');
  await p.locator('#succ-push-non').tap(); await p.waitForTimeout(300);
  t(!(await ecran(p)).succ && await p.evaluate(() => __push === 1), '« Plus tard » : l’écran se ferme, rien n’est demandé au téléphone');
  await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('mb_push_offre')); o.t -= 30 * 864e5; localStorage.setItem('mb_push_offre', JSON.stringify(o)); });
  await vente(p);
  t(!(await ecran(p)).offre, 'jamais une troisième fois');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// Le vendeur : jamais (c'est le téléphone du patron qu'on veut joindre).
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { vendeur: 'Ibrahim', tactile: true });
  await preparer(p); await vente(p);
  t(!(await ecran(p)).offre, 'au vendeur, on ne propose rien');
  t(errs.length === 0, 'aucune erreur JS (vendeur)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// Rapports : les trois chiffres de tête, entiers, à 360 et 390 px.
for (const w of [360, 390]) {
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await p.setViewportSize({ width: w, height: 800 });
  for (let i = 0; i < 6; i++) await vendre(p, { lots: [[6, 24]], mode: 'especes', recu: 15000 });
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); try { fermerSucces(); } catch (e) {} navTo('rapports', document.querySelectorAll('#s-caisse .bnav .ni')[2]); });
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => [...document.querySelectorAll('.rpt-ess b')].map(x => {
    const em = x.querySelector('em'), c = x.parentElement.getBoundingClientRect(), q = (em || x).getBoundingClientRect();
    return { txt: (em || x).textContent, entier: q.right <= c.right + 0.5 && (em || x).scrollWidth <= (em || x).clientWidth + 1, coupe: /…/.test(x.textContent) };
  }));
  t(r.length === 3 && r.every(x => x.entier && !x.coupe), `à ${w} px, les montants de tête sont entiers (${r.map(x => x.txt).join(' · ')})`);
  t(errs.length === 0, `aucune erreur JS (Rapports ${w} px)` + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
