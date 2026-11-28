// t363 — LE PAIN CHARGÉ SE VOIT, ET SES PRIX (24.46).
// Le patron, 28/11 : « pour le pain chargé, c'est complexe et il faut qu'on
// le voie, et le prix aussi ». Sa tuile montrait une icône de pain comme
// n'importe quel pain ; la fiche « Fait avec » ne disait le prix d'aucun
// ingrédient ; et il fallait aller chercher « Fait avec » dans un menu.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t363');
const { s, port } = await serveur();
const b = await chromium.launch();
const A = (id, nm, px, pa, x) => Object.assign({ id, nm, e: '', cat: 'Snack', px, pa, stk0: 30, al: 0, vd: 0, vr: [], rt: true }, x || {});
const d = nouvelleBoutique();
d.articles = [A(10, 'Pain', 150, 100), A(11, 'Œuf', 100, 60), A(14, 'Spaghetti', 650, 0), A(12, 'Pain chargé', 300, 0, { stk0: 0, rec: [{ pid: 10, q: 1 }, { pid: 11, q: 2 }] })];
const { p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });

const tuile = await p.evaluate(() => { const m = document.querySelector('#pc-12 .pmedia'); return { prec: m.classList.contains('prec'), n: m.querySelectorAll('.prec-i').length, fois: [...m.querySelectorAll('.prec-i b')].map(x => x.textContent).join(','), icones: [...m.querySelectorAll('.prec-i svg')].length }; });
t(tuile.prec && tuile.n === 2 && tuile.fois === '×2' && tuile.icones === 2, `la tuile montre ce qu'il y a dedans : pain + œuf ×2 (${JSON.stringify(tuile)})`);
const egg = await p.evaluate(() => iconArticle({ nm: 'Œuf' }).ico + ',' + iconArticle({ nm: 'Spaghetti 500 g' }).ico);
t(egg === 'oeuf,pates', `l'œuf et les pâtes ont leur dessin (${egg})`);

const f = await p.evaluate(() => {
  ouvrirRecette(DB.articles.find(x => x.id === 12), null);
  const L = [...document.querySelectorAll('#rc-corps .rc-l')].map(l => l.innerText.replace(/\s+/g, ' '));
  const bil = [...document.querySelectorAll('#rc-corps .rc-3 > div')].map(x => x.innerText.replace(/\s+/g, ' '));
  const cand = [...document.querySelectorAll('#rc-corps .rc-t')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' | ');
  return { L, bil, cand };
});
t(/Pain 100/.test(f.L[0]) && /Œuf 60.*× 2 = 120/.test(f.L[1]), `chaque ingrédient dit son prix : « ${f.L.join(' · ')} »`);
t(f.bil.length === 3 && /coûte 220/.test(f.bil[0]) && /vends 300/.test(f.bil[1]) && /gagnes 80/.test(f.bil[2]), `trois grands chiffres : ${f.bil.join(' | ')}`);
t(/Pain 100/.test(f.cand) && /Œuf 60/.test(f.cand), `les articles à toucher montrent leur prix d'achat`);
// un ingrédient sans prix d'achat : il se tape dans la fiche même
const pa = await p.evaluate(() => {
  rcAjouter('14', ''); const inp = [...document.querySelectorAll('#rc-corps .rc-pa')][0];
  const vu = !!inp; inp.value = '600'; inp.dispatchEvent(new Event('change'));
  return { vu, pa: DB.articles.find(x => x.id === 14).pa, ligne: [...document.querySelectorAll('#rc-corps .rc-l')].pop().innerText.replace(/\s+/g, ' ') };
});
t(pa.vu && pa.pa === 600 && /Spaghetti 600/.test(pa.ligne), `spaghetti sans prix d'achat : la case « achat ? » le prend (${pa.ligne})`);
await p.evaluate(() => closeSheet('ov-recette'));
// créer « Sandwich omelette » ouvre « Fait avec » tout seul
const cr = await p.evaluate(async () => {
  DB.ventes.push({ id: 'x', total: 0, lignes: [], annulee: true });   // pas le tout premier article de la boutique
  _etgGuideFait = true;
  ouvrirPrixPad({ nom: 'Sandwich omelette', etagere: true }); document.getElementById('ppd-px').value = '400'; prixPadValider();
  await new Promise(r => setTimeout(r, 700));
  return { ouvert: document.getElementById('ov-recette').classList.contains('show'), nom: (document.querySelector('#rc-corps .rc-tete b') || {}).textContent };
});
t(cr.ouvert && cr.nom === 'Sandwich omelette', `« Sandwich omelette » créé : « Fait avec » s'ouvre tout seul (${cr.nom})`);
await p.evaluate(() => closeSheet('ov-recette'));
const cr2 = await p.evaluate(async () => { ouvrirPrixPad({ nom: 'Sardine', etagere: true }); document.getElementById('ppd-px').value = '350'; prixPadValider(); await new Promise(r => setTimeout(r, 700)); return document.getElementById('ov-recette').classList.contains('show'); });
t(!cr2, `« Sardine » créée : rien ne s'ouvre (ce n'est pas un plat)`);
t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
