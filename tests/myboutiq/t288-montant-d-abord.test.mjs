// t288 — « 6 480 FCFA », PAS « FCFA 6 480 » (23.69).
// Relevé sur les captures du patron (15/11) : l'objectif et le panier
// écrivaient la devise devant (« F 6480 / F 25000 »), les tuiles derrière
// (« 900 F »). Il a dit « Go » pour une seule règle partout : le montant
// d'abord, comme on le dit au Cameroun.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t288');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique(); d.cfg.facon = 'detail'; d.objectif = 25000;
d.cfg.varStyle = 'carre';   // 23.89 — la tuile FERMÉE d'une famille n'existe que dans la fenêtre ; l'étagère : t304
d.articles.push({ id: 40, nm: 'Jus Top', e: '🥤', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [{ id: 1, nm: 'Ananas', px: 500, pa: 300, stk0: 10, qBase: 1 }, { id: 2, nm: 'Orange', px: 600, pa: 300, stk0: 10, qBase: 1 }] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
await p.waitForTimeout(400);
const f = await p.evaluate(() => ({ a: fmt(6480), b: fmt(-1500), c: fmt(0) }));
t(/^6\s480 FCFA$/.test(f.a) && /^-1\s500 FCFA$/.test(f.b) && f.c === '0 FCFA', `le montant d'abord : « ${f.a} », « ${f.b} », « ${f.c} »`);
await vendre(p, { lignes: [[2, 3]] }); await p.waitForTimeout(1600);
const o = await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); updateObjBar(); return document.getElementById('obj-val').textContent; });
t(/^1\s800 FCFA \/ 25\s000 FCFA/.test(o), `l'objectif : « ${o} » (avant : « FCFA 1 800 / FCFA 25 000 »)`);
const tu = await p.evaluate(() => ({ riz: document.querySelector('#pc-2 .ppr-ov').textContent.replace(/\s+/g, ' ').trim(), fam: document.querySelector('#pc-40 .ppr-ov').textContent.replace(/\s+/g, ' ').trim() }));
t(/^600 ?F(CFA)?$/.test(tu.riz) && /^dès 500 ?F(CFA)?$/.test(tu.fam) && !/FCFA.*FCFA|F.*F.*F/.test(tu.riz + tu.fam), `les tuiles gardent « ${tu.riz} » et « ${tu.fam} », sans devise en double`);
const usd = await p.evaluate(() => { const s0 = DB.cfg.s; DB.cfg.s = '$'; const r = fmt(25); DB.cfg.s = s0; return r; });
t(usd === '$ 25', `là où c'est l'usage, la devise reste devant (« ${usd} »)`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
