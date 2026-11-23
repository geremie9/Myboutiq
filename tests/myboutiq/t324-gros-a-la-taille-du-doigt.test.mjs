// t324 — LE GROS À LA TAILLE DU DOIGT (24.07).
// Le patron, le 23/11 : « la vente en gros est aussi rendue facile ? »
// Mesuré au banc (360 px) : la puce du carton faisait 64×22 px dans le coin de
// la tuile (9 % de sa surface) ; un doigt qui la ratait vendait une pièce à
// 600 au lieu d'un carton à 13 000. Mesuré en base : 190 lignes en gros, 34,7
// cartons par ligne en moyenne — 35 touches, ou un appui long caché. Le
// carton d'une sorte de famille demandait deux touches depuis la 24.05. Et la
// vente éclair pouvait fermer une grosse commande pendant qu'il comptait.
// Tout en vrais clics, au doigt.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t324');
const { s, port } = await serveur();
const b = await chromium.launch();
const boutique = () => {
  const d = nouvelleBoutique(); d.cfg.venteDeverrouillee = false;
  d.articles.find(a => a.id === 6).stk0 = 2400;                       // Savon Mont Claire : carton de 24 à 13 000
  d.articles.push({ id: 30, nm: 'Huile', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0,
    vr: [{ id: 1, nm: '1 L', px: 900, pa: 700, stk: 0, stk0: 480, umSac: 12, umCont: 'carton', pxGros: 10000, paGros: 8400 },
         { id: 2, nm: '2 L', px: 1700, pa: 1400, stk: 0, stk0: 240, umSac: 6, umCont: 'carton', pxGros: 9800 },
         { id: 3, nm: '5 L', px: 4000, pa: 3400, stk: 0, stk0: 80 }] });
  return d;
};
const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique(), { tactile: true });
await p.setViewportSize({ width: 360, height: 640 });
for (let i = 0; i < 3; i++) await vendre(p, { lignes: [[2, 1]] });   // une boutique rodée : la vente éclair est active
await p.evaluate(() => { fermerSucces(); renderProd(DB.articles); document.getElementById('pc-6').scrollIntoView({ block: 'center' }); });   // l'écran vert de la dernière vente couvrirait la mesure
await p.waitForTimeout(250);

// ── 1) LE CARTON SUR LA PHOTO (choix A, 23.42), TOUTE LA LARGEUR ───────
const m = await p.evaluate(() => {
  const c = document.getElementById('pc-6'), r = c.getBoundingClientRect(), bb = c.querySelector('.pbarre').getBoundingClientRect();
  const mil = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  let carton = 0, tot = 0;
  for (let x = Math.ceil(r.left) + 1; x < r.right - 1; x += 2) for (let y = Math.ceil(r.top) + 1; y < r.bottom - 1; y += 2) {
    const e = document.elementFromPoint(x, y); if (!e || !c.contains(e)) continue; tot++; if (e.closest('[onclick*="vendreGros"]')) carton++;
  }
  return { w: Math.round(bb.width), tw: Math.round(r.width), h: Math.round(bb.height), part: Math.round(100 * carton / tot), haut: Math.abs(bb.top - r.top) < 2, photo: bb.bottom <= c.querySelector('.pmedia').getBoundingClientRect().bottom, sousPrix: bb.bottom <= c.querySelector('.ppr-ov').getBoundingClientRect().top,
    centre: !!mil && c.contains(mil) && !mil.closest('.pbas'), th: Math.round(r.height), voisin: Math.round(document.getElementById('pc-4').getBoundingClientRect().height), prix: (c.querySelector('.pbarre b') || {}).textContent || '' };
});
t(m.w >= m.tw - 2 && m.h >= 40, `la bande carton prend toute la largeur : ${m.w}×${m.h} (tuile ${m.tw} ; avant : 64×22)`);
t(m.part >= 25, `elle fait ${m.part} % de la tuile (avant : 9 %)`);
t(m.haut && m.photo && m.sousPrix && /13\s?000/.test(m.prix.replace(/[\u202f\u00a0]/g, ' ')), `sur la photo, en haut, au-dessus de l'étiquette de la pièce (« ${m.prix} ») : une seule étiquette sous la planche`);
// Vu au banc (t214) dans une première version qui posait la bande en BAS de la
// photo : elle couvrait le milieu de la tuile, là où le doigt vise l'article.
t(m.centre, 'le MILIEU de la tuile reste la pièce : un doigt qui vise l\'article ne vend pas un carton');
t(Math.abs(m.th - m.voisin) <= 2, `la tuile garde la hauteur de ses voisines (${m.th} / ${m.voisin} px)`);
await p.tap('#pc-6'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['6-0'] === 1 && !((_grosPanier['6-0'] || {}).lots || []).length), 'une touche sur la tuile : 1 pièce, pas de carton');
await p.evaluate(() => viderPanier());

