// t308 — L'APP PARLE À CELUI QUI VEND (23.93).
// Le patron, le 20/11/2026 : « moi je veux que l'app parle à son utilisateur,
// dynamisme ». Avant : éteinte par défaut (23.75, « à la demande »), et elle
// ne disait que la monnaie, les guides et quelques erreurs.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t308');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique(); d.objectif = 3000;
d.articles.push({ id: 40, nm: 'Mützig 65 cl', e: '', cat: 'Boissons', px: 650, pa: 520, stk0: 6, al: 0, vd: 0 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
await p.evaluate(() => { parler = window.__parlerVrai; window.__dit = []; window.speechSynthesis.speak = u => window.__dit.push(u.text); window.speechSynthesis.cancel = () => {}; Object.keys(localStorage).filter(k => k.startsWith('myboutiq_bonjour_')).forEach(k => localStorage.removeItem(k)); });
const dits = () => p.evaluate(() => { const l = window.__dit.slice(); window.__dit = []; return l.join(' | '); });

// ── 1. Elle parle par défaut, et dit bonjour au premier geste du jour ──
t(await p.evaluate(() => voixActive() && DB.cfg.voix === undefined), 'sans réglage posé, l\'app parle');
await p.mouse.click(200, 300); await p.waitForTimeout(700);
let dit = await dits();
t(/Bonjour Marie|Bonsoir Marie/.test(dit) && /journée de vente|On continue/.test(dit), `au premier geste : « ${dit} »`);
await p.mouse.click(200, 320); await p.waitForTimeout(700);
await p.evaluate(() => _direBonjour()); await p.waitForTimeout(100);
t(!/Bonjour|Bonsoir/.test(await dits()), 'une seule fois par jour, même si on la rappelle');

// ── 2. Après une vente : merci, le montant, la monnaie ; la première du jour ──
await vendre(p, { lignes: [[40, 2]], recu: 2000 });
dit = await dits();
t(/Première vente de la journée/.test(dit) && /Merci ! 1300 francs|Merci ! mille trois cents francs/i.test(dit) && /Rends 700 francs|Rends sept cents francs/i.test(dit), `première vente : « ${dit} »`);
// Trouvé en route : l'annonce de monnaie en retard disait « Rends 2000 francs » APRÈS la vente (panier vide).
t(!/Rends 2000/.test(dit), 'la monnaie n\'est pas redite fausse après la vente (avant : « Rends 2000 francs », calculé sur un panier vide)');

// ── 3. L'objectif du jour atteint, et le stock qui s'épuise ──
await vendre(p, { lignes: [[40, 2]] });
dit = await dits();
t(!/Première vente/.test(dit) && /plus que 2 Mützig/.test(dit), `le stock qui baisse se dit : « ${dit} »`);
await vendre(p, { lignes: [[4, 1]] });     // l'huile à 1 300 : 2 600 + 1 300 ≥ 3 000
dit = await dits();
t(/Objectif du jour atteint/.test(dit), `l'objectif franchi : « ${dit} »`);
await vendre(p, { lignes: [[40, 2]] });
dit = await dits();
t(/Mützig 65 cl est épuisé/.test(dit), `le dernier vendu : « ${dit} »`);

// ── 4. Les dizaines de ventes ──
for (let i = 0; i < 6; i++) await vendre(p, { lignes: [[2, 1]] });
const tout = await p.evaluate(() => _ditJournal.join(' | '));
t(/10 ventes aujourd'hui, continue/.test(tout), 'à la dixième vente : « 10 ventes aujourd\'hui, continue ! »');

// ── 5. Le soir, la journée en une phrase ──
await dits();
await p.evaluate(() => { validerClot(); });
dit = await dits();
t(/Journée fermée\. 10 ventes/.test(dit) && /francs vendus/.test(dit) && /à demain/.test(dit), `à la clôture : « ${dit} »`);

// ── 6. Coupée d'un geste : silence, et elle s'en souvient ──
await p.evaluate(() => { basculerVoix(); window.__dit = []; });
await vendre(p, { lignes: [[2, 1]] });
t(await dits() === '' && await p.evaluate(() => DB.cfg.voix === false && !voixActive()), 'coupée : plus un mot après la vente, et le réglage est gardé');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
