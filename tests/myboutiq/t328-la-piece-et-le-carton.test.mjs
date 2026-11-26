// t328 — LA PIÈCE ET LE CARTON (24.11).
// Le patron, le 24/11, avec ses captures : « les boutons d'en bas sont
// génériques ; il faut qu'on puisse mettre facilement l'unité de mesure sur un
// article — par exemple une huile Diamaor se vend en pièce d'un litre, et 15
// pièces dans un carton. » Il a choisi : la feuille s'ouvre depuis la tuile.
// Mesuré en base : 141 articles sur 1 046 (13 %) savent combien de pièces vont
// dans leur carton ; les puces disaient « carton », « palette », « lot » — le
// mot seul. En vrais clics, au doigt, sur 360×640, en « Modifier ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t328');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique(); d.cfg.venteDeverrouillee = true;
d.articles.push({ id: 40, nm: 'Huile Diamaor', e: '', cat: 'Alimentation', px: 1500, pa: 1300, stk0: 60, al: 0, vd: 0, vr: [] },
  { id: 41, nm: 'Lait concentré', e: '', cat: 'Alimentation', px: 400, pa: 330, stk0: 96, al: 0, vd: 0, vr: [], umSac: 48, umCont: 'carton' });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 640 });
const voir = id => p.evaluate(id => { renderProd(DB.articles); document.getElementById('pc-' + id).scrollIntoView({ block: 'center' }); }, id);

// ── 1) LA PUCE DIT CE QU'IL Y A DEDANS, PLUS LE MOT SEUL ───────────────
await voir(41); await p.waitForTimeout(200);
const lait = await p.evaluate(() => (document.querySelector('#pc-41 .pbas .pbarre b') || {}).textContent || '');
t(/=\s*48/.test(lait), `le lait (carton de 48, sans prix) : la puce dit « ${lait.trim()} », plus « carton » tout seul`);
await voir(40); await p.waitForTimeout(200);
const q = await p.evaluate(() => { const g = document.querySelector('#pc-40 .pbas .pq'); return g ? { txt: g.textContent.trim(), vis: getComputedStyle(g.querySelector('span')).display !== 'none' } : null; });
t(q && q.txt === '?' && q.vis, `l'huile, sans carton : « 📦 ? » sur la tuile, en « Modifier » (${JSON.stringify(q)})`);

// ── 2) DIAMAOR : UNE BOUTEILLE D'1 L, 15 DANS UN CARTON ─────────────────
await p.tap('#pc-40 .pbas .pq'); await p.waitForTimeout(250);
const f = await p.evaluate(() => ({ ouverte: document.getElementById('ov-pc').classList.contains('show'), tailles: [...document.querySelectorAll('#pc-cont [data-taille]')].map(x => x.textContent),
  nb: [...document.querySelectorAll('#pc-cont .pcf-b[onclick^="pcNb("]')].map(x => x.textContent), panier: JSON.stringify(panier) }));
t(f.ouverte && f.panier === '{}', 'la puce ouvre la feuille « la pièce et le carton », sans rien vendre');
t(f.tailles.includes('1 L') && f.tailles.includes('50 cl'), `une huile : les tailles en litres d'abord (${f.tailles.join(' · ')})`);
t(f.nb.includes('15'), `les nombres d'un carton, 15 compris (${f.nb.join(' · ')})`);
await p.tap('#pc-cont [data-taille="1 L"]'); await p.waitForTimeout(100);
await p.tap('#pc-cont .pcf-b[onclick="pcNb(15)"]'); await p.waitForTimeout(100);
await p.fill('#pc-px', '21000'); await p.waitForTimeout(100);
const res = await p.evaluate(() => ({ nm: document.getElementById('pc-nm').textContent, res: document.getElementById('pc-res').textContent.replace(/[  ]/g, ' ') }));
t(res.nm === 'Huile Diamaor 1 L', `le nom se lit déjà avec sa taille : « ${res.nm} »`);
t(/1 carton = 15 .*1 L.*\(15 L\)/.test(res.res) && /1 400/.test(res.res), `la feuille fait le calcul devant lui : « ${res.res} »`);
await p.tap('#pc-ok'); await p.waitForTimeout(300);
const a = await p.evaluate(() => { const x = DB.articles.find(a => a.id === 40); return { nm: x.nm, n: x.umSac, mot: x.umCont, px: x.pxGros, ferme: !document.getElementById('ov-pc').classList.contains('show'),
  j: (DB.journal || []).slice(0, 2).map(j => j.act + ':' + j.ap).join(' | '), um: _umDe(x) || null }; });
