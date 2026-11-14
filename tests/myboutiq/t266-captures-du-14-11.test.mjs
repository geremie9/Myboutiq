// t266 — TROIS DÉFAUTS VUS SUR SES CAPTURES DU 14/11 (23.49).
//  · « Riz (kg) » ouvert : l'étiquette posée SUR la photo, la photo coupée
//    dessous, « sac » par-dessus le prix. Mes essais n'avaient que des sortes
//    sans photo propre : une sorte qui a SA photo gardait les vieilles règles.
//  · « Stock bas » montrait la famille Huile entière : 537 unités en vert.
//  · « Son prix » : le titre coupé en haut quand la feuille défile.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t266');
const { s, port } = await serveur();
const b = await chromium.launch();
const pg = await b.newPage();
const ph = c => pg.evaluate(c => { const cv = document.createElement('canvas'); cv.width = cv.height = 400; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 400); x.fillStyle = c; x.fillRect(120, 80, 160, 260); return cv.toDataURL('image/jpeg', .8); }, c);
const db = nouvelleBoutique(); db.cfg.facon = 'gros';
db.articles = [
  { id: 1, nm: 'Riz (kg)', e: '📦', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, img: await ph('#ddd'), um: 'kg',
    vr: [{ id: 1, nm: 'Riz (kg)', px: 800, pa: 600, stk0: 40, img: await ph('#eee'), umSac: 50, umCont: 'sac', pxGros: 38000 }, { id: 2, nm: 'Riz local', px: 500, pa: 300, stk0: 30, img: await ph('#cb9'), umSac: 50, umCont: 'sac' }] },
  { id: 2, nm: 'Pain', e: '📦', cat: 'Alimentation', px: 100, pa: 80, stk0: 10, al: 0, vd: 0, vr: [], img: await ph('#c84') },
  { id: 3, nm: 'Huile', e: '📦', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 5, vd: 0, vr: [{ id: 1, nm: 'Diamaor', px: 1350, pa: 1000, stk0: 0 }, { id: 2, nm: 'Mayor', px: 900, pa: 700, stk0: 3 }, { id: 3, nm: 'Locale', px: 800, pa: 600, stk0: 11 }, { id: 4, nm: 'Arachide', px: 800, pa: 600, stk0: 493 }] },
  { id: 4, nm: 'Sucre', e: '📦', cat: 'Alimentation', px: 700, pa: 550, stk0: 2, al: 5, vd: 0, vr: [] },
  { id: 5, nm: 'Vimto', e: '📦', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [] }];
await pg.close();
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(700);

// ── 1. Une famille dont les sortes ont leur photo ──
await p.locator('#pc-1').tap(); await p.waitForTimeout(600);
const f = await p.evaluate(() => [...document.querySelectorAll('.vtile')].map(v => { const im = v.querySelector('img').getBoundingClientRect(), px = v.querySelector('.vt-px').getBoundingClientRect(), nm = v.querySelector('.vt-nm').getBoundingClientRect(), g = v.querySelector('.vt-gros'), gr = g ? g.getBoundingClientRect() : null, r = v.getBoundingClientRect();
  return { photo: v.classList.contains('has-photo'), imgH: Math.round(im.height), imgHaut: Math.round(im.top - r.top), prixSous: px.top >= im.bottom - 1, nomSous: nm.top >= px.bottom - 1, h: Math.round(r.height), prixCoul: getComputedStyle(v.querySelector('.vt-px')).color,
    grosLibre: !gr || gr.bottom <= px.top + 1 || gr.top >= px.bottom || gr.left >= px.right, grosSurPhoto: !gr || (gr.top >= im.top && gr.bottom <= im.bottom) }; }));
