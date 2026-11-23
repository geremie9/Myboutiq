// t318 — LA TUILE DE FAMILLE INTELLIGENTE (24.01 ; en étages depuis 24.05, voir t322).
// Le patron, le 22/11/2026 : « regroupe les variantes sur une seule tuile,
// mais de façon intelligente, rapide ». Une case par famille : la tuile est la
// sorte du moment (une touche la vend), les autres en pastilles (une touche),
// « +N » ouvre la famille.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t318');
const { s, port } = await serveur();
const b = await chromium.launch();
const V = (id, nm, px, stk0 = 40) => ({ id, nm, px, pa: Math.round(px * 0.8), stk0, qBase: 1 });
const d = nouvelleBoutique();
d.articles.push({ id: 105, nm: 'Huile', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Diamaor', 1500), V(2, 'Mayor', 1100), V(3, 'Locale', 900), V(4, 'Huile coco', 600)] });
d.articles.push({ id: 27, nm: 'Reaktor', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'REAKTOR A', 300), V(2, 'Reaktor B', 500)] });
d.articles.push({ id: 106, nm: 'Gaz', e: '', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Bouteille 12 kg', 6500, 0), V(2, 'Bouteille 6 kg', 3500)] });
d.articles.push({ id: 202, nm: 'Riz', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, um: 'kg', vr: [V(1, 'Riz parfumé', 800, 50), V(2, 'Riz brisé', 500, 50)] });
d.cfg.varStyle = 'plat'; d.cfg._tuileVu = 0;   // un ancien réglage « étagère », d'avant la tuile
const { ctx, p, errs } = await ouvrirCaisse(b, port, Object.assign(d, { cfg: Object.assign(d.cfg, { varStyle: 'plat' }) }));
// ouvrirCaisse garde l'étagère d'un banc qui la demande ; ici on rejoue l'ouverture d'un vrai téléphone.
await p.evaluate(() => { DB.cfg.varStyle = 'plat'; delete DB.cfg._tuileVu; lancerApp(); });
await p.waitForTimeout(300);
t(await p.evaluate(() => _styleVar() === 'tuile' && DB.cfg._tuileVu === 1), 'un réglage « étagère » d\'avant devient la tuile, une fois (sa demande)');
// 24.05 — la tuile en étages : un étage par sorte (voir t322), plus de pastilles.
const tuile = id => p.evaluate(id => { const c = document.getElementById('pc-' + id); return { cases: c ? getComputedStyle(c).gridColumnStart + '/' + getComputedStyle(c).gridColumnEnd : '', tuiles: c ? 1 : 0, noms: c ? [...c.querySelectorAll('.etg-s')].map(x => (x.getAttribute('aria-label') || '').replace(/\s+[\d\s\u202f\u00a0]+\S*$/, '').trim()) : [], pied: ((c && c.querySelector('.etg-pied')) || {}).textContent || '' }; }, id);

// ── 1. Une case par famille, les trois sortes du jour en étages ──
let h = await tuile(105);
t(h.tuiles === 1 && /span 1|auto/.test(h.cases), `Huile : UNE case (avant, sur l'étagère : 4)`);
t(h.noms.join(',') === 'Diamaor,Mayor,Locale' && /\+1/.test(h.pied), `les étages : ${h.noms.join(', ')} ; la bande du bas : « ${h.pied.trim()} »`);
const haut = await p.evaluate(() => document.getElementById('pgrid').scrollHeight);
await p.evaluate(() => { DB.cfg.varStyle = 'plat'; renderProd(DB.articles); });
const hautEt = await p.evaluate(() => document.getElementById('pgrid').scrollHeight);
await p.evaluate(() => { DB.cfg.varStyle = 'tuile'; renderProd(DB.articles); });
t(haut < hautEt, `moins à défiler qu'avec l'étagère : ${hautEt} → ${haut} px (sur sa boutique : 7 écrans → 2,6)`);

// ── 2. Une touche vend chaque sorte du jour ──
await p.evaluate(() => { viderPanier(); varQtys = {}; });
await p.click('#pe-105-1');
t(await p.evaluate(() => panier['105-1'] === 1), 'toucher l\'étage Diamaor : 1 Diamaor au panier, sans fenêtre');
await p.click('#pe-105-2');
let pn = await p.evaluate(() => JSON.parse(JSON.stringify(panier)));
t(pn['105-2'] === 1 && pn['105-1'] === 1, `toucher l'étage « Mayor » : 1 Mayor en plus (${JSON.stringify(pn)})`);
t(await p.evaluate(() => /1/.test((document.querySelector('#pe-105-2 .etg-q') || {}).textContent || '')), 'l\'étage porte son nombre');
// La bande du bas ouvre la famille entière.
await p.click('#pc-105 .etg-pied');
t(await p.evaluate(() => document.getElementById('ov-var') && document.getElementById('ov-var').classList.contains('show') && document.querySelectorAll('#var-lst .vtile').length === 4), 'la bande « +1 » ouvre la famille entière (4 sortes)');
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); varQtys = {}; });

// ── 3. Une famille au kilo : l'étage ouvre la feuille des mesures ──
await p.click('#pe-202-2');
const f = await p.evaluate(() => ({ ouverte: document.getElementById('ov-qte').classList.contains('show'), art: document.getElementById('qte-art').textContent }));
t(f.ouverte && /Riz brisé/.test(f.art), `Riz (au kilo) : l'étage « brisé » ouvre la feuille de la sorte — « ${f.art} »`);
await p.evaluate(() => { qtePourMontant(200); });
t(await p.evaluate(() => panier['202-2'] === 0.4), 'pour 200 : 0,4 kg de riz brisé');
await p.evaluate(() => { viderPanier(); varQtys = {}; });

// ── 4. La sorte épuisée passe derrière ──
h = await tuile(106);
t(h.noms[0] === 'Bouteille 6 kg' && h.noms[1] === 'Bouteille 12 kg' && await p.evaluate(() => document.getElementById('pe-106-1').classList.contains('out')), `la « 12 kg » est épuisée : la « 6 kg » d'abord, la 12 kg grisée derrière (${h.noms.join(', ')})`);
// ── 5. Une recherche qui vise une sorte la met au premier étage ──
await p.evaluate(() => { const c = document.getElementById('src-c'); c.value = 'coco'; filtrC('coco'); });
h = await tuile(105);
t(h.noms[0] === 'Huile coco', `chercher « coco » : le premier étage est « ${h.noms[0]} »`);
await p.evaluate(() => { const c = document.getElementById('src-c'); c.value = ''; filtrC(''); });
// ── 6. Réglages : les trois façons ──
t(await p.evaluate(() => !!document.getElementById('fs-tuile') && !!document.getElementById('fs-plat') && !!document.getElementById('fs-carre')), 'Réglages : Tuile · Étagère · Fenêtre');
await p.evaluate(() => choisirStyleVar('plat'));
t(await p.evaluate(() => _styleVar() === 'plat' && DB.cfg._tuileVu === 1 && document.querySelectorAll('#pc-105 .vtile').length > 1), 'il rechoisit l\'étagère : elle reste (plus de bascule automatique)');
await p.evaluate(() => { lancerApp(); });
t(await p.evaluate(() => _styleVar() === 'plat'), '… même après une nouvelle ouverture');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