t(a.ferme && a.nm === 'Huile Diamaor 1 L' && a.n === 15 && a.mot === 'carton' && a.px === 21000, `enregistré : « ${a.nm} », carton de ${a.n} à ${a.px} F`);
t(a.um === null, 'avec « 1 L » dans le nom, elle reste une bouteille, vendue à la pièce (pas au litre)');
t(/carton de 15/.test(a.j), `le journal le garde (${a.j})`);

// ── 3) EN VENTE, LE CARTON SE PROPOSE SUR LA BARRE (24.09) ──────────────
await p.evaluate(() => { DB.cfg.venteDeverrouillee = false; save(); });
await voir(40); await p.waitForTimeout(200);
await p.tap('#pc-40'); await p.waitForTimeout(200);
const o = await p.evaluate(() => ((document.querySelector('#fbil .qct-o') || {}).textContent || '').replace(/[  \s]/g, ''));
t(/carton21000/.test(o), `en vente : une touche sur Diamaor, et la barre propose « ${o} »`);
await p.tap('#fbil .qct-o'); await p.waitForTimeout(150);
t(await p.evaluate(() => panier['40-0'] === 15), '« carton » : 15 bouteilles au panier, en un carton');
await p.evaluate(() => viderPanier());
await p.evaluate(() => { DB.cfg.venteDeverrouillee = true; save(); });

// ── 4) CORRIGER, PUIS RETIRER LE CARTON ─────────────────────────────────
await voir(40); await p.waitForTimeout(200);
const pu = await p.evaluate(() => (document.querySelector('#pc-40 .pbas .pbarre') || {}).textContent || '');
await p.evaluate(() => ouvrirPieceCarton(40)); await p.waitForTimeout(200);
const pre = await p.evaluate(() => ({ t: (document.querySelector('#pc-cont .pcf-b.on[data-taille]') || {}).textContent, n: (document.querySelector('#pc-cont .pcf-b.on[onclick^="pcNb("]') || {}).textContent, px: document.getElementById('pc-px').value }));
t(pre.t === '1 L' && pre.n === '15' && pre.px === '21000', `rouverte, la feuille montre ce qu'il a dit (${JSON.stringify(pre)})`);
await p.fill('#pc-n', '12'); await p.tap('#pc-ok'); await p.waitForTimeout(250);
t(await p.evaluate(() => DB.articles.find(a => a.id === 40).umSac === 12), '« Autre nombre » : 12, corrigé');
await p.evaluate(() => ouvrirPieceCarton(40)); await p.waitForTimeout(200);
await p.tap('#pc-cont .pcf-sans'); await p.waitForTimeout(250);
const sans = await p.evaluate(() => { const x = DB.articles.find(a => a.id === 40); return { n: x.umSac || null, px: x.pxGros || null, nm: x.nm }; });
t(sans.n === null && sans.px === null && sans.nm === 'Huile Diamaor 1 L', `« il ne vient pas en carton » : à la pièce seulement, le nom garde sa taille (${JSON.stringify(sans)})`);

// ── 5) UNE SORTE DE FAMILLE, ET LE VENDEUR ─────────────────────────────
await p.evaluate(() => { DB.articles.push({ id: 50, nm: 'Huile', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vr: [{ id: 1, nm: 'Mayor', px: 1100, pa: 900, stk0: 40, qBase: 1 }, { id: 2, nm: 'Locale', px: 900, pa: 700, stk0: 40, qBase: 1 }] }); save(); });
await p.evaluate(() => ouvrirPieceCarton(50, 2)); await p.waitForTimeout(200);
await p.tap('#pc-cont [data-taille="1,5 L"]'); await p.tap('#pc-cont .pcf-b[onclick="pcNb(12)"]'); await p.tap('#pc-ok'); await p.waitForTimeout(250);
const fam = await p.evaluate(() => { const f = DB.articles.find(a => a.id === 50); return { nm: f.nm, v: f.vr[1].nm, n: f.vr[1].umSac, autre: f.vr[0].umSac || null }; });
t(fam.nm === 'Huile' && fam.v === 'Locale 1,5 L' && fam.n === 12 && fam.autre === null, `la sorte « Locale » seule : « ${fam.v} », carton de ${fam.n} ; la famille et Mayor ne bougent pas`);
await p.evaluate(() => { role = 'vendeur'; ouvrirPieceCarton(40); });
await p.waitForTimeout(150);
t(await p.evaluate(() => !document.getElementById('ov-pc').classList.contains('show')), 'un vendeur ne règle pas le carton (réservé au patron)');
await p.evaluate(() => { role = 'patron'; });

