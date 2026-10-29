// t253 — « Une allumette vient en carton, et dans le carton il y a les
// paquets. Quand j'essaye de conditionner certains articles, j'ai des
// difficultés. » (23.36)
// Mesuré en base le 29/10 : 832 articles, 1 seul avec un niveau paquet,
// 0 avec un prix de paquet. Les trois étages se réglaient sur trois écrans,
// et « carton de 50 » ne disait jamais cinquante quoi.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, stock } from './caisse.mjs';
const { t, fin } = compteur('t253');
const { s, port } = await serveur();
const b = await chromium.launch();
const tape = async (p, sel, txt) => { await p.locator(sel).fill(''); await p.locator(sel).pressSequentially(String(txt)); };

// ── 1. Allumettes : boîte · paquet de 10 · carton de 50 paquets, sur UNE feuille ──
{
  const db = nouvelleBoutique();
  db.articles.push({ id: 8, nm: 'Allumettes', e: '📦', cat: 'Divers', px: 25, pa: 0, stk0: 2000, al: 0, vd: 0, vr: [] });
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
  // Le menu de l'appui long dit ce qu'il fait.
  await p.evaluate(() => corrigerConditionnement(8)); await p.waitForTimeout(400);
  const f0 = await p.evaluate(() => ({
    vue: document.getElementById('ov-cond') && document.getElementById('ov-cond').classList.contains('show'),
    tit: (document.getElementById('cond-tit') || {}).textContent,
    unite: (document.getElementById('cond-u') || {}).value, mot1: (document.getElementById('cond-m-1') || {}).value,
    n1: (document.getElementById('cond-nb-1') || {}).value, q: (document.getElementById('cond-q') || {}).textContent
  }));
  t(f0.vue && f0.tit === 'Comment tu le vends ?', `l'appui long ouvre « ${f0.tit} »`);
  t(f0.unite === 'boîte' && f0.mot1 === 'paquet' && f0.n1 === '10' && /d'habitude/.test(f0.q), `déjà proposé : à la boîte, un paquet = 10 boîtes (${f0.q})`);
  await p.locator('#cond-plus').tap(); await p.waitForTimeout(200);
  const m2 = await p.evaluate(() => (document.getElementById('cond-m-2') || {}).value);
  await p.keyboard.type('50'); await p.waitForTimeout(150);
  await tape(p, '#cond-px-1', '220'); await tape(p, '#cond-px-2', '10500'); await tape(p, '#cond-ach-i', '9000');
  await p.waitForTimeout(150);
  const f1 = await p.evaluate(() => ({ eq: document.getElementById('cond-eq-2').textContent, res: document.getElementById('cond-res').textContent,
    sh: (() => { const x = document.querySelector('#ov-cond .bsht'); return x.scrollHeight <= x.clientHeight + 260; })() }));
  t(m2 === 'carton' && /= 500 boîtes/.test(f1.eq), `« + un étage » propose le carton ; « ${f1.eq} » se calcule sous ses yeux`);
  t(/soit \D*18 la boîte/.test(f1.res) && /tu gagnes/.test(f1.res) && /le paquet/.test(f1.res) && /le carton/.test(f1.res), `ce qu'il gagne à chaque étage : « ${f1.res} »`);
  await p.locator('#cond-ok').tap(); await p.waitForTimeout(400);
  const a = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 8); return { umNom: a.umNom, umSac: a.umSac, umCont: a.umCont, umPar: a.umPar, umParMot: a.umParMot, umParTaille: a.umParTaille, pxPar: a.pxPar, pxGros: a.pxGros, pa: a.pa, paGros: a.paGros, px: a.px, lib: _libelleCond(a, null), j: DB.journal.filter(x => x.act === 'conditionnement').length, ouv: document.getElementById('ov-cond').classList.contains('show') }; });
  t(!a.ouv && a.umNom === 'boîte' && a.umSac === 500 && a.umCont === 'carton' && a.umPar === 50 && a.umParMot === 'paquet' && a.umParTaille === 10,
    `écrit avec les champs que la caisse lit déjà : ${a.lib}`);
  t(a.pxPar === 220 && a.pxGros === 10500 && a.pa === 18 && a.paGros === 9000 && a.px === 25 && a.j === 1, `prix : boîte 25, paquet ${a.pxPar}, carton ${a.pxGros} ; achat ${a.pa}/boîte (${a.paGros} le carton), au journal`);

  // La caisse vend les trois étages, chacun à son prix.
  await p.evaluate(() => { choisirEtageGros(null, 8); });
  await p.waitForTimeout(250);
  const et = await p.evaluate(() => [...document.querySelectorAll('#etg-lst .stitl')].map(x => x.textContent));
  const mots = await p.evaluate(() => ({ sous: [...document.querySelectorAll('#etg-lst .stisub')].map(x => x.textContent).join(' | '), art: document.getElementById('etg-art').textContent, tuile: _libPiece(DB.articles.find(a => a.id === 8)) }));
  t(/500 boîtes/.test(mots.sous) && /10 boîtes/.test(mots.sous) && /25 la boîte/.test(mots.art) && mots.tuile === 'la boîte', `les mots suivent : « ${mots.art} » · ${mots.sous} · tuile « ${mots.tuile} »`);
  await p.evaluate(() => { etgVendre(10, 'paquet'); }); await p.waitForTimeout(250);
  const tot1 = await p.evaluate(() => calcTotal());
  await p.evaluate(() => { choisirEtageGros(null, 8); etgVendre(500, 'carton'); }); await p.waitForTimeout(250);
  const tot2 = await p.evaluate(() => calcTotal());
  t(et.join(',') === '1 carton,1 paquet' && tot1 === 220 && tot2 === 10720, `à la caisse : ${et.join(' / ')} → un paquet ${tot1}, puis un carton : ${tot2}`);
  await p.evaluate(() => { try { viderPanier(); } catch (e) {} });

  // L'arrivage compte en cartons, au prix du carton.
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); ouvrirStk(DB.articles.find(a => a.id === 8)); }); await p.waitForTimeout(500);
  const st = await p.evaluate(() => ({ lbl: document.getElementById('lbl-qte-recu').textContent, pa: document.getElementById('inp-spa').value }));
  const s0 = await stock(p, 8);
  await p.keyboard.type('2'); await p.locator('#btn-save-stk').tap(); await p.waitForTimeout(400);
  t(/Combien de cartons/.test(st.lbl) && st.pa === '9000' && (await stock(p, 8)) === s0 + 1000, `arrivage : « ${st.lbl} », 9 000 le carton, 2 cartons = +1 000 boîtes`);

  // Retirer les étages : il redevient un article au détail, rien ne traîne.
  await p.evaluate(() => corrigerConditionnement(8)); await p.waitForTimeout(300);
  await p.locator('#cond-niv .cond-x').nth(1).tap(); await p.waitForTimeout(100);
  await p.locator('#cond-niv .cond-x').nth(0).tap(); await p.waitForTimeout(100);
  await p.locator('#cond-ok').tap(); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 8); return [a.umSac, a.umPar, a.pxPar, a.pxGros, a.paGros].map(x => x == null ? 'ø' : x).join(','); });
  t(r === 'ø,ø,ø,ø,ø', `retirer les étages efface aussi leurs prix (${r})`);
  // Un étage sans son nombre : on le demande, on n'invente rien.
  await p.evaluate(() => corrigerConditionnement(8)); await p.waitForTimeout(300);
  await p.locator('#cond-plus').tap(); await p.locator('#cond-ok').tap(); await p.waitForTimeout(300);
  const dem = await p.evaluate(() => ({ ouv: document.getElementById('ov-cond').classList.contains('show'), toast: window.__toasts.slice(-1)[0], sac: DB.articles.find(x => x.id === 8).umSac }));
  t(dem.ouv && /Combien de boîtes dans un paquet/.test(dem.toast) && dem.sac == null, `un étage sans nombre : « ${dem.toast} »`);
  // Depuis la fiche article : le prix à l'unité et l'achat restent dans la fiche (elle les réécrirait).
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); ouvrirCompleterArticle(DB.articles.find(a => a.id === 8)); }); await p.waitForTimeout(400);
  await p.evaluate(() => cmpChangerMesure()); await p.waitForTimeout(300);
  const fi = await p.evaluate(() => ({ vue: document.getElementById('ov-cond').classList.contains('show'), px: !!document.getElementById('cond-px-0'), ach: !!document.getElementById('cond-ach-i') }));
  t(fi.vue && !fi.px && !fi.ach, 'depuis la fiche : la même feuille, sans le prix à l\'unité ni l\'achat (la fiche les garde)');
  t(errs.length === 0, 'aucune erreur JS (allumettes)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2. Au kilo, et depuis « Tout configurer » ──
{
  const db = nouvelleBoutique();
  db.articles.push({ id: 9, nm: 'Riz parfumé', e: '📦', cat: 'Alimentation', px: 700, pa: 600, um: 'kg', stk0: 100, al: 0, vd: 0, vr: [] });
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
  await p.evaluate(() => ouvrirGrilleConfig()); await p.waitForTimeout(500);
  const lien = p.locator('.grl[data-cle="a9"] .grcond');
  t((await lien.count()) === 1, '« Tout configurer » : chaque article a son « + paquet, carton… »');
  await lien.tap(); await p.waitForTimeout(300);
  const k = await p.evaluate(() => ({ l1: document.querySelector('#cond-niv .cond-l1').textContent.trim(), u: !!document.getElementById('cond-u') }));
  await p.locator('#cond-plus').tap(); await p.keyboard.type('50'); await tape(p, '#cond-px-1', '33000');
  await p.locator('#cond-ok').tap(); await p.waitForTimeout(400);
  const g = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 9); return { sac: a.umSac, cont: a.umCont, pxg: a.pxGros, nom: a.umNom || null, lig: (document.querySelector('.grl[data-cle="a9"] .grcond') || {}).textContent || '' }; });
  t(/Au kilo/.test(k.l1) && !k.u && g.sac === 50 && g.cont === 'sac' && g.pxg === 33000 && g.nom === null, `au kilo : « ${k.l1} », un sac = 50 kg à 33 000`);
  t(/sac de 50/.test(g.lig), `la ligne de la grille se redessine : « ${g.lig} »`);
  t(errs.length === 0, 'aucune erreur JS (kilo, grille)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3. L'écran express d'un grossiste : le crayon ouvre la même feuille ──
{
  const db = nouvelleBoutique(); db.cfg.facon = 'gros';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
  await p.locator('#fab-add').tap(); await p.waitForTimeout(900);
  await p.locator('#cha-src').fill('allumette'); await p.locator('#cha-src').dispatchEvent('input'); await p.waitForTimeout(400);
  await p.locator('#cha-grid > div[onclick]').first().tap(); await p.waitForTimeout(400);
  await p.getByText(/Continuer avec 1 article/).tap(); await p.waitForTimeout(700);
  await p.locator('.expg-t').first().tap(); await p.waitForTimeout(300);
  const e0 = await p.evaluate(() => ({ vue: document.getElementById('ov-cond').classList.contains('show'), n: document.querySelectorAll('#cond-niv .cond-n').length }));
  // Le catalogue dit « carton de 50 » : il précise que ce sont 50 paquets de 10 boîtes.
  await p.evaluate(() => { condUnite('boîte'); });
  await p.locator('#cond-plus').tap(); await p.waitForTimeout(100);
  await p.evaluate(() => { condMot(1, 'paquet'); condMot(2, 'carton'); });
  await tape(p, '#cond-nb-1', '10'); await tape(p, '#cond-nb-2', '50');
  await tape(p, '#cond-px-1', '220'); await tape(p, '#cond-px-2', '10500');
  await p.locator('#cond-ok').tap(); await p.waitForTimeout(400);
  const chip = await p.evaluate(() => (document.querySelector('.expg-t') || {}).textContent || '');
  t(e0.vue && /carton de 50 paquets/.test(chip), `express : le crayon ouvre la feuille (${e0.n} étage), la ligne dit « ${chip} »`);
  // On crée : l'article garde les trois étages.
  for (let i = 0; i < 3; i++) { const b2 = p.locator('#exp-valider'); if (await b2.isVisible()) { await b2.tap(); await p.waitForTimeout(600); } }
  const c = await p.evaluate(() => { const a = DB.articles.find(x => /allumet/i.test(x.nm)); return a ? { lib: _libelleCond(a, null), nom: a.umNom, pxPar: a.pxPar, pxGros: a.pxGros, px: a.px } : null; });
  t(c && c.nom === 'boîte' && c.pxPar === 220 && c.pxGros === 10500 && /carton de 50 paquets \(500 boîtes\)/.test(c.lib), `créé avec ses étages : ${c && c.lib}`);
  t(errs.length === 0, 'aucune erreur JS (express)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
