// t318 — LA TUILE DE FAMILLE INTELLIGENTE (24.01).
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
const tuile = id => p.evaluate(id => { const c = document.getElementById('pc-' + id); return { cases: c ? getComputedStyle(c).gridColumnStart + '/' + getComputedStyle(c).gridColumnEnd : '', tuiles: c ? c.querySelectorAll('.vtile').length : 0, nom: (c && c.querySelector('.vtile .vt-nm') || {}).textContent || '', pastilles: c ? [...c.querySelectorAll('.pt-s b')].map(x => x.textContent) : [] }; }, id);

// ── 1. Une case par famille, la sorte du moment, les autres en pastilles ──
let h = await tuile(105);
t(h.tuiles === 1 && /span 1|auto/.test(h.cases), `Huile : UNE tuile (avant, sur l'étagère : 4)`);
t(h.nom === 'Diamaor' && h.pastilles.join(',') === 'Mayor,Locale,+1', `la tuile : « ${h.nom} » ; les pastilles : ${h.pastilles.join(', ')}`);
const haut = await p.evaluate(() => document.getElementById('pgrid').scrollHeight);
await p.evaluate(() => { DB.cfg.varStyle = 'plat'; renderProd(DB.articles); });
const hautEt = await p.evaluate(() => document.getElementById('pgrid').scrollHeight);
await p.evaluate(() => { DB.cfg.varStyle = 'tuile'; renderProd(DB.articles); });
t(haut < hautEt, `moins à défiler qu'avec l'étagère : ${hautEt} → ${haut} px (sur sa boutique : 7 écrans → 2,6)`);

// ── 2. Une touche vend la sorte du moment, une touche une pastille ──
await p.evaluate(() => { viderPanier(); varQtys = {}; });
await p.click('#pc-105 .vtile', { position: { x: 60, y: 120 } });
t(await p.evaluate(() => panier['105-1'] === 1), 'toucher la tuile : 1 Diamaor au panier, sans fenêtre');
await p.click('#pc-105 .pt-s >> nth=0');
let pn = await p.evaluate(() => JSON.parse(JSON.stringify(panier)));
t(pn['105-2'] === 1 && pn['105-1'] === 1, `toucher la pastille « Mayor » : 1 Mayor en plus (${JSON.stringify(pn)})`);
h = await tuile(105);
t(await p.evaluate(() => /1/.test((document.querySelector('#pc-105 .pt-s i') || {}).textContent || '')), 'la pastille porte son nombre');
// « +1 » ouvre la famille entière.
await p.click('#pc-105 .pt-plus');
t(await p.evaluate(() => document.getElementById('ov-var') && document.getElementById('ov-var').classList.contains('show') && document.querySelectorAll('#var-lst .vtile').length === 4), '« +1 » ouvre la famille entière (4 sortes)');
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); varQtys = {}; });

// ── 3. Une famille au kilo : la pastille ouvre la feuille des mesures ──
await p.click('#pc-202 .pt-s >> nth=0');
const f = await p.evaluate(() => ({ ouverte: document.getElementById('ov-qte').classList.contains('show'), art: document.getElementById('qte-art').textContent }));
t(f.ouverte && /Riz brisé/.test(f.art), `Riz (au kilo) : la pastille « brisé » ouvre la feuille de la sorte — « ${f.art} »`);
await p.evaluate(() => { qtePourMontant(200); });
t(await p.evaluate(() => panier['202-2'] === 0.4), 'pour 200 : 0,4 kg de riz brisé');
await p.evaluate(() => { viderPanier(); varQtys = {}; });

// ── 4. La sorte épuisée ne fait pas la tuile ──
h = await tuile(106);
t(h.nom === 'Bouteille 6 kg' && h.pastilles.length === 1, `la « 12 kg » est épuisée : la tuile montre « ${h.nom} », la 12 kg reste en pastille`);
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
