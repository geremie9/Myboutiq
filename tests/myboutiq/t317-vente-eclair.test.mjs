// t317 — LA VENTE ÉCLAIR : UNE TOUCHE, OU DEUX AVEC LA MONNAIE (24.00).
// Le patron, le 22/11 : « la vente ultra rapide, c'est mon actif le plus
// redoutable ». Mesuré en base le même jour sur 2 837 ventes : 98,3 % en
// espèces, 68,6 % d'un seul article. Mesuré dans l'app en vrais clics :
// trois touches (la tuile, « Encaisser », « Confirmer la vente »), et sur
// un écran de 360×640 les billets de 2 000, 1 000 et 500 étaient CACHÉS sous
// « Confirmer la vente ».
// Tout se joue ici EN VRAIS CLICS sur l'étagère : on compte les touches, et
// la vente qui sort est relue dans DB, la caisse attendue comprise.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t317');
const { s, port } = await serveur();
const b = await chromium.launch();

const ventes = (p) => p.evaluate(() => DB.ventes.filter(v => !v.annulee).length);
const derniere = (p) => p.evaluate(() => JSON.parse(JSON.stringify(DB.ventes[DB.ventes.length - 1])));
const jauge = (p) => p.evaluate(() => document.getElementById('btn-enc').classList.contains('eclair'));
const billets = (p) => p.evaluate(() => Array.from(document.querySelectorAll('#fbil.show .bil')).map(x => Number(x.dataset.v)));
const ouvert = (p, id) => p.evaluate(id => document.getElementById(id).classList.contains('show'), id);
// Une boutique qui a déjà vendu trois fois : elle connaît le geste entier.
const rodee = async (p) => { for (let i = 0; i < 3; i++) await vendre(p, { lignes: [[2, 1]] }); };

// ── 1) LES TROIS PREMIÈRES VENTES GARDENT LE GESTE ENTIER ─────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await p.locator('#pc-2').click(); await p.waitForTimeout(3600);
  t(await ventes(p) === 0, 'boutique neuve : la tuile touchée ne vend rien toute seule (elle apprend « Encaisser »)');
  t(!(await jauge(p)), 'boutique neuve : le vert ne se remplit pas');
  t(JSON.stringify(await billets(p)) === '[1000,2000,5000]', `les billets sont déjà sur la barre pour 600 F : ${JSON.stringify(await billets(p))}`);
  t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) UNE TOUCHE : LA VENTE SE FERME TOUTE SEULE ─────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await rodee(p);
  const n0 = await ventes(p), stk0 = await stock(p, 2), caisse0 = await p.evaluate(() => caisseAttendue());
  await p.evaluate(() => { window.__toasts = []; });
  await p.locator('#pc-2').click();                                     // ← LA seule touche
  await p.waitForTimeout(600);
  t(await jauge(p), 'la tuile touchée remplit le vert « Encaisser »');
  t(await ventes(p) === n0, 'à 0,6 s rien n\'est encore écrit (le ✕ peut encore tout défaire)');
  await p.waitForTimeout(2900);
  const v = await derniere(p);
  t(await ventes(p) === n0 + 1, `3,5 s après UNE touche, la vente est enregistrée (${n0} → ${await ventes(p)})`);
  t(v.paiement && v.paiement.mode === 'especes', `en espèces : ${v.paiement && v.paiement.mode}`);
  t(v.total === 600 && v.lignes.length === 1 && v.lignes[0].pid === 2 && (v.lignes[0].qty || v.lignes[0].qte) === 1, `une ligne Riz à 600 F (total ${v.total})`);
  t(await stock(p, 2) === stk0 - 1, `le stock du riz baisse de 1 (${stk0} → ${await stock(p, 2)})`);
  t(await p.evaluate(() => caisseAttendue()) - caisse0 === 600, 'la caisse attendue (clôture du soir) prend les 600 F');
  t(!(await ouvert(p, 'succ')), 'au compte juste, l\'écran vert ne bloque pas la vente suivante');
  t(await ouvert(p, 'annul-chip'), '« Annuler la vente » reste en bas de l\'écran');
  t((await p.evaluate(() => window.__toasts.join(' '))).match(/600.*vendu/), 'il voit « ✅ 600 FCFA — vendu »');
  t(await p.evaluate(() => document.getElementById('fcart').classList.contains('hide')), 'la barre du panier est repartie');
  // Le « Annuler » de la 23.85 défait la vente éclair comme les autres.
  await p.locator('#annul-chip').click(); await p.waitForTimeout(300);
  t(await ventes(p) === n0 && await stock(p, 2) === stk0, 'Annuler : la vente est annulée et le riz revient en stock');
  t(await p.evaluate(() => panier['2-0'] === 1 || panier[2] === 1 || Object.values(panier).reduce((a, b) => a + b, 0) === 1), 'le panier revient tel quel, prêt à corriger');
  t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) UNE AUTRE TUILE PENDANT LA JAUGE : ELLE S'AJOUTE, LE VERT REPART ─
{
  const { ctx, p } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await rodee(p);
  const n0 = await ventes(p);
  await p.locator('#pc-2').click(); await p.waitForTimeout(2000);
  await p.locator('#pc-3').click(); await p.waitForTimeout(2000);       // 4 s après la première touche
  t(await ventes(p) === n0, 'la deuxième tuile relance le vert : 4 s après la première, rien n\'est fermé');
  await p.waitForTimeout(1500);
  const v = await derniere(p);
  t(await ventes(p) === n0 + 1 && v.lignes.length === 2 && v.total === 1250, `deux touches, UNE vente de deux lignes à 1 250 F (${v.lignes.length} lignes, ${v.total})`);
  await ctx.close();
}

