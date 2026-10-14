// t233 — « INTERDIRE OU TROUVER UNE SOLUTION POUR LA VENTE DE DÉPANNAGE :
// ÇA PEUT FAUSSER LA VALEUR RÉELLE DE LA BOUTIQUE » (23.15).
// Mesuré sur la 23.14 : une unité vendue sans stock ne SORTAIT PAS du stock
// (il restait à 0). Il vend 5 savons alors qu'il en a 2, puis entre les 10
// qu'il rachète : l'app dit 10, l'étagère en a 7. La valeur comptait 3
// savons qui n'existent pas.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock, nombre } from './caisse.mjs';
const { t, fin } = compteur('t233');
// Comme au comptoir : il touche l'article ; au bout du stock l'app demande
// « Vendre quand même ? », il répond oui, et continue. Puis il encaisse.
const auComptoir = (p, id, n) => p.evaluate(async ([id, n]) => {
  window.__toasts = []; document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); clientVente = null;
  const a = DB.articles.find(x => x.id === id);
  for (let i = 0; i < n; i++) { addPanier(a, 0); if (document.querySelector('#ov-neg.show')) vendreMalgre(); }
  const dansPanier = panier[id + '-0'] || 0;
  procederPmt(); selPmntVente('especes');
  document.getElementById('calc-recu').value = Math.ceil(calcAPayer() / 1000) * 1000; calcMonnaie(true);
  const avant = DB.ventes.length; await encaisser();
  document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  return { v: DB.ventes.length > avant ? JSON.parse(JSON.stringify(DB.ventes[DB.ventes.length - 1])) : null, toasts: window.__toasts.slice(), dansPanier };
}, [id, n]);
const { s, port } = await serveur();
const b = await chromium.launch();
const boutique = () => { const d = nouvelleBoutique(); const a = d.articles.find(x => x.id === 3); a.stk0 = 2; a.rt = true;
  // Un article dont le stock n'a JAMAIS été compté : il se vend sans rien demander.
  d.articles.push({ id: 8, nm: 'Recharge', e: '📦', cat: 'Divers', px: 500, pa: 450, stk0: 0, al: 0, vd: 0, vr: [], rt: true });
  return d; };
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique());
  // ── 1) LE DÉPANNAGE EST UNE DETTE DE STOCK ───────────────────────────
  const r = await auComptoir(p, 3, 5);
  const l = r.v && r.v.lignes.find(x => x.pid === 3);
  t(l && l.qty === 5 && l.dep === 3 && l.dt === 1, `5 savons vendus, 2 en stock : 3 en dépannage, marqués comme dette (${l && JSON.stringify({ qty: l.qty, dep: l.dep, dt: l.dt })})`);
  t(await stock(p, 3) === -3, `le stock dit −3 (« 3 à rattraper »), plus 0 (${await stock(p, 3)})`);
  // ── 2) LA VALEUR LE DÉDUIT, ET LE DIT ────────────────────────────────
  await p.evaluate(() => ouvrirValeur()); await p.waitForTimeout(300);
  const v = await p.evaluate(() => { const x = document.querySelector('#vb-corps .vb-dette'); const vb = valeurBoutique();
    return { txt: x ? x.innerText : '', val: vb.dette, tot: vb.total, somme: vb.achat + vb.caisse + vb.credits + vb.autre }; });
  t(v.val === 1500 && /Dépannages à régulariser/.test(v.txt) && /3 Savon Azur/.test(v.txt), `« Dépannages à régulariser » : −1 500 (3 × 500 d'achat) — « ${v.txt.replace(/\s+/g, ' ')} »`);
  t(v.tot === v.somme - 1500, `et le total le retire (${v.tot} = ${v.somme} − 1 500)`);
  await p.locator('#vb-corps .vb-dette').click(); await p.waitForTimeout(400);
  const f = await p.evaluate(() => ({ n: document.querySelectorAll('#stk-lst .sit, .scd .sit').length, c: (document.getElementById('stk-compte') || {}).textContent || '' }));
  t(/vendu sans stock/.test(f.c) && f.n === 1, `toucher la ligne montre l'article à régulariser (${f.n} — « ${f.c} »)`);
  // ── 3) L'ENTRÉE SUIVANTE COMBLE D'ABORD LE TROU ──────────────────────
  await p.evaluate(() => { const a = DB.articles.find(x => x.id === 3); selArtStk(a); stkSens('in'); document.getElementById('ov-stk').classList.add('show');
    document.getElementById('inp-sqte').value = '10'; majApercuStk(); saveStk(); });
  await p.waitForTimeout(300);
  t(await stock(p, 3) === 7, `il entre les 10 rachetés : 7 sur l'étagère, comme en vrai (${await stock(p, 3)})`);
  t(await p.evaluate(() => valeurBoutique().dette) === 0, 'et il n\'y a plus rien à régulariser');
  // ── 4) LE PATRON PEUT L'INTERDIRE ────────────────────────────────────
  await p.evaluate(() => ouvrirValeur()); await p.waitForTimeout(200);
  await p.locator('#vb-corps .vb-regle button', { hasText: 'Interdite' }).click(); await p.waitForTimeout(200);
  t(await p.evaluate(() => DB.cfg.sansStock) === 'non', 'un toucher : « Vente de dépannage — Interdite »');
  await p.evaluate(() => closeSheet('ov-valeur'));
  const r2 = await auComptoir(p, 3, 9);
  const l2 = r2.v && r2.v.lignes.find(x => x.pid === 3);
  t(r2.dansPanier === 7 && l2 && l2.qty === 7 && !l2.dep, `9 savons demandés, 7 en rayon : le panier s'arrête à 7, et ces 7 se vendent (${r2.dansPanier}, ${l2 && l2.qty})`);
  t(await stock(p, 3) === 0, `le stock tombe à 0, jamais en dessous (${await stock(p, 3)})`);
  // Un panier trop plein, posé par un autre chemin, est refusé à l'encaissement.
  const r2b = await p.evaluate(async () => { window.__toasts = []; viderPanier(); panier['3-0'] = 2; const n = DB.ventes.length; procederPmt(); await encaisser();
    document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); const t = window.__toasts.slice(); viderPanier(); return { n: DB.ventes.length - n, t }; });
  t(r2b.n === 0 && /ne vend pas sans stock/.test(r2b.t.join(' ')), `2 savons quand il n'en reste aucun : refusé à l'encaissement (« ${r2b.t[0] || ''} »)`);
  t(await stock(p, 3) === 0, 'rien n\'a bougé');
  // La feuille « Stock épuisé » ne propose plus « Vendre quand même », mais l'entrée.
  await p.evaluate(() => { viderPanier(); ouvrirNeg(DB.articles.find(x => x.id === 3), null); });
  const neg = await p.evaluate(() => ({ vendre: getComputedStyle(document.getElementById('btn-vendre')).display, entree: getComputedStyle(document.getElementById('btn-neg-entree')).display, msg: document.getElementById('neg-msg').textContent }));
  t(neg.vendre === 'none' && neg.entree !== 'none' && /ne vend pas sans stock/.test(neg.msg), `stock épuisé : « Faire l'entrée de stock » à la place de « Vendre quand même » (« ${neg.msg} »)`);
  await p.evaluate(() => { vendreMalgre(); closeSheet('ov-neg'); });
  t(await p.evaluate(() => Object.keys(panier).length) === 0, 'et « vendre quand même » ne passe plus, même appelé');
  // Un article jamais compté se vend toujours : la boutique qui démarre n'est pas bloquée.
  const r4 = await vendre(p, { lignes: [[8, 1]] });
  t(!!r4.v, 'un article dont le stock n\'a jamais été compté se vend quand même');
  t(await p.evaluate(() => valeurBoutique().dette) === 0, 'et il n\'est pas une dette (rien n\'a jamais été compté)');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 5) LES VENTES D'AVANT 23.15 NE CHANGENT PAS LE STOCK D'UN COUP ───────
