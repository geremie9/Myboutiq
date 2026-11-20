// t302 — CE QUE LE CLIENT TAPE POUR PAYER PAR MOBILE MONEY (23.87).
// Le patron, le 20/11/2026 : « #150*50# pour Orange, même moi je ne suis pas
// sûr, fais des recherches sur leur site officiel ». Relevé sur les sites des
// opérateurs : Orange Money Cameroun, paiement marchand = #150*47# puis le
// code du marchand ; MTN MoMo Pay = *126*4*code marchand*montant#.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t302');
const { s, port } = await serveur();
const b = await chromium.launch();
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
const feuille = (mode) => p.evaluate((mode) => {
  document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  viderPanier(); addPanier(DB.articles.find(x => x.id === 1), 0); addPanier(DB.articles.find(x => x.id === 1), 0); addPanier(DB.articles.find(x => x.id === 4), 0);
  procederPmt(); selPmntVente(mode);
  const z = document.getElementById('ussd-box');
  return { txt: z.innerText.replace(/\s+/g, ' ').trim(), ajout: !!z.querySelector('.ussd-ajout'), code: (z.querySelector('.ussd-code') || {}).textContent || '', vu: z.offsetParent !== null };
}, mode);

// ── 1. Pas encore de code : le patron voit où le poser, là où il encaisse ──
let r = await feuille('orange');
t(r.ajout && /Ajouter mon code marchand Orange Money/.test(r.txt), `sans code : « ${r.txt} », dans la feuille de paiement`);
await p.evaluate(() => { window.prompt = () => '12 34 56'; poserCodeMarchand('orange'); window.prompt = () => '654321'; poserCodeMarchand('mtn'); });
t(await p.evaluate(() => JSON.stringify(DB.cfg.codesMarchand)) === '{"orange":"123456","mtn":"654321"}', 'les codes sont gardés (espaces enlevés : « 12 34 56 » → 123456)');

// ── 2. Orange : #150*47#, puis le code marchand ──
r = await feuille('orange');
t(r.code === '#150*47#' && /code marchand 123456/.test(r.txt) && /2\s?600/.test(r.txt), `Orange : « ${r.txt} »`);
// ── 3. MTN : tout dans une ligne, montant compris ──
r = await feuille('mtn');
t(r.code === '*126*4*654321*2600#' && /montant compris/.test(r.txt), `MTN : « ${r.code} » (2 bières + 1 huile = 2 600 F)`);
// Les consignes rendues/prises changent ce qu'il paie : le code suit.
const cons = await p.evaluate(() => { chgConsigne('prises', 2); selPmntVente('mtn'); return document.querySelector('#ussd-box .ussd-code').textContent; });
t(cons === '*126*4*654321*2800#', `2 bouteilles consignées : le montant tapé suit (${cons})`);
// ── 4. Moov, espèces : rien d'inventé ──
r = await feuille('moov');
t(r.txt === '', 'Moov : aucun code relevé, rien n\'est affiché');
r = await feuille('especes');
t(!r.vu, 'en espèces : rien de plus');

// ── 5. La vente s'encaisse comme avant ──
const v = await p.evaluate(async () => { selPmntVente('mtn'); const n = DB.ventes.length; await encaisser(); return { n: DB.ventes.length - n, mode: DB.ventes[DB.ventes.length - 1].paiement.mode }; });
t(v.n === 1 && v.mode === 'mtn', 'la vente MTN s\'enregistre comme avant');

// ── 6. Le vendeur voit le code, sans pouvoir le changer ──
const vd = await p.evaluate(() => { role = 'vendeur'; nomVendeur = 'Ibrahim'; window.__toasts = []; selPmntVente('orange'); const z = document.getElementById('ussd-box'); const a = { code: (z.querySelector('.ussd-code') || {}).textContent, mod: !!z.querySelector('.ussd-mod') }; poserCodeMarchand('orange'); a.toast = window.__toasts.join(' '); a.garde = DB.cfg.codesMarchand.orange; delete DB.cfg.codesMarchand.mtn; selPmntVente('mtn'); a.vide = z.innerHTML === ''; role = 'patron'; return a; });
t(vd.code === '#150*47#' && !vd.mod && /patron/.test(vd.toast) && vd.garde === '123456', 'le vendeur voit le code, mais ne peut pas le changer');
t(vd.vide, 'sans code MTN, le vendeur ne voit rien de plus qu\'avant');
// ── 7. Un code venu de la synchro ne s'injecte pas ──
const x = await p.evaluate(() => { DB.cfg.codesMarchand = { orange: '<img src=x onerror=window.__x=1>99' }; selPmntVente('orange'); return { img: !!document.querySelector('#ussd-box img'), x: !!window.__x, code: _codeMarchand('orange') }; });
t(!x.img && !x.x && x.code === '199', 'un code piégé arrivé par la synchro n\'affiche que ses chiffres');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