// ── 4) LE BILLET SUR LA BARRE : DEUX TOUCHES, LA MONNAIE DITE ─────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await rodee(p);
  const n0 = await ventes(p), caisse0 = await p.evaluate(() => caisseAttendue());
  await p.locator('#pc-3').click();                                     // 1re touche : le savon, 650 F
  t(JSON.stringify(await billets(p)) === '[1000,2000,5000]', 'pour 650 F, la barre montre 1 000 · 2 000 · 5 000');
  await p.locator('#fbil .bil[data-v="1000"]').click();                 // 2e touche : le billet tendu
  await p.waitForTimeout(300);
  const v = await derniere(p);
  t(await ventes(p) === n0 + 1 && v.total === 650 && v.paiement.mode === 'especes', `le billet ferme la vente : 650 F en espèces`);
  const det = await p.evaluate(() => document.getElementById('succ-det').textContent.replace(/\s+/g, ' '));
  t(await ouvert(p, 'succ') && /rends ?350/.test(det.replace(/[  ]/g, '')), `l'écran dit ce qu'il rend : « ${det.trim()} »`);
  t(await p.evaluate(() => caisseAttendue()) - caisse0 === 650, 'la caisse attendue prend 650 F, pas le billet de 1 000');
  await p.locator('#succ-amt').click(); await p.waitForTimeout(200);
  t(!(await ouvert(p, 'succ')), 'une touche n\'importe où sur l\'écran vert le ferme (le client suivant attend)');
  t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 5) TOUCHER LA BARRE, LE ✕, LA VOIX : RIEN NE SE FERME TOUT SEUL ──
{
  const { ctx, p } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await rodee(p);
  const n0 = await ventes(p);
  await p.locator('#pc-2').click(); await p.waitForTimeout(400);
  await p.locator('#ctot').click(); await p.waitForTimeout(3400);
  t(await ventes(p) === n0 && await ouvert(p, 'ov-pan'), 'toucher le total arrête le vert : le panier s\'ouvre, rien n\'est vendu');
  await p.evaluate(() => { closeSheet('ov-pan'); viderPanier(); });
  await p.locator('#pc-2').click(); await p.waitForTimeout(400);
  await p.locator('#btn-enc').click(); await p.waitForTimeout(3400);
  t(await ventes(p) === n0 && await ouvert(p, 'ov-calc'), 'toucher « Encaisser » ouvre la feuille et attend « Confirmer » (crédit, mobile money, remise)');
  await p.evaluate(() => { closeSheet('ov-calc'); viderPanier(); });
  await p.locator('#pc-2').click(); await p.waitForTimeout(400);
  await p.locator('#qb-2').click(); await p.waitForTimeout(3400);
  t(await ventes(p) === n0, 'le ✕ de la tuile avant la fin du vert : aucune vente, aucune trace');
  // La voix remplit le panier sans toucher l'étagère : elle relit la commande, elle n'arme rien.
  await p.evaluate(() => addPanier(DB.articles.find(a => a.id === 2), 0)); await p.waitForTimeout(3400);
  t(await ventes(p) === n0 && !(await jauge(p)), 'un panier rempli sans toucher l\'étagère (la voix) attend « Encaisser »');
  await ctx.close();
}

