// t215 — LE GROSSISTE, DE L'ENREGISTREMENT À LA VENTE (23.02).
// « N'avoir pas vendu en carton ne signifie pas que les grossistes ne sont
// pas intéressés : ils trouvent ça complexe, de l'enregistrement jusqu'à la
// vente. »
// Mesuré en base le 11/10 : 84 articles portaient une taille de carton (le
// catalogue la donne au choix), 3 seulement un prix de carton. L'écran des
// prix demandait le prix de la PIÈCE ; le carton se réglait ailleurs, ou
// devant le client à la première vente ; le stock se comptait en pièces.
// Le banc refait le parcours : la question « détail ou gros », le catalogue
// qui dit le contenant, le prix du carton d'abord, le stock en cartons —
// puis la caisse, qui vend le carton.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t215');
const { s, port } = await serveur();
const b = await chromium.launch();

const fermer = p => p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
// Sur un code qui n'a pas l'écran, l'élément manque : on le constate (❌) au
// lieu d'attendre trente secondes et de planter.
const clic = async (p, sel) => { const l = p.locator(sel); if (await l.count() && await l.first().isVisible()) { await l.first().click(); return true; } return false; };
const remplir = async (p, sel, v) => { const l = p.locator(sel); if (await l.count()) { await l.first().fill(v); return true; } return false; };
const vide = (facon) => { const d = nouvelleBoutique({ articles: [] }); if (facon) d.cfg.facon = facon; return d; };
// Le catalogue en photos, comme il le fait : il cherche, il touche.
async function choisir(p, noms) {
  await p.evaluate(() => ouvrirAjouter()); await p.waitForTimeout(1500);
  for (const nm of noms) {
    await p.evaluate(nm => { chaFiltrer(nm); }, nm); await p.waitForTimeout(250);
    const ok = await p.evaluate(nm => {
      const x = Array.from(document.querySelectorAll('#cha-grid > div[onclick]')).find(e => (e.querySelector('div') && e.innerText.split('\n').some(l => l.trim() === nm)));
      if (!x) return false; x.click(); return true;
    }, nm);
    if (!ok) return false;
    await p.waitForTimeout(250);
  }
  await clic(p, '#cha-btn'); await p.waitForTimeout(700);
  return true;
}

