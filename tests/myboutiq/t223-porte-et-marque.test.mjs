// t223 — LA PORTE ET LA MARQUE (23.08).
// « La maquette est moche. » Ses trois captures : l'écran de démarrage
// Android (l'icône dans un carré d'un autre violet que le fond), l'icône
// sur l'écran d'accueil, la porte du PIN. Mesuré sur la 23.07 :
// - la chose la plus claire de la porte était « ✅ Ancien utilisateur »,
//   un choix qu'un patron connu du téléphone a fait le jour de son
//   inscription, reposé à chaque ouverture ;
// - le ✓ du clavier était vert pomme, alors que tout ce qui agit dans
//   l'app est ambre ;
// - « PIN oublié ? » et « Autre numéro ? Changer de compte » ne tenaient
//   pas sur une ligne : trois liens soulignés empilés en bas ;
// - le fond de l'icône (dégradé) n'était pas le fond du démarrage (#241257) :
//   d'où le carré visible au milieu de l'écran.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { nouvelleBoutique } from './caisse.mjs';
import fs from 'fs';
const { t, fin } = compteur('t223');
const { s, port } = await serveur();
const b = await chromium.launch();
const ENTREE = { role: 'patron', tel: '+237689335389', code: 'MARI0001', nom: 'G', boutiques: [{ code: 'MARI0001', nm: 'G' }] };

