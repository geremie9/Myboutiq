// t330 — LE RIZ ET LES HUILES DU PATRON (24.13).
// Le patron, le 24/11 : « j'ai les riz que je n'arrive pas à vendre de façon
// détail, en kg, ou 100, ou le montant ou les kg que je veux ; les huiles, je
// n'arrive pas encore à les modifier. »
// Mesuré dans sa boutique (mode gros, « Bloqué ») : toutes ses ventes de riz
// font 1 kg — la dose habituelle vendue d'une touche (24.08), la feuille
// rangée derrière le badge « ⚖ ». Ses huiles : « 1 400 F le bidon de 15 »
// (le prix d'une bouteille), et un carton qui a son prix ne faisait que se
// vendre, même en « Modifier ». Sa boutique, reconstruite : même structure.
// En vrais clics, au doigt, sur 360×760.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t330');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique({ articles: [] }); d.cfg.venteDeverrouillee = false; d.cfg.facon = 'gros';
d.articles = [
  { id: 2, nm: 'Riz', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, um: 'kg', umSac: 50, vr: [{ id: 1, nm: 'Riz (kg)', px: 800, pa: 600, stk0: 200, qBase: 1 }, { id: 2, nm: 'RIZ', px: 500, pa: 400, stk0: 200, qBase: 1 }] },
  { id: 5, nm: 'Huile', e: '', cat: 'Alimentation', px: 1200, pa: 0, stk0: 0, al: 0, um: 'pc', umSac: 15, umCont: 'carton', vr: [{ id: 1, nm: 'Diamaor', px: 1500, pa: 1300, stk0: 60, qBase: 1, umSac: 15, umCont: 'bidon', pxGros: 1400 }, { id: 2, nm: 'Mayor', px: 1100, pa: 900, stk0: 60, qBase: 1, umSac: 14, umCont: 'carton', pxGros: 1450 }, { id: 3, nm: 'Locale', px: 900, pa: 700, stk0: 60, qBase: 1 }] },
  { id: 9, nm: 'Savon', e: '', cat: 'Hygiène', px: 250, pa: 200, stk0: 300, al: 0, vd: 0, vr: [], umSac: 24, umCont: 'carton' }];
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 760 });
const tuileRiz = async () => { await p.evaluate(() => { document.querySelectorAll('.ov.show').forEach(o => o.classList.toggle('show', false)); renderProd(DB.articles); document.getElementById('pc-2').scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(200); await p.tap('#pc-2 .vtile', { position: { x: 60, y: 70 } }); await p.waitForTimeout(250); };
const payer = () => p.evaluate(async () => { procederPmt(); selPmntVente('especes'); await encaisser(); fermerSucces(); document.querySelectorAll('.ov.show').forEach(o => o.classList.toggle('show', false)); });

// ── 1) TROIS VENTES D'1 KG : L'HABITUDE SE FORME (sa boutique) ──────────
for (let i = 0; i < 3; i++) {
  await tuileRiz();
  if (await p.evaluate(() => document.getElementById('ov-qte').classList.contains('show'))) { await p.tap('#ov-qte .qte-b >> text=1'); await p.waitForTimeout(200); }
  await payer();
}
t(await p.evaluate(() => DB.ventes.filter(v => v.lignes.some(l => /Riz/.test(l.nm) && l.qte === 1)).length === 3), 'trois ventes d\'1 kg de riz, comme dans sa boutique');

// ── 2) LA TOUCHE SUIVANTE VEND 1 KG… ET LA BARRE MONTRE LES AUTRES ──────
await tuileRiz();
const r1 = await p.evaluate(() => ({ q: panier['2-1'], feuille: document.getElementById('ov-qte').classList.contains('show'),
  barre: [...document.querySelectorAll('#fbil.show .qct-m')].map(x => x.textContent.replace(/\s+/g, ' ').trim()), ms: document.getElementById('btn-enc').style.getPropertyValue('--eclair-ms') }));
t(r1.q === 1 && !r1.feuille, 'une touche vend toujours la dose habituelle (1 kg), sans question — son choix du 23/11');
t(r1.barre.length === 3 && /½\s*kg/.test(r1.barre[0]) && /2\s*kg/.test(r1.barre[1]) && /Autre/.test(r1.barre[2]), `et la barre du bas montre aussitôt : ${r1.barre.join(' · ')}`);
t(r1.ms === '5000ms', 'la vente éclair attend 5 s pour qu\'il choisisse');
await p.tap('#fbil .qct-m >> nth=0'); await p.waitForTimeout(200);
t(await p.evaluate(() => panier['2-1'] === 0.5), '« ½ kg » : la ligne passe à 0,5 kg (remplacée, pas ajoutée)');
await p.tap('#fbil .qct-m >> nth=2'); await p.waitForTimeout(250);
const f = await p.evaluate(() => ({ ouverte: document.getElementById('ov-qte').classList.contains('show'), rempl: (document.querySelector('#qte-hab .qte-rempl') || {}).textContent || '', mt: document.querySelectorAll('#qte-mt button').length }));
t(f.ouverte && /0,5\s?kg/.test(f.rempl) && f.mt >= 4, `« ⚖ Autre » : la feuille, en « remplacer » (« ${f.rempl.replace(/\s+/g, ' ').trim()} »), avec « pour un montant »`);
await p.tap('#qte-mt button >> text=/^\\s*100\\s*$/'); await p.waitForTimeout(250);
const r2 = await p.evaluate(() => ({ q: panier['2-1'], ouverte: document.getElementById('ov-qte').classList.contains('show') }));
t(!r2.ouverte && Math.abs(r2.q - 0.125) < 0.001, `« pour 100 F » : ${r2.q} kg de riz à 800 F le kilo`);
const v = await p.evaluate(async () => { procederPmt(); selPmntVente('especes'); await encaisser(); fermerSucces(); return JSON.parse(JSON.stringify(DB.ventes[DB.ventes.length - 1])); });
t(v.total === 100 && /pour 100/.test(v.lignes[0].nm) && v.lignes[0].qBase === 0.125, `encaissé : ${v.total} F, « ${v.lignes[0].nm} » (${v.lignes[0].qBase} kg sortis du stock) — la vente au détail qu'il demandait`);

// ── 3) LES HUILES : EN « MODIFIER », LE CARTON SE CORRIGE ───────────────
await p.evaluate(() => { DB.cfg.venteDeverrouillee = true; save(); ouvrirVar(DB.articles.find(a => a.id === 5)); }); await p.waitForTimeout(350);
await p.tap('#var-lst .vtile [data-grosv="1"]'); await p.waitForTimeout(450);
// 24.15 — la boutique relue répare seule ce carton (t332) : la feuille montre déjà 21 000.
const deja = await p.evaluate(() => document.getElementById('pc-px').value);
t(deja === '21000', `relue, la boutique a déjà réparé le bidon : « ${deja} » (il était à 1 400)`);
// Et s'il retape le prix d'UNE bouteille, la feuille le voit encore.
await p.fill('#pc-px', '1400'); await p.waitForTimeout(150);
const h = await p.evaluate(() => ({ pc: document.getElementById('ov-pc').classList.contains('show'), panier: JSON.stringify(panier), nm: (document.getElementById('pc-nm') || {}).textContent,
  al: ((document.querySelector('#pc-alerte .pcf-al') || {}).textContent || '').replace(/[  ]/g, ' ') }));
t(h.pc && h.panier === '{}' && /Diamaor/.test(h.nm), `le prix de carton de Diamaor, touché en « Modifier », ouvre la feuille (rien vendu) : « ${h.nm} »`);
t(/moins cher que 2 pièces/.test(h.al) && /1 400 F?(CFA)? × 15 = 21 000/.test(h.al), `la feuille le voit : « ${h.al.trim()} »`);
await p.tap('#pc-alerte .pcf-b'); await p.waitForTimeout(150);
await p.tap('#pc-ok'); await p.waitForTimeout(300);
const hv = await p.evaluate(() => { const x = DB.articles.find(a => a.id === 5).vr[0]; return { px: x.pxGros, n: x.umSac, mot: x.umCont }; });
t(hv.px === 21000 && hv.n === 15, `une touche : le bidon de 15 vaut 21 000 F (${JSON.stringify(hv)})`);
await p.evaluate(() => { DB.cfg.venteDeverrouillee = false; save(); ouvrirVar(DB.articles.find(a => a.id === 5)); }); await p.waitForTimeout(350);
await p.tap('#var-lst .vtile [data-grosv="1"]'); await p.waitForTimeout(250);
t(await p.evaluate(() => panier['5-1'] === 15 && !document.getElementById('ov-pc').classList.contains('show')), 'en vente (« Bloqué »), la même puce vend le bidon de 15, comme avant');
await p.evaluate(() => { document.querySelectorAll('.ov.show').forEach(o => o.classList.toggle('show', false)); viderPanier(); varQtys = {}; });

// ── 4) TROUVÉ EN ROUTE : DEUX NOMS QUE LA 24.09 AVAIT REPRIS ─────────────
const o = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 9); const r = _offreCarton('9-0', a, null, 30); return r ? { n: r.n, mot: r.mot, connu: !!r.connu } : null; });
t(o && o.n === 24 && o.connu, `le panier propose à nouveau de chiffrer le carton connu (« ${o && o.mot} de ${o && o.n} ») : la 24.09 avait écrasé cette fonction`);
const tch = await p.evaluate(() => { const ok1 = _dernierTouche !== null && typeof _dernierTouche === 'object'; let ok2 = true; try { mettreEnAvant(9); } catch (e) { ok2 = false; } return ok1 && ok2 && (_touches[9] || 0) > 0; });
t(tch, 'l\'ordre des articles les plus touchés se retient encore (la 24.09 remettait sa mémoire à zéro)');

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
