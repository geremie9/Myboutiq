// t327 — L'HUILE DE PALME SE VEND AU LITRE (24.09).
// Le patron, le 23/11 : « elle se vend au litre ». Mesuré en base : « Huile de
// palme » sans unité dans 15 boutiques, vendue à la pièce, sans la feuille des
// mesures (« pour un montant », ¼ · ½ · 1 · 2 · 5).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t327');
const { s, port } = await serveur();
const b = await chromium.launch();
const A = (id, nm, px, extra) => Object.assign({ id, nm, e: '', cat: 'Divers', px, pa: Math.round(px * .8), stk0: 40, al: 0, vd: 0, vr: [] }, extra || {});
const d = nouvelleBoutique(); d.cfg.venteDeverrouillee = false;
d.articles.push(A(70, 'Huile de palme', 1000), A(71, 'Huile de palme 1 L', 1200), A(72, 'Huile de palme', 900, { um: 'pc', id: 72 }), A(73, 'huile de PALME', 800));
d.articles.find(a => a.id === 72).nm = 'Huile de palme';
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
const u = await p.evaluate(() => Object.fromEntries([70, 71, 72, 73].map(id => [id, _umDe(DB.articles.find(a => a.id === id)) || 'pièce'])));
t(u[70] === 'L' && u[73] === 'L', `« Huile de palme » se vend au litre, quelle que soit la casse (${u[70]}, ${u[73]})`);
t(u[71] === 'pièce', '« Huile de palme 1 L » est une bouteille : à la pièce');
t(u[72] === 'pièce', 'une huile de palme réglée « à la pièce » dans sa fiche le reste');
await p.evaluate(() => { renderProd(DB.articles); document.getElementById('pc-70').click(); });
await p.waitForTimeout(200);
const f = await p.evaluate(() => ({ o: document.getElementById('ov-qte').classList.contains('show'), art: document.getElementById('qte-art').textContent }));
t(f.o && /\/\s?L/.test(f.art), `la tuile ouvre la feuille des mesures (« ${f.art} »)`);
await p.evaluate(() => qtePourMontant(500)); await p.waitForTimeout(100);
t(await p.evaluate(() => panier['70-0'] === 0.5), '« pour 500 » : un demi-litre au panier');
t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
