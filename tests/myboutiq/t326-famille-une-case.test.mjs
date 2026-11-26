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
  { id: 27, nm: 'Reaktor', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Reaktor citron', 300, ph[4]), V(2, 'Reaktor orange', 500, ph[5])] },
  { id: 22, nm: 'Bougie', e: '📦', cat: 'Divers', px: 0, pa: 0, stk0: 200, al: 0, vd: 0, vr: [], umSac: 50, umCont: 'carton', pxGros: 4500 });
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
  // 24.10 — la zone où la photo se dessine (sa boîte moins ses marges) : la bande n'y touche pas.
  const ir = im.getBoundingClientRect(), cs = getComputedStyle(im), x0 = ir.left + parseFloat(cs.paddingLeft), x1 = ir.right - parseFloat(cs.paddingRight);
  let couvert = 0;
  for (let x = Math.ceil(x0) + 1; x < x1 - 1; x += 2) for (let y = Math.ceil(ir.top) + 1; y < ir.bottom - 1; y += 2) { const e = document.elementFromPoint(x, y); if (e && bd.contains(e)) couvert++; }
  return { hf: Math.round(r(105).height), ha: Math.round(r(1).height), wf: Math.round(r(105).width), wa: Math.round(r(1).width),
    rangs: getComputedStyle(f).gridRowEnd, img: im ? Math.round(x1 - x0) : 0,
    ih: Math.round(ir.height), couvert, bw: Math.round(br.width), bh: Math.round(br.height), bandeCible: !!mil && bd.contains(mil), minis: bd.querySelectorAll('.fb-m').length, txt: bd.textContent.replace(/[  \s]/g, '') };
});
t(Math.abs(m.hf - m.ha) <= 3 && Math.abs(m.wf - m.wa) <= 3 && !/span 2/.test(m.rangs), `Huile tient UNE case, la taille d'un article : ${m.wf}×${m.hf} (article ${m.wa}×${m.ha} ; la 24.05 : deux rangées)`);
t(m.img >= 70 && m.ih >= 85, `la photo de la sorte du moment est grande : ${m.img}×${m.ih} px (les étages : 30 px)`);
// 24.10 — « certaines images ne se voient pas très bien à cause du bouton » (le patron, 23/11) :
// la bande du haut (24.08) couvrait 34 px sur 88 de la photo. Elle passe sur le côté.
t(m.couvert === 0, `la bande des autres sortes ne touche pas la photo : elle reste entière (${m.couvert} points couverts)`);
t(m.bw >= 26 && m.bh >= 80 && m.bandeCible, `la bande est une colonne à la taille du doigt, sur le côté : ${m.bw}×${m.bh}, rien par-dessus`);
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

// ── 3) LE CARTON DE LA SORTE DU MOMENT : PROPOSÉ PAR LA BARRE (24.09) ──
// La bande ne porte plus de carton : rien du gros ne se pose sur une photo.
t(await p.evaluate(() => !document.querySelector('#pc-105 .fam-band .fb-c')), 'la bande ne garde que les autres sortes (le carton n\'y est plus)');
await p.tap('#pc-105 .vtile', { position: { x: 55, y: 80 } }); await p.waitForTimeout(150);
const o = await p.evaluate(() => ((document.querySelector('#fbil .qct-o') || {}).textContent || '').replace(/[  \s]/g, ''));
t(/carton17000/.test(o), `la photo de Diamaor touchée : la barre propose son carton (« ${o} »)`);
await p.tap('#fbil .qct-o'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['105-1'] === 12 && ((_grosPanier['105-1'] || {}).lots || []).length === 1), 'une touche : la pièce devient 1 carton de 12 Diamaor');
t(await p.evaluate(() => /\+5/.test(document.getElementById('fbil').textContent)), 'et la barre propose « +5 · +10 · Combien ? »');
await p.evaluate(() => viderPanier());

// ── 4) EN VENTE, AUCUN CARTON SUR LES PHOTOS ───────────────────────────
const sv = await p.evaluate(() => [3, 6].map(id => { const c = document.getElementById('pc-' + id), b = c.querySelector('.pbas'); return !b || getComputedStyle(b).display === 'none'; }));
t(sv[0] && sv[1], 'ni le carton sans prix (« prix ? ») ni celui qui a son prix ne se posent sur la photo');
// Vendu au carton seul (la pièce sans prix) : la tuile vend ce qui a un prix, le carton.
await p.evaluate(() => { viderPanier(); document.getElementById('pc-22').scrollIntoView({ block: 'center' }); });
await p.tap('#pc-22'); await p.waitForTimeout(200);
t(await p.evaluate(() => panier['22-0'] === 50 && ((_grosPanier['22-0'] || {}).lots || []).length === 1), 'la bougie vendue au carton seul : une touche sur la tuile vend le carton de 50');
await p.evaluate(() => viderPanier());
await p.evaluate(() => { DB.cfg.venteDeverrouillee = true; renderProd(DB.articles); });
t(await p.evaluate(() => { const b = document.querySelector('#pc-3 .pbas'); return !!b && getComputedStyle(b).display !== 'none'; }), 'en « Modifier », les puces reviennent : c\'est là qu\'il règle les prix');
await p.evaluate(() => { DB.cfg.venteDeverrouillee = false; renderProd(DB.articles); });

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
