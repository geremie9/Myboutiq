// t360 — « VISE 20/20 » (24.40). Les captures du patron (27/11), notées
// 13,5/20 : montants sans séparateur sur son téléphone (« 3000 F »,
// « 17000 »), « 2 000 F » coupé en fin de ligne, la pilule « Vides » qui
// cachait un article, l'abonnement en paragraphes, « bientôt » partout.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t360');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique(); d.cfg.pays.c = 'XAF';
const { p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });

// Les montants : groupés par l'app elle-même, comme Chrome, sans dépendre des données de langue du téléphone
const nb = await p.evaluate(() => {
  const vrai = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function () { return String(this); };     // une WebView sans données « fr »
  const r = [3000, 17000, 999, -1500, 1234567, 0.4].map(n => _nbFr(n));
  Number.prototype.toLocaleString = vrai;
  return r;
});
t(JSON.stringify(nb) === JSON.stringify(['3 000', '17 000', '999', '-1 500', '1 234 567', '0']), `sans données de langue : ${nb.join(' · ')} (espace fine insécable)`);
t(await p.evaluate(() => fmt(2000)) === '2 000 FCFA', `fmt(2000) ne se coupe jamais entre 2 et 000`);

// « Vides » : un rond comme « Parle », plus une longue pilule
const vid = await p.evaluate(() => { const e = document.getElementById('vides-chip'), r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), vu: getComputedStyle(e).display !== 'none' }; });
t(vid.vu && vid.w === vid.h && vid.w <= 66, `« Vides » est un rond de ${vid.w}×${vid.h} (la pilule faisait ~110 de large)`);

// 24.43 — la caisse gagne de la place : le premier article plus haut, « Montant libre » plus étroit
const place = await p.evaluate(() => { const c = document.querySelector('#pgrid .pcard'), ml = document.getElementById('btn-libre'); return { haut: Math.round(c.getBoundingClientRect().top), libre: Math.round(ml.getBoundingClientRect().width), txt: ml.textContent.trim() }; });
t(place.haut <= 185 && place.libre <= 100 && place.txt === 'Montant libre', `premier article à ${place.haut} px (207 avant) ; « ${place.txt} » tient en ${place.libre} px`);

// L'abonnement en images
const abo = await p.evaluate(() => {
  goScreen('s-settings'); goScreen('s-abonnement');
  const z = document.getElementById('s-abonnement');
  return { lignes: z.querySelectorAll('.ab-l .ab-li svg').length, txt: z.innerText, badge: (z.querySelector('.ab-f.mis em') || {}).textContent,
    coupe: [...z.querySelectorAll('.nw')].every(x => getComputedStyle(x).whiteSpace === 'nowrap') };
});
t(abo.lignes >= 10, `chaque avantage a son icône (${abo.lignes})`);
t(!/bientôt/.test(abo.txt) && abo.coupe, `plus de « bientôt » ; aucun montant ne se coupe`);
t(abo.badge === 'Conseillé', `le Pro est « ${abo.badge} » (pas « le plus pris » : ce serait faux)`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
