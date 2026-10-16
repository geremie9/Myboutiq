// Captures réelles de MyBoutiQ (23.24) pour la vidéo longue. Tout passe par
// les vraies fonctions de l'app (vendre, encaisser…) ; seules les dates
// d'échéance des clients sont posées à la main (un crédit d'il y a 3 jours).
import { chromium, serveur, couperInternet } from '/home/user/Myboutiq/tests/myboutiq/lib.mjs';
import { vendre } from '/home/user/Myboutiq/tests/myboutiq/caisse.mjs';
const OUT = process.argv[2] || '/tmp/claude-0/-home-user-Myboutiq/45e65699-4ae2-5a4d-8635-1ddca2cb6b4b/scratchpad/video/captures/png/';
const SEUL = process.argv[3] || '';
import fs from 'node:fs'; fs.mkdirSync(OUT, { recursive: true });
const { s, port } = await serveur();
const b = await chromium.launch();
const A = (id, nm, px, pa, stk, x) => Object.assign({ id, nm, e: '📦', cat: 'Alimentation', px, pa, stk0: stk, al: 0, vd: 0, vr: [] }, x || {});
const boutique = (x) => Object.assign({
  cfg: { lang: 'fr', nom: 'Alimentation La Grâce', tel: '+237677000000', pin: '123456', s: 'FCFA', d: 'XAF', secteur: 'boutique',
    code: 'GRAC0001', plan: 'gratuit', pays: { cc: '237', nm: 'Cameroun', fl: '🇨🇲', s: 'FCFA', d: 'XAF' },
    venteDeverrouillee: false, premiereVenteVue: true, demarrageFini: true, facon: 'detail' },
  articles: [
    A(1, 'Riz', 600, 500, 80, { um: 'kg' }), A(2, 'Sucre', 800, 680, 40),
    A(3, 'Huile diamaor 1 L', 1300, 1150, 24, { umSac: 12, umCont: 'carton', pxGros: 14500, paGros: 13500 }),
    A(4, 'Savon Azur', 300, 240, 96, { cat: 'Ménage', umSac: 24, umCont: 'carton', pxGros: 6800, paGros: 5800 }),
    A(5, 'Lait Peak', 500, 400, 30), A(12, 'Pain', 200, 150, 20),
    A(7, 'Bière Castel 65 cl', 650, 540, 48, { cat: 'Boissons', umSac: 12, umCont: 'casier', pxGros: 7400, paGros: 6500 }),
    A(8, 'Guinness 33 cl', 700, 580, 24, { cat: 'Boissons' }), A(9, 'Coca Cola 50 cl', 400, 320, 36, { cat: 'Boissons' }),
    A(10, 'Sardine', 450, 380, 3, { al: 6 }), A(11, 'Tomate Elena', 250, 200, 2, { al: 10 }),
    A(6, 'Cube Maggi', 25, 18, 400), A(13, 'Allumettes', 25, 18, 100, { cat: 'Ménage' }), A(14, 'Spaghetti', 350, 290, 40),
  ],
  boutiques: [{ id: 1, nm: 'Alimentation La Grâce', code: 'GRAC0001', secteur: 'boutique', actif: true, ventes: 0 }], boutiqueCourante: 0,
  clients: [{ id: 1, nm: 'Mama Brigitte', tel: '677111111', credit: 0, points: 0, hist: [] }, { id: 2, nm: 'Jean Mbarga', tel: '699222333', credit: 0, points: 0, hist: [] },
    { id: 3, nm: 'Paul Ndi', tel: '655444555', credit: 0, points: 0, hist: [] }, { id: 4, nm: 'Awa', tel: '670888999', credit: 0, points: 0, hist: [] }],
  equipe: [{ id: 1, nm: 'Grâce', role: 'patron', bg: '#FFF', tc: '#000', actif: true }, { id: 2, nm: 'Ibrahim', role: 'vendeur', bg: '#EEE', tc: '#333', actif: true, perms: { vente: true } }],
  fournisseurs: [{ id: 1, nm: 'Ets Fotso (grossiste)', tel: '+237699000111' }], ventes: [], depenses: [], appros: [], objectif: 0, fondsDepart: 10000, nextId: 200, journal: [], stats: {},
}, x || {});

