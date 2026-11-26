// t346 — « AJOUTER DES ARTICLES » SANS FRICTION (24.25).
// La capture du patron (26/11, « Frictions ») : six articles par écran, un
// petit dessin perdu dans une grande case grise, des rayons « Ménage 197 » en
// pastilles sombres qui avaient tous l'air choisis, et un gros bouton gris
// « Choisis tes articles » qui ne faisait rien.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t346');
const { s, port } = await serveur();
const b = await chromium.launch();
const { p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
await p.setViewportSize({ width: 410, height: 900 });
await p.evaluate(() => ouvrirChoixArticles()); await p.waitForTimeout(600);
const q = await p.getByText('Au détail', { exact: true }).count();
if (q) { await p.getByText('Au détail', { exact: true }).click(); await p.waitForTimeout(700); }

const r = await p.evaluate(() => {
  const g = document.getElementById('cha-grid'), tu = [...g.querySelectorAll(':scope > div[onclick]')];
  const y0 = tu[0].getBoundingClientRect().top, ligne1 = tu.filter(x => Math.abs(x.getBoundingClientRect().top - y0) < 4).length;
  const vus = tu.filter(x => x.getBoundingClientRect().bottom < window.innerHeight - 90).length;
  const rays = [...document.querySelectorAll('#cha-cats button')];
  const svg = tu[0].querySelector('.cha-m svg'), nm = tu[0].querySelector('.cha-nm');
  const btn = document.getElementById('cha-btn');
  return { ligne1, vus, rays: rays.map(x => x.textContent), on: rays.filter(x => x.classList.contains('on')).length,
    svg: svg ? svg.getBoundingClientRect().width : 0, nm: nm ? parseFloat(getComputedStyle(nm).fontSize) : 0, btn: getComputedStyle(btn).display };
});
t(r.ligne1 >= 4, `4 articles par ligne sur un écran de 410 px (${r.ligne1} ; avant : 3)`);
t(r.vus >= 12, `${r.vus} articles visibles sans défiler (avant : 6)`);
t(r.svg >= 44 && r.nm >= 12, `le dessin à ${Math.round(r.svg)} px, le nom à ${r.nm} px (avant : 40 et 10,5)`);
t(r.rays.length > 2 && r.rays.every(x => !/\d/.test(x)) && r.on === 0, `rayons sans nombre, aucun allumé tant qu'il n'en choisit pas (${r.rays.slice(0, 3).join(', ')}…)`);
t(r.btn === 'none', `rien de choisi : pas de bouton gris mort (« ${r.btn} »)`);

await p.evaluate(() => { const t = [...document.querySelectorAll('#cha-grid > div[onclick]')].find(x => /Riz/.test(x.textContent)); t.click(); });
await p.waitForTimeout(300);
const f = await p.evaluate(() => { const r = document.querySelector('#cha-grid .cha-ray'); return r ? { txt: r.textContent, h: r.getBoundingClientRect().height } : null; });
t(f && /Retour/.test(f.txt) && f.h >= 36, `famille Riz ouverte : « ${f && f.txt} » en grand (${f && Math.round(f.h)} px)`);
await p.evaluate(() => { const t = document.querySelector('#cha-grid > div[onclick]'); t.click(); }); await p.waitForTimeout(300);
const btn2 = await p.evaluate(() => { const b = document.getElementById('cha-btn'); return { d: getComputedStyle(b).display, t: b.textContent }; });
t(btn2.d !== 'none' && /Continuer avec 1 article/.test(btn2.t), `une sorte choisie : « ${btn2.t} » apparaît`);
await p.evaluate(() => chaCat('Ménage')); await p.waitForTimeout(200);
const on = await p.evaluate(() => [...document.querySelectorAll('#cha-cats .cha-ray.on')].map(x => x.textContent));
t(on.length === 1 && on[0] === 'Ménage', `le rayon choisi est le seul foncé (${JSON.stringify(on)})`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
