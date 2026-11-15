// t279 — PIÈCE, PAQUET, CARTON : LISIBLES À LA CAISSE (23.60).
// Le patron, le 15/11 : « en gros, il y a souvent des articles qui viennent
// en carton ou en sac, et ces cartons contiennent des boîtes ou des paquets,
// qui contiennent des pièces ». L'app savait les trois étages depuis la
// 23.36 ; à la caisse, ils se cachaient derrière « carton ▾ », puis une liste
// de lignes où la pièce n'était même pas.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t279');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
// Des allumettes : 1 boîte à 25, un paquet de 10 à 225, un carton de 100 à 2 000.
db.articles.push({ id: 40, nm: 'Allumettes', e: '🔥', cat: 'Ménage', px: 25, pa: 15, stk0: 437, al: 20, vd: 0,
  umSac: 100, umCont: 'carton', umPar: 10, umParMot: 'paquet', umParTaille: 10, pxPar: 225, pxGros: 2000 });
// Le cube : le paquet n'a pas encore de prix.
db.articles.push({ id: 41, nm: 'Cube', e: '🧂', cat: 'Alimentation', px: 25, pa: 15, stk0: 1200, al: 20, vd: 0,
  umSac: 600, umCont: 'carton', umPar: 6, umParMot: 'paquet', umParTaille: 100, pxGros: 13500 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(400);

const feuille = id => p.evaluate(id => { choisirEtageGros(null, id);
  const bs = [...document.querySelectorAll('#etg-lst .etg-b')];
  return { n: bs.length, t: bs.map(x => x.querySelector('.etg-t').textContent), px: bs.map(x => x.querySelector('.etg-px').textContent.trim()),
    s: bs.map(x => x.querySelector('.etg-s').textContent.trim()), vide: bs.map(x => x.classList.contains('etg-vide')),
    ic: bs.map(x => Math.round(x.querySelector('.etg-ic svg').getBoundingClientRect().height)), reste: (document.querySelector('#etg-lst .etg-reste') || {}).textContent || '',
    haut: Math.round(bs[0].getBoundingClientRect().height) }; }, id);
const f = await feuille(40);
t(f.n === 3 && f.t.join(',') === '1 unité,1 paquet,1 carton', `trois gros boutons, du plus petit au plus grand : ${f.t.join(' · ')}`);
t(f.px.join(',').replace(/\s| | /g, '') === '25,225,2000' && f.haut >= 120, `chacun dit son prix en gros : ${f.px.join(' · ')} (boutons de ${f.haut} px)`);
t(f.s[1] === '10 unités' && f.s[2] === '100 unités', `et ce qu'il contient : ${f.s.slice(1).join(' · ')}`);
t(f.ic[0] < f.ic[1] && f.ic[1] < f.ic[2], `le dessin grandit avec l'étage (${f.ic.join(' < ')} px)`);
t(/4 cartons · 3 paquets · 7 unités/.test(f.reste), `ce qu'il lui reste, comme il le compte : « ${f.reste.trim()} »`);

// Un toucher vend, la feuille se ferme.
const vend = async sel => { await p.evaluate(() => choisirEtageGros(null, 40)); await p.locator('#etg-lst .etg-b').nth(sel).tap(); await p.waitForTimeout(300);
  return p.evaluate(() => ({ tot: calcTotal(), ouverte: document.getElementById('ov-etage').classList.contains('show') })); };
const a = await vend(0), b2 = await vend(1), c = await vend(2);
t(a.tot === 25 && b2.tot === 250 && c.tot === 2250 && !c.ouverte, `une unité 25, un paquet +225, un carton +2 000 → ${c.tot} ; la feuille se referme`);
await p.evaluate(() => viderPanier());

// Un étage sans prix le dit, et ne se vend pas à 0.
const g = await feuille(41);
t(g.vide[1] && /prix/.test(g.px[1]) && !g.vide[2], `le paquet de cubes sans prix dit « ${g.px[1]} », le carton se vend (${g.px[2]})`);
t(/2 cartons/.test(g.reste), `« ${g.reste.trim()} »`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close(); fin();
