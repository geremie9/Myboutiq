// t216 — LES VARIANTES EN GROS, DEDANS COMME DEHORS (23.03).
// « J'espère que vous avez bien travaillé les articles en variante ? »
// Mesuré au banc sur « Huile 1 L / 2 L / 5 L » d'une boutique en gros :
// dehors « dès 900 » — le prix d'une bouteille — à côté d'articles simples
// qui montraient leur carton ; dedans, toucher « 1 L » vendait UNE bouteille ;
// le 5 L, carton sans prix, n'était compté nulle part. Et « Tout
// configurer », que le bandeau « sans prix de gros » ouvrait depuis la
// 23.01, n'avait AUCUN champ pour le prix du carton.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t216');
const { s, port } = await serveur();
const b = await chromium.launch();

const HUILE = () => ({ id: 30, nm: 'Huile', e: '🫗', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: [{ id: 1, nm: '1 L', px: 900, pa: 700, stk: 0, stk0: 48, umSac: 12, umCont: 'carton', pxGros: 10000, paGros: 8400 },
       { id: 2, nm: '2 L', px: 1700, pa: 1400, stk: 0, stk0: 24, umSac: 6, umCont: 'carton', pxGros: 9800 },
       { id: 3, nm: '5 L', px: 4000, pa: 3400, stk: 0, stk0: 8, umSac: 4, umCont: 'carton' }] });
function boutique(facon, extra) {
  const d = nouvelleBoutique();
  d.cfg.facon = facon; d.cfg.venteDeverrouillee = false;   // la caisse de tous les jours
  d.articles.push(HUILE());
  if (extra) d.articles.push(extra);
  return d;
}
// Sur un code qui n'a pas l'écran, l'élément manque : on le constate (❌)
// au lieu d'attendre trente secondes.
const remplir = async (p, sel, v) => { const l = p.locator(sel); if (await l.count()) { await l.first().fill(v); await l.first().dispatchEvent('change'); return true; } return false; };
const fermer = p => p.evaluate(() => { try { fermerVarInline(); } catch (e) {} document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); });
// Une sorte, dans le panneau ouvert (carrés) : ce qu'on lit, et de quoi la toucher.
const sorte = (p, nm) => p.evaluate(nm => {
  const x = Array.from(document.querySelectorAll('#vinline-lst .vtile')).find(e => (e.querySelector('.vt-nm') || {}).textContent === nm);
  if (!x) return null;
  const u = x.querySelector('.g-unite'), g = x.querySelector('.vt-gros:not(.g-unite)');
  return { prix: x.querySelector('.vt-px').textContent, sous: (x.querySelector('.vt-sous') || {}).textContent || '',
    unite: u ? u.innerText.replace(/\s+/g, ' ') : '', gros: g ? g.innerText.replace(/\s+/g, ' ') : '' };
}, nm);
const toucher = (p, nm, sel) => p.evaluate(([nm, sel]) => {
  const x = Array.from(document.querySelectorAll('#vinline-lst .vtile')).find(e => (e.querySelector('.vt-nm') || {}).textContent === nm);
  const cible = sel ? x && x.querySelector(sel) : x;
  if (!cible) return false; cible.click(); return true;
}, [nm, sel]);
const ligne = (p, k) => p.evaluate(k => {
  const g = _grosPanier[k], b = document.getElementById('ctot');
  // `barre` : le total AFFICHÉ dans la barre du panier, tel qu'il le lit.
  return { q: panier[k] || 0, lots: ((g && g.lots) || []).length, total: calcAPayer(),
    barre: (b && !document.getElementById('fcart').classList.contains('hide')) ? Number(b.textContent.replace(/\D/g, '')) : 0 };
}, k);

