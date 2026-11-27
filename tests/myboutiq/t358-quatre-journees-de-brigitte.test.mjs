// t358 — QUATRE JOURNÉES DE MAMAN BRIGITTE, DE LA CRÉATION À LA FIN.
// Le patron, 27/11 : « donne-moi 4 journées complexes d'un commerçant, de la
// création jusqu'à la fin… joue-les au banc ». Le scénario est le PDF
// « MyBoutiQ — 4 journées » : chaque montant qu'il annonce à la clôture est
// vérifié ici, par les VRAIS gestes de la caisse (panier, paiement,
// encaisser, vides, dépenses, dettes, annulation, synchro, clôture).
//
// Ce que le banc ne peut pas jouer (installation, empreinte, notification du
// matin, WhatsApp réel) est couvert ailleurs ou côté serveur ; ici on tient
// l'argent, le stock et les dettes de bout en bout, sur deux téléphones.
//
// La boutique part de ce que le catalogue laisse après la création (25
// articles en photos, AUCUN stock compté) : c'est l'état initial, pas une
// vente fabriquée.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t358');
const { s, port } = await serveur();
const b = await chromium.launch();

const A_ = (id, nm, px, pa, x) => Object.assign({ id, nm, e: '', cat: 'Alimentation', px, pa, stk0: 0, al: 0, vd: 0, vr: [], rt: true }, x || {});
const d = nouvelleBoutique({ fondsDepart: 10000, clients: [] });
delete d.cfg.sansStock;                                   // le défaut : pas de vente sans stock
Object.assign(d.cfg, { nom: 'Chez Brigitte', code: 'BRIG0001' });
d.boutiques = [{ id: 1, nm: 'Chez Brigitte', code: 'BRIG0001', secteur: 'boutique', actif: true, ventes: 0 }];
d.articles = [
  A_(1, 'Pain', 150, 100), A_(2, 'Œuf', 100, 60), A_(3, 'Pain chargé', 300, 0),
  A_(4, 'Sucrerie', 0, 0, { vr: [{ id: 1, nm: 'Coca', px: 600, pa: 450, rt: true, qBase: 1 }, { id: 2, nm: 'Fanta', px: 600, pa: 450, rt: true, qBase: 1 }] }),
  A_(5, 'Lait sachet', 150, 100), A_(6, 'Sucre en morceaux', 850, 700), A_(7, 'Riz (kg)', 600, 450), A_(8, 'Riz kopo', 250, 190),
  A_(9, 'Huile 1 L', 1300, 1100), A_(10, 'Savon Azur', 650, 500, { umSac: 24, umCont: 'carton', pxGros: 13000, paGros: 12000 }),
  A_(11, '33 Export', 700, 550, { consigne: 100 }), A_(12, 'Cube Maggi', 25, 15), A_(13, 'Lait Nido', 3200, 2800), A_(14, 'Omo', 150, 100),
];
const A = await ouvrirCaisse(b, port, d);

