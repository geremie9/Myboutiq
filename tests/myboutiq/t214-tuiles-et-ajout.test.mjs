// t214 — LA TUILE CALME, LA FAÇON DE VENDRE, ET AJOUTER EN UN GESTE (23.01).
// « Ajouter des articles, ça paraît complexe : trop de choix. Les tuiles :
// repense-les pour tous les commerces, grossiste ou détail, avec des
// touches pensées et moins stressantes. »
// Sa capture : des cartes à photo pleine page (nom en blanc sur un voile)
// au milieu de cartes blanches ; « 📦 carton / sac / palette » sous presque
// chaque tuile, sans prix ; la seule qui en avait un, coupée. Et pour
// ajouter un article, sept choses à lire — le support en tête, à cause
// d'un id en double.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, serveur, compteur, couperInternet, RACINE } from './lib.mjs';
import { nouvelleBoutique } from './caisse.mjs';
const { t, fin } = compteur('t214');
const { s, port } = await serveur();
const b = await chromium.launch();
const PHOTO = 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/APP/products/t214.png';

function boutique(facon) {
  const d = nouvelleBoutique();
  if (facon) d.cfg.facon = facon;
  d.cfg.venteDeverrouillee = false;          // la caisse de tous les jours : modifications fermées
  const A = (id, nm, px, x) => Object.assign({ id, nm, e: '📦', cat: 'Divers', px, pa: Math.round(px * .8), stk0: 60, al: 0, vd: 0, vr: [] }, x);
  d.articles.push(
    A(20, 'Sucre (kg)', 700, { e: '🍬', um: 'kg', umSac: 50, umCont: 'sac' }),            // un sac connu, sans prix
    A(21, 'Huile diamaor', 2000, { e: '🫙', img: PHOTO, umSac: 12, umCont: 'carton' }),   // une vraie photo
    A(22, 'Bière locale', 600, { e: '🍺', umSac: 12, umCont: 'casier', pxGros: 6800, paGros: 6000 }));
  return d;
}
// La caisse sur 360 px, le téléphone d'entrée de gamme. Sans service worker :
// c'est lui qui irait chercher la photo, hors de portée du banc.
async function caisse(db) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, locale: 'fr-FR', timezoneId: 'Africa/Douala', serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.route(PHOTO, r => r.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(RACINE, 'icon-192.png')) }));
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(1500);
  await p.evaluate(db => {
    window.__toasts = []; const st = window.showToast;
    window.showToast = function (m) { window.__toasts.push(String(m)); try { return st.apply(this, arguments); } catch (e) {} };
    window.parler = () => {}; window.confirm = () => true;
    supa = null; _suppressSync = true; _demarre = true;
    DB = migrateDBData(db); role = 'patron'; lancerApp();
    document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  }, db);
  await p.waitForTimeout(900);
  return { ctx, p, errs };
}
const tuile = (p, id) => p.evaluate(id => {
  const c = document.getElementById('pc-' + id); if (!c) return null;
  // 23.07 — le gros vit dans la barre du bas (`.pbas`), sur toutes les tuiles.
  const g = c.querySelector('.pbas .pbarre, .pbas .pgros'), nm = c.querySelector('.pnm-ov'), i = g && g.querySelector('i');
  const r = c.getBoundingClientRect();
  return { cls: c.className, chip: g ? g.innerText.replace(/\s+/g, ' ').trim() : '', unit: !!c.querySelector('.punit'),
    prix: (c.querySelector('.ppr-ov') || {}).innerText || '', sous: (c.querySelector('.ppr-lib') || {}).innerText || '',
    basY: (() => { const b = c.querySelector('.pbas'); return b ? Math.round(r.bottom - b.getBoundingClientRect().bottom) : -1; })(),
    nomY: nm ? Math.round(nm.getBoundingClientRect().top - r.top) : -1, nomCouleur: nm ? getComputedStyle(nm).color : '',
    coupe: i ? i.scrollWidth > i.clientWidth + 1 : false,
    photo: (() => { const im = c.querySelector('.pmedia.pphoto img'); return im ? (im.complete && im.naturalWidth > 0) : false; })() };
}, id);
const panier6 = p => p.evaluate(() => ({ q: panier['6-0'] || 0, lots: ((_grosPanier['6-0'] || {}).lots || _grosPanier['6-0'] || []).length || 0, total: calcAPayer() }));