// ── 6) UNE QUESTION RESTE OUVERTE : LA VENTE ATTEND ───────────────────
{
  const { ctx, p } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await rodee(p);
  const n0 = await ventes(p);
  await p.locator('#pc-1').click(); await p.waitForTimeout(3500);       // la bière : des emballages à compter
  t(await ventes(p) === n0 && !(await jauge(p)) && (await billets(p)).length === 0, 'article consigné : ni vert qui se remplit, ni billets (les emballages se comptent d\'abord)');
  await p.evaluate(() => { viderPanier(); clientVente = DB.clients[0]; });
  await p.locator('#pc-2').click(); await p.waitForTimeout(3500);
  t(await ventes(p) === n0 && (await billets(p)).length === 0, 'un client choisi (un crédit se prépare) : la vente attend');
  await p.evaluate(() => { viderPanier(); clientVente = null; DB.cfg.eclair = false; });
  await p.locator('#pc-2').click(); await p.waitForTimeout(3500);
  t(await ventes(p) === n0 && (await billets(p)).length === 0, 'vente éclair coupée dans Réglages : comme avant, rien ne part seul');
  await ctx.close();
}

// ── 7) LA BOUTIQUE DU MOBILE MONEY : LA VENTE ATTEND ──────────────────
{
  const { ctx, p } = await ouvrirCaisse(b, port, nouvelleBoutique());
  for (let i = 0; i < 3; i++) await vendre(p, { lignes: [[2, 1]], mode: i ? 'orange' : 'especes' });
  const n0 = await ventes(p);
  await p.locator('#pc-2').click(); await p.waitForTimeout(3500);
  t(await ventes(p) === n0 && !(await jauge(p)), 'deux ventes sur trois en mobile money : la vente ne se ferme pas en espèces toute seule');
  await ctx.close();
}

// ── 8) LA FEUILLE SUR UN PETIT TÉLÉPHONE (360×640) ────────────────────
{
  const { ctx, p } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await p.setViewportSize({ width: 360, height: 640 });
  await p.locator('#pc-2').click(); await p.waitForTimeout(300);
  await p.locator('#btn-enc').click(); await p.waitForTimeout(600);
  const caches = await p.evaluate(() => {
    const c = document.getElementById('btn-conf-vente').getBoundingClientRect();
    return Array.from(document.querySelectorAll('#calc-shcts .bil')).filter(e => e.getBoundingClientRect().bottom > c.top - 2).map(e => e.textContent.trim());
  });
  t(caches.length === 0, 'tous les billets (et « Le compte juste ») sont au-dessus de « Confirmer la vente »' + (caches.length ? ' — cachés : ' + caches.join(', ') : ''));
  await p.locator('#calc-shcts .bil[data-v="1000"]').click(); await p.waitForTimeout(300);
  const lu = await p.evaluate(() => {
    const c = document.getElementById('btn-conf-vente').getBoundingClientRect(), r = document.getElementById('calc-res').getBoundingClientRect();
    return { ok: r.bottom <= c.top + 2, m: document.getElementById('calc-res-amt').textContent };
  });
  t(lu.ok, `la monnaie à rendre (${lu.m}) se lit au-dessus du bouton`);
  t(await p.evaluate(() => { const a = document.getElementById('btn-autre-pmt').getBoundingClientRect(), r = document.getElementById('calc-tot').getBoundingClientRect(); return a.top > r.top; }), '« Autre paiement » vient après le total, plus avant');
  await ctx.close();
}

await b.close(); s.close();
fin();
