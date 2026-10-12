// t219 — LE SITE TIENT DANS L'ÉCRAN D'UN TÉLÉPHONE (23.05).
// « Mon site ressemble à un site générique… le visuel est moche. » En le
// mesurant, pire qu'un goût : depuis la 23.03, la colonne du site faisait
// 827 px de large sur un téléphone de 390 — boutons coupés à droite, page
// qui glisse de côté. Une règle des tuiles de variantes (`.vt-sous`, nowrap)
// portait le même nom que les sous-titres de la vitrine.
// Ce banc mesure la largeur réelle de la page, en français et en anglais,
// aux tailles des téléphones qu'on voit en boutique.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
const { t, fin } = compteur('t219');
const { s, port } = await serveur();
const b = await chromium.launch();

for (const locale of ['fr-FR', 'en-US']) {
  for (const w of [320, 360, 390, 414]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, locale, serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await couperInternet(p, port);
    await p.goto(`http://127.0.0.1:${port}/?site`); await p.waitForTimeout(1800);
    const m = await p.evaluate(() => {
      const larges = [];
      // Un élément qu'un cadre ROGNE exprès (formes du décor, bandeau qui
      // défile, toile de la caisse) ne déborde pas : on ne le voit pas
      // dépasser. Seul #s-landing ne compte pas comme cadre — c'est lui qui
      // cachait les boutons coupés de la 23.03.
      // Le décor (aria-hidden) peut dépasser : le bandeau penché le fait exprès.
      const rogne = e => { if (e.closest('[aria-hidden="true"]')) return true; for (let a = e.parentElement; a && a.id !== 's-landing'; a = a.parentElement) {
        const o = getComputedStyle(a).overflowX; if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') return true; } return false; };
      document.querySelectorAll('#s-landing *').forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !rogne(e)) larges.push((e.id || e.className || e.tagName) + ' ' + Math.round(r.right));
      });
      return { page: document.documentElement.scrollWidth, larges: larges.slice(0, 4) };
    });
    t(m.page <= w && !m.larges.length, `${locale} · ${w} px : la page fait ${m.page} px${m.larges.length ? ' — dépassent : ' + m.larges.join(', ') : ''}`);
    if (errs.length) t(false, 'erreur JS : ' + errs.join(' | '));
    await ctx.close();
  }
}
await b.close(); s.close();
fin();
