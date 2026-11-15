// t276 — LA FAMILLE SUR L'ÉTAGÈRE, LES ARTICLES PLUS GRANDS, LE BOIS ÉPAIS (23.57).
// Le patron, le 15/11 : « une famille doit avoir une photo qui représente
// tous les produits, comment trancher ? » ; « agrandis légèrement les
// articles à la caisse sans changer l'emplacement » ; « le bois sur lequel
// ils sont posés doit être épais, comme dans une vraie boutique ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t276');
const { s, port } = await serveur();
const b = await chromium.launch();
const pg = await b.newPage();
const photo = c => pg.evaluate(c => { const cv = document.createElement('canvas'); cv.width = cv.height = 300; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 300); x.fillStyle = c; x.fillRect(110, 40, 80, 230); return cv.toDataURL('image/png'); }, c);
const [rouge, bleu, vert, jaune, perso] = [await photo('#c62828'), await photo('#1565c0'), await photo('#2e7d32'), await photo('#f9a825'), await photo('#6a1b9a')];
await pg.close();
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
db.articles = db.articles.slice(0, 2);
const V = (id, nm, img) => ({ id, nm, px: 500, pa: 400, stk: 10, stk0: 10, img });
// La photo de la famille est celle de sa première sorte (ce que fait la création).
db.articles.push({ id: 30, nm: 'Jus', e: '📦', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, img: rouge, vr: [V(1, 'Fraise', rouge), V(2, 'Myrtille', bleu), V(3, 'Menthe', vert), V(4, 'Ananas', jaune)] });
// Une famille qui avait déjà sa propre photo (posée avant la 23.57).
db.articles.push({ id: 31, nm: 'Savon', e: '📦', cat: 'Hygiène', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, img: perso, vr: [V(1, 'Azur', rouge), V(2, 'Omo', bleu)] });
// Une famille dont une seule sorte a une photo.
db.articles.push({ id: 32, nm: 'Sucre', e: '📦', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [V(1, 'Morceaux', vert), V(2, 'Poudre', null)] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(1600);

const f = await p.evaluate(() => {
  const m = id => document.querySelector('#pc-' + id + ' .pmedia');
  const imgs = id => [...m(id).querySelectorAll('img')];
  return {
    jus: m(30).classList.contains('pfam'), n: imgs(30).length, dt: imgs(30).filter(i => i.classList.contains('dt')).length,
    gauche: imgs(30)[0] ? Math.round(imgs(30)[0].getBoundingClientRect().left) : 0, droite: imgs(30)[2] ? Math.round(imgs(30)[2].getBoundingClientRect().left) : 0,
    savon: m(31).classList.contains('pfam') && imgs(31).length === 2, sucre: !m(32).classList.contains('pfam'),
  };
});
t(f.jus && f.n === 3 && f.droite > f.gauche + 20, `« Jus » : ses sortes côte à côte sur la planche, trois au plus (${f.n} sur 4)`);
t(f.dt === 3, `chacune détourée, posée avec son ombre (${f.dt} sur 3)`);
// 23.60 — « la photo de variantes déjà posée laisse la place à ce qu'on vient de faire » :
// la photo de famille posée avant cède la place aux sortes côte à côte.
t(f.savon, 'une famille qui avait déjà SA photo montre maintenant ses sortes côte à côte');
t(f.sucre, 'une seule sorte en photo : la tuile ne fait pas semblant d\'en montrer plusieurs');

const g = await p.evaluate(() => {
  const c = document.getElementById('pc-1'), ov = c.querySelector('.pcard-overlay'), os = getComputedStyle(ov);
  return { media: Math.round(c.querySelector('.pmedia').getBoundingClientRect().height), h: Math.round(c.getBoundingClientRect().height),
    planche: os.backgroundColor, dessus: os.borderTopWidth, levre: parseFloat(os.borderBottomWidth), fil: /repeating-linear-gradient/.test(os.backgroundImage),
    prix: parseFloat(getComputedStyle(c.querySelector('.ppr-ov')).fontSize), cols: getComputedStyle(document.getElementById('pgrid')).gridTemplateColumns.split(' ').length };
});
t(g.media >= 86 && g.prix >= 17 && g.h <= 144 && g.cols === 3, `plus grand, même emplacement : produit ${g.media} px, prix ${g.prix} px, tuile ${g.h} px, ${g.cols} par rangée`);
t(g.planche === 'rgb(168, 120, 60)' && g.dessus === '3px' && g.levre >= 4 && g.fil, `la planche est épaisse : dessus clair, fil du bois, lèvre sombre de ${g.levre} px`);

// Dedans comme dehors : la famille ouverte.
await p.locator('#pc-30 .pnm-ov').click(); await p.waitForTimeout(500);
const v = await p.evaluate(() => { const t = document.querySelector('.vinline .vtile'); if (!t) return null; const ov = t.querySelector('.vt-ov'), os = getComputedStyle(ov), im = t.querySelector('img, .pmedia');
  return { h: Math.round(im.getBoundingClientRect().height), levre: parseFloat(os.borderBottomWidth), px: parseFloat(getComputedStyle(t.querySelector('.vt-px')).fontSize) }; });
t(v && v.h >= 86 && v.levre >= 4 && v.px >= 17, `dans la famille ouverte, la même taille et la même planche (${JSON.stringify(v)})`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close(); fin();
