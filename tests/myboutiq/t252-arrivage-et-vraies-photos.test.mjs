// t252 — Deux remarques d'un commerçant, au téléphone (23.35) :
//   « Le mouvement de stock, prix d'achat, prix de vente… très très très
//     complexe. » Mesuré à 360 px : la feuille faisait 1 286 px pour 681
//     visibles, s'ouvrait sur la grille « Quel article ? » même quand il
//     venait de toucher l'article, et la quantité passait sous le bouton.
//   « Les photos que MyBoutiQ propose, ce sont les emojis. » Les 600 images
//     du catalogue sont des emojis dessinés sur une carte : 126 articles dans
//     15 boutiques les portaient comme « leur photo ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, stock } from './caisse.mjs';
const { t, fin } = compteur('t252');
const { s, port } = await serveur();
const b = await chromium.launch();
const STO = 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/APP/';
const CARTE = STO + 'catalogue/riz-sac.jpg';
const SIENNE = STO + 'products/MARI0001-1700000000000-ab12.jpg';

const feuille = p => p.evaluate(() => {
  const vu = id => { const e = document.getElementById(id); return !!e && !!e.offsetParent && e.getBoundingClientRect().height > 0; };
  const sh = document.querySelector('#ov-stk .bsht'), q = document.getElementById(_stkQMode === 'c' ? 'inp-scont' : 'inp-sqte');
  const bt = document.getElementById('btn-save-stk').getBoundingClientRect(), qr = q.getBoundingClientRect();
  return {
    tit: document.getElementById('ov-stk-t').textContent, grille: vu('agstk'), form: vu('stk-form'),
    focus: document.activeElement && document.activeElement.id, qId: q.id,
    tient: sh.scrollHeight <= sh.clientHeight + 1, qLibre: qr.bottom <= bt.top && qr.top >= 0,
    caches: ['stk-sens-row', 'stk-umnom-row', 'stk-consigne-row', 'stk-fourn-row'].filter(vu),
    pa: document.getElementById('inp-spa').value, paMode: _stkPaMode, bouton: document.getElementById('lbl-enreg-stk').textContent,
    lblPa: document.getElementById('lbl-stk-pa').textContent
  };
});

