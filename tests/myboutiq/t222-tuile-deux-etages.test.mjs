// t222 — LA TUILE À DEUX ÉTAGES : LE DÉTAIL EN HAUT, LE GROS EN BAS (23.07).
// « Il ne faut pas que de temps en temps le carton soit celui qui est en
// haut… Quand quelqu'un vend, il voit seulement l'image. Il sait dans sa
// tête qu'en bas c'est le gros, en haut c'est les détails. »
// Mesuré sur sa capture (23.06, boutique en gros) : « Sucre » montrait 700
// en haut et le sac en bas ; « Farine », juste à côté, 25 000 en haut — le
// SAC — et le kilo en bas. Toucher la tuile vendait un kilo sur l'une, un
// sac de 50 kg sur l'autre. Et la même tuile changeait encore de sens quand
// le patron passait de « détail » à « gros ».
// La règle, partout et dans les deux façons de vendre : en haut le prix de
// la pièce (le corps de la tuile la vend), en bas la barre du gros (elle
// vend le carton). Les barres d'une rangée tombent à la même hauteur.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t222');
const { s, port } = await serveur();
const b = await chromium.launch();

const A = (id, nm, px, stk, extra) => Object.assign({ id, nm, e: '📦', cat: 'Divers', px, pa: 0, stk0: stk, al: 0, vd: 0, vr: [] }, extra || {});
function boutique(facon) {
  const d = nouvelleBoutique();
  d.cfg.facon = facon; d.cfg.venteDeverrouillee = false;      // la caisse de tous les jours
  d.articles.push(
    A(20, 'Sucre', 700, 200, { um: 'kg', umSac: 50, umCont: 'sac', pxGros: 25000 }),
    A(21, 'Farine', 600, 200, { um: 'kg', umSac: 50, umCont: 'sac', pxGros: 25000 }),
    A(22, 'Bougie', 0, 200, { umSac: 50, umCont: 'carton', pxGros: 4500 }),          // le grossiste n'a donné que le carton
    A(23, 'Lait concentré', 500, 96, { umSac: 48, umCont: 'carton' }),               // carton connu, pas encore son prix
    { id: 30, nm: 'Huile', e: '🫗', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
      vr: [{ id: 1, nm: '1 L', px: 900, pa: 0, stk: 0, stk0: 48, umSac: 12, umCont: 'carton', pxGros: 10000 },
           { id: 2, nm: '2 L', px: 1700, pa: 0, stk: 0, stk0: 24, umSac: 6, umCont: 'carton', pxGros: 9800 }] });
  return d;
}
// Ce qu'une tuile montre, et OÙ.
const lire = (p, id) => p.evaluate(id => {
  const c = document.getElementById('pc-' + id); if (!c) return null;
  const pr = c.querySelector('.ppr-ov'), ba = c.querySelector('.pbas .pbarre, .pbas .pgros');
  const r = x => x && x.getBoundingClientRect(), rc = r(c), rp = r(pr), rb = r(ba);
  return { prix: pr ? pr.innerText.replace(/\s+/g, ' ') : '', vide: !!c.querySelector('.ppr-vide'),
    barre: ba ? ba.innerText.replace(/\s+/g, ' ') : '', barreVide: !!(ba && ba.classList.contains('vide')),
    prixY: rp ? rp.top : -1, barreY: rb ? rb.top : -1, barreBas: rb ? rb.bottom : -1, carteBas: rc.bottom, carteY: rc.top };
}, id);
const q = (p, k) => p.evaluate(k => panier[k] || 0, k);