// ── Les gestes ─────────────────────────────────────────────────────
// Une vente : le panier (clé « article-sorte »), puis la feuille de paiement.
const vente = (P, o) => P.p.evaluate(async (o) => {
  window.__toasts = []; negEnCours = null;
  document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  viderPanier(); clientVente = null;
  for (const [k, q] of Object.entries(o.k || {})) {
    const [pid, vid] = k.split('-'), a = DB.articles.find(x => String(x.id) === pid);
    const v = vid && vid !== '0' ? a.vr.find(x => String(x.id) === vid) : null;
    for (let i = 0; i < q; i++) addPanier(a, v || 0);
  }
  for (const [id, n] of (o.lots || [])) _ajouterLot(DB.articles.find(x => x.id === id), n);
  if (o.libre) panierLibre.push({ id: 'L' + Date.now(), nm: o.libre.nm, px: o.libre.px });
  if (o.nego) { for (const [k, px] of Object.entries(o.nego)) { ouvrirNego(k); document.getElementById('ng-inp').value = px; validerNego(); } }
  if (o.client) clientVente = DB.clients.find(c => c.nm === o.client) || null;
  procederPmt();
  if (o.consigne) chgConsigne('prises', o.consigne);
  if (o.remise) { const w = document.getElementById('rem-wrap'); if (w) w.style.display = 'block'; document.getElementById('rem-inp').value = o.remise; calcRemiseVente(); }
  const mode = o.mode || 'especes';
  selPmntVente(mode);
  if (mode === 'credit' && o.avance != null) { document.getElementById('cred-avance').value = o.avance; try { calcCreditVente(); } catch (e) {} }
  if (o.split) { toggleSplitVente(); selSplitMode(o.split.moyen); document.getElementById('split-especes').value = o.split.especes; calcSplitVente(); }
  if (mode === 'especes' && !o.split) { document.getElementById('calc-recu').value = Math.ceil(calcAPayer() / 1000) * 1000; calcMonnaie(true); }
  const neg = !!negEnCours, avant = DB.ventes.length;
  await encaisser();
  try { fermerSucces(); } catch (e) {}
  document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  const v = DB.ventes.length > avant ? JSON.parse(JSON.stringify(DB.ventes[DB.ventes.length - 1])) : null;
  return { v, neg, toasts: window.__toasts.slice() };
}, o);
const client = (P, nm, tel) => P.p.evaluate(([nm, tel]) => { DB.clients.push({ id: Date.now(), nm, tel, credit: 0, points: 0, hist: [] }); save(); }, [nm, tel]);
const rembourser = (P, nm, montant, mode) => P.p.evaluate(([nm, montant, mode]) => {
  const c = DB.clients.find(x => x.nm === nm); ouvrirDetCli(c.id);
  if (mode) document.getElementById('remb-m-' + mode).click();
  const el = document.getElementById('cli-pmt'); el.value = montant; el.dispatchEvent(new Event('input'));
  document.getElementById('btn-enreg-pmt').click();
  document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  return c.credit;
}, [nm, montant, mode]);
const depense = (P, nm, amt, cat) => P.p.evaluate(([nm, amt, cat]) => {
  ouvrirDep(); document.getElementById('dep-c-' + cat).click(); document.getElementById('dep-src-caisse').click();
  document.getElementById('dep-nm').value = nm; document.getElementById('dep-amt').value = amt; saveDep();
  document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
}, [nm, amt, cat]);
const vides = (P, n) => P.p.evaluate(n => { ouvrirVides(); videsPas(n); validerVides(); document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); }, n);
const entree = (P, pid, vid, q) => P.p.evaluate(([pid, vid, q]) => { ajouterAppro(pid, vid, q); save(); }, [pid, vid, q]);
const annuler = (P, id) => P.p.evaluate(id => { window.__toasts = []; annulerVente(id); confirmerAnnulVente(); return { annulee: !!(DB.ventes.find(v => v.id === id) || {}).annulee, toasts: window.__toasts.slice() }; }, id);
const stk = (P, pid, vid) => P.p.evaluate(([pid, vid]) => { const a = DB.articles.find(x => x.id === pid); return vid ? stockVarDispo(a, a.vr.find(v => v.id === vid)) : getStk(a); }, [pid, vid || 0]);
// Le soir : ce que la clôture annonce, ce qu'il a compté, puis « Valider ».
const cloture = (P, compte) => P.p.evaluate(compte => {
  const ventes = getCaisseSales().filter(v => !v.annulee && !v.vides);
  const pb = paiementBreakdown(getCaisseSales());
  ouvrirClot(); document.getElementById('inp-compt').value = compte; calcEcart();
  const r = { att: caisseAttendue(), ca: ventes.reduce((s, v) => s + (Number(v.total) || 0), 0), orange: Number(pb.orange) || 0, mtn: Number(pb.mtn) || 0,
    ecart: document.getElementById('ecart-amt').textContent, lbl: document.getElementById('ecart-lbl').textContent };
  validerClot(); r.apres = caisseAttendue(); r.ouvertes = getCaisseSales().length;
  document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  return r;
}, compte);
const num = x => Number(String(x).replace(/−/g, '-').replace(/[^\d-]/g, ''));
const copie = P => P.p.evaluate(() => JSON.parse(JSON.stringify(DB)));
const recevoir = (P, distant) => P.p.evaluate(d => { DB = migrateDBData(mergeDB(d, DB)); recalcTotaux(); return DB.ventes.length; }, distant);
const sync = async (X, Y) => { await recevoir(X, await copie(Y)); await recevoir(Y, await copie(X)); };

