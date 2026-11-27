// t357 — UN SEUL PRIX, ET LA PORTE PRO DU 1ᵉʳ JANVIER (24.37).
// Capture du patron (27/11) : Réglages › « Gérer l'abonnement » montrait
// encore l'écran d'avant — Pro à 1 000 F, Business, « 50 articles max »,
// semestriel −10 % — pendant que « Mon abonnement » disait 3 000 F.
// Et son « Go » : la porte Pro (nouveaux vendeurs, dictée) à partir du
// 1ᵉʳ janvier 2027, les fondateurs automatiques (3 mois offerts), sans
// jamais fermer ce qui marche.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t357');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique(); d.cfg.pays.c = 'XAF';
const { p, errs } = await ouvrirCaisse(b, port, d, { testeur: false });

// ── L'écran « Abonnement » ──
const ecran = await p.evaluate(() => {
  goScreen('s-settings'); goScreen('s-abonnement');
  const txt = document.getElementById('s-abonnement').innerText;
  const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
  const r = document.querySelector('#s-abonnement .hback');
  const st = getComputedStyle(r);
  return { txt, duree: vis('abo-duree-sect'), payer: vis('pmnt-sect'), col: st.color };
});
t(/3.?000/.test(ecran.txt) && /5.?000/.test(ecran.txt) && /Grossiste/.test(ecran.txt), `l'écran montre les formules d'aujourd'hui (Pro 3 000, Grossiste 5 000)`);
t(!/1.?000\s*F?CFA?\s*\/mois|Business|50 articles|Semestriel/i.test(ecran.txt) && !ecran.duree && !ecran.payer, `plus de Pro à 1 000 F, de Business, de « 50 articles max » ni de semestriel`);
t(/255,\s*255,\s*255/.test(ecran.col), `le « Retour » du haut se lit sur l'écran sombre (${ecran.col})`);
const deux = await p.evaluate(() => { ouvrirMonAbonnement(); const a = document.getElementById('abo-corps').innerText; closeSheet('ov-abo'); return a.replace(/\s+/g, ' ').slice(0, 120) === document.querySelector('#plans-cont .ab-ecran').innerText.replace(/\s+/g, ' ').slice(0, 120); });
t(deux, `« Mon abonnement » et « Gérer l'abonnement » disent la même chose`);

// ── Avant le 1ᵉʳ janvier : rien ne se ferme ──
const avant = await p.evaluate(() => { window.__wa = []; window.open = u => { window.__wa.push(u); }; partagerCode(); return { pro: estPro(), wa: window.__wa.length }; });
t(avant.pro && avant.wa === 1, `avant le 1ᵉʳ janvier : inviter un vendeur ouvre WhatsApp comme avant`);

// ── Après le lancement, boutique créée après les fondateurs, essai fini ──
const apres = await p.evaluate(() => {
  ABO_PAYANT_DES = '2020-01-01'; ABO_FONDATEURS_AVANT = '2020-06-01';
  DB.cfg.origine = { cree: new Date(Date.now() - 40 * 86400000).toISOString() };
  window.__wa = [];
  const pro = estPro();
  partagerCode();
  const ov = document.getElementById('ov-abo'), msg = (document.querySelector('#abo-corps .ab-porte') || {}).textContent || '';
  const r1 = { pro, wa: window.__wa.length, ouvert: ov.classList.contains('show'), msg };
  closeSheet('ov-abo');
  inviterVendeur(1);                                   // Ibrahim, déjà dans l'équipe
  r1.reinvite = window.__wa.length;
  DICTEE_POUR_TOUS = true; r1.dictee = dicteeCommandesPermise(); DICTEE_POUR_TOUS = false;
  return r1;
});
t(!apres.pro, `après le lancement, essai de 30 jours fini, pas fondateur : pas Pro`);
t(apres.wa === 0 && apres.ouvert && /vendeurs.*Pro.*continuent/i.test(apres.msg), `un nouveau vendeur : les formules s'ouvrent avec « ${apres.msg.slice(0, 70)}… »`);
t(apres.reinvite === 1, `réinviter un vendeur déjà dans l'équipe passe toujours (rien de ce qui marche ne ferme)`);
t(apres.dictee === false, `la dictée rouverte à tous serait réservée au Pro`);
const essai = await p.evaluate(() => { DB.cfg.origine = { cree: new Date(Date.now() - 5 * 86400000).toISOString() }; return { pro: estPro(), j: formuleBoutique().essai }; });
t(essai.pro && essai.j === 25, `boutique de 5 jours : essai Pro, encore ${essai.j} jours`);
const fond = await p.evaluate(() => {
  ABO_FONDATEURS_AVANT = '2026-12-31';
  DB.cfg.origine = { cree: '2026-11-20T10:00:00Z' };
  const r = { avant: estPro() };
  delete DB.cfg.origine; r.sansDate = estPro();
  ouvrirMonAbonnement(); r.etat = document.querySelector('#abo-corps .ab-etat').textContent; closeSheet('ov-abo');
  return r;
});
t(fond.avant && fond.sansDate, `boutique d'avant le 31/12/2026 (ou sans date) : fondateur, Pro offert`);
t(/Fondateur.*1er avril 2027|Fondateur.*1ᵉʳ avril 2027/.test(fond.etat), `l'écran le lui dit : « ${fond.etat} »`);
const paye = await p.evaluate(() => {
  ABO_FONDATEURS_AVANT = '2020-06-01'; DB.cfg.origine = { cree: new Date(Date.now() - 40 * 86400000).toISOString() };
  const j = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  localStorage.setItem('myboutiq_abo', JSON.stringify({ code: DB.cfg.code, plan: 'pro', jusqu: j }));
  return estPro();
});
t(paye, `formule Pro payée (posée par l'administrateur) : Pro`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
