// t318 — LA TUILE DE FAMILLE INTELLIGENTE (24.01 ; une case et sa bande depuis 24.08, voir t326).
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
// 24.08 — la famille en UNE case, comme un article : la grande photo de la sorte du
// moment, et une bande aux petites photos des autres sortes (voir t326). La 24.05
// (étages, deux rangées) prenait trop de place et rapetissait les photos.
const tuile = id => p.evaluate(id => { const c = document.getElementById('pc-' + id); if (!c) return null;
  return { cases: getComputedStyle(c).gridColumnStart + '/' + getComputedStyle(c).gridColumnEnd, tuiles: c.querySelectorAll('.vtile').length,
    nom: ((c.querySelector('.vtile .vt-nm') || {}).textContent || '').trim(), bande: ((c.querySelector('.fam-band') || {}).textContent || '').trim(),
    h: Math.round(c.getBoundingClientRect().height) }; }, id);

// ── 1. Une case par famille : la sorte du moment, la bande des autres ──
let h = await tuile(105);
const hArt = await p.evaluate(() => Math.round(document.getElementById('pc-1').getBoundingClientRect().height));
t(h.tuiles === 1 && /span 1|auto/.test(h.cases) && Math.abs(h.h - hArt) <= 3, `Huile : UNE case, de la taille d'un article (${h.h} / ${hArt} px)`);
t(h.nom === 'Diamaor' && /\+3/.test(h.bande), `la tuile : « ${h.nom} » ; la bande : « ${h.bande} »`);
const haut = await p.evaluate(() => document.getElementById('pgrid').scrollHeight);
await p.evaluate(() => { DB.cfg.varStyle = 'plat'; renderProd(DB.articles); });
const hautEt = await p.evaluate(() => document.getElementById('pgrid').scrollHeight);
await p.evaluate(() => { DB.cfg.varStyle = 'tuile'; renderProd(DB.articles); });
t(haut < hautEt, `moins à défiler qu'avec l'étagère : ${hautEt} → ${haut} px (sur sa boutique : 7 écrans → 2,6)`);

// ── 2. Une touche vend la sorte du moment ; la bande ouvre les autres ──
await p.evaluate(() => { viderPanier(); varQtys = {}; });
await p.click('#pc-105 .vtile', { position: { x: 55, y: 80 } });
t(await p.evaluate(() => panier['105-1'] === 1), 'toucher la photo : 1 Diamaor au panier, sans fenêtre');
await p.click('#pc-105 .fam-band');
t(await p.evaluate(() => document.getElementById('ov-var') && document.getElementById('ov-var').classList.contains('show') && document.querySelectorAll('#var-lst .vtile').length === 4), 'la bande ouvre la famille entière (4 sortes, chacune sa grande tuile)');
await p.evaluate(() => { const t = [...document.querySelectorAll('#var-lst .vtile')].find(x => /Mayor/.test(x.textContent)); t.click(); });
await p.waitForTimeout(200);    // ouverte depuis la bande : la sorte touchée va au panier, la fenêtre se referme
let pn = await p.evaluate(() => JSON.parse(JSON.stringify(panier)));
t(pn['105-2'] === 1 && pn['105-1'] === 1, `dans la famille, « Mayor » : 1 Mayor en plus (${JSON.stringify(pn)})`);
t(await p.evaluate(() => /1/.test((document.querySelector('#pc-105 .fam-band .fb-q') || {}).textContent || '')), 'la bande compte ce que les autres sortes ont au panier');
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); varQtys = {}; });

// ── 3. Une famille au kilo : la photo ouvre la feuille des mesures ──
await p.click('#pc-202 .vtile', { position: { x: 55, y: 80 } });
const f = await p.evaluate(() => ({ ouverte: document.getElementById('ov-qte').classList.contains('show'), art: document.getElementById('qte-art').textContent }));
t(f.ouverte && /Riz parfumé/.test(f.art), `Riz (au kilo) : la sorte du moment ouvre sa feuille — « ${f.art} »`);
await p.evaluate(() => { qtePourMontant(200); });
t(await p.evaluate(() => panier['202-1'] === 0.25), 'pour 200 : 0,25 kg de riz parfumé (800 le kilo)');
await p.evaluate(() => { viderPanier(); varQtys = {}; });

// ── 4. La sorte épuisée ne fait pas la tuile ──
h = await tuile(106);
t(h.nom === 'Bouteille 6 kg' && /\+1/.test(h.bande), `la « 12 kg » est épuisée : la tuile montre « ${h.nom} », la 12 kg est dans la bande (« ${h.bande} »)`);
// ── 5. Une recherche qui vise une sorte la met en tuile ──
await p.evaluate(() => { const c = document.getElementById('src-c'); c.value = 'coco'; filtrC('coco'); });
h = await tuile(105);
t(h.nom === 'Huile coco', `chercher « coco » : la tuile montre « ${h.nom} »`);
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
