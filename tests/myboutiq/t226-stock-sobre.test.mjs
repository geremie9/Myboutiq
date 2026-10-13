// t226 — LE STOCK SANS EMOJI (23.11), TROISIÈME ÉTAPE DE LA REFONTE « PRO ».
// Relevé sur la 23.10 : 113 emplacements avec un emoji sur l'écran Stock et
// ses feuilles — les filtres (« 🛒 À commander », « ⚠️ Stock bas », « ⛔ »,
// « 🔥 »), « 💰 » devant la valeur, « ▾ 📦 Divers », le 📷 des photos à
// mettre, « 📦 Mouvement de stock », 📥 / 📤, « ✅ Enregistrer », et surtout
// le catalogue « Ajouter des articles » : sans réseau, les photos ne
// viennent pas et c'est l'emoji DESSOUS qui s'affichait — 40 pictos qui
// changent de visage d'un téléphone à l'autre.
// L'emoji de l'article (`p.e`) servait aussi d'image de secours (commande,
// variantes, panier, fiche) : c'est maintenant le dessin de sa tuile.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t226');
const { s, port } = await serveur();
const b = await chromium.launch();
const EMO = '[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{2712}\\u{2714}\\u{2716}-\\u{27BF}\\u{2B50}\\u{2B06}\\u{2194}-\\u{21FF}\\u{2328}\\u{232B}]';
const releve = p => p.evaluate(EMO => {
  const re = new RegExp(EMO, 'u'), out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode, e = n.parentElement;
    if (!e || (!e.offsetParent && getComputedStyle(e).position !== 'fixed')) continue;
    if (e.closest('#toast,#annonce-banner,#conn-bar')) continue;      // bandeaux : t225 ; messages : leur étape
    const r = e.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight * 3) continue;
    if (re.test(n.textContent)) out.push((e.id || e.className || e.tagName) + ' « ' + n.textContent.trim().slice(0, 30) + ' »');
  }
  return [...new Set(out)];
}, EMO);
const vu = (r, quoi) => t(!r.length, `${quoi} : aucun emoji${r.length ? ' — ' + r.slice(0, 5).join(' · ') : ''}`);
const fermer = p => p.evaluate(() => document.querySelectorAll('.ov.show').forEach(x => x.classList.remove('show')));

const d = nouvelleBoutique(); d.cfg.venteDeverrouillee = true; d.cfg.facon = 'detail';
d.articles.find(a => a.id === 5).stk0 = 2; d.articles.find(a => a.id === 5).al = 5;   // stock bas
d.articles.find(a => a.id === 4).stk0 = 0;                                          // épuisé
d.articles.find(a => a.id === 2).img = '/photo-qui-ne-vient-pas.jpg';               // une photo morte
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
// La caisse d'abord : la photo morte laisse le DESSIN de la tuile, pas l'emoji.
await p.waitForTimeout(400);
const tu = await p.evaluate(() => { const m = document.querySelector('#pc-2 .pmedia'); return { svg: !!(m && m.querySelector('svg')), txt: m ? m.textContent.trim() : '?' }; });
t(tu.svg && !tu.txt, `caisse, photo qui ne vient pas : le dessin de la tuile reste (« ${tu.txt} »)`);
await p.evaluate(() => navTo('stock', document.querySelectorAll('.ni')[1])); await p.waitForTimeout(500);
vu(await releve(p), 'la liste du stock');
const f = await p.evaluate(() => Array.from(document.querySelectorAll('#stk-filtres .stkf')).map(x => x.textContent.trim()));
t(f[0] === 'Tout' && /^À commander/.test(f[1]) && f[2] === 'Stock bas' && f[3] === 'Épuisés', `les filtres en mots (${f.join(' · ')})`);
await p.evaluate(() => filtreStock('cmd')); await p.waitForTimeout(250);
vu(await releve(p), 'à commander');
t(await p.evaluate(() => !!document.querySelector('.cmdm svg')), 'la liste à commander : le dessin de chaque article');
for (const x of ['bas', 'out', 'vend']) { await p.evaluate(x => filtreStock(x), x); await p.waitForTimeout(200); vu(await releve(p), 'filtre « ' + x + ' »'); }
await p.evaluate(() => filtreStock('tout'));
await p.evaluate(() => ouvrirStk(DB.articles.find(a => a.id === 6))); await p.waitForTimeout(500);
vu(await releve(p), 'mouvement de stock');
const ms = await p.evaluate(() => ({ tit: document.getElementById('ov-stk-t').textContent, in: !!document.querySelector('#stk-sens-in svg'), out: !!document.querySelector('#stk-sens-out svg') }));
t(ms.tit === 'Mouvement de stock' && ms.in && ms.out, `« ${ms.tit} », reçu / perdu dessinés`);
// Une entrée passe toujours : on n'a touché qu'au dessin.
const avant = await p.evaluate(() => getStk(DB.articles.find(a => a.id === 6)));
await p.evaluate(() => { const i = document.getElementById('inp-sqte'); if (i) { i.value = '24'; i.dispatchEvent(new Event('input', { bubbles: true })); } });
await p.evaluate(() => { try { saveStk(); } catch (e) {} }); await p.waitForTimeout(400);
const apres = await p.evaluate(() => getStk(DB.articles.find(a => a.id === 6)));
t(apres > avant, `« J'ai reçu » ajoute toujours au stock (${avant} → ${apres})`);
await fermer(p);
await p.evaluate(() => ouvrirAjouter()); await p.waitForTimeout(700);
vu(await releve(p), 'ajouter des articles (catalogue, sans réseau)');
t(await p.evaluate(() => document.querySelectorAll('#cha-grid .cha-m svg').length > 10), 'sous chaque photo du catalogue : le dessin de la tuile');
await fermer(p);
await p.evaluate(() => ouvrirCompleterArticle(DB.articles.find(a => a.id === 6))); await p.waitForTimeout(600);
vu(await releve(p), 'la fiche article');
t(await p.evaluate(() => !!document.querySelector('#cmp-img svg')), 'la fiche article : le dessin, pas l\'emoji');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();
await b.close(); s.close();
fin();