// ── 2) 35 CARTONS EN CINQ TOUCHES, ET LA VENTE NE SE FERME PAS SEULE ───
let touches = 0;
await p.tap('#pc-6 .pbarre'); touches++; await p.waitForTimeout(150);
const barre = await p.evaluate(() => [...document.querySelectorAll('#fbil.show button')].map(x => x.textContent.trim()));
t(barre.length === 3 && /\+5/.test(barre[0]) && /\+10/.test(barre[1]) && /Combien/.test(barre[2]), `un carton touché : la barre montre ${barre.join(' · ')}`);
t(await p.evaluate(() => document.querySelectorAll('#fbil .bil').length === 0), 'les billets de la monnaie laissent la place aux quantités');
await p.tap('#fbil .qct-n'); touches++; await p.waitForTimeout(250);
const pv = await p.evaluate(() => ({ ouvert: document.getElementById('ov-pave').classList.contains('show'), mode: _pv && _pv.mode }));
t(pv.ouvert && pv.mode === 'c', '« Combien ? » ouvre le pavé, déjà en cartons (plus d\'appui long caché)');
for (const k of ['3', '4']) { await p.evaluate(k => paveTouche(k), k); touches++; }
await p.evaluate(() => paveValider()); touches++; await p.waitForTimeout(200);
const c35 = await p.evaluate(() => ({ pieces: panier['6-0'], lots: (((_grosPanier['6-0'] || {}).lots) || []).length }));
t(c35.pieces === 35 * 24 && c35.lots === 35, `35 cartons (${c35.pieces} pièces) en ${touches} touches (avant : 35)`);
await p.waitForTimeout(3600);
t(await p.evaluate(() => DB.ventes.length === 3), 'la vente éclair ne ferme pas une commande qui a des cartons : il compte encore');
await p.tap('#fbil .qct >> nth=1'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['6-0'] === 45 * 24), '« +10 » : 45 cartons');
// Encaisser : la ligne dit 45 cartons, au prix du carton.
const r = await p.evaluate(async () => { procederPmt(); selPmntVente('especes'); await encaisser(); return JSON.parse(JSON.stringify(DB.ventes[DB.ventes.length - 1])); });
t(r.total === 45 * 13000 && r.lignes.some(l => l.gros && l.qte === 45), `encaissé : ${r.total} F, une ligne « 45 cartons » (${r.lignes.map(l => l.nm + ' ×' + l.qte).join(' ; ')})`);

// ── 3) LE CARTON D'UNE SORTE DE FAMILLE : UNE TOUCHE SUR SON ÉTAGE ─────
await p.evaluate(() => { fermerSucces(); document.getElementById('pc-30').scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(200);
const z = await p.evaluate(() => { const e = document.querySelector('#pe-30-1 .etg-ct'), r = e && e.getBoundingClientRect(); return e ? { w: Math.round(r.width), h: Math.round(r.height), txt: e.textContent.replace(/[  \s]/g, '') } : null; });
t(z && z.w >= 44 && z.h >= 56 && /10000/.test(z.txt), `l'étage « 1 L » porte son carton : ${z && z.w + '×' + z.h} avec son prix (${z && z.txt})`);
t(await p.evaluate(() => !document.querySelector('#pe-30-3 .etg-ct')), 'la sorte « 5 L », sans carton, n\'a pas de zone carton');
await p.tap('#pe-30-1 .etg-ct'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['30-1'] === 12 && (((_grosPanier['30-1'] || {}).lots) || []).length === 1), 'une touche sur la zone : 1 carton de 12');
await p.tap('#fbil .qct >> nth=0'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['30-1'] === 72), '« +5 » sur la barre : 6 cartons de la même sorte');
await p.tap('#pe-30-2'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['30-2'] === 1 && panier['30-1'] === 72), 'le reste de l\'étage vend toujours la pièce (1 « 2 L »)');
await p.evaluate(() => viderPanier());

// ── 4) SANS CARTON, RIEN NE CHANGE ──────────────────────────────────────
await p.evaluate(() => document.getElementById('pc-2').scrollIntoView({ block: 'center' }));
await p.tap('#pc-2'); await p.waitForTimeout(150);
const sans = await p.evaluate(() => ({ abande: document.getElementById('pc-2').classList.contains('abande'), billets: [...document.querySelectorAll('#fbil .bil')].length }));
t(!sans.abande && sans.billets > 0, 'le riz (sans carton) : pas de bande, et la barre montre les billets comme avant');
await p.waitForTimeout(3500);
t(await p.evaluate(() => DB.ventes.length === 5), 'et la vente éclair le ferme seule, comme avant');

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
