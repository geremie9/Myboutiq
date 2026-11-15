// t262 — « Voilà le résultat avec des photos : gaspillage d'espace, vraiment
// manque de stratégie professionnelle. » (23.44)
// Sa capture du 13/11 : la photo d'une bouteille flottait entre deux bandes
// beiges, « Épuisé » et « À compléter » se posaient l'un sur l'autre, et le
// nom du fichier (« Screenshot 2026070… ») servait de nom d'article.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t262');
const { s, port } = await serveur();
const b = await chromium.launch();
// De vraies images, de formats différents : étroite (bouteille), large (savon).
const pg = await b.newPage();
const photo = (l, h, c) => pg.evaluate(([l, h, c]) => { const cv = document.createElement('canvas'); cv.width = l; cv.height = h; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, l, h); x.fillStyle = c; x.fillRect(l * .2, h * .1, l * .6, h * .8); return cv.toDataURL('image/jpeg', .7); }, [l, h, c]);
const etroite = await photo(120, 400, '#3a1a12'), large = await photo(400, 220, '#D9A441');
await pg.close();
const A = (id, nm, px, stk, img, x) => Object.assign({ id, nm, e: '📦', cat: 'Divers', px, pa: Math.round(px * .8), stk0: stk, al: 0, vd: 0, vr: [], img }, x || {});
const boutique = n => {
  const db = nouvelleBoutique(); db.cfg.facon = 'detail';
  db.articles = [
    A(1, 'Coca-Cola 1 L', 800, 20, etroite), A(2, 'Savon Azur', 450, 0, large),
    // Venu de l'import de photos, jamais nommé, jamais chiffré (cas simulé : c'est
    // ce que l'import écrit, voir `_autoNm`).
    A(3, 'Screenshot 20260709 112325', 0, 0, large, { rt: true, _autoNm: 'Screenshot 20260709 112325' }),
    A(4, 'Cube Maggi', 25, 3, large, { al: 5 }), A(5, 'IMG_20260709_113553', 300, 9, etroite),
    A(6, 'Savon Mont Claire', 600, 96, large, { umSac: 24, umCont: 'carton', pxGros: 13000, paGros: 12000 }),
  ];
  for (let i = 7; i <= n; i++) db.articles.push(A(i, 'Article ' + i, 100, 10, i % 2 ? etroite : large));
  db.nextId = 500; return db;
};
const lire = (p, id) => p.evaluate(id => {
  const c = document.getElementById('pc-' + id), med = c.querySelector('.pmedia'), img = med.querySelector('img'), px = c.querySelector('.ppr-ov'), q = s => c.querySelector(s), r = c.getBoundingClientRect();
  const vu = e => !!e && getComputedStyle(e).display !== 'none';
  return { l: Math.round(r.width), h: Math.round(r.height), fit: img ? getComputedStyle(img).objectFit : '', imgL: img ? Math.round(img.getBoundingClientRect().width) : 0, imgH: img ? Math.round(img.getBoundingClientRect().height) : 0, fondu: img ? getComputedStyle(img).mixBlendMode : '', det: !!img && img.classList.contains('dt') && /drop-shadow/.test(getComputedStyle(img).filter), mur: /gradient/.test(getComputedStyle(med).backgroundImage),
    prix: px.textContent.trim(), prixFond: getComputedStyle(px).backgroundColor, coupe: px.scrollWidth > px.clientWidth + 1, nom: c.querySelector('.pnm-ov').textContent.trim(),
    sinc: vu(q('.sinc')), sout: vu(q('.sout')), slow: vu(q('.slow')), fini: c.classList.contains('fini'), gris: getComputedStyle(med).filter, soutL: q('.sout') ? Math.round(q('.sout').getBoundingClientRect().width) : 0 };
}, id);

