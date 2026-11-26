// t343 — « ÉPUISÉ », « CE QUE VAUT MA BOUTIQUE », « MODIFIER LA FAMILLE » (24.22).
// Le patron, 26/11, cinq captures de sa boutique « G » : « des frictions ou
// incohérences… essaie de modifier tout, vous les trouverez ». Rejoué ici avec
// ses familles (noms, prix et stocks recopiés, sans photos).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t343');
const { s, port } = await serveur();
const b = await chromium.launch();
const V = (id, nm, px, pa, stk) => ({ id, nm, px, pa, stk0: stk, rt: true, qBase: 1, umSac: 12, umCont: 'palette' });
const d = nouvelleBoutique();
d.articles.push({ id: 140, nm: 'Top ananas 60 cl', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 5, vr: [V(1, 'Top ananas 60 cl', 350, 300, 575), V(2, 'Coca Cola 50 cl', 250, 0, 0), V(3, 'Coca Cola 1 L', 500, 0, 0), V(4, 'Coca Cola 1,5 L', 600, 0, 0)] });
d.articles.push({ id: 147, nm: 'Boisson predator', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 5, vr: [V(1, 'Boisson Predator 33 cl', 0, 0, 223), V(2, 'Boisson Predator 1,25 L', 125, 0, 0), V(3, 'Boisson Predator 50 cl', 300, 0, 0)] });
d.articles.push({ id: 150, nm: 'Bière locale', e: '', cat: 'Boissons', px: 600, pa: 290, stk0: 11, al: 6, vr: [], umNom: '12', umSac: 12, umCont: 'carton' });
const { p, errs } = await ouvrirCaisse(b, port, d);
p.on('dialog', x => x.accept());

// ── 1. Épuisés : la famille dit combien de sortes sont à 0, montre le reste en gris ──
const ep = await p.evaluate(() => {
  navTo('stock', document.querySelectorAll('.ni')[1]); filtreStock('out');
  const row = [...document.querySelectorAll('#stk-lst .sit')].find(x => /Top ananas/.test(x.querySelector('.sinm').textContent));
  return row && { qty: row.querySelector('.siqty').textContent, u: row.querySelector('.siu').textContent, chauds: row.querySelectorAll('.svchaud').length, calmes: [...row.querySelectorAll('.svcalme')].map(x => x.textContent), barre: !!row.querySelector('.sbb') };
});
t(ep && ep.qty === '3' && /sortes à 0/.test(ep.u), `Top ananas sous « Épuisés » : « ${ep && ep.qty} ${ep && ep.u} » (avant : « 0 unités » rouge)`);
t(ep && ep.chauds === 3 && ep.calmes.length === 1 && /\+ 1 autre en stock/.test(ep.calmes[0]), `3 sortes à 0 en rouge, la sorte en stock résumée en gris derrière (${JSON.stringify(ep && ep.calmes)})`);
t(ep && !ep.barre, `plus de barre verte pleine sous un « épuisé »`);
const pr = await p.evaluate(() => { const row = [...document.querySelectorAll('#stk-lst .sit')].find(x => /predator/i.test(x.querySelector('.sinm').textContent)); return row ? [...row.querySelectorAll('.svcalme')].map(x => x.textContent) : null; });
t(pr && pr.some(x => /\+ 1 autre en stock/.test(x)), `la Predator 33 cl (223 en stock, sans prix) compte dans le gris (${JSON.stringify(pr)})`);

// ── 2. Une unité qui s'appelle « 12 » ──
const u = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 150); return { umNom: a.umNom, umSac: a.umSac, unite: uniteArt(a) }; });
t(u.umNom === undefined && u.umSac === 12 && /unit/.test(u.unite), `Bière locale : l'unité « 12 » redevient « ${u.unite} », le carton garde 12`);

// ── 3. Ce que vaut ma boutique : une image, un mot, un grand chiffre ──
const vb = await p.evaluate(() => { filtreStock('tout'); ouvrirValeur(); const c = document.getElementById('vb-corps'); const b = c.querySelector('.vb-tuile b'); return { tuiles: c.querySelectorAll('.vb-tuile').length, ic: c.querySelectorAll('.vb-tuile .vb-ic svg').length, taille: parseFloat(getComputedStyle(b).fontSize), gagne: !!c.querySelector('.vb-si-g'), texte: c.innerText }; });
t(vb.tuiles === 3 && vb.ic === 3 && vb.taille >= 20, `3 lignes avec image, chiffres à ${vb.taille} px (avant : 15 px et une phrase grise sous chacune)`);
t(vb.gagne && !/le même chiffre que la clôture/.test(vb.texte), `« Si tu vends tout » / « Tu gagnes » en deux grands chiffres ; plus de phrase longue`);
await p.evaluate(() => closeSheet('ov-valeur'));

// ── 4. Modifier la famille ──
await p.evaluate(() => { window.__t = []; const st = showToast; showToast = m => { window.__t.push(m); st(m); }; ouvrirCompleterArticle(DB.articles.find(x => x.id === 147)); });
await p.waitForTimeout(400);
const f1 = await p.evaluate(() => ({ lbl: [...document.querySelectorAll('#cmp-vars .cmpv-lbl')].map(x => x.innerText.replace(/\s+/g, ' ')), al: [...document.querySelectorAll('#cmp-vars .cmpv-alerte')].map(x => x.style.display !== 'none' ? x.textContent : ''), hint: document.getElementById('cmp-hint').textContent }));
t(f1.lbl.length === 3 && /Achat.*Vente.*Stock/.test(f1.lbl[0]), `chaque sorte : « ${f1.lbl[0]} » écrit au-dessus des cases (avant : seulement dans la case vide)`);
t(/Pas de prix de vente.*223 en stock/.test(f1.al[0]) && /125 FCFA.*1,25 L.*taille/.test(f1.al[1]) && !f1.al[2], `les prix à vérifier se disent : ${JSON.stringify(f1.al)}`);
t(!/Donne un nom/.test(f1.hint), `la famille a un nom : plus de bannière « Donne un nom à la famille » (« ${f1.hint} »)`);
const tape = async (vid, f, v) => { const l = p.locator(`#cmp-vars [data-cvid="${vid}"][data-cvf="${f}"]`); await l.fill(String(v)); await l.dispatchEvent('input'); };
await tape(3, 'px', 350);
await p.evaluate(() => cmpDelVar(2)); await p.waitForTimeout(200);
t(await p.locator('#cmp-vars [data-cvid="3"][data-cvf="px"]').inputValue() === '350', `« 350 » tapé, puis une autre sorte supprimée : le 350 reste (avant : revenait à 300)`);
await p.evaluate(() => validerCompleter()); await p.waitForTimeout(200);
const f2 = await p.evaluate(() => ({ t: window.__t.slice(-1)[0], ouvert: document.getElementById('ov-completer').classList.contains('show') }));
t(f2.ouvert && /1 prix à vérifier/.test(f2.t), `1re touche « Enregistrer » avec une sorte sans prix : « ${f2.t} »`);
await p.evaluate(() => validerCompleter()); await p.waitForTimeout(300);
const f3 = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 147); return { ouvert: document.getElementById('ov-completer').classList.contains('show'), px: a.vr.map(v => v.nm + '=' + v.px) }; });
t(!f3.ouvert && f3.px.includes('Boisson Predator 50 cl=350'), `2e touche : enregistré tel quel (${f3.px.join(', ')})`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