// ══════════ JOUR 1 — LA CRÉATION, LA PREMIÈRE CLÔTURE ══════════
await A.p.evaluate(() => { DB.articles.find(x => x.id === 3).rec = [{ pid: 1, q: 1 }, { pid: 2, q: 2 }]; save(); });
await client(A, 'Awa', '677111111');
let r;
r = await vente(A, { k: { '1-0': 6 } });                                       t(r.v && r.v.total === 900, `J1 06:50 — 6 pains, stock jamais compté : vendus (${r.v && r.v.total})`);
r = await vente(A, { k: { '5-0': 2, '6-0': 1 } });                             t(r.v && r.v.total === 1150, `J1 07:10 — lait + sucre : ${r.v && r.v.total}`);
r = await vente(A, { k: { '7-0': 2, '9-0': 1 }, mode: 'credit', client: 'Awa', avance: 1000 });
t(r.v && r.v.total === 2500 && await A.p.evaluate(() => DB.clients.find(c => c.nm === 'Awa').credit) === 1500, `J1 07:40 — Awa à crédit, avance 1 000 : dette 1 500`);
r = await vente(A, { k: { '4-1': 4 }, mode: 'orange' });
t(r.v && r.v.total === 2400, `J1 09:00 — 4 Coca (famille jamais comptée, vente sans stock interdite) : vendus, Orange (${r.toasts.join('|').slice(0, 50)})`);
r = await vente(A, { lots: [[10, 24]], nego: null });
const carton = r.v;
t(carton && carton.total === 13000, `J1 10:30 — 1 carton d'Azur au prix du carton : ${carton && carton.total}`);
// Le prix négocié se tape sur la ligne : on rejoue la vente négociée (annule + refait comme au comptoir)
await annuler(A, carton.id);
r = await A.p.evaluate(async () => {
  viderPanier(); _ajouterLot(DB.articles.find(x => x.id === 10), 24);
  const k = Object.keys(panier)[0]; ouvrirNego(k); document.getElementById('ng-inp').value = 12500; validerNego();
  procederPmt(); selPmntVente('especes'); const n0 = DB.ventes.length; await encaisser(); try { fermerSucces(); } catch (e) {}
  document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  return DB.ventes.length > n0 ? DB.ventes[DB.ventes.length - 1].total : null;
});
t(r === 12500, `J1 10:30 — le carton négocié à 12 500 sur la ligne : ${r}`);
await entree(A, 11, null, 24);
r = await vente(A, { k: { '11-0': 6 }, consigne: 6 });
t(r.v && r.v.total === 4200 && Number(r.v.consigne) === 600, `J1 12:00 — 6 bières + 600 de consigne (${r.v && r.v.total} + ${r.v && r.v.consigne})`);
r = await vente(A, { k: { '1-0': 10, '12-0': 5 } });
const r2 = await vente(A, { k: { '10-0': 1 } });
t(r.v && r.v.total === 1625 && r2.v && r2.v.total === 650, `J1 13:00 — sans réseau : 10 pains + 5 cubes (1 625), 1 savon à la pièce (650)`);
r = await vente(A, { k: { '4-1': 3 }, mode: 'mtn' });
const an = await annuler(A, r.v.id);
r = await vente(A, { k: { '4-2': 3 }, mode: 'mtn' });
t(an.annulee && r.v && r.v.total === 1800, `J1 15:00 — 3 Coca annulés, 3 Fanta refaits en MTN`);
r = await vente(A, { libre: { nm: 'Recharge crédit', px: 500 } });            t(r.v && r.v.total === 500, `J1 16:00 — montant libre 500 : ${r.v && r.v.total}`);
r = await vente(A, { k: { '3-0': 4 } });
t(r.v && r.v.total === 1200 && Array.isArray(r.v.lignes[0].ing), `J1 17:30 — 4 pains chargés (recette, rien de compté) : vendus, ingrédients sur la ligne`);
t(await rembourser(A, 'Awa', 1000, 'especes') === 500, `J1 18:10 — Awa rembourse 1 000 : dette 500`);
await vides(A, 6);
await depense(A, 'Transport', 1500, 'transp');
let c = await cloture(A, 32725);
t(c.att === 33225, `J1 21:00 — espèces attendues 33 225 : ${c.att}`);
t(num(c.ecart) === -500, `J1 — compté 32 725 : écart ${c.ecart} (${c.lbl})`);
t(c.ca === 29425, `J1 — chiffre d'affaires hors consigne 29 425 : ${c.ca}`);
t(c.orange === 2400 && c.mtn === 1800, `J1 — Orange ${c.orange}, MTN ${c.mtn}`);
t(c.ouvertes === 0 && c.apres === 10000, `J1 — clôturée : la caisse repart du fond (${c.apres})`);