// ── 1) DEHORS : LA FAMILLE DIT SON CARTON ─────────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('gros'));
  const f = await p.evaluate(() => { const c = document.getElementById('pc-30');
    return { cls: c.className, prix: c.querySelector('.ppr-ov').innerText, sous: (c.querySelector('.pgr-sous') || {}).innerText || '' }; });
  t(/dès 9\s?800/.test(f.prix) && f.sous === 'le carton', `en gros, la tuile de la famille montre son carton le moins cher (« ${f.prix} · ${f.sous} »)`);
  t(/\bpgr\b/.test(f.cls), 'avec la couleur du gros, comme un article simple');

  // ── 2) DEDANS (carrés) : UNE TOUCHE = UN CARTON ──
  await p.locator('#pc-30').click(); await p.waitForTimeout(500);
  const l1 = await sorte(p, '1 L'), l5 = await sorte(p, '5 L');
  t(!!l1 && /10\s?000/.test(l1.prix) && l1.sous === 'carton de 12', `« 1 L » montre le prix de SON carton, sa taille dessous (« ${l1 && l1.prix} · ${l1 && l1.sous} »)`);
  t(!!l1 && /900/.test(l1.unite) && /la pièce/.test(l1.unite), `la pièce reste à une touche, sur sa puce (« ${l1 && l1.unite} »)`);
  t(!!l5 && /4\s?000/.test(l5.prix) && !l5.unite && /carton/.test(l5.gros), `« 5 L », carton sans prix : rien ne change, la touche vend la pièce (« ${l5 && l5.prix} · ${l5 && l5.gros} »)`);
  await p.evaluate(() => { window.__toasts = []; });
  await toucher(p, '1 L'); await p.waitForTimeout(250);
  let c = await ligne(p, '30-1');
  t(c.q === 12 && c.lots === 1 && c.total === 10000, `toucher « 1 L » met un carton au panier : ${c.q} bouteilles, ${c.total} F`);
  t(c.barre === 10000, `et la barre du panier affiche le même total (${c.barre} F, pas 12 × 900)`);
  const dit = await p.evaluate(() => (window.__toasts || []).join(' | '));
  t(/1 carton \(12\) · FCFA 10\s000/.test(dit) && !/× FCFA 900/.test(dit), `et l'app le dit à son prix de carton, plus « 12 × 900 » (« ${dit} »)`);
  await toucher(p, '1 L', '.g-unite'); await p.waitForTimeout(250);
  c = await ligne(p, '30-1');
  t(c.q === 13 && c.total === 10900, `la puce ajoute UNE bouteille : ${c.q}, ${c.total} F`);
  await toucher(p, '1 L', '.vt-moins'); await p.waitForTimeout(250);
  c = await ligne(p, '30-1');
  t(c.q === 12 && c.lots === 1 && c.total === 10000, `« − » retire d'abord la bouteille en vrac : ${c.q}, ${c.total} F`);
  await toucher(p, '1 L', '.vt-moins'); await p.waitForTimeout(250);
  c = await ligne(p, '30-1');
  t(c.q === 0 && c.lots === 0 && c.total === 0, `puis le carton ENTIER, jamais onze bouteilles au détail : ${c.q}, ${c.total} F`);
  await toucher(p, '1 L'); await p.waitForTimeout(250);
  await toucher(p, '1 L', '.vt-plus'); await p.waitForTimeout(250);
  c = await ligne(p, '30-1');
  t(c.q === 24 && c.lots === 2 && c.total === 20000, `« + » ajoute un carton, comme la touche : ${c.q}, ${c.total} F`);
  await toucher(p, '5 L'); await p.waitForTimeout(250);
  c = await ligne(p, '30-3');
  t(c.q === 1 && c.lots === 0, `« 5 L » vend la pièce, comme avant (${c.q})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) LE CERCLE : LES MÊMES GESTES ───────────────────────────────────
{
  const d = boutique('gros'); d.cfg.varStyle = 'cercle';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  await p.locator('#pc-30').click(); await p.waitForTimeout(900);
  const sat = await p.evaluate(() => {
    const x = Array.from(document.querySelectorAll('#vcirc-sat .vsat')).find(e => /(^|\s)1 L(\s|$)/.test(e.innerText));
    return x ? { prix: (x.querySelector('.vsat-px b') || {}).textContent, unite: !!x.querySelector('.g-unite') } : null;
  });
  t(!!sat && /10\s?000/.test(sat.prix) && sat.unite, `en cercle aussi, « 1 L » porte le prix du carton et la puce de la pièce (« ${sat && sat.prix} »)`);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('#vcirc-sat .vsat')).find(e => /(^|\s)1 L(\s|$)/.test(e.innerText)); x && x.click(); });
  await p.waitForTimeout(300);
  const c = await ligne(p, '30-1');
  t(c.q === 12 && c.total === 10000, `et la touche vend le carton : ${c.q}, ${c.total} F`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 4) AU DÉTAIL : RIEN NE CHANGE ─────────────────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('detail'));
  const f = await p.evaluate(() => document.getElementById('pc-30').querySelector('.ppr-ov').innerText);
  t(/dès 900/.test(f), `au détail, la famille garde « ${f} »`);
  await p.locator('#pc-30').click(); await p.waitForTimeout(500);
  const l1 = await sorte(p, '1 L');
  t(!!l1 && /900/.test(l1.prix) && !l1.unite && /10\s?000/.test(l1.gros), `« 1 L » : la pièce en grand, le carton sur sa puce (« ${l1 && l1.prix} · ${l1 && l1.gros} »)`);
  await toucher(p, '1 L'); await p.waitForTimeout(250);
  const c = await ligne(p, '30-1');
  t(c.q === 1 && c.total === 900, `la touche vend une bouteille, comme toujours au détail (${c.q}, ${c.total} F)`);
  // Au détail, le carton se vend par sa puce : même fonction, même barre.
  await toucher(p, '1 L', '.vt-gros'); await p.waitForTimeout(250);
  const c2 = await ligne(p, '30-1');
  t(c2.q === 13 && c2.total === 10900 && c2.barre === 10900, `sa puce ajoute le carton, et la barre dit ${c2.barre} F (calculé : ${c2.total})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 5) LE BANDEAU, ET « TOUT CONFIGURER » QUI RÈGLE ENFIN LE CARTON ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('gros'));
  const band = await p.evaluate(() => { const z = document.getElementById('caisse-sansgros');
    return { vu: z.style.display !== 'none', txt: z.textContent, liste: _articlesSansPrixGros().map(x => x.nm) }; });
  t(band.vu && /1 article sans prix de gros/.test(band.txt) && band.liste.join() === 'Huile — 5 L',
    `le bandeau compte aussi les sortes : « ${band.txt} » (${band.liste.join(', ')})`);
  await p.evaluate(() => document.getElementById('caisse-sansgros').click()); await p.waitForTimeout(500);
  const g = await p.evaluate(() => ({ ouvert: !!document.querySelector('#ov-grille.show'),
    filtre: (document.getElementById('gr-f-gros') || {}).className || '',
    lignes: Array.from(document.querySelectorAll('#gr-lst .grrow .grn1')).map(x => x.textContent),
    // 23.04 — en gros, le prix du carton est DANS la ligne (t217), plus dessous.
    champ: !!document.querySelector('#gr-lst input[data-gr="v30_3"][data-ch="pxGros"]'),
    titre: ((document.querySelector('#gr-lst .grrow .grc') || {}).textContent || '') }));
  t(g.ouvert && /\bon\b/.test(g.filtre), 'il ouvre « Tout configurer » sur la liste des CARTONS');
  t(g.lignes.join(' | ') === 'Huile | 5 L', `la famille est dépliée sur la seule sorte qui manque (${g.lignes.join(' | ')})`);
  t(g.champ && /carton de 4/.test(g.titre), `un champ pour le prix du carton, enfin (« ${g.titre} »)`);
  await remplir(p, '#gr-lst input[data-gr="v30_3"][data-ch="pxGros"]', '15000');
  await p.waitForTimeout(400);
  const apres = await p.evaluate(() => ({ px: DB.articles.find(x => x.id === 30).vr.find(v => v.id === 3).pxGros,
    garde: JSON.parse(localStorage.getItem('myboutiq_v6')).articles.find(x => x.id === 30).vr.find(v => v.id === 3).pxGros,
    band: document.getElementById('caisse-sansgros').style.display, etat: document.getElementById('gr-etat').textContent }));
  t(apres.px === 15000 && apres.garde === 15000, `le prix du carton du 5 L est écrit, et gardé (${apres.px})`);
  t(apres.band === 'none' && /Tous tes cartons ont leur prix/.test(apres.etat), `le bandeau s'efface (« ${apres.etat} »)`);
  await fermer(p);
  await p.locator('#pc-30').click(); await p.waitForTimeout(500);
  await toucher(p, '5 L'); await p.waitForTimeout(250);
  const c = await ligne(p, '30-3');
  t(c.q === 4 && c.total === 15000, `et à la caisse, « 5 L » se vend maintenant au carton : ${c.q} bidons, ${c.total} F`);
  // Un article simple aussi a sa ligne de carton, dans la liste entière.
  await fermer(p);
  await p.evaluate(() => { ouvrirGrilleConfig(); grFiltrer('tout'); });
  await p.waitForTimeout(400);
  const sv = await p.evaluate(() => { const i = document.querySelector('#gr-lst input[data-gr="a6"][data-ch="pxGros"]'); return i ? i.value : null; });
  t(sv === '13000', `« Savon Mont Claire » montre son prix de carton, modifiable au même endroit (${sv})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 6) UNE FAMILLE QUI N'A QUE DES PRIX DE CARTON ─────────────────────
{
  const RIZ = { id: 40, nm: 'Riz', e: '🍚', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, um: 'kg',
    vr: [{ id: 1, nm: 'Parfumé', px: 0, pa: 0, stk: 0, stk0: 100, umSac: 25, umCont: 'sac', pxGros: 15000 },
         { id: 2, nm: 'Ordinaire', px: 0, pa: 0, stk: 0, stk0: 100, umSac: 25, umCont: 'sac', pxGros: 12500 }] };   // deux sortes : une seule serait aplatie en article
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('gros', RIZ));
  t(await p.evaluate(() => !document.getElementById('pc-40').classList.contains('incomplete')), 'en gros, la famille aux seuls prix de sac n\'est pas « à compléter »');
  await p.locator('#pc-40').click(); await p.waitForTimeout(500);
  const r = await sorte(p, 'Parfumé');
  t(!!r && /15\s?000/.test(r.prix) && /Prix \?/.test(r.unite), `le sac a son prix ; le kilo dit qu'il n'en a pas (« ${r && r.unite} »)`);
  await p.evaluate(() => { window.__toasts = []; });
  await toucher(p, 'Parfumé'); await p.waitForTimeout(250);
  let c = await ligne(p, '40-1');
  t(c.q === 25 && c.total === 15000, `la touche vend le sac : ${c.q} kg, ${c.total} F`);
  const dit = await p.evaluate(() => (window.__toasts || []).join(' | '));
  t(/1 sac \(25 kg\) · FCFA 15\s000/.test(dit) && !/× FCFA 0/.test(dit), `« 1 sac (25 kg) · 15 000 », jamais « × 0 » (« ${dit} »)`);
  await toucher(p, 'Parfumé', '.g-unite'); await p.waitForTimeout(250);
  c = await ligne(p, '40-1');
  t(c.q === 25 && c.total === 15000, 'le kilo sans prix ne se vend pas à 0 F');
  await fermer(p);
  await p.evaluate(() => { DB.cfg.facon = 'detail'; renderProd(DB.articles); }); await p.waitForTimeout(300);
  t(await p.evaluate(() => document.getElementById('pc-40').classList.contains('incomplete')), 'au détail, la même famille redit qu\'il lui manque un prix');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
