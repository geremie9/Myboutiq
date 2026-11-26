// t336 — LE VENDEUR, LE TÉLÉPHONE PLEIN, LE MOBILE MONEY (24.04).
// Suite des dix journées de test du 25/11/2026 (agents « patron + vendeur »,
// « marché », « dépôt »). Le vendeur retiré « pour de bon » est gardé par t301
// et rejoué à deux téléphones par l'agent (11 ✅ / 0 ❌ après la correction,
// 6 / 5 avant). Ici le reste, mesuré avant la correction.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
import { fauxSupaScript } from './faux-supa.mjs';
const { t, fin } = compteur('t336');
const { s, port } = await serveur();
const b = await chromium.launch();

// ── 1. Le vendeur et l'ancien code équipe : en ligne, le serveur répond ──
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR' });
  await ctx.addInitScript(fauxSupaScript());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(1200);
  const d = nouvelleBoutique(); d.cfg.pinVendeur = '7777'; d.cfg.pvPose = 1;
  d.equipe = [{ id: 1, nm: 'Marie', role: 'patron', actif: true }, { id: 2, nm: 'Junior', role: 'vendeur', actif: true, perms: { vente: true } }];
  const r = await p.evaluate(async (d) => {
    window.__toasts = []; const st = window.showToast; window.showToast = function (m) { window.__toasts.push(String(m)); try { return st.apply(this, arguments); } catch (e) {} };
    __fs.boutiques = [{ id: 'r1', code: d.cfg.code, nom: d.cfg.nom, owner_id: 'x', actif: true, data: JSON.parse(JSON.stringify(d)) }];
    __fs.pins[d.cfg.code] = '123456'; __fs.pinsVendeur[d.cfg.code] = '7777';   // le code a changé au serveur : 4321 → 7777
    supa = window.supabase.createClient('u', 'k'); _suppressSync = true;
    const local = JSON.parse(JSON.stringify(d)); local.cfg.pinVendeur = '4321';   // le téléphone du vendeur garde l'ancien
    DB = migrateDBData(local); localStorage.setItem('myboutiq_v6', JSON.stringify(DB));
    document.getElementById('v-code').value = d.cfg.code; document.getElementById('v-nom').value = 'Junior'; document.getElementById('v-pin').value = '4321';
    await loginV();
    const ouverte = document.getElementById('s-caisse').classList.contains('on');
    return { ouverte, toast: window.__toasts.join(' / ') };
  }, d);
  t(!r.ouverte && /ne marche plus/.test(r.toast), `l'ancien code, avec du réseau : refusé (« ${r.toast} ») — avant : la caisse s'ouvrait par le cache`);
  t(errs.length === 0, 'aucune erreur JS (connexion)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2. Le téléphone plein ──
const d2 = nouvelleBoutique(); d2.articles[0].consigne = 100;
const { ctx, p, errs } = await ouvrirCaisse(b, port, d2);
await p.evaluate(() => {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { if (window.__plein && k === 'myboutiq_v6') { const e = new Error('plein'); e.name = 'QuotaExceededError'; throw e; } return orig.call(this, k, v); };
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  localStorage.setItem('myboutiq_sauv', JSON.stringify([{ t: 1, d: 'x'.repeat(10) }]));
  window.__plein = true;
});
const v1 = await vendre(p, { lignes: [[2, 2]] });
const r2 = await p.evaluate(() => ({ toast: window.__toasts.join(' / '), sec: localStorage.getItem('myboutiq_secours') || '' }));
t(/Téléphone plein/.test(r2.toast) && /Ne ferme pas/.test(r2.toast), `hors ligne, téléphone plein : « ${r2.toast.slice(0, 110)} » (avant : « gardé en ligne seulement », sans réseau)`);
t(v1.v && r2.sec.includes(v1.v.id), 'la vente est gardée de côté, dans une petite clé à part');
const v2 = await vendre(p, { lignes: [[3, 1]] });
t(/Téléphone plein/.test(await p.evaluate(() => window.__toasts.join(' '))), 'la vente suivante le redit (avant : une fois par minute)');
// Le téléphone redémarre, toujours plein de la même façon : rien n'est perdu.
const r3 = await p.evaluate(([a, b2]) => { const d = loadDB(); return { a: d.ventes.some(v => v.id === a), b: d.ventes.some(v => v.id === b2) }; }, [v1.v.id, v2.v.id]);
t(r3.a && r3.b, 'redémarré : les deux ventes sont là (avant : 2 ventes, 600 F, perdues sans un mot)');
// La place revient : la boutique s'écrit, la clé de secours s'efface.
const r4 = await p.evaluate(() => { window.__plein = false; save(); return { sec: !!localStorage.getItem('myboutiq_secours'), ok: JSON.parse(localStorage.getItem('myboutiq_v6')).ventes.length }; });
t(!r4.sec && r4.ok >= 2, 'la place revenue : la boutique s\'écrit, la clé de secours disparaît');
// Libérer sa propre place d'abord : l'app efface ses vieilles copies et réessaie.
const r5 = await p.evaluate(() => {
  const orig = Storage.prototype.setItem; let fois = 0;
  localStorage.setItem('myboutiq_sauv', 'x'.repeat(100));
  Storage.prototype.setItem = function (k, v) { if (k === 'myboutiq_v6' && localStorage.getItem('myboutiq_sauv') && fois++ < 5) { const e = new Error('plein'); e.name = 'QuotaExceededError'; throw e; } return orig.call(this, k, v); };
  window.__toasts = []; save(); Storage.prototype.setItem = orig;
  return { sauv: localStorage.getItem('myboutiq_sauv'), toast: window.__toasts.join(' ') };
});
t(!r5.sauv && !/Téléphone plein/.test(r5.toast), 'plein à cause des vieilles copies de l\'app : elles partent, la boutique s\'écrit, sans alarme');
await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }); });

