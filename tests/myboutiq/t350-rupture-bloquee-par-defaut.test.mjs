// t350 — LA VENTE EN RUPTURE EST BLOQUÉE PAR DÉFAUT (24.29).
// Le patron, 27/11 : « les ventes en rupture devront être bloquées par
// défaut ». Avant, il fallait couper soi-même la « vente de dépannage » ;
// personne ne trouvait le réglage et le stock passait sous zéro.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, stock } from './caisse.mjs';
const { t, fin } = compteur('t350');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
delete d.cfg.sansStock;                                   // une boutique qui n'a jamais choisi
d.articles.push({ id: 90, nm: 'Galette', e: '', cat: 'Divers', px: 50, pa: 30, al: 0, vd: 0, vr: [] });   // stock jamais compté
const { p, errs } = await ouvrirCaisse(b, port, d);

const essayer = (id, q) => p.evaluate(([id, q]) => {
  window.__toasts = []; viderPanier(); const a = DB.articles.find(x => x.id === id);
  for (let i = 0; i < q; i++) panier[id + '-0'] = (panier[id + '-0'] || 0) + 1;
  const n0 = DB.ventes.length; procederPmt(); selPmntVente('especes'); encaisser();
  try { fermerSucces(); } catch (e) {}
  return { vendu: DB.ventes.length > n0, toast: window.__toasts.join(' | ') };
}, [id, q]);

t(await p.evaluate(() => venteSansStockInterdite()), `une boutique qui n'a jamais choisi : vente sans stock interdite`);
let r = await essayer(5, 13);                                  // Lait Nido : 12 en stock
t(!r.vendu && /Pas assez de Lait Nido.*il en reste 12/.test(r.toast), `13 Lait Nido pour 12 en stock : refusé (« ${r.toast.slice(0, 80)}… »)`);
r = await essayer(5, 12);
t(r.vendu, `12 Lait Nido : vendu`);
r = await essayer(90, 3);
t(r.vendu, `un article dont le stock n'a jamais été compté reste vendable (premières ventes d'une boutique neuve)`);
const val = await p.evaluate(() => { ouvrirValeur(); const bs = [...document.querySelectorAll('.vb-regle button')]; const on = bs.find(x => x.classList.contains('on')); closeSheet('ov-valeur'); return on ? on.textContent : ''; });
t(val === 'Interdite', `« Ce que vaut ma boutique » : « Vente de dépannage — ${val} » allumé`);
// Le patron l'autorise : elle repasse
await p.evaluate(() => reglerVenteSansStock('oui'));
r = await essayer(4, 25);                                      // Huile : 20 en stock
t(r.vendu && await p.evaluate(() => DB.cfg.sansStock) === 'oui', `autorisée par le patron : 25 huiles pour 20 passent (dépannage)`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
