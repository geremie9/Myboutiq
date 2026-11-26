// t341 — « MON ACTIVITÉ » EST CELLE DU VENDEUR (24.20).
// L'agent « patron et vendeur » (25/11) : Ibrahim, 3 ventes, lisait
// « Transactions enregistrées : 11 » et les meilleurs articles de toute la
// boutique — le chiffre qu'il croyait être le sien, et ce que vendent les
// autres. Ici : le patron vend sur le même téléphone, puis Ibrahim prend la
// caisse (les deux passent par la vraie caisse).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, nombre } from './caisse.mjs';
const { t, fin } = compteur('t341');
const { s, port } = await serveur();
const b = await chromium.launch();
const { p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());

await vendre(p, { lignes: [[5, 2]] });            // patron : 2 Lait Nido
await vendre(p, { lignes: [[4, 1]] });            // patron : 1 Huile
await p.evaluate(() => { try { fermerSucces(); } catch (e) {} role = 'vendeur'; nomVendeur = 'Ibrahim'; });
await vendre(p, { lignes: [[2, 3]] });            // Ibrahim : 3 Riz
await p.evaluate(() => { try { fermerSucces(); } catch (e) {} });
const r = await p.evaluate(() => { renderRpt(); const c = document.getElementById('rpt-cont'); return { txt: c.innerText.replace(/\s+/g, ' '), barres: [...c.querySelectorAll('.bchart-row')].map(x => x.innerText.replace(/\s+/g, ' ')) }; });
const nb = (r.txt.match(/Mes ventes\s*(\d+)/i) || [])[1];
const mt = (r.txt.match(/Vendu par moi\s*([\d   .,]+)/i) || [])[1];
t(nb === '1', `Ibrahim : « Mes ventes 1 » (avant : 3, celles du patron comprises) — ${nb}`);
t(nombre(mt || '0') === 1800, `« Vendu par moi » : 1 800 (3 riz à 600) — ${mt}`);
t(r.barres.length === 1 && /Riz/.test(r.barres[0]), `ce qu'il a vendu : seulement son riz (avant : le lait et l'huile du patron aussi) — ${JSON.stringify(r.barres)}`);
t(/réservé au patron/i.test(r.txt) && !/Bénéfice/i.test(r.txt), `toujours aucun bénéfice à l'écran du vendeur`);

// Le patron, lui, voit toute la boutique
const r2 = await p.evaluate(() => { role = 'patron'; renderRpt(); return [...document.querySelectorAll('#rpt-cont .bchart-row')].length; });
t(r2 === 3, `le patron voit les 3 articles vendus (${r2})`);

// La voix au remboursement : ce qui reste, ou la monnaie
await vendre(p, { lignes: [[5, 1]], mode: 'credit', client: 1 });   // Awa doit 3 200
await p.evaluate(() => { try { fermerSucces(); } catch (e) {} });
const rb = async m => p.evaluate(m => { window.__v = []; parler = x => window.__v.push(x); ouvrirDetCli(1); const el = document.getElementById('cli-pmt'); el.value = m; el.dispatchEvent(new Event('input')); enregPmt(); return window.__v.join(' | '); }, m);
const v1 = await rb(2000), v2 = await rb(2000);
t(/Awa a payé 2000 francs\. Reste à payer : 1200 francs/.test(v1), `remboursement de 2 000 : « ${v1} » (avant : silence)`);
t(/Awa a payé 1200 francs\. Rends 800 francs/.test(v2), `elle donne 2 000 pour 1 200 dus : « ${v2} »`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
