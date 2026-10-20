// t216 — LES VARIANTES EN GROS, DEDANS COMME DEHORS (23.03).
// « J'espère que vous avez bien travaillé les articles en variante ? »
// Mesuré au banc sur « Huile 1 L / 2 L / 5 L » d'une boutique en gros :
// dehors « dès 900 » — le prix d'une bouteille — à côté d'articles simples
// qui montraient leur carton ; dedans, toucher « 1 L » vendait UNE bouteille ;
// le 5 L, carton sans prix, n'était compté nulle part. Et « Tout
// configurer », que le bandeau « sans prix de gros » ouvrait depuis la
// 23.01, n'avait AUCUN champ pour le prix du carton.
// 23.07 — « En bas c'est le gros, en haut c'est le détail. » La sorte se lit
// et se touche comme au détail, dans les deux façons de vendre : le corps =
// une pièce, la puce 📦 du bas = un carton. Plus de tuile qui change de geste
// selon l'article.
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
  const g = x.querySelector('.vt-gros');
  return { prix: x.querySelector('.vt-px').textContent, unite: !!x.querySelector('.g-unite'), gros: g ? g.innerText.replace(/\s+/g, ' ') : '' };
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

// ── 1) DEHORS : EN HAUT LA BOUTEILLE, EN BAS LE CARTON ────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('gros'));
  const f = await p.evaluate(() => { const c = document.getElementById('pc-30');
    return { prix: c.querySelector('.ppr-ov').innerText, barre: (c.querySelector('.pbas .pbarre') || {}).innerText || '' }; });
  t(/dès 900/.test(f.prix) && /dès 9\s?800/.test(f.barre) && /le carton/.test(f.barre),
    `en gros, la famille : la bouteille en haut, son carton le moins cher en bas (« ${f.prix} » · « ${f.barre.replace(/\s+/g, ' ')} »)`);
  await p.locator('#pc-30 .pbas .pbarre').click(); await p.waitForTimeout(500);
  t(await p.evaluate(() => document.querySelectorAll('#vinline-lst .vtile').length === 3), 'la barre ouvre les sortes, comme la tuile');

  // ── 2) DEDANS (carrés) : LE CORPS = UNE BOUTEILLE, LA PUCE = UN CARTON ──
  const l1 = await sorte(p, '1 L'), l5 = await sorte(p, '5 L');
  t(!!l1 && /900/.test(l1.prix) && !/10\s?000/.test(l1.prix) && /10\s?000/.test(l1.gros) && !l1.unite,
    `« 1 L » : la bouteille en haut, le carton sur sa puce, comme au détail (« ${l1 && l1.prix} · ${l1 && l1.gros} »)`);
  t(!!l5 && /4\s?000/.test(l5.prix) && /carton/.test(l5.gros), `« 5 L », carton sans prix : sa puce le dit (« ${l5 && l5.prix} · ${l5 && l5.gros} »)`);
  await toucher(p, '1 L'); await p.waitForTimeout(250);
  let c = await ligne(p, '30-1');
  t(c.q === 1 && c.lots === 0 && c.total === 900, `toucher « 1 L » met UNE bouteille : ${c.q}, ${c.total} F`);
  await p.evaluate(() => { window.__toasts = []; });
  await toucher(p, '1 L', '.vt-gros'); await p.waitForTimeout(250);
  c = await ligne(p, '30-1');
  t(c.q === 13 && c.lots === 1 && c.total === 10900, `la puce du bas ajoute un carton : ${c.q} bouteilles, ${c.total} F`);
  t(c.barre === 10900, `et la barre du panier affiche le même total (${c.barre} F, pas 13 × 900)`);
  const dit = await p.evaluate(() => (window.__toasts || []).join(' | '));
  t(/1 carton/.test(dit) && !/× FCFA 900/.test(dit), `et l'app le dit en cartons, jamais « 12 × 900 » (« ${dit} »)`);
  // 23.31 — la pastille de quantité retire, comme dehors (plus de « − » à part).
  await toucher(p, '1 L', '.vt-badge'); await p.waitForTimeout(250);
  c = await ligne(p, '30-1');
  t(c.q === 12 && c.lots === 1 && c.total === 10000, `la pastille retire d'abord la bouteille en vrac : ${c.q}, ${c.total} F`);
  await toucher(p, '1 L', '.vt-badge'); await p.waitForTimeout(250);
  c = await ligne(p, '30-1');
  t(c.q === 0 && c.lots === 0 && c.total === 0, `puis le carton ENTIER, jamais onze bouteilles au détail : ${c.q}, ${c.total} F`);
  await toucher(p, '1 L', '.vt-gros'); await p.waitForTimeout(250);
  await toucher(p, '1 L'); await p.waitForTimeout(250);
  c = await ligne(p, '30-1');
  t(c.q === 13 && c.lots === 1 && c.total === 10900, `toucher la tuile ajoute une bouteille, comme dehors : ${c.q}, ${c.total} F`);
  await toucher(p, '5 L'); await p.waitForTimeout(250);
  c = await ligne(p, '30-3');
  t(c.q === 1 && c.lots === 0, `« 5 L » vend la pièce (${c.q})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) LE CERCLE : LES MÊMES GESTES ───────────────────────────────────
{
  const d = boutique('gros'); d.cfg.varStyle = 'cercle';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  await p.locator('#pc-30 .pnm-ov').click(); await p.waitForTimeout(900);
  const un = sel => p.evaluate(sel => { const x = Array.from(document.querySelectorAll('#vcirc-sat .vsat')).find(e => /(^|\s)1 L(\s|$)/.test(e.innerText));
    const c = x && (sel ? x.querySelector(sel) : x); if (c) c.click(); return !!c; }, sel);
  const sat = await p.evaluate(() => {
    const x = Array.from(document.querySelectorAll('#vcirc-sat .vsat')).find(e => /(^|\s)1 L(\s|$)/.test(e.innerText));
    return x ? { prix: (x.querySelector('.vsat-px b') || {}).textContent, gros: (x.querySelector('.vsat-gros') || {}).textContent || '', unite: !!x.querySelector('.g-unite') } : null;
  });
  t(!!sat && /^900$/.test(sat.prix) && /10\s?000/.test(sat.gros) && !sat.unite, `en cercle aussi, la bouteille dans le rond, le carton dessous (« ${sat && sat.prix} · ${sat && sat.gros} »)`);
  await un(null); await p.waitForTimeout(300);
  let c = await ligne(p, '30-1');
  t(c.q === 1 && c.total === 900, `le rond vend une bouteille : ${c.q}, ${c.total} F`);
  await un('.vsat-gros'); await p.waitForTimeout(300);
  c = await ligne(p, '30-1');
  t(c.q === 13 && c.lots === 1 && c.total === 10900, `la puce vend le carton : ${c.q}, ${c.total} F`);
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
  t(!!l1 && /900/.test(l1.prix) && /10\s?000/.test(l1.gros), `« 1 L » : la pièce en grand, le carton sur sa puce (« ${l1 && l1.prix} · ${l1 && l1.gros} »)`);
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
  await toucher(p, '5 L', '.vt-gros'); await p.waitForTimeout(250);
  const c = await ligne(p, '30-3');
  t(c.q === 4 && c.total === 15000, `et à la caisse, la puce du « 5 L » vend maintenant son carton : ${c.q} bidons, ${c.total} F`);
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
  t(!!r && /prix \?|—/i.test(r.prix) && /15\s?000/.test(r.gros), `en haut le kilo dit qu'il n'a pas de prix, en bas le sac a le sien (« ${r && r.prix} · ${r && r.gros} »)`);
  await p.evaluate(() => { window.__toasts = []; });
  await toucher(p, 'Parfumé'); await p.waitForTimeout(250);
  let c = await ligne(p, '40-1');
  let dit = await p.evaluate(() => (window.__toasts || []).join(' | '));
  t(c.q === 0 && /se vend au sac : touche la puce du bas/.test(dit), `le kilo sans prix ne se vend pas à 0 F, et dit où est le sac (« ${dit} »)`);
  await p.evaluate(() => { window.__toasts = []; });
  await toucher(p, 'Parfumé', '.vt-gros'); await p.waitForTimeout(250);
  c = await ligne(p, '40-1');
  t(c.q === 25 && c.total === 15000, `la puce vend le sac : ${c.q} kg, ${c.total} F`);
  dit = await p.evaluate(() => (window.__toasts || []).join(' | '));
  t(/1 sac \(25 kg\) · FCFA 15\s000/.test(dit) && !/× FCFA 0/.test(dit), `« 1 sac (25 kg) · 15 000 », jamais « × 0 » (« ${dit} »)`);
  await fermer(p);
  await p.evaluate(() => { DB.cfg.facon = 'detail'; renderProd(DB.articles); }); await p.waitForTimeout(300);
  t(await p.evaluate(() => document.getElementById('pc-40').classList.contains('incomplete')), 'au détail, la même famille redit qu\'il lui manque un prix');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
