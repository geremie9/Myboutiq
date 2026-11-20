// t258 — Les mesures de la boutique (23.41). « Un sac de riz peut être vendu
// en kg, un quart, un demi, un petit, un grand. » L'app ne connaissait que
// le kilo : son quart valait toujours le kilo divisé par quatre (175 F) quand
// la boutique le vend 200, et « du riz pour 500 » se calculait de tête.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, stock } from './caisse.mjs';
const { t, fin } = compteur('t258');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
db.articles.push({ id: 9, nm: 'Riz parfumé', e: '📦', cat: 'Alimentation', px: 700, pa: 600, um: 'kg', stk0: 100, al: 0, vd: 0, vr: [] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
const tape = async (sel, v) => { await p.locator(sel).fill(String(v)); await p.locator(sel).dispatchEvent('input'); };

// ── 1. Il dit ses mesures, une fois ──
await p.evaluate(() => corrigerConditionnement(9)); await p.waitForTimeout(400);
const f0 = await p.evaluate(() => [...document.querySelectorAll('#cond-pm .cond-pm')].map((x, i) => document.getElementById('cond-pm-n-' + i).value + '=' + document.getElementById('cond-pm-q-' + i).value).join(' · '));
t(f0 === 'quart=0.25 · demi=0.5', `la feuille propose ses petites mesures (${f0}), prix à dire`);
await tape('#cond-pm-p-0', 200);
await p.locator('#cond-pm .cond-plus').tap(); await p.waitForTimeout(150);
await tape('#cond-pm-q-2', 0.2); await tape('#cond-pm-p-2', 150);
await p.locator('#cond-ok').tap(); await p.waitForTimeout(400);
const m = await p.evaluate(() => JSON.stringify(DB.articles.find(a => a.id === 9).mes));
t(m === '[{"nm":"quart","q":0.25,"px":200},{"nm":"boîte","q":0.2,"px":150}]', `gardées avec leur poids ET leur prix ; le demi sans prix n'est pas gardé (${m})`);

// ── 2. À la caisse ──
await p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
await p.locator('#pc-9').tap(); await p.waitForTimeout(400);
const q0 = await p.evaluate(() => ({ mes: [...document.querySelectorAll('#qte-mes .qte-m')].map(x => x.innerText.replace(/\s+/g, ' ').trim()).join(' | '), mt: [...document.querySelectorAll('#qte-mt .qte-mt-ch button')].map(x => x.textContent.replace(/\s/g, '')).join(',') }));
t(/quart .*200/.test(q0.mes) && /boîte .*150/.test(q0.mes) && q0.mt === '100,200,500,1000', `toucher le riz : ses mesures à leur prix (${q0.mes}), et « pour un montant »`);
const s0 = await stock(p, 9);
await p.locator('#qte-mes .qte-m').first().tap(); await p.waitForTimeout(300);
let tot = await p.evaluate(() => calcTotal());
t(tot === 200 && (await p.evaluate(() => panier['9-0'])) === 0.25, `un quart : 200 F, pas 175 (${tot})`);
// ¼ au poids prend le prix de SA mesure
await p.locator('#pc-9').tap(); await p.waitForTimeout(300);
await p.evaluate(() => qteRapide(0.25)); await p.waitForTimeout(200);
tot = await p.evaluate(() => calcTotal());
t(tot === 400, `le bouton ¼ vend aussi le quart à 200 (${tot})`);
// Pour 500 F
await p.locator('#pc-9').tap(); await p.waitForTimeout(300);
await p.locator('#qte-mt .qte-mt-ch button').nth(2).tap(); await p.waitForTimeout(300);
const c = await p.evaluate(() => ({ tot: calcTotal(), q: panier['9-0'] }));
// 23.90 — au gramme près : 500 F à 700 le kilo pèsent 0,714 kg (avant, arrondi à 0,71).
t(c.tot === 900 && Math.abs(c.q - 1.214) < 0.001, `« pour 500 » : 500 F au total (${c.tot}), 0,714 kg pesé (panier ${c.q} kg)`);
// 1 kg au poids, à côté : le kilo reste à 700
await p.locator('#pc-9').tap(); await p.waitForTimeout(300);
await p.evaluate(() => ajouterQteMesure(1)); await p.waitForTimeout(200);
tot = await p.evaluate(() => calcTotal());
t(tot === 1600, `et un kilo au poids s'ajoute à 700 (${tot})`);
// On encaisse : la vente, le stock, le bénéfice.
await p.evaluate(() => { procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 2000; calcMonnaie(true); });
await p.evaluate(() => encaisser()); await p.waitForTimeout(600);
const v = await p.evaluate(() => { const x = DB.ventes[DB.ventes.length - 1]; return { total: x.total, ben: x.ben, lignes: x.lignes.map(l => l.nm + ' ×' + l.qte + ' @' + l.px + ' q' + (l.qBase || 1)).join(' ; ') }; });
t(v.total === 1600, `vente enregistrée : ${v.total} F — ${v.lignes}`);
t(/— quart ×2 @200 q0.25/.test(v.lignes) && /— pour [^;]*500[^;]*×1 @500 q0.71/.test(v.lignes), 'le reçu nomme chaque mesure, sans « de 0,25 »');
const s1 = await stock(p, 9);
t(Math.abs((s0 - s1) - 2.214) < 0.001, `le stock baisse en kilos : ${s0} → ${s1} (2,214 kg)`);
// bénéfice : 1600 − 2,214 × 600 = 271,6
t(Math.abs(v.ben - (1600 - 2.214 * 600)) < 1.5, `le bénéfice compte le poids vendu au prix d'achat (${v.ben})`);

// ── 3. Idempotence et nettoyage ──
const idem = await p.evaluate(() => { const a = JSON.stringify(migrateDBData(JSON.parse(JSON.stringify(DB))).articles.find(x => x.id === 9).mes); DB.articles.find(x => x.id === 9).mes.push({ nm: '<b>x', q: -1, px: 5 }, 'n\'importe quoi'); const b2 = JSON.stringify(migrateDBData(JSON.parse(JSON.stringify(DB))).articles.find(x => x.id === 9).mes); return a === b2; });
t(idem, 'une mesure mal formée venue d\'ailleurs est écartée ; les bonnes restent');
// Un article sans mesure : rien ne change.
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); document.getElementById('succ').classList.remove('show'); try { nouvelleVente(); } catch (e) {} DB.articles.push({ id: 10, nm: 'Sucre', e: '📦', cat: 'Alimentation', px: 900, pa: 750, um: 'kg', stk0: 20, al: 0, vd: 0, vr: [] }); renderProd(DB.articles); });
await p.locator('#pc-10').tap(); await p.waitForTimeout(300);
await p.evaluate(() => qteRapide(0.5)); await p.waitForTimeout(200);
t((await p.evaluate(() => calcTotal())) === 450, 'sans mesure dite, le demi reste au prix du poids (450)');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
