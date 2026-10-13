// t229 — « QUAND J'ESSAIE DE RENSEIGNER LES PRIX, CERTAINS SAUTENT ; TU
// ÉCRIS, ET QUAND TU PARS INSCRIRE D'AUTRES PRIX, ÇA S'EFFACE » (23.14).
// Sa capture : « Tout configurer », la famille « Boisson predator », cinq
// variantes en palette de 12. On tape ICI comme lui, au clavier : toucher la
// case, taper, toucher la case suivante — jamais `fill()`, qui pose la valeur
// d'un coup et ne voit pas le redessin qui part entre deux cases.
// Sur la 23.13 :
//   · « Prix du carton » : chaque palette chiffrée sortait de la liste —
//     25 cases, puis 0 ;
//   · « Tout » : la liste entière était refaite pendant qu'il tapait dans la
//     case suivante : chaque prix tapé refaisait 48 cases, et la case qu'il
//     venait de toucher était remplacée sous son doigt (le clavier se ferme).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t229');
const { s, port } = await serveur();
const b = await chromium.launch();
const NOMS = ['33 cl', '50 cl', '1 L', 'Gold', 'Mango'];
const boutique = (sansPrix) => {
  const d = nouvelleBoutique(); d.cfg.facon = 'gros';
  d.articles.push({ id: 40, nm: 'Boisson predator', e: '🥤', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
    vr: NOMS.map((n, i) => ({ id: i + 1, nm: 'Boisson Predator ' + n, px: sansPrix ? 0 : [33, 125, 150, 25, 300][i], pa: 0,
      stk0: [225, 0, 0, 95, 12][i], umSac: 12, umCont: 'palette' })) });
  return d;
};
const cases = p => p.evaluate(() => Array.from(document.querySelectorAll('#gr-lst input.grin')).map(i => i.getAttribute('data-gr') + ':' + i.getAttribute('data-ch')));
// Il touche chaque case l'une après l'autre et tape ; on note si la case où
// il écrit est restée LA MÊME case pendant toute sa saisie.
async function remplir(p, ch, prix) {
  const r = { tapes: [], disparues: [], remplacees: 0 };
  // Toute case retirée de l'écran pendant qu'il remplit : sur son téléphone,
  // c'est le clavier qui se ferme et la case qu'il visait qui n'est plus là.
  await p.evaluate(() => { window.__ret = 0; window.__mo = new MutationObserver(ms => ms.forEach(m => m.removedNodes.forEach(n => {
    if (n.nodeType === 1 && (n.matches('input.grin') || n.querySelector('input.grin'))) __ret += n.matches('input.grin') ? 1 : n.querySelectorAll('input.grin').length; })));
    __mo.observe(document.getElementById('gr-lst'), { childList: true, subtree: true }); });
  for (let i = 1; i <= 5; i++) {
    const sel = `#gr-lst input.grin[data-gr="v40_${i}"][data-ch="${ch}"]`;
    if (!(await p.locator(sel).count())) { r.disparues.push(NOMS[i - 1]); continue; }
    await p.locator(sel).click();
    await p.evaluate(() => { document.activeElement.__sienne = 1; });
    await p.keyboard.type(String(prix[i - 1]), { delay: 30 });
    if (!(await p.evaluate(() => document.activeElement && document.activeElement.__sienne === 1))) r.remplacees++;
    r.tapes.push(prix[i - 1]);
  }
  await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.waitForTimeout(300);
  r.retirees = await p.evaluate(() => { __mo.disconnect(); return __ret; });
  return r;
}
const gardes = (p, ch) => p.evaluate(ch => DB.articles.find(a => a.id === 40).vr.map(v => v[ch] || 0), ch);

