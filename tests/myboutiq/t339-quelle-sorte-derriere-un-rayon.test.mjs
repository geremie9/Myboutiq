// t339 — « QUELLE SORTE ? » MONTRE LA FAMILLE, MÊME DERRIÈRE UN RAYON (24.20).
// L'agent « supermarché » (25/11), 25 familles et 80 articles : « savon » à la
// voix → « Quelle sorte de Savon ? »… et rien à l'écran. La famille était
// derrière une pastille de rayon (24.02) : sans tuile dessinée, rien ne
// s'ouvrait.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t339');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
for (let i = 0; i < 60; i++) d.articles.push({ id: 100 + i, nm: 'Biscuit n' + i, e: '', cat: 'Biscuits', px: 100 + i, pa: 80, stk0: 10, al: 0, vr: [] });
const V = (id, nm, px) => ({ id, nm, px, pa: Math.round(px * 0.8), stk0: 30, qBase: 1 });
d.articles.push({ id: 300, nm: 'Lessive', e: '', cat: 'Zzz Ménage', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Omo', 500), V(2, 'Ariel', 700)] });
const { p, errs } = await ouvrirCaisse(b, port, d);
await p.evaluate(() => { _parlerCommande = () => {}; });
const avant = await p.evaluate(() => ({ tuile: !!document.getElementById('pc-300'), rayon: !!document.querySelector('#pgrid .prayon') }));
t(!avant.tuile && avant.rayon, `au départ, Lessive est derrière une pastille de rayon (tuile dessinée : ${avant.tuile}, pastilles : ${avant.rayon})`);
const r = await p.evaluate(() => {
  viderPanier(); const R = _voixPanier('lessive'); _voixPanierDire(R);
  const c = document.getElementById('pc-300');
  return { choix: R.aChoisir.map(x => x.nm), tuile: !!c, ouvert: _varCarteId === 300 || !!document.querySelector('#ov-var.show') || !!(c && c.classList.contains('appel')) };
});
t(r.choix[0] === 'Lessive', `« lessive » : la voix demande la sorte (${JSON.stringify(r.choix)})`);
t(r.tuile && r.ouvert, `les sortes de Lessive sont sous ses yeux (avant : rien) — tuile ${r.tuile}, ouvert ${r.ouvert}`);

// Dans un autre onglet (Biscuits) : la fenêtre des sortes s'ouvre quand même
const r2 = await p.evaluate(() => {
  try { fermerVarInline(); } catch (e) {} try { closeSheet('ov-var'); } catch (e) {}
  const tab = [...document.querySelectorAll('#tabs-c > *')].find(x => /Biscuits/i.test(x.textContent));
  if (tab) tab.click();
  const visible = !!document.getElementById('pc-300');
  viderPanier(); const R = _voixPanier('lessive'); _voixPanierDire(R);
  const c = document.getElementById('pc-300');
  return { tab: !!tab, visible, ouvert: _varCarteId === 300 || !!document.querySelector('#ov-var.show') || !!(c && c.classList.contains('appel')) };
});
t(r2.ouvert, `onglet Biscuits (trouvé : ${r2.tab}, Lessive visible : ${r2.visible}) : les sortes s'ouvrent quand même`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
