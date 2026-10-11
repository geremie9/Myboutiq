// t217 — « TOUT CONFIGURER » : LES ACHATS EN GROS SE TAPENT EN CARTONS (23.04).
// « Ici, l'enregistrement des achats en gros est complexe » — sa capture :
// ACHAT, VENTE, STOCK, tout à la pièce, sur des articles dont le carton
// était connu (« pièce ⇄ » sur chaque ligne). Mesuré au banc sur la 23.03 :
// le savon payé 12 000 le carton de 24 devait s'écrire 500 (division de
// tête) ; écrire 12 000 dans la case du carton ne changeait PAS le coût de
// la pièce (le bénéfice d'une pièce restait faux) ; 96 pièces se lisaient
// 96, ou « 4 » derrière une bascule ; et chaque case tapée refaisait la
// liste sous son doigt : la case suivante disparaissait, le clavier se
// fermait — deux touches par case.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t217');
const { s, port } = await serveur();
const b = await chromium.launch();

const HUILE = () => ({ id: 30, nm: 'Huile', e: '🫗', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: [{ id: 1, nm: '1 L', px: 900, pa: 700, stk: 0, stk0: 48, umSac: 12, umCont: 'carton', pxGros: 10000, paGros: 8400 },
       { id: 2, nm: '2 L', px: 1700, pa: 1400, stk: 0, stk0: 24, umSac: 6, umCont: 'carton', pxGros: 9800 }] });
// Le paquet dont il n'a encore que le coût à la pièce — sa ligne « Allumettes ».
const ALLUM = () => ({ id: 40, nm: 'Allumettes', e: '🔥', cat: 'Divers', px: 50, pa: 35, stk0: 300, al: 0, vd: 0, umSac: 50, umCont: 'paquet' });
// Le sac qui ne se vend qu'entier : aucun prix au kilo.
const RIZ = () => ({ id: 41, nm: 'Riz 25 kg', e: '🍚', cat: 'Alimentation', um: 'kg', px: 0, pa: 0, stk0: 250, al: 0, vd: 0,
  umSac: 25, umCont: 'sac', pxGros: 16500, paGros: 15000 });
function boutique(facon) {
  const d = nouvelleBoutique();
  d.cfg.facon = facon;
  d.articles.push(HUILE(), ALLUM(), RIZ());
  return d;
}
const grille = p => p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); ouvrirGrilleConfig(); grFiltrer('tout'); _grOuverts[30] = true; renderGrille(); });
// Une ligne de la grille, telle qu'il la lit : ses cases, leurs légendes,
// la ligne de dessous.
const lire = (p, cle) => p.evaluate(cle => {
  const ins = Array.from(document.querySelectorAll('#gr-lst input.grin')).filter(i => i.getAttribute('data-gr') === cle);
  if (!ins.length) return null;
  const row = ins[0].closest('.grrow'), sous = row && row.nextElementSibling && row.nextElementSibling.classList.contains('grgros') ? row.nextElementSibling : null;
  const cases = {}, legendes = {}, deduit = {};
  ins.forEach(i => { const ch = i.getAttribute('data-ch'); cases[ch] = i.value;
    const cap = i.parentElement.querySelector('.grcap'); legendes[ch] = cap ? cap.textContent : '';
    deduit[ch] = i.classList.contains('grderiv');
    i.__dansLigne = row.contains(i); });
  const dansLigne = ins.filter(i => row.contains(i)).map(i => i.getAttribute('data-ch'));
  return { cases, legendes, deduit, dansLigne,
    carton: (row.querySelector('.grc') || {}).textContent || '',
    bascule: (row.querySelector('.grun') || {}).textContent || '',
    dessous: sous ? sous.innerText.replace(/\s+/g, ' ') : '' };
}, cle);
const remplir = async (p, cle, ch, v) => {
  const l = p.locator(`#gr-lst input[data-gr="${cle}"][data-ch="${ch}"]`);
  if (!(await l.count())) return false;
  await l.first().fill(v); await l.first().dispatchEvent('change'); await p.waitForTimeout(120); return true;
};
const article = (p, id, vid) => p.evaluate(([id, vid]) => {
  const a = DB.articles.find(x => x.id === id), c = vid ? a.vr.find(v => v.id === vid) : a;
  const g = JSON.parse(localStorage.getItem('myboutiq_v6')).articles.find(x => x.id === id), gc = vid ? g.vr.find(v => v.id === vid) : g;
  return { pa: c.pa, px: c.px, paGros: c.paGros, pxGros: c.pxGros, stk: c.stk, stk0: c.stk0,
    garde: { pa: gc.pa, paGros: gc.paGros, stk: gc.stk }, journal: (DB.journal || []).slice(0, 3).map(j => j.art + ' ' + j.av + ' → ' + j.ap).join(' | ') };
}, [id, vid]);

