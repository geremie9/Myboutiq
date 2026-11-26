// t329 — LA BARRE DU BAS PARLE EN CHIFFRES (24.12).
// Le patron, le 24/11, sa capture de la barre du bas : « les fonctionnalités
// sont aussi génériques ». Vendre, Stock, Ma journée, Dettes : les mêmes mots
// partout, et un point rouge qui ne disait pas combien. Chaque bouton porte
// maintenant le chiffre de sa boutique. En vraies ventes, sur 360×640.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, nombre } from './caisse.mjs';
const { t, fin } = compteur('t329');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles.find(a => a.id === 3).stk0 = 1; d.articles.find(a => a.id === 3).al = 5;     // presque vide
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 640 });
const lire = () => p.evaluate(() => { const o = {}; document.querySelectorAll('#s-caisse .bnav .ni').forEach(b => { const m = (b.getAttribute('onclick') || '').match(/navTo\('(\w+)'/); const x = b.querySelector('.nnum'); if (m) o[m[1]] = x ? { t: x.textContent, c: x.className, vis: getComputedStyle(x).display !== 'none' } : null; }); return o; });
const attendre = () => p.waitForTimeout(1500);

await p.evaluate(() => _navChiffres()); 
const a0 = await lire();
const stk0 = await p.evaluate(() => _alertesStock().tout.length);
t(a0.stock && +a0.stock.t === stk0 && /rouge/.test(a0.stock.c), `Stock porte le nombre d'articles à racheter : « ${a0.stock && a0.stock.t} » (${stk0}), plus un point muet`);
t(!a0.rapports && !a0.clients, 'rien sur Ma journée ni Dettes tant que c\'est zéro');

await vendre(p, { lignes: [[1, 2]] }); await p.evaluate(() => fermerSucces());
await vendre(p, { lignes: [[2, 1]], mode: 'credit', client: 1 }); await p.evaluate(() => fermerSucces());
await attendre();
const a1 = await lire();
const jour = await p.evaluate(() => getTodaySales().reduce((s, v) => s + v.total, 0));
const du = await p.evaluate(() => DB.clients.reduce((s, c) => s + Math.max(0, Number(c.credit) || 0), 0));
t(a1.rapports && nombre(a1.rapports.t) === jour && /vert/.test(a1.rapports.c), `deux ventes : Ma journée dit « ${a1.rapports && a1.rapports.t} » en vert (${jour})`);
t(a1.clients && nombre(a1.clients.t) === du && /rouge/.test(a1.clients.c), `une vente à crédit : Dettes dit « ${a1.clients && a1.clients.t} » en rouge (${du})`);
t(await p.evaluate(() => document.querySelectorAll('.bnav .ni-rapports .nnum, .bnav .nnum').length >= 3), 'les chiffres suivent sur les barres des autres écrans');
const pt = await p.evaluate(() => getComputedStyle(document.querySelector('#s-caisse .bnav .ni-stock .ne'), '::after').display);
t(pt === 'none', 'le point rouge du stock laisse la place au chiffre');
// Le vendeur : ni les ventes du jour, ni les dettes, s'il n'en a pas le droit.
await p.evaluate(() => { role = 'vendeur'; DB.cfg.perms = {}; _navChiffres(); });
const a2 = await lire();
t(!a2.rapports && !a2.clients && a2.stock, 'un vendeur sans droits : seulement le stock à racheter');
await p.evaluate(() => { role = 'patron'; _navChiffres(); });
t(await p.evaluate(() => _navCourt(1250000) === '1,3 M' && /^45\s000$/.test(_navCourt(45000).replace(/[  ]/g, ' '))), 'les gros montants restent courts : « 1,3 M », « 45 000 »');
t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