// ── 1) AU DÉTAIL (par défaut) ─────────────────────────────────────────
{
  const { ctx, p, errs } = await caisse(boutique(null));
  await p.waitForTimeout(600);
  const g = await p.evaluate(() => ({ plein: document.querySelectorAll('#pgrid .pcard.has-photo').length, puces: document.querySelectorAll('#pgrid .pbas .pbarre, #pgrid .pbas .pgros').length }));
  const huile = await tuile(p, 21), sucre = await tuile(p, 20), savon = await tuile(p, 6), biere = await tuile(p, 22);
  t(g.plein === 0 && huile.photo, `la photo se range dans la vignette, plus aucune carte à photo pleine page (${g.plein})`);
  t(huile.nomCouleur !== 'rgb(255, 255, 255)', `le nom sous une photo s'écrit en noir, plus en blanc sur un voile (${huile.nomCouleur})`);
  t(huile.nomY === sucre.nomY, `photo ou dessin, le nom tombe à la même hauteur (${huile.nomY} / ${sucre.nomY} px)`);
  t(!sucre.chip && !huile.chip, `un sac ou un carton SANS prix ne s'affiche plus sous la tuile (sucre « ${sucre.chip} », huile « ${huile.chip} »)`);
  t(/13\s?000/.test(savon.chip) && /carton de 24/.test(savon.chip), `le carton qui a un prix se montre, avec son montant : « ${savon.chip} »`);
  t(g.puces === 2, `deux puces dans toute la grille — les deux contenants qui ont un prix (${g.puces})`);
  t(/casier de 12/.test(biere.chip) && !biere.coupe, `« casier de 12 » tient en entier sur 360 px (« ${biere.chip} »)`);
  // Une touche sur la tuile : une pièce. Une touche sur la puce : un carton.
  await p.locator('#pc-6').click(); await p.waitForTimeout(250);
  await p.locator('#pc-6 .pbas .pbarre').click(); await p.waitForTimeout(300);
  const c = await panier6(p);
  t(c.q === 25 && c.total === 13600, `tuile = 1 pièce, barre du bas = 1 carton : 25 pièces, 600 + 13 000 = ${c.total}`);
  t(await p.evaluate(() => document.getElementById('caisse-sansgros').style.display === 'none'), 'au détail, aucun bandeau de gros : ce n\'est pas son métier');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) EN GROS : LA MÊME TUILE — LA PIÈCE EN HAUT, LE GROS EN BAS (23.07) ──
