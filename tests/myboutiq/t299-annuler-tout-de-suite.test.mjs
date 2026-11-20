// t299 — « ANNULER », JUSTE APRÈS LA VENTE (23.85).
// Feuille de route V1 (avis du 20/11/2026), le patron : « Go ». La faute se
// voit APRÈS avoir encaissé (deux bières au lieu de trois). Avant : Ma
// journée › Dernières ventes › Annuler › confirmer, et un vendeur n'en a pas
// le droit par défaut — la vente fausse restait. Maintenant : 15 secondes,
// une touche, et le panier revient tel quel pour corriger.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t299');
const { s, port } = await serveur();
const b = await chromium.launch();

// ── 1. Le patron : l'écran vert propose d'annuler ──
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
const r1 = await vendre(p, { lignes: [[1, 2], [3, 1]], lots: [[6, 24]] });
const avant = { biere: await stock(p, 1), mc: await stock(p, 6) };
const e1 = await p.evaluate(() => { const bt = document.getElementById('succ-annul'); return { vu: !!bt && bt.offsetParent !== null && document.getElementById('succ').classList.contains('show'), txt: bt ? bt.textContent : '', h: bt ? Math.round(bt.getBoundingClientRect().height) : 0 }; });
t(e1.vu && /annuler/i.test(e1.txt) && e1.h >= 44, `sur l'écran vert : « ${e1.txt} » (${e1.h} px)`);

// ── 2. Une touche : la vente est annulée, le panier revient ──
await p.locator('#succ-annul').click();
await p.waitForTimeout(200);
const e2 = await p.evaluate((id) => { const v = DB.ventes.find(x => x.id === id); return { annulee: v.annulee, par: v.annulPar, rapide: v.annulRapide, panier: JSON.parse(JSON.stringify(panier)), lots: JSON.stringify(_grosPanier), total: calcTotal(), panOuvert: document.getElementById('ov-pan').classList.contains('show'), succ: document.getElementById('succ').classList.contains('show'), toast: window.__toasts.slice(-1)[0] || '' }; }, r1.v.id);
t(e2.annulee && e2.par === 'Patron' && e2.rapide, `la vente est marquée annulée, par « ${e2.par} » — rien n'est effacé`);
t(e2.panier['1-0'] === 2 && e2.panier['3-0'] === 1 && /24/.test(e2.lots) && e2.total === r1.v.total, `le panier revient tel quel, carton compris (${JSON.stringify(e2.panier)} · ${e2.total} F = ${r1.v.total} F)`);
t(e2.panOuvert && !e2.succ && /Corrige le panier/.test(e2.toast), `le panier s'ouvre pour corriger (« ${e2.toast} »)`);
t(await stock(p, 1) === avant.biere + 2 && await stock(p, 6) === avant.mc + 24, 'le stock est rendu (bières, et les 24 savons du carton)');

// Il corrige (3 bières) et réencaisse : une nouvelle vente, un nouveau numéro.
const r3 = await p.evaluate(async () => {
  addPanier(DB.articles.find(x => x.id === 1), 0);
  procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 50000; calcMonnaie(true);
  await encaisser();
  const v = DB.ventes[DB.ventes.length - 1];
  return { q: v.lignes.find(l => l.pid === 1).qte, num: v.num, ventes: DB.ventes.length, actives: DB.ventes.filter(x => !x.annulee).length };
});
t(r3.q === 3 && r3.ventes === 2 && r3.actives === 1 && r3.num !== r1.v.num, `corrigée : 3 bières, reçu ${r3.num} (l'annulée gardait ${r1.v.num})`);

