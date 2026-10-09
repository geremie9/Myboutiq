/* La boutique de banc et les gestes de caisse, partagés par les bancs de
   vente. Tout passe par les VRAIES fonctions de l'app (addPanier,
   procederPmt, selPmntVente, encaisser…) : on ne fabrique jamais une vente
   à la main dans DB, sinon le banc vérifierait le banc et pas la caisse. */
import { couperInternet } from './lib.mjs';

const A = (id, nm, px, pa, stk, extra) => Object.assign({ id, nm, e: '📦', cat: 'Divers', px, pa, stk0: stk, al: 0, vd: 0, vr: [] }, extra || {});
export function nouvelleBoutique(x) {
  return Object.assign({
    cfg: { lang: 'fr', nom: 'Ets Marie', tel: '+237677000000', pin: '123456', s: 'FCFA', d: 'XAF', secteur: 'boutique',
      code: 'MARI0001', plan: 'gratuit', pays: { cc: '237', nm: 'Cameroun', fl: '🇨🇲', s: 'FCFA', d: 'XAF' },
      venteDeverrouillee: true, premiereVenteVue: true, demarrageFini: true },
    articles: [
      A(1, 'Bière 65 cl', 650, 520, 48, { consigne: 100 }),
      A(2, 'Riz', 600, 500, 40),
      A(3, 'Savon Azur', 650, 500, 30),
      A(4, 'Huile', 1300, 1100, 20),
      A(5, 'Lait Nido', 3200, 2800, 12),
      // Le carton : 24 pièces à 600, ou le carton entier à 13 000.
      A(6, 'Savon Mont Claire', 600, 500, 96, { umSac: 24, umCont: 'carton', pxGros: 13000, paGros: 12000 }),
      // Un article sans prix d'achat : son bénéfice est INCONNU, jamais inventé.
      A(7, 'Piment', 100, 0, 50),
    ],
    boutiques: [{ id: 1, nm: 'Ets Marie', code: 'MARI0001', secteur: 'boutique', actif: true, ventes: 0 }], boutiqueCourante: 0,
    clients: [{ id: 1, nm: 'Awa', tel: '677111111', credit: 0, points: 0, hist: [] }],
    equipe: [{ id: 1, nm: 'Marie', role: 'patron', bg: '#FFF', tc: '#000', actif: true },
             { id: 2, nm: 'Ibrahim', role: 'vendeur', bg: '#EEE', tc: '#333', actif: true, perms: { vente: true } }],
    fournisseurs: [], ventes: [], depenses: [], appros: [], objectif: 0, fondsDepart: 0, nextId: 200, journal: [], stats: {},
  }, x || {});
}

// La caisse ouverte sur cette boutique, sans serveur, sans voix, sans
// fenêtre de confirmation. `__toasts` garde tout ce que l'app a dit.
export async function ouvrirCaisse(b, port, db, { vendeur = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR', timezoneId: 'Africa/Douala' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(1500);
  await p.evaluate(([db, vendeur]) => {
    window.__toasts = [];
    const st = window.showToast;
    window.showToast = function (m) { window.__toasts.push(String(m)); try { return st.apply(this, arguments); } catch (e) {} };
    window.parler = () => {}; window.confirm = () => true;
    supa = null; _suppressSync = true; _demarre = true;
    DB = migrateDBData(db);
    if (vendeur) _ouvrirCaisseVendeur(vendeur, DB.cfg.code); else { role = 'patron'; lancerApp(); }
  }, [db, vendeur]);
  await p.waitForTimeout(500);
  return { ctx, p, errs };
}

// Une vente complète, comme au comptoir. Rend la vente enregistrée (ou null
// si la caisse a refusé), et ce que l'app a dit pendant ce temps.
//   o.lignes [[id, qté]]   o.lots [[id, taille]]   o.libre {nm, px}
//   o.mode 'especes'|'orange'|'mtn'|'moov'|'credit'   o.client id
//   o.avance (crédit)   o.split {especes, moyen}   o.remise   o.consigne {prises, rendues}
export function vendre(p, o) {
  return p.evaluate(async (o) => {
    window.__toasts = [];
    document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
    viderPanier(); clientVente = null;
    for (const [id, q] of (o.lignes || [])) { const a = DB.articles.find(x => x.id === id); for (let i = 0; i < q; i++) addPanier(a, 0); }
    for (const [id, n] of (o.lots || [])) { const a = DB.articles.find(x => x.id === id); _ajouterLot(a, n); }
    if (o.libre) panierLibre.push({ id: 'Lbanc', nm: o.libre.nm, px: o.libre.px });
    if (o.client) clientVente = DB.clients.find(c => c.id === o.client) || null;
    procederPmt();
    if (o.consigne) { if (o.consigne.prises) chgConsigne('prises', o.consigne.prises); if (o.consigne.rendues) chgConsigne('rendues', o.consigne.rendues); }
    if (o.remise) { const w = document.getElementById('rem-wrap'); if (w) w.style.display = 'block'; document.getElementById('rem-inp').value = o.remise; calcRemiseVente(); }
    const mode = o.mode || 'especes';
    selPmntVente(mode);
    if (mode === 'credit' && o.avance != null) { document.getElementById('cred-avance').value = o.avance; try { calcCreditVente(); } catch (e) {} }
    if (o.split) { toggleSplitVente(); selSplitMode(o.split.moyen || 'orange'); document.getElementById('split-especes').value = o.split.especes; calcSplitVente(); }
    if (mode === 'especes' && !o.split) {
      document.getElementById('calc-recu').value = o.recu != null ? o.recu : Math.ceil(calcAPayer() / 1000) * 1000;
      calcMonnaie(true);
    }
    const info = (document.getElementById('rem-info') || {}).textContent || '';
    const avant = DB.ventes.length;
    await encaisser();
    document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
    const v = DB.ventes.length > avant ? JSON.parse(JSON.stringify(DB.ventes[DB.ventes.length - 1])) : null;
    return { v, toasts: window.__toasts.slice(), info };
  }, o);
}

// Le stock affiché d'un article, tel que la caisse le calcule.
export const stock = (p, id) => p.evaluate(id => getStk(DB.articles.find(x => x.id === id)), id);
