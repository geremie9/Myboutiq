// t321 — LA VENTE D'ABORD, LE MÉNAGE APRÈS L'IMAGE (24.04).
// Mesuré au banc (processeur ralenti 6 fois, comme un petit Android) :
// encaisser coûtait 50 ms dans une boutique neuve, 120 ms à 800 ventes,
// 210 ms à 2 000, et grandissait à chaque vente. Les deux tiers : réécrire
// TOUTE la boutique dans le téléphone, et relire la date de chaque vente
// quatre fois. Ici on vérifie que la vente reste à l'abri sans attendre
// la boutique entière, et que le téléphone éteint entre les deux ne perd rien.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t321');
const { s, port } = await serveur();
const b = await chromium.launch();

// Encaisse par le vrai chemin et regarde le disque DANS LA MÊME tâche,
// avant que le ménage d'après l'image ait pu passer.
const encaisserEtRegarder = (p, o) => p.evaluate((o) => {
  window.__ecrits = [];
  const vrai = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k) { window.__ecrits.push(k); return vrai.apply(this, arguments); };
  viderPanier(); clientVente = o.client ? DB.clients.find(c => c.id === o.client) : null;
  addPanier(DB.articles.find(a => a.id === 2), 0);
  procederPmt(); selPmntVente(o.mode || 'especes');
  encaisser();
  Storage.prototype.setItem = vrai;
  const v = DB.ventes[DB.ventes.length - 1];
  return {
    id: v.id, ecrits: window.__ecrits.slice(), stk: getStk(DB.articles.find(a => a.id === 2)),
    carnet: JSON.parse(localStorage.getItem('mb_ventes_carnet') || '[]').map(e => e.v && e.v.id),
    // Lu par la propriété, pas par getItem : getItem range d'abord ce qui attend (voir section 6).
    entiere: JSON.parse(localStorage['myboutiq_v6']).ventes.some(x => x.id === v.id),
    ancienne: localStorage['myboutiq_v6'], carnetBrut: localStorage.getItem('mb_ventes_carnet'),
  };
}, o);

// ── 1) LA VENTE EN ESPÈCES : LE CARNET TOUT DE SUITE, LA BOUTIQUE APRÈS ─
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  const r = await encaisserEtRegarder(p, {});
  t(r.carnet.includes(r.id), 'à l\'instant de l\'encaissement, la vente est écrite au carnet');
  // Vu au banc (t233) dans une première version : le stock attendait lui aussi l'image.
  t(r.stk === 39, `le stock du riz est juste dès la vente, avant l'image (${r.stk})`);
  t(!r.ecrits.includes('myboutiq_v6'), `la boutique entière n'est PAS réécrite avant que l'écran réponde (écrit : ${r.ecrits.join(', ')})`);
  await p.waitForTimeout(400);
  const apres = await p.evaluate(id => ({ entiere: JSON.parse(localStorage.getItem('myboutiq_v6')).ventes.some(x => x.id === id), carnet: localStorage.getItem('mb_ventes_carnet') }), r.id);
  t(apres.entiere && apres.carnet === null, 'juste après l\'image, la boutique entière porte la vente et le carnet est vidé');
  t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) LE TÉLÉPHONE S'ÉTEINT ENTRE LES DEUX : LA VENTE REVIENT, UNE FOIS ─
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await vendre(p, { lignes: [[3, 1]] }); await p.waitForTimeout(400);          // une vente déjà bien rangée
  const r = await encaisserEtRegarder(p, {});
  t(!r.entiere && r.carnet.includes(r.id), 'instantané pris entre les deux : la vente est au carnet, pas encore dans la boutique');
  await p.waitForTimeout(400);
  // Le téléphone « s'est éteint » à cet instant : on remet le disque tel qu'il était.
  await p.evaluate(([a, c]) => { localStorage.setItem('myboutiq_v6', a); localStorage.setItem('mb_ventes_carnet', c); }, [r.ancienne, r.carnetBrut]);
  await p.reload(); await p.waitForTimeout(2000);
  const relu = await p.evaluate(id => ({
    n: (DB && DB.ventes || []).filter(v => v.id === id).length,
    disque: JSON.parse(localStorage.getItem('myboutiq_v6')).ventes.filter(v => v.id === id).length,
    carnet: localStorage.getItem('mb_ventes_carnet'), total: DB.ventes.length,
  }), r.id);
  t(relu.n === 1 && relu.disque === 1, `au redémarrage, la vente du carnet est revenue dans la boutique, une seule fois (${relu.n}/${relu.disque})`);
  t(relu.total === 2, `les deux ventes sont là, aucune en double (${relu.total})`);
  t(await stock(p, 2) === 39, `le stock du riz compte la vente revenue (${await stock(p, 2)})`);
  t(relu.carnet === null, 'le carnet est vidé une fois la vente rangée');
  // Rejouer un carnet déjà rangé ne double rien.
  const deux = await p.evaluate(([id, c]) => { localStorage.setItem('mb_ventes_carnet', c); _rejouerCarnet(); return DB.ventes.filter(v => v.id === id).length; }, [r.id, r.carnetBrut]);
  t(deux === 1, 'un carnet rejoué deux fois ne double pas la vente');
  // Le carnet d'une AUTRE boutique de ce téléphone reste au carnet.
  const autre = await p.evaluate(() => {
    const n = DB.ventes.length;
    localStorage.setItem('mb_ventes_carnet', JSON.stringify([{ c: 'AUTRE001', v: { id: 'x_1_ab', total: 1, lignes: [] } }]));
    _rejouerCarnet();
    return { n: DB.ventes.length - n, garde: JSON.parse(localStorage.getItem('mb_ventes_carnet') || '[]').length };
  });
  t(autre.n === 0 && autre.garde === 1, 'la vente d\'une autre boutique n\'entre pas ici et reste au carnet');
  t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) UNE VENTE À CRÉDIT ÉCRIT TOUT, TOUT DE SUITE ───────────────────
{
  const { ctx, p } = await ouvrirCaisse(b, port, nouvelleBoutique());
  const r = await encaisserEtRegarder(p, { client: 1, mode: 'credit' });
  t(r.entiere && !r.carnet.includes(r.id), 'crédit : la fiche du client change aussi, la boutique entière est écrite à l\'instant');
  await ctx.close();
}