// « Il sait dans sa tête qu'en bas c'est le gros, en haut c'est le détail. »
// Jusqu'à la 23.06, en gros, la tuile d'un carton qui avait son prix
// montrait le CARTON en haut et la pièce en bas — l'inverse de sa voisine
// sans prix. Le sens ne dépend plus ni du mode, ni du prix.
{
  const { ctx, p, errs } = await caisse(boutique(null));
  // Le patron le dit une fois, dans Réglages › Type de commerce.
  await p.evaluate(() => { goSt(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('row-facon').scrollIntoView({ block: 'center' }));
  await p.locator('#fc-gros').click(); await p.waitForTimeout(300);
  const r = await p.evaluate(() => ({ facon: DB.cfg.facon, on: document.getElementById('fc-gros').classList.contains('on'), s: document.getElementById('st-facon-s').textContent,
    garde: JSON.parse(localStorage.getItem('myboutiq_v6') || '{}').cfg.facon }));
  t(r.facon === 'gros' && r.on && /carton/.test(r.s) && r.garde === 'gros', `« Je vends surtout : Gros » est retenu, et gardé sur le téléphone (« ${r.s} »)`);
  await p.evaluate(() => { goBack(); });
  await p.evaluate(() => { goScreen('s-caisse'); renderProd(DB.articles); });
  await p.waitForTimeout(400);
  const savon = await tuile(p, 6), sucre = await tuile(p, 20), biere = await tuile(p, 22);
  t(/600/.test(savon.prix) && /pièce/.test(savon.sous), `en haut, la pièce — comme au détail (« ${savon.prix} · ${savon.sous} »)`);
  t(/13\s?000/.test(savon.chip) && /carton de 24/.test(savon.chip), `en bas, le carton, son prix et sa taille (« ${savon.chip} »)`);
  t(/6\s?800/.test(biere.chip) && /casier de 12/.test(biere.chip) && /\d/.test(biere.prix) && !/6\s?800/.test(biere.prix), `même chose pour le casier (« ${biere.prix} » / « ${biere.chip} »)`);
  t(/sac/.test(sucre.chip) && /prix \?/.test(sucre.chip), `chez un grossiste tout est vendable en gros : le sac sans prix garde sa barre, et le dit (« ${sucre.chip} »)`);
  t(savon.basY === sucre.basY && savon.basY >= 0, `la barre du gros est au même endroit sur toutes les tuiles (${savon.basY} / ${sucre.basY} px du bord)`);
  // « Peut-être que les grossistes trouvent l'app complexe. » Les prix de gros
  // qui manquent se règlent d'un seul écran, pas un par un sous les tuiles.
  const band = await p.evaluate(() => { const z = document.getElementById('caisse-sansgros'); return { vu: z && z.style.display !== 'none', txt: z ? z.textContent : '' }; });
  t(band.vu && /2 articles sans prix de gros/.test(band.txt), `un bandeau compte les contenants sans prix (« ${band.txt} »)`);
  await p.locator('#caisse-sansgros').click(); await p.waitForTimeout(400);
  t(await p.evaluate(() => !!document.querySelector('#ov-grille.show')), 'et ouvre « Tout configurer », qui a la colonne du carton');
  await p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
  await p.locator('#pc-6').click(); await p.waitForTimeout(250);
  await p.locator('#pc-6 .pbas .pbarre').click(); await p.waitForTimeout(300);
  const c = await panier6(p);
  t(c.q === 25 && c.total === 13600, `les mêmes gestes qu'au détail : tuile = 1 pièce, barre = 1 carton : 25 pièces, 600 + 13 000 = ${c.total}`);
  t(c.lots === 1, `le carton est compté comme UN carton (le reçu dira « carton de 24 »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) AJOUTER : UN SEUL GESTE ────────────────────────────────────────
// (une boutique qui a déjà répondu à « Tu vends surtout… » — la question
// elle-même est au banc t215)
{
  const { ctx, p, errs } = await caisse(boutique('detail'));
  await p.evaluate(() => { document.getElementById('btn-add').style.display = ''; });
  await p.locator('#btn-add').click(); await p.waitForTimeout(1200);
  const a = await p.evaluate(() => ({ cat: !!document.querySelector('#ov-choixart.show'), porte: !!document.querySelector('#ov-porte.show'),
    tit: document.getElementById('cha-tit').textContent, lien: (document.getElementById('cha-autres') || {}).textContent || '' }));
  t(a.cat && !a.porte, '« + Ajouter » ouvre directement le catalogue — plus d\'écran de choix avant');
  t(/Ajouter des articles/.test(a.tit), `et il dit ce qu'il fait pour une boutique qui a déjà des articles (« ${a.tit} »)`);
  t(/Autres façons/.test(a.lien), `les autres façons sont un lien, en bas (« ${a.lien} »)`);
  await p.locator('#cha-autres').click(); await p.waitForTimeout(500);
  const o = await p.evaluate(() => {
    const ov = document.getElementById('ov-porte'), lignes = ov.querySelectorAll('.stit2'), sup = ov.querySelector('.aide-cr');
    return { ouvert: ov.classList.contains('show'), tit: document.getElementById('porte-tit').textContent, n: lignes.length,
      doublon: document.querySelectorAll('[id="porte-aide"]').length,
      supEnBas: !!sup && sup.getBoundingClientRect().top > lignes[lignes.length - 1].getBoundingClientRect().top,
      cat: !!ov.querySelector('.porte-reco') };
  });
  t(o.ouvert && /Autres façons/.test(o.tit) && o.n === 4 && !o.cat, `« Autres façons d'ajouter » : les quatre autres, sans re-proposer le catalogue (${o.n})`);
  t(o.doublon === 0 && o.supEnBas, 'le support est en DERNIER, comme voulu — plus d\'id en double qui le faisait monter en tête');
  await p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
  await p.evaluate(() => majFabAjout());
  await p.locator('#fab-add').click(); await p.waitForTimeout(900);
  t(await p.evaluate(() => !!document.querySelector('#ov-choixart.show')), 'le bouton rond « + » ouvre le même catalogue');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// Boutique vide : la question d'avant garde son sens.
{
  const d = nouvelleBoutique({ articles: [] }); d.cfg.facon = 'detail';
  const { ctx, p, errs } = await caisse(d);
  await p.evaluate(() => ouvrirAjouter()); await p.waitForTimeout(900);
  const tit = await p.evaluate(() => document.getElementById('cha-tit').textContent);
  t(/Qu'est-ce que tu vends/.test(tit), `boutique vide : « ${tit} »`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