async function ouvrir(db, { vendeur = null, url = '/index.html', brut = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-FR', timezoneId: 'Africa/Douala', hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}${url}`); await p.waitForTimeout(1500);
  if (brut) return { ctx, p };
  await p.evaluate(([db, vendeur]) => {
    window.__toasts = []; window.showToast = m => window.__toasts.push(m); window.parler = () => {}; window.confirm = () => true;
    supa = null; _suppressSync = true; _demarre = true;
    try { localStorage.setItem('myboutiq_photos_proposees', '1'); } catch (e) {}
    DB = migrateDBData(db);
    if (vendeur) _ouvrirCaisseVendeur(vendeur, DB.cfg.code); else { role = 'patron'; lancerApp(); }
  }, [db, vendeur]);
  await p.waitForTimeout(700);
  return { ctx, p };
}
// Écran propre : sans bandeau de liaison (le banc n'a pas de serveur), sans annonce, sans message.
const propre = p => p.evaluate(() => {
  if (!document.getElementById('sans-bandeau')) { const st = document.createElement('style'); st.id = 'sans-bandeau'; st.textContent = '#conn-bar{display:none!important}'; document.head.appendChild(st); }
  ['conn-bar', 'annonce-banner', 'update-banner', 'toast', 'cai-install', 'cai-bio'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  document.querySelectorAll('.toast,#toast').forEach(e => { e.classList.remove('show'); e.style.opacity = '0'; });
});
const RECTS = {};
const sondes = (p, pr) => p.evaluate(pr => {
  const out = {};
  for (const [k, q] of Object.entries(pr)) {
    let el = null;
    if (q.startsWith('txt:')) {
      const t = q.slice(4); let best = null;
      document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return;
        if (getComputedStyle(e).visibility === 'hidden') return;
        if ((e.textContent || '').includes(t) && (!best || r.width * r.height < best.r.width * best.r.height)) best = { e, r }; });
      el = best && best.e;
    } else el = [...document.querySelectorAll(q)].find(e => { const r = e.getBoundingClientRect(); return r.width && r.height; });
    if (el) { const r = el.getBoundingClientRect(); out[k] = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }
    else out[k] = null;
  }
  return out;
}, pr);
const shot = async (p, nom, pr) => { if (SEUL && !nom.includes(SEUL)) return; await propre(p); await p.waitForTimeout(250); await p.screenshot({ path: OUT + nom + '.png' });
  if (pr) RECTS[nom] = await sondes(p, pr); console.log('📸', nom, pr ? JSON.stringify(RECTS[nom]) : ''); };
const journee = async p => {
  // Une matinée de vente, par la vraie caisse.
  await vendre(p, { lignes: [[1, 3], [2, 1]], mode: 'especes', recu: 3000 });
  await vendre(p, { lignes: [[7, 4]], mode: 'orange' });
  await vendre(p, { lots: [[4, 24]], mode: 'especes', recu: 7000 });
  await vendre(p, { lignes: [[5, 2], [12, 3]], mode: 'mtn' });
  await vendre(p, { lignes: [[3, 2], [6, 10]], mode: 'especes', recu: 3000 });
  await vendre(p, { lignes: [[8, 3], [9, 2]], mode: 'especes', recu: 3000 });
  await vendre(p, { lots: [[7, 12]], mode: 'credit', client: 1, avance: 0 });
  await vendre(p, { lignes: [[2, 3], [1, 5], [14, 3]], mode: 'credit', client: 2, avance: 1000 });
  await vendre(p, { lignes: [[9, 5]], mode: 'credit', client: 3, avance: 0 });
  await vendre(p, { lignes: [[10, 2], [11, 3]], mode: 'especes', recu: 2000 });
  await p.evaluate(() => {
    const j = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const c = id => DB.clients.find(x => x.id === id);
    c(1).date = j(-3); c(2).date = j(5); c(3).date = j(0);
    save(); try { fermerSucces(); } catch (e) {} try { renderProd(DB.articles); } catch (e) {}
  });
};

// 1 — le site
{ const { ctx, p } = await ouvrir(null, { url: '/?site', brut: true }); await p.waitForTimeout(800); await shot(p, '01-site', { creer: 'txt:Créer ma boutique — c', badge: 'txt:Fait au Cameroun' }); await ctx.close(); }
// 2 — créer sa boutique
{ const { ctx, p } = await ouvrir(null, { brut: true });
  await p.goto(`http://127.0.0.1:${port}/?site`); await p.waitForTimeout(1200);
  await p.evaluate(() => { try { ouvrirDepuisVitrine('new'); } catch (e) { console.log(e.message); } }); await p.waitForTimeout(900);
  await shot(p, '02-creer', { commencer: 'txt:Commencer l', onglet: 'txt:Créer ma boutique', connecter: 'txt:Déjà inscrit' }); await ctx.close(); }
