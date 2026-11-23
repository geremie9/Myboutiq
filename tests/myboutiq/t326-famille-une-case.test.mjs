// t326 — LA FAMILLE REDEVIENT UN ARTICLE : UNE CASE, UNE GRANDE PHOTO (24.08).
// Le patron, le 23/11, captures à l'appui : « les articles en famille prennent
// beaucoup plus d'espace, ce qui ralentit la navigation et peut causer les
// erreurs ou le retard ; l'œil a du mal à identifier directement les articles ;
// et les images sont très petites — l'image devrait être un élément crucial
// pour les non-lettrés ». La 24.05 (étages) prenait deux rangées, avec des
// photos de 30 px ; la 24.07 posait une bande grise « carton » même sans prix.
// En vrais clics, au doigt, sur 360×640.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
import fs from 'node:fs';
const { t, fin } = compteur('t326');
const { s, port } = await serveur();
const b = await chromium.launch();
const ph = fs.readdirSync(new URL('../../photos-off/', import.meta.url)).filter(f => f.endsWith('.jpg')).slice(0, 8).map(f => '/photos-off/' + f);
const V = (id, nm, px, img, extra) => Object.assign({ id, nm, px, pa: Math.round(px * .8), stk0: 40, qBase: 1, img }, extra || {});
const d = nouvelleBoutique(); d.cfg.venteDeverrouillee = false;
d.articles.find(a => a.id === 3).umSac = 24; d.articles.find(a => a.id === 3).umCont = 'carton';    // un carton connu, SANS prix
d.articles.push(
  { id: 105, nm: 'Huile', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Diamaor', 1500, ph[1], { umSac: 12, umCont: 'carton', pxGros: 17000 }), V(2, 'Mayor', 1100, ph[2]), V(3, 'Locale', 900, ph[3]), V(4, 'Huile coco', 600, null)] },
  { id: 27, nm: 'Reaktor', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Reaktor citron', 300, ph[4]), V(2, 'Reaktor orange', 500, ph[5])] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 640 });
for (let i = 0; i < 3; i++) await vendre(p, { lignes: [[2, 1]] });   // boutique rodée : la vente éclair est active
await p.evaluate(() => { fermerSucces(); renderProd(DB.articles); document.getElementById('pc-105').scrollIntoView({ block: 'center' }); });
await p.waitForTimeout(500);

// ── 1) UNE CASE, COMME UN ARTICLE ─────────────────────────────────────
const m = await p.evaluate(() => {
  const r = id => document.getElementById('pc-' + id).getBoundingClientRect();
  const f = document.getElementById('pc-105'), im = f.querySelector('.vtile img:not(.fb-m)'), bd = f.querySelector('.fam-band');
  const br = bd.getBoundingClientRect(), mil = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
  return { hf: Math.round(r(105).height), ha: Math.round(r(1).height), wf: Math.round(r(105).width), wa: Math.round(r(1).width),
    rangs: getComputedStyle(f).gridRowEnd, img: im ? Math.round(im.getBoundingClientRect().width) : 0,
    bw: Math.round(br.width), bh: Math.round(br.height), bandeCible: !!mil && bd.contains(mil), minis: bd.querySelectorAll('.fb-m').length, txt: bd.textContent.replace(/[  \s]/g, '') };
});
t(Math.abs(m.hf - m.ha) <= 3 && Math.abs(m.wf - m.wa) <= 3 && !/span 2/.test(m.rangs), `Huile tient UNE case, la taille d'un article : ${m.wf}×${m.hf} (article ${m.wa}×${m.ha} ; la 24.05 : deux rangées)`);
t(m.img >= 90, `la photo de la sorte du moment est grande : ${m.img} px de large (les étages : 30 px)`);
t(m.bw >= m.wf - 4 && m.bh >= 30 && m.bandeCible, `la bande des autres sortes prend toute la largeur : ${m.bw}×${m.bh}, rien par-dessus`);
t(m.minis >= 1 && /\+3/.test(m.txt), `elle montre les autres sortes en petites photos (${m.minis}) et « +3 »`);

// ── 2) UNE TOUCHE SUR LA PHOTO VEND, LA BANDE OUVRE LA FAMILLE ─────────
const n0 = await p.evaluate(() => DB.ventes.length);
await p.tap('#pc-27 .vtile', { position: { x: 55, y: 75 } }); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['27-1'] === 1), 'toucher la photo de Reaktor : 1 « citron » au panier');
await p.waitForTimeout(3500);
t(await p.evaluate(n => DB.ventes.length === n + 1, n0), 'et la vente éclair la ferme seule, comme une bouteille');
await p.evaluate(() => { fermerSucces(); document.getElementById('pc-105').scrollIntoView({ block: 'center' }); });
await p.tap('#pc-105 .fam-band', { position: { x: 20, y: 15 } }); await p.waitForTimeout(250);
t(await p.evaluate(() => document.getElementById('ov-var').classList.contains('show') && document.querySelectorAll('#var-lst .vtile').length === 4), 'la bande ouvre la famille : les 4 sortes, chacune sa grande tuile');
// Une autre sorte : DEUX touches — la bande, puis la sorte (la fenêtre se referme seule).
const n1 = await p.evaluate(() => DB.ventes.length);
await p.evaluate(() => { const t = [...document.querySelectorAll('#var-lst .vtile')].find(x => /Mayor/.test(x.textContent)); t.click(); });
await p.waitForTimeout(200);
t(await p.evaluate(() => panier['105-2'] === 1 && !document.getElementById('ov-var').classList.contains('show')), 'la sorte « Mayor » touchée : au panier, et la famille se referme (deux touches en tout, pas trois)');
await p.waitForTimeout(3500);
t(await p.evaluate(n => DB.ventes.length === n + 1, n1), 'et la vente éclair la ferme seule');
await p.evaluate(() => { fermerSucces(); closeSheet('ov-var'); viderPanier(); varQtys = {}; renderProd(DB.articles); document.getElementById('pc-105').scrollIntoView({ block: 'center' }); });

// ── 3) LE CARTON DE LA SORTE DU MOMENT, AU BOUT DE LA BANDE ────────────
const c = await p.evaluate(() => { const e = document.querySelector('#pc-105 .fam-band .fb-c'), r = e && e.getBoundingClientRect(); return e ? { w: Math.round(r.width), h: Math.round(r.height), t: e.textContent.replace(/[  \s]/g, '') } : null; });
t(c && c.w >= 44 && c.h >= 30 && /17000/.test(c.t), `le carton de Diamaor au bout de la bande : ${c && c.w + '×' + c.h}, son prix (${c && c.t})`);
await p.tap('#pc-105 .fam-band .fb-c'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['105-1'] === 12 && ((_grosPanier['105-1'] || {}).lots || []).length === 1), 'une touche : 1 carton de 12 Diamaor');
t(await p.evaluate(() => /\+5/.test(document.getElementById('fbil').textContent)), 'et la barre propose « +5 · +10 · Combien ? »');
await p.evaluate(() => viderPanier());

// ── 4) LE CARTON SANS PRIX NE COUVRE PLUS LA PHOTO ─────────────────────
const sv = await p.evaluate(() => { const c = document.getElementById('pc-3'), b = c.querySelector('.pbas .pbarre'), r = b && b.getBoundingClientRect(), cr = c.getBoundingClientRect();
  return { abande: c.classList.contains('abande'), w: r ? Math.round(r.width) : 0, cw: Math.round(cr.width), vide: !!(b && b.classList.contains('vide')) }; });
t(sv.vide && !sv.abande && sv.w < sv.cw * 0.75, `un carton sans prix (« prix ? ») reste une petite puce (${sv.w} px sur ${sv.cw}) : plus de bande grise sur la photo`);
const pv = await p.evaluate(() => { const b = document.querySelector('#pc-6 .pbas .pbarre').getBoundingClientRect(); return Math.round(b.height); });
t(pv <= 34, `la bande d'un carton qui a son prix fait ${pv} px (la 24.07 : 40)`);

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
