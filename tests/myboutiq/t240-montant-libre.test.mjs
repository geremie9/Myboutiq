// t240 — « LE BOUTON MONTANT LIBRE N'EST PAS BIEN SORTI » (23.21).
// Mesuré sur la 23.20 : le bouton était un mot de 11 px sans cadre, et la
// feuille qu'il ouvre utilisait des classes qui n'existent nulle part
// (sheet, shd, sht, sclose, sbody) : depuis la 22.73 elle s'ouvrait SANS
// fond, le titre « 💰 Autre montant » et la croix flottant sur la caisse.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t240');
const { s, port } = await serveur();
const b = await chromium.launch();
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
const bt = await p.evaluate(() => { const x = document.getElementById('btn-libre'), r = x.getBoundingClientRect(), cs = getComputedStyle(x);
  return { vu: cs.display !== 'none' && r.width > 0, h: Math.round(r.height), bord: cs.borderTopWidth, txt: x.textContent.trim(), svg: !!x.querySelector('svg') }; });
t(bt.vu && bt.h >= 36 && bt.bord !== '0px' && bt.svg && bt.txt === 'Montant libre', `un vrai bouton : ${bt.h} px de haut, un cadre, son icône (« ${bt.txt} »)`);
await p.locator('#btn-libre').tap(); await p.waitForTimeout(400);
const f = await p.evaluate(() => { const ov = document.getElementById('ov-libre'), sh = ov.querySelector('.bsht'), r = sh ? sh.getBoundingClientRect() : null;
  return { ouvert: ov.classList.contains('show'), fond: sh ? getComputedStyle(sh).backgroundColor : '', bas: r ? Math.round(r.bottom) : 0, h: innerHeight,
    titreDedans: !!(sh && sh.contains(document.getElementById('ml-tit'))), titre: document.getElementById('ml-tit').textContent, txt: ov.innerText }; });
t(f.ouvert && /rgb\(255, 255, 255\)/.test(f.fond) && f.titreDedans, `la feuille a son fond blanc, et le titre est dedans (${f.fond})`);
t(Math.abs(f.bas - f.h) <= 2, `elle monte du bas de l'écran, comme les autres (${f.bas} / ${f.h})`);
t(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(f.txt.replace(/[✕✓]/g, '')) && f.titre === 'Autre montant', `sans emoji (« ${f.titre} »)`);
await p.screenshot({ path: '/tmp/claude-0/-home-user-Myboutiq/45e65699-4ae2-5a4d-8635-1ddca2cb6b4b/scratchpad/libre-apres.png' });
// Elle marche : 2 500 de recharge au panier, puis encaissés.
await p.locator('#ml-mt').fill('2500'); await p.locator('#ml-nm').fill('Recharge MTN');
await p.locator('#ml-ok').tap(); await p.waitForTimeout(300);
t(await p.evaluate(() => panierLibre.length === 1 && panierLibre[0].px === 2500 && calcTotal() === 2500 && !document.querySelector('#ov-libre.show')), '« Ajouter au panier » : 2 500 au panier, la feuille se ferme');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
