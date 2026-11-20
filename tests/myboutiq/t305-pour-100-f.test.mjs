// t305 — TOUT CE QUI SE MESURE SE VEND « POUR 100 F » (23.90).
// Le patron, le 20/11/2026 : « tous ceux qui se mesurent en kg, en litre
// aussi, et autres mesures dans l'app : certains ne peuvent pas se vendre
// pour 100 F ». Mesuré avant :
//   · safran à 40 000 F le kilo : « Trop peu pour être pesé » (100 F = 2,5 g,
//     arrondi au centième de kilo → 0) ;
//   · une cuvette de tomates : vendue en pièce entière, aucun « pour un montant » ;
//   · le stock trop court : « Plus de stock ! », sans dire combien il reste.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t305');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles.push({ id: 90, nm: 'Safran', e: '', cat: 'Alimentation', px: 40000, pa: 30000, stk0: 1, al: 0, vd: 0, um: 'kg' });
d.articles.push({ id: 91, nm: 'Viande', e: '', cat: 'Alimentation', px: 3500, pa: 2800, stk0: 0.05, al: 0, vd: 0, um: 'kg' });
d.articles.push({ id: 92, nm: 'Tomates', e: '', cat: 'Alimentation', px: 2000, pa: 1500, stk0: 6, al: 0, vd: 0, umNom: 'cuvette' });
d.articles.push({ id: 94, nm: 'Arachides', e: '', cat: 'Alimentation', px: 300, pa: 200, stk0: 40, al: 0, vd: 0, umNom: 'verre' });
d.articles.push({ id: 95, nm: 'Lait Peak', e: '', cat: 'Alimentation', px: 600, pa: 500, stk0: 40, al: 0, vd: 0, umNom: 'boîte' });
d.articles.push({ id: 93, nm: 'Tomates en tas', e: '', cat: 'Alimentation', px: 200, pa: 150, stk0: 20, al: 0, vd: 0, umNom: 'tas' });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
const pour = (id, m) => p.evaluate(([id, m]) => { window.__toasts = []; viderPanier(); ouvrirQteMesure(DB.articles.find(x => x.id === id)); qtePourMontant(m); return { q: panier[id + '-0'] || 0, total: calcTotal(), toast: window.__toasts.join(' / '), badge: (document.querySelector('#qb-' + id + ' .qbdg-n') || {}).textContent || '' }; }, [id, m]);

// ── 1. Le safran : 100 F, c'est 2,5 g — au gramme près ──
let r = await pour(90, 100);
t(r.q > 0 && r.q < 0.004 && r.total === 100, `safran à 40 000 F/kg : pour 100 F → ${r.q} kg, ${r.total} F (avant : « Trop peu pour être pesé »)`);
t(r.badge === '0,003', `la tuile montre « ${r.badge} » kg, pas « 0 »`);
const v1 = await p.evaluate(async () => { procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 100; calcMonnaie(true); await encaisser(); fermerSucces(); const v = DB.ventes[DB.ventes.length - 1]; return { total: v.total, ligne: v.lignes[0].nm, stk: getStk(DB.articles.find(x => x.id === 90)) }; });
t(v1.total === 100 && /pour 100/.test(v1.ligne) && v1.stk < 1 && v1.stk > 0.99, `la vente : ${v1.total} F, « ${v1.ligne} », il reste ${v1.stk} kg`);

// ── 2. Le stock trop court se dit avec ce qui reste ──
r = await pour(91, 500);
t(r.q === 0 && /Il ne reste que 0,05 kg de Viande/.test(r.toast) && /175/.test(r.toast), `viande : « ${r.toast} » (avant : « Plus de stock ! »)`);
r = await pour(91, 100);
t(r.q > 0 && r.total === 100, `pour 100 F, ça passe (${r.q} kg)`);

// ── 3. La cuvette de tomates : du vrac, elle se vend pour 100 F ──
const cv = await p.evaluate(() => { viderPanier(); window.__toasts = []; document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); document.getElementById('pc-92').click(); const f = document.getElementById('ov-qte').classList.contains('show'); const l = document.getElementById('qte-poids-l').textContent; const b100 = [...document.querySelectorAll('#qte-mt button')].find(x => x.textContent.trim() === '100'); if (b100) b100.click(); return { f, l, q: panier['92-0'] || 0, total: calcTotal() }; });
t(cv.f && /En cuvette/.test(cv.l), `la tuile de la cuvette ouvre la feuille des doses (« ${cv.l} »)`);
t(cv.total === 100 && cv.q === 0.05, `pour 100 F de tomates : ${cv.q} cuvette, ${cv.total} F`);
// Trois cuvettes entières vendues : une touche en vend une, comme le kilo.
for (let i = 0; i < 3; i++) await vendre(p, { lignes: [[92, 1]] });
const hab = await p.evaluate(() => { fermerSucces(); viderPanier(); document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); document.getElementById('pc-92').click(); return { q: panier['92-0'] || 0, f: document.getElementById('ov-qte').classList.contains('show') }; });
t(hab.q === 1 && !hab.f, 'trois cuvettes entières vendues : la tuile en vend une d\'une touche (la dose habituelle)');

// ── 4. Le tas reste une pièce entière ──
const tas = await p.evaluate(() => { viderPanier(); document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); document.getElementById('pc-93').click(); return { q: panier['93-0'] || 0, f: document.getElementById('ov-qte').classList.contains('show') }; });
t(tas.q === 1 && !tas.f, 'un tas de tomates : une touche, un tas — on ne vend pas un tiers de tas');
// ── 5. Les mesures du marché : le verre d'arachides oui, la boîte de lait non ──
const mk = await p.evaluate(() => ({ verre: seVendAuDetail(DB.articles.find(x => x.id === 94)), boite: seVendAuDetail(DB.articles.find(x => x.id === 95)) }));
r = await pour(94, 100);
t(mk.verre && r.total === 100 && Math.abs(r.q - 0.333) < 0.001, `le verre d'arachides à 300 F se vend pour 100 F (${r.q} verre)`);
t(!mk.boite, 'la boîte de lait reste une pièce entière');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
