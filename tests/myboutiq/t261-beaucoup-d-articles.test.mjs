// t261 — « Comment réagir face au nombre d'articles, 100, 1 000 ou plus…
// comment naviguer ? » (23.43)
// Mesuré avant : 1 000 articles = 13 000 nœuds dessinés d'un coup, une
// caisse de 60 écrans de haut, dans l'ordre de création. Un téléphone neuf
// (ou celui d'un vendeur) n'avait aucun classement : ce qui se vend le plus
// pouvait être tout en bas.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t261');
const { s, port } = await serveur();
const b = await chromium.launch();
const A = (id, nm, px) => ({ id, nm, e: '📦', cat: 'Divers', px, pa: Math.round(px * 0.8), stk0: 50, al: 0, vd: 0, vr: [] });
const grande = () => {
  const db = nouvelleBoutique(); db.cfg.facon = 'detail';
  db.articles = []; for (let i = 0; i < 1000; i++) db.articles.push(A(1000 + i, 'Article ' + (i + 1), 100 + (i % 20) * 50));
  db.nextId = 5000; return db;
};

// ── Le téléphone du patron vend : l'article 901 trois fois, le 501 une fois ──
const un = await ouvrirCaisse(b, port, grande(), { tactile: true });
await un.p.setViewportSize({ width: 360, height: 740 }); await un.p.waitForTimeout(400);
const v1 = await vendre(un.p, { lignes: [[1900, 3]], mode: 'especes' });
const v2 = await vendre(un.p, { lignes: [[1500, 1]], mode: 'especes' });
const dbApres = await un.p.evaluate(() => JSON.parse(localStorage.getItem('myboutiq_v6')));
t(!!v1 && !!v2 && dbApres.ventes.length === 2, 'deux vraies ventes passées par la caisse, dans une boutique de 1 000 articles');
await un.ctx.close();

