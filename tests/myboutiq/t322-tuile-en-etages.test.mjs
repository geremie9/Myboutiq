// t322 — LA TUILE EN ÉTAGES : UNE SORTE, UN ÉTAGE, UNE TOUCHE (24.05).
// Le patron, le 23/11 : « la tuile des articles en famille, de façon
// intelligente, facile, minimisant les erreurs de touche et réduisant au
// maximum la navigation inutile ». Mesuré au banc sur 360 px (24.01) : les
// pastilles des autres sortes faisaient 36×30 px, « +N » 26×30, mots coupés,
// sans prix, posées SUR la tuile. Mesuré en base : la sorte de la tuile ne
// faisait que 54,5 % des ventes de famille, les trois premières 95,8 %.
// Tout se joue en vrais clics sur un écran de 360×640, au doigt (tactile).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t322');
const { s, port } = await serveur();
const b = await chromium.launch();
const V = (id, nm, px, stk0 = 40) => ({ id, nm, px, pa: Math.round(px * 0.8), stk0, qBase: 1 });
const boutique = () => {
  const d = nouvelleBoutique();
  d.cfg.venteDeverrouillee = false;                       // la caisse comme au comptoir : modifications fermées
  d.articles.push({ id: 105, nm: 'Huile', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Diamaor', 1500), V(2, 'Mayor', 1100), V(3, 'Locale', 900), V(4, 'Huile coco', 600)] });
  d.articles.push({ id: 27, nm: 'Reaktor', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Reaktor citron', 300), V(2, 'Reaktor orange', 500)] });
  d.articles.push({ id: 107, nm: 'Savon', e: '', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Azur', 650), V(2, 'Mont Claire', 600), V(3, 'Palmida', 500), V(4, 'Diva', 450), V(5, 'Fa', 900), V(6, 'Lux', 700), V(7, 'Dove', 1200)] });
  return d;
};
const mesure = (p, id) => p.evaluate(id => {
  const c = document.getElementById('pc-' + id);
  return [...c.querySelectorAll('.etg-s,.etg-pied')].map(e => {
    const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const dessus = document.elementFromPoint(x, y);
    return { cl: e.className, w: Math.round(r.width), h: Math.round(r.height), libre: !!dessus && (dessus === e || e.contains(dessus)),
             px: ((e.querySelector('.etg-px') || {}).textContent || '').replace(/[  \s]/g, '') };
  });
}, id);

const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique(), { tactile: true });
await p.setViewportSize({ width: 360, height: 640 });
await p.evaluate(() => renderProd(DB.articles)); await p.waitForTimeout(200);

// ── 1) DES CIBLES À LA TAILLE D'UN DOIGT, LE PRIX LISIBLE, RIEN PAR-DESSUS ──
for (const id of [105, 107]) {
  await p.evaluate(id => document.getElementById('pc-' + id).scrollIntoView({ block: 'center' }), id); await p.waitForTimeout(100);
  const m = await mesure(p, id), et = m.filter(x => /etg-s/.test(x.cl)), pied = m.find(x => /etg-pied/.test(x.cl));
  t(et.length === 3, `famille ${id} : trois étages (les sortes du jour)`);
  t(et.every(x => x.h >= 56 && x.w >= 90), `chaque étage tient un doigt : ${et.map(x => x.w + '×' + x.h).join(', ')} (avant : pastilles 36×30)`);
  t(pied && pied.h >= 44 && pied.w >= 90, `la bande du bas aussi : ${pied && pied.w + '×' + pied.h} (avant : « +N » 26×30)`);
  t(et.every(x => /\d/.test(x.px)), `chaque étage montre son prix : ${et.map(x => x.px).join(' · ')}`);
  t(m.every(x => x.libre), 'rien n\'est posé sur un étage : le centre de chaque cible est bien elle');
}

// ── 2) UNE TOUCHE PAR SORTE, SANS FENÊTRE ──────────────────────────────
await p.evaluate(() => { viderPanier(); varQtys = {}; document.getElementById('pc-105').scrollIntoView({ block: 'center' }); });
for (const [vid, nm] of [[1, 'Diamaor'], [2, 'Mayor'], [3, 'Locale']]) {
  await p.tap('#pe-105-' + vid); await p.waitForTimeout(120);
}
const pn = await p.evaluate(() => JSON.parse(JSON.stringify(panier)));
t(pn['105-1'] === 1 && pn['105-2'] === 1 && pn['105-3'] === 1, `trois touches, trois sortes au panier (${JSON.stringify(pn)})`);
t(await p.evaluate(() => !document.querySelector('.ov.show')), 'aucune fenêtre ouverte pour vendre les trois sortes du jour');
// Le nombre sur l'étage ne retire pas : toucher l'étage, même sur son nombre, AJOUTE.
const q = await p.evaluate(() => { const i = document.querySelector('#pe-105-2 .etg-q'); const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await p.touchscreen.tap(q.x, q.y); await p.waitForTimeout(120);
t(await p.evaluate(() => panier['105-2'] === 2), 'toucher le nombre « 1 » sur l\'étage en ajoute un (sur un étage, toucher ajoute toujours)');
// La bande du bas : la famille entière, et ce qui y est au panier se compte dessus.
await p.tap('#pc-105 .etg-pied'); await p.waitForTimeout(250);
t(await p.evaluate(() => document.getElementById('ov-var').classList.contains('show')), 'la bande « +1 » ouvre la famille entière');
await p.evaluate(() => { const coco = DB.articles.find(a => a.id === 105).vr.find(v => v.id === 4); addPanier(DB.articles.find(a => a.id === 105), coco); closeSheet('ov-var'); renderProd(DB.articles); });
t(await p.evaluate(() => /1/.test((document.querySelector('#pc-105 .etg-pied .etg-q') || {}).textContent || '')), 'une sorte cachée au panier se compte sur la bande du bas');

// ── 3) DEUX SORTES SANS RIEN DE PLUS : UNE SEULE RANGÉE ────────────────
const r27 = await p.evaluate(() => { const c = document.getElementById('pc-27'), r = c.getBoundingClientRect(), voisin = document.getElementById('pc-1').getBoundingClientRect();
  return { haute: c.classList.contains('haute'), pied: !!c.querySelector('.etg-pied'), h: Math.round(r.height), hv: Math.round(voisin.height) }; });
t(!r27.haute && !r27.pied && r27.h <= r27.hv + 4, `Reaktor (2 sortes, ni carton ni « + ») : une seule rangée, comme une bouteille (${r27.h} px, voisine ${r27.hv} px)`);
// En mode Modifier, la bande du bas apparaît pour ouvrir la famille (✎).
await p.evaluate(() => { DB.cfg.venteDeverrouillee = true; renderProd(DB.articles); });
t(await p.evaluate(() => { const b = document.querySelector('#pc-27 .etg-pied'); return !!b && /✎/.test(b.textContent); }), 'modifications ouvertes : la bande ✎ ouvre la famille pour la corriger');
await p.evaluate(() => { DB.cfg.venteDeverrouillee = false; renderProd(DB.articles); });

// ── 4) L'ORDRE DU JOUR NE BOUGE PAS SOUS LE DOIGT ───────────────────────
await p.evaluate(() => viderPanier());
for (let i = 0; i < 3; i++) await vendre(p, { lignes: [] , libre: null }).catch(() => {});
const avant = await p.evaluate(() => [...document.querySelectorAll('#pc-107 .etg-s')].map(e => e.id).join(','));
await p.evaluate(() => { const a = DB.articles.find(x => x.id === 107); for (let i = 0; i < 5; i++) addPanier(a, a.vr.find(v => v.id === 7)); });
const apres = await p.evaluate(() => [...document.querySelectorAll('#pc-107 .etg-s')].map(e => e.id).join(','));
t(avant === apres, `vendre une sorte cachée (Dove) ne réordonne pas les étages pendant la journée (${apres})`);

// ── 5) LA VENTE ÉCLAIR S'ARME SUR UN ÉTAGE ──────────────────────────────
await p.evaluate(() => { viderPanier(); });
for (let i = 0; i < 3; i++) await vendre(p, { lignes: [[2, 1]] });
const n0 = await p.evaluate(() => DB.ventes.length);
await p.evaluate(() => document.getElementById('pc-105').scrollIntoView({ block: 'center' }));
await p.tap('#pe-105-2'); await p.waitForTimeout(3600);
const v = await p.evaluate(() => ({ n: DB.ventes.length, l: DB.ventes[DB.ventes.length - 1].lignes.map(x => x.nm).join(',') }));
t(v.n === n0 + 1 && /Mayor/.test(v.l), `une touche sur l'étage « Mayor », et la vente se ferme seule (${v.l})`);

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
