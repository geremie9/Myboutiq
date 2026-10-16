// t238 — « LE GROS DES ARTICLES EN VARIANTES N'A PAS LA TAILLE COMME POUR
// LES ARTICLES DEHORS, ET L'ENDROIT POUR LA PHOTO, COMME SI C'EST UN PEU
// PETIT » (23.19).
// Sa capture : « Savon vaisselle en pâte », quatre savons en carton de 24 ;
// chaque tuile disait seulement « carton », en gris. Dehors, la barre dit
// « carton de 24 / prix ? » ou « 6 800 / carton de 24 ». Et la photo d'une
// variante faisait 58 px quand celle d'une tuile du dehors prend la largeur.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t238');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique(); d.cfg.facon = 'gros';
d.articles.unshift({ id: 40, nm: 'Savon vaisselle en pâte', e: '🧽', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: [['Savon vaisselle', 200, 28], ['Savon ménage', 300, 48], ['Savon bébé', 400, 35]].map(([n, px, st], i) => ({ id: i + 1, nm: n, px, pa: px - 50, stk0: st, qBase: 1, umSac: 24, umCont: 'carton', pxGros: i === 1 ? 6800 : 0 })) });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 760 });
const ouvrir = async () => { await p.evaluate(() => { viderPanier(); Array.from(document.querySelectorAll('.pcard')).find(x => /Savon vaisselle/.test(x.textContent)).id = 'carte-sv'; }); await p.locator('#carte-sv').tap(); await p.waitForTimeout(400); };
await ouvrir();
const tu = await p.evaluate(() => Array.from(document.querySelectorAll('.vinline .vtile')).map(t => { const g = t.querySelector('.vt-gros'), b = g && g.querySelector('b');
  return { g: g ? g.innerText.replace(/\s+/g, ' ').trim() : '', coupe: !!b && b.scrollWidth > b.clientWidth + 1, img: Math.round((t.querySelector('.pmedia') || t).getBoundingClientRect().height) }; }));
t(/carton de 24/.test(tu[0].g) && /prix \?/.test(tu[0].g), `sans prix de carton : « ${tu[0].g} », comme dehors`);
t(/6\s?800/.test(tu[1].g) && /carton de 24/.test(tu[1].g), `avec son prix : « ${tu[1].g} »`);
t(tu.every(x => !x.coupe), 'rien n\'est coupé, même sur un écran de 360 px');
const dehors = await p.evaluate(() => { const m = document.querySelector('.pgrid .pcard .pmedia'); return m ? Math.round(m.getBoundingClientRect().height) : 0; });
// 23.24 — l'image des tuiles passe à 48 px de haut (t243), dedans comme dehors.
t(tu.every(x => x.img >= 48) && Math.abs(tu[0].img - dehors) <= 4, `la place de la photo : ${tu[0].img} px dedans, ${dehors} px dehors (58 avant la 23.19)`);
// La barre vend toujours le carton, au prix du carton.
await p.locator('.vinline .vtile').nth(1).locator('.vt-gros').tap(); await p.waitForTimeout(400);
const pan = await p.evaluate(() => { try { return { total: calcTotal(), cles: Object.keys(panier) }; } catch (e) { return { err: e.message }; } });
t(pan.total === 6800, `toucher « 6 800 / carton de 24 » met un carton au panier (${JSON.stringify(pan)})`);
// Le cercle garde sa puce courte : 82 px par satellite.
await p.evaluate(() => { fermerVarInline(); DB.cfg.varStyle = 'cercle'; });
await ouvrir();
const c = await p.evaluate(() => ({ n: document.querySelectorAll('.vcircle .vsat').length, barre: document.querySelectorAll('.vcircle .vt-barre').length }));
t(c.n > 0 && c.barre === 0, `en cercle, la puce courte reste (${JSON.stringify(c)})`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
