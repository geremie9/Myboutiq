// t324 — LE GROS À LA TAILLE DU DOIGT (24.07 ; hors de la photo depuis 24.09).
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

// ── 1) LA PHOTO RESTE ENTIÈRE ; LE CARTON SE PROPOSE APRÈS LA TOUCHE (24.09) ─
// Le patron, le 23/11 : « certaines images ne se voient pas très bien à cause du
// bouton des grossistes ». La 24.07 posait le carton en bande sur la photo.
const m = await p.evaluate(() => {
  const c = document.getElementById('pc-6'), r = c.getBoundingClientRect();
  let gros = 0;
  for (let x = Math.ceil(r.left) + 1; x < r.right - 1; x += 2) for (let y = Math.ceil(r.top) + 1; y < r.bottom - 1; y += 2) {
    const e = document.elementFromPoint(x, y); if (e && c.contains(e) && e.closest('.pbas')) gros++;
  }
  return { gros, marque: getComputedStyle(c.querySelector('.ppr-ov'), '::after').content, th: Math.round(r.height), voisin: Math.round(document.getElementById('pc-4').getBoundingClientRect().height) };
});
t(m.gros === 0, 'en vente, rien du gros ne se pose sur la photo : elle reste entière');
t(/📦/.test(m.marque), `un petit 📦 à côté du prix dit qu'il y a un carton (${m.marque})`);
t(Math.abs(m.th - m.voisin) <= 2, `la tuile garde la hauteur de ses voisines (${m.th} / ${m.voisin} px)`);

// ── 2) 35 CARTONS EN SIX TOUCHES, ET LA VENTE NE SE FERME PAS SEULE ────
let touches = 0;
await p.tap('#pc-6'); touches++; await p.waitForTimeout(150);
const of = await p.evaluate(() => ({ q: panier['6-0'], barre: [...document.querySelectorAll('#fbil.show button')].map(x => x.textContent.trim()), ms: document.getElementById('btn-enc').style.getPropertyValue('--eclair-ms') }));
t(of.q === 1 && /carton\s*13\s?000/.test(of.barre[0].replace(/[  ]/g, ' ')), `une touche sur la tuile : 1 pièce, et la barre propose « ${of.barre[0]} »`);
t(of.ms === '5000ms', 'la vente éclair laisse 5 s pour choisir (pas 3)');
await p.tap('#fbil .qct-o'); touches++; await p.waitForTimeout(150);
const c1 = await p.evaluate(() => ({ q: panier['6-0'], lots: ((_grosPanier['6-0'] || {}).lots || []).length, barre: [...document.querySelectorAll('#fbil.show button')].map(x => x.textContent.trim()) }));
t(c1.q === 24 && c1.lots === 1, `« carton » : la pièce devient UN carton de 24 (${c1.q} pièces, ${c1.lots} carton)`);
t(c1.barre.length === 3 && /\+5/.test(c1.barre[0]) && /\+10/.test(c1.barre[1]) && /Combien/.test(c1.barre[2]), `puis la barre montre ${c1.barre.join(' · ')}`);
await p.tap('#fbil .qct-n'); touches++; await p.waitForTimeout(250);
const pv = await p.evaluate(() => ({ ouvert: document.getElementById('ov-pave').classList.contains('show'), mode: _pv && _pv.mode }));
t(pv.ouvert && pv.mode === 'c', '« Combien ? » ouvre le pavé, déjà en cartons (plus d\'appui long caché)');
for (const k of ['3', '4']) { await p.evaluate(k => paveTouche(k), k); touches++; }
await p.evaluate(() => paveValider()); touches++; await p.waitForTimeout(200);
const c35 = await p.evaluate(() => ({ pieces: panier['6-0'], lots: (((_grosPanier['6-0'] || {}).lots) || []).length }));
t(c35.pieces === 35 * 24 && c35.lots === 35, `35 cartons (${c35.pieces} pièces) en ${touches} touches (avant la 24.07 : 35)`);
await p.waitForTimeout(5500);
t(await p.evaluate(() => DB.ventes.length === 3), 'la vente éclair ne ferme pas une commande qui a des cartons : il compte encore');
await p.tap('#fbil .qct >> nth=1'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['6-0'] === 45 * 24), '« +10 » : 45 cartons');
const r = await p.evaluate(async () => { procederPmt(); selPmntVente('especes'); await encaisser(); return JSON.parse(JSON.stringify(DB.ventes[DB.ventes.length - 1])); });
t(r.total === 45 * 13000 && r.lignes.some(l => l.gros && l.qte === 45), `encaissé : ${r.total} F, une ligne « 45 cartons » (${r.lignes.map(l => l.nm + ' ×' + l.qte).join(' ; ')})`);

// ── 3) LE CARTON D'UNE SORTE DE FAMILLE : LA MÊME OFFRE APRÈS LA PHOTO ──
await p.evaluate(() => { fermerSucces(); renderProd(DB.articles); document.getElementById('pc-30').scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(200);
await p.tap('#pc-30 .vtile', { position: { x: 55, y: 80 } }); await p.waitForTimeout(150);
const fo = await p.evaluate(() => ({ q: panier['30-1'], o: ((document.querySelector('#fbil .qct-o') || {}).textContent || '').replace(/[  \s]/g, '') }));
t(fo.q === 1 && /carton10000/.test(fo.o), `la photo de la famille : 1 « 1 L », et la barre propose son carton (« ${fo.o} »)`);
await p.tap('#fbil .qct-o'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['30-1'] === 12 && (((_grosPanier['30-1'] || {}).lots) || []).length === 1), '« carton » : 1 carton de 12');
await p.tap('#fbil .qct >> nth=0'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['30-1'] === 72), '« +5 » sur la barre : 6 cartons de la même sorte');
await p.evaluate(() => viderPanier());

// ── 4) SANS CARTON, RIEN NE CHANGE ──────────────────────────────────────
await p.evaluate(() => document.getElementById('pc-2').scrollIntoView({ block: 'center' }));
await p.tap('#pc-2'); await p.waitForTimeout(150);
const sans = await p.evaluate(() => ({ offre: !!document.querySelector('#fbil .qct-o'), billets: [...document.querySelectorAll('#fbil .bil')].length }));
t(!sans.offre && sans.billets > 0, 'le riz (sans carton) : pas d\'offre de carton, la barre montre les billets comme avant');
await p.waitForTimeout(3500);
t(await p.evaluate(() => DB.ventes.length === 5), 'et la vente éclair le ferme seule, comme avant');

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