// ── Un AUTRE téléphone ouvre la boutique : il n'a jamais rien touché ──
const { ctx, p, errs } = await ouvrirCaisse(b, port, dbApres, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(500);
const tuiles = () => p.evaluate(() => Array.from(document.querySelectorAll('#pgrid .pcard:not(.etg)')).map(c => Number(c.id.slice(3))));
const o1 = await tuiles();
t(o1[0] === 1900 && o1[1] === 1500 && o1[2] === 1000, `téléphone neuf : ce que la boutique vend le plus est devant (${o1.slice(0, 3).join(', ')})`);
t(o1.length === 60, `seules les premières tuiles sont dessinées à l'ouverture (${o1.length} sur 1 000)`);
t(!(await p.evaluate(() => !!document.querySelector('#pgrid .pcard.etg'))), 'les cartes « Tu vends aussi » attendent la fin de la liste');

// Il descend : la suite arrive toute seule, sans bouton.
const descendre = async () => { await p.evaluate(() => { const g = document.getElementById('pgrid'); let e = g; while (e && e.scrollHeight <= e.clientHeight + 4) e = e.parentElement; (e || document.scrollingElement).scrollTop = 1e7; window.scrollTo(0, 1e7); const x = document.getElementById('pgrid-suite'); if (x) x.scrollIntoView(); }); await p.waitForTimeout(250); };
await descendre();
const o2 = await tuiles();
t(o2.length >= 120 && o2.length < 1000, `en descendant, les suivantes se dessinent (${o2.length})`);
// La grille se redessine pendant qu'il est en bas : elle ne raccourcit pas sous son doigt.
const sousLeDoigt = () => p.evaluate(() => { const c = Array.from(document.querySelectorAll('#pgrid .pcard:not(.etg)')).filter(x => { const r = x.getBoundingClientRect(); return r.top > 150 && r.top < innerHeight - 100; })[0]; return c ? c.id + '@' + Math.round(c.getBoundingClientRect().top) : 'rien'; });
const d0 = await sousLeDoigt();
await p.evaluate(() => renderProd(DB.articles)); await p.waitForTimeout(100);
const d1 = await sousLeDoigt();
t(d0 !== 'rien' && Number(d0.slice(3)) !== o2[0] && d0 === d1, `redessinée pendant qu'il est en bas, la tuile sous son doigt ne bouge pas (${d0} → ${d1})`);
// Une tuile du deuxième lot vend comme les autres.
const cible = o2[75];
await p.evaluate(id => document.getElementById('pc-' + id).scrollIntoView({ block: 'center' }), cible); await p.waitForTimeout(200);
await p.locator('#pc-' + cible).tap(); await p.waitForTimeout(250);
t(await p.evaluate(id => (panier[id + '-0'] || panier[id] || Object.keys(panier).filter(k => k.split('-')[0] == id).length) ? true : false, cible), 'une tuile arrivée plus tard se vend d\'un toucher, comme les premières');
await p.evaluate(() => { try { viderPanier(); } catch (e) { } }); await p.waitForTimeout(200);
// Jusqu'au bout : tout y est, une seule fois.
for (let i = 0; i < 40 && (await tuiles()).length < 1000; i++) await descendre();
const o3 = await tuiles();
t(o3.length === 1000 && new Set(o3).size === 1000 && !(await p.evaluate(() => !!document.getElementById('pgrid-suite'))), `au bout de la descente les 1 000 sont là, chacun une fois (${o3.length})`);

// La recherche trouve un article qui n'était pas dessiné.
await p.evaluate(() => { document.getElementById('pc-' + (typeof DB !== 'undefined' ? document.querySelector('#pgrid .pcard').id.slice(3) : 0)).scrollIntoView(); renderProd(DB.articles); }); await p.waitForTimeout(200);
const avant = await p.evaluate(() => !!document.getElementById('pc-1998'));
{ const n0 = (await tuiles()).length; t(n0 >= 60 && n0 < 120, `remonté en haut, la grille ne redessine que le début (${n0} tuiles sur 1 000)`); }
await p.evaluate(() => filtrC('Article 999')); await p.waitForTimeout(200);
const o4 = await tuiles();
t(!avant && o4.length === 1 && o4[0] === 1998, 'la recherche trouve un article pas encore dessiné');
await p.evaluate(() => filtrC('')); await p.waitForTimeout(200);

// Un geste qui cherche une tuile lointaine (article tout juste créé) la trouve.
const loin = await p.evaluate(() => { const a = !!document.getElementById('pc-1997'); const d = _tuileCaisse(1997); return { a, d: !!d, n: document.querySelectorAll('#pgrid .pcard:not(.etg)').length }; });
t(!loin.a && loin.d && loin.n < 1001, 'une tuile lointaine est dessinée à la demande quand un geste en a besoin');

// Ce que CE téléphone touche passe devant le classement de la boutique.
await p.evaluate(() => renderProd(DB.articles)); await p.waitForTimeout(150);
await vendre(p, { lignes: [[1003, 1]], mode: 'especes' });
await p.evaluate(() => renderProd(DB.articles)); await p.waitForTimeout(150);
const o5 = await tuiles();
t(o5[0] === 1003 && o5[1] === 1900 && o5[2] === 1500, `ce que ce téléphone vient de vendre passe devant, le reste garde l'ordre de la boutique (${o5.slice(0, 3).join(', ')})`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();

// ── Une petite boutique : rien ne change ──
const petit = nouvelleBoutique(); petit.cfg.facon = 'detail';
const q = await ouvrirCaisse(b, port, petit, { tactile: true });
await q.p.waitForTimeout(300);
await vendre(q.p, { lignes: [[5, 2]], mode: 'especes' });
const dbP = await q.p.evaluate(() => JSON.parse(localStorage.getItem('myboutiq_v6')));
await q.ctx.close();
const r = await ouvrirCaisse(b, port, dbP, { tactile: true });
await r.p.waitForTimeout(300);
const o6 = await r.p.evaluate(() => Array.from(document.querySelectorAll('#pgrid .pcard:not(.etg)')).map(c => Number(c.id.slice(3))));
t(o6.join(',') === '1,2,3,4,5,6,7', `7 articles : son ordre de toujours, tout dessiné (${o6.join(',')})`);
await r.ctx.close();
await b.close(); s.close();
fin();