// ── 1) EN GROS : LA LIGNE SE LIT EN CARTONS ───────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('gros'));
  await grille(p); await p.waitForTimeout(300);
  let l = await lire(p, 'a6');
  t(!!l && l.dansLigne.join() === 'paGros,pxGros,stkC', `la ligne du savon : achat du carton, vente du carton, stock en cartons (${l && l.dansLigne.join()})`);
  t(l && l.cases.paGros === '12000' && l.legendes.paGros === 'le carton' && l.cases.pxGros === '13000',
    `il lit ce qu'il paie le carton, 12 000, et ce qu'il le vend, 13 000 (« ${l && l.legendes.paGros} »)`);
  t(l && l.cases.stkC === '4' && l.legendes.stkC === 'cartons', `96 pièces se lisent « 4 cartons » (${l && l.cases.stkC} ${l && l.legendes.stkC})`);
  t(l && /la pièce/.test(l.dessous) && l.cases.px === '600', `la pièce passe dessous, avec son prix de vente (${l && l.cases.px})`);
  t(l && /achat 500 la pièce \(12\s000 ÷ 24\)/.test(l.dessous), `la division est faite devant lui : « ${l && l.dessous} »`);
  t(l && /96 pièces en tout/.test(l.dessous), 'et le total en pièces, pour vérifier');

  // Il retape le carton : le coût de la pièce suit, au journal.
  await remplir(p, 'a6', 'paGros', '10800');
  let a = await article(p, 6);
  t(a.paGros === 10800 && a.pa === 450, `carton payé 10 800 → la pièce coûte 450 (${a.paGros} → ${a.pa})`);
  t(a.garde.paGros === 10800 && a.garde.pa === 450, 'gardé sur le téléphone');
  t(/Savon Mont Claire \(achat\) FCFA 500 → FCFA 450/.test(a.journal), `et noté au journal (« ${a.journal.slice(0, 160)} »)`);
  l = await lire(p, 'a6');
  t(l && /achat 450 la pièce \(10\s800 ÷ 24\)/.test(l.dessous), `la ligne le redit : « ${l && l.dessous} »`);

  // Le stock : des cartons ET du vrac, jamais « 4,21 ».
  await remplir(p, 'a6', 'stkC', '5');
  a = await article(p, 6);
  t(a.stk === 120 && a.garde.stk === 120, `« 5 » cartons → 120 pièces (${a.stk})`);
  await remplir(p, 'a6', 'stkV', '7');
  a = await article(p, 6);
  t(a.stk === 127, `+ 7 en vrac → 127 (${a.stk})`);
  l = await lire(p, 'a6');
  t(l && l.cases.stkC === '5' && l.cases.stkV === '7' && /127 pièces en tout/.test(l.dessous), `il relit 5 cartons + 7 (${l && l.cases.stkC} + ${l && l.cases.stkV})`);
  await remplir(p, 'a6', 'stkC', '6');
  a = await article(p, 6);
  t(a.stk === 151, `retaper les cartons garde le vrac : 6 × 24 + 7 = ${a.stk}`);
  t(await p.evaluate(() => DB.ventes.length === 0 && DB.appros.length === 0), 'aucune vente, aucun ravitaillement inventé : seul le stock de départ bouge');

  // ⚠️ Taper une case puis toucher la suivante : le clavier reste sur la suivante.
  const cible = p.locator('#gr-lst input[data-gr="a6"][data-ch="paGros"]');
  await cible.fill('11000');
  await p.locator('#gr-lst input[data-gr="a6"][data-ch="pxGros"]').click();
  await p.waitForTimeout(200);
  const foc = await p.evaluate(() => { const x = document.activeElement; return x && x.getAttribute ? (x.getAttribute('data-gr') + '/' + x.getAttribute('data-ch')) : String(x && x.tagName); });
  a = await article(p, 6);
  t(a.paGros === 11000, `la case tapée est écrite en touchant la suivante (${a.paGros})`);
  t(foc === 'a6/pxGros', `et le doigt reste dans la case qu'il a touchée (${foc}) — avant : la liste refaite la jetait`);

  // Une sorte de famille : sa ligne à elle, ses cartons à elle.
  l = await lire(p, 'v30_1');
  t(l && l.cases.paGros === '8400' && l.cases.pxGros === '10000' && l.cases.stkC === '4' && /carton de 12/.test(l.carton),
    `« 1 L » : 8 400 / 10 000 le carton de 12, 4 cartons (${l && [l.cases.paGros, l.cases.pxGros, l.cases.stkC].join(' / ')})`);
  await remplir(p, 'v30_1', 'paGros', '9600');
  const v1 = await article(p, 30, 1), fam = await p.evaluate(() => DB.articles.find(x => x.id === 30));
  t(v1.pa === 800 && v1.paGros === 9600 && !(fam.paGros > 0) && !(fam.pa > 0), `la bouteille de 1 L coûte 800 ; la famille n'a rien reçu (${v1.pa})`);

  // Le sac qui ne se vend qu'entier : il est prêt, et il se lit au kilo dessous.
  const etat = await p.evaluate(() => { const e = _grEtat(); grFiltrer('manque'); const ids = Array.from(document.querySelectorAll('#gr-lst input.grin')).map(i => i.getAttribute('data-gr'));
    return { e, manque: ids.includes('a41') }; });
  t(!etat.manque && etat.e.manque === 0, `en gros, le sac qui a son prix n'est pas « ce qui manque » (${etat.e.ok}/${etat.e.tot})`);
  await grille(p); await p.waitForTimeout(200);
  l = await lire(p, 'a41');
  t(l && /le kilo/.test(l.dessous) && /achat 600 le kilo \(15\s000 ÷ 25\)/.test(l.dessous) && /250 kg en tout/.test(l.dessous),
    `au kilo, pas « la pièce » : « ${l && l.dessous} »`);
  t(l && l.cases.stkC === '10' && l.legendes.stkC === 'sacs', `250 kg = 10 sacs (${l && l.cases.stkC} ${l && l.legendes.stkC})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) AU DÉTAIL : L'ACHAT AU CARTON, LA VENTE À LA PIÈCE ─────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('detail'));
  await grille(p); await p.waitForTimeout(300);
  let l = await lire(p, 'a6');
  t(!!l && l.dansLigne.join() === 'paGros,px,stk', `au détail aussi, l'achat se tape au carton ; la vente reste à la pièce (${l && l.dansLigne.join()})`);
  t(l && l.legendes.paGros === 'le carton' && l.legendes.px === 'la pièce' && l.cases.stk === '96' && /pièces ⇄/.test(l.bascule),
    `légendes « le carton » / « la pièce », stock en pièces (${l && l.cases.stk}, « ${l && l.bascule} »)`);
  t(l && /achat 500 la pièce \(12\s000 ÷ 24\)/.test(l.dessous) && l.cases.pxGros === '13000', `dessous : la division, et le carton vendu entier (« ${l && l.dessous} »)`);
  // Le paquet dont il n'a que le coût à la pièce : on MONTRE 35 × 50, on n'écrit rien.
  l = await lire(p, 'a40');
  let a = await article(p, 40);
  t(l && l.cases.paGros === '1750' && l.deduit.paGros && l.legendes.paGros === '35 × 50', `« 35 × 50 » en gris dans la case du paquet (${l && l.cases.paGros})`);
  t(!(a.paGros > 0) && a.pa === 35, 'mais rien n\'est écrit tant qu\'il ne l\'a pas touché (le gros coûte souvent moins cher)');
  await remplir(p, 'a40', 'paGros', '1500');
  a = await article(p, 40);
  t(a.paGros === 1500 && a.pa === 30, `il tape 1 500 le paquet → 30 la pièce (${a.pa})`);
  l = await lire(p, 'a40');
  t(l && !l.deduit.paGros && /achat 30 la pièce \(1\s500 ÷ 50\)/.test(l.dessous), `la case n'est plus grise (« ${l && l.dessous} »)`);
  // Sans carton connu, la ligne ne change pas.
  l = await lire(p, 'a3');
  t(l && l.dansLigne.join() === 'pa,px,stk' && !l.dessous && !l.legendes.pa, `« Savon Azur », sans carton : achat, vente, stock à la pièce, comme avant (${l && l.dansLigne.join()})`);
  // Au détail, le sac sans prix au kilo manque toujours : la tuile vend le kilo.
  t(await p.evaluate(() => _grIncomplet(DB.articles.find(x => x.id === 41), null)), 'au détail, le sac sans prix au kilo reste « à compléter »');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) UNE IMAGE VENUE D'AILLEURS NE SE CHARGE PAS ────────────────────
// La ligne d'une famille posait `p.img` tel quel. Les guillemets sont déjà
// neutralisés par la migration ; restait l'ADRESSE : une photo hébergée
// n'importe où (un autre téléphone, la synchro) se chargeait, et disait à
// ce serveur-là qui ouvre la boutique. `srcSure` n'accepte que notre
// stockage, `data:image` et le site lui-même — comme partout ailleurs.
{
  const d = boutique('gros');
  d.articles.find(x => x.id === 30).img = 'https://pirate.example/traceur.png';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  await p.evaluate(() => { ouvrirGrilleConfig(); grFiltrer('tout'); _grOuverts = {}; renderGrille(); });
  await p.waitForTimeout(300);
  const src = await p.evaluate(() => { const r = Array.from(document.querySelectorAll('#gr-lst .grfam')).find(x => /Huile/.test(x.textContent));
    const i = r && r.querySelector('img'); return i ? i.getAttribute('src') : null; });
  t(src !== null && !/pirate/.test(src), `l'image d'une famille passe par srcSure (src « ${src} »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