// ── Petite boutique : 3 par rangée ──
const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique(6), { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(500);
const coca = await lire(p, 1), azur = await lire(p, 2), shot = await lire(p, 3), cube = await lire(p, 4), img5 = await lire(p, 5);
// 23.45 — le blanc de la photo se fond dans le mur du rayon (`multiply`) : le
// produit paraît posé sur la planche, sans case blanche ni bandes.
// 23.56 — mieux : la photo est DÉTOURÉE sur le téléphone (fond retiré, ombre
// au pied). `multiply` reste le temps du calcul, ou si le calcul échoue.
t(coca.fit === 'contain' && coca.imgL === coca.l && coca.imgH >= 76 && (coca.fondu === 'multiply' || coca.det) && coca.mur, `une photo étroite est entière, sur toute la largeur (${coca.imgL} × ${coca.imgH}), fondue dans le mur du rayon — plus de bandes`);
t(/^800\s?F$/.test(coca.prix) && !coca.coupe, `le prix se lit en entier, la devise en petit : « ${coca.prix} »`);
t(/Prix \?/.test(shot.prix) && shot.prixFond === 'rgb(245, 158, 11)' && !shot.sinc && !shot.sout && !shot.fini, 'sans prix : « Prix ? » en orange, et RIEN d\'autre — ni « À compléter » ni « Épuisé » par-dessus');
t(shot.nom === '' && img5.nom === '' && coca.nom === 'Coca-Cola 1 L', `un nom de fichier n'est pas un nom : la tuile se tait (« ${shot.nom} », « ${img5.nom} »)`);
t((await p.evaluate(() => DB.articles.find(a => a.id === 3).nm)) === 'Screenshot 20260709 112325', 'le nom n\'est pas effacé de l\'article : seule la tuile se tait');
t(azur.fini && azur.sout && /grayscale/.test(azur.gris) && azur.soutL <= 22 && /^450/.test(azur.prix), `article fini : la photo grisée et un rond rouge de ${azur.soutL} px, le prix reste lisible`);
t(cube.slow && !cube.fini && !cube.sout, 'stock bas : un seul rond orange');
const cols3 = await p.evaluate(() => getComputedStyle(document.getElementById('pgrid')).gridTemplateColumns.split(' ').length);
// 23.57 — « agrandis légèrement les articles, et le bois épais » (le patron,
// 15/11) : la tuile passe de 122 à 142 px. La limite suit, sans plus.
t(cols3 === 3 && coca.h <= 144, `6 articles : 3 par rangée, tuile de ${coca.l} × ${coca.h} px`);
// Toucher vend, et le « Prix ? » demande le prix.
await p.locator('#pc-1').tap(); await p.waitForTimeout(250);
t(await p.evaluate(() => panier['1-0'] === 1), 'toucher la tuile vend toujours');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();

// ── Grande boutique sur téléphone : 4 par rangée ──
const g = await ouvrirCaisse(b, port, boutique(80), { tactile: true });
await g.p.setViewportSize({ width: 360, height: 740 }); await g.p.waitForTimeout(500);
const c4 = await lire(g.p, 1), carton = await g.p.evaluate(() => { const c = document.getElementById('pc-6'), r = c.getBoundingClientRect(), pb = c.querySelector('.pbarre').getBoundingClientRect(); return { dedans: pb.left >= r.left - 1 && pb.right <= r.right + 1, txt: c.querySelector('.pbarre b').textContent.trim() }; });
const cols4 = await g.p.evaluate(() => getComputedStyle(document.getElementById('pgrid')).gridTemplateColumns.split(' ').length);
const vus = await g.p.evaluate(() => Array.from(document.querySelectorAll('#pgrid .pcard:not(.etg)')).filter(c => { const r = c.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }).length);
t(cols4 === 4 && c4.l >= 76 && c4.h >= 76, `80 articles : 4 par rangée, la tuile garde la place d'un doigt (${c4.l} × ${c4.h} px)`);
t(!c4.coupe && /^800\s?F$/.test(c4.prix), `serré, le prix n'est pas coupé : « ${c4.prix} »`);
t(carton.dedans && /13\s?000\s?F$/.test(carton.txt), `la pastille du carton tient dans la tuile serrée (« ${carton.txt} »)`);
t(vus >= 16, `${vus} articles entiers à l'écran`);
await g.p.locator('#pc-6 .pbarre').tap(); await g.p.waitForTimeout(300);
t(await g.p.evaluate(() => panier['6-0'] === 24), 'serré, la pastille vend toujours le carton');
// Sur un écran large, la grille garde ses colonnes de toujours.
await g.p.setViewportSize({ width: 900, height: 740 }); await g.p.waitForTimeout(300);
const large9 = await g.p.evaluate(() => { const c = document.getElementById('pc-1'); return Math.round(c.querySelector('.pmedia').getBoundingClientRect().height); });
t(large9 >= 76, `sur tablette, pas de tuile serrée (photo de ${large9} px)`);
t(g.errs.length === 0, 'aucune erreur JS (grande boutique)' + (g.errs.length ? ' : ' + g.errs.join(' | ') : ''));
await g.ctx.close();
await b.close(); s.close();
fin();
