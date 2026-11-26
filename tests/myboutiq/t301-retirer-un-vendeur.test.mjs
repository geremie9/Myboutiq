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
// 24.04 — le code ne change plus à l'instant : son téléphone doit d'abord
// rendre ses ventes faites hors ligne (agent « patron + vendeur », 25/11 :
// changé tout de suite, elles ne montaient jamais).
t(r1.pin === '4321' && /^\d{4}$/.test(r1.pin), `parti pour de bon : le code reste le temps que son téléphone rende ses ventes (${r1.pin})`);
const r1b = await P.p.evaluate(() => ({ att: !!DB.equipe[1].codeAChanger, bouton: (renderEquipe(), !!document.querySelector('#equipe-lst .code-attente button')) }));
t(r1b.att, 'il attend le changement de code' + (r1b.bouton ? ' ; Équipe montre « Changer le code maintenant »' : ''));
const r1c = await P.p.evaluate(() => { DB.accuseRetrait = { ibrahim: new Date(Date.now() + 1000).toISOString() }; const ok = _verifierCodesEnAttente(); return { ok, pin: DB.cfg.pinVendeur, att: !!DB.equipe[1].codeAChanger, journal: JSON.stringify(DB.journal.slice(-3)) }; });
t(r1c.ok && r1c.pin !== '4321' && /^\d{4}$/.test(r1c.pin) && !r1c.att, `son téléphone a accusé le retrait (ses ventes sont arrivées) : le code change (4321 → ${r1c.pin})`);
t(/retiré de l'équipe/.test(r1c.journal) && /code equipe/.test(r1c.journal), 'le journal garde les deux gestes');
// Il ne revient jamais : 24 h plus tard, le code change quand même.
const r1d = await P.p.evaluate(() => { DB.cfg.pinVendeur = '4321'; DB.accuseRetrait = {}; DB.equipe[1].codeAChanger = 1; DB.equipe[1].partiLe = new Date(Date.now() - 25 * 3600e3).toISOString(); const ok = _verifierCodesEnAttente(); return { ok, pin: DB.cfg.pinVendeur }; });
t(r1d.ok && r1d.pin !== '4321', `son téléphone ne revient pas : au bout de 24 h, le code change quand même (${r1d.pin})`);

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
  return new Promise(r => setTimeout(() => {   // 24.04 — ses ventes partent d'abord, puis la caisse se ferme
    const login = document.getElementById('s-login');
    r({ role, login: !!login && getComputedStyle(login).display !== 'none', toast: window.__toasts.join(' '), accuse: !!(DB.accuseRetrait && DB.accuseRetrait.ibrahim) });
  }, 300));
});
t(avant.caisse, 'Ibrahim vend normalement');
t(r5.login && /retiré de l'équipe/.test(r5.toast), `la nouvelle arrive : la caisse se ferme et il est prévenu (« ${r5.toast} »)`);
t(r5.accuse, 'avant de fermer, son téléphone accuse le retrait (le patron saura que ses ventes sont rendues)');
// Il essaie de rentrer avec son prénom : non.
const r6 = await V.p.evaluate(async () => { window.__toasts = []; _ouvrirCaisseVendeur('Ibrahim', DB.cfg.code); await new Promise(r => setTimeout(r, 300)); const sc = document.getElementById('s-caisse'); return { caisse: getComputedStyle(sc).display !== 'none' && sc.classList.contains('on'), toast: window.__toasts.join(' ') }; });
t(!r6.caisse && /retiré/.test(r6.toast), 'il ne peut plus rouvrir la caisse sur ce téléphone');
// Un vendeur actif n'est pas touché par la même arrivée de données.
const r7 = await V.p.evaluate(() => { role = 'vendeur'; nomVendeur = 'Awa'; DB.equipe.push({ id: 3, nm: 'Awa', role: 'vendeur', actif: true, perms: { vente: true } }); return _vendeurRetire(); });
t(r7 === false, 'un autre vendeur, toujours actif, continue de vendre');
t(V.errs.length === 0, 'aucune erreur JS (vendeur)' + (V.errs.length ? ' : ' + V.errs.join(' | ') : ''));
await V.ctx.close(); await b.close(); s.close();
fin();