async function porte(vw, vh, entree) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'fr-FR', hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/politique-confidentialite.html`);
  await p.evaluate(([db, en]) => { localStorage.clear(); localStorage.setItem('mb_clavier_vu', '1');
    if (en) { localStorage.setItem('myboutiq_v6', JSON.stringify(db)); localStorage.setItem('myboutiq_entree', JSON.stringify(en)); } }, [nouvelleBoutique(), entree]);
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(1500);
  if (!entree) { await p.evaluate(() => goScreen('s-login')); await p.waitForTimeout(300); }
  return { ctx, p, errs };
}
const vu = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);

// ── 1) LE PATRON QUE LE TÉLÉPHONE CONNAÎT ─────────────────────────────
for (const [vw, vh] of [[360, 640], [360, 740], [390, 844]]) {
  const { ctx, p, errs } = await porte(vw, vh, ENTREE);
  const m = await p.evaluate(() => {
    const ok = document.getElementById('kp-ok').getBoundingClientRect(), bj = document.getElementById('er-bonjour');
    const liens = ['er-oubli', 'er-chg'].map(id => document.getElementById(id).getBoundingClientRect());
    const touches = Array.from(document.querySelectorAll('#er-clavier .kp')).map(k => k.getBoundingClientRect());
    return { okBas: ok.bottom, okFond: getComputedStyle(document.getElementById('kp-ok')).backgroundColor,
      bj: bj.textContent, num: (bj.querySelector('.er-num') || {}).textContent || '', centre: getComputedStyle(bj).textAlign,
      lignes: Math.abs(liens[0].top - liens[1].top), large: document.documentElement.scrollWidth,
      petite: Math.min(...touches.map(r => Math.min(r.width, r.height))) };
  });
  const T = `${vw}×${vh}`;
  if (vw === 390) {
    t(!(await vu(p, '#btn-old-user')) && !(await vu(p, '#btn-new-user')), `${T} : le choix « Se connecter / Créer ma boutique » est rangé pour celui qu'on connaît`);
    t(await vu(p, '#lg-autre'), `${T} : « Créer une autre boutique » reste à une tape, en bas`);
    t(m.num === '689 33 53 89' && /^Bonjour 👋/.test(m.bj) && m.centre === 'center', `${T} : son bonjour au centre, le numéro retenu dans sa pastille (« ${m.num} »)`);
    t(m.okFond === 'rgb(255, 176, 32)', `${T} : le ✓ a la couleur de ce qui agit dans l'app (${m.okFond})`);
  }
  t(m.okBas <= vh, `${T} : le ✓ est dans l'écran (${Math.round(m.okBas)} / ${vh})`);
  t(m.petite >= 44, `${T} : aucune touche sous 44 px (${Math.round(m.petite)})`);
  t(m.lignes < 2 && m.large <= vw, `${T} : « PIN oublié ? · Autre numéro ? » sur une ligne, rien ne dépasse (${m.large} px)`);
  if (vw === 360 && vh === 740) {
    // Le PIN se tape toujours, et « Créer une autre boutique » ouvre bien l'inscription.
    for (const k of ['1', '2', '3']) await p.locator(`#er-clavier .kp[data-k="${k}"]`).click();
    t(await p.evaluate(() => document.getElementById('er-pin').value) === '123', 'les touches écrivent le PIN');
    await p.evaluate(() => { document.getElementById('er-pin').value = ''; });
    // Sur un code qui n'a pas ce lien, on le constate (❌) au lieu d'attendre trente secondes.
    if (await vu(p, '#lg-autre')) { await p.locator('#lg-autre').click(); await p.waitForTimeout(200); }
    t(await vu(p, '#btn-start-insc') && !(await vu(p, '#lg-autre')), '« Créer une autre boutique » ouvre l\'inscription, et se range');
    await p.evaluate(() => setModeEntree('old')); await p.waitForTimeout(200);
    t(await vu(p, '#kp-ok'), 'et « Se connecter » ramène au PIN');
  }
  t(errs.length === 0, `${T} : aucune erreur JS` + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) UN TÉLÉPHONE NEUF : LE CHOIX EST LÀ, SANS EMOJI DE FORMULAIRE ──
{
  const { ctx, p, errs } = await porte(390, 844, null);
  const e = await p.evaluate(() => ({ a: document.getElementById('btn-old-user').innerText.trim(), b: document.getElementById('btn-new-user').innerText.trim() }));
  t(e.a === 'Se connecter' && e.b === 'Créer ma boutique' && await vu(p, '#btn-old-user'), `téléphone neuf : « ${e.a} » / « ${e.b} »`);
  t(!(await vu(p, '#lg-autre')), 'et pas de « Créer une autre boutique » en double');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) LES ICÔNES ─────────────────────────────────────────────────────
{
  const ctx = await b.newContext(); const p = await ctx.newPage();
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/politique-confidentialite.html`);
  const px = (f, x, y) => p.evaluate(async ([f, x, y]) => {
    const im = new Image(); im.src = '/' + f + '?' + Math.random(); await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(x, y, 1, 1).data;
    return { w: im.width, h: im.height, rgba: Array.from(d) };
  }, [f, x, y]);
  const man = JSON.parse(fs.readFileSync(new URL('../../manifest.json', import.meta.url)));
  for (const ic of man.icons) {
    const r = await px(ic.src, 0, 0);
    t(ic.sizes === `${r.w}x${r.h}`, `${ic.src} fait bien ${ic.sizes} (${r.w}×${r.h})`);
  }
  // Le démarrage Android pose `icon-512.png` sur #241257 : son fond doit être ce violet-là.
  const bord = await px('icon-512.png', 256, 4), coin = await px('icon-512.png', 0, 0);
  t(bord.rgba.slice(0, 3).join() === '36,18,87' && coin.rgba[3] === 0, `icon-512 : fond #241257 et coins transparents — plus de carré au démarrage (${bord.rgba.join()})`);
  const mk = await px('icon-maskable-512.png', 0, 0);
  t(mk.rgba[3] === 255, 'icon-maskable : plein jusqu\'aux coins (Android le découpe lui-même)');
  const ba = await px('badge-96.png', 0, 0), bc = await px('badge-96.png', 29, 18);
  t(ba.w === 96 && ba.rgba[3] === 0 && bc.rgba[3] > 200 && bc.rgba.slice(0, 3).every(v => v > 240), 'badge-96 : silhouette blanche sur transparent (barre des notifications)');
  await ctx.close();
}
await b.close(); s.close();
fin();
