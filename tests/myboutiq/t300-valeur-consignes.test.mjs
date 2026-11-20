// t300 — « CE QUE VAUT MA BOUTIQUE » NE COMPTE PLUS LES CONSIGNES COMME À LUI (23.85).
// Feuille de route V1 (avis du 20/11/2026). Le client laisse 100 F par
// bouteille et les reprend en la rendant : la valeur de la boutique les
// comptait comme son argent (dans la caisse, puis dans l'argent des jours
// passés). Un dépôt avec 300 bouteilles dehors se croyait 30 000 F plus riche.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t300');
const { s, port } = await serveur();
const b = await chromium.launch();
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());

const v0 = await p.evaluate(() => valeurBoutique());
t(!v0.consignes, `sans consigne prise, rien ne change (${v0.consignes || 0} F)`);

// 3 bières, 3 bouteilles consignées (100 F chacune) : le client paie 2 250 F.
await vendre(p, { lignes: [[1, 3]], consigne: { prises: 3 } });
const v1 = await p.evaluate(() => valeurBoutique());
t(v1.consignes === 300 && v1.consignesN === 3, `3 bouteilles dehors : ${v1.consignes} F à rendre (${v1.consignesN} emballages)`);
t(v1.caisse - v0.caisse === 2250 && v1.total - v0.total === 2250 - 300 - 3 * 520, `la caisse a bien 2 250 F de plus, mais la boutique ne vaut que la vente : +${v1.total - v0.total} F (1 950 − 3 × 520 de marchandise partie)`);

// Il en rend 2 en rachetant une bière : il reste 1 bouteille dehors.
await vendre(p, { lignes: [[1, 1]], consigne: { rendues: 2 } });
const v2 = await p.evaluate(() => valeurBoutique());
t(v2.consignes === 100 && v2.consignesN === 1, `2 bouteilles rendues : il reste ${v2.consignes} F à rendre (${v2.consignesN} dehors)`);

// La feuille le dit, en rouge, avec le nombre d'emballages.
const txt = await p.evaluate(() => { ouvrirValeur(); const l = document.querySelector('#vb-corps .vb-cons'); return l ? l.innerText.replace(/\s+/g, ' ') : ''; });
t(/Consignes à rendre/.test(txt) && /1 emballage dehors/.test(txt) && /pas le tien/.test(txt) && /−\s?100/.test(txt), `la feuille : « ${txt} »`);

// Une vente annulée rend ses consignes : elles ne sont plus dues.
const r = await vendre(p, { lignes: [[1, 2]], consigne: { prises: 2 } });
await p.evaluate((id) => { ventAnnulEnCours = id; confirmerAnnulVente(); }, r.v.id);
t(await p.evaluate(() => valeurBoutique().consignes) === 100, 'une vente annulée ne laisse pas de consigne à rendre');

// Trouvé en route : le prix d'achat impossible était annoncé « manquant ».
const ab = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 4); a.pa = 50000; save(); ouvrirValeur(); const l = document.querySelector('#vb-corps .vb-trou'); return { aber: valeurBoutique().aber, txt: l ? l.innerText : '' }; });
t(ab.aber >= 1 && /impossible/.test(ab.txt), `un prix d'achat impossible (50 000 F pour une huile à 1 300 F) est dit « impossible » (« ${ab.txt.trim()} »)`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
