// t218 — LE PAVÉ « GROSSE COMMANDE » (23.04).
// « Oui go » — le pavé proposé après la 23.03 : un client prend 10 cartons,
// et la caisse demandait dix touches sur la tuile. Mesuré au banc sur la
// 23.03 : caisse verrouillée (la caisse de tous les jours) ou vendeur,
// l'appui long sur une tuile ne faisait RIEN ; sur une variante, il
// ouvrait un prompt() du navigateur qui comptait en pièces et ignorait le
// carton. Le pavé doit poser exactement ce que posent N touches : même
// panier, mêmes cartons, même total — et dire le stock avant d'ajouter.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t218');
const { s, port } = await serveur();
const b = await chromium.launch();

const HUILE = () => ({ id: 30, nm: 'Huile', e: '🫗', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: [{ id: 1, nm: '1 L', px: 900, pa: 700, stk: 0, stk0: 48, umSac: 12, umCont: 'carton', pxGros: 10000, paGros: 8400 },
       { id: 2, nm: '2 L', px: 1700, pa: 1400, stk: 0, stk0: 24, umSac: 6, umCont: 'carton', pxGros: 9800 }] });
const RIZ = () => ({ id: 41, nm: 'Riz 25 kg', e: '🍚', cat: 'Alimentation', um: 'kg', px: 700, pa: 600, stk0: 250, al: 0, vd: 0,
  umSac: 25, umCont: 'sac', pxGros: 16500, paGros: 15000 });
// Vendu à découvert permis (rt) : le pavé propose, il ne refuse pas.
const BISCUIT = () => ({ id: 42, nm: 'Biscuit Tiger', e: '🍪', cat: 'Alimentation', px: 100, pa: 80, stk0: 48, al: 0, vd: 0, rt: true,
  umSac: 24, umCont: 'carton', pxGros: 2200, paGros: 1900 });
function boutique(facon) {
  const d = nouvelleBoutique();
  d.cfg.facon = facon; d.cfg.venteDeverrouillee = false;    // la caisse de tous les jours
  d.articles.push(HUILE(), RIZ(), BISCUIT());
  return d;
}
const appuiLong = (p, sel) => p.locator(sel).first().dispatchEvent('contextmenu');
const pave = p => p.evaluate(() => {
  const o = document.getElementById('ov-pave');
  if (!o || !o.classList.contains('show')) return null;
  const on = o.querySelector('.pv-seg button.on');
  const ok = document.getElementById('pv-ok');
  return { nm: document.getElementById('pv-nm').textContent, mode: on ? on.textContent : '',
    seg: document.getElementById('pv-seg').style.display !== 'none',
    n: document.getElementById('pv-n').textContent, mot: document.getElementById('pv-mot').textContent,
    tot: document.getElementById('pv-tot').textContent, stk: document.getElementById('pv-stk').textContent,
    ok: ok.textContent, actif: !ok.disabled, orange: ok.classList.contains('pv-orange'),
    virgule: !document.getElementById('pv-virg').disabled };
});
// Sur un code qui n'a pas le pavé, on le constate (❌) au lieu d'attendre
// trente secondes un bouton qui n'existe pas.
const ouvert = p => p.evaluate(() => { const o = document.getElementById('ov-pave'); return !!(o && o.classList.contains('show')); });
const taper = async (p, chiffres) => { if (!(await ouvert(p))) return false;
  for (const k of chiffres) await p.locator(`#ov-pave .pv-touches button:text-is("${k}")`).click(); return true; };
const valider = async p => { if (!(await ouvert(p))) return false; await p.locator('#pv-ok').click(); return true; };
const ligne = (p, k) => p.evaluate(k => {
  const g = _grosPanier[k];
  return { q: panier[k] || 0, lots: ((g && g.lots) || []).length, total: calcAPayer(),
    barre: Number(document.getElementById('ctot').textContent.replace(/\D/g, '')) };
}, k);
const nombre = x => Number(String(x).replace(/[^\d]/g, ''));

