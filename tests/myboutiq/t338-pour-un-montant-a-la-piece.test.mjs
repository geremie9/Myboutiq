// t338 — « POUR 500 DE SAVON » À LA VOIX (24.19).
// Mesuré au banc en cherchant le kopo des agents : « pour 500 de savon azur »
// mettait les 30 savons du stock au panier (le 500 lu comme une quantité,
// arrêté par le stock), « pour 300 de tomates » les 40 tas. Sur un article à
// la pièce, « pour » dit un montant ; s'il ne tombe pas juste, la voix dit le
// prix au lieu d'inventer.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t338');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
Object.assign(d.articles[1], { px: 250, pa: 200, umNom: 'kopo' });   // Riz au kopo
d.articles.push({ id: 62, nm: 'Tomates', e: '', cat: 'Vivrier', px: 500, pa: 300, stk0: 40, al: 0, vr: [], umNom: 'tas' });
const { p, errs } = await ouvrirCaisse(b, port, d);
await p.evaluate(() => { parler = window.__parlerVrai || parler; window.__dit = []; _parlerCommande = t => window.__dit.push(t); });
const dire = ph => p.evaluate(ph => { viderPanier(); window.__dit = []; const R = _voixPanier(ph); _voixPanierDire(R); return { panier: JSON.parse(JSON.stringify(panier)), dit: window.__dit.join(' | ') }; }, ph);

let r = await dire('pour 500 de savon azur');
t(Object.keys(r.panier).length === 0, `« pour 500 de savon azur » (650 la pièce) : rien au panier (avant : 30 savons) — ${JSON.stringify(r.panier)}`);
t(/Savon Azur coûte 650 francs/.test(r.dit), `la voix dit le prix : « ${r.dit} »`);
// Par le vrai chemin du micro : le prix se dit, la recherche ne s'ouvre pas sur « pour 500 de savon azur »
const mic = await p.evaluate(() => { viderPanier(); window.__dit = []; const c = document.getElementById('src-c'); if (c) c.value = ''; _voixTraiterTexte('pour 500 de savon azur'); return { dit: window.__dit.join(' | '), src: (document.getElementById('src-c') || {}).value || '' }; });
t(/coûte 650/.test(mic.dit) && !mic.src, `au micro : « ${mic.dit} », recherche « ${mic.src} »`);
r = await dire('pour 1000 de piment');
t(r.panier['7-0'] === 10, `« pour 1000 de piment » (100 la pièce) : 10 piments — ${JSON.stringify(r.panier)}`);
r = await dire('pour 300 de tomates');
t(!r.panier['62-0'] && /Tomates coûte 500/.test(r.dit), `« pour 300 de tomates » (500 le tas) : rien, le prix dit (avant : 40 tas) — « ${r.dit} »`);
r = await dire('pour deux savons azur');
t(r.panier['3-0'] === 2, `« pour deux savons azur » reste 2 savons — ${JSON.stringify(r.panier)}`);
r = await dire('deux kopos de riz');
t(r.panier['2-0'] === 2, `« deux kopos de riz » : 2 kopos — ${JSON.stringify(r.panier)}`);
r = await dire('pour 500 de riz');
t(r.panier['2-0'] === 2, `« pour 500 de riz » au kopo de 250 : 2 kopos — ${JSON.stringify(r.panier)}`);
r = await dire('un demi kopo de riz');
t(r.panier['2-0'] === 0.5, `« un demi kopo de riz » : ½ — ${JSON.stringify(r.panier)}`);

// La monnaie se dit une fois, quand il a fini de taper (pas à chaque chiffre)
await p.evaluate(() => { viderPanier(); DB.cfg.voix = true; window.__m = []; parler = t => window.__m.push(t); addPanier(DB.articles.find(x => x.id === 4)); procederPmt(); });
await p.waitForTimeout(500);
await p.evaluate(() => { try { selPmntVente('especes'); } catch (e) {} });
await p.locator('#calc-recu').focus();
for (const ch of '5000') { await p.keyboard.type(ch); await p.waitForTimeout(450); }
await p.waitForTimeout(1500);
const m = await p.evaluate(() => window.__m.filter(x => /manque|Rends|rendre/i.test(x)));
t(m.length === 1 && /Rends 3700 francs/.test(m[0]), `« 5 000 » tapé chiffre par chiffre : une seule annonce (avant : « il manque… » à chaque chiffre) — ${JSON.stringify(m)}`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
