// t207 — LE SOIR : les dépenses, le rapport, la clôture, le remboursement.
// Le chiffre qui compte est celui du tiroir : fonds de départ + espèces
// encaissées (avance des crédits comprise) − dépenses payées de la caisse.
// Le rapport et la clôture doivent dire LE MÊME montant, sinon le patron
// soupçonne son vendeur pour un écart qui n'existe pas.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t207');
const { s, port } = await serveur();
const b = await chromium.launch();
// « FCFA 6 100 » → 6100 ; « -FCFA 1 500 » → -1500 (espaces fines comprises).
const nombre = x => x == null ? null : Number(String(x).replace(/−/g, '-').replace(/[^\d-]/g, ''));
// La valeur d'une ligne du rapport, trouvée par son libellé.
const ligne = (p, motif) => p.evaluate(m => {
  const re = new RegExp(m, 'i');
  for (const r of document.querySelectorAll('#rpt-cont .rrow')) {
    const l = r.querySelector('.rlbl'), v = r.querySelector('.rval');
    if (l && v && re.test(l.textContent)) return v.textContent;
  }
  return null;
}, motif);
const depense = (p, nm, amt, cat, deLaCaisse) => p.evaluate(([nm, amt, cat, c]) => {
  window.__toasts = [];
  ouvrirDep();
  document.getElementById('dep-c-' + cat).click();
  document.getElementById(c ? 'dep-src-caisse' : 'dep-src-hors').click();
  document.getElementById('dep-nm').value = nm;
  document.getElementById('dep-amt').value = amt;
  saveDep();
  document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  return window.__toasts.slice();
}, [nm, amt, cat, deLaCaisse]);

