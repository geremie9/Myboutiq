// t316 — LES PASTILLES INTELLIGENTES (23.99).
// Le patron, le 22/11/2026 : « parlons des pastilles intelligentes, car
// maintenant il faut beaucoup défiler ». Mesuré sur une boutique comme la
// sienne (7 familles, 21 articles) : 50 tuiles, ≈ 7 écrans en « Étagère ».
// Devant : ce qui se vend ; derrière « +N » : le reste. Les rayons classés
// par ventes, « ⭐ Le plus vendu », et la barre qui reste en haut.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t316');
const { s, port } = await serveur();
const b = await chromium.launch();
const V = (id, nm, px, stk0 = 40) => ({ id, nm, px, pa: Math.round(px * 0.8), stk0, qBase: 1 });
const d = nouvelleBoutique();
d.articles.push({ id: 105, nm: 'Huile', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Diamaor', 1500), V(2, 'Mayor', 1100), V(3, 'Locale', 900, 0), V(4, 'Huile coco', 600)] });
d.articles.push({ id: 140, nm: 'Top', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Top ananas', 350), V(2, 'Coca Cola 50 cl', 250), V(3, 'Coca Cola 1 L', 500), V(4, 'Coca Cola 1,5 L', 600)] });
d.articles.push({ id: 147, nm: 'Predator', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Predator 33 cl', 330), V(2, 'Predator 1,25 L', 1250), V(3, 'Predator 1,5 L', 1500), V(4, 'Predator 50 cl', 500), V(5, 'Predator 25 cl', 250)] });
d.articles.push({ id: 150, nm: 'Jus', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Jus ananas 75 cl', 750), V(2, 'Jus ananas 25cl', 250)] });
for (let i = 0; i < 10; i++) d.articles.push({ id: 400 + i, nm: 'Ménage ' + i, e: '', cat: 'Ménage', px: 100, pa: 50, stk0: 30, al: 0, vr: [] });
d.cfg.varStyle = 'plat';
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
const fam = id => p.evaluate(id => ({ sortes: [...document.querySelectorAll('#pc-' + id + ' .vtile .vt-nm')].map(x => x.textContent), plus: (document.querySelector('#pc-' + id + ' .pfam-plus b') || {}).textContent || '' }), id);

// ── 0. Une boutique neuve, sans ventes : tout posé comme avant ──
let h = await fam(140);
t(h.sortes.length === 4 && !h.plus, `sans aucune vente : les 4 sortes de Top restent posées (${h.sortes.join(', ')})`);
t(await p.evaluate(() => !document.getElementById('tab-top')), 'pas encore de « Le plus vendu »');

// De vraies ventes, par la caisse.
const vente = l => p.evaluate(async l => { viderPanier(); varQtys = {}; for (const [pid, vid, q] of l) { const a = DB.articles.find(x => x.id === pid); const v = vid ? a.vr.find(x => x.id === vid) : 0; for (let i = 0; i < q; i++) addPanier(a, v); }
  procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = Math.ceil(calcAPayer() / 1000) * 1000 + 1000; calcMonnaie(true); await encaisser(); try { fermerSucces(); } catch (e) {} document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); }, l);
for (let k = 0; k < 3; k++) await vente([[105, 1, 1], [105, 2, 1], [140, 1, 2], [147, 1, 1], [1, 0, 2], [3, 0, 1], [150, 2, 1]]);
await vente([[2, 0, 1], [4, 0, 1], [150, 1, 1]]);
const hautAvant = await p.evaluate(() => document.getElementById('pgrid').scrollHeight);
await p.evaluate(() => { _famOrdre = {}; initTabs(); renderProd(DB.articles); });

// ── 1. Devant : ce qui se vend ; derrière « +N » : le reste ──
h = await fam(140);
t(h.sortes.join(',') === 'Top ananas' && h.plus === '+3', `Top : seul « Top ananas » (vendu), les 3 Coca derrière « ${h.plus} »`);
h = await fam(147);
t(h.sortes.join(',') === 'Predator 33 cl' && h.plus === '+4', `Predator : la 33 cl devant, « ${h.plus} » derrière`);
h = await fam(105);
t(h.sortes.join(',') === 'Diamaor,Mayor' && h.plus === '+2', `Huile : Diamaor et Mayor devant ; Locale (épuisée) et Huile coco (jamais vendue) derrière « ${h.plus} »`);
h = await fam(150);
t(h.sortes.length === 2 && !h.plus, 'Jus : les deux se vendent — pas de pastille');
const hautApres = await p.evaluate(() => document.getElementById('pgrid').scrollHeight);
t(hautApres < hautAvant * 0.8, `moins à défiler : ${hautAvant} → ${hautApres} px`);

// ── 2. La pastille déplie sur place, et replie ──
await p.click('#pc-140 .pfam-plus');
h = await fam(140);
t(h.sortes.length === 4 && h.plus === '−', `« +3 » touché : les 4 sortes, et « − » pour replier`);
await p.click('#pc-140 .pfam-plus');
h = await fam(140);
t(h.sortes.length === 1 && h.plus === '+3', 'replié d\'une touche');

// ── 3. Une sorte cachée reste vendable : la recherche, la voix, le panier ──
await p.evaluate(() => { const c = document.getElementById('src-c'); c.value = 'coca'; filtrC('coca'); });
h = await fam(140);
t(h.sortes.length === 3 && !h.plus, `la recherche « coca » montre les 3 Coca (${h.sortes.join(', ')})`);
await p.evaluate(() => { const c = document.getElementById('src-c'); c.value = ''; filtrC(''); viderPanier(); _voixPanier('deux coca cola 1 L'); renderProd(DB.articles); });
h = await fam(140);
t(h.sortes.includes('Coca Cola 1 L') && await p.evaluate(() => panier['140-3'] === 2), 'dite à la voix, la Coca 1 L va au panier — et reste devant tant qu\'elle y est');
await p.evaluate(() => viderPanier());

// ── 4. Les rayons : classés par ventes, « ⭐ Le plus vendu » ──
const tabs = await p.evaluate(() => [...document.querySelectorAll('#tabs-c .tpil')].map(x => x.innerText.trim()));
t(tabs[0] === 'Tout' && tabs[1] === 'Le plus vendu', `« Le plus vendu » juste après « Tout » : ${tabs.join(' · ')}`);
t(tabs.indexOf('Ménage') === tabs.length - 1, 'le rayon qui ne vend rien passe au bout');
await p.click('#tab-top');
const top = await p.evaluate(() => [...document.querySelectorAll('#pgrid > [id^="pc-"]')].map(x => x.id));
t(top.length >= 4 && top.length <= 12 && top.includes('pc-140') && !top.some(x => /pc-40\d/.test(x)), `« Le plus vendu » : ${top.length} articles, ceux qui partent (pas les « Ménage » jamais vendus)`);

// ── 5. La barre reste en haut pendant qu'on défile ──
await p.click('#tabs-c .tpil');   // Tout
await p.mouse.move(200, 500); await p.mouse.wheel(0, 1200); await p.waitForTimeout(300);
const barre = await p.evaluate(() => { const r = document.querySelector('#s-caisse .ssec').getBoundingClientRect(), h = document.querySelector('#s-caisse .mhdr').getBoundingClientRect(); return { haut: r.top, bas: r.bottom, sousHdr: r.top >= h.bottom - 1, y: scrollY }; });
t(barre.y > 500 && barre.sousHdr && barre.bas < 260, `descendu de ${barre.y} px : la recherche et les rayons restent sous l'en-tête (haut ${Math.round(barre.haut)} px)`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