// ── 3. Mobile money avec consigne : un seul montant ──
await p.evaluate(() => { DB.cfg.codesMarchand = { mtn: '654321' }; viderPanier(); for (let i = 0; i < 3; i++) addPanier(DB.articles[0], 0); procederPmt(); chgConsigne('prises', 3); selPmntVente('mtn'); });
let m = await p.evaluate(() => ({ tot: document.getElementById('calc-tot-mobile').textContent.replace(/\D/g, ''), ussd: (document.querySelector('#ussd-box .ussd-code') || {}).textContent || '' }));
t(m.tot === '2250' && /\*2250#/.test(m.ussd), `MTN : total ${m.tot} et code ${m.ussd} disent le même montant (avant : 1 950 au-dessus de …2250#)`);
await p.evaluate(() => chgConsigne('prises', 1));
m = await p.evaluate(() => ({ tot: document.getElementById('calc-tot-mobile').textContent.replace(/\D/g, ''), ussd: (document.querySelector('#ussd-box .ussd-code') || {}).textContent || '' }));
t(m.tot === '2350' && /\*2350#/.test(m.ussd), `une consigne de plus après avoir choisi MTN : ${m.tot}, ${m.ussd} (avant : le code gardait l'ancien montant)`);

// ── 4. Crédit avec consigne : la consigne se paie maintenant, on le dit ──
await p.evaluate(() => { selPmntVente('credit'); document.getElementById('cred-avance').value = 500; calcCreditVente(); });
const cr = await p.evaluate(() => document.getElementById('cred-reste').textContent.replace(/[  ]/g, ' '));
t(/consigne 400/.test(cr) && /reçois 900/.test(cr), `« ${cr} » (avant : « Restera dû : 1 450 », sans un mot des 400 F de consigne comptés en caisse)`);
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); consignePrises = 0; });
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();

// ── 5. Trois conflits de version d'affilée : pas d'alarme, on renvoie ──
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR' });
  await ctx.addInitScript(fauxSupaScript());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(1200);
  const d = nouvelleBoutique();
  const r = await p.evaluate(async (d) => {
    window.__toasts = []; const st = window.showToast; window.showToast = function (m) { window.__toasts.push(String(m)); try { return st.apply(this, arguments); } catch (e) {} };
    __fs.boutiques = [{ id: 'r1', code: d.cfg.code, nom: d.cfg.nom, owner_id: 'x', actif: true, data: JSON.parse(JSON.stringify(d)) }];
    __fs.pins[d.cfg.code] = '123456';
    supa = window.supabase.createClient('u', 'k'); _suppressSync = true; role = 'patron'; _shopPin = '123456';
    DB = migrateDBData(JSON.parse(JSON.stringify(d)));
    const rpc0 = supa.rpc.bind(supa); let conflits = 0;
    supa.rpc = async function (n, a) { if (n === 'boutique_ecrire2') { conflits++; return { data: { ok: false, motif: 'conflit' }, error: null }; } return rpc0(n, a); };
    const res = await syncToSupa();
    clearTimeout(syncTimeout);
    return { res, conflits, pend: _offlinePending, toast: window.__toasts.join(' / ') };
  }, d);
  t(r.conflits >= 1 && !/Impossible de générer/.test(r.toast) && r.pend, `${r.conflits} conflits de version : aucune alarme, renvoi prévu (avant : « ❌ Impossible de générer un code boutique unique », 4 fois sur 4) — toasts : « ${r.toast} »`);
  t(errs.length === 0, 'aucune erreur JS (synchro)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
