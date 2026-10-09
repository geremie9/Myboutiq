// t200 — LA VENTE, DE BOUT EN BOUT : ce qui est payé, ce qui sort du stock,
// et où va l'argent. C'est le geste qui fait vivre la boutique : chaque
// chiffre ci-dessous finit dans le tiroir, sur le compte Mobile Money ou
// dans le carnet de crédit.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t200');
const { s, port } = await serveur();
const b = await chromium.launch();
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
const tiroir = () => p.evaluate(() => ({ esp: totalEspecesJour(), pb: paiementBreakdown(getCaisseSales()), totalV }));

// ── 1) EN ESPÈCES ─────────────────────────────────────────────────────
{
  const r = await vendre(p, { lignes: [[2, 3], [3, 1]], recu: 3000 });
  const v = r.v;
  t(v && v.total === 2450 && v.paiement.mode === 'especes', `3 riz + 1 savon = 2 450 F, en espèces (${v && v.total})`);
  t(v && v.ben === 450 && v.lignes.length === 2, `bénéfice : 3×100 + 150 = 450 F (${v && v.ben})`);
  t(await stock(p, 2) === 37 && await stock(p, 3) === 29, 'le stock suit : riz 40 → 37, savon 30 → 29');
  const pan = await p.evaluate(() => ({ n: Object.keys(panier).length, l: panierLibre.length }));
  t(pan.n === 0 && pan.l === 0, 'le panier est vide après la vente');
  const c = await tiroir();
  t(c.esp === 2450 && c.totalV === 2450, `le tiroir attend 2 450 F, le total du jour aussi (${c.esp} / ${c.totalV})`);
}
// ── 2) ORANGE MONEY : SUR LE TÉLÉPHONE, PAS DANS LE TIROIR ────────────
{
  const r = await vendre(p, { lignes: [[5, 1]], mode: 'orange' });
  const c = await tiroir();
  t(r.v && r.v.paiement.mode === 'orange' && r.v.total === 3200, 'lait 3 200 F par Orange Money');
  t(c.esp === 2450 && c.pb.orange === 3200, `le tiroir n'attend rien de plus (${c.esp}), Orange Money : ${c.pb.orange}`);
}
// ── 3) EN DEUX PARTIES : 1 000 EN BILLETS, LE RESTE PAR MTN ───────────
{
  const r = await vendre(p, { lignes: [[4, 2]], split: { especes: 1000, moyen: 'mtn' } });
  const pm = r.v && r.v.paiement;
  t(pm && pm.mode === 'mixte' && pm.especes === 1000 && pm.mobile === 1600 && pm.moyenMobile === 'mtn',
    `2 huiles 2 600 F : 1 000 espèces + 1 600 MTN (${JSON.stringify(pm)})`);
  const c = await tiroir();
  t(c.esp === 3450 && c.pb.mtn === 1600, `seuls les 1 000 F en billets entrent au tiroir (${c.esp}), MTN : ${c.pb.mtn}`);
}
// ── 4) À CRÉDIT : JAMAIS SANS SAVOIR QUI DOIT ─────────────────────────
{
  const sans = await vendre(p, { lignes: [[2, 1]], mode: 'credit' });
  t(!sans.v && sans.toasts.some(x => /client pour le crédit/.test(x)), `sans client, la vente à crédit est refusée (« ${sans.toasts.join(' / ')} »)`);
  const r = await vendre(p, { lignes: [[2, 1], [5, 1]], mode: 'credit', client: 1, avance: 500 });
  const pm = r.v && r.v.paiement;
  t(pm && pm.mode === 'credit' && pm.avance === 500 && pm.du === 3300, `3 800 F à crédit, 500 d'avance : Awa doit 3 300 (${JSON.stringify(pm)})`);
  const cr = await p.evaluate(() => DB.clients.find(c => c.id === 1).credit);
  t(cr === 3300, `le carnet de crédit d'Awa dit 3 300 F (${cr})`);
  const c = await tiroir();
  t(c.esp === 3950 && c.pb.credit === 3300, `seule l'avance entre au tiroir (${c.esp}) ; 3 300 F « à récupérer » (${c.pb.credit})`);
}
// ── 5) UN PANIER VIDE NE S'ENCAISSE PAS (22.89) ───────────────────────
{
  const n0 = await p.evaluate(() => DB.ventes.length);
  const r = await vendre(p, {});
  const n1 = await p.evaluate(() => DB.ventes.length);
  t(!r.v && n0 === n1, 'panier vide : aucune vente à 0 F enregistrée');
}
// ── 6) LA REMISE QUI FAIT VENDRE À PERTE SE VOIT AVANT DE VALIDER ─────
{
  const r = await vendre(p, { lignes: [[4, 1]], remise: 300 });
  t(/PERTE/i.test(r.info), `huile achetée 1 100, vendue 1 300 − 300 : l'app prévient (« ${r.info.trim()} »)`);
  t(r.v && r.v.total === 1000 && r.v.ben === -100, `et si on valide quand même : 1 000 F, bénéfice −100 (${r.v && r.v.total} / ${r.v && r.v.ben})`);
}
// ── 7) UN MONTANT LIBRE NE TOUCHE NI LE STOCK NI LE BÉNÉFICE ──────────
{
  const avant = await stock(p, 2);
  const r = await vendre(p, { lignes: [[2, 1]], libre: { nm: 'Recharge', px: 500 } });
  const l = r.v && r.v.lignes.find(x => x.libre);
  t(r.v && r.v.total === 1100 && l && l.pid === null && l.pa === 0, `riz + 500 F libres = 1 100 F ; la ligne libre n'a ni article ni coût`);
  t(await stock(p, 2) === avant - 1 && r.v.ben === 100, `seul le riz sort du stock, bénéfice 100 F — jamais inventé sur le libre`);
}
// ── 8) LE BÉNÉFICE D'UN ARTICLE SANS PRIX D'ACHAT N'EST PAS INVENTÉ ───
{
  const r = await vendre(p, { lignes: [[7, 5]] });
  const inc = await p.evaluate(v => getSaleCAInconnu(v), r.v);
  t(r.v && r.v.ben === 0 && inc === 500, `5 piments sans prix d'achat : bénéfice 0, 500 F de chiffre « au bénéfice inconnu » (${inc})`);
}
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();

// ── 9) LE VENDEUR : IL ENCAISSE SI LE PATRON L'A PERMIS, SINON NON ─────
{
  const db = nouvelleBoutique();
  db.equipe[1].perms = { vente: false };
  const v1 = await ouvrirCaisse(b, port, db, { vendeur: 'Ibrahim' });
  const r = await vendre(v1.p, { lignes: [[2, 1]] });
  t(!r.v && r.toasts.some(x => /pas autorisé à encaisser/.test(x)), `vente coupée par le patron : refusée (« ${r.toasts.join(' / ')} »)`);
  await v1.ctx.close();
  const v2 = await ouvrirCaisse(b, port, nouvelleBoutique(), { vendeur: 'Ibrahim' });
  const r2 = await vendre(v2.p, { lignes: [[2, 1]] });
  t(r2.v && r2.v.vendeur === 'Ibrahim', `vente permise : enregistrée à son nom (${r2.v && r2.v.vendeur})`);
  await v2.ctx.close();
}
await b.close(); s.close();
fin();
