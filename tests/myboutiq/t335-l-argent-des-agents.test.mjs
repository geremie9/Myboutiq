// t320 — L'ARGENT : CE QUE LES AGENTS DE TEST ONT TROUVÉ (24.03).
// Le patron, le 25/11/2026 : « mets quelques agents IA à 10 simulations… et
// fais-moi une proposition de correction des bugs ». Cinq agents, dix
// journées de boutiquier jouées dans la vraie app. Ce banc garde ce qu'ils ont
// prouvé, chacun mesuré avant la correction.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t320');
const { s, port } = await serveur();
const b = await chromium.launch();
const V = (id, nm, px) => ({ id, nm, px, pa: Math.round(px * 0.8), stk0: 30, qBase: 1 });
const d = nouvelleBoutique();
d.cfg.nom = 'Dépôt Papa Fotso';
d.articles[0].consigne = 100;   // Bière 65 cl à 650, bouteille consignée 100
d.articles.push({ id: 50, nm: 'Savon', e: '', cat: 'Ménage', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Azur', 300), V(2, 'Palmida', 250)] });
d.articles.push({ id: 51, nm: 'Top', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Ananas', 350), V(2, 'Orange', 350)] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
await p.evaluate(() => { parler = window.__parlerVrai; window.__dit = []; window.speechSynthesis.speak = u => window.__dit.push(u.text); window.speechSynthesis.cancel = () => {}; });
const dit = () => p.evaluate(() => { const l = window.__dit.join(' | '); window.__dit = []; return l; });

// ── 1. La monnaie compte la consigne ──
await vendre(p, { lignes: [[1, 3]], consigne: { prises: 3 }, recu: 3000 });
let succ = await p.evaluate(() => document.getElementById('succ').innerText.replace(/\s+/g, ' '));
let parole = await dit();
t(/rends 750/.test(succ.replace(/[  ]/g, ' ')) && !/1 050/.test(succ), `3 bières + 3 consignes, reçu 3 000 : l'écran dit « rends 750 » (avant : 1 050) — « ${succ.slice(0, 80)} »`);
t(/Rends 750 francs/.test(parole) && /2250 francs/.test(parole), `la voix aussi : « ${parole} »`);

// ── 2. La pastille « Annuler la vente » ne passe plus sur une feuille ──
await p.evaluate(() => fermerSucces());
await p.waitForTimeout(400);
const chip1 = await p.evaluate(() => getComputedStyle(document.getElementById('annul-chip')).display);
await p.evaluate(() => ouvrirDep());
await p.waitForTimeout(450);
const chip2 = await p.evaluate(() => { const c = document.getElementById('annul-chip'); const r = c.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) || document.elementFromPoint(195, 690); return { vu: getComputedStyle(c).display !== 'none', dessous: el ? (el.closest('#annul-chip') ? 'pastille' : 'feuille') : '' }; });
t(chip1 !== 'none' && !chip2.vu && chip2.dessous !== 'pastille', `sur la caisse : la pastille est là ; la dépense ouverte : elle disparaît (avant : une tape dessus annulait la vente payée)`);
await p.evaluate(() => closeSheet('ov-dep'));

// ── 3. La dépense : « Autre » par défaut ──
const cat = await p.evaluate(() => { ouvrirDep(); document.getElementById('dep-amt').value = '1000'; saveDep(); closeSheet('ov-dep'); const x = DB.depenses[DB.depenses.length - 1]; return x && x.cat; });
t(cat === 'autre', `une dépense sans catégorie touchée : « ${cat} » (avant : « loyer »)`);

// ── 4. Le nom du patron sur ses ventes ──
const vend = await p.evaluate(() => DB.ventes[DB.ventes.length - 1].vendeur);
t(vend === 'Patron', `la vente du patron est signée « ${vend} » (avant : « Dépôt », le 1er mot du nom de la boutique)`);

// ── 5. La pastille fantôme « 1 ✕ » ──
await p.evaluate(() => { viderPanier(); varQtys = {}; });
await p.evaluate(() => { venteRapideSorte(50, 1); });
await vendre(p, { lignes: [], recu: 1000 }).catch(() => {});
await p.evaluate(async () => { if (!DB.ventes.length || Object.keys(panier).length) { procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 1000; calcMonnaie(true); await encaisser(); } try { fermerSucces(); } catch (e) {} renderProd(DB.articles); });
const fant = await p.evaluate(() => [...document.querySelectorAll('#pc-51 .vt-badge, #pc-51 .pt-s i')].length);
t(fant === 0, `après la vente d'un Savon Azur, la famille Top n'affiche aucun « 1 ✕ » (avant : sa sorte n°1 en portait un)`);

// ── 6. La monnaie du matin, et la clôture qui tombe juste ──
await p.evaluate(() => { _dernVente = null; ouvrirClot(); });
const avant = await p.evaluate(() => caisseAttendue());
await p.fill('#clot-fonds-inp', '5000');
const apres = await p.evaluate(() => caisseAttendue());
t(apres === avant + 5000, `« Monnaie du matin » : 5 000 tapés à la clôture → caisse attendue ${avant} → ${apres}`);
await p.fill('#inp-compt', String(apres));
const ec = await p.evaluate(() => { calcEcart(); return document.getElementById('ecart-lbl').textContent; });
t(/Équilibrée/.test(ec), `il compte ${apres} : « ${ec} » (avant : « Excédent +5 000 » chaque soir)`);
const lendemain = await p.evaluate(() => { DB.fonds.jour = 'Mon Jan 01 2001'; return fondsDuJour(); });
t(lendemain === 0, 'le lendemain, la monnaie du matin repart de zéro (elle vaut pour CE jour)');
await p.evaluate(() => { DB.fonds.jour = new Date().toDateString(); closeSheet('ov-clot'); });
// La fusion garde la plus récente.
const fz = await p.evaluate(() => { const a = JSON.parse(JSON.stringify(DB)), o = JSON.parse(JSON.stringify(DB)); a.fonds = { jour: 'x', amt: 1000, ts: 1 }; o.fonds = { jour: 'x', amt: 7000, ts: 2 }; return mergeDB(a, o).fonds.amt; });
t(fz === 7000, 'deux téléphones : la monnaie du matin la plus récente gagne (mergeDB)');

// ── 7. La clôture : le mobile money, c'est le mobile money ──
await vendre(p, { lignes: [[2, 2]], mode: 'credit', client: 1, avance: 500 });
await p.evaluate(() => { try { fermerSucces(); } catch (e) {} });
await vendre(p, { lignes: [[3, 1]], mode: 'orange' });
await p.evaluate(() => { try { fermerSucces(); } catch (e) {} _dernVente = null; ouvrirClot(); });
const det = await p.evaluate(() => document.getElementById('clot-det').innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));
const attMob = await p.evaluate(() => { const pb = paiementBreakdown(getCaisseSales()); return { mob: pb.orange + pb.mtn + pb.moov, cre: pb.credit }; });
const mm = (det.match(/mobile money \(hors caisse\) ([\d ]+)/) || [])[1];
t(mm && Number(mm.replace(/\D/g, '')) === attMob.mob, `« Ventes mobile money » = ${mm} = le vrai Orange Money (avant : total − espèces, crédit compris)`);
t(/Crédit accordé/.test(det), `le crédit a sa ligne à part : « ${(det.match(/Crédit accordé[^0-9]*[\d ]+/) || [''])[0]} »`);
await p.evaluate(() => closeSheet('ov-clot'));

// ── 8. Annuler dit combien rendre ──
await vendre(p, { lignes: [[1, 3]], consigne: { prises: 3 }, recu: 3000 });
await p.evaluate(() => { try { fermerSucces(); } catch (e) {} _dernVente = null; window.__dit = []; });
const idc = await p.evaluate(() => DB.ventes[DB.ventes.length - 1].id);
const sub = await p.evaluate(id => { annulerVente(id); return document.getElementById('conf-sub').textContent.replace(/[  ]/g, ' '); }, idc);
t(/Rends 2 250/.test(sub), `la fenêtre d'annulation : « ${sub} » (avant : « 1 950 — Le stock sera restitué. »)`);
const tst = await p.evaluate(() => { window.__toasts = []; confirmerAnnulVente(); return window.__toasts.join(' / ').replace(/[  ]/g, ' '); });
parole = await dit();
t(/Rends 2 250/.test(tst) && /Rends 2250 francs/.test(parole), `annulée : « ${tst} » ; dit : « ${parole} »`);
const idk = await p.evaluate(() => DB.ventes.find(v => v.paiement && v.paiement.mode === 'credit' && !v.annulee).id);
const tk = await p.evaluate(id => { window.__toasts = []; annulerVente(id); confirmerAnnulVente(); return window.__toasts.join(' / ').replace(/[  ]/g, ' '); }, idk);
t(/Rends 500 FCFA à Awa/.test(tk), `le crédit avec 500 F d'avance, annulé : « ${tk} » (avant : « Vente annulée, stock restitué »)`);

// ── 9. La grille ne bouge pas pendant qu'il vend ──
await p.evaluate(() => { goScreen('s-caisse'); renderProd(DB.articles); });
const ordre = () => p.evaluate(() => [...document.querySelectorAll('#pgrid > [id^="pc-"]')].map(x => x.id).slice(0, 9).join(','));
const o1 = await ordre();
for (const id of [7, 6, 5, 7, 6, 7]) await vendre(p, { lignes: [[id, 1]] });
await p.evaluate(() => { try { fermerSucces(); } catch (e) {} renderProd(DB.articles); });
const o2 = await ordre();
t(o1 === o2, `six ventes plus tard, la grille n'a pas bougé (avant : 11 tuiles sur 12 changeaient de place)`);
await p.evaluate(() => { goScreen('s-stock'); goScreen('s-caisse'); renderProd(DB.articles); });
const o3 = await ordre();
t(o3 !== o2, 'revenu à la caisse depuis un autre écran : l\'ordre se refait (ce qui a été touché remonte)');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
