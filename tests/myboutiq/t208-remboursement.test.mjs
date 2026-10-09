// t208 — LE REMBOURSEMENT D'UN CRÉDIT (22.93).
// Awa rembourse en espèces : l'argent entre dans le tiroir, la clôture doit
// l'attendre. Sinon le soir affiche un faux « Excédent » — et un vendeur
// qui note le remboursement mais garde les billets laisse une caisse
// « équilibrée ». En mobile money, rien n'entre dans le tiroir.
// Et annuler une vente à crédit n'est PAS un remboursement : le livre du
// comptable n'en fait plus une recette fantôme.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, nombre, ligneRapport } from './caisse.mjs';
const { t, fin } = compteur('t208');
const { s, port } = await serveur();
const b = await chromium.launch();

// Le geste au comptoir : ouvrir la fiche du client, taper le montant,
// choisir le moyen, toucher « Enregistrer ».
const rembourser = (p, id, montant, mode) => p.evaluate(([id, montant, mode]) => {
  window.__toasts = [];
  ouvrirDetCli(id);
  const modeOuvert = ['especes', 'orange', 'mtn', 'moov'].find(m => document.getElementById('remb-m-' + m).classList.contains('on'));
  if (mode) document.getElementById('remb-m-' + mode).click();
  const el = document.getElementById('cli-pmt'); el.value = montant; el.dispatchEvent(new Event('input'));
  const reste = document.getElementById('reste-val').textContent;
  const c = DB.clients.find(x => x.id === id), n = c.hist.length;
  document.getElementById('btn-enreg-pmt').click();
  return { modeOuvert, reste, toasts: window.__toasts.slice(), credit: c.credit, ajoute: c.hist.length - n,
    h: JSON.parse(JSON.stringify(c.hist[c.hist.length - 1])) };
}, [id, montant, mode]);
const tiroir = p => p.evaluate(() => ({ att: caisseAttendue(), esp: totalRembEspecesJour(), mob: totalRembMobileJour(), n: remboursementsDuJour().length }));
const annuler = (p, id) => p.evaluate(id => { annulerVente(id); confirmerAnnulVente(); }, id);
const livre = p => p.evaluate(() => _mouvementsTresorerie());

