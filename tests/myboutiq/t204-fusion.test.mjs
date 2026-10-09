// t204 — DEUX TÉLÉPHONES, UNE BOUTIQUE. Chacun vend de son côté ; quand ils
// se retrouvent (synchronisation), les ventes s'ADDITIONNENT : aucune ne
// disparaît, aucune n'est comptée deux fois, et une annulation l'emporte.
// On fusionne exactement comme la synchronisation le fait : mergeDB.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t204');
const { s, port } = await serveur();
const b = await chromium.launch();
const A = await ouvrirCaisse(b, port, nouvelleBoutique());                       // le patron, au comptoir
const B = await ouvrirCaisse(b, port, nouvelleBoutique(), { vendeur: 'Ibrahim' }); // le vendeur, à l'autre bout
const copie = x => x.p.evaluate(() => JSON.parse(JSON.stringify(DB)));
// Ce que fait la synchro : la boutique distante fusionnée dans celle du téléphone.
const recevoir = (x, distant, sens) => x.p.evaluate(([d, sens]) => {
  DB = migrateDBData(sens === 'inverse' ? mergeDB(DB, d) : mergeDB(d, DB)); recalcTotaux();
  return { n: DB.ventes.length, annulees: DB.ventes.filter(v => v.annulee).length };
}, [distant, sens || '']);

await vendre(A.p, { lignes: [[2, 3]] });                                  // A : 3 riz, espèces
const vb = await vendre(B.p, { lignes: [[2, 2], [5, 1]], mode: 'orange' }); // B : 2 riz + 1 lait, Orange
{
  const r = await recevoir(A, await copie(B));
  t(r.n === 2, `A reçoit la vente de B : 2 ventes, pas 1, pas 3 (${r.n})`);
  t(await stock(A.p, 2) === 35 && await stock(A.p, 5) === 11, `le stock compte les DEUX téléphones : riz 40 − 3 − 2 = ${await stock(A.p, 2)}, lait ${await stock(A.p, 5)}`);
  const r2 = await recevoir(A, await copie(B));
  t(r2.n === 2 && await stock(A.p, 2) === 35, 'la même synchro reçue deux fois ne double rien');
  const tot = await A.p.evaluate(() => ({ esp: totalEspecesJour(), orange: paiementBreakdown(getCaisseSales()).orange }));
  t(tot.esp === 1800 && tot.orange === 4400, `sur le téléphone du patron : 1 800 F en espèces (les siennes), 4 400 F Orange (celles de B)`);
}
// ── B ANNULE SA VENTE : L'ANNULATION VOYAGE ───────────────────────────
{
  await B.p.evaluate(id => { annulerVente(id); confirmerAnnulVente(); }, vb.v.id);
  // ⚠️ Le vendeur n'a pas le droit « annuler » par défaut : c'est le patron
  // qui l'accorde. On le lui donne, puis il annule pour de bon.
  await B.p.evaluate(id => { DB.equipe.find(x => x.nm === 'Ibrahim').perms.annuler = true; annulerVente(id); confirmerAnnulVente(); }, vb.v.id);
  const r = await recevoir(A, await copie(B));
  t(r.n === 2 && r.annulees === 1, `A apprend l'annulation : la vente reste, marquée annulée (${r.annulees})`);
  t(await stock(A.p, 2) === 37 && await stock(A.p, 5) === 12, `et la marchandise revient au stock du patron (riz ${await stock(A.p, 2)}, lait ${await stock(A.p, 5)})`);
  // Le chemin inverse (écriture vers le serveur) donne la même réponse.
  const r2 = await recevoir(A, await copie(B), 'inverse');
  t(r2.n === 2 && r2.annulees === 1 && await stock(A.p, 2) === 37, 'dans l\'autre sens de fusion : le même résultat');
}
// ── UNE AUTRE BOUTIQUE NE SE MÉLANGE JAMAIS ───────────────────────────
{
  const autre = nouvelleBoutique(); autre.cfg.code = 'AUTR0002'; autre.cfg.nom = 'Chez Paul';
  autre.ventes = [{ id: 'X_1', total: 99999, date: new Date().toLocaleDateString('fr-FR'), lignes: [{ pid: 2, qty: 40, qte: 40, px: 600, pa: 500 }], annulee: false, paiement: { mode: 'especes' } }];
  // Le chemin de la synchronisation : la boutique du téléphone d'abord.
  // (À la connexion, c'est l'inverse et c'est voulu : la boutique DEMANDÉE
  // fait foi, et le cache d'une autre a déjà été vidé — assurerBoutiqueLocale.)
  const r = await recevoir(A, autre, 'inverse');
  const nom = await A.p.evaluate(() => DB.cfg.nom);
  t(r.n === 2 && nom === 'Ets Marie' && await stock(A.p, 2) === 37, `la boutique d'un autre est refusée : ni ses ventes, ni son nom (${nom})`);
}
t(A.errs.length === 0 && B.errs.length === 0, 'aucune erreur JS' + (A.errs.concat(B.errs).length ? ' : ' + A.errs.concat(B.errs).join(' | ') : ''));
await A.ctx.close(); await B.ctx.close(); await b.close(); s.close();
fin();
