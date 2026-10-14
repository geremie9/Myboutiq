// t230 — « PRIX NÉGOCIÉ NE PREND PAS » (23.15).
// Sa capture : la feuille « Prix négocié », Farine, prix normal 50 000 pour
// 100 kg ; « 50000 » en gris dans la case, et un ✓ vert tout seul en bas à
// droite. Le clavier de l'app était là, mais ses touches sont dessinées pour
// la porte (fond sombre) : chiffres BLANCS sur une feuille BLANCHE. Il ne
// voyait que le ✓ ; il le touchait, la case était vide, la feuille se
// fermait — rien d'appliqué, aucun mot.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, nombre } from './caisse.mjs';
const { t, fin } = compteur('t230');
const { s, port } = await serveur();
const b = await chromium.launch();
// Contraste WCAG entre le chiffre et sa touche (la touche posée sur la feuille).
const contraste = p => p.evaluate(() => {
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const sur = (h, f) => { const a = h[3] == null ? 1 : h[3]; return [0, 1, 2].map(i => h[i] * a + f[i] * (1 - a)); };
  const lum = c => { const l = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * l[0] + .7152 * l[1] + .0722 * l[2]; };
  const k = document.querySelector('#ng-clavier .kp[data-k="5"]'), cs = getComputedStyle(k);
  const feuille = rgb(getComputedStyle(document.querySelector('#ov-nego .bsht')).backgroundColor);
  const fond = sur(rgb(cs.backgroundColor), feuille), txt = sur(rgb(cs.color), fond);
  const L1 = lum(txt), L2 = lum(fond); return Math.round((Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05) * 10) / 10;
});
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
await p.evaluate(() => { window.__t = []; const st = showToast; showToast = function (m) { __t.push(String(m)); return st.apply(this, arguments); };
  const a = DB.articles.find(x => x.id === 2); addPanier(a, 0); addPanier(a, 0); ouvrirPanier(); });
await p.waitForTimeout(300);
const normal = await p.evaluate(() => calcTotal());
await p.locator('.pisub.touchable').first().click(); await p.waitForTimeout(300);
const vu = await p.evaluate(() => ({ ouvert: !!document.querySelector('#ov-nego.show'), kp: getComputedStyle(document.getElementById('ng-clavier')).display,
  ph: document.getElementById('ng-inp').placeholder }));
t(vu.ouvert && vu.kp === 'grid', `toucher le prix ouvre la feuille, avec le clavier de l'app (${vu.kp})`);
const c = await contraste(p);
t(c >= 4.5, `les chiffres du clavier se LISENT sur la feuille : contraste ${c}:1 (il faut 4,5)`);
t(!/^\d+$/.test(vu.ph), `la case vide ne montre pas un nombre qu'on croirait tapé (« ${vu.ph} »)`);
// ✓ touché sur une case vide : la feuille reste, et le dit.
await p.locator('#ng-clavier .kp[data-k="ok"]').click(); await p.waitForTimeout(200);
const vide = await p.evaluate(() => ({ ouvert: !!document.querySelector('#ov-nego.show'), dit: __t.join(' | ') }));
t(vide.ouvert && /Tape d'abord le prix/.test(vide.dit), `✓ sur une case vide : la feuille reste et dit quoi faire (« ${vide.dit} »)`);
// Il tape 1 0 0 0 au clavier de l'app, puis ✓.
for (const k of ['1', '0', '0', '0']) await p.locator(`#ng-clavier .kp[data-k="${k}"]`).click();
const lu = await p.evaluate(() => document.getElementById('ng-inp').value);
t(lu === '1000', `ce qu'il tape s'écrit dans la case (« ${lu} »)`);
await p.locator('#ng-clavier .kp[data-k="ok"]').click(); await p.waitForTimeout(300);
const apres = await p.evaluate(() => ({ total: calcTotal(), ferme: !document.querySelector('#ov-nego.show'), aff: (document.querySelector('.pisub.touchable') || {}).textContent || '' }));
t(normal === 1200 && apres.total === 1000 && apres.ferme, `le prix négocié PREND : ${normal} → ${apres.total}`);
t(nombre(apres.aff) === 1000 || /1\s?000/.test(apres.aff), `et la ligne du panier le montre (« ${apres.aff} »)`);
// Le même prix, par le bouton du bas.
await p.locator('.pisub.touchable').first().click(); await p.waitForTimeout(300);
await p.evaluate(() => { const i = document.getElementById('ng-inp'); i.value = ''; });
for (const k of ['9', '0', '0']) await p.locator(`#ng-clavier .kp[data-k="${k}"]`).click();
await p.locator('#ng-ok').click(); await p.waitForTimeout(300);
t(await p.evaluate(() => calcTotal()) === 900, 'par « Appliquer ce prix » aussi : 900');
const emo = await p.evaluate(() => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.querySelector('#ov-nego').innerText.replace(/[✓✕]/g, '')));
t(!emo, 'la feuille sans emoji');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
