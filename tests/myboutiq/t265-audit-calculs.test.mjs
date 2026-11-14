// t265 — L'AUDIT DES CALCULS du 14/11 (23.48). « Est-ce que vraiment vous avez
// regardé s'il n'y a pas d'erreurs de calcul, ou de potentielles erreurs à
// l'avenir ? » Trois journées difficiles rejouées dans la vraie caisse, chaque
// chiffre recalculé à la main. Tout tombait juste, sauf trois choses.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, nombre, ligneRapport as ligne } from './caisse.mjs';
const { t, fin } = compteur('t265');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique({ fondsDepart: 5000 });
db.articles.push({ id: 8, nm: 'Sucre', e: '📦', cat: 'Divers', px: 700, pa: 560, stk0: 50, al: 0, vd: 0, vr: [], um: 'kg' });
const { ctx, p, errs } = await ouvrirCaisse(b, port, db);
const rembourser = (id, montant, mode) => p.evaluate(([id, montant, mode]) => { ouvrirDetCli(id); if (mode) document.getElementById('remb-m-' + mode).click(); const el = document.getElementById('cli-pmt'); el.value = montant; el.dispatchEvent(new Event('input')); document.getElementById('btn-enreg-pmt').click(); document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); }, [id, montant, mode]);
const annuler = id => p.evaluate(id => { window.__toasts = []; annulerVente(id); confirmerAnnulVente(); document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); return (window.__toasts || []).join(' | '); }, id);
const tiroir = () => p.evaluate(() => ({ att: caisseAttendue(), esp: totalEspecesJour(), remb: totalRembEspecesJour(), awa: DB.clients[0].credit }));

// ── 1. Les centimes cachés d'une vente au kilo ──
const kg = q => p.evaluate(async q => { viderPanier(); const a = DB.articles.find(x => x.id === 8); ouvrirQteMesure(a); document.getElementById('qte-inp').value = q; validerQte(); document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); const tot = calcTotal(); procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 500; calcMonnaie(true); await encaisser(); document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); return { tot, garde: DB.ventes[DB.ventes.length - 1].total }; }, q);
const k = await kg(0.35);
t(k.tot === 245 && k.garde === 245, `0,35 kg à 700 F : la vente garde 245, pas 244,99999999999997 (${k.garde})`);
for (let i = 0; i < 9; i++) await kg(0.35);
const somme = await p.evaluate(() => DB.ventes.reduce((a, w) => a + w.total, 0));
t(somme === 2450 && (await tiroir()).esp === 2450, `dix ventes de 0,35 kg : 2 450 F tout rond (${somme})`);

// ── 2. Annuler une vente à crédit déjà remboursée en partie ──
const c = await vendre(p, { lignes: [[4, 1]], mode: 'credit', client: 1, avance: 300 });     // 1 300, avance 300, doit 1 000
await rembourser(1, 500, 'especes');
const av = await tiroir();
t(av.att === 5000 + 2450 + 300 + 500 && av.awa === 500, `avant : Awa a donné 300 + 500, la caisse attend ${av.att}, elle doit encore ${av.awa}`);
const dit = await annuler(c.v.id);
const ap = await tiroir();
t(ap.awa === 0, 'la vente annulée, Awa ne doit plus rien');
t(ap.att === 5000 + 2450, `ses 800 F ne sont plus attendus dans le tiroir (${ap.att}) — avant la 23.48 il en restait 500, sans explication`);
t(/Rends/.test(dit) && /800/.test(dit.replace(/[^\dA-Za-zÀ-ÿ ]/g, '')) && /Awa/.test(dit), `l'app dit quoi lui rendre : « ${dit} »`);
const enc = await p.evaluate(() => DB.encaissements.map(e => ({ amt: e.amt, cli: e.clientId, rendu: !!e.rendu })));
t(enc.length === 2 && enc[1].amt === -500 && enc[1].cli === null && enc[1].rendu, 'la sortie est une ligne à part (−500, en espèces), sans client : la synchro ne la relit pas comme un remboursement');
// La synchro (migration + rapprochement) ne recrée pas de dette.
const apresSync = await p.evaluate(() => { DB = migrateDBData(mergeDB(JSON.parse(JSON.stringify(DB)), DB)); return { awa: DB.clients[0].credit, att: caisseAttendue(), n: DB.encaissements.length }; });
t(apresSync.awa === 0 && apresSync.att === ap.att && apresSync.n === 2, 'après une fusion avec un autre téléphone : toujours 0 de dette, même caisse, pas de doublon');
// Une vente à crédit JAMAIS remboursée s'annule comme avant.
const c2 = await vendre(p, { lignes: [[3, 1]], mode: 'credit', client: 1, avance: 0 });
const dit2 = await annuler(c2.v.id);
t((await tiroir()).att === ap.att && !/Rends/.test(dit2) && (await p.evaluate(() => DB.encaissements.length)) === 2, 'une vente à crédit jamais remboursée s\'annule comme avant, sans ligne de sortie');
// Deux dettes, une seule annulée : on ne rend pas l'argent de l'autre.
const d1 = await vendre(p, { lignes: [[2, 1]], mode: 'credit', client: 1, avance: 0 });       // doit 600
const d2 = await vendre(p, { lignes: [[5, 1]], mode: 'credit', client: 1, avance: 0 });       // doit 3 200 → 3 800
await rembourser(1, 600, 'especes');                                                          // reste 3 200
const dit3 = await annuler(d1.v.id);                                                          // 600 annulés : reste 2 600, rien à rendre
const z = await tiroir();
t(z.awa === 2600 && !/Rends/.test(dit3), `deux dettes, une annulée : sa dette baisse (${z.awa}) et rien n'est sorti du tiroir tant qu'elle doit plus que la vente annulée`);

