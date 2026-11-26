// t345 — RENDRE DES BOUTEILLES VIDES SANS RIEN ACHETER (24.24).
// L'agent « dépôt » (25/11) : un client rapporte ses vides et reprend sa
// consigne — impossible sans panier. Le patron sortait l'argent du tiroir sans
// trace, et le soir la caisse « manquait ». C'est une opération de caisse :
// le tiroir la voit, le nombre de ventes, le chiffre et le bénéfice non.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t345');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();               // article 1 : Bière 65 cl, consigne 100
const { p, errs } = await ouvrirCaisse(b, port, d);

const vu = () => p.evaluate(() => getComputedStyle(document.getElementById('vides-chip')).display !== 'none');
t(await vu(), `boutique avec consignes : le bouton « Vides » est sur la caisse`);

await vendre(p, { lignes: [[1, 12]], consigne: { prises: 12 } });     // 12 bières, 12 bouteilles emportées
await p.evaluate(() => { try { fermerSucces(); } catch (e) {} });
const avant = await p.evaluate(() => ({ nb: nbT, ca: totalV, ben: totalB, caisse: caisseAttendue(), cons: consignesDuJour(), dehors: valeurBoutique().consignesN }));

await p.evaluate(() => { _parle = []; parler = x => _parle.push(x); ouvrirVides(); videsPas(12); });
const feuille = await p.evaluate(() => document.getElementById('vid-corps').innerText.replace(/\s+/g, ' '));
t(/12/.test(feuille) && /Rends 1[   ]?200/.test(feuille), `« +12 » : la feuille dit « ${feuille.slice(0, 60)}… »`);
await p.evaluate(() => validerVides());
const apres = await p.evaluate(() => ({ nb: nbT, ca: totalV, ben: totalB, caisse: caisseAttendue(), cons: consignesDuJour(), dehors: valeurBoutique().consignesN, v: DB.ventes[DB.ventes.length - 1], dit: _parle.join(' | ') }));
t(apres.v.vides === true && apres.v.consigne === -1200 && apres.v.total === 0 && apres.v.lignes.length === 0, `enregistré : vides, consigne −1 200, total 0, aucune ligne`);
t(apres.caisse === avant.caisse - 1200, `le tiroir : ${avant.caisse} → ${apres.caisse} (−1 200, la clôture tombera juste)`);
t(apres.nb === avant.nb && apres.ca === avant.ca && apres.ben === avant.ben, `ni une vente de plus (${apres.nb}), ni du chiffre (${apres.ca}), ni du bénéfice (${apres.ben})`);
t(apres.cons === avant.cons - 1200 && apres.dehors === avant.dehors - 12, `consignes du jour ${avant.cons} → ${apres.cons}, emballages dehors ${avant.dehors} → ${apres.dehors}`);
t(/Rends 1200 francs pour 12 bouteilles vides/.test(apres.dit), `la voix : « ${apres.dit} »`);
t(await p.evaluate(() => saleLinesLabel(DB.ventes[DB.ventes.length - 1])) === '↩ 12 vides rendus', `dans l'historique : « ↩ 12 vides rendus »`);

// La clôture du soir compte juste et la marque clôturée
const clo = await p.evaluate(() => { ouvrirClot(); const att = caisseAttendue(); document.getElementById('inp-compt').value = String(att); calcEcart(); validerClot(); return { att, v: DB.ventes[DB.ventes.length - 1].cloturee }; });
t(clo.v === true, `la clôture garde l'opération et la marque clôturée`);

// Panier plein : le bouton s'efface (la feuille de paiement a déjà la consigne)
await p.evaluate(() => { try { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); } catch (e) {} addPanier(DB.articles.find(x => x.id === 3)); });
await p.waitForTimeout(200);
t(!(await vu()), `un article au panier : le bouton « Vides » s'efface`);
await p.evaluate(() => viderPanier());

// Boutique sans consigne : pas de bouton
await p.evaluate(() => { DB.articles.forEach(a => { a.consigne = 0; }); renderProd(DB.articles); });
t(!(await vu()), `aucune consigne dans la boutique : pas de bouton`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