// ── 3. Après l'écran vert, la bande en bas — elle s'efface à la vente suivante ──
const e4 = await p.evaluate(async () => {
  fermerSucces(); await new Promise(r => setTimeout(r, 400));
  const c = document.getElementById('annul-chip'), vu = c.classList.contains('show'), txt = c.textContent;
  addPanier(DB.articles.find(x => x.id === 2), 0); await new Promise(r => setTimeout(r, 400));
  return { vu, txt, apres: c.classList.contains('show'), ouvert: !!_annulRapideOuverte() };
});
t(e4.vu && /Annuler la vente/.test(e4.txt), `l'écran vert fermé, la bande reste en bas (« ${e4.txt.trim()} »)`);
t(!e4.apres && !e4.ouvert, 'il commence la vente suivante : la bande disparaît, l\'ancienne vente ne s\'annule plus d\'ici');

// ── 4. Trop tard : 15 secondes passées ──
const r5 = await vendre(p, { lignes: [[4, 1]] });
const e5 = await p.evaluate((id) => { _dernVente.t = Date.now() - 16000; window.__toasts = []; annulerDerniereVente(); return { annulee: DB.ventes.find(x => x.id === id).annulee, toast: window.__toasts.join(' ') }; }, r5.v.id);
t(!e5.annulee && /Trop tard/.test(e5.toast), `après 15 s, plus d'annulation d'une touche (« ${e5.toast} »)`);

// ── 5. À crédit : la dette d'Awa repart avec la vente ──
const r6 = await vendre(p, { lignes: [[5, 1]], mode: 'credit', client: 1, avance: 0 });
const avantCred = await p.evaluate(() => DB.clients[0].credit);
const e6 = await p.evaluate(() => { annulerDerniereVente(); return { cred: DB.clients[0].credit, cli: clientVente && clientVente.nm, panier: JSON.parse(JSON.stringify(panier)) }; });
t(avantCred === 3200 && e6.cred === 0 && e6.cli === 'Awa' && e6.panier['5-0'] === 1, `crédit : la dette d'Awa revient à ${e6.cred} F, et le panier revient avec Awa`);
await p.evaluate(() => viderPanier());
t(errs.length === 0, 'aucune erreur JS (patron)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();

// ── 6. Le vendeur, sans le droit d'annuler : SA vente, tout de suite, oui ──
const v = await ouvrirCaisse(b, port, nouvelleBoutique(), { vendeur: 'Ibrahim' });
const r7 = await vendre(v.p, { lignes: [[2, 3]] });
const e7 = await v.p.evaluate((id) => { const perm = hasPerm('annuler'); annulerDerniereVente(); const x = DB.ventes.find(y => y.id === id); return { perm, annulee: x.annulee, par: x.annulPar, panier: panier['2-0'] }; }, r7.v.id);
t(!e7.perm && e7.annulee && e7.par === 'Ibrahim' && e7.panier === 3, `Ibrahim n'a pas le droit d'annuler, mais SA vente d'il y a 2 s s'annule (par « ${e7.par} »)`);
// Un autre a pris le téléphone : non.
await v.p.evaluate(() => viderPanier());
const r8 = await vendre(v.p, { lignes: [[2, 1]] });
const e8 = await v.p.evaluate((id) => { const n = nomVendeur; nomVendeur = 'Junior'; annulerDerniereVente(); nomVendeur = n; return DB.ventes.find(y => y.id === id).annulee; }, r8.v.id);
t(!e8, 'un autre vendeur sur le téléphone ne peut pas annuler la vente d\'Ibrahim');
// Le patron le voit dans Ma journée.
const e9 = await v.p.evaluate(() => { role = 'patron'; renderRpt(); const c = document.querySelector('#rpt-cont .rpt-annul'); return c ? c.innerText : ''; });
t(/Ventes annulées/i.test(e9) && /1 vente/.test(e9) && /par Ibrahim/i.test(e9), `Ma journée du patron : « ${e9.replace(/\s+/g, ' ').trim()} »`);
t(v.errs.length === 0, 'aucune erreur JS (vendeur)' + (v.errs.length ? ' : ' + v.errs.join(' | ') : ''));
await v.ctx.close(); await b.close(); s.close();
fin();
