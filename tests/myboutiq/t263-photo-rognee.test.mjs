// t263 — « Quand je parle d'économie d'espace, je veux que les images soient
// visibles le plus possible : c'est l'espace inutile autour de la photo qui
// m'inquiète. » (23.45)
// Une bouteille au milieu d'un carré blanc : la tuile avait beau donner toute
// sa place à la photo, le produit n'en occupait qu'un tiers.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t263');
const { s, port } = await serveur();
const b = await chromium.launch();
const pg = await b.newPage();
// Un carré de 400 : le produit n'occupe que le centre (30 % → 70 %).
const marges = c => pg.evaluate(c => { const cv = document.createElement('canvas'); cv.width = cv.height = 400; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 400); x.fillStyle = c; x.fillRect(160, 120, 80, 160); return cv.toDataURL('image/jpeg', .85); }, c);
// Une photo prise sur le comptoir : pas de fond uni.
const comptoir = () => pg.evaluate(() => { const cv = document.createElement('canvas'); cv.width = cv.height = 400; const x = cv.getContext('2d'); for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) { x.fillStyle = `hsl(${(i * 37 + j * 91) % 360},60%,${30 + (i * j) % 40}%)`; x.fillRect(i * 20, j * 20, 20, 20); } return cv.toDataURL('image/jpeg', .85); });
// Un produit qui remplit déjà sa photo.
const pleine = () => pg.evaluate(() => { const cv = document.createElement('canvas'); cv.width = cv.height = 400; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 400); x.fillStyle = '#D9A441'; x.fillRect(6, 6, 388, 388); return cv.toDataURL('image/jpeg', .85); });
const A = (id, nm, img) => ({ id, nm, e: '📦', cat: 'Divers', px: 500, pa: 400, stk0: 10, al: 0, vd: 0, vr: [], img });
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
db.articles = [A(1, 'Coca', await marges('#3a1a12')), A(2, 'Comptoir', await comptoir()), A(3, 'Savon', await pleine())]; db.nextId = 50;
const autre = await marges('#16A34A'); await pg.close();
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(1500);
const lire = id => p.evaluate(id => { const a = DB.articles.find(x => x.id === id), im = document.querySelector('#pc-' + id + ' .pmedia img'); return { vb: a.vb || '', css: im ? getComputedStyle(im).objectViewBox : '', dt: !!im && im.classList.contains('dt'), garde: (JSON.parse(localStorage.getItem('myboutiq_v6')).articles.find(x => x.id === id).vb || '') }; }, id);
const coca = await lire(1), cpt = await lire(2), sav = await lire(3);
const v = coca.vb.split('|')[0].split(' ').map(Number);
t(v.length === 4 && v[0] >= 24 && v[0] <= 30 && v[2] >= 24 && v[2] <= 30 && v[1] >= 34 && v[1] <= 40 && v[3] >= 34 && v[3] <= 40, `les marges blanches sont mesurées : haut ${v[0]} %, droite ${v[1]} %, bas ${v[2]} %, gauche ${v[3]} % (le produit occupait 20 % × 40 % de la photo)`);
// 23.56 — la photo détourée est déjà recadrée sur le produit : elle n'a
// plus besoin de `object-view-box`. Le cadrage reste mesuré et gardé (pour
// un téléphone qui ne sait pas détourer).
t(/inset\(/.test(coca.css) || coca.dt, `la tuile ne montre que le produit (${coca.dt ? 'détourée' : coca.css})`);
// Ce que ça change à l'œil : le produit, qui faisait 40 % de la hauteur de la photo, la remplit.
const gain = Math.round(100 / (100 - v[0] - v[2]) * 10) / 10;
t(gain >= 2, `le produit est ${gain} fois plus grand dans la tuile`);
t(/^0 0 0 0\|/.test(cpt.vb) && (cpt.css === 'none' || !/inset/.test(cpt.css)), 'une photo sans fond uni (prise sur le comptoir) n\'est pas rognée');
t(/^0 0 0 0\|/.test(sav.vb) && !/inset/.test(sav.css), 'un produit qui remplit déjà sa photo reste tel quel');
await p.waitForTimeout(1800);
t((await lire(1)).garde === coca.vb, 'le cadrage est gardé sur l\'article : mesuré une fois, partagé avec les autres téléphones');
// Redessinée, la tuile porte le cadrage tout de suite (pas de saut).
await p.evaluate(() => renderProd(DB.articles));
t(await p.evaluate(() => { const im = document.querySelector('#pc-1 .pmedia img'); return /inset\(/.test(im.getAttribute('style') || '') || im.classList.contains('dt'); }), 'redessinée, la tuile porte déjà son cadrage (ou sa photo détourée)');
// Il change la photo : l'ancien cadrage ne s'applique pas à la nouvelle.
// ⚠️ Lu DANS le même geste que le dessin : la mesure d'une photo locale peut
// finir entre deux allers-retours du banc (vu une fois sur deux passes, machine
// chargée) — le test lisait alors le NOUVEAU cadrage et croyait voir l'ancien.
const tout = await p.evaluate(img => { const a = DB.articles.find(x => x.id === 3); a.vb = '30 30 30 30|faux'; a.img = img; renderProd(DB.articles); return document.querySelector('#pc-3 .pmedia img').getAttribute('style') || ''; }, autre);
await p.waitForTimeout(1200);
const apres = await lire(3);
t(!/inset/.test(tout) && /^2\d 3\d 2\d 3\d\|/.test(apres.vb) && (/inset\(/.test(apres.css) || apres.dt), `photo changée : l'ancien cadrage est ignoré, le nouveau est mesuré (${apres.vb.split('|')[0]})`);
// Un cadrage venu d'ailleurs ne peut rien injecter dans la page.
const inj = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 1); a.vb = '1 1 1 1);background:url(x)|' + _vbCle(a.img); return _vbAttr(a); });
t(inj === '', 'un cadrage mal formé venu d\'un autre téléphone est ignoré');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
