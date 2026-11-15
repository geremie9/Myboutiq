// t281 — LES PETITS TEXTES SE LISENT (23.62).
// Le patron, le 15/11, captures de « Ajouter au stock » et « Tout configurer » :
// « la visibilité de certaines écritures ». Le gris des textes secondaires
// (#9E9E9E) faisait 2,7 de contraste sur blanc — sous le seuil de 4,5.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t281');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 });
// Contraste WCAG entre la couleur d'un texte et le fond réel derrière lui.
await p.addScriptTag({ content: `window.__contraste = function (el) {
  const rgb = c => (c.match(/[\\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  let fond = null, e = el; while (e && !fond) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > .9)) fond = c; e = e.parentElement; }
  fond = fond || [255, 255, 255]; const tx = rgb(getComputedStyle(el).color);
  const a = lum(tx), b = lum(fond); return Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 10) / 10; };` });
const m = await p.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--M)'; d.textContent = 'x'; document.body.appendChild(d); const c = __contraste(d); d.remove(); return c; });
t(m >= 4.5, `le gris des textes secondaires se lit : contraste ${m} sur le fond (avant : 2,7)`);
// L'arrivage : « Soit … · bénéfice … ».
await p.evaluate(() => ouvrirStk(DB.articles.find(a => a.id === 2))); await p.waitForTimeout(300);
await p.fill('#inp-sqte', '12'); await p.fill('#inp-spa', '450'); await p.locator('#inp-spa').dispatchEvent('input'); await p.waitForTimeout(200);
const a = await p.evaluate(() => { const e = document.getElementById('stk-pa-info'); return { t: e.textContent, px: parseFloat(getComputedStyle(e).fontSize), c: __contraste(e) }; });
t(a.px >= 12.5 && a.c >= 4.5, `« ${a.t.slice(0, 40)}… » : ${a.px} px, contraste ${a.c}`);
await p.evaluate(() => closeSheet('ov-stk'));
// Tout configurer : ACHAT · VENTE · STOCK, et ce qui est écrit dessous.
await p.evaluate(() => ouvrirGrilleConfig()); await p.waitForTimeout(400);
const g = await p.evaluate(() => { const l = document.querySelector('#ov-grille .grlab'); const n = document.querySelector('#ov-grille .grn2'); return { px: parseFloat(getComputedStyle(l).fontSize), c: __contraste(l), n: n ? parseFloat(getComputedStyle(n).fontSize) : 0 }; });
t(g.px >= 10.5 && g.c >= 4.5 && g.n >= 11, `« ACHAT · VENTE · STOCK » : ${g.px} px, contraste ${g.c} ; la ligne sous le nom : ${g.n} px`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close(); fin();