// ── 4) LES VENTES DU JOUR, LUES AUTREMENT, DONNENT LA MÊME CHOSE ──────
{
  const { ctx, p } = await ouvrirCaisse(b, port, nouvelleBoutique());
  const r = await p.evaluate(() => {
    const auj = new Date(), hier = new Date(Date.now() - 864e5);
    const fr = d => d.toLocaleDateString('fr-FR'), iso = d => isoJour(d);
    // Données anciennes simulées (formats mêlés) : seules des ventes du banc les écrivent ainsi.
    DB.ventes = [
      { id: 'a_1_aa', date: fr(auj), heure: '23:50', total: 1 },
      { id: 'a_2_aa', date: iso(auj), total: 2 },
      { id: 'a_3_aa', total: 4 },                                   // sans date : compte pour aujourd'hui
      { id: 'a_4_aa', date: fr(hier), heure: '00:10', total: 8 },
      { id: 'a_5_aa', date: fr(auj), total: 16, annulee: true },
      { id: 'a_6_aa', date: 'n\'importe quoi', total: 32 },
    ];
    const ref = DB.ventes.filter(v => !v.annulee && isSaleToday(v)).map(v => v.id).join(',');
    return { ref, nouv: getTodaySales().map(v => v.id).join(',') };
  });
  t(r.nouv === r.ref, `getTodaySales lit les mêmes ventes qu'isSaleToday, vente par vente (${r.nouv})`);
  await ctx.close();
}

// ── 5) LA VENTE ÉCLAIR PASSE PAR LE MÊME CARNET ───────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  for (let i = 0; i < 3; i++) await vendre(p, { lignes: [[2, 1]] });
  await p.waitForTimeout(400);
  const n0 = await p.evaluate(() => DB.ventes.length);
  await p.locator('#pc-3').click(); await p.waitForTimeout(3600);
  const r = await p.evaluate(() => ({ n: DB.ventes.length, id: DB.ventes[DB.ventes.length - 1].id }));
  const disque = await p.evaluate(id => JSON.parse(localStorage.getItem('myboutiq_v6')).ventes.some(v => v.id === id), r.id);
  t(r.n === n0 + 1 && disque, 'la vente éclair est enregistrée et rangée dans la boutique entière');
  t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 6) LIRE OU REMPLACER LA BOUTIQUE RANGE D'ABORD LA VENTE EN ATTENTE ─
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  const r = await p.evaluate(() => {
    viderPanier(); addPanier(DB.articles.find(a => a.id === 2), 0); procederPmt(); encaisser();
    const id = DB.ventes[DB.ventes.length - 1].id;
    const lu = JSON.parse(localStorage.getItem('myboutiq_v6')).ventes.some(v => v.id === id);   // ex. : entrerDemo
    return { lu };
  });
  t(r.lu, 'relire la boutique juste après une vente (l\'exemple, un changement de boutique) la trouve avec la vente');
  const r2 = await p.evaluate(() => {
    viderPanier(); addPanier(DB.articles.find(a => a.id === 2), 0); procederPmt(); encaisser();
    localStorage.removeItem('myboutiq_v6');                                                   // ex. : déconnexion
    return new Promise(ok => setTimeout(() => ok(localStorage['myboutiq_v6'] === undefined || localStorage['myboutiq_v6'] === null), 400));
  });
  t(r2, 'une boutique effacée juste après une vente n\'est pas réécrite par le ménage en retard');
  t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

await b.close(); s.close();
fin();
