// t201 — ANNULER UNE VENTE REND TOUT : le stock, le tiroir, le total du
// jour, et la dette du client. Et seul celui qui en a le droit peut le faire.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t201');
const { s, port } = await serveur();
const b = await chromium.launch();
const annuler = (p, id) => p.evaluate(id => { window.__toasts = []; annulerVente(id); confirmerAnnulVente(); return window.__toasts.slice(); }, id);
const etat = p => p.evaluate(() => ({ esp: totalEspecesJour(), totalV, n: getCaisseSales().length,
  awa: DB.clients.find(c => c.id === 1).credit }));

const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
// ── 1) UNE VENTE EN ESPÈCES ───────────────────────────────────────────
{
  const r = await vendre(p, { lignes: [[2, 3]] });
  t(await stock(p, 2) === 37, 'vendu : 3 riz sortent du stock (40 → 37)');
  await annuler(p, r.v.id);
  const e = await etat(p);
  const v = await p.evaluate(id => DB.ventes.find(x => x.id === id), r.v.id);
  t(v.annulee === true && await stock(p, 2) === 40, `annulée : la vente reste dans l'historique, marquée, et le riz revient (stock ${await stock(p, 2)})`);
  t(e.esp === 0 && e.totalV === 0 && e.n === 0, `le tiroir et le total du jour l'oublient (${e.esp} / ${e.totalV})`);
  await annuler(p, r.v.id);
  t(await stock(p, 2) === 40, 'annuler deux fois ne rend pas deux fois');
}
// ── 2) UNE VENTE À CRÉDIT : LA DETTE S'EFFACE AVEC ELLE ───────────────
{
  const r = await vendre(p, { lignes: [[5, 1]], mode: 'credit', client: 1, avance: 0 });
  t((await etat(p)).awa === 3200, 'Awa doit 3 200 F après la vente à crédit');
  await annuler(p, r.v.id);
  const e = await etat(p);
  t(e.awa === 0 && await stock(p, 5) === 12, `vente annulée : Awa ne doit plus rien (${e.awa}), le lait revient`);
}
// ── 3) UN CARTON ANNULÉ REND SES 24 PIÈCES ────────────────────────────
{
  const r = await vendre(p, { lots: [[6, 24]] });
  t(await stock(p, 6) === 72, 'un carton vendu : 96 → 72 pièces');
  await annuler(p, r.v.id);
  t(await stock(p, 6) === 96, `annulé : les 24 pièces reviennent (${await stock(p, 6)})`);
}
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();
// ── 4) LE VENDEUR SANS LE DROIT D'ANNULER ─────────────────────────────
{
  const v = await ouvrirCaisse(b, port, nouvelleBoutique(), { vendeur: 'Ibrahim' });
  const r = await vendre(v.p, { lignes: [[2, 2]] });
  const msg = await annuler(v.p, r.v.id);
  const x = await v.p.evaluate(id => DB.ventes.find(y => y.id === id).annulee, r.v.id);
  t(!x && await stock(v.p, 2) === 38 && msg.some(m => /pas donné ce droit/.test(m)),
    `sans le droit « annuler », la vente reste (« ${msg.join(' / ')} »)`);
  await v.ctx.close();
}
await b.close(); s.close();
fin();
