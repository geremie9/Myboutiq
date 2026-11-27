// t354 — LES FORMULES D'ABONNEMENT (24.33).
// Le patron, 27/11 : Gratuit (la caisse, pour toujours) ; Pro 3 000 F/mois ;
// Grossiste 5 000 F/mois, 3 boutiques puis 1 000 F par boutique ; crédits ;
// fondateurs 3 mois offerts puis 2 000 F/mois. Rien ne se ferme avant le
// 1er janvier 2027 ; la formule se pose côté serveur (admin_formule).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t354');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
const { p, errs } = await ouvrirCaisse(b, port, d);
const abo = o => p.evaluate(o => { localStorage.setItem('myboutiq_abo', JSON.stringify(Object.assign({ code: DB.cfg.code }, o))); return formuleBoutique(); }, o);

let f = await abo({ plan: 'gratuit', cree: new Date().toISOString() });
t(f.plan === 'gratuit' && f.essai === 30 && f.avantLancement, `boutique créée aujourd'hui : formule Gratuit, 30 jours d'essai Pro, avant le lancement`);
t(await p.evaluate(() => estPro()), `avant le 1er janvier 2027, tout le monde passe (rien ne se ferme)`);
f = await abo({ plan: 'pro', jusqu: '2027-03-01', cree: '2026-08-01T00:00:00Z' });
t(f.plan === 'pro' && f.paye && f.essai === 0, `Pro payé jusqu'au 1er mars 2027 : payé, essai fini`);
t(await p.evaluate(() => _montantAbo('grossiste', 5)) === 7000 && await p.evaluate(() => _montantAbo('grossiste', 2)) === 5000, `Grossiste : 3 boutiques à 5 000, 5 boutiques = 5 000 + 2 × 1 000 = 7 000`);

// L'écran « Mon abonnement »
await abo({ plan: 'gratuit', cree: new Date().toISOString() });
const ecr = await p.evaluate(() => { ouvrirMonAbonnement(); const c = document.getElementById('abo-corps'); return { cartes: c.querySelectorAll('.ab-f').length, txt: c.innerText.replace(/\s+/g, ' ') }; });
t(ecr.cartes === 3 && /3[  ]?000.*mois/.test(ecr.txt) && /5[  ]?000.*mois/.test(ecr.txt) && /0 F/.test(ecr.txt), `trois formules : Gratuit 0 F, Pro 3 000/mois, Grossiste 5 000/mois`);
t(/gratuit jusqu’au 1ᵉʳ janvier 2027/.test(ecr.txt) && /Essai Pro : encore 30 jours/.test(ecr.txt) && /Offre fondateurs.*3 mois de Pro offerts.*2 000 F\/mois à vie/.test(ecr.txt), `« gratuit jusqu'au 1er janvier 2027 », l'essai, l'offre fondateurs`);
t(/la caisse continue/.test(ecr.txt) && /bientôt/.test(ecr.txt), `crédits finis : la caisse continue ; la semaine : « bientôt »`);
// « Je veux le Grossiste » avec 5 boutiques : le message dit la formule et le bon montant
const msg = await p.evaluate(() => { DB.boutiques = [1, 2, 3, 4, 5].map(i => ({ id: i, nm: 'B' + i, code: 'X' + i })); let u = ''; window.open = x => { u = x; }; ecrireAbonnement('grossiste'); return decodeURIComponent(u.split('text=')[1] || ''); });
t(/Grossiste — 7.?000 FCFA par mois \(5 boutiques\)/.test(msg) && /Code : MARI0001/.test(msg), `le message WhatsApp : « ${msg.split('\n')[2]} »`);
await p.evaluate(() => closeSheet('ov-abo'));

// Les Réglages : la ligne est là pour le patron
const ligne = await p.evaluate(() => { DB.boutiques = DB.boutiques.slice(0, 1); goSt(); const r = document.getElementById('row-abo'); return { vu: r.style.display !== 'none', s: document.getElementById('st-abo-s').textContent }; });
t(ligne.vu && /Essai Pro · encore 30 jours/.test(ligne.s), `Réglages → « Mon abonnement » : « ${ligne.s} »`);

// Le panneau admin : la formule part au serveur par admin_formule
const rpc = await p.evaluate(async () => { const appels = []; supa = { rpc: (n, a) => { appels.push([n, a]); return Promise.resolve({ data: [{ code: a.p_code, nom: 'Yana', plan: a.p_plan }], error: null }); } }; _abonnes = [{ code: 'YANA0001', nom: 'Yana', plan: 'gratuit' }]; await poserFormule('YANA0001', 'fondateur'); supa = null; return { appels, plan: _abonnes[0].plan }; });
t(rpc.appels.length === 1 && rpc.appels[0][0] === 'admin_formule' && rpc.appels[0][1].p_plan === 'fondateur' && rpc.plan === 'fondateur', `admin : « Fondateur » choisi → admin_formule(YANA0001, fondateur)`);

// Le site dit les prix
const site = await p.evaluate(() => [document.getElementById('vp-l2').textContent, document.getElementById('vp-l3').textContent].join(' | '));
t(/Pro — 3 000 F\/mois/.test(site) && /Grossiste — 5 000 F\/mois.*1 000 F par boutique/.test(site), `le site : « ${site.slice(0, 70)}… »`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