// 3 — choisir en photos (boutique vide)
{ const { ctx, p } = await ouvrir(boutique({ articles: [] }));
  await p.evaluate(() => ouvrirChoixArticles()); await p.waitForTimeout(1500);
  await p.waitForTimeout(500); await shot(p, '03-photos', { grille: 'txt:Les plus courants', titre: 'txt:Qu\'est-ce que tu vends' });
  await ctx.close(); }
// 4–7 — la caisse, une vente
{ const { ctx, p } = await ouvrir(boutique());
  await shot(p, '04-caisse', { lait: '#pc-5', pain: '#pc-12', huile: '#pc-3', grille: '#pgrid' });
  await p.evaluate(() => { const i = document.getElementById('src-c'); i.value = 'Ndolé'; filtrC('Ndolé'); });
  await p.waitForTimeout(600); await p.evaluate(() => document.querySelectorAll('#pgrid img').forEach(i => { i.style.visibility = 'hidden'; }));
  await shot(p, '22-recherche', { champ: '#src-c', grille: '#pgrid' });
  await p.evaluate(() => { const i = document.getElementById('src-c'); i.value = ''; filtrC(''); });
  await p.evaluate(() => { viderPanier(); const a = id => DB.articles.find(x => x.id === id); addPanier(a(5), 0); addPanier(a(5), 0); addPanier(a(12), 0); });
  await p.waitForTimeout(400); await shot(p, '05-panier', { barre: '#fcart', enc: '#btn-enc', lait: '#pc-5' });
  await p.evaluate(() => { procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 2000; calcMonnaie(true); }); await p.waitForTimeout(500);
  await shot(p, '06-paiement', { modes: 'txt:Moov', monnaie: 'txt:Monnaie à rendre', recu: '#calc-recu' });
  await p.evaluate(async () => { await encaisser(); }); await p.waitForTimeout(500);
  await shot(p, '07-succes', { det: '#succ-det', recu: '#succ-recu' });
  await ctx.close(); }
// 8 — gros et détail ; 9 — le panier (prix négociable)
{ const d = boutique(); d.cfg.facon = 'gros';
  const { ctx, p } = await ouvrir(d); await shot(p, '08-gros', { savon: '#pc-4', barre: '#pc-4 .pbas', haut: '#pc-4 .ppr-ov' });
  await p.evaluate(() => { viderPanier(); const a = id => DB.articles.find(x => x.id === id); addPanier(a(1), 0); addPanier(a(1), 0); _ajouterLot(a(4), 24); });
  await p.waitForTimeout(300); await p.evaluate(() => ouvrirPanier()); await p.waitForTimeout(600); await shot(p, '09-panier', { ligne: 'txt:FCFA 6 800 × 1 carton', total: 'txt:TOTAL' });
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); ouvrirNego(Object.keys(panier).find(k => k.startsWith('4'))); const i = document.getElementById('ng-inp'); i.value = '6500'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.waitForTimeout(500); await shot(p, '23-nego', { champ: '#ng-inp', titre: '#ng-nm' });
  await ctx.close(); }
