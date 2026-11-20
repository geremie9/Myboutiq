// t296 — L'ARRONDI DE LA BOUTIQUE ET LE REÇU NUMÉROTÉ (23.82).
// Feuille de route V1 (avis du 20/11/2026), le patron : « Go ».
//  · « Les arrondis doivent être paramétrables (5, 25 ou 50 FCFA) pour éviter
//    les décimales » — personne n'a de pièce de 5 F pour rendre sur 1 230 F.
//  · « Le reçu doit avoir un numéro séquentiel (anti-fraude) » — et deux
//    téléphones hors ligne ne doivent pas donner le même numéro.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, nombre } from './caisse.mjs';
const { t, fin } = compteur('t296');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles.push({ id: 30, nm: 'Lait <b>Peak</b>', e: '🥛', cat: 'Alimentation', px: 1230, pa: 1000, stk0: 20, al: 0, vd: 0 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);

// ── 1. Par défaut : rien ne change, mais le reçu a son numéro ──
await vendre(p, { lignes: [[30, 1]] });
let v = await p.evaluate(() => { const x = DB.ventes[DB.ventes.length - 1]; return { total: x.total, arr: x.arrondi, num: x.num, px: _prefixeRecu() }; });
t(v.total === 1230 && !v.arr, `sans arrondi choisi, le total reste ${v.total} F (rien ne change chez qui ne l'a pas choisi)`);
t(new RegExp('^' + v.px + '-0001$').test(v.num), `le premier reçu porte le numéro ${v.num} (préfixe de ce téléphone)`);

// ── 2. Le patron choisit l'arrondi d'une touche ──
const ch = await p.evaluate(() => { const l = []; for (let i = 0; i < 2; i++) { choisirArrondi(); majLigneArrondi(); l.push([DB.cfg.arrondi, document.getElementById('st-arr-s').textContent]); } return l; });
t(ch[0][0] === 5 && ch[1][0] === 25 && /25/.test(ch[1][1]) && /1\s?230.*1\s?225/.test(ch[1][1]), `une touche fait défiler : ${ch.map(x => x[0]).join(' → ')} F, et la ligne montre l'exemple (« ${ch[1][1]} »)`);

// ── 3. La vente arrondie : total, caisse, bénéfice ──
const avant = await p.evaluate(() => caisseAttendue());
await vendre(p, { lignes: [[30, 1]] });
v = await p.evaluate(() => { const x = DB.ventes[DB.ventes.length - 1]; return { total: x.total, arr: x.arrondi, num: x.num, ben: getSaleBenef(x) }; });
const apres = await p.evaluate(() => caisseAttendue());
t(v.total === 1225 && v.arr === -5, `1 230 F arrondis à 25 F : ${v.total} F payés, l'écart (${v.arr} F) est gardé sur la vente`);
t(apres - avant === 1225, `la caisse compte ce qui a vraiment été payé (+${apres - avant} F)`);
t(v.ben === 225, `le bénéfice tient compte de l'arrondi : 1 230 − 1 000 − 5 = ${v.ben} F`);
t(/-0002$/.test(v.num), `le reçu suivant : ${v.num}`);

// ── 4. Le reçu : numéro, téléphone, arrondi, rien d'injecté ──
const r = await p.evaluate(() => { afficherRecu(); const c = document.getElementById('recu-cont'); return { txt: c.innerText, b: !!c.querySelector('b'), num: (c.querySelector('.recu-num') || {}).textContent || '' }; });
t(/Reçu n° [A-Z][0-9]-0002/.test(r.num), `le reçu affiché dit « ${r.num} »`);
t(/\+237677000000/.test(r.txt) && /Arrondi\s+−\s?5/.test(r.txt), 'il porte le téléphone de la boutique et la ligne « Arrondi −5 F »');
t(!r.b && /Peak/.test(r.txt), 'un nom d\'article avec des balises s\'affiche en texte, sans s\'exécuter');
// Même si un nom brut arrivait par la synchro (sans passer par la neutralisation) :
const brut = await p.evaluate(() => { dernierRecu.lignes[0].nm = '<img src=x onerror="window.__xss=1">Thé'; dernierRecu.boutique = '<i>Boutique</i>'; afficherRecu(); const c = document.getElementById('recu-cont'); return { img: !!c.querySelector('img'), i: !!c.querySelector('i'), xss: !!window.__xss }; });
t(!brut.img && !brut.i && !brut.xss, 'un nom brut reçu par la synchro reste du texte sur le reçu (escH)');
const wa = await p.evaluate(() => { let u = ''; const o = window.open; window.open = x => { u = x; }; partagerRecu(); window.open = o; return decodeURIComponent(u); });
t(/Reçu n° [A-Z][0-9]-0002/.test(wa), 'le reçu envoyé sur WhatsApp porte aussi son numéro');

// ── 5. Le téléphone vidé ne redonne pas un numéro déjà donné ──
const r5 = await p.evaluate(() => { Object.keys(localStorage).filter(k => k.startsWith('myboutiq_recu_')).forEach(k => localStorage.removeItem(k)); return _prochainNumRecu(); });
t(/-0003$/.test(r5), `compteur effacé : on repart du plus grand numéro déjà vu (${r5}), jamais d'un doublon`);
// Deux téléphones : deux préfixes, donc jamais le même numéro hors ligne.
const deux = await p.evaluate(() => { const vrai = _deviceId; const a = _prefixeRecu(); _deviceId = 'autre-telephone-42'; const b2 = _prefixeRecu(); _deviceId = vrai; return [a, b2]; });
t(deux[0] !== deux[1], `deux téléphones, deux préfixes (${deux.join(' / ')})`);

// ── 6. Un vendeur ne change pas l'arrondi ──
const v6 = await p.evaluate(() => { const r0 = role; role = 'vendeur'; window.__toasts = []; choisirArrondi(); role = r0; return { a: DB.cfg.arrondi, toast: window.__toasts.join(' ') }; });
t(v6.a === 25 && /patron/.test(v6.toast), 'un vendeur ne peut pas changer l\'arrondi');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
