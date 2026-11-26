// t285 — UNE QUANTITÉ DITE COMME IL LA COMPTE, ET LA PHOTO EN ENTIER (23.66).
// Le patron, le 15/11, sur sa capture de « G » : « l'unité de mesure, pour le
// riz par exemple : 50 kg, donc si ça dépasse 50 c'est déjà un sac selon la
// configuration… en dessous c'est 0,2… si c'est deux sacs », et « l'image
// n'est pas bien cadrée, elle est coupée en haut ». Plus le petit carton
// muet sur la tuile de sa famille « Riz ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t285');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique(); d.cfg.facon = 'detail';
d.cfg.varStyle = 'carre';   // 23.89 — la tuile FERMÉE d'une famille n'existe que dans la fenêtre ; l'étagère : t304
const riz = d.articles.find(a => a.id === 2);
Object.assign(riz, { nm: 'Riz', um: 'kg', px: 700, pa: 600, stk0: 125, umSac: 50, umCont: 'sac' });
// Sa famille « Riz » de G : 50 au niveau de la famille, aucun mot, deux variantes.
d.articles.push({ id: 20, nm: 'Riz parfumé', e: '🍚', cat: 'Divers', um: 'kg', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, umSac: 50,
  vr: [{ id: 1, nm: 'Riz (kg)', px: 800, pa: 380, stk0: 110, qBase: 1 }, { id: 2, nm: 'RIZ', px: 500, pa: 460, stk0: 20, qBase: 1 }] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
await p.waitForTimeout(400);

// 1. La règle, sur ses exemples.
const q = await p.evaluate(() => { const r = DB.articles.find(a => a.id === 2), sv = DB.articles.find(a => a.id === 6);
  return { a: qteDite(r, 125), b: qteDite(r, 100), c: qteDite(r, 30), d: qteDite(r, 0.2), e: qteDite(r, 50), f: qteDite(sv, 50), g: qteDite(sv, 10) }; });
t(q.a === '2 sacs + 25 kg', `125 kg de riz (sac de 50) : « ${q.a} »`);
t(q.b === '2 sacs' && q.e === '1 sac', `100 kg : « ${q.b} » · 50 kg : « ${q.e} »`);
t(q.c === '30 kg' && q.d === '0,2 kg', `moins d'un sac, le poids : « ${q.c} » · « ${q.d} »`);
t(/^2 cartons \+ 2 /.test(q.f) && !/carton/.test(q.g), `les pièces aussi (carton de 24) : 50 → « ${q.f} », 10 → « ${q.g} »`);

// 2. L'écran Stock : le nombre reste, la phrase s'ajoute dessous.
await p.evaluate(() => { navTo('stock'); renderStock(DB.articles); }); await p.waitForTimeout(500);
const st = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('#stk-lst .sit')), nm = x => (x.querySelector('.sinm') || {}).textContent || '';
  const r = c.find(x => nm(x).trim() === 'Riz'), f = c.find(x => /parfumé/.test(nm(x)));
  const tx = x => x ? x.innerText.replace(/\s+/g, ' ') + ' ' + ((x.nextElementSibling && x.nextElementSibling.classList.contains('svlist')) ? x.nextElementSibling.innerText.replace(/\s+/g, ' ') : '') : '';
  return { r: tx(r), f: tx(f) + ' ' + (f ? (f.closest('.scd') || f).innerText.replace(/\s+/g, ' ') : '') }; });
t(/125/.test(st.r) && /2 sacs \+ 25 kg/.test(st.r), `écran Stock, Riz : le 125 et « 2 sacs + 25 kg » (« ${st.r.slice(0, 120)} »)`);
t(/Riz \(kg\) : 2 sacs \+ 10 kg/.test(st.f) && /RIZ : 20\b/.test(st.f), `une famille : chaque variante dite en sacs (« ${st.f.slice(0, 140)} »)`);

// 3. La vente au poids : 75 kg dans le panier.
await p.evaluate(() => { navTo('caisse'); viderPanier(); _qteArt = DB.articles.find(a => a.id === 2); ajouterQteMesure(75); }); await p.waitForTimeout(300);
const pan = await p.evaluate(() => { try { ouvrirPanier(); } catch (e) { try { document.querySelector('.fcart').click(); } catch (x) {} } return (document.getElementById('ov-pan') || document.body).innerText.replace(/\s+/g, ' '); });
t(/75 kg = 1 sac \+ 25 kg/.test(pan), `le panier : « 75 kg = 1 sac + 25 kg » (${(pan.match(/.{0,30}75 kg.{0,25}/) || [''])[0]})`);
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(o => o.classList.remove('show')); viderPanier(); });

// 4. « À commander » parle en sacs.
const cmd = await p.evaluate(() => { const r = DB.articles.find(a => a.id === 2); r.al = 200; return _suggestionCommande(r, {}); });
t(/Il te reste 2 sacs \+ 25 kg/.test(cmd) && /\(100 kg\)/.test(cmd), `« À commander » : « ${cmd} »`);

// 5. Le repère de la famille dit son mot.
await p.evaluate(() => { DB.articles.find(a => a.id === 2).al = 0; DB.cfg.facon = 'gros'; renderProd(DB.articles); }); await p.waitForTimeout(300);
const rep = await p.evaluate(() => { const g = document.querySelector('#pc-20 .pgros.vide'); if (!g) return null; const sp = g.querySelector('span'); return { txt: sp ? sp.textContent : '', vis: sp ? getComputedStyle(sp).display !== 'none' : false }; });
t(rep && rep.vis && /sac/.test(rep.txt), `la tuile de sa famille « Riz » (boutique en gros) : le repère dit « ${rep && rep.txt} » au lieu d'un carton muet`);
// 24.11 — l'invitation d'un article sans conditionnement ne dit plus un mot deviné : « 📦 ? »,
// la question en image, qui ouvre la feuille de la pièce et du carton (t328).
const neutre = await p.evaluate(() => { const g = Array.from(document.querySelectorAll('#pgrid .pgros.vide')).find(x => !x.classList.contains('pfam-g')); if (!g) return 'aucun'; const sp = g.querySelector('span'); return sp ? sp.textContent.trim() : 'sans'; });
t(neutre === '?' || neutre === 'aucun', `l'invitation « vendre en gros » d'un article sans conditionnement ne devine aucun mot : « ${neutre} »`);
await p.evaluate(() => { DB.cfg.facon = 'detail'; renderProd(DB.articles); });

// 6. La photo encadrée tient en entier.
const ph = await p.evaluate(() => { const m = document.querySelector('#pc-3 .pmedia') || document.querySelector('#pgrid .pcard .pmedia');
  m.classList.add('pphoto', 'dtc'); const im = document.createElement('img'); m.appendChild(im); const of = getComputedStyle(im).objectFit; im.remove(); m.classList.remove('dtc');
  return of; });
t(ph === 'contain', `une photo au fond pas uni, sur son affichette : montrée en entier (object-fit ${ph}, avant : cover — le haut et le bas rognés)`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
