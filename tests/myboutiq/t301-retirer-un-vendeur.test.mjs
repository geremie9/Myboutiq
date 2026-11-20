// t301 — RETIRER UN VENDEUR FERME VRAIMENT SA CAISSE (23.86).
// Feuille de route V1 (avis du 20/11/2026) : « Révoquer ce téléphone ».
// Vérifié avant : l'interrupteur de la ligne du vendeur (Équipe) ne fermait
// RIEN — Ibrahim éteint ouvrait sa caisse et vendait. Et le code équipe,
// partagé par tous les vendeurs, restait le même : un vendeur parti lisait
// toujours la boutique depuis n'importe quel téléphone.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t301');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = () => { const d = nouvelleBoutique(); d.cfg.pinVendeur = '4321'; d.cfg.pvPose = 1; return d; };

// ── 1. Le patron retire Ibrahim « pour de bon » : le code équipe change ──
const P = await ouvrirCaisse(b, port, db());
// Les réponses du patron aux deux questions, posées dans la page (une alerte
// asynchrone de la vérification du code ne doit pas les consommer).
P.p.on('dialog', d => d.dismiss());
const repondre = (l) => P.p.evaluate((l) => { window.__rep = l.slice(); window.confirm = () => !!window.__rep.shift(); window.alert = () => {}; }, l);
await repondre([true, true]);
const r1 = await P.p.evaluate(() => { window.__toasts = []; togV(1); return { actif: DB.equipe[1].actif, le: !!DB.equipe[1].retireLe, pin: DB.cfg.pinVendeur, journal: JSON.stringify(DB.journal.slice(-3)) }; });
t(r1.actif === false && r1.le, 'Ibrahim est retiré de l\'équipe (la date est gardée)');
t(r1.pin !== '4321' && /^\d{4}$/.test(r1.pin), `parti pour de bon : le code équipe change (4321 → ${r1.pin}) — il ne lira plus rien, même d'un autre téléphone`);
t(/retiré de l'équipe/.test(r1.journal) && /code equipe/.test(r1.journal), 'le journal garde les deux gestes');

// ── 2. Juste une pause : le code ne change pas ; on le remet d'une touche ──
await P.p.evaluate(() => { DB.equipe[1].actif = true; DB.cfg.pinVendeur = '4321'; });
await repondre([true, false]);
const r2 = await P.p.evaluate(() => { window.__toasts = []; togV(1); return { actif: DB.equipe[1].actif, pin: DB.cfg.pinVendeur, toast: window.__toasts.join(' ') }; });
t(r2.actif === false && r2.pin === '4321' && /en pause/.test(r2.toast), `une pause : il est éteint, le code reste (« ${r2.toast} »)`);
const r3 = await P.p.evaluate(() => { window.__toasts = []; togV(1); return { actif: DB.equipe[1].actif, toast: window.__toasts.join(' ') }; });
t(r3.actif === true && /de nouveau vendre/.test(r3.toast), `le remettre : une touche, sans question (« ${r3.toast} »)`);
await repondre([false]);
const r4 = await P.p.evaluate(() => { togV(1); return DB.equipe[1].actif; });
t(r4 === true, 'il change d\'avis à la première question : rien ne bouge');
t(P.errs.length === 0, 'aucune erreur JS (patron)' + (P.errs.length ? ' : ' + P.errs.join(' | ') : ''));
await P.ctx.close();

// ── 3. Chez Ibrahim : la nouvelle arrive, la caisse se ferme ──
const V = await ouvrirCaisse(b, port, db(), { vendeur: 'Ibrahim' });
const avant = await V.p.evaluate(() => ({ role, ecran: document.querySelector('.scr.on, .screen.active, #s-caisse.on') ? 1 : 0, caisse: document.getElementById('s-caisse').classList.contains('on') || getComputedStyle(document.getElementById('s-caisse')).display !== 'none' }));
const r5 = await V.p.evaluate(() => {
  window.__toasts = [];
  const d = JSON.parse(JSON.stringify(DB)); d.equipe[1].actif = false;   // ce que le serveur renvoie après le geste du patron
  _applyRemoteDB(d, true);
  const login = document.getElementById('s-login');
  return { role, login: !!login && getComputedStyle(login).display !== 'none', toast: window.__toasts.join(' ') };
});
t(avant.caisse, 'Ibrahim vend normalement');
t(r5.login && /retiré de l'équipe/.test(r5.toast), `la nouvelle arrive : la caisse se ferme et il est prévenu (« ${r5.toast} »)`);
// Il essaie de rentrer avec son prénom : non.
const r6 = await V.p.evaluate(() => { window.__toasts = []; _ouvrirCaisseVendeur('Ibrahim', DB.cfg.code); const sc = document.getElementById('s-caisse'); return { caisse: getComputedStyle(sc).display !== 'none' && sc.classList.contains('on'), toast: window.__toasts.join(' ') }; });
t(!r6.caisse && /retiré/.test(r6.toast), 'il ne peut plus rouvrir la caisse sur ce téléphone');
// Un vendeur actif n'est pas touché par la même arrivée de données.
const r7 = await V.p.evaluate(() => { role = 'vendeur'; nomVendeur = 'Awa'; DB.equipe.push({ id: 3, nm: 'Awa', role: 'vendeur', actif: true, perms: { vente: true } }); return _vendeurRetire(); });
t(r7 === false, 'un autre vendeur, toujours actif, continue de vendre');
t(V.errs.length === 0, 'aucune erreur JS (vendeur)' + (V.errs.length ? ' : ' + V.errs.join(' | ') : ''));
await V.ctx.close(); await b.close(); s.close();
fin();
