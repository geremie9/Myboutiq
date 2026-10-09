// t202 — LE CARTON ET LA PIÈCE : le même savon, deux prix. Un carton de 24
// vendu 13 000 F ne doit ni se facturer 24 × 600, ni sortir une seule pièce
// du stock.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t202');
const { s, port } = await serveur();
const b = await chromium.launch();
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
{
  const r = await vendre(p, { lots: [[6, 24]] });
  const l = r.v && r.v.lignes[0];
  t(r.v && r.v.total === 13000, `un carton : 13 000 F, pas 24 × 600 = 14 400 (${r.v && r.v.total})`);
  t(l && l.qte === 1 && l.qBase === 24 && l.gros && l.gros.mot === 'carton', `la ligne dit « 1 carton de 24 » (${l && l.nm})`);
  t(r.v.ben === 1000 && await stock(p, 6) === 72, `bénéfice 13 000 − 12 000 = 1 000 F ; stock 96 → 72 (${await stock(p, 6)})`);
}
{
  const r = await vendre(p, { lots: [[6, 24]], lignes: [[6, 3]] });
  t(r.v && r.v.total === 14800, `1 carton + 3 pièces = 13 000 + 1 800 = 14 800 F (${r.v && r.v.total})`);
  t(await stock(p, 6) === 45, `et 27 pièces sortent du stock (72 → ${await stock(p, 6)})`);
  const recu = await p.evaluate(() => dernierRecu.lignes.map(l => l.nm).join(' | '));
  t(/carton/.test(recu) && /\(24\)/.test(recu), `le reçu compte ce que le client emporte : « ${recu} »`);
}
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
