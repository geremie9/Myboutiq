// t337 — UN CARTON COMPTE SES BOUTEILLES (24.19).
// L'agent « dépôt » (25/11) : 3 cartons vendus comptaient « 3 » dans les
// meilleurs articles et dans « À commander », pendant que le stock, lui,
// retirait les pièces. Et le pliage des vieilles ventes (archive) oubliait la
// taille du carton : le stock sautait le jour où la vente passait à l'archive.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t337');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
const { p, errs } = await ouvrirCaisse(b, port, d);

// Article 6 : Savon Mont Claire, 96 pièces, carton de 24.
await vendre(p, { lots: [[6, 24], [6, 24]] });
await vendre(p, { lignes: [[6, 3]] });
const r = await p.evaluate(() => {
  const q = qteVendueParArticle(30), q0 = qteVendueParArticle(0);
  const a = DB.articles.find(x => x.id === 6);
  return { q30: q[6], q0: q0[6], stk: getStk(a), lignes: DB.ventes.flatMap(v => v.lignes.filter(l => l.pid === 6).map(l => [l.qte || l.qty, l.qBase || 1])) };
});
t(r.q30 === 51 && r.q0 === 51, `2 cartons de 24 + 3 pièces : vendu 51 (avant : 5) — ${r.q30} · lignes ${JSON.stringify(r.lignes)}`);
t(r.stk === 96 - 51, `le stock retire les mêmes 51 pièces : ${r.stk}`);

// Le rapport du jour montre 51 sur la barre du savon
await p.evaluate(() => { try { renderRpt(); } catch (e) {} });
const rpt = await p.evaluate(() => { const row = [...document.querySelectorAll('#rpt-cont .bchart-row')].find(x => /Mont Claire/i.test(x.innerText)); return row ? row.innerText.replace(/\s+/g, ' ') : ''; });
t(/51/.test(rpt), `Meilleurs articles : « ${rpt} »`);

// L'archive : plier ces ventes ne change pas le stock affiché
const arch = await p.evaluate(() => {
  const a = () => DB.articles.find(x => x.id === 6);
  const avant = getStk(a());
  const nb = archiverAnciennesVentes(Date.now() + 60000);
  recomputeStock(DB);
  return { avant, nb, apres: getStk(a()), stk0: a().stk0, reste: DB.ventes.length };
});
t(arch.nb >= 2 && arch.apres === arch.avant, `ventes pliées dans l'archive (${arch.nb}) : stock ${arch.avant} → ${arch.apres} (avant : 45 → 91, 46 savons sortis du néant)`);

// Le dépôt : la bière en verre arrive en casier, même hors du catalogue
const mots = await p.evaluate(() => [['Castel 65 cl'], ['Isenbeck'], ['Kadji Beer 65cl'], ['Savon Azur 200 g'], ['Guinness 33 cl']].map(([nm]) => nm + '=' + _motContenant({ nm, vr: [] })).join(' · '));
t(/Castel 65 cl=casier/.test(mots) && /Isenbeck=casier/.test(mots) && /Kadji Beer 65cl=casier/.test(mots) && /Savon Azur 200 g=carton/.test(mots), `le mot du contenant : ${mots} (avant : « carton » de Castel)`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
