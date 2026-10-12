// t220 — LA VITRINE VIT (23.06).
// « Mon site ressemble à un site générique… pas de dynamisme, pas de
// représentations dynamiques, ça ne donne pas envie de rester. »
// La vitrine montre maintenant la caisse vendre, joue ses six scènes, et
// dessine le rapport du soir. Ce banc vérifie qu'elle VIT, mais surtout
// qu'elle reste lisible quand rien ne bouge : sans le petit script (vieux
// navigateur), et quand le téléphone demande moins de mouvement.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
const { t, fin } = compteur('t220');
const { s, port } = await serveur();
const b = await chromium.launch();
async function ouvrir(o = {}) {
  const ctx = await b.newContext({ viewport: { width: o.w || 390, height: 844 }, locale: o.locale || 'fr-FR', serviceWorkers: 'block', reducedMotion: o.moins ? 'reduce' : 'no-preference' });
  if (o.sansIO) await ctx.addInitScript(() => { try { delete window.IntersectionObserver; window.IntersectionObserver = undefined; } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/?site`); await p.waitForTimeout(1500);
  return { ctx, p, errs };
}
const etat = p => p.evaluate(() => {
  const tot = document.querySelector('#vt-toile .vt-total'), on = document.querySelector('#vt-demo .vt-o.on');
  const op = sel => Array.from(document.querySelectorAll(sel)).map(e => +getComputedStyle(e).opacity);
  return { ecran: (document.querySelector('.scr.on') || {}).id, total: tot ? +tot.textContent.replace(/\D/g, '') : -1,
    pris: document.querySelectorAll('#vt-toile .vt-tuile.pris').length, onglet: on ? +on.getAttribute('data-s') : -1,
    scene: +((document.querySelector('#vt-demo .vt-sc.on') || {}).getAttribute ? document.querySelector('#vt-demo .vt-sc.on').getAttribute('data-s') : -1),
    rvVus: document.querySelectorAll('#s-landing .rv.vu').length, rv: document.querySelectorAll('#s-landing .rv').length,
    opRv: op('#s-landing .rv'), anim: document.documentElement.classList.contains('vt-anim') };
});

// ── 1) ELLE VIT ──
{
  const { ctx, p, errs } = await ouvrir();
  let e = await etat(p);
  t(e.ecran === 's-landing', `le site s'ouvre (${e.ecran})`);
  await p.waitForTimeout(2200);
  e = await etat(p);
  t(e.total > 0 && e.pris >= 1, `la caisse du héros vend toute seule : ${e.pris} article(s), total ${e.total}`);
  // Les blocs apparaissent quand on descend, pas avant.
  const avant = e.rvVus;
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 400) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(60); }
  await p.waitForTimeout(900);
  e = await etat(p);
  t(e.anim && avant < e.rv && e.rvVus === e.rv, `au défilement, tous les blocs apparaissent (${avant} → ${e.rvVus}/${e.rv})`);
  // Les scènes : une touche change la scène ; seules, elles avancent.
  await p.evaluate(() => document.getElementById('vt-demo').scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
  await p.locator('#vt-demo .vt-o[data-s="4"]').click(); await p.waitForTimeout(300);
  e = await etat(p);
  const desc = await p.evaluate(() => document.getElementById('vt-sc-desc').textContent);
  t(e.onglet === 4 && e.scene === 4 && /crédit|doit|relance/i.test(desc), `« Le carnet de crédit » touché : sa scène se joue, sa phrase dessous (« ${desc.slice(0, 50)} »)`);
  await p.waitForTimeout(6900);
  e = await etat(p);
  t(e.onglet === 5 && e.scene === 5, `et la suivante vient toute seule (${e.onglet})`);
  // Le rapport du soir se dessine et ses chiffres montent.
  await p.evaluate(() => document.getElementById('vt-rapport').scrollIntoView({ block: 'center' })); await p.waitForTimeout(1600);
  const r = await p.evaluate(() => ({ v: document.querySelector('#vt-rapport [data-vers="86500"]').textContent.replace(/\D/g, ''),
    barre: getComputedStyle(document.querySelector('#vt-rapport .vt-r-barres i')).transform }));
  t(r.v === '86500' && r.barre === 'none', `le rapport : 86 500 atteint, les barres levées (${r.v})`);
  // Les portes marchent toujours.
  await p.evaluate(() => scrollTo(0, 0));
  await p.locator('#vt-b1').click(); await p.waitForTimeout(2500);
  t(await p.evaluate(() => !!(DB && DB.cfg && DB.cfg.demo)), '« Voir une boutique qui tourne » ouvre la boutique d\'exemple');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) SANS LE PETIT SCRIPT D'ANIMATION (vieux navigateur) : tout se lit ──
{
  const { ctx, p, errs } = await ouvrir({ sansIO: true });
  const e = await etat(p);
  t(!e.anim && e.opRv.every(x => x === 1), `sans IntersectionObserver, aucun bloc caché (${e.opRv.filter(x => x < 1).length} invisibles)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) MOINS DE MOUVEMENT : l'état final, tout de suite ──
{
  const { ctx, p, errs } = await ouvrir({ moins: true });
  const e = await etat(p);
  await p.waitForTimeout(1500);
  const e2 = await etat(p);
  t(e.total === 13500 && e.pris === 2 && e2.total === 13500, `le héros montre la vente finie, et ne boucle pas (${e.total} → ${e2.total})`);
  const defile = await p.evaluate(() => getComputedStyle(document.querySelector('#s-landing .vt-defile-in')).animationName);
  t(defile === 'none', `le bandeau ne défile pas (${defile})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 4) EN ANGLAIS : une seule langue à l'écran ──
{
  const { ctx, p, errs } = await ouvrir({ locale: 'en-US', w: 1366 });
  const r = await p.evaluate(() => {
    const vis = sel => Array.from(document.querySelectorAll(sel)).filter(e => e.getClientRects().length).length;
    return { fr: vis('#s-landing .fr'), en: vis('#s-landing .en'), titre: document.getElementById('vt-titre').innerText.replace(/\s+/g, ' ').trim() };
  });
  t(r.fr === 0 && r.en > 20, `aucun texte français visible, ${r.en} en anglais`);
  t(/^Your shop in your pocket/.test(r.titre), `le titre est traduit (« ${r.titre} »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 5) LA VITRINE NE DÉBORDE PAS SUR L'APP ──
// La règle de la 23.03 (`.vt-sous`) avait fui dans l'autre sens. Les tuiles
// de variantes gardent leur style, la vitrine garde le sien.
{
  const { ctx, p, errs } = await ouvrir();
  const r = await p.evaluate(() => {
    const d = document.createElement('div'); d.className = 'vtile'; d.innerHTML = '<span class="vt-sous">carton de 12</span><span class="vt-stk">12</span>';
    document.body.appendChild(d);
    const cs = getComputedStyle(d.querySelector('.vt-sous'));
    const ls = getComputedStyle(document.getElementById('vf-s'));
    return { tuile: cs.whiteSpace, site: ls.whiteSpace };
  });
  t(r.tuile === 'nowrap' && r.site !== 'nowrap', `tuile : ${r.tuile} · sous-titre du site : ${r.site}`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