const CLIENTS = () => [
  { id: 1, nm: 'Awa', tel: '677111111', credit: 0, points: 0, hist: [] },
  { id: 2, nm: 'Moussa', tel: '677222222', credit: 0, points: 0, hist: [] },
  { id: 3, nm: 'Paul', tel: '677333333', credit: 0, points: 0, hist: [] },
  { id: 4, nm: 'Fatou', tel: '677444444', credit: 0, points: 0, hist: [] },
];
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique({ fondsDepart: 5000, clients: CLIENTS() }));
await vendre(p, { lignes: [[2, 3]] });                                       // 1 800 en espèces
await vendre(p, { lignes: [[5, 1]], mode: 'credit', client: 1, avance: 0 }); // Awa doit 3 200
// ── 1) EN ESPÈCES : LE TIROIR L'ATTEND ────────────────────────────────
{
  const r = await rembourser(p, 1, 1000);
  t(r.modeOuvert === 'especes', 'la fiche s\'ouvre sur « Espèces »');
  t(r.credit === 2200 && r.h.amt === 1000 && r.h.mode === 'especes', `Awa paie 1 000 en espèces : elle doit encore ${r.credit}`);
  t(!!r.h.ts && r.h.vendeur === 'Patron', `le remboursement note l'heure et qui l'a reçu (${r.h.ts ? 'ts' : '—'} / ${r.h.vendeur})`);
  const c = await tiroir(p);
  t(c.att === 7800, `tiroir attendu : 5 000 + 1 800 + 1 000 remboursés = 7 800 (${c.att})`);
}
// ── 2) EN ORANGE MONEY : RIEN N'ENTRE DANS LE TIROIR ──────────────────
{
  const r = await rembourser(p, 1, 500, 'orange');
  const c = await tiroir(p);
  t(r.credit === 1700 && r.h.mode === 'orange', `500 par Orange Money : elle doit ${r.credit}`);
  t(c.att === 7800 && c.mob === 500, `le tiroir attendu ne bouge pas (${c.att}), 500 en mobile money à part`);
}
// ── 3) IL REND LA MONNAIE : ON NE COMPTE QUE LA DETTE ─────────────────
{
  const r = await rembourser(p, 1, 2000);
  t(r.modeOuvert === 'especes', `rouverte, la fiche repart sur « Espèces » (« Orange » n'est pas resté collé)`);
  t(/rends/i.test(r.reste) && /300/.test(r.reste.replace(/\s/g, '')), `en tapant 2 000 pour 1 700 dus, la fiche dit de rendre 300 (« ${r.reste} »)`);
  t(r.h.amt === 1700 && r.credit === 0, `seuls les 1 700 dus sont notés, la dette est soldée (${r.h.amt})`);
  t(r.toasts.some(m => /Rends/.test(m) && /300/.test(m.replace(/\s/g, ''))), `et l'app rappelle les 300 à rendre (« ${r.toasts.join(' / ')} »)`);
  t((await tiroir(p)).att === 9500, 'le tiroir attend 7 800 + 1 700, pas 2 000 de plus');
}
// ── 4) UN CLIENT QUI NE DOIT RIEN ─────────────────────────────────────
{
  const r = await rembourser(p, 1, 500);
  t(r.ajoute === 0 && r.toasts.some(m => /ne doit rien/.test(m)), `Awa ne doit plus rien : refusé, rien n'est noté (« ${r.toasts.join(' / ')} »)`);
}
// ── 5) ANNULER UNE VENTE À CRÉDIT N'EST PAS UN REMBOURSEMENT ──────────
{
  const r = await vendre(p, { lignes: [[4, 1]], mode: 'credit', client: 2, avance: 0 });
  await annuler(p, r.v.id);
  const x = await p.evaluate(() => {
    const m = DB.clients.find(c => c.id === 2), h = m.hist[m.hist.length - 1];
    return { credit: m.credit, h, html: histClientHTML(m) };
  });
  t(x.credit === 0 && x.h.annul === true, 'la dette de Moussa s\'efface, l\'écriture est marquée « annulation »');
  t(/Vente annulée/.test(x.html), 'son historique dit « Vente annulée », pas « Paiement »');
  const c = await tiroir(p);
  t(c.att === 9500 && c.n === 3, `le tiroir n'attend rien de plus (${c.att}, ${c.n} remboursements du jour)`);
  t(!(await livre(p)).some(m => /^Remboursement/.test(m.lib) && /^Moussa/.test(m.ref)), 'le livre du comptable n\'invente pas de recette pour Moussa');
}
// ── 6) LE RAPPORT ET LA CLÔTURE DISENT LE MÊME CHIFFRE ────────────────
{
  await p.evaluate(() => { _rptPer = 'jour'; renderRpt(); });
  const aCompter = await ligneRapport(p, 'à compter');
  t(nombre(aCompter) === 9500, `Rapports › « à compter » = 9 500 (${aCompter})`);
  const det = await p.evaluate(() => { for (const r of document.querySelectorAll('#rpt-cont .rrow')) if (/à compter/.test(r.textContent)) return r.textContent; return ''; });
  t(/remboursements de crédit/.test(det), 'et il nomme les remboursements dans le détail');
  const clot = await p.evaluate(() => { ouvrirClot(); return document.getElementById('clot-det').textContent.replace(/[\s  ]+/g, ' '); });
  t(/Remboursements de crédit \(espèces\) ?FCFA 2 700/.test(clot), `la clôture montre + 2 700 remboursés en espèces`);
  t(/remboursements mobile money \(hors caisse\) ?FCFA 500/.test(clot), 'et les 500 Orange à part, hors caisse');
  const ec = n => p.evaluate(n => { document.getElementById('inp-compt').value = n; calcEcart(); return document.getElementById('ecart-lbl').textContent + ' ' + document.getElementById('ecart-amt').textContent; }, n);
  t(/Équilibrée/.test(await ec(9500)), '9 500 comptés : équilibrée');
  const vol = await ec(8500);
  t(/Déficit/.test(vol) && nombre(vol.split('FCFA')[1]) === -1000, `billets gardés en poche : la clôture le voit (${vol})`);
  const apres = await p.evaluate(() => { validerClot(); return { att: caisseAttendue(), n: remboursementsDuJour().length,
    clot: DB.encaissements.length === 3 && DB.encaissements.every(e => e.cloturee) }; });
  t(apres.n === 0 && apres.clot && apres.att === 5000, `clôturé : les remboursements du jour sont fermés, le tiroir repart du fonds (${apres.att})`);
}
// ── 7) LE LIVRE DE TRÉSORERIE : LE BON MOYEN DE PAIEMENT ──────────────
{
  await vendre(p, { lignes: [[3, 1]], mode: 'orange' });
  await vendre(p, { lignes: [[3, 1]], mode: 'mtn' });
  await vendre(p, { lignes: [[5, 1]], split: { especes: 1000, moyen: 'moov' } });
  const mv = await livre(p);
  const libs = mv.map(m => m.lib);
  t(libs.includes('Vente (Orange Money)') && libs.includes('Vente (MTN MoMo)'), `Orange et MTN ne sont plus écrits « espèces » (${libs.filter(l => /^Vente/.test(l)).join(' | ')})`);
  t(libs.includes('Vente (espèces + Moov Money)'), 'le paiement mixte nomme le mobile money utilisé');
  t(mv.filter(m => m.lib === 'Vente (espèces)').length === 1, 'seule la vente réellement en espèces est « espèces »');
  const remb = mv.filter(m => /^Remboursement/.test(m.lib));
  t(remb.length === 3 && remb.filter(m => m.lib === 'Remboursement client (espèces)').reduce((s, m) => s + m.rec, 0) === 2700
    && remb.some(m => m.lib === 'Remboursement client (Orange Money)' && m.rec === 500),
    `les 3 remboursements d'Awa, avec leur moyen (${remb.map(m => m.lib.replace('Remboursement client ', '') + ' ' + m.rec).join(', ')})`);
}
// ── 8) LES ANCIENNES DONNÉES (avant 22.93) ────────────────────────────
// L'ancienne app écrivait exactement la même chose, sans `annul`, sans
// moyen de paiement, sans encaissement : on les retire pour rejouer le passé.
{
  // a) Une annulation ancienne, marquée tant que la vente est là — et qui
  //    reste marquée quand la vente part aux archives.
  const v1 = await vendre(p, { lignes: [[3, 1]], mode: 'credit', client: 2, avance: 0 });   // 650 à crédit
  await annuler(p, v1.v.id);
  const x = await p.evaluate(id => {
    const m = DB.clients.find(c => c.id === 2);
    m.hist.forEach(h => { if (h.type === 'payment' && h.amt === 650) { delete h.annul; delete h.ts; } });
    DB = migrateDBData(DB);
    DB.ventes = DB.ventes.filter(v => v.id !== id);                     // archivée
    const m2 = DB.clients.find(c => c.id === 2);
    return { html: histClientHTML(m2), livre: _mouvementsTresorerie().filter(r => /^Remboursement/.test(r.lib) && /^Moussa/.test(r.ref)).length };
  }, v1.v.id);
  t(x.livre === 0, 'une annulation d\'avant 22.93 n\'est pas une recette, même quand sa vente est archivée');
  t(/Vente annulée/.test(x.html), 'et l\'historique de Moussa la dit « Vente annulée »');
  // b) Le vrai remboursement de la VEILLE n'est pas pris pour l'annulation
  //    d'une vente du jour qui aurait le même montant.
  const hier = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('fr-FR'); })();
  await vendre(p, { lignes: [[2, 1]], mode: 'credit', client: 3, avance: 0 });                // Paul : 600 hier
  await rembourser(p, 3, 600);                                                                // remboursés hier
  const v2 = await vendre(p, { lignes: [[2, 1]], mode: 'credit', client: 3, avance: 0 });   // 600 aujourd'hui…
  await annuler(p, v2.v.id);                                                                  // …annulés
  const y = await p.evaluate(hier => {
    const c = DB.clients.find(c => c.id === 3), pmt = c.hist.filter(h => h.type === 'payment');
    const cr = c.hist.find(h => h.type === 'credit');
    cr.date = hier;                                                    // la vente de la veille
    const vrai = pmt[0]; vrai.date = hier; delete vrai.mode; delete vrai.ts; delete vrai.vendeur; delete vrai.enc;
    DB.encaissements = DB.encaissements.filter(e => e.clientId !== 3);
    delete pmt[1].annul; delete pmt[1].ts;                             // l'annulation, à l'ancienne
    DB = migrateDBData(DB);                                            // au rechargement / après une synchro
    const livre = _mouvementsTresorerie().filter(r => /^Remboursement/.test(r.lib) && /^Paul/.test(r.ref));
    const c2 = DB.clients.find(c => c.id === 3);
    return { livre, annul: c2.hist.filter(h => h.type === 'payment').map(h => !!h.annul) };
  }, hier);
  t(y.livre.length === 1 && y.livre[0].d === hier && y.livre[0].lib === 'Remboursement client',
    `le remboursement de la veille reste, sans moyen inventé (${y.livre.map(m => m.d + ' ' + m.lib)})`);
  t(JSON.stringify(y.annul) === '[false,true]', `c'est l'écriture du jour qui est reconnue comme annulation (${y.annul})`);
  t((await tiroir(p)).esp === 0, 'les anciennes écritures ne changent pas le tiroir du jour');
  // c) Une vente annulée dont la ligne « crédit » a disparu : on ne devine
  //    pas — le vrai remboursement de mars reste un remboursement.
  const v3 = await vendre(p, { lignes: [[3, 1]], mode: 'credit', client: 4, avance: 0 });   // Fatou : 650
  await annuler(p, v3.v.id);
  const z = await p.evaluate(() => {
    const f = DB.clients.find(c => c.id === 4);
    f.hist = f.hist.filter(h => h.type !== 'credit');                  // la ligne de la vente a disparu
    f.hist.forEach(h => { if (h.type === 'payment') { delete h.annul; delete h.ts; } });
    f.hist.unshift({ date: '15/03/2026', type: 'payment', amt: 650 });  // vrai remboursement, en mars
    DB = migrateDBData(DB);
    return DB.clients.find(c => c.id === 4).hist.find(h => h.date === '15/03/2026');
  });
  t(!z.annul, 'sans la ligne de sa vente, aucune écriture n\'est marquée au hasard');
}
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();
// ── 9) LE VENDEUR REÇOIT LE REMBOURSEMENT ─────────────────────────────
{
  const cl = CLIENTS(); cl[0].credit = 2000; cl[0].hist = [{ date: '01/10/2026', type: 'credit', amt: 2000 }];
  const v = await ouvrirCaisse(b, port, nouvelleBoutique({ fondsDepart: 3000, clients: cl }), { vendeur: 'Ibrahim' });
  const r = await rembourser(v.p, 1, 2000);
  const j = await v.p.evaluate(() => ({ att: caisseAttendue(), e: DB.encaissements[0], nj: DB.journal.length }));
  t(r.h.vendeur === 'Ibrahim' && j.att === 5000, `Ibrahim reçoit 2 000 : noté à son nom, attendu dans le tiroir (${j.att})`);
  t(j.e && j.e.vendeur === 'Ibrahim' && j.e.nm === 'Awa' && j.e.amt === 2000 && j.e.mode === 'especes', `l'encaissement le garde : qui, quel client, combien, comment (${j.e && [j.e.vendeur, j.e.nm, j.e.amt, j.e.mode].join(' · ')})`);
  t(j.nj === 0, 'le journal des gestes sensibles (prix, stock…) n\'est pas noyé sous les remboursements');
  t(v.errs.length === 0, 'aucune erreur JS côté vendeur' + (v.errs.length ? ' : ' + v.errs.join(' | ') : ''));
  await v.ctx.close();
}
// ── 10) DEUX TÉLÉPHONES ───────────────────────────────────────────────
// Le patron et le vendeur reçoivent chacun un remboursement d'Awa, puis se
// synchronisent. La fiche d'Awa fusionne d'un bloc : sans l'encaissement,
// l'un des deux remboursements disparaissait et la dette remontait.
{
  const cl = CLIENTS(); cl[0].credit = 3200; cl[0].hist = [{ date: '01/10/2026', type: 'credit', amt: 3200 }];
  const base = nouvelleBoutique({ fondsDepart: 5000, clients: cl });
  const A = await ouvrirCaisse(b, port, base);
  const B = await ouvrirCaisse(b, port, JSON.parse(JSON.stringify(base)), { vendeur: 'Ibrahim' });
  const copie = x => x.p.evaluate(() => JSON.parse(JSON.stringify(DB)));
  const recevoir = (x, d, sens) => x.p.evaluate(([d, sens]) => {
    DB = migrateDBData(sens === 'inverse' ? mergeDB(DB, d) : mergeDB(d, DB)); recalcTotaux();
    const a = DB.clients.find(c => c.id === 1);
    return { credit: a.credit, n: a.hist.filter(h => h.type === 'payment').length, enc: DB.encaissements.length,
      att: caisseAttendue(), ouverts: remboursementsDuJour().length, ventesOuvertes: getCaisseSales().length,
      depOuvertes: depensesDuJour().length };
  }, [d, sens || '']);
  await rembourser(A.p, 1, 1000);                 // au comptoir du patron, en espèces
  await rembourser(B.p, 1, 500, 'orange');        // chez le vendeur, par Orange
  const dB = await copie(B), dA = await copie(A);
  const ra = await recevoir(A, dB);
  t(ra.credit === 1700 && ra.n === 2 && ra.enc === 2, `chez le patron : les deux remboursements, Awa doit 3 200 − 1 000 − 500 = ${ra.credit}`);
  const rb = await recevoir(B, dA, 'inverse');
  t(rb.credit === 1700 && rb.n === 2, `chez le vendeur, dans l'autre sens : pareil (${rb.credit})`);
  const r2 = await recevoir(A, dB);
  t(r2.credit === 1700 && r2.n === 2 && r2.enc === 2, 'la même synchro reçue deux fois ne rembourse pas deux fois');
  t(ra.att === 6000, `le tiroir attend les 1 000 en espèces, pas les 500 Orange (${ra.att})`);
  await A.p.evaluate(() => { _rptPer = 'jour'; renderRpt(); });
  const ac = await ligneRapport(A.p, 'à compter');
  t(nombre(ac) === 6000, `jour sans vente, mais un remboursement : le rapport montre quand même le tiroir (${ac})`);
  // Le patron clôture ; le vendeur, en retard, n'en sait rien et renvoie
  // ses vieilles copies : la clôture ne se défait pas.
  await vendre(A.p, { lignes: [[2, 1]] });
  await A.p.evaluate(() => { DB.depenses.push({ id: genVenteId(), nm: 'Taxi', amt: 500, cat: 'transp', date: new Date().toLocaleDateString('fr-FR'), ts: new Date().toISOString(), caisse: true, vendeur: 'Patron' }); });
  const avantClot = await copie(A);                                // ce que le vendeur a reçu avant la clôture
  await A.p.evaluate(() => validerClot());
  const rc = await recevoir(A, avantClot);
  t(rc.ouverts === 0 && rc.ventesOuvertes === 0 && rc.depOuvertes === 0,
    `une copie d'avant la clôture ne rouvre rien : remboursements ${rc.ouverts}, ventes ${rc.ventesOuvertes}, dépenses ${rc.depOuvertes} ouverts`);
  t(rc.att === 5000, `le tiroir reste au fonds de départ (${rc.att})`);
  const rd = await recevoir(A, avantClot, 'inverse');
  t(rd.ouverts === 0 && rd.ventesOuvertes === 0 && rd.depOuvertes === 0, 'dans l\'autre sens de fusion non plus');
  const autres = await A.p.evaluate(() => {
    const avant = _tailleDB(DB), apres = _tailleDB(Object.assign({}, DB, { encaissements: DB.encaissements.concat([{}]) }));
    const awa = DB.clients.find(c => c.id === 1), credit = awa.credit;
    // Le même numéro de client, mais une autre personne (créée hors ligne sur l'autre téléphone).
    DB.encaissements.push({ id: genVenteId(), ts: new Date().toISOString(), date: new Date().toLocaleDateString('fr-FR'), clientId: 1, nm: 'Fatou', amt: 300, mode: 'especes', vendeur: 'Ibrahim' });
    _reconcilierEncaissements(DB);
    const r = { rafraichit: _plusGrand(avant, apres), credit: awa.credit === credit };
    DB.encaissements.pop();
    return r;
  });
  t(autres.rafraichit, 'une synchro qui n\'apporte qu\'un remboursement rafraîchit l\'écran');
  t(autres.credit, 'le remboursement de Fatou ne baisse pas la dette d\'Awa, même avec le même numéro');
  t(A.errs.length === 0 && B.errs.length === 0, 'aucune erreur JS sur les deux téléphones' + (A.errs.concat(B.errs).length ? ' : ' + A.errs.concat(B.errs).join(' | ') : ''));
  await A.ctx.close(); await B.ctx.close();
}
// ── 11) LA REMISE À ZÉRO NE REVIENT PAS PAR UN AUTRE TÉLÉPHONE ─────────
{
  const cl = CLIENTS(); cl[0].credit = 3200; cl[0].hist = [{ date: '01/10/2026', type: 'credit', amt: 3200 }];
  const base = nouvelleBoutique({ fondsDepart: 5000, clients: cl });
  const A = await ouvrirCaisse(b, port, base);
  const B = await ouvrirCaisse(b, port, JSON.parse(JSON.stringify(base)), { vendeur: 'Ibrahim' });
  await vendre(B.p, { lignes: [[2, 2]] });
  await rembourser(B.p, 1, 1000);
  const vieux = await B.p.evaluate(() => JSON.parse(JSON.stringify(DB)));
  await A.p.evaluate(d => { DB = migrateDBData(mergeDB(d, DB)); }, vieux);
  const raz = await A.p.evaluate(async () => {
    document.getElementById('raz-pin').value = '123456';
    document.getElementById('raz-dettes').checked = true;
    await lancerRaz();
    return { ventes: DB.ventes.length, enc: DB.encaissements.length, riz: getStk(DB.articles.find(a => a.id === 2)) };
  });
  t(raz.ventes === 0 && raz.enc === 0 && raz.riz === 38, `remise à zéro : plus de ventes ni d'encaissements, le stock reste 38 (${JSON.stringify(raz)})`);
  const r = await A.p.evaluate(d => {
    DB = migrateDBData(mergeDB(d, DB)); recalcTotaux();
    const awa = DB.clients.find(c => c.id === 1);
    return { ventes: DB.ventes.length, enc: DB.encaissements.length, hist: awa.hist.length, credit: awa.credit,
      riz: getStk(DB.articles.find(a => a.id === 2)), att: caisseAttendue() };
  }, vieux);
  t(r.ventes === 0 && r.enc === 0 && r.hist === 0, `le vendeur, en retard, renvoie sa vieille copie : rien ne revient (${JSON.stringify(r)})`);
  t(r.riz === 38 && r.att === 5000, `le stock n'est pas retiré deux fois (${r.riz}), le tiroir attend le fonds (${r.att})`);
  t(A.errs.length === 0 && B.errs.length === 0, 'aucune erreur JS' + (A.errs.concat(B.errs).length ? ' : ' + A.errs.concat(B.errs).join(' | ') : ''));
  await A.ctx.close(); await B.ctx.close();
}
await b.close(); s.close();
fin();