const vu = {};
for (const facon of ['detail', 'gros']) {
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique(facon));
  const F = facon === 'gros' ? 'en gros' : 'au détail';
  const sv = await lire(p, 6), su = await lire(p, 20), fa = await lire(p, 21), hu = await lire(p, 30);
  vu[facon] = { sv, su, fa, hu };

  // ── 1) EN HAUT LA PIÈCE, EN BAS LE CARTON ──
  t(/^600/.test(sv.prix) && /13\s?000/.test(sv.barre) && sv.barreY > sv.prixY,
    `${F}, savon : 600 en haut, le carton de 13 000 en bas (« ${sv.prix} » · « ${sv.barre} »)`);
  t(/^700/.test(su.prix) && /^600/.test(fa.prix) && /25\s?000/.test(su.barre) && /25\s?000/.test(fa.barre),
    `${F}, sucre et farine : le kilo en haut, le sac en bas, les deux pareils (« ${su.prix} » / « ${fa.prix} »)`);
  t(/dès 900/.test(hu.prix) && /dès 9\s?800/.test(hu.barre), `${F}, la famille : la bouteille en haut, le carton en bas (« ${hu.prix} » · « ${hu.barre} »)`);

  // ── 2) LES BARRES D'UNE RANGÉE À LA MÊME HAUTEUR, AU PIED DE LA TUILE ──
  const rangs = await p.evaluate(() => {
    const parRang = {};
    document.querySelectorAll('#pgrid .pcard, .pgrid .pcard').forEach(c => {
      const ba = c.querySelector('.pbas .pbarre, .pbas .pgros'); if (!ba) return;
      const y = Math.round(c.getBoundingClientRect().top);
      (parRang[y] = parRang[y] || []).push({ bas: ba.getBoundingClientRect().bottom, carte: c.getBoundingClientRect().bottom });
    });
    return Object.values(parRang).filter(r => r.length > 1);
  });
  const ecart = Math.max(0, ...rangs.map(r => Math.max(...r.map(x => x.bas)) - Math.min(...r.map(x => x.bas))));
  const pied = Math.max(0, ...rangs.flat().map(x => x.carte - x.bas));
  t(rangs.length > 0 && ecart <= 1, `${F} : dans une rangée, les barres du gros tombent à la même hauteur (écart ${ecart} px, ${rangs.length} rangées)`);
  t(pied <= 16, `${F} : la barre est au pied de la tuile (${pied} px du bord)`);

  // ── 3) LE CORPS VEND LA PIÈCE, LA BARRE VEND LE CARTON ──
  await p.locator('#pc-6 .pnm-ov').click(); await p.waitForTimeout(200);
  t(await q(p, '6-0') === 1, `${F}, toucher le savon = une pièce (${await q(p, '6-0')})`);
  await p.locator('#pc-6 .pbas > *').first().click(); await p.waitForTimeout(250);
  t(await q(p, '6-0') === 25, `${F}, toucher sa barre = un carton de 24 (${await q(p, '6-0')})`);
  await p.locator('#pc-20 .pnm-ov').click(); await p.waitForTimeout(300);
  const qte = await p.evaluate(() => !!document.querySelector('#ov-qte.show'));
  t(qte && await q(p, '20-0') === 0, `${F}, toucher le sucre demande les kilos, jamais un sac d'office`);
  await p.evaluate(() => document.getElementById('ov-qte').classList.remove('show'));
  await p.locator('#pc-20 .pbas > *').first().click(); await p.waitForTimeout(250);
  t(await q(p, '20-0') === 50, `${F}, la barre du sucre = un sac de 50 kg (${await q(p, '20-0')})`);
  await p.evaluate(() => viderPanier());

  // ── 4) LE CARTON SANS PRIX ──
  const la = await lire(p, 23);
  if (facon === 'detail') t(!la.barre, `au détail, un carton sans prix ne prend pas de place (« ${la.barre} »)`);
  else t(la.barreVide && /prix \?/i.test(la.barre) && /^500/.test(la.prix), `en gros, la barre du carton sans prix le dit (« ${la.barre} »), la pièce reste en haut`);
  t(errs.length === 0, `${F} : aucune erreur JS` + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 5) DÉTAIL OU GROS, LA MÊME TUILE ──
const meme = k => vu.detail[k].prix === vu.gros[k].prix && vu.detail[k].barre === vu.gros[k].barre;
t(meme('sv') && meme('su') && meme('fa') && meme('hu'),
  `passer de « détail » à « gros » ne retourne aucune tuile (savon « ${vu.gros.sv.prix} · ${vu.gros.sv.barre} »)`);

// ── 6) VENDU AU CARTON SEUL : LE CORPS NE VEND RIEN À 0 F, IL MONTRE LE BAS ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('gros'));
  const bo = await lire(p, 22);
  t(bo.vide && /4\s?500/.test(bo.barre), `la bougie : « Prix ? » en haut, le carton en bas (« ${bo.prix} » · « ${bo.barre} »)`);
  await p.evaluate(() => { window.__toasts = []; });
  await p.locator('#pc-22 .pnm-ov').click(); await p.waitForTimeout(250);
  const r = await p.evaluate(() => ({ q: panier['22-0'] || 0, toast: (window.__toasts || []).join(' | '),
    appel: !!document.querySelector('#pc-22 .pbarre.appel') }));
  t(r.q === 0 && /touche la barre du bas/.test(r.toast) && r.appel, `rien à 0 F : le message, et la barre qui clignote (« ${r.toast} »)`);
  await p.locator('#pc-22 .pbas .pbarre').click(); await p.waitForTimeout(250);
  t(await q(p, '22-0') === 50, 'la barre vend le carton de 50');
  // Le vendeur qui touche « Prix ? » : le même rappel, pas la fiche du patron.
  await p.evaluate(() => { role = 'vendeur'; window.__toasts = []; });
  await p.locator('#pc-22 .ppr-vide').click(); await p.waitForTimeout(300);
  const v = await p.evaluate(() => ({ fiche: !!document.querySelector('#ov-completer.show'), toast: (window.__toasts || []).join(' | ') }));
  t(!v.fiche && /barre du bas/.test(v.toast), 'le vendeur qui touche « Prix ? » reçoit le rappel, pas la fiche du patron');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
