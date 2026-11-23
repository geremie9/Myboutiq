// t282 — TOUT S'ACHÈTE EN GROS : LA PREMIÈRE QUESTION DE L'ARRIVAGE (23.64).
// Le patron, le 15/11 : « peu importe où tu es dans MyBoutiQ, mets-toi en tête
// que tout s'achète majoritairement en gros ». Sa capture : l'huile, « Quantité
// reçue » en unités, les puces 6 · 12 · 24 · 48, et le gros caché derrière un
// petit lien souligné.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, stock } from './caisse.mjs';
const { t, fin } = compteur('t282');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
// 24.09 — « Huile de palme » se vend au litre (le patron, 23/11) : l'huile à la pièce du banc
// est une huile en bouteille, « Huile Mayor ».
db.articles.push({ id: 50, nm: 'Huile Mayor', e: '🛢️', cat: 'Alimentation', px: 1200, pa: 900, stk0: 30, al: 5, vd: 0 });
db.articles.push({ id: 51, nm: 'Bonbon', e: '🍬', cat: 'Divers', px: 25, pa: 15, stk0: 100, al: 5, vd: 0 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 760 });
const etat = () => p.evaluate(() => { const z = document.getElementById('stk-comment'), b = [...document.querySelectorAll('#stk-comment .stc-b')];
  return { vu: !!z && z.offsetParent !== null && z.style.display !== 'none', t: (z.querySelector('.stc-t') || {}).textContent || '', b: b.map(x => x.textContent.trim()), lien: !!(document.getElementById('stk-dire-cart') || {}).offsetParent,
    lbl: document.getElementById('lbl-qte-recu').textContent }; });

// 1. Le contenant inconnu : la première question.
await p.evaluate(() => ouvrirStk(DB.articles.find(a => a.id === 50))); await p.waitForTimeout(400);
let e = await etat();
t(e.vu && /acheté comment/.test(e.t), `l'huile, contenant inconnu : « ${e.t} » vient avant la quantité`);
t(e.b[0] === 'Par bidon' && e.b.includes('Par carton') && e.b.includes('Par sac') && e.b.includes('À la pièce') && !e.lien, `en gros boutons, le plus probable d'abord : ${e.b.join(' · ')} (plus de petit lien)`);
const ordre = await p.evaluate(() => { const z = document.getElementById('stk-comment').getBoundingClientRect(), q = document.getElementById('inp-sqte').getBoundingClientRect(); return z.top < q.top; });
t(ordre, 'la question est au-dessus du champ de quantité');

// 2. Par bidon, 20 dedans : retenu, et il compte en bidons, il paie au bidon.
await p.evaluate(() => stcChoisir('bidon')); await p.waitForTimeout(150);
t(await p.evaluate(() => /Combien de unités dans 1 bidon|Combien de .* dans 1 bidon/.test(document.getElementById('stc-n').textContent)), '« Combien … dans 1 bidon ? », avec des tailles toutes prêtes');
await p.evaluate(() => stcPoser(20)); await p.waitForTimeout(300);
const a = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 50); return { umSac: a.umSac, umCont: a.umCont, lbl: document.getElementById('lbl-qte-recu').textContent, mode: _stkPaMode, pa: document.getElementById('inp-spa').value }; });
t(a.umSac === 20 && a.umCont === 'bidon' && /Combien de bidons/.test(a.lbl), `retenu : 1 bidon = 20 ; la question devient « ${a.lbl} »`);
t(a.mode === 'c' && a.pa === '18000', `il paie au bidon : « Le bidon », pré-rempli ${a.pa} (900 × 20)`);
const s0 = await stock(p, 50);
await p.fill('#inp-scont', '3'); await p.locator('#inp-scont').dispatchEvent('input'); await p.locator('#btn-save-stk').tap(); await p.waitForTimeout(500);
t((await stock(p, 50)) === s0 + 60, `3 bidons reçus : le stock passe de ${s0} à ${await stock(p, 50)} unités`);
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); ouvrirStk(DB.articles.find(a => a.id === 50)); }); await p.waitForTimeout(400);
e = await etat();
t(!e.vu && /Combien de bidons/.test(e.lbl), `la fois suivante : plus de question, directement « ${e.lbl} »`);

// 3. « À la pièce » : retenu aussi, on ne le redemande pas.
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); ouvrirStk(DB.articles.find(a => a.id === 51)); }); await p.waitForTimeout(300);
await p.evaluate(() => stcPiece());
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); ouvrirStk(DB.articles.find(a => a.id === 51)); }); await p.waitForTimeout(300);
e = await etat();
t(!e.vu && await p.evaluate(() => DB.articles.find(a => a.id === 51).achatPiece === true), 'acheté à la pièce : retenu, la question ne revient pas');

// 4. Le carton déjà connu : pas de question.
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); ouvrirStk(DB.articles.find(a => a.id === 6)); }); await p.waitForTimeout(300);
t(!(await etat()).vu, 'le carton déjà connu : aucune question, il compte en cartons');
await p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));

// 5. Un article neuf en photo : comment il l'achète, dès la création.
await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 300); x.fillStyle = '#c62828'; x.fillRect(110, 40, 80, 230);
  const bl = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); _apn = { nm: '', px: '', q: '' }; _apnCharger(new File([bl], 'p.jpg', { type: 'image/jpeg' }));
});
await p.waitForTimeout(800);
await p.fill('#apn-nm', 'Tomate concentrée'); await p.fill('#apn-px', '150'); await p.fill('#apn-q', '2');
await p.evaluate(() => apnAchat('carton')); await p.waitForTimeout(200);
t(await p.evaluate(() => /cartons/.test(document.getElementById('apn-q-l').textContent) && document.getElementById('apn-nm').value === 'Tomate concentrée'), '« Par carton » : « Tu en as (cartons) », et ce qu\'il avait écrit reste');
await p.fill('#apn-n', '24'); await p.locator('#apn-n').dispatchEvent('input');
await p.locator('#apn-ok').tap(); await p.waitForTimeout(800);
const n = await p.evaluate(() => { const a = DB.articles.find(x => x.nm === 'Tomate concentrée'); return a ? { umSac: a.umSac, umCont: a.umCont, stk: getStk(a) } : null; });
t(n && n.umSac === 24 && n.umCont === 'carton' && n.stk === 48, `créé « par carton de 24 », 2 cartons = ${n && n.stk} en stock`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close(); fin();