// ══════════ JOUR 2 — LE STOCK, LE VENDEUR, LES RUPTURES ══════════
// L'inventaire du matin (on compte ce qui est sur l'étagère).
await A.p.evaluate(() => {
  const poser = (pid, vid, n) => { const a = DB.articles.find(x => x.id === pid); const v = vid ? a.vr.find(x => x.id === vid) : null; const cur = v ? (Number(v.stk) || 0) : getStk(a); ajouterAppro(pid, vid, n - cur); };
  poser(1, null, 40); poser(2, null, 30); poser(4, 2, 3); poser(4, 1, 8); poser(11, null, 18); poser(7, null, 50); poser(8, null, 40); poser(13, null, 5); poser(9, null, 10); poser(14, null, 10); poser(10, null, 48);
  DB.equipe.find(x => x.nm === 'Ibrahim').perms = { vente: true }; save();
});
t(await stk(A, 2) === 30 && await stk(A, 3) === 15, `J2 06:00 — inventaire : 30 œufs, donc 15 pains chargés possibles (${await stk(A, 3)})`);
const B = await ouvrirCaisse(b, port, await copie(A), { vendeur: 'Ibrahim' });
await client(A, 'Tonton Paul', '699222333');
r = await vente(A, { k: { '3-0': 12 } });
t(r.v && r.v.total === 3600 && await stk(A, 2) === 6 && await stk(A, 1) === 28, `J2 07:15 — 12 pains chargés : œufs 30 → ${await stk(A, 2)}, pain 40 → ${await stk(A, 1)}`);
await sync(A, B);
r = await vente(B, { k: { '7-0': 5, '8-0': 2 } });                               t(r.v && r.v.total === 3500, `J2 08:00 — Ibrahim : 5 kg de riz + 2 kopos = ${r.v && r.v.total}`);
r = await vente(B, { k: { '4-2': 3 } });                                         t(r.v && r.v.total === 1800, `J2 09:30 — Ibrahim : 3 Fanta`);
r = await vente(B, { k: { '4-2': 2 } });
t(!r.v, `J2 09:30 — 2 Fanta de plus, stock 0 : refusé (${(r.toasts.find(x => /Pas assez|insuffisant/i.test(x)) || r.toasts.join('|')).slice(0, 60)})`);
r = await vente(A, { k: { '11-0': 12 }, consigne: 12, remise: 600, client: 'Tonton Paul', split: { especes: 5000, moyen: 'orange' } });
t(r.v && r.v.total === 7800 && Number(r.v.consigne) === 1200, `J2 10:00 — Tonton Paul : casier 8 400 − remise 600 = ${r.v && r.v.total}, + consigne ${r.v && r.v.consigne}`);
t(r.v && r.v.paiement.mode === 'mixte' && Number(r.v.paiement.especes) === 5000, `J2 10:00 — payé 5 000 espèces + le reste Orange (${JSON.stringify(r.v && r.v.paiement)})`);
t(await A.p.evaluate(() => (DB.clients.find(c => c.nm === 'Tonton Paul').points || 0) > 0), `J2 10:00 — Tonton Paul gagne des points fidélité`);
r = await vente(B, { k: { '13-0': 2 } });
const refus = await annuler(B, r.v.id);
t(!refus.annulee, `J2 11:00 — Ibrahim ne peut pas annuler (${refus.toasts.join('|').slice(0, 60)})`);
await sync(A, B);
const an2 = await annuler(A, r.v.id);
await sync(A, B);
t(an2.annulee && await B.p.evaluate(id => DB.ventes.find(v => v.id === id).annulee, r.v.id), `J2 11:00 — la patronne annule de son téléphone ; l'annulation arrive chez Ibrahim`);
r = await vente(B, { k: { '13-0': 1 } });                                        t(r.v && r.v.total === 3200, `J2 11:00 — Ibrahim refait 1 Nido`);
t(await rembourser(A, 'Awa', 500, 'mtn') === 0, `J2 12:30 — Awa paie 500 par MTN : dette 0`);
r = await vente(A, { k: { '3-0': 4 } });
t(r.neg && r.v && r.v.total === 900 && r.v.lignes[0].qty === 3, `J2 15:00 — 4 pains chargés pour 6 œufs : la tuile s'arrête à 3 et demande pour le 4ᵉ ; 3 vendus (${r.v && r.v.total})`);
const force = await A.p.evaluate(() => { window.__toasts = []; viderPanier(); panier['3-0'] = 1; const n0 = DB.ventes.length; procederPmt(); selPmntVente('especes'); encaisser(); try { fermerSucces(); } catch (e) {} document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); return { vendu: DB.ventes.length > n0, t: window.__toasts.join('|') }; });
t(!force.vendu && /Pas assez de Œuf.*il en reste 0/.test(force.t), `J2 15:00 — et forcé dans le panier, « Encaisser » refuse : « ${force.t.slice(0, 50)}… »`);
await depense(A, 'Électricité', 2000, 'elec');
await vides(A, 12);
await sync(A, B);
const mes = await B.p.evaluate(() => { _rptPer = 'jour'; renderRpt(); return document.getElementById('rpt-cont').innerText; });
t(/Mes ventes|Ce que j'ai vendu/i.test(mes), `J2 20:30 — Ibrahim voit « Mes ventes »`);
c = await cloture(A, 24800);
t(c.att === 24800 && num(c.ecart) === 0, `J2 — espèces attendues 24 800, comptées 24 800 : écart ${c.ecart}`);
t(c.ca === 20800, `J2 — chiffre d'affaires 20 800 (les deux téléphones) : ${c.ca}`);
t(c.orange === 4000 && c.mtn === 0, `J2 — Orange ${c.orange} (Tonton Paul) ; la dette d'Awa en MTN n'est pas une vente (MTN ventes ${c.mtn})`);
await sync(A, B);

// ══════════ JOUR 3 — SANS RÉSEAU, LA GROSSE COMMANDE, LE RETOUR ══════════
await client(A, 'Mme Ekane', '655444555');
// Les deux téléphones vendent sans se parler jusqu'à 11 h.
r = await vente(A, { k: { '1-0': 8, '4-1': 2 } });
const rb = await vente(B, { k: { '7-0': 5, '9-0': 1 } });
t(r.v && r.v.total === 2400 && rb.v && rb.v.total === 4300, `J3 07:00 — hors ligne : patronne 2 400, Ibrahim 4 300`);
await sync(A, B); await sync(A, B);
const nA = await A.p.evaluate(() => getCaisseSales().length), nB = await B.p.evaluate(() => getCaisseSales().length);
t(nA === 2 && nB === 2 && await stk(A, 7) === await stk(B, 7), `J3 11:00 — le réseau revient : 2 ventes de chaque côté, pas 1, pas 4 ; même stock de riz (${await stk(A, 7)})`);
await A.p.evaluate(() => { DB.articles.find(x => x.id === 2).pa = 75; save(); });
await entree(A, 2, null, 60);
await depense(A, 'Œufs (2 plateaux)', 4500, 'autre');
// La livraison du matin, payée hors caisse : le boulanger (40 pains) et la brasserie (2 casiers).
await entree(A, 1, null, 40); await entree(A, 11, null, 24);
t(await A.p.evaluate(() => DB.articles.find(x => x.id === 3).pa) === 250, `J3 11:30 — œuf à 75 : le pain chargé coûte 250`);
r = await A.p.evaluate(async () => {
  window.__toasts = []; viderPanier(); clientVente = DB.clients.find(c => c.nm === 'Mme Ekane');
  const biere = DB.articles.find(x => x.id === 11); for (let i = 0; i < 24; i++) addPanier(biere, 0);
  _ajouterLot(DB.articles.find(x => x.id === 10), 24);
  ouvrirNego('11-0'); document.getElementById('ng-inp').value = 16000; validerNego();
  const kc = Object.keys(panier).find(k => k !== '11-0'); ouvrirNego(kc); document.getElementById('ng-inp').value = 12500; validerNego();
  procederPmt(); chgConsigne('prises', 24); selPmntVente('credit'); document.getElementById('cred-avance').value = 10000; try { calcCreditVente(); } catch (e) {}
  const n0 = DB.ventes.length; await encaisser(); try { fermerSucces(); } catch (e) {}
  document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  const v = DB.ventes.length > n0 ? DB.ventes[DB.ventes.length - 1] : null;
  return { total: v && v.total, cons: v && v.consigne, dette: DB.clients.find(c => c.nm === 'Mme Ekane').credit, toasts: window.__toasts.slice() };
});
t(r.total === 28500 && Number(r.cons) === 2400, `J3 12:00 — Mme Ekane : bière négociée 16 000 + carton 12 500 = ${r.total}, consigne ${r.cons}`);
t(r.dette === 18500, `J3 12:00 — à crédit, avance 10 000 ; la consigne (2 400) se paie tout de suite (24.04) : dette ${r.dette}`);
// Le savon rapporté : l'app n'a pas de « rendre un article » — on annule et on refait.
r = await vente(A, { k: { '10-0': 3 } });
const s0 = await stk(A, 10);
await annuler(A, r.v.id);
r = await vente(A, { k: { '10-0': 2 } });
t(r.v && r.v.total === 1300 && await stk(A, 10) === s0 + 1 && s0 === 21, `J3 14:00 — 1 savon rapporté : vente annulée et refaite à 2 (1 300), le savon revient en stock (${s0} → ${await stk(A, 10)})`);
r = await vente(A, { k: { '3-0': 20 } });
t(r.v && r.v.total === 6000 && await stk(A, 2) === 20, `J3 16:00 — 20 pains chargés : œufs 60 → ${await stk(A, 2)}`);
r = await vente(A, { k: { '4-2': 4 }, mode: 'mtn' });
t(!r.v, `J3 17:00 — 4 Fanta, stock 0 : bloqué`);
await entree(A, 4, 2, 12);
r = await vente(A, { k: { '4-2': 4 }, mode: 'mtn' });                            t(r.v && r.v.total === 2400, `J3 17:00 — entrée d'un casier de Fanta, puis vendues en MTN`);
await depense(A, 'Sachets plastique', 1000, 'autre');
await sync(A, B);
c = await cloture(A, 29900);
t(c.att === 30900 && num(c.ecart) === -1000, `J3 — espèces attendues 30 900, comptées 29 900 : écart ${c.ecart}`);
t(c.ca === 44900, `J3 — chiffre d'affaires 44 900 : ${c.ca}`);
t(c.mtn === 2400, `J3 — MTN ${c.mtn}`);
await sync(A, B);

// ══════════ JOUR 4 — LA PATRONNE ABSENTE, LA FIN DE SEMAINE ══════════
r = await vente(B, { k: { '1-0': 15, '11-0': 6, '7-0': 10 }, consigne: 6 });
t(r.v && r.v.total === 12450 && Number(r.v.consigne) === 600, `J4 09:30 — Ibrahim : pains + bières + riz = ${r.v && r.v.total} + consigne ${r.v && r.v.consigne}`);
await sync(A, B);
t(await rembourser(A, 'Mme Ekane', 15000, 'orange') === 3500, `J4 11:00 — Mme Ekane paie 15 000 par Orange : reste 3 500`);
// Le téléphone d'Ibrahim tombe à l'eau : il rentre sur un autre, avec la boutique telle que le serveur l'a.
const B2 = await ouvrirCaisse(b, port, await copie(A), { vendeur: 'Ibrahim' });
t(await B2.p.evaluate(() => getCaisseSales().length) === 1, `J4 14:00 — nouveau téléphone : sa vente du matin est là`);
r = await vente(B2, { k: { '3-0': 4 } });                                        t(r.v && r.v.total === 1200, `J4 15:00 — 4 pains chargés sur le nouveau téléphone`);
await sync(A, B2);
// Inventaire du soir : l'étagère a 8 Omo, l'app en compte 10.
const omo = await A.p.evaluate(() => { const a = DB.articles.find(x => x.id === 14), av = getStk(a); ajouterAppro(14, null, 8 - av); save(); return { av, ap: getStk(a) }; });
t(omo.av === 10 && omo.ap === 8, `J4 18:00 — inventaire : Omo ${omo.av} → ${omo.ap} (écart −2)`);
c = await cloture(A, 24250);
t(c.att === 24250 && num(c.ecart) === 0, `J4 — espèces attendues 24 250, comptées 24 250 : écart ${c.ecart}`);
t(c.ca === 13650, `J4 — chiffre d'affaires 13 650 : ${c.ca}`);
t(c.orange === 0, `J4 — les 15 000 Orange de Mme Ekane sont un remboursement, pas une vente (Orange ventes ${c.orange})`);

// ── La semaine ───────────────────────────────────────────────────
const sem = await A.p.evaluate(() => {
  const v = DB.ventes.filter(x => !x.annulee && !x.vides);
  const cmd = (typeof qteVendueParArticle === 'function') ? qteVendueParArticle(7) : {};
  return { ca: v.reduce((s, x) => s + (Number(x.total) || 0), 0), dettes: DB.clients.filter(c => c.credit > 0).map(c => c.nm + ' ' + c.credit), oeufs: cmd[2] || 0, pain: cmd[1] || 0, clot: DB.ventes.filter(x => !x.annulee).every(x => x.cloturee) };
});
t(sem.ca === 108775, `la semaine : chiffre d'affaires 108 775 (${sem.ca})`);
t(sem.dettes.join() === 'Mme Ekane 3500', `dettes à la fin : ${sem.dettes.join(', ')}`);
t(sem.oeufs >= 86, `« À commander » compte les œufs partis dans les pains chargés : ${sem.oeufs}`);
t(sem.clot, `toutes les ventes de la semaine (hors annulées) sont clôturées et gardées`);
const arch = await A.p.evaluate(() => {
  const av = [1, 2, 7, 11, 14].map(id => getStk(DB.articles.find(x => x.id === id)));
  archiverAnciennesVentes(Date.now() + 86400000); DB = recomputeStock(DB);
  return { av, ap: [1, 2, 7, 11, 14].map(id => getStk(DB.articles.find(x => x.id === id))) };
});
t(JSON.stringify(arch.av) === JSON.stringify(arch.ap), `archivage de la semaine : le stock ne saute pas (${arch.av} → ${arch.ap})`);

t(A.errs.length === 0 && B.errs.length === 0 && B2.errs.length === 0, `aucune erreur JS ${A.errs.concat(B.errs, B2.errs).slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
