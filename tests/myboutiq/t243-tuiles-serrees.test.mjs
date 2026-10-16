// t243 — « ET CONCERNANT LA TAILLE DES ARTICLES ? » (23.24).
// Mesuré sur la 23.23, à 360 × 760, sur une grille comme la sienne (une
// boutique en gros : Jus, Savon vaisselle, Jus Fruitki palette de 12…) :
// une tuile avec gros 201 px, une simple 150 — et une rangée prend la
// hauteur de sa plus haute tuile. Six tuiles entières à l'écran.
// Option choisie sur captures (B) : marges serrées, « la pièce » seulement
// à côté d'un gros, étiquette « palette » plus mince, image 62 → 48 px.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t243');
const { s, port } = await serveur();
const b = await chromium.launch();
const V = (noms, px, extra) => noms.map((n, i) => Object.assign({ id: i + 1, nm: n, px: px + i * 50, pa: px - 50, stk0: 24, qBase: 1 }, extra || {}));
const A = (id, nm, px, extra) => Object.assign({ id, nm, e: '📦', cat: 'Divers', px, pa: Math.round(px * .8), stk0: 20, al: 0, vd: 0, vr: [] }, extra || {});
const saGrille = () => [
  A(50, 'Jus', 0, { pa: 0, stk0: 0, umSac: 12, umCont: 'palette', vr: V(['75 cl', '25 cl'], 250) }),
  A(51, 'Savon vaisselle en pâte', 0, { pa: 0, stk0: 0, umSac: 24, umCont: 'carton', vr: V(['Citron', 'Ananas', 'Menthe', 'Orange'], 200) }),
  A(52, 'Jus Fruitki 1 L', 300, { umSac: 12, umCont: 'palette', pxGros: 3600, paGros: 3000 }),
  A(53, 'Farine (kg)', 600, { um: 'kg' }),
  A(54, 'Riz', 0, { pa: 0, stk0: 0, vr: V(['Bijou', 'Parfumé'], 500) }),
  A(55, 'huile diamaor', 2000), A(56, 'Sucre', 900), A(57, 'Savon Azur', 650), A(58, 'Lait Nido', 3200),
  A(59, 'Tomate', 250), A(60, 'Oignon', 300), A(61, 'Bougie', 100),
];
const mesurer = p => p.evaluate(() => {
  const nav = document.querySelector('#s-caisse .bnav').getBoundingClientRect(), c = [...document.querySelectorAll('#pgrid .pcard')];
  const t = id => { const x = document.getElementById('pc-' + id); return x ? { h: Math.round(x.getBoundingClientRect().height), lib: (x.querySelector('.ppr-lib') || {}).textContent || '',
    img: Math.round((x.querySelector('.pmedia') || x).getBoundingClientRect().height), larg: Math.round((x.querySelector('.pmedia') || x).getBoundingClientRect().width), carte: Math.round(x.getBoundingClientRect().width) } : null; };
  return { rangs: [...new Set(c.map(x => Math.round(x.getBoundingClientRect().top) + ':' + Math.round(x.getBoundingClientRect().height)))].join(' '), haut: Math.round(document.getElementById('pgrid').getBoundingClientRect().top), nav: Math.round(nav.top), entieres: c.filter(x => x.getBoundingClientRect().bottom <= nav.top && x.getBoundingClientRect().top >= 0).length, t52: t(52), t53: t(53), t56: t(56), t55: t(55), t51: t(51) };
});

// ── En gros, comme sa capture ──
{
  const d = nouvelleBoutique({ articles: saGrille() }); d.cfg.facon = 'gros';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
  await p.setViewportSize({ width: 360, height: 760 }); await p.evaluate(() => renderProd(DB.articles)); await p.waitForTimeout(400);
  const m = await mesurer(p);
  t(m.t52.h <= 180, `une rangée avec un gros : ${m.t52.h} px (la 23.23 : 209)`);
  // En gros, chaque tuile garde son étiquette du bas : les rangées simples
  // font 168 px (201 sur la 23.23).
  const hs = m.rangs.split(' ').map(x => +x.split(':')[1]);
  t(Math.max(...hs.slice(1)) <= 170, `les autres rangées : ${[...new Set(hs.slice(1))].join(', ')} px (la 23.23 : 201)`);
  t(m.t52.img >= 48 && m.t52.larg >= m.t52.carte - 16, `l'image garde toute la largeur de la tuile (${m.t52.larg} × ${m.t52.img} px)`);
  t(/la pièce/.test(m.t52.lib) && /kilo/.test(m.t53.lib), `« la pièce » reste à côté d'un gros, « le kilo » reste toujours (« ${m.t52.lib} », « ${m.t53.lib} »)`);
  // L'étiquette d'une famille sans prix de gros : plus mince, mais la cible du doigt reste.
  const e = await p.evaluate(() => { const g = document.querySelector('#pc-51 .pbas .pgros'); if (!g) return null; const r = g.getBoundingClientRect();
    const sous = document.elementFromPoint(r.left + r.width / 2, r.bottom + 4); return { h: Math.round(r.height), cible: !!(sous && sous.closest('.pgros')), txt: g.textContent.trim() }; });
  t(e && e.h <= 38 && e.cible, `l'étiquette « ${e && e.txt} » fait ${e && e.h} px, et un doigt 4 px dessous la touche encore`);
  await p.locator('#pc-51 .pbas .pgros').tap(); await p.waitForTimeout(400);
  t(await p.evaluate(() => document.body.classList.contains('var-ouvert') || !!document.querySelector('.vinline, .vcircle')), 'elle ouvre toujours la famille');
  // Les barres du gros d'une même rangée restent alignées (règle de la 23.07, t222).
  await p.evaluate(() => { try { fermerVarInline(); } catch (e) {} });
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── Au détail ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique({ articles: saGrille() }), { tactile: true });
  await p.setViewportSize({ width: 360, height: 760 }); await p.evaluate(() => renderProd(DB.articles)); await p.waitForTimeout(400);
  const m = await mesurer(p);
  t(m.t56.lib === '' && m.t55.lib === '', `au détail, plus de « la pièce » sous chaque prix : une tuile seule vend forcément la pièce`);
  t(m.t56.h <= 125, `une tuile simple : ${m.t56.h} px (la 23.23 : 150)`);
  t(m.entieres >= 9, `${m.entieres} tuiles entières à l'écran (la 23.23 : 6)`);
  // Une touche sur la tuile vend toujours une pièce.
  await p.locator('#pc-56').tap(); await p.waitForTimeout(300);
  t(await p.evaluate(() => Object.keys(panier).filter(k => k.split('-')[0] === '56').reduce((n, k) => n + panier[k], 0) === 1), 'une touche sur « Sucre » : 1 au panier, comme avant');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
