// t292 — LE MENU DE L'APPUI LONG EN GRAND, ET LA VOIX À LA DEMANDE (23.75).
// Le patron, le 16/11/2026, capture du menu à l'appui :
//   « Essaie de simplifier tout au maximum. »
//   « Et ces écrits sur le menu d'appui sont minuscules pour un non lettré. »
//   « Et la voix dans l'app, ce n'est pas tout le monde qui en a besoin. »
// Mesuré avant : 13 px, des icônes de 17 px ; « Vendre par carton » sous
// « Comment tu le vends (paquet, carton…) », même icône, même chose ; « Cette
// photo ne correspond pas » cachée sous « Plus d'actions » ; et la voix
// parlait à tous, son bouton caché sous « Monnaie à rendre ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t292');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique(); d.cfg.venteDeverrouillee = true;
d.articles.push({ id: 70, nm: 'Coca cola', e: '🥤', cat: 'Boissons', px: 600, pa: 450, stk0: 24, al: 0, vd: 0, img: '/photos-off/coca-cola-1l.jpg', _imgCat: true });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
const vis = () => p.evaluate(() => Array.from(document.querySelectorAll('#ctxm .ctxi')).filter(x => x.offsetParent && getComputedStyle(x).display !== 'none').map(x => x.textContent.trim()));

// ── 1. Le menu : en grand, mots courts, sans doublon ──
await p.evaluate(() => showCtx({ clientX: 80, clientY: 200 }, DB.articles.find(a => a.id === 2))); await p.waitForTimeout(250);
const taille = await p.evaluate(() => { const i = document.querySelector('#ctxm .ctxi'), r = i.getBoundingClientRect(), ic = i.querySelector('.cxic svg');
  return { fs: parseFloat(getComputedStyle(i).fontSize), h: Math.round(r.height), ic: ic ? Math.round(ic.getBoundingClientRect().width) : 0, dans: document.getElementById('ctxm').getBoundingClientRect().right <= innerWidth }; });
t(taille.fs >= 17 && taille.h >= 48 && taille.ic >= 22 && taille.dans, `lisible : ${taille.fs} px, lignes de ${taille.h} px, icônes de ${taille.ic} px (avant : 13 px, icônes de 17), dans l'écran`);
const m1 = await vis();
t(m1[0] === 'Quantité' && m1.includes('Photo') && m1.includes('Paquet, carton…'), `mots courts : ${m1.join(' · ')}`);
await p.locator('#ctxi-plus').tap(); await p.waitForTimeout(250);
const m2 = await vis();
t(!m2.some(x => /^Vendre par /.test(x)) && m2.filter(x => /carton/i.test(x)).length === 1, `une seule ligne pour le carton (${m2.join(' · ')})`);
t(m2.some(x => /^Vendre sans stock : (oui|non)$/.test(x)) && !m2.some(x => /rupture/i.test(x)), '« Vendre sans stock : non », plus « Vente en rupture : désactivée »');
await p.evaluate(() => document.getElementById('ctxm').classList.remove('show'));
// Une famille garde « Vendre par carton » : il y crée le carton D'UNE variante.
const fam = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 3); a.vr = [{ id: 31, nm: 'Bleu', px: 650, pa: 500, stk0: 5 }, { id: 32, nm: 'Vert', px: 650, pa: 500, stk0: 5 }];
  showCtx({ clientX: 80, clientY: 200 }, a); ctxPlus(); const g = document.getElementById('ctxi-gros'); const r = getComputedStyle(g).display !== 'none'; a.vr = []; document.getElementById('ctxm').classList.remove('show'); return r; });
t(fam, 'sur une famille, « Vendre par carton » reste (carton d\'une variante)');
// La photo posée par l'app : « Pas la bonne photo » juste sous « Photo », sans déplier.
await p.evaluate(() => showCtx({ clientX: 80, clientY: 200 }, DB.articles.find(a => a.id === 70))); await p.waitForTimeout(250);
const m3 = await vis();
t(m3.indexOf('Pas la bonne photo') === m3.indexOf('Photo') + 1, `photo du catalogue : « Pas la bonne photo » sous « Photo », dès l'ouverture (${m3.join(' · ')})`);
await p.evaluate(() => document.getElementById('ctxm').classList.remove('show'));
await p.evaluate(() => showCtx({ clientX: 80, clientY: 200 }, DB.articles.find(a => a.id === 2))); await p.waitForTimeout(150);
t(!(await vis()).includes('Pas la bonne photo'), 'sans photo du catalogue, la ligne n\'est pas là');
await p.evaluate(() => document.getElementById('ctxm').classList.remove('show'));

// ── 2. La voix : 23.93 — elle parle par défaut (« je veux que l'app parle à
// son utilisateur », le patron, 20/11) ; un geste la coupe, et elle s'en souvient ──
const v0 = await p.evaluate(() => ({ on: voixActive(), cfg: DB.cfg.voix }));
t(v0.on, `par défaut, l'app parle (voix : ${v0.cfg})`);
await p.evaluate(() => { addPanier(DB.articles.find(a => a.id === 2)); procederPmt(); }); await p.waitForTimeout(500);
const bt = await p.evaluate(() => { const x = document.getElementById('btn-voix'), r = x && x.getBoundingClientRect(); return x ? { vu: !!x.offsetParent && r.height >= 40 && !!x.querySelector('svg'), txt: x.getAttribute('data-on') === '1' ? '🔊' : '🔇' } : null; });
t(bt && bt.vu && bt.txt === '🔊', `au paiement : le haut-parleur (au trait, pas d'emoji), assez grand pour le doigt (${bt && bt.txt})`);
await p.locator('#btn-voix').tap(); await p.waitForTimeout(250);
const v1 = await p.evaluate(() => ({ on: voixActive(), txt: document.getElementById('btn-voix').getAttribute('data-on') === '1' ? '🔊' : '🔇', sauve: JSON.parse(localStorage.getItem('myboutiq_v6') || '{}').cfg.voix }));
t(!v1.on && v1.txt === '🔇' && v1.sauve === false, `un geste et elle se tait, et elle s'en souvient (${v1.txt}, enregistré : ${v1.sauve})`);
await p.locator('#btn-voix').tap(); await p.waitForTimeout(250);
t(await p.evaluate(() => voixActive() && DB.cfg.voix === true && document.getElementById('btn-voix').getAttribute('data-on') === '1'), 'un second geste et elle parle de nouveau');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
