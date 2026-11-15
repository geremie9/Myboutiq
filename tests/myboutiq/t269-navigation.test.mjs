// t269 — LA NAVIGATION (23.51), maquette Figma du 14/11, « Go pour les 4 ».
// Quatre lieux qui disent ce qu'on y fait, chacun sa couleur ; au centre un
// geste, « Ajouter » ; en haut trois boutons au lieu de quatre.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t269');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(500);
const barre = sc => p.evaluate(sc => [...document.querySelectorAll('#' + sc + ' .bnav > *')].map(x => ({ c: x.className, t: x.innerText.replace(/\s+/g, ' ').trim(), fond: x.querySelector('.ne,i') ? getComputedStyle(x.querySelector('.ne,i')).backgroundColor : '' })), sc);
const c = await barre('s-caisse');
t(c.map(x => x.t).join(',') === 'Vendre,Stock,Ajouter,Ma journée,Dettes', `la barre du bas : ${c.map(x => x.t).join(' · ')}`);
const fonds = c.filter(x => /\bni\b/.test(x.c)).map(x => x.fond);
t(new Set(fonds).size === 4, `chaque lieu a sa couleur (${fonds.join(' / ')})`);
t(fonds[0] === 'rgb(217, 119, 6)', 'le lieu où l\'on est est plein (orange pour Vendre)');
for (const sc of ['s-stock', 's-rapports', 's-clients']) { const x = await barre(sc); t(x.length === 5 && x[2].t === 'Ajouter', `« Ajouter » au centre aussi dans ${sc.slice(2)}`); }
// Les écrans s'ouvrent toujours depuis la barre.
await p.locator('#s-caisse .ni-stock').tap(); await p.waitForTimeout(300);
t(await p.evaluate(() => document.getElementById('s-stock').classList.contains('on')), 'toucher « Stock » ouvre le stock');
// ── « Ajouter » ──
await p.locator('#s-stock .nadd').tap(); await p.waitForTimeout(400);
const ch = await p.evaluate(() => [...document.querySelectorAll('#ajr button')].map(x => x.id));
// 23.59 — « Un article en photo » s'ajoute juste après « Un article » (le patron :
// « ajouter un nouveau produit, la navigation devient complexe »).
t(ch.join(',') === 'ajr-art,ajr-aph,ajr-arr,ajr-dep,ajr-cli', `le patron peut ajouter : un article, un article en photo, un arrivage, une dépense, un client (${ch.join(', ')})`);
await p.locator('#ajr-arr').tap(); await p.waitForTimeout(400);
t(await p.evaluate(() => document.getElementById('ov-stk').classList.contains('show') && !document.getElementById('ov-ajr').classList.contains('show')), '« Un arrivage » ouvre la feuille d\'entrée de stock');
await p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
await p.locator('#s-stock .nadd').tap(); await p.waitForTimeout(300); await p.locator('#ajr-cli').tap(); await p.waitForTimeout(400);
t(await p.evaluate(() => document.getElementById('s-clients').classList.contains('on') && [...document.querySelectorAll('.ov.show')].length > 0), '« Un client » ouvre les dettes et la fiche du nouveau client');
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); navTo('caisse', document.querySelector('#s-clients .bnav .ni')); });
// ── La barre du haut ──
const haut = await p.evaluate(() => [...document.querySelectorAll('#s-caisse .mhdr .hbtn')].filter(x => getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().width > 0).map(x => (x.querySelector('.hl') || {}).textContent || x.id));
t(haut.join(',') === 'Bloqué,Alertes,Réglages' || haut.join(',') === 'Modifier,Alertes,Réglages', `en haut, trois boutons : ${haut.join(' · ')}`);
t(await p.evaluate(() => getComputedStyle(document.getElementById('fab-add')).display === 'none'), 'plus de bouton flottant « + Article » : il est au centre de la barre');
// ── En anglais ──
await p.evaluate(() => { DB.cfg.lang = 'en'; appliquerLang(); });
const en = await barre('s-caisse');
t(en.map(x => x.t).join(',') === 'Sell,Stock,Add,My day,Debts', `en anglais : ${en.map(x => x.t).join(' · ')}`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();
// ── Un vendeur : seulement ce qu'il a le droit de faire ──
const v = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true, vendeur: true });
await v.p.waitForTimeout(500);
const vch = await v.p.evaluate(() => { ouvrirAjoutRapide(); return [...document.querySelectorAll('#ajr button')].map(x => x.id); });
t(!vch.includes('ajr-art') && !vch.includes('ajr-arr') && !vch.includes('ajr-dep') && vch.includes('ajr-cli'), `un vendeur sans droits n'a que « Un client » (${vch.join(', ')})`);
await v.ctx.close();
await b.close(); s.close();
fin();