// ── 1) « PRIX DU CARTON » : LA LISTE DE TRAVAIL NE FOND PAS SOUS SON DOIGT ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique(false));
  await p.evaluate(() => ouvrirGrilleConfig('gros')); await p.waitForTimeout(300);
  const avant = await cases(p);
  const PX = [3100, 3200, 3300, 3400, 3500];
  const r = await remplir(p, 'pxGros', PX);
  const apres = await cases(p);
  t(r.disparues.length === 0, `les 5 palettes se remplissent l'une après l'autre (disparues : ${r.disparues.join(', ') || 'aucune'})`);
  t(JSON.stringify(await gardes(p, 'pxGros')) === JSON.stringify(PX), `chaque prix tapé est gardé tel quel : ${JSON.stringify(await gardes(p, 'pxGros'))}`);
  t(avant.length === 25 && JSON.stringify(apres) === JSON.stringify(avant), `aucune ligne ne saute : ${avant.length} cases avant, ${apres.length} après, dans le même ordre`);
  t(r.remplacees === 0 && r.retirees === 0, `aucune case n'est refaite sous son doigt (${r.retirees} retirées en remplissant)`);
  const noms = await p.evaluate(() => Array.from(document.querySelectorAll('#gr-lst .grl[data-cle^="v40_"] .grn1')).map(x => x.textContent));
  t(JSON.stringify(noms) === JSON.stringify(NOMS), `sous la famille, la variante dit son nom court : ${JSON.stringify(noms)}`);
  const lig = await p.evaluate(() => document.getElementById('gr-lst').textContent);
  t(/la palette/.test(lig) && !/le palette|du palette/.test(lig), `« la palette », pas « le palette » (« ${(lig.match(/tape ce que tu paies [^·]*/) || [''])[0].trim()} »)`);
  // Il ferme et revient : là, la liste se range — ce qui est fait sort.
  await p.evaluate(() => { closeSheet('ov-grille'); ouvrirGrilleConfig('gros'); }); await p.waitForTimeout(300);
  const reouv = await p.evaluate(() => document.querySelectorAll('#gr-lst .grl[data-cle^="v40_"]').length);
  t(reouv === 0, `rouverte, la liste ne garde que ce qui reste à faire (${reouv} palette)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 2) « TOUT » : CE QU'IL A TAPÉ NE S'EFFACE PAS, NE SE MÉLANGE PAS ──────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique(false));
  await p.evaluate(() => { ouvrirGrilleConfig(); grFiltrer('tout'); }); await p.waitForTimeout(200);
  await p.locator('#gr-lst .grfam[onclick*="grBasculerFamille(40)"]').click(); await p.waitForTimeout(300);
  const avant = await cases(p);
  const PX = [3100, 3200, 3300, 3400, 3500];
  const r = await remplir(p, 'pxGros', PX);
  t(JSON.stringify(await gardes(p, 'pxGros')) === JSON.stringify(PX), `« Tout » : les 5 prix gardés tels quels : ${JSON.stringify(await gardes(p, 'pxGros'))}`);
  t(r.remplacees === 0 && r.retirees === 0 && JSON.stringify(await cases(p)) === JSON.stringify(avant), `aucune case refaite pendant qu'il écrit (${r.retirees} retirées), aucune ligne déplacée`);
  // Puis le prix d'achat de la palette : la ligne fait la division devant
  // lui (le texte suit), sans toucher la case où il est.
  await p.locator('#gr-lst input.grin[data-gr="v40_1"][data-ch="paGros"]').click();
  await p.keyboard.type('2400', { delay: 30 });
  await p.locator('#gr-lst input.grin[data-gr="v40_2"][data-ch="paGros"]').click(); await p.waitForTimeout(200);
  const pa = await p.evaluate(() => ({ pa: DB.articles.find(a => a.id === 40).vr[0].pa,
    der: (document.querySelector('#gr-lst .grl[data-cle="v40_1"] .grderive') || {}).textContent || '' }));
  t(pa.pa === 200 && /200/.test(pa.der), `2 400 la palette de 12 : 200 la pièce, et la ligne le dit (« ${pa.der} »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 3) « CE QUI MANQUE » : UNE LIGNE COMPLÉTÉE RESTE À SA PLACE ───────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique(true));
  await p.evaluate(() => { ouvrirGrilleConfig(); grFiltrer('manque'); }); await p.waitForTimeout(200);
  await p.locator('#gr-lst .grfam[onclick*="grBasculerFamille(40)"]').click(); await p.waitForTimeout(300);
  const avant = await cases(p);
  const PX = [300, 350, 400, 450, 500];
  const r = await remplir(p, 'px', PX);
  t(r.disparues.length === 0 && JSON.stringify(await gardes(p, 'px')) === JSON.stringify(PX), `les 5 prix de vente, l'un après l'autre : ${JSON.stringify(await gardes(p, 'px'))}`);
  t(JSON.stringify(await cases(p)) === JSON.stringify(avant) && r.retirees === 0, `les lignes complétées restent où elles sont tant qu'il travaille (${r.retirees} cases retirées)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
