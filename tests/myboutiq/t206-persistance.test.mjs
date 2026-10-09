// t206 — UNE VENTE ENCAISSÉE EST UNE VENTE GARDÉE. Écrite dans le téléphone
// à l'instant même, relue après un redémarrage, et jamais perdue quand le
// téléphone est plein — on le dit, on ne la jette pas.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t206');
const { s, port } = await serveur();
const b = await chromium.launch();
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
{
  const r = await vendre(p, { lignes: [[2, 2]] });
  const disque = await p.evaluate(id => { const x = JSON.parse(localStorage.getItem('myboutiq_v6')); return x.ventes.some(v => v.id === id); }, r.v.id);
  t(disque, 'la vente est écrite dans le téléphone à l\'instant de l\'encaissement');
  await p.reload(); await p.waitForTimeout(1500);
  const relu = await p.evaluate(id => { const d = loadDB(); return { n: d.ventes.filter(v => v.id === id).length, stk: getStk(d.articles.find(a => a.id === 2)) }; }, r.v.id);
  t(relu.n === 1 && relu.stk === 38, `après redémarrage : la vente est là, une fois, et le stock dit 38 (${relu.stk})`);
}
{
  const r = await p.evaluate(() => {
    const d1 = migrateDBData(JSON.parse(localStorage.getItem('myboutiq_v6')));
    const a = d1.articles.map(x => [x.id, x.stk0, x.stk]).join(';');
    const d2 = migrateDBData(migrateDBData(JSON.parse(JSON.stringify(d1))));
    return { a, b: d2.articles.map(x => [x.id, x.stk0, x.stk]).join(';'), n1: d1.ventes.length, n2: d2.ventes.length };
  });
  t(r.a === r.b && r.n1 === r.n2, 'relire la boutique deux fois ne change ni le stock ni les ventes (migration sans effet de bord)');
}
await ctx.close();
// ── LE TÉLÉPHONE PLEIN ────────────────────────────────────────────────
{
  const x = await ouvrirCaisse(b, port, nouvelleBoutique());
  await x.p.evaluate(() => {
    window.__vraiSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k) { if (k === 'myboutiq_v6') { const e = new DOMException('plein', 'QuotaExceededError'); throw e; } return window.__vraiSet.apply(this, arguments); };
  });
  const r = await vendre(x.p, { lignes: [[2, 1]] });
  t(r.v && r.toasts.some(m => /plein/i.test(m)), `téléphone plein : la vente est faite et l'app le DIT (« ${r.toasts.filter(m => /plein/i.test(m)).join('') } »)`);
  const garde = await x.p.evaluate(id => { Storage.prototype.setItem = window.__vraiSet; persistDB(false);
    return JSON.parse(localStorage.getItem('myboutiq_v6')).ventes.some(v => v.id === id); }, r.v.id);
  t(garde, 'de la place revient : la vente, restée en mémoire, est écrite à la sauvegarde suivante');
  t(x.errs.length === 0, 'aucune erreur JS' + (x.errs.length ? ' : ' + x.errs.join(' | ') : ''));
  await x.ctx.close();
}
t(errs.length === 0, 'aucune erreur JS (première caisse)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await b.close(); s.close();
fin();