// ── 1) LA QUESTION : UNE FOIS, AU PREMIER AJOUT ───────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, vide(null));
  await p.evaluate(() => ouvrirAjouter()); await p.waitForTimeout(700);
  const q = await p.evaluate(() => ({ q: !!document.querySelector('#ov-facon.show'), cat: !!document.querySelector('#ov-choixart.show'),
    txt: ((document.getElementById('ov-facon') || {}).innerText || '').replace(/\s+/g, ' ') }));
  t(q.q && !q.cat, 'au premier ajout, une seule question passe avant le catalogue');
  t(/Tu vends surtout/.test(q.txt) && /Au détail/.test(q.txt) && /En gros/.test(q.txt) && /Carton de 24/.test(q.txt),
    `« Tu vends surtout… », au détail ou en gros, un exemple de chaque (« ${q.txt.slice(0, 90)}… »)`);
  await clic(p, '#fq-gros'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ facon: DB.cfg.facon, garde: JSON.parse(localStorage.getItem('myboutiq_v6')).cfg.facon,
    cat: !!document.querySelector('#ov-choixart.show'), q: !!document.querySelector('#ov-facon.show') }));
  t(r.facon === 'gros' && r.garde === 'gros', 'une tape sur « En gros » : la boutique vend en gros, et c\'est enregistré');
  t(r.cat && !r.q, 'le catalogue s\'ouvre aussitôt après');
  await fermer(p);
  await p.evaluate(() => ouvrirAjouter()); await p.waitForTimeout(900);
  t(await p.evaluate(() => !document.querySelector('#ov-facon.show') && !!document.querySelector('#ov-choixart.show')), 'la question n\'est posée qu\'une fois');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// « Au détail » s'écrit aussi : sans quoi la question revenait à chaque ajout.
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, vide(null));
  await p.evaluate(() => ouvrirAjouter()); await p.waitForTimeout(700);
  await clic(p, '#fq-det'); await p.waitForTimeout(1200);
  await fermer(p);
  await p.evaluate(() => ouvrirAjouter()); await p.waitForTimeout(900);
  const r = await p.evaluate(() => ({ facon: DB.cfg.facon, q: !!document.querySelector('#ov-facon.show'), cat: !!document.querySelector('#ov-choixart.show') }));
  t(r.facon === 'detail' && !r.q && r.cat, `« Au détail » est retenu aussi : plus de question au deuxième ajout (${r.facon})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// Ni au vendeur (il ne décide pas de la caisse), ni dans la démonstration.
{
  const d = vide(null); d.equipe[1].perms = { vente: true, produits: true };
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { vendeur: 'Ibrahim' });
  await p.evaluate(() => ouvrirChoixArticles()); await p.waitForTimeout(900);
  t(await p.evaluate(() => !document.querySelector('#ov-facon.show') && !!document.querySelector('#ov-choixart.show') && !DB.cfg.facon),
    'un vendeur qui ajoute des articles ne reçoit pas la question');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
{
  const d = vide(null); d.cfg.demo = true;
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  await p.evaluate(() => ouvrirAjouter()); await p.waitForTimeout(900);
  t(await p.evaluate(() => !document.querySelector('#ov-facon.show')), 'la démonstration non plus');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) LE CATALOGUE DIT LE CONTENANT ──────────────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, vide('gros'));
  await p.evaluate(() => ouvrirAjouter()); await p.waitForTimeout(1500);
  const sous = () => p.evaluate(() => {
    chaFiltrer('Bougie');
    const x = Array.from(document.querySelectorAll('#cha-grid > div[onclick]')).find(e => e.innerText.split('\n').some(l => l.trim() === 'Bougie'));
    const z = x && x.querySelector('.cha-sous');
    return z ? { txt: z.textContent, coul: getComputedStyle(z).color } : null;
  });
  const g = await sous();
  t(!!g && g.txt === 'carton de 50' && g.coul === 'rgb(0, 105, 92)', `en gros, la tuile dit le contenant du catalogue (« ${g && g.txt} »)`);
  await p.evaluate(() => { DB.cfg.facon = 'detail'; });
  const d = await sous();
  t(!!d && d.txt === 'unité', `au détail, la tuile reste ce qu'elle était (« ${d && d.txt} »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) LEURS PRIX : LE CARTON D'ABORD — TON STOCK : EN CARTONS ────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, vide('gros'));
  t(await choisir(p, ['Bougie', 'Canne à sucre']), 'il choisit une bougie (carton de 50) et une canne à sucre (sans carton)');
  const e = await p.evaluate(() => {
    const c = document.querySelector('#expg-0'), big = c && c.querySelector('.expg-big input');
    return { ouvert: !!document.querySelector('#ov-express.show'), tit: document.getElementById('exp-tit').textContent,
      cartes: document.querySelectorAll('#exp-liste .expg').length, lab: c ? c.querySelector('.expg-l').textContent : '',
      taille: c ? c.querySelector('.expg-t').textContent : '', ph: big ? big.placeholder : '',
      detail: Array.from(document.querySelectorAll('#exp-liste input')).filter(i => /Prix de vente/.test(i.placeholder)).length,
      btn: document.getElementById('exp-valider-l').textContent };
  });
  t(e.ouvert && /Leurs prix · 1\/2/.test(e.tit), `l'écran des prix s'ouvre, première de deux étapes (« ${e.tit} »)`);
  t(e.cartes === 1 && /Le carton, tu le vends/.test(e.lab) && e.ph === 'Prix du carton',
    `la bougie demande d'abord le prix du CARTON, en grand (« ${e.lab} »)`);
  t(/carton de 50/.test(e.taille), `la taille du carton reste visible et corrigeable (« ${e.taille} »)`);
  t(e.detail === 1, 'la canne à sucre, sans carton, garde la ligne au détail qu\'il connaît');
  t(/Suivant : ton stock/.test(e.btn), `le bouton dit l'étape suivante (« ${e.btn} »)`);
  await remplir(p, '#expg-0 .expg-big input', '4500');
  await remplir(p, '#expg-0 .expg-sm input >> nth=0', '100');
  await remplir(p, '#expg-0 .expg-sm input >> nth=1', '4000');
  await remplir(p, '#exp-liste input[placeholder="Prix de vente"]', '200');
  const v = await p.evaluate(() => { const g = id => document.getElementById(id);
    return { ben: (g('expg-ben-0') || {}).textContent || '', pa: (g('expg-pa-0') || {}).textContent || '',
      ok: !!g('expg-ok-0') && getComputedStyle(g('expg-ok-0')).display !== 'none', n: (g('exp-compte') || {}).textContent || '' }; });
  t(/Bénéfice : \D*500 par carton/.test(v.ben), `le bénéfice par carton se lit tout de suite (« ${v.ben} »)`);
  t(/soit \D*80 la pièce/.test(v.pa), `le prix d'achat du carton est divisé devant lui, pas en silence (« ${v.pa} »)`);
  t(v.ok && /2 articles prêts sur 2/.test(v.n), `la carte se coche, et le compte suit (« ${v.n} »)`);
  await clic(p, '#exp-valider'); await p.waitForTimeout(500);
  const st = await p.evaluate(() => ({ tit: document.getElementById('exp-tit').textContent, cartons: (document.getElementById('exps-w-0') || {}).textContent,
    btn: document.getElementById('exp-valider-l').textContent, ret: !!document.querySelector('#exp-compte .exp-ret'), crees: DB.articles.length }));
  t(/Ton stock · 2\/2/.test(st.tit) && st.crees === 0, `puis « Ton stock », avant de rien créer (« ${st.tit} »)`);
  t(st.ret, 'un lien ramène aux prix');
  for (let i = 0; i < 3; i++) await clic(p, '#exps-0 .exps-b.p');
  await remplir(p, '#exps-0 .exps-v input', '7');
  await remplir(p, '#exps-n-1', '10');
  const s2 = await p.evaluate(() => { const g = id => document.getElementById(id) || {};
    return { n: g('exps-n-0').value, w: g('exps-w-0').textContent, tot: g('exps-t-0').textContent || '', btn: g('exp-valider-l').textContent || '' }; });
  t(s2.n === '3' && s2.w === 'cartons', `il compte en cartons : ${s2.n} ${s2.w}`);
  t(/= 157 pièces/.test(s2.tot), `+ 7 en vrac — l'app compte les pièces pour lui (« ${s2.tot} »)`);
  t(/C'est prêt/.test(s2.btn), `« ${s2.btn} »`);
  await clic(p, '#exp-valider'); await p.waitForTimeout(800);
  const a = await p.evaluate(() => {
    const bo = DB.articles.find(x => x.nm === 'Bougie'), ca = DB.articles.find(x => /Canne/.test(x.nm));
    return { bo: bo && { px: bo.px, pxGros: bo.pxGros, paGros: bo.paGros, pa: bo.pa, n: bo.umSac, mot: bo.umCont, stk: getStk(bo), id: bo.id },
      ca: ca && { px: ca.px, stk: getStk(ca) }, ferme: !document.querySelector('#ov-express.show') };
  });
  t(!!a.bo && a.bo.pxGros === 4500 && a.bo.paGros === 4000 && a.bo.px === 100 && a.bo.n === 50 && a.bo.mot === 'carton',
    `la bougie est créée avec son carton : ${JSON.stringify(a.bo)}`);
  t(!!a.bo && a.bo.pa === 80, `son prix d'achat à la pièce vient du carton divisé : ${a.bo && a.bo.pa}`);
  t(!!a.bo && a.bo.stk === 157, `son stock : 3 cartons + 7 = ${a.bo && a.bo.stk} pièces`);
  t(!!a.ca && a.ca.px === 200 && a.ca.stk === 10 && a.ferme, `la canne à sucre aussi, au détail : ${JSON.stringify(a.ca)}`);
  // ── et la caisse vend la pièce en haut, le carton en bas (23.07) ──
  if (a.bo) {
  await fermer(p); await p.evaluate(() => renderProd(DB.articles)); await p.waitForTimeout(300);
  const id = a.bo.id;
  const tu = await p.evaluate(id => { const c = document.getElementById('pc-' + id);
    return { prix: c.querySelector('.ppr-ov').innerText, lib: (c.querySelector('.ppr-lib') || {}).innerText || '',
      barre: (c.querySelector('.pbas .pbarre') || {}).innerText || '' }; }, id);
  t(/^100/.test(tu.prix) && /la pièce/i.test(tu.lib) && /4\s?500/.test(tu.barre) && /carton de 50/.test(tu.barre),
    `à la caisse : la pièce en haut, le carton en bas (« ${tu.prix} ${tu.lib} » · « ${tu.barre.replace(/\s+/g, ' ')} »)`);
  await p.locator('#pc-' + id).click(); await p.waitForTimeout(300);
  let c = await p.evaluate(id => ({ q: panier[id + '-0'] || 0, total: calcAPayer() }), id);
  t(c.q === 1 && c.total === 100, `la tuile = une pièce : ${c.q} bougie, ${c.total} F`);
  await p.locator('#pc-' + id + ' .pbas .pbarre').click(); await p.waitForTimeout(300);
  c = await p.evaluate(id => ({ q: panier[id + '-0'] || 0, total: calcAPayer() }), id);
  t(c.q === 51 && c.total === 4600, `la barre du bas = un carton : ${c.q} bougies, ${c.total} F`);
  }
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3 bis) « LA PALETTE, TU LA VENDS » : SON MOT, ACCORDÉ ─────────────
// Le catalogue vend l'eau à la palette. Ce que `chaValider` remet à l'écran
// des prix pour un tel choix, on le lui remet tel quel.
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, vide('gros'));
  await p.evaluate(() => { _expListe = [{ nm: 'Eau minérale Opur 1,5 L', px: 0, pa: 0, stk: 0, umSac: 12, umCont: 'palette' }]; ouvrirAjoutExpress(true); });
  await p.waitForTimeout(400);
  const e = await p.evaluate(() => { const c = document.getElementById('expg-0');
    return c ? { lab: c.querySelector('.expg-l').textContent, ph: c.querySelector('.expg-big input').placeholder,
      hint: c.querySelectorAll('.expg-hint')[0].textContent, achat: c.querySelectorAll('.expg-hint')[1].textContent } : {}; });
  t(e.lab === 'La palette, tu la vends' && e.ph === 'Prix de la palette', `« ${e.lab} » · « ${e.ph} »`);
  t(e.hint === 'si tu casses la palette' && e.achat === 'la palette · facultatif', `« ${e.hint} » · « ${e.achat} »`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 4) LE PRIX DU CARTON SUFFIT : LA PIÈCE PEUT ATTENDRE ──────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, vide('gros'));
  await choisir(p, ['Bougie']);
  await remplir(p, '#expg-0 .expg-big input', '4500');
  await clic(p, '#exp-valider'); await p.waitForTimeout(400);
  const avant = await p.evaluate(() => ({ crees: DB.articles.length, toast: (window.__toasts || []).join(' | '), etape: typeof _expEtape !== 'undefined' ? _expEtape : '' }));
  t(avant.etape === 'stock' && !/pas de prix/.test(avant.toast), 'le seul prix du carton suffit : pas de « sans prix », on passe au stock');
  for (let i = 0; i < 2; i++) await clic(p, '#exps-0 .exps-b.p');
  await clic(p, '#exp-valider'); await p.waitForTimeout(800);
  await clic(p, '#exp-valider'); await p.waitForTimeout(800);     // l'ancien écran redemande : « créer quand même »
  const a = await p.evaluate(() => { const x = DB.articles.find(y => y.nm === 'Bougie'); return x && { id: x.id, px: x.px, pxGros: x.pxGros }; });
  t(!!a && a.px === 0 && a.pxGros === 4500, `créée sans prix à la pièce : ${JSON.stringify(a)}`);
  if (a && a.pxGros === 4500) {
  await fermer(p); await p.evaluate(() => renderProd(DB.articles)); await p.waitForTimeout(300);
  const tu = await p.evaluate(id => { const c = document.getElementById('pc-' + id);
    return { inc: c.classList.contains('incomplete') || !!c.querySelector('.sinc'), haut: (c.querySelector('.ppr-vide') || {}).innerText || '',
      barre: (c.querySelector('.pbas .pbarre') || {}).innerText || '', sansPrix: _articlesSansPrix().length }; }, a.id);
  t(!tu.inc, 'à la caisse, ce n\'est pas un article « à compléter » : le carton a son prix');
  t(/Prix \?/.test(tu.haut) && tu.sansPrix === 0, `en haut, la pièce dit qu'elle n'a pas de prix (« ${tu.haut} »), et rien n'est compté « sans prix »`);
  t(/4\s?500/.test(tu.barre), `en bas, le carton et son prix (« ${tu.barre.replace(/\s+/g, ' ')} »)`);
  await p.evaluate(() => { window.__toasts = []; });
  await p.locator('#pc-' + a.id + ' .pnm-ov').click(); await p.waitForTimeout(300);
  let c = await p.evaluate(id => ({ q: panier[id + '-0'] || 0, toast: (window.__toasts || []).join(' | ') }), a.id);
  t(c.q === 0 && /touche la barre du bas/.test(c.toast), `toucher la pièce sans prix ne vend rien à 0 F, et dit où est le carton (« ${c.toast} »)`);
  await p.locator('#pc-' + a.id + ' .pbas .pbarre').click(); await p.waitForTimeout(300);
  c = await p.evaluate(id => ({ q: panier[id + '-0'] || 0, total: calcAPayer() }), a.id);
  t(c.q === 50 && c.total === 4500, `la barre vend le carton : ${c.q} bougies, ${c.total} F`);
  await p.evaluate(() => viderPanier());
  await p.locator('#pc-' + a.id + ' .ppr-vide').click(); await p.waitForTimeout(500);
  const u = await p.evaluate(id => ({ fiche: !!document.querySelector('#ov-completer.show'), q: panier[id + '-0'] || 0 }), a.id);
  t(u.fiche && u.q === 0, 'le patron touche « Prix ? » : la fiche demande le prix de la pièce — jamais une vente à 0 F');
  // Repassée au détail, la boutique dit la vérité : la pièce n'a pas de prix.
  await fermer(p); await p.evaluate(() => { DB.cfg.facon = 'detail'; renderProd(DB.articles); }); await p.waitForTimeout(300);
  t(await p.evaluate(id => document.getElementById('pc-' + id).classList.contains('incomplete'), a.id), 'au détail, le même article redevient « à compléter »');
  }
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 5) AU DÉTAIL, L'ÉCRAN NE CHANGE PAS ───────────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, vide('detail'));
  await choisir(p, ['Bougie']);
  const e = await p.evaluate(() => ({ cartes: document.querySelectorAll('#exp-liste .expg').length,
    pv: Array.from(document.querySelectorAll('#exp-liste input')).filter(i => /Prix de vente/.test(i.placeholder)).length,
    btn: document.getElementById('exp-valider-l').textContent, tit: document.getElementById('exp-tit').textContent }));
  t(e.cartes === 0 && e.pv === 1 && /Créer les 1 articles/.test(e.btn) && !/1\/2/.test(e.tit),
    `au détail : la ligne et le bouton de toujours (« ${e.btn} »)`);
  await remplir(p, '#exp-liste input[placeholder="Prix de vente"]', '100');
  await clic(p, '#exp-valider'); await p.waitForTimeout(800);
  const a = await p.evaluate(() => { const x = DB.articles.find(y => y.nm === 'Bougie'); return x && { px: x.px, pxGros: x.pxGros || null, n: x.umSac }; });
  t(!!a && a.px === 100 && a.pxGros === null && a.n === 50, `créé d'une seule étape, le carton du catalogue gardé : ${JSON.stringify(a)}`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