// ── 6) « MÊME LES PRODUITS EN KG » (le patron, 24/11) ───────────────────
await p.evaluate(() => { DB.articles.push({ id: 60, nm: 'Sucre', e: '', cat: 'Alimentation', px: 700, pa: 600, stk0: 200, al: 0, vd: 0, vr: [] },
  { id: 61, nm: 'Farine', e: '', cat: 'Alimentation', px: 600, pa: 500, stk0: 100, al: 0, vd: 0, vr: [] },
  { id: 62, nm: 'Riz', e: '', cat: 'Alimentation', px: 650, pa: 550, stk0: 500, al: 0, vd: 0, vr: [], um: 'kg' }); save(); });
await voir(60); await p.waitForTimeout(150);
await p.tap('#pc-60 .pbas .pq'); await p.waitForTimeout(250);
const k0 = await p.evaluate(() => ({ mes: [...document.querySelectorAll('#pc-cont [data-mesure]')].map(x => x.textContent), on: (document.querySelector('#pc-cont [data-mesure].on') || {}).textContent }));
t(k0.mes.length === 3 && /pièce/.test(k0.on), `la feuille demande d'abord comment il se vend : ${k0.mes.join(' · ')} (le sucre : « ${k0.on} »)`);
await p.tap('#pc-cont [data-mesure="kg"]'); await p.waitForTimeout(150);
const k1 = await p.evaluate(() => ({ tailles: document.querySelectorAll('#pc-cont [data-taille]').length, mot: (document.querySelector('#pc-cont .pcf-mot.on') || {}).textContent,
  q: [...document.querySelectorAll('#pc-cont .pcf-q')].map(x => x.textContent).join(' | '), nb: [...document.querySelectorAll('#pc-cont .pcf-b[onclick^="pcNb("]')].map(x => x.textContent) }));
t(k1.tailles === 0 && k1.mot === 'sac' && /Combien de kg dans un sac/.test(k1.q) && k1.nb.includes('50'), `« au kilo » : plus de taille de pièce, le sac et ses nombres (« ${k1.q.split(' | ')[1]} » ${k1.nb.join(' · ')})`);
await p.tap('#pc-cont .pcf-b[onclick="pcNb(50)"]'); await p.fill('#pc-px', '32000'); await p.waitForTimeout(100);
const kr = await p.evaluate(() => document.getElementById('pc-res').textContent.replace(/[  ]/g, ' '));
t(/1 sac = 50 kg/.test(kr) && /640\s?F(CFA)? le kilo/.test(kr), `le calcul parle en kilos : « ${kr} »`);
await p.tap('#pc-ok'); await p.waitForTimeout(250);
const su = await p.evaluate(() => { const x = DB.articles.find(a => a.id === 60); return { um: x.um, n: x.umSac, mot: x.umCont, px: x.pxGros, nm: x.nm }; });
t(su.um === 'kg' && su.n === 50 && su.mot === 'sac' && su.px === 32000 && su.nm === 'Sucre', `le sucre se vend au kilo, sac de 50 kg à 32 000 (${JSON.stringify(su)})`);
await p.evaluate(() => { DB.cfg.venteDeverrouillee = false; save(); });
await voir(60); await p.waitForTimeout(150); await p.tap('#pc-60'); await p.waitForTimeout(200);
t(await p.evaluate(() => document.getElementById('ov-qte').classList.contains('show') && panier['60-0'] === undefined), 'en vente, sa tuile ouvre la feuille des mesures (24.08), comme tout ce qui se pèse');
await p.evaluate(() => { document.querySelectorAll('.ov.show').forEach(o => o.classList.remove('show')); viderPanier(); DB.cfg.venteDeverrouillee = true; save(); });
// L'unité seule, sans sac : elle s'enregistre.
await p.evaluate(() => ouvrirPieceCarton(61)); await p.waitForTimeout(150);
await p.tap('#pc-cont [data-mesure="kg"]'); await p.tap('#pc-ok'); await p.waitForTimeout(250);
t(await p.evaluate(() => { const x = DB.articles.find(a => a.id === 61); return x.um === 'kg' && !(x.umSac > 1) && !document.getElementById('ov-pc').classList.contains('show'); }), '« au kilo » sans sac : la farine passe au kilo, sans carton inventé');
// Un riz déjà au kilo : la feuille le dit, et « à la pièce » choisi s'écrit.
await p.evaluate(() => ouvrirPieceCarton(62)); await p.waitForTimeout(150);
t(await p.evaluate(() => (document.querySelector('#pc-cont [data-mesure].on') || {}).getAttribute('data-mesure') === 'kg'), 'le riz déjà au kilo : « 1 kg » est déjà choisi');
await p.tap('#pc-cont [data-mesure=""]'); await p.tap('#pc-ok'); await p.waitForTimeout(250);
t(await p.evaluate(() => DB.articles.find(a => a.id === 62).um === 'pc' && !_umDe(DB.articles.find(a => a.id === 62))), '« à la pièce » choisi : il s\'écrit, et ne repasse plus au kilo');

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