// ── 3. Les dettes remboursées par mobile money, dans le rapport du jour ──
await rembourser(1, 200, 'mtn');
await vendre(p, { lignes: [[7, 5]], mode: 'mtn' });                                           // 500 par MTN
await p.evaluate(() => { _rptPer = 'jour'; renderRpt(); });
t(nombre(await ligne(p, 'MTN MoMo')) === 500, 'la ligne « MTN MoMo » reste celle des ventes (500)');
t(nombre(await ligne(p, 'remboursées par mobile money')) === 200, `et le rapport dit aussi les dettes remboursées par mobile money (${await ligne(p, 'remboursées par mobile money')})`);
t(nombre(await ligne(p, 'à compter')) === (await tiroir()).att, 'les espèces à compter restent celles de la clôture');
// ── 4. « Elle vaut 25 millions, il y a certainement un biais » ──
// Ses données : Huile d'arachide vendue 800 F, prix d'achat 50 000 F (le prix du
// bidon, tapé comme prix d'une unité), 493 en stock → 24 650 000 F à elle seule.
const val0 = await p.evaluate(() => _valeurStock());
const val1 = await p.evaluate(() => { DB.articles.push({ id: 60, nm: "Huile d'arachide", e: '📦', cat: 'Divers', px: 800, pa: 50000, stk0: 493, al: 0, vd: 0, vr: [] }); DB = migrateDBData(DB); return _valeurStock(); });
t(val1.val === val0.val && val1.aber === 1 && val1.sansPa === val0.sansPa + 1, `un prix d'achat impossible (50 000 F pour un article vendu 800 F) n'est plus multiplié par le stock : ${Math.round(val1.val)} F, pas ${Math.round(val0.val + 493 * 50000)} F`);
await p.evaluate(() => { navTo('stock', document.querySelectorAll('.ni')[1]); }); await p.waitForTimeout(400);
const lien = await p.evaluate(() => (document.querySelector('.stkv-trou') || {}).textContent || '');
t(/à corriger/.test(lien) && /pas compté/.test(lien), `le Stock le dit et mène à l'article : « ${lien} »`);
await p.evaluate(() => filtreStock('sanspa')); await p.waitForTimeout(300);
t(/Huile d'arachide/.test(await p.evaluate(() => document.getElementById('s-stock').textContent)), 'le filtre montre l\'article à corriger');
// Corrigé (50 000 F le bidon de 100 → 500 F l'unité), il compte de nouveau.
const val2 = await p.evaluate(() => { DB.articles.find(a => a.id === 60).pa = 500; return _valeurStock(); });
t(val2.val === val0.val + 493 * 500 && val2.aber === 0, `corrigé à 500 F l'unité, il compte : +${493 * 500} F`);
// Vendre un peu à perte reste un vrai prix d'achat (pas « impossible »).
t(await p.evaluate(() => { const a = DB.articles.find(x => x.id === 60); a.pa = 900; const r = _valeurArticle(a); return r.val === 493 * 900 && !r.aber; }), 'un article vendu un peu à perte (acheté 900, vendu 800) garde sa valeur');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