t(f.length === 2 && f.every(x => x.photo), 'deux sortes, chacune avec SA photo');
t(f.every(x => x.imgHaut <= 1 && x.imgH >= 70 && x.prixSous && x.nomSous), `la photo est en haut, entière ; le prix puis le nom dessous, sur l'étiquette (photo ${f[0].imgH} px)`);
t(f.every(x => x.grosLibre && x.grosSurPhoto), 'la pastille du sac est sur la photo, plus sur le prix');
t(f.every(x => x.prixCoul === 'rgb(30, 27, 46)' && x.h <= 130), `le prix se lit (sombre sur blanc), et la tuile n'est pas étirée (${f[0].h} px)`);
const dehors = await p.evaluate(() => Math.round(document.getElementById('pc-2').getBoundingClientRect().height));
t(Math.abs(f[0].h - dehors) <= 6, `dedans comme dehors : ${f[0].h} px dedans, ${dehors} px dehors`);
await p.locator('.vtile').nth(1).tap(); await p.waitForTimeout(300);
t(await p.evaluate(() => Object.keys(panier).length === 1), 'toucher une sorte la vend toujours');

// ── 2. Les filtres du Stock ──
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); try { fermerVarInline(); } catch (e) { } viderPanier(); navTo('stock', document.querySelectorAll('.ni')[1]); }); await p.waitForTimeout(400);
const lire = f => p.evaluate(f => { filtreStock(f); return [...document.querySelectorAll('#s-stock .sit')].map(r => ({ nm: (r.querySelector('.sinm') || {}).textContent.replace(/\s*\(\d+\)\s*/, '').trim(), sortes: [...r.querySelectorAll('.svchip')].map(x => x.textContent.trim()).join(' · '), q: (r.querySelector('.siqty') || {}).textContent })); }, f);
const bas = await lire('bas'), out = await lire('out'), tout = await lire('tout');
const hb = bas.find(x => x.nm === 'Huile'), ho = out.find(x => x.nm === 'Huile'), ht = tout.find(x => x.nm === 'Huile');
t(hb && /Mayor/.test(hb.sortes) && !/Arachide|Locale|Diamaor/.test(hb.sortes) && hb.q === '3', `« Stock bas » : de la famille Huile, seule la sorte basse (« ${hb && hb.sortes} », ${hb && hb.q}) — plus 507 en vert`);
t(bas.some(x => x.nm === 'Sucre') && !bas.some(x => x.nm === 'Pain'), 'et les articles simples qui sont bas, pas les autres');
t(ho && /Diamaor/.test(ho.sortes) && !/Mayor|Arachide|Locale/.test(ho.sortes) && ho.q === '0', `« Épuisés » : seule la sorte finie (« ${ho && ho.sortes} », ${ho && ho.q})`);
t(!out.some(x => x.nm === 'Sucre'), 'un article bas n\'est pas dans « Épuisés »');
t(ht && /Diamaor/.test(ht.sortes) && /Arachide/.test(ht.sortes) && ht.q === '507', `« Tout » montre toujours la famille entière (${ht && ht.q})`);

// ── 3. L'en-tête d'une feuille reste en haut ──
await p.evaluate(() => { navTo('caisse', document.querySelectorAll('.ni')[0]); ouvrirCompleterArticle(DB.articles.find(a => a.id === 5), null, true); }); await p.waitForTimeout(500);
await p.setViewportSize({ width: 360, height: 420 }); await p.waitForTimeout(300);      // le clavier ouvert
const e = await p.evaluate(() => { const sh = document.querySelector('#ov-completer .bsht'); sh.scrollTop = 160; const h = sh.querySelector('.shhdr').getBoundingClientRect(), s = sh.getBoundingClientRect(), x = sh.querySelector('.bcl').getBoundingClientRect(); return { defile: sh.scrollTop > 50, haut: Math.round(h.top - s.top), croix: x.top >= s.top - 1 && x.bottom <= innerHeight, tit: document.getElementById('cmp-tit').textContent }; });
t(e.defile && e.haut >= -1 && e.haut <= 1 && e.croix, `la feuille défile, le titre « ${e.tit} » et la croix restent en haut (écart ${e.haut} px)`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
