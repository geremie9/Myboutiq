// t273 — LA RECHERCHE DE L'ARRIVAGE, ET LA CAISSE QUI RESSEMBLE À UNE BOUTIQUE (23.54).
// Le patron, le 15/11 : « met la recherche dans certaines parties, comme
// arrivage », et sur la caisse : « visiblement générique, humanise, rends ça
// vivant, sans t'écarter des couleurs ». La grille « Quel article ? » de
// l'arrivage montrait tous les articles d'un bloc, sans champ pour chercher.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, stock } from './caisse.mjs';
const { t, fin } = compteur('t273');
const { s, port } = await serveur();
const b = await chromium.launch();

const db = nouvelleBoutique(); db.cfg.facon = 'detail';
for (let i = 1; i <= 90; i++) db.articles.push({ id: 100 + i, nm: 'Article ' + i, e: '📦', cat: 'Alimentation', px: 500, pa: 400, stk0: 10, al: 3, vd: 0 });
db.articles.push({ id: 300, nm: 'Crème Éclat', e: '🧴', cat: 'Hygiène', px: 900, pa: 700, stk0: 4, al: 1, vd: 0 });
db.articles.push({ id: 301, nm: 'Savon', e: '📦', cat: 'Hygiène', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [{ id: 1, nm: 'Azur', px: 650, pa: 500, stk: 10, stk0: 10 }, { id: 2, nm: 'Palmida', px: 600, pa: 480, stk: 10, stk0: 10 }] });
const N = db.articles.length;
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(400);

const grille = () => p.evaluate(() => ({
  champ: !!(document.getElementById('agstk-cw') || {}).offsetParent, n: document.querySelectorAll('#agstk .apcd').length,
  noms: [...document.querySelectorAll('#agstk .apcd')].map(x => x.children[1].textContent),
  msg: (document.querySelector('#agstk .ag-rien') || {}).textContent || '', val: (document.getElementById('agstk-src') || {}).value,
  form: document.getElementById('stk-form').style.display !== 'none'
}));
const chercher = async v => { if (await p.locator('#agstk-src').count()) await p.locator('#agstk-src').fill(v); await p.waitForTimeout(200); return grille(); };

// ── L'arrivage ──
await p.evaluate(() => ouvrirStk(null)); await p.waitForTimeout(400);
let g = await grille();
t(g.champ && g.n === 60, `« Quel article ? » a son champ de recherche, et 60 vignettes au plus (${g.n} sur ${N})`);
t(new RegExp('\\+ ' + (N - 60) + ' autres').test(g.msg), `une ligne dit combien d'autres se trouvent en tapant leur nom (« ${g.msg} »)`);
g = await chercher('creme');
t(g.n === 1 && g.noms[0] === 'Crème Éclat', `« creme », sans accent ni majuscule, trouve « Crème Éclat » (${g.noms.join(', ')})`);
g = await chercher('palmida');
t(g.n === 1 && g.noms[0] === 'Savon', `« palmida » trouve la famille « Savon », par sa sorte (${g.noms.join(', ')})`);
g = await chercher('Article 9');
t(g.n === 2 && g.noms.join() === 'Article 9,Article 90', `« Article 9 » : ${g.noms.join(', ')}`);
g = await chercher('zzz');
t(g.n === 0 && /Aucun article « zzz »/.test(g.msg), `rien ne correspond : il le lit (« ${g.msg} »)`);
const h1 = await p.evaluate(() => document.getElementById('agstk').getBoundingClientRect().height);
await chercher('');
const h2 = await p.evaluate(() => document.getElementById('agstk').getBoundingClientRect().height);
t(Math.abs(h1 - h2) < 2, `la feuille ne saute pas pendant qu'il tape (grille ${Math.round(h1)} px vide, ${Math.round(h2)} px pleine)`);

await chercher('creme');
const s0 = await stock(p, 300);
await p.locator('#agstk .apcd').first().tap(); await p.waitForTimeout(450);
g = await grille();
t(g.form && !g.champ, 'il touche l\'article : la fiche, et le champ de recherche s\'efface avec la grille');
await p.evaluate(() => renderAgstk()); await p.waitForTimeout(150);
t(!(await grille()).champ, 'une synchro qui redessine la grille pendant la fiche ne fait pas revenir le champ');
await p.keyboard.type('5'); await p.locator('#btn-save-stk').tap(); await p.waitForTimeout(500);
g = await grille();
t((await stock(p, 300)) === s0 + 5, `l'entrée est enregistrée sur le bon article (${s0} → ${await stock(p, 300)})`);
t(!g.form && g.champ && g.val === '' && g.n === 60, `retour à la liste pour l'article suivant : la recherche est vide, toute la liste revient (${g.n})`);
await p.evaluate(() => closeSheet('ov-stk'));

// ── La caisse : la devanture ──
const c = await p.evaluate(() => {
  const h = document.querySelector('#s-caisse .mhdr.pro'), a = getComputedStyle(h, '::after');
  const tabs = [...document.querySelectorAll('#tabs-c .tpil')];
  const boi = tabs.find(x => x.textContent.trim() === 'Hygiène');
  const tu = document.getElementById('pc-2'), med = tu.querySelector('.pmedia'), ic = med.querySelector('svg');
  return {
    store: /repeating-linear-gradient/.test(a.backgroundImage) && parseFloat(a.height) >= 12,
    mots: tabs.map(x => x.textContent.trim()), dessins: tabs.every(x => x.querySelector('svg.tpil-ic')),
    hyg: boi && getComputedStyle(boi.querySelector('svg')).color,
    meuble: /gradient/.test(getComputedStyle(document.getElementById('pgrid')).backgroundImage),
    paquet: !!ic && !med.classList.contains('pphoto') && getComputedStyle(ic).borderTopWidth === '4px' && /gradient/.test(getComputedStyle(med).backgroundImage),
    h: Math.round(tu.getBoundingClientRect().height),
    planche: getComputedStyle(tu.querySelector('.pcard-overlay')).backgroundColor,
  };
});
t(c.store, 'le store de la devanture pend sous la barre du haut');
t(c.dessins && c.mots[0] === 'Tout' && c.mots.includes('Alimentation') && c.mots.includes('Hygiène'), `chaque rayon a son dessin, et garde son mot (${c.mots.join(', ')})`);
t(c.hyg === 'rgb(83, 74, 183)', `le dessin du rayon est dans la couleur de ses articles (Hygiène : ${c.hyg})`);
t(c.meuble, 'les rangées sont dans un même meuble (mur et montants derrière la grille)');
t(c.paquet && c.planche === 'rgb(168, 120, 60)' && c.h <= 124, `un article sans photo est un paquet posé sur la planche, la tuile reste à ${c.h} px`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();

// ── Une petite boutique : pas de champ pour 7 articles ──
{
  const d = nouvelleBoutique(); d.cfg.facon = 'detail';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
  await p.evaluate(() => ouvrirStk(null)); await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({ champ: !!(document.getElementById('agstk-cw') || {}).offsetParent, n: document.querySelectorAll('#agstk .apcd').length }));
  t(!r.champ && r.n === 7, `7 articles : la grille seule, sans champ à remplir (${r.n})`);
  t(errs.length === 0, 'aucune erreur JS (petite boutique)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close(); fin();
