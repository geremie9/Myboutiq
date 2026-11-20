// t286 — CE QU'IL A VU SUR SA CAISSE « G », LE 15/11 (23.67).
// « Les écrits moins visibles, et une variante à qui on a retiré les autres,
// s'il en reste une, doit rester comme un seul article automatiquement »,
// puis « observe attentivement et vois les manquements ». Ses captures :
// « Cube Maggi », famille d'UNE forme (« À l'unité ») ; « carton », « lot »,
// « palette » en gris pâle ; « Objectif » coupé par le store ; « Lait
// concentré À l'u… » tronqué ; « Supprimer » avec une flèche de sortie.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutiqueCarres, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t286');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutiqueCarres(); d.cfg.facon = 'gros'; d.objectif = 25000;
d.cfg._repliSolo = 1;            // le 1er rattrapage est passé il y a longtemps
// Données simulées d'après sa base (« G ») : Cube Maggi resté seul, et un
// article que l'ancienne règle de repli a mal nommé (`vfus` en est la preuve).
d.articles.push({ id: 31, nm: 'Cube Maggi', e: '🧂', cat: 'Divers', px: 20, pa: 7, stk0: 17, al: 20, vd: 0, umSac: 100, umCont: 'lot', rt: true,
  vr: [{ id: 1, nm: "À l'unité", pa: 7, px: 20, stk0: 4653, qBase: 1, rt: true }] });
d.articles.push({ id: 32, nm: "Lait concentré À l'unité", e: '🥛', cat: 'Divers', px: 400, pa: 333, stk0: 30, al: 0, vd: 0, umSac: 12, umCont: 'carton', vfus: { 1: 1 } });
d.articles.push({ id: 33, nm: "Savon À l'unité", e: '🧼', cat: 'Divers', px: 250, pa: 200, stk0: 10, al: 0, vd: 0 });   // pas né d'un repli : on n'y touche pas
// Une famille à deux formes, pour le geste à la caisse.
d.articles.push({ id: 34, nm: 'Bonbon', e: '🍬', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: [{ id: 1, nm: 'Menthe', px: 25, pa: 15, stk0: 200, qBase: 1 }, { id: 2, nm: 'Fraise', px: 25, pa: 15, stk0: 0, qBase: 1 }] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 412, height: 915 }); await p.waitForTimeout(2200);

// 1. À l'ouverture : la famille restée seule redevient un article, sans changer de nom ni de stock.
const a = await p.evaluate(() => { const c = DB.articles.find(x => x.id === 31), l = DB.articles.find(x => x.id === 32), sv = DB.articles.find(x => x.id === 33);
  return { nm: c.nm, vr: (c.vr || []).length, stk: getStk(c), px: c.px, cond: [c.umSac, c.umCont].join(' '), lait: l.nm, savon: sv.nm, flag: DB.cfg._repliSolo,
    j: (DB.journal || []).filter(x => /Lait concentré|Cube Maggi/.test(x.art || '')).map(x => x.act + ':' + x.art).join(' | ') }; });
t(a.vr === 0 && a.nm === 'Cube Maggi', `Cube Maggi, resté seul, redevient un article simple — et garde son nom (« ${a.nm} », ${a.vr} variante)`);
t(a.stk === 4653 && a.px === 20 && a.cond === '100 lot', `son stock, son prix et son lot de 100 ne bougent pas (stock ${a.stk}, ${a.px} F, ${a.cond})`);
t(a.lait === 'Lait concentré' && a.savon === "Savon À l'unité", `le nom allongé par l'ancien repli est rendu (« ${a.lait} ») ; un vrai nom n'est pas touché (« ${a.savon} »)`);
t(a.flag === 2 && /nom:Lait concentré/.test(a.j), `une fois, et c'est écrit au journal (${a.j})`);

// 2. À la caisse : il supprime « Fraise » par le menu de la variante.
await p.evaluate(() => { document.getElementById('pc-34').id = 'pc-34'; }); 
await p.locator('#pc-34').tap(); await p.waitForTimeout(400);
await p.evaluate(() => { const el = Array.from(document.querySelectorAll('.vinline .vtile, .vsat')).find(x => /Fraise/.test(x.textContent)); const r = el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 10 })); });
await p.waitForTimeout(250);
p.once('dialog', dl => dl.accept());
const r = await p.evaluate(() => { const e = document.querySelector('#ctxmv [onclick="ctxvSuppr()"]').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; });
await p.touchscreen.tap(r.x, r.y); await p.waitForTimeout(600);
const bb = await p.evaluate(() => { const c = DB.articles.find(x => x.id === 34); return { nm: c.nm, vr: (c.vr || []).length, stk: getStk(c), px: c.px, tuile: (document.getElementById('pc-34') || {}).innerText || '', ouvert: document.body.classList.contains('var-ouvert') }; });
t(bb.vr === 0 && bb.nm === 'Bonbon Menthe' && bb.stk === 200 && bb.px === 25, `il supprime « Fraise » à la caisse : « Menthe » sort de la famille, tout de suite (« ${bb.nm} », stock ${bb.stk}, ${bb.px} F)`);
t(!bb.ouvert && !/dès/.test(bb.tuile), `plus de panneau pour une seule tuile, plus de « dès » (« ${bb.tuile.replace(/\s+/g, ' ').trim()} »)`);

// 3. Les écrits pâles : « carton », « lot », « palette » sans prix.
const ct = await p.evaluate(() => {
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
  const el = document.querySelector('#pgrid .pbarre.vide, #pgrid .pgros.vide.pfam-g'); if (!el) return null;
  const f = lum(getComputedStyle(el.querySelector('i,span,b') || el).color), bg = lum(getComputedStyle(el).backgroundColor);
  return { txt: el.innerText.replace(/\s+/g, ' ').trim(), r: Math.round((Math.max(f, bg) + .05) / (Math.min(f, bg) + .05) * 10) / 10 }; });
t(ct && ct.r >= 4.5, `« ${ct && ct.txt} » sans prix se lit : contraste ${ct && ct.r} (avant : 4,2, sous le seuil de 4,5)`);

// 4. Le store ne coupe plus « Objectif » (au repos, sans défilement).
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(o => o.classList.remove('show')); window.scrollTo(0, 0); updateObjBar(); });
const ob = await p.evaluate(() => { const h = document.querySelector('#s-caisse .mhdr').getBoundingClientRect(), o = document.getElementById('obj-bar'), c = o && o.querySelector('.obj-card');
  return o && getComputedStyle(o).display !== 'none' ? { hb: Math.round(h.bottom), ct: Math.round(c.getBoundingClientRect().top) } : null; });
t(ob && ob.ct >= ob.hb + 15, `« Objectif » commence sous les festons du store (barre ${ob && ob.hb} px, carte ${ob && ob.ct} px — avant : collée, 15 px dessous)`);

// 5. Le menu de l'article : une poubelle pour « Supprimer ».
const ic = await p.evaluate(() => { showCtx({ clientX: 120, clientY: 300, preventDefault() {} }, DB.articles.find(x => x.id === 2)); const i = document.querySelector('#ctxm [onclick="ctxDL()"] .cxic'), j = document.querySelector('#ctxm [onclick="ctxToggleRupt()"] .cxic'); return { s: i && i.dataset.ic, sv: !!(i && i.querySelector('svg path')), r: j && j.dataset.ic }; });
t(ic.s === 'poubelle' && ic.sv && ic.r === 'rupture', `« Supprimer » a sa poubelle, « Vente en rupture » son carton barré (${ic.s}, ${ic.r})`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