// Données anciennes simulées : une vente déjà en base, faite par une
// version précédente (pas de `dt`). Son dépannage ne sortait pas du stock :
// il ne doit toujours pas en sortir après la mise à jour.
{
  const d = boutique(); d.articles.find(x => x.id === 3).stk0 = 10;
  d.ventes.push({ id: 'ancien_1700000000000_ab', date: '01/10/2026', heure: '10:00', total: 3250, ben: 750, annulee: false, cloturee: true,
    paiement: { mode: 'especes' }, vendeur: 'Patron', lignes: [{ nm: 'Savon Azur', px: 650, pa: 500, qte: 5, qty: 5, pid: 3, vid: null, qBase: 1, dep: 3 }] });
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  t(await stock(p, 3) === 8, `une vente d'avant 23.15 (5 dont 3 en dépannage) retire 2, comme avant : stock ${await stock(p, 3)}`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 6) LE VENDEUR, BOUTIQUE QUI INTERDIT ─────────────────────────────────
{
  const d = boutique(); d.cfg.sansStock = 'non';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { vendeur: 'Ibrahim' });
  await p.evaluate(() => { viderPanier(); ouvrirNeg(DB.articles.find(x => x.id === 3), null); });
  const neg = await p.evaluate(() => ({ entree: getComputedStyle(document.getElementById('btn-neg-entree')).display, msg: document.getElementById('neg-msg').textContent, regle: getComputedStyle(document.getElementById('btn-neg-regle')).display }));
  t(neg.entree === 'none' && /Demande au patron/.test(neg.msg) && neg.regle === 'none', `le vendeur : « ${neg.msg} »`);
  await p.evaluate(() => { closeSheet('ov-neg'); reglerVenteSansStock('oui'); });
  t(await p.evaluate(() => DB.cfg.sansStock) === 'non', 'et il ne peut pas changer la règle');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