// ── A. L'arrivage ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
  let dialogues = 0; p.on('dialog', d => { dialogues++; d.dismiss(); });
  await p.evaluate(() => { window.__prompts = 0; const pr = window.prompt; window.prompt = function () { window.__prompts++; return pr.apply(this, arguments); }; });

  // 1. Depuis un article : pas de grille, la quantité attend, le prix est là.
  await p.evaluate(() => ouvrirStk(DB.articles.find(a => a.id === 1))); await p.waitForTimeout(600);
  let f = await feuille(p);
  t(!f.grille && f.form && f.tit === 'Ajouter au stock', `ouverte depuis l'article : pas de grille « Quel article ? » (« ${f.tit} »)`);
  t(f.focus === 'inp-sqte' && f.qLibre, `le curseur attend dans la quantité (${f.focus}), au-dessus du bouton, pas dessous`);
  t(f.tient, 'toute la feuille tient dans l\'écran de 360 × 740, sans défiler');
  t(f.caches.length === 0, `consigne, fournisseur, unité de compte, reçu/perdu : repliés (${f.caches.join(',') || 'aucun visible'})`);
  t(f.pa === '520' && /À combien tu l.as acheté/.test(f.lblPa), `« ${f.lblPa} » : déjà rempli avec son dernier prix (${f.pa})`);
  const s1 = await stock(p, 1);
  await p.keyboard.type('12'); await p.waitForTimeout(200);
  f = await feuille(p);
  t(/^Ajouter 12 .* au stock$/.test(f.bouton), `le bouton répète ce qu'il a compris : « ${f.bouton} »`);
  await p.locator('#btn-save-stk').tap(); await p.waitForTimeout(500);
  const r1 = await p.evaluate(() => ({ ouverte: document.getElementById('ov-stk').classList.contains('show'), pa: DB.articles.find(a => a.id === 1).pa }));
  t((await stock(p, 1)) === s1 + 12 && !r1.ouverte && r1.pa === 520, `deux gestes : +12 en stock (${s1} → ${await stock(p, 1)}), prix gardé, la feuille se ferme`);

  // 2. L'article au carton : il compte en cartons, il paie au carton.
  const j0 = await p.evaluate(() => DB.journal.length);
  await p.evaluate(() => ouvrirStk(DB.articles.find(a => a.id === 6))); await p.waitForTimeout(600);
  f = await feuille(p);
  t(f.qId === 'inp-scont' && f.focus === 'inp-scont' && f.paMode === 'c' && f.pa === '12000', `au carton : « combien de cartons ? » et le prix du carton (${f.pa}), pas celui de la pièce`);
  t(f.tient, 'la feuille du carton tient aussi dans l\'écran');
  const s6 = await stock(p, 6);
  await p.keyboard.type('2'); await p.waitForTimeout(200);
  f = await feuille(p);
  t(f.bouton === 'Ajouter 2 cartons au stock', `« ${f.bouton} »`);
  await p.locator('#btn-save-stk').tap(); await p.waitForTimeout(500);
  const r6 = await p.evaluate(j0 => ({ pa: DB.articles.find(a => a.id === 6).pa, prix: DB.journal.slice(j0).filter(x => x.act === 'prix').length }), j0);
  t((await stock(p, 6)) === s6 + 48 && r6.pa === 500 && r6.prix === 0, `2 cartons = +48 (${s6} → ${await stock(p, 6)}), prix d'achat inchangé (${r6.pa}), rien de faux au journal`);

  // 3. Le reste existe toujours, sous « Plus de choix » : une casse.
  await p.evaluate(() => ouvrirStk(DB.articles.find(a => a.id === 3))); await p.waitForTimeout(500);
  await p.locator('#stk-plus-btn').tap(); await p.waitForTimeout(200);
  f = await feuille(p);
  t(f.caches.includes('stk-sens-row') && f.caches.includes('stk-consigne-row') && f.caches.includes('stk-fourn-row'), `« Plus de choix » : ${f.caches.join(', ')}`);
  await p.locator('#stk-sens-out').tap(); await p.waitForTimeout(200);
  const s3 = await stock(p, 3);
  await p.evaluate(() => { const i = document.getElementById('inp-sqte'); i.value = '2'; i.dispatchEvent(new Event('input', { bubbles: true })); stkMotif('Casse'); });
  f = await feuille(p);
  await p.locator('#btn-save-stk').tap(); await p.waitForTimeout(400);
  t(f.tit === 'Sortie de stock' && f.bouton === 'Enregistrer la sortie' && (await stock(p, 3)) === s3 - 2, `une casse se déclare toujours (« ${f.tit} », ${s3} → ${await stock(p, 3)})`);

  // 4. Une livraison de plusieurs articles : la liste, et on y revient.
  await p.evaluate(() => ouvrirStk(null)); await p.waitForTimeout(400);
  f = await feuille(p).catch(() => null);
  const g = await p.evaluate(() => ({ grille: !!document.getElementById('agstk').offsetParent, n: document.querySelectorAll('#agstk .apcd').length }));
  t(g.grille && g.n === 7, `« Ajouter » sans article : la grille « Quel article ? » (${g.n})`);
  await p.locator('#agstk .apcd').nth(1).tap(); await p.waitForTimeout(500);
  const s2 = await stock(p, 2);
  await p.keyboard.type('5'); await p.locator('#btn-save-stk').tap(); await p.waitForTimeout(500);
  const apres = await p.evaluate(() => ({ ouverte: document.getElementById('ov-stk').classList.contains('show'), grille: !!document.getElementById('agstk').offsetParent }));
  t((await stock(p, 2)) === s2 + 5 && apres.ouverte && apres.grille, 'venu de la liste, il y retourne pour l\'article suivant');
  t(dialogues === 0 && (await p.evaluate(() => window.__prompts)) === 0, 'aucune question surgie pendant ces entrées');
  t(errs.length === 0, 'aucune erreur JS (arrivage)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── C. Plus d'emojis présentés comme des photos ──
{
  const db = nouvelleBoutique();
  db.articles[1].img = CARTE; db.articles[1]._imgCat = true;                       // Riz : une carte emoji
  db.articles[3].img = SIENNE;                                                      // Huile : SA photo
  db.articles[4].vr = [{ id: 51, nm: '400 g', px: 3200, pa: 2800, stk: 0, img: STO + 'catalogue/lait-nido.jpg' },
                     { id: 52, nm: '900 g', px: 6500, pa: 5800, stk: 0, img: SIENNE }];
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
  const a5ok = d => !d.vr && d.vr2 === SIENNE;
  const d = await p.evaluate(() => {
    const a = id => DB.articles.find(x => x.id === id);
    const tuile = document.querySelector('#pc-2');
    const un = migrateDBData(JSON.parse(JSON.stringify(DB))), avant = JSON.stringify(un.articles), deux = JSON.stringify(migrateDBData(JSON.parse(JSON.stringify(un))).articles);
    return { riz: a(2).img || '', cat: !!a(2)._imgCat, huile: a(4).img, vr: (a(5).vr[0] || {}).img || '', vr2: (a(5).vr[1] || {}).img || '', dessin: !!(tuile && tuile.querySelector('svg')), imgTuile: !!(tuile && tuile.querySelector('img[src*="/APP/catalogue/"]')), idem: avant === deux };
  });
  t(!d.riz && !d.cat && !d.imgTuile && d.dessin, 'la carte emoji quitte « Riz » : la tuile reprend le dessin au trait de la caisse');
  t(d.huile === SIENNE, 'la photo prise par le commerçant ne bouge pas');
  t(a5ok(d), 'une variante portant une carte emoji la perd ; sa voisine garde la vraie photo');
  t(d.idem, 'le nettoyage est idempotent (deux passages, même résultat)');

  // Le catalogue n'offre plus de carte emoji ; seulement une vraie photo certifiée.
  const c = await p.evaluate(async (sto) => {
    try { await chargerCatalogue600(); } catch (e) {}
    const sans = { riz: photoCatalogue('Riz'), huile: photoCatalogue('Huile') };
    _photoManif = { base: '', ext: '.jpg', slugs: [], _set: {}, _url: {}, _id: {}, _cert: {} };
    ['Riz', 'Savon Azur', 'Lait Nido', 'Piment'].forEach(n => { _photoManif._cert[_slugsPourNom(n)[0]] = sto + 'partagees/' + _slugsPourNom(n)[0] + '.jpg'; });
    // Une offerte, jamais vérifiée : pas proposée non plus.
    _photoManif._set['bougie'] = 1; _photoManif._url['bougie'] = sto + 'partagees/bougie-x.jpg';
    return { cat600: !!(_cat600 && _cat600.entrees), sans, avec: photoCatalogue('Riz'), bougie: photoCatalogue('Bougie') };
  }, STO);
  t(c.cat600 && !c.sans.riz && !c.sans.huile, `catalogue chargé, et aucune carte emoji proposée (« ${c.sans.riz} »)`);
  t(/\/APP\/partagees\//.test(c.avec) && !c.bougie, 'une photo certifiée est proposée ; une photo offerte non vérifiée ne l\'est pas');

  // Le bandeau dit « une vraie photo », même s'il avait dit non aux cartes d'avant.
  const ban = await p.evaluate(() => {
    try { localStorage.setItem('myboutiq_photos_proposees', '1'); } catch (e) {}
    const bb = document.getElementById('annonce-banner'); bb.style.display = 'none';
    proposerRafraichirPhotos();
    return { vu: bb.style.display === 'flex', tit: document.getElementById('annonce-titre').textContent, n: _articlesARafraichir().map(x => x.p.nm).join(',') };
  });
  t(ban.vu && /4 de tes articles peuvent avoir une vraie photo/.test(ban.tit), `le bandeau : « ${ban.tit} » (${ban.n})`);
  t(!/Huile/.test(ban.n), 'sa photo à lui n\'est jamais proposée au remplacement');

  // « Chercher dans le catalogue » : le dessin, plus de carte emoji par-dessus.
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); DB.cfg.facon = 'detail'; ouvrirAjouter(); }); await p.waitForTimeout(800);
  const g = await p.evaluate(() => ({ cartes: document.querySelectorAll('#cha-grid img[src*="/APP/catalogue/"]').length, dessins: document.querySelectorAll('#cha-grid .cha-m svg').length }));
  t(g.cartes === 0 && g.dessins > 10, `le catalogue montre ${g.dessins} dessins et ${g.cartes} carte emoji`);
  t(errs.length === 0, 'aucune erreur JS (photos)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