// ── 1) CAISSE VERROUILLÉE, EN GROS : 3 CARTONS D'UN COUP = 3 TOUCHES ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('gros'));
  // La référence : trois touches sur la barre du carton (23.07 : le gros est en bas).
  for (let i = 0; i < 3; i++) { await p.locator('#pc-6 .pbas .pbarre').click(); await p.waitForTimeout(120); }
  const ref = await ligne(p, '6-0');
  await p.evaluate(() => { viderPanier(); window.__toasts = []; });
  await appuiLong(p, '#pc-6'); await p.waitForTimeout(300);
  let v = await pave(p);
  t(!!v, 'caisse verrouillée : l\'appui long sur la tuile ouvre le pavé');
  t(v && /Cartons \(24\)/.test(v.mode) && v.seg, `il s'ouvre sur les cartons, comme la barre du bas en gros (« ${v && v.mode} »)`);
  t(v && /En stock : 4 cartons/.test(v.stk), `le stock se dit en cartons (« ${v && v.stk} »)`);
  await taper(p, ['3']);
  v = await pave(p);
  t(v && v.n === '3' && v.mot === 'cartons' && nombre(v.tot) === 39000, `3 cartons = 39 000 (« ${v && v.tot} »)`);
  t(v && v.actif && /Ajouter 3 cartons · FCFA 39\s000/.test(v.ok), `le bouton dit ce qu'il va faire (« ${v && v.ok} »)`);
  await valider(p); await p.waitForTimeout(300);
  const l = await ligne(p, '6-0');
  t(l.q === ref.q && l.lots === ref.lots && l.total === ref.total && l.q === 72 && l.lots === 3,
    `exactement trois touches : ${l.q} pièces, ${l.lots} cartons, ${l.total} F (touches : ${ref.q}, ${ref.lots}, ${ref.total})`);
  t(l.barre === 39000, `la barre du panier dit 39 000 (${l.barre})`);
  const dit = await p.evaluate(() => window.__toasts.join(' | '));
  t(/3 cartons \(72\)/.test(dit) && (dit.match(/Savon/g) || []).length === 1, `un seul message, « 3 cartons (72) » (« ${dit} »)`);
  t(await p.evaluate(() => { const o = document.getElementById('ov-pave'); return !!o && !o.classList.contains('show'); }), 'et le pavé se referme');

  // Plus que le stock, sans vente à découvert : refusé AVANT, et dit.
  await appuiLong(p, '#pc-6'); await p.waitForTimeout(300);
  await taper(p, ['2']);
  v = await pave(p);
  t(v && !v.actif && /Il n'en reste que 1 carton/.test(v.stk) && /Pas assez/.test(v.ok), `2 cartons sur 1 restant : « ${v && v.stk} » / « ${v && v.ok} »`);
  await p.evaluate(() => { try { paveValider(); } catch (e) {} }); await p.waitForTimeout(200);
  t((await ligne(p, '6-0')).q === 72, 'rien n\'est ajouté');
  // Les pièces : la même feuille, l'autre bouton.
  await p.evaluate(() => { try { paveUnite('p'); _pv.s = ''; _paveRendre(); } catch (e) {} });
  await taper(p, ['1', '5']);
  v = await pave(p);
  t(v && v.mot === 'pièces' && nombre(v.tot) === 9000 && v.actif, `15 pièces à 600 = 9 000 (« ${v && v.tot} »)`);
  await valider(p); await p.waitForTimeout(300);
  const l2 = await ligne(p, '6-0');
  t(l2.q === 87 && l2.lots === 3 && l2.total === 39000 + 9000, `3 cartons + 15 pièces : ${l2.q}, ${l2.total} F`);

  // Vendu à découvert permis : le pavé prévient, il ne refuse pas.
  await appuiLong(p, '#pc-42'); await p.waitForTimeout(300);
  await p.evaluate(() => { try { paveVite(5); } catch (e) {} }); await p.waitForTimeout(100);
  v = await pave(p);
  t(v && v.actif && v.orange && /Vendre quand même 5 cartons/.test(v.ok) && /Il n'en reste que 2 cartons/.test(v.stk),
    `5 cartons sur 2 : « ${v && v.ok} »`);
  await valider(p); await p.waitForTimeout(300);
  const bq = await ligne(p, '42-0');
  t(bq.q === 120 && bq.lots === 5, `vendus quand même : ${bq.q} biscuits, ${bq.lots} cartons`);

  // Le riz au kilo : la virgule n'existe qu'au kilo.
  await appuiLong(p, '#pc-41'); await p.waitForTimeout(300);
  v = await pave(p);
  t(v && /Sacs/.test(v.mode) && !v.virgule, 'les sacs se comptent entiers : pas de virgule');
  await p.evaluate(() => { try { paveUnite('p'); } catch (e) {} }); await p.waitForTimeout(100);
  await taper(p, ['1', '2', ',', '5']);
  v = await pave(p);
  t(v && v.virgule && v.n === '12,5' && v.mot === 'kg' && nombre(v.tot) === 8750, `au kilo : 12,5 kg = 8 750 (« ${v && v.tot} »)`);
  await valider(p); await p.waitForTimeout(300);
  t((await ligne(p, '41-0')).q === 12.5, '12,5 kg au panier');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) LE VENDEUR, ET LES VARIANTES ───────────────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('gros'), { vendeur: 'Ibrahim' });
  await p.evaluate(() => { role = 'vendeur'; renderProd(DB.articles); });
  await p.waitForTimeout(200);
  let dialogue = false; p.on('dialog', async d => { dialogue = true; await d.dismiss(); });
  await appuiLong(p, '#pc-6'); await p.waitForTimeout(300);
  t(!!(await pave(p)), 'le vendeur a le pavé lui aussi (avant : l\'appui long ne faisait rien)');
  await p.evaluate(() => closeSheet('ov-pave'));
  await p.locator('#pc-30').click(); await p.waitForTimeout(500);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('#vinline-lst .vtile')).find(e => (e.querySelector('.vt-nm') || {}).textContent === '1 L');
    if (x) x.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); });
  await p.waitForTimeout(300);
  let v = await pave(p);
  t(!!v && !dialogue, 'sur une variante, plus de prompt() du navigateur : le pavé');
  t(v && /1 L · Huile/.test(v.nm) && /Cartons \(12\)/.test(v.mode) && /En stock : 4 cartons/.test(v.stk), `« ${v && v.nm} », en cartons de 12, 4 en stock`);
  await taper(p, ['2']); await valider(p); await p.waitForTimeout(400);
  const l = await ligne(p, '30-1');
  t(l.q === 24 && l.lots === 2 && l.total === 20000, `2 cartons de 1 L : ${l.q} bouteilles, ${l.total} F`);
  const badge = await p.evaluate(() => { const x = Array.from(document.querySelectorAll('#vinline-lst .vtile')).find(e => (e.querySelector('.vt-nm') || {}).textContent === '1 L');
    return x ? (x.querySelector('.vt-badge') || {}).textContent : 'panneau fermé'; });
  t(badge === '24', `le panneau des variantes suit (${badge})`);
  // Les pièces d'une variante : par chgVQ, la règle de la caisse.
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('#vinline-lst .vtile')).find(e => (e.querySelector('.vt-nm') || {}).textContent === '2 L');
    if (x) x.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { try { paveUnite('p'); } catch (e) {} });
  await taper(p, ['3']); await valider(p); await p.waitForTimeout(300);
  const l2 = await ligne(p, '30-2');
  t(l2.q === 3 && l2.lots === 0 && l2.total === 20000 + 5100, `3 bouteilles de 2 L à 1 700 : ${l2.total} F au total`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) AU DÉTAIL, ET LE MENU DU PATRON ────────────────────────────────
{
  const d = boutique('detail'); d.cfg.venteDeverrouillee = true;      // modifications ouvertes
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  await appuiLong(p, '#pc-6'); await p.waitForTimeout(300);
  const menu = await p.evaluate(() => { const m = document.getElementById('ctxm'); const i = m.querySelector('.ctxi');
    return { vu: m.classList.contains('show'), premier: i ? i.textContent.trim() : '' }; });
  t(menu.vu && /Saisir une quantité/.test(menu.premier), `modifications ouvertes : le menu, et « Saisir une quantité » en premier (« ${menu.premier} »)`);
  await p.evaluate(() => { try { ctxQte(); } catch (e) {} }); await p.waitForTimeout(300);
  const v = await pave(p);
  t(!!v && /Pièces/.test(v.mode) && v.seg, `au détail, le pavé s'ouvre sur les pièces, le carton à côté (« ${v && v.mode} »)`);
  await p.evaluate(() => { try { paveUnite('c'); } catch (e) {} }); await taper(p, ['2']); await valider(p); await p.waitForTimeout(300);
  const l = await ligne(p, '6-0');
  t(l.q === 48 && l.lots === 2 && l.total === 26000, `et 2 cartons à leur prix : ${l.total} F`);
  t(await p.evaluate(() => { const c = document.getElementById('ctxi-qte'); showCtx({ clientX: 50, clientY: 50 }, DB.articles.find(x => x.id === 30)); return !!c && c.style.display === 'none'; }),
    'sur une famille, l\'entrée se cache : on choisit d\'abord la sorte');
  await p.evaluate(() => document.getElementById('ctxm').classList.remove('show'));
  // ⚠️ Mesuré sur la 23.03 : le patron ouvrait le menu d'une variante,
  // touchait « Saisir une quantité », tapait 3… et le panier restait VIDE.
  // Toucher le menu refermait le panneau, et `chgVQ` ne pousse au panier
  // que panneau ouvert. Ici, de vrais clics (pointerdown compris).
  await p.locator('#pc-30').click(); await p.waitForTimeout(500);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('#vinline-lst .vtile')).find(e => (e.querySelector('.vt-nm') || {}).textContent === '2 L');
    if (x) x.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 300 })); });
  await p.waitForTimeout(300);
  await p.locator('#ctxmv .ctxi').first().click(); await p.waitForTimeout(300);
  const pv2 = await pave(p);
  t(!!pv2 && /2 L · Huile/.test(pv2.nm), 'le menu de la variante ouvre le pavé');
  await p.evaluate(() => { try { paveUnite('p'); } catch (e) {} }); await taper(p, ['3']); await valider(p); await p.waitForTimeout(300);
  const l3 = await ligne(p, '30-2');
  t(l3.q === 3 && await p.evaluate(() => !!_varBox), `les 3 bouteilles sont au panier, et le panneau est resté ouvert (${l3.q})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 4) LE GESTE SE MONTRE, UNE FOIS ───────────────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, boutique('gros'));
  await p.evaluate(() => { window.__toasts = []; });
  for (let i = 0; i < 3; i++) { await p.locator('#pc-6 .pbas .pbarre').click(); await p.waitForTimeout(150); }
  await p.waitForTimeout(1900);
  let dit = await p.evaluate(() => window.__toasts.join(' | '));
  t(/Appui long sur la tuile/.test(dit), `au troisième carton touché, après la pause : l'astuce (« ${dit.slice(-90)} »)`);
  await p.evaluate(() => { viderPanier(); window.__toasts = []; });
  for (let i = 0; i < 3; i++) { await p.locator('#pc-6').click(); await p.waitForTimeout(150); }
  await p.waitForTimeout(1900);
  dit = await p.evaluate(() => window.__toasts.join(' | '));
  t(!/Appui long/.test(dit), 'une seule fois dans la vie du téléphone');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
