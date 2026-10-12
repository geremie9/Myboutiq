// t221 — LES GUIDES, AU STYLE DE LA VITRINE (23.07).
// « Fais pareil pour les pages conseils. » Une feuille et un script communs
// habillent les 15 pages. Ce banc vérifie qu'elles s'habillent toutes, que
// le sommaire et la barre de lecture vivent, que rien ne déborde sur un
// téléphone — et surtout que le TEXTE (ce que Google lit) n'a pas changé,
// et qu'il reste lisible sans le script.
import { chromium, serveur, compteur, couperInternet, RACINE } from './lib.mjs';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const { t, fin } = compteur('t221');
const { s, port } = await serveur();
const b = await chromium.launch();
const pages = fs.readdirSync(RACINE + '/conseils').filter(f => f.endsWith('.html'));

// 1) Le texte des pages est celui d'avant : seuls deux liens sont ajoutés.
{
  let change = [];
  for (const f of pages) {
    let avant = '';
    try { avant = execSync(`git show d260ed2:conseils/${f}`, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { continue; }
    const apres = fs.readFileSync(RACINE + '/conseils/' + f, 'utf8')
      .replace('\n<link rel="stylesheet" href="/conseils/commun/guides.css">', '')
      .replace('<script src="/conseils/commun/guides.js" defer></script>\n', '');
    if (apres !== avant) change.push(f);
  }
  t(change.length === 0, `les ${pages.length} pages gardent leur texte mot pour mot (seuls la feuille et le script s'ajoutent)` + (change.length ? ' — changé : ' + change.join(', ') : ''));
}

// 2) Chaque page s'habille, et tient dans 360 px.
let habillees = 0, larges = [], erreurs = [];
for (const f of pages) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => erreurs.push(f + ' : ' + e.message.slice(0, 100)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/conseils/${f === 'index.html' ? '' : f.replace('.html', '')}`); await p.waitForTimeout(500);
  const r = await p.evaluate(() => ({ fond: getComputedStyle(document.body).backgroundColor, prog: !!document.getElementById('g-prog'),
    large: document.documentElement.scrollWidth }));
  if (r.fond === 'rgb(255, 253, 248)' && r.prog) habillees++;
  if (r.large > 360) larges.push(f + ' ' + r.large);
  await ctx.close();
}
t(habillees === pages.length, `les ${pages.length} pages prennent le nouveau style (${habillees})`);
t(larges.length === 0, 'aucune ne déborde à 360 px' + (larges.length ? ' : ' + larges.join(', ') : ''));
t(erreurs.length === 0, 'aucune erreur JS' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));

// 3) Sur un guide : sommaire, barre de lecture, apparition.
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/conseils/combien-ma-boutique-gagne`); await p.waitForTimeout(600);
  const som = await p.evaluate(() => Array.from(document.querySelectorAll('.g-som a')).map(a => a.textContent));
  const h2 = await p.evaluate(() => document.querySelectorAll('.bl > h2').length);
  t(som.length === h2 && h2 >= 3, `le sommaire reprend les ${h2} titres de la page`);
  await p.evaluate(() => { const a = document.querySelectorAll('.g-som a')[2]; a.click(); }); await p.waitForTimeout(900);
  const r = await p.evaluate(() => ({ ici: (document.querySelector('.g-som a.ici') || {}).textContent || '',
    prog: +getComputedStyle(document.getElementById('g-prog')).transform.split(',')[0].replace('matrix(', ''),
    vus: document.querySelectorAll('.g-rv.vu').length }));
  t(r.ici === som[2], `toucher « ${som[2]} » y mène, et la puce s'allume (« ${r.ici} »)`);
  t(r.prog > 0 && r.prog < 1, `la barre de lecture avance (${Math.round(r.prog * 100)} %)`);
  t(r.vus >= 2, `les blocs lus sont apparus (${r.vus})`);
  await ctx.close();
}

// 4) Sans le script : rien n'est caché. Moins de mouvement : rien ne bouge.
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', javaScriptEnabled: false });
  const p = await ctx.newPage(); await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/conseils/vendre-sans-reseau`); await p.waitForTimeout(400);
  const op = await p.evaluate(() => Array.from(document.querySelectorAll('.bl,.bilan,figure')).filter(e => getComputedStyle(e).opacity !== '1').length).catch(() => -1);
  t(op === 0, `sans JavaScript, tous les blocs se lisent (${op} cachés)`);
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const p = await ctx.newPage(); await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/conseils/vendre-sans-reseau`); await p.waitForTimeout(500);
  const r = await p.evaluate(() => ({ anim: document.documentElement.classList.contains('g-anim'),
    cur: document.querySelector('.g-cur') ? getComputedStyle(document.querySelector('.g-cur')).animationName : 'none' }));
  t(!r.anim && r.cur === 'none', `moins de mouvement : pas d'apparition, curseur immobile (${r.cur})`);
  await ctx.close();
}
await b.close(); s.close();
fin();
