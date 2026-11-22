// t317 — LA SORTE D'UNE FAMILLE AU KILO SE VEND AU MONTANT (24.00).
// Le patron, le 22/11/2026 : « revoir toutes les boutiques : unité en litres,
// possibilité de vendre au montant ou à la quantité voulue ; ceux en kg et
// autres mesures aussi ». Sur les 931 articles de la base : 54 au kilo/litre,
// 55 par leur nom (« Sucre (kg) ») — ceux-là marchaient ; 5 FAMILLES mesurées
// (Riz, Farine, Huile…) — leurs sortes, non. Mesuré au banc :
//   toucher « Riz brisé »          → 1 kg, ni « pour 200 » ni ¼ ;
//   dire « pour 200 de riz brisé » → 50 KILOS au panier (25 000 F) ;
//   dire « un demi kilo de riz »   → 1 kg.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t317');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles.push({ id: 202, nm: 'Riz', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, um: 'kg', vr: [{ id: 1, nm: 'Riz parfumé', px: 800, pa: 600, stk0: 50, qBase: 1 }, { id: 2, nm: 'Riz brisé', px: 500, pa: 400, stk0: 50, qBase: 1 }] });
d.articles.push({ id: 203, nm: 'Pétrole', e: '', cat: 'Divers', px: 750, pa: 600, stk0: 40, al: 0, um: 'L', vr: [] });
d.cfg.varStyle = 'plat';
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
await p.evaluate(() => { parler = window.__parlerVrai; window.__dit = []; window.speechSynthesis.speak = u => window.__dit.push(u.text); window.speechSynthesis.cancel = () => {}; });

// ── 1. Toucher la sorte : la feuille des mesures, à SON prix ──
const f = await p.evaluate(() => { viderPanier(); varQtys = {}; document.querySelectorAll('#pc-202 .vtile')[1].click(); return { ouverte: document.getElementById('ov-qte').classList.contains('show'), art: document.getElementById('qte-art').textContent, montant: !!document.querySelector('#qte-mt button') }; });
t(f.ouverte && /Riz brisé — 500/.test(f.art) && f.montant, `toucher « Riz brisé » : la feuille (« ${f.art} »), avec « pour un montant » (avant : 1 kg posé)`);
let r = await p.evaluate(() => { qtePourMontant(200); return { panier: JSON.parse(JSON.stringify(panier)), tot: calcTotal() }; });
t(r.panier['202-2'] === 0.4 && r.tot === 200, `« pour 200 » : 0,4 kg de riz brisé, 200 F (${JSON.stringify(r.panier)})`);
r = await p.evaluate(() => { document.querySelectorAll('#pc-202 .vtile')[0].click(); qteRapide(0.25); return { panier: JSON.parse(JSON.stringify(panier)), tot: calcTotal() }; });
t(r.panier['202-1'] === 0.25 && r.tot === 400, `« ¼ » sur le riz parfumé : 0,25 kg à 800 = 200 F (total ${r.tot})`);

// ── 2. À la voix ──
r = await p.evaluate(() => { viderPanier(); varQtys = {}; window.__dit = []; _voixTraiterTexte('pour 200 de riz brisé et un demi kilo de riz parfumé'); return { panier: JSON.parse(JSON.stringify(panier)), tot: calcTotal(), dit: window.__dit.join(' | ') }; });
t(r.panier['202-2'] === 0.4, `« pour 200 de riz brisé » → 0,4 kg (avant : 50 kilos, 25 000 F)`);
t(r.panier['202-1'] === 0.5 && r.tot === 600, `« un demi kilo de riz parfumé » → 0,5 kg ; total ${r.tot} F`);
t(/Riz brisé pour 200 francs/.test(r.dit) && /un demi-kilo de Riz parfumé/.test(r.dit), `relu : « ${r.dit} »`);
r = await p.evaluate(() => { viderPanier(); varQtys = {}; _voixTraiterTexte('un quart de pétrole et trois quarts de riz brisé'); return JSON.parse(JSON.stringify(panier)); });
t(r['203-0'] === 0.25 && r['202-2'] === 0.75, `« un quart de pétrole et trois quarts de riz brisé » → ${JSON.stringify(r)}`);

// ── 3. La vente enregistrée et le stock ──
const v = await p.evaluate(async () => { viderPanier(); varQtys = {}; _voixTraiterTexte('pour 200 de riz brisé'); procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 500; calcMonnaie(true); await encaisser();
  const x = DB.ventes[DB.ventes.length - 1], a = DB.articles.find(y => y.id === 202); return { total: x.total, l: x.lignes[0], stk: stockVarDispo(a, a.vr[1]) }; });
t(v.total === 200 && String(v.l.vid) === '2' && v.l.qBase === 0.4, `la vente : 200 F, la sorte « Riz brisé », 0,4 kg (${JSON.stringify({ vid: v.l.vid, qBase: v.l.qBase, px: v.l.px })})`);
t(v.stk === 49.6, `le stock du riz brisé baisse de 0,4 kg : ${v.stk}`);
// ── 4. Une famille à la pièce ne change pas ──
r = await p.evaluate(() => { viderPanier(); varQtys = {}; const R = _voixPanier('deux bières'); return JSON.parse(JSON.stringify(panier)); });
t(Object.values(r).every(q => Number.isInteger(q)), 'une famille à la pièce : toujours des pièces entières');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