// 10–17 — une journée de vente : crédit, dépenses, clôture, rapports, stock
{ const { ctx, p } = await ouvrir(boutique());
  await journee(p);
  await p.evaluate(() => { viderPanier(); const a = id => DB.articles.find(x => x.id === id); addPanier(a(2), 0); addPanier(a(1), 0); clientVente = DB.clients[3]; procederPmt(); selPmntVente('credit'); });
  await p.waitForTimeout(500); await shot(p, '10-credit', { credit: 'txt:Crédit', reste: 'txt:Restera dû' });
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); clientVente = null; navTo('clients', document.querySelectorAll('#s-caisse .bnav .ni')[3]); });
  await p.waitForTimeout(600); await shot(p, '11-clients', { tete: '.cli-tot', brigitte: 'txt:En retard de 3 j' });
  await p.evaluate(() => { ouvrirDetCli(1); const i = document.getElementById('cli-pmt'); i.value = '5000'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.waitForTimeout(600); await shot(p, '24-client', { dette: '#cli-d-dette', pmt: '#cli-pmt' });
  await p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
  await p.evaluate(() => navTo('caisse', document.querySelector('#s-clients .bnav .ni'))); await p.waitForTimeout(400);
  await p.evaluate(() => { ouvrirDep(); document.getElementById('dep-amt').value = '1500'; selDC('transp', document.getElementById('dep-c-transp')); document.getElementById('dep-nm').value = 'Moto-taxi marché'; });
  await p.waitForTimeout(400); await shot(p, '12-depense', { montant: '#dep-amt', transport: '#dep-c-transp' });
  await p.evaluate(() => { const bt = [...document.querySelectorAll('#ov-dep button')].find(x => /enregistrer|ajouter|valider/i.test(x.textContent)); if (bt) bt.click(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); ouvrirClot(); const att = caisseAttendue(); const i = document.getElementById('inp-compt'); i.value = att; i.dispatchEvent(new Event('input', { bubbles: true })); try { calcEcart(); } catch (e) {} });
  await p.waitForTimeout(500); await shot(p, '13-cloture', { attendue: 'txt:Caisse attendue', ecart: 'txt:Équilibrée' });
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); navTo('rapports', document.querySelectorAll('#s-caisse .bnav .ni')[2]); });
  await p.waitForTimeout(800); await shot(p, '14-rapports', { ess: '.rpt-ess', benef: 'txt:Bénéfice NET', detail: 'txt:Chiffre d', periodes: 'txt:7 jours' });
  await p.evaluate(() => { try { ouvrirValeur(); } catch (e) {} }); await p.waitForTimeout(700); await shot(p, '15-valeur', { vaut: 'txt:Ta boutique vaut', lignes: 'txt:Crédits à recevoir' });
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); navTo('stock', document.querySelector('#s-rapports .bnav .ni-stock')); });
  await p.waitForTimeout(700); await shot(p, '16-stock', { sardine: 'txt:Sardine', valeur: 'txt:Ta marchandise vaut', inventaire: 'txt:Faire l\'inventaire' });
  await p.evaluate(() => filtreStock('cmd')); await p.waitForTimeout(500); await shot(p, '17-commander', { liste: 'txt:articles à commander', envoyer: 'txt:Envoyer la liste' });
  await p.evaluate(() => { try { ouvrirPerm(1); } catch (e) { console.log(e.message); } }); await p.waitForTimeout(700); await shot(p, '18-inviter', { titre: 'txt:Permissions', encaisser: 'txt:Encaisser des ventes', produits: 'txt:Ajouter/modifier des produits' });
  await ctx.close(); }
// 19 — le vendeur
{ const { ctx, p } = await ouvrir(boutique(), { vendeur: 'Ibrahim' }); await shot(p, '19-vendeur', { entete: '.mhdr' }); await ctx.close(); }
// 20 — hors ligne
{ const { ctx, p } = await ouvrir(boutique());
  await ctx.setOffline(true); await p.evaluate(() => { window.dispatchEvent(new Event('offline')); try { majBandeauConnexion(); } catch (e) {} });
  await p.waitForTimeout(800);
  await p.evaluate(() => { ['annonce-banner', 'update-banner', 'toast'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; }); });
  await p.screenshot({ path: OUT + '20-horsligne.png' }); RECTS['20-horsligne'] = await sondes(p, { bandeau: '#conn-bar' }); console.log('📸 20-horsligne'); await ctx.close(); }
// 21 — le micro
{ const { ctx, p } = await ouvrir(boutique());
  await p.evaluate(() => {
    const sr = window.__sr = { cur: null };
    function FSR() { this._on = false; this._res = []; sr.cur = this; }
    FSR.prototype.start = function () { this._on = true; const z = this; setTimeout(() => z.onstart && z.onstart(), 0); };
    FSR.prototype.stop = FSR.prototype.abort = function () { this._on = false; };
    sr.dire = t => { const z = sr.cur, x = [{ transcript: t }]; x.isFinal = true; z._res.push(x); z.onresult({ resultIndex: z._res.length - 1, results: z._res }); };
    window.SpeechRecognition = FSR; window.webkitSpeechRecognition = FSR;
    micLongPress(null); micTape();
  });
  await p.waitForTimeout(400); await p.evaluate(() => __sr.dire('mbolo ma tanti donne moi deux castel')); await p.waitForTimeout(500);
  await shot(p, '21-micro', { etat: '#ec-etat', castel: '#pc-7', mic: '#btn-mic' }); await ctx.close(); }
fs.writeFileSync(OUT + '../rects.json', JSON.stringify(RECTS, null, 1));
await b.close(); s.close();
