// t267 — « Pendant la modification ça saute souvent, ou ça ramène en arrière,
// ou même au final ça se modifie même pas… il faut qu'on rentre en arrière
// activer la modification avant d'aller modifier là-bas. » (23.50)
// Mesuré : des données qui arrivent d'un autre téléphone pendant qu'une fiche
// est ouverte refont `DB`. « Comment tu le vends » écrivait alors dans
// l'ANCIEN article — rien d'enregistré, sans un mot. Une photo aussi.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t267');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
db.articles.push({ id: 9, nm: 'Eau', e: '📦', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [{ id: 1, nm: '50 cl', px: 300, pa: 200, stk0: 10 }, { id: 2, nm: '1,5 L', px: 500, pa: 400, stk0: 10 }] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(400);
// Un autre téléphone envoie la boutique (ici sa propre copie : rien ne change, mais DB est refait).
const arrivee = () => p.evaluate(() => _applyRemoteDB(JSON.parse(JSON.stringify(DB)), true));
const fermer = () => p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));

// ── 1. « Comment tu le vends » ──
await p.evaluate(() => ouvrirConditionnement({ p: DB.articles.find(a => a.id === 3) }));
await arrivee();
const c1 = await p.evaluate(() => { _cond.px = 888; condEnregistrer(); return DB.articles.find(a => a.id === 3).px; });
t(c1 === 888, `une arrivée de données pendant la fiche : le nouveau prix est bien enregistré (${c1}, avant la 23.50 il restait 650)`);
await fermer();
await p.evaluate(() => ouvrirConditionnement({ p: DB.articles.find(a => a.id === 5) }));
await arrivee();
const c2 = await p.evaluate(() => { _cond.niv.push({ n: 12, mot: 'carton', px: 36000 }); condEnregistrer(); const a = DB.articles.find(x => x.id === 5); return [a.umSac, a.pxGros]; });
t(c2[0] === 12 && c2[1] === 36000, `… et le carton ajouté aussi (${c2.join(' / ')})`);
await fermer();
// Une sorte d'une famille.
await p.evaluate(() => { const a = DB.articles.find(x => x.id === 9); ouvrirConditionnement({ p: a, v: a.vr[1] }); });
await arrivee();
const c3 = await p.evaluate(() => { _cond.px = 550; condEnregistrer(); return DB.articles.find(a => a.id === 9).vr[1].px; });
t(c3 === 550, `une sorte (Eau 1,5 L) : enregistrée aussi (${c3})`);
await fermer();
const garde = await p.evaluate(() => JSON.parse(localStorage.getItem('myboutiq_v6')).articles.find(a => a.id === 3).px);
t(garde === 888, 'et c\'est gardé dans le téléphone');

// ── 2. Une photo posée pendant qu'une synchro arrive ──
const img = await p.evaluate(() => { const cv = document.createElement('canvas'); cv.width = cv.height = 300; const x = cv.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 300, 300); return cv.toDataURL('image/jpeg', .8); });
const ph = await p.evaluate(async src => { const blob = await (await fetch(src)).blob(); const pr = _photoPourArticle(DB.articles.find(a => a.id === 4), blob, { lot: true }); _applyRemoteDB(JSON.parse(JSON.stringify(DB)), true); await pr; return (DB.articles.find(a => a.id === 4).img || '').slice(0, 15); }, img);
t(ph === 'data:image/jpeg', `la photo préparée pendant l'arrivée est bien sur l'article (« ${ph} »)`);
const phv = await p.evaluate(async src => { const blob = await (await fetch(src)).blob(); const a = DB.articles.find(x => x.id === 9); const pr = _photoPourArticle(a, blob, { lot: true, cible: a.vr[0] }); _applyRemoteDB(JSON.parse(JSON.stringify(DB)), true); await pr; return (DB.articles.find(x => x.id === 9).vr[0].img || '').slice(0, 15); }, img);
t(phv === 'data:image/jpeg', 'pareil pour la photo d\'une sorte');

// ── 3. Le cadenas : débloquer là où il bloque ──
await p.evaluate(() => { DB.cfg.venteDeverrouillee = false; majBoutonVerrou(); });
await p.evaluate(() => corrigerConditionnement(3));
const s1 = await p.evaluate(() => ({ snack: (document.getElementById('snack-ph') || {}).textContent || '', ouvert: document.getElementById('ov-cond').classList.contains('show') }));
t(/Modifications bloquées/.test(s1.snack) && /Débloquer/.test(s1.snack) && !s1.ouvert, `bloqué : la fiche ne s'ouvre pas, mais « Débloquer » est proposé là (« ${s1.snack} »)`);
await p.locator('#snack-ph-b').tap(); await p.waitForTimeout(400);
const s2 = await p.evaluate(() => ({ ouvert: document.getElementById('ov-cond').classList.contains('show'), libre: !venteVerrouillee(), btn: (document.querySelector('#btn-verrou, .verrou') || {}).textContent || '' }));
t(s2.libre && s2.ouvert, 'un toucher : débloqué, et la fiche qu\'il voulait s\'ouvre — sans remonter au cadenas');
await fermer();
// Le menu d'une sorte, bloqué.
await p.evaluate(() => { DB.cfg.venteDeverrouillee = false; majBoutonVerrou(); const a = DB.articles.find(x => x.id === 9); showCtxVar({ clientX: 100, clientY: 300 }, a, a.vr[0]); });
await p.waitForTimeout(200);
const s3 = await p.evaluate(() => ({ snack: document.getElementById('snack-ph').classList.contains('show'), menu: document.getElementById('ctxmv').classList.contains('show') }));
await p.locator('#snack-ph-b').tap(); await p.waitForTimeout(400);
const s4 = await p.evaluate(() => ({ menu: document.getElementById('ctxmv').classList.contains('show'), libre: !venteVerrouillee() }));
t(s3.snack && !s3.menu && s4.libre && s4.menu, 'le menu d\'une sorte, bloqué : « Débloquer », et le menu s\'ouvre');
// Un vendeur sans droit ne débloque rien.
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
