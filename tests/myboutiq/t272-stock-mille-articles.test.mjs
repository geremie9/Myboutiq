// t272 — LE STOCK ET L'INVENTAIRE À 1 000 ARTICLES (23.53).
// Mesuré le 14/11 (processeur ralenti six fois) : 2 s pour ouvrir le Stock,
// 93 écrans de haut, redessiné en entier après chaque arrivage ; l'inventaire,
// 1 000 champs sur 88 écrans.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, stock } from './caisse.mjs';
const { t, fin } = compteur('t272');
const { s, port } = await serveur();
const b = await chromium.launch();
const cats = ['Alimentation', 'Boissons', 'Ménage', 'Hygiène'];
const db = nouvelleBoutique(); db.cfg.facon = 'detail'; db.articles = [];
for (let i = 0; i < 1000; i++) db.articles.push({ id: 1000 + i, nm: 'Article ' + (i + 1), e: '📦', cat: cats[Math.floor(i / 250)], px: 500, pa: 400, stk0: 10, al: 3, vd: 0, vr: [] });
db.articles[700].stk0 = 2;                                  // un article bas, loin dans la liste
db.nextId = 5000;
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(400);
const lignes = () => p.evaluate(() => document.querySelectorAll('#stk-lst .sit').length);
const rayons = () => p.evaluate(() => [...document.querySelectorAll('#stk-lst .scat-h')].map(x => x.textContent.replace(/[▾▸]/g, '').replace(/\d+$/, '').trim()));
const descendre = async () => { await p.evaluate(() => { const x = document.getElementById('stk-suite'); if (x) x.scrollIntoView(); }); await p.waitForTimeout(250); };

// ── Le Stock ──
await p.evaluate(() => navTo('stock', document.querySelectorAll('.ni')[1])); await p.waitForTimeout(400);
t((await lignes()) === 60, `à l'ouverture, 60 lignes dessinées sur 1 000 (${await lignes()})`);
t((await rayons()).join(',') === 'Alimentation', `un rayon n'apparaît qu'avec ses lignes : seul « Alimentation » est là (${(await rayons()).join(', ')})`);
t(/1000 articles/.test(await p.evaluate(() => document.getElementById('stk-compte').textContent)), 'le compte dit toujours 1 000 articles');
await descendre();
t((await lignes()) >= 120, `en descendant, la suite arrive (${await lignes()})`);
for (let i = 0; i < 30 && (await lignes()) < 1000; i++) await descendre();
t((await lignes()) === 1000 && (await rayons()).join(',') === cats.join(','), `au bout : les 1 000 lignes, les 4 rayons dans l'ordre (${(await rayons()).join(', ')})`);
// Redessinée pendant qu'il est en bas : la ligne sous son doigt ne bouge pas.
const doigt = () => p.evaluate(() => { const r = [...document.querySelectorAll('#stk-lst .sit')].find(x => { const b = x.getBoundingClientRect(); return b.top > 200 && b.top < innerHeight - 150; }); return r ? r.querySelector('.sinm').textContent + '@' + Math.round(r.getBoundingClientRect().top) : ''; });
await p.evaluate(() => { const r = document.querySelectorAll('#stk-lst .sit')[400]; r.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(200);
const d0 = await doigt();
await p.evaluate(() => renderStock(DB.articles)); await p.waitForTimeout(150);
const d1 = await doigt();
t(d0 !== '' && d0 === d1, `redessinée pendant qu'il est au milieu, la ligne sous son doigt ne bouge pas (${d0} → ${d1})`);
// Un arrivage sur un article lointain : il est bien enregistré, la liste ne repart pas en haut.
const art = await p.evaluate(() => DB.articles[650].id);
await p.evaluate(id => { ouvrirStk(DB.articles.find(a => a.id === id)); document.getElementById('inp-sqte').value = 7; saveStk(); }, art);
t((await stock(p, art)) === 17, 'un arrivage sur un article lointain est enregistré (10 + 7)');
await p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
// Remonté en haut et redessiné : on revient à 60 lignes.
await p.evaluate(() => { window.scrollTo(0, 0); document.querySelector('#s-stock').scrollTop = 0; document.getElementById('stk-lst').firstElementChild.scrollIntoView(); renderStock(DB.articles); }); await p.waitForTimeout(150);
t((await lignes()) <= 120, `remonté en haut, la liste ne redessine que le début (${await lignes()})`);
// La recherche et les filtres trouvent ce qui n'était pas dessiné.
await p.evaluate(() => filtrS('Article 999')); await p.waitForTimeout(150);
t((await p.evaluate(() => [...document.querySelectorAll('#stk-lst .sinm')].map(x => x.textContent.trim()).join(','))) === 'Article 999', 'la recherche trouve un article qui n\'était pas dessiné');
await p.evaluate(() => { filtrS(''); filtreStock('bas'); }); await p.waitForTimeout(150);
t((await p.evaluate(() => [...document.querySelectorAll('#stk-lst .sinm')].map(x => x.textContent.trim()).join(','))) === 'Article 701', '« Stock bas » trouve l\'article bas, 700 lignes plus loin');
await p.evaluate(() => filtreStock('tout'));
// Un rayon replié ne coûte qu'un en-tête.
await p.evaluate(() => toggleCatStock('Alimentation')); await p.waitForTimeout(150);
t((await rayons())[0] === 'Alimentation' && (await p.evaluate(() => document.querySelector('#stk-lst .sit .sinm').textContent.trim())) === 'Article 251', 'rayon replié : on passe directement au suivant');
await p.evaluate(() => toggleCatStock('Alimentation'));

// ── L'inventaire ──
await p.evaluate(() => ouvrirInventaire()); await p.waitForTimeout(300);
const champs = () => p.evaluate(() => document.querySelectorAll('#inv-lst .inv-in').length);
t((await champs()) === 60, `l'inventaire dessine 60 champs (${await champs()}), pas 1 000`);
await p.locator('#inv-lst .inv-in').nth(2).fill('9'); await p.waitForTimeout(100);
for (let i = 0; i < 4; i++) { await p.evaluate(() => { const x = document.getElementById('inv-suite'); if (x) x.scrollIntoView(); }); await p.waitForTimeout(250); }
t((await champs()) >= 180, `en descendant dans la feuille, la suite arrive (${await champs()})`);
const v3 = await p.evaluate(() => document.querySelectorAll('#inv-lst .inv-in')[2].value);
await p.locator('#inv-lst .inv-in').nth(150).fill('12'); await p.waitForTimeout(100);
t(v3 === '9', 'ce qui est tapé reste dans sa ligne pendant que la suite se dessine');
const pied = await p.evaluate(() => document.getElementById('inv-prog').textContent + ' | ' + document.getElementById('inv-pied').textContent);
t(/2 \/ 1000/.test(pied.replace(/\s+/g, ' ')), `le compte porte sur les 1 000 articles (« ${pied.slice(0, 60)} »)`);
await p.evaluate(() => { validerInventaire(); validerInventaire(); }); await p.waitForTimeout(300);
const apres = await p.evaluate(() => [getStk(DB.articles[2]), getStk(DB.articles[150])]);
t(apres[0] === 9 && apres[1] === 12, `valider : les deux comptes sont appliqués (${apres.join(', ')})`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