const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique({ fondsDepart: 5000 }));
// ── LA JOURNÉE ────────────────────────────────────────────────────────
await vendre(p, { lignes: [[2, 3]] });                                    // 1 800 espèces, bénéfice 300
await vendre(p, { lignes: [[5, 1]], mode: 'orange' });                    // 3 200 Orange, bénéfice 400
await vendre(p, { lignes: [[4, 1]], mode: 'credit', client: 1, avance: 300 }); // 1 300 dont 300 d'avance
await depense(p, 'Taxi marchandise', 1000, 'transp', true);
await depense(p, 'Crédit téléphone', 500, 'tel', false);
{
  const d = await p.evaluate(() => DB.depenses.map(x => ({ nm: x.nm, amt: x.amt, cat: x.cat, caisse: x.caisse })));
  t(d.length === 2 && d[0].cat === 'transp' && d[0].caisse === true && d[1].cat === 'tel' && d[1].caisse === false,
    `les deux dépenses sont notées, avec leur catégorie et leur origine (${JSON.stringify(d)})`);
  const c = await p.evaluate(() => ({ esp: totalEspecesJour(), att: caisseAttendue(), depC: totalDepCaisseJour(), dep: totalDepJour() }));
  t(c.esp === 2100, `espèces du jour : 1 800 + 300 d'avance, l'Orange n'y est pas (${c.esp})`);
  t(c.depC === 1000 && c.dep === 1500, `dépenses : 1 500 dont 1 000 sorties du tiroir (${c.dep} / ${c.depC})`);
  t(c.att === 6100, `caisse attendue : 5 000 + 2 100 − 1 000 = 6 100 (${c.att})`);
}
// ── LE RAPPORT DU JOUR ────────────────────────────────────────────────
{
  await p.evaluate(() => { _rptPer = 'jour'; renderRpt(); });
  const aCompter = await ligne(p, 'à compter');
  t(nombre(aCompter) === 6100, `Rapports › « Espèces en caisse (à compter) » = le montant de la clôture (${aCompter})`);
  const detail = await p.evaluate(() => {
    for (const r of document.querySelectorAll('#rpt-cont .rrow')) if (/à compter/.test(r.textContent)) return r.textContent.replace(/\s+/g, ' ');
    return '';
  });
  t(/fonds de départ/.test(detail) && /dépenses payées de la caisse/.test(detail), `et il dit d'où vient ce chiffre (« ${detail.slice(0, 120)} »)`);
  t(nombre(await ligne(p, 'Orange')) === 3200 && nombre(await ligne(p, 'Crédit accordé')) === 1000,
    'la répartition montre l\'Orange (3 200) et le crédit à récupérer (1 000)');
  t(nombre(await ligne(p, '^\\s*💸')) === -1500, `les dépenses du jour : toutes, de la caisse ou non (${await ligne(p, '^\\s*💸')})`);
  t(nombre(await ligne(p, 'Bénéfice NET')) === -600, `bénéfice NET : 900 − 1 500 = −600 (${await ligne(p, 'Bénéfice NET')})`);
}
// ── LA CLÔTURE ────────────────────────────────────────────────────────
{
  const att = await p.evaluate(() => { ouvrirClot(); return document.getElementById('clot-det').textContent.replace(/\s+/g, ' '); });
  t(/Caisse attendue/.test(att) && /6\s?100/.test(att.replace(/[  ]/g, ' ')), `la clôture annonce 6 100 attendus (« …${att.slice(-60)} »)`);
  t(/hors caisse/.test(att), 'elle montre à part la dépense hors caisse (le tiroir n\'y touche pas)');
  const ecart = n => p.evaluate(n => {
    document.getElementById('inp-compt').value = n; calcEcart();
    return { lbl: document.getElementById('ecart-lbl').textContent, amt: document.getElementById('ecart-amt').textContent };
  }, n);
  const e0 = await ecart(6100), e1 = await ecart(5600), e2 = await ecart(6600);
  t(/Équilibrée/.test(e0.lbl), `6 100 comptés : ${e0.lbl}`);
  t(/Déficit/.test(e1.lbl) && nombre(e1.amt) === -500, `5 600 comptés : ${e1.lbl} ${e1.amt}`);
  t(/Excédent/.test(e2.lbl) && nombre(e2.amt) === 500, `6 600 comptés : ${e2.lbl} ${e2.amt}`);
  const apres = await p.evaluate(() => {
    validerClot();
    return { ouvertes: getCaisseSales().length, cloturees: DB.ventes.filter(v => v.cloturee).length, ventes: DB.ventes.length,
      dep: DB.depenses.length, depClot: DB.depenses.filter(d => d.cloturee).length, att: caisseAttendue() };
  });
  t(apres.ouvertes === 0 && apres.cloturees === 3 && apres.ventes === 3, `clôturé : la caisse repart à zéro, les 3 ventes restent dans l'historique (${JSON.stringify(apres)})`);
  t(apres.dep === 2 && apres.depClot === 2, 'les dépenses sont gardées (marquées clôturées), pas effacées');
  t(apres.att === 5000, `le tiroir attendu redevient le fonds de départ (${apres.att})`);
  await p.evaluate(() => { _rptPer = 'mois'; renderRpt(); });
  const tx = await ligne(p, 'Transactions'), net = await ligne(p, 'Bénéfice NET');
  t(nombre(tx) === 3 && nombre(net) === -600, `« Ce mois » compte encore la journée clôturée (${tx} ventes, NET ${net})`);
}
// ── LE REMBOURSEMENT D'AWA ────────────────────────────────────────────
{
  const r = await p.evaluate(() => {
    window.__toasts = [];
    cliCours = DB.clients.find(c => c.id === 1);
    const avant = cliCours.credit;
    document.getElementById('cli-pmt').value = 1000;
    enregPmt();
    const awa = DB.clients.find(c => c.id === 1);
    return { avant, apres: awa.credit, hist: awa.hist, toasts: window.__toasts.slice(), livre: _mouvementsTresorerie() };
  });
  t(r.avant === 1000 && r.apres === 0 && r.toasts.some(m => /Crédit soldé/.test(m)), `Awa devait ${r.avant}, elle paie : crédit soldé (${r.apres})`);
  t(r.hist.some(h => h.type === 'payment' && h.amt === 1000), 'le paiement entre dans son historique');
  const remb = r.livre.filter(m => m.lib === 'Remboursement client');
  const av = r.livre.filter(m => /crédit/.test(m.lib));
  t(remb.length === 1 && remb[0].rec === 1000 && remb[0].ref === 'Awa', 'le livre de trésorerie note le remboursement de 1 000');
  t(av.length === 1 && av[0].rec === 300, `la vente à crédit n'y entre que pour son avance (${av.map(m => m.rec)})`);
  t(r.livre.filter(m => m.dep > 0).reduce((s, m) => s + m.dep, 0) === 1500, 'les deux dépenses y sont, côté sorties');
}
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();
// ── LE VENDEUR NE NOTE PAS DE DÉPENSE SANS LE DROIT ────────────────────
{
  const v = await ouvrirCaisse(b, port, nouvelleBoutique(), { vendeur: 'Ibrahim' });
  const msg = await v.p.evaluate(() => {
    window.__toasts = [];
    document.getElementById('dep-nm').value = 'Sortie'; document.getElementById('dep-amt').value = 2000;
    saveDep();
    return { toasts: window.__toasts.slice(), n: DB.depenses.length };
  });
  t(msg.n === 0 && msg.toasts.some(m => /Non autorisé/.test(m)), `sans le droit « dépenses », rien ne sort du tiroir (« ${msg.toasts.join(' / ')} »)`);
  await v.ctx.close();
}
await b.close(); s.close();
fin();
