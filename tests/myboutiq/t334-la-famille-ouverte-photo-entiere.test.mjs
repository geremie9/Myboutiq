// t334 — LA FAMILLE OUVERTE : PHOTO ENTIÈRE, ET LE SAC DEMANDÉ (24.17).
// Ses captures du 24/11 (sa fenêtre « Carrés » — la seule boutique sur ce
// style) : « 📦 21 000 F », « = 50 kg » posés sur le haut des photos ; et une
// touche sur « = 50 kg » a vendu un sac entier de riz au prix du kilo
// (40 000 F). Son choix : la puce sous le prix (option recommandée). Sa
// boutique reconstruite, mode gros, « Bloqué », 360×760, au doigt.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
import fs from 'node:fs';
const { t, fin } = compteur('t334');
const { s, port } = await serveur();
const b = await chromium.launch();
const ph = fs.readdirSync(new URL('../../photos-off/', import.meta.url)).filter(f => f.endsWith('.jpg')).slice(0, 8).map(f => '/photos-off/' + f);
const d = nouvelleBoutique({ articles: [] }); d.cfg.venteDeverrouillee = false; d.cfg.facon = 'gros'; d.cfg.varStyle = 'carre';
d.articles = [
  { id: 5, nm: 'Huile', e: '', cat: 'Alimentation', px: 1200, pa: 0, stk0: 0, al: 0, um: 'pc', vr: [
    { id: 1, nm: 'Diamaor', px: 1500, pa: 1300, stk0: 60, qBase: 1, umSac: 15, umCont: 'bidon', pxGros: 21000, img: ph[1] },
    { id: 2, nm: 'Mayor', px: 1100, pa: 900, stk0: 28, qBase: 1, umSac: 14, umCont: 'carton', pxGros: 20300, img: ph[2] }] },
  { id: 2, nm: 'Riz', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, um: 'kg', umSac: 50, vr: [
    { id: 1, nm: 'Riz (kg)', px: 800, pa: 600, stk0: 200, qBase: 1, img: ph[3] }, { id: 2, nm: 'RIZ', px: 500, pa: 400, stk0: 200, qBase: 1, img: ph[4] }] }];
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 760 });
// Le banc répond « oui » à tout confirm() (caisse.mjs) : ici on lit la question et on choisit la réponse.
const question = (rep) => p.evaluate(r => { window.__q = null; window.confirm = m => { window.__q = m; return r; }; }, rep);
const lue = () => p.evaluate(() => window.__q);
const ouvrir = async id => { await p.evaluate(id => { viderPanier(); varQtys = {}; renderProd(DB.articles); ouvrirVarInline(DB.articles.find(a => a.id === id), document.getElementById('pc-' + id)); }, id); await p.waitForTimeout(400); };

// ── 1) LA PUCE SOUS LE PRIX, LA PHOTO ENTIÈRE ───────────────────────────
for (const id of [5, 2]) {
  await ouvrir(id);
  const m = await p.evaluate(() => [...document.querySelectorAll('#vinline-lst .vtile')].map(t => {
    const g = t.querySelector('.vt-gros'), im = t.firstElementChild, ir = im.getBoundingClientRect(), gr = g ? g.getBoundingClientRect() : null;
    let sur = 0; for (let x = ir.left + 2; x < ir.right - 2; x += 3) for (let y = ir.top + 2; y < ir.bottom - 2; y += 3) { const e = document.elementFromPoint(x, y); if (e && e.closest('.vt-gros')) sur++; }
    return { sur, sous: gr ? gr.top >= ir.bottom - 1 : null, txt: g ? g.textContent.replace(/\s+/g, ' ').trim() : '' };
  }));
  t(m.length === 2 && m.every(x => x.sur === 0 && x.sous), `${id === 5 ? 'Huile' : 'Riz'} : les puces (${m.map(x => x.txt).join(' · ')}) sont sous le prix, aucune sur la photo`);
}

// ── 2) LE CARTON QUI A SON PRIX : TOUJOURS UNE TOUCHE ───────────────────
await ouvrir(5);
await question(true);
await p.tap('#vinline-lst .vtile >> nth=0 >> .vt-gros'); await p.waitForTimeout(250);
t(await lue() === null && await p.evaluate(() => (panier['5-1'] || varQtys[1] || 0) === 15), 'le bidon de Diamaor (21 000 F) se vend d\'une touche, sans question : 15 bouteilles');

// ── 3) LE SAC DE RIZ SANS PRIX : DEMANDÉ D'ABORD ────────────────────────
await ouvrir(2);
await question(false);
await p.tap('#vinline-lst .vtile >> nth=0 >> .vt-gros'); await p.waitForTimeout(250);
const q1 = await lue();
t(/Vendre 1 sac de 50 kg/.test(q1 || '') && /40\s?000/.test((q1 || '').replace(/[  ]/g, ' ')), `une touche sur « = 50 kg » demande : « ${q1} »`);
t(await p.evaluate(() => !(panier['2-1'] > 0) && !(varQtys[1] > 0)), '« Annuler » : rien n\'est vendu (avant : 50 kg, 40 000 F, d\'une touche)');
await question(true);
await p.tap('#vinline-lst .vtile >> nth=0 >> .vt-gros'); await p.waitForTimeout(250);
t(await p.evaluate(() => (panier['2-1'] || varQtys[1] || 0) === 50), '« OK » : le sac de 50 kg part, comme il l\'a demandé');

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
