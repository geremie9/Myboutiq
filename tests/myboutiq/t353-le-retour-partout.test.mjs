// t353 — LE RETOUR PARTOUT (24.32).
// Le patron, 27/11 : « le retour partout dans l'app est un peu complexe ».
// Mesuré : sur Stock, Ma journée ou Dettes, le retour du téléphone disait
// « Appuie encore pour quitter » (les onglets remplacent la racine) ; dans
// une feuille, il fermait tout au lieu de revenir d'un cran (famille ouverte
// dans « Ajouter des articles », inventaire « un par un ») ; et après un
// retour, la barre du bas montrait encore l'ancien onglet.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t353');
const { s, port } = await serveur();
const b = await chromium.launch();
const { p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
const ou = () => p.evaluate(() => ({ ecran: (document.querySelector('.scr.on') || {}).id, onglet: ((document.querySelector('.ni.on') || {}).getAttribute ? document.querySelector('.ni.on').getAttribute('onclick') : '').replace(/^navTo\('([a-z]+)'.*$/, '$1'), feuilles: [...document.querySelectorAll('.ov.show')].map(x => x.id) }));
const retour = () => p.evaluate(() => { window.__toasts = []; const r = retourNaturel(); return { r, toast: window.__toasts.join(' | ') }; });
const onglet = tab => p.evaluate(tab => { const b = [...document.querySelectorAll('.ni')].find(n => (n.getAttribute('onclick') || '').indexOf("navTo('" + tab + "'") > -1); navTo(tab, b); }, tab);

for (const [tab, scr] of [['stock', 's-stock'], ['rapports', 's-rapports'], ['clients', 's-clients']]) {
  await onglet(tab); await p.waitForTimeout(150);
  const r = await retour(); const o = await ou();
  t(r.r && o.ecran === 's-caisse' && o.onglet === 'caisse' && !/quitter/.test(r.toast), `onglet ${tab} : le retour ramène à Vendre, la barre suit (avant : « Appuie encore pour quitter »)`);
}
// Depuis la caisse : là seulement, il peut quitter
const r0 = await retour();
t(!r0.r, `sur la caisse, rien derrière : c'est là, et là seulement, qu'on propose de quitter`);

// Les Réglages empilés au-dessus de la caisse : retour → caisse, barre juste
await p.evaluate(() => goSt()); await p.waitForTimeout(150);
await retour(); let o = await ou();
t(o.ecran === 's-caisse' && o.onglet === 'caisse', `Réglages → retour → caisse (${o.ecran}, onglet ${o.onglet})`);

// « Ajouter des articles » : une famille ouverte → le retour referme la famille, pas la feuille
await p.evaluate(() => ouvrirChoixArticles()); await p.waitForTimeout(500);
if (await p.getByText('Au détail', { exact: true }).count()) { await p.getByText('Au détail', { exact: true }).click(); await p.waitForTimeout(500); }
await p.evaluate(() => { const t = [...document.querySelectorAll('#cha-grid > div[onclick]')].find(x => /sortes/.test(x.textContent)); t.click(); });
const fam = await p.evaluate(() => _chaFam);
await retour(); o = await ou();
t(fam != null && o.feuilles.includes('ov-choixart') && await p.evaluate(() => _chaFam) == null, `famille ouverte : le retour revient à la grille, la feuille reste`);
await retour(); o = await ou();
t(!o.feuilles.includes('ov-choixart'), `retour encore : la feuille se ferme`);

// L'inventaire « un par un » → le retour revient à la liste
await p.evaluate(() => { ouvrirInventaire(); invUnParUn(); }); await p.waitForTimeout(200);
await retour(); o = await ou();
t(o.feuilles.includes('ov-inv') && await p.evaluate(() => !_invUn && !!document.querySelector('#inv-lst .inv-un-b')), `inventaire « un par un » : le retour revient à la liste (ce qui est compté reste)`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
