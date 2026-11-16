// t250 — « Tu vends quoi ? » (23.32)
// Mesuré en base le 22/10 : sur 42 boutiques extérieures, 23 n'ont jamais
// mis un seul article, aucune n'a fait plus de cinq ventes, et 9 commerçants
// ont créé 2 à 4 boutiques le même jour. L'étagère proposait riz, huile et
// sucre à tout le monde, un article à la fois.
//  · le métier se choisit en images, en un toucher, et la liste suit ;
//  · « Tout mettre dans ma caisse » : tout le rayon à son prix courant, en
//    un toucher, marqué « indicatif », sans prix d'achat inventé ;
//  · chaque article dans la bonne catégorie, avec le bon dessin ;
//  · « Annuler » retire le lot, sauf ce qui a déjà été vendu.
// 23.71 — le patron, 16/11 : « on doit être focus… pas de prêt-à-porter,
// mais la boisson et la boutique (alimentation, ménage, maison), chaque
// commerce avec ses catégories ». Une boutique NEUVE ne se voit plus
// proposer que ces deux commerces ; une boutique qui avait déjà choisi
// un autre métier (téléphonie, mode…) garde sa liste (sections 2 et 3).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t250');
const { s, port } = await serveur();
const b = await chromium.launch();
const neuve = () => nouvelleBoutique({ articles: [], ventes: [] });
const fermer = p => p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); });

// ── 1. La question, le métier, tout le rayon ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, neuve(), { tactile: true });
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(500);
  const v = await p.evaluate(() => {
    const ch = [...document.querySelectorAll('#pgrid .etg-ray')], bt = document.getElementById('etg-tout'), r = bt && bt.getBoundingClientRect();
    return { titre: (document.querySelector('#pgrid .etg-tete') || {}).textContent || '', n: ch.length,
      on: ch.filter(x => x.classList.contains('on')).map(x => x.dataset.rayon).join(','),
      coupe: ch.some(x => { const e = x.querySelector('.etg-ray-t'); return e.scrollWidth > e.clientWidth + 1; }),
      bouton: bt ? bt.textContent.trim() : '', vu: !!r && r.bottom <= innerHeight };
  });
  t(/Tu vends quoi/.test(v.titre) && v.n === 2 && v.on === 'boutique', `« ${v.titre.trim()} » et deux commerces en images — la boutique et le dépôt de boissons —, la boutique choisie d'office (${v.n}, ${v.on})`);
  t(!v.coupe, 'aucun nom de commerce coupé à 360 px');
  t(/Tout mettre dans ma caisse \(22\)/.test(v.bouton) && v.vu, `« ${v.bouton} », visible sans faire défiler`);

  await p.locator('.etg-ray[data-rayon=boissons]').tap(); await p.waitForTimeout(400);
  const g = await p.evaluate(() => ({ rayon: DB.cfg.rayon, noms: [...document.querySelectorAll('#pgrid .pcard.etg .pnm-ov')].map(x => x.textContent),
    on: (document.querySelector('.etg-ray.on') || {}).dataset.rayon, bouton: document.getElementById('etg-tout').textContent.trim() }));
  t(g.rayon === 'boissons' && g.on === 'boissons' && g.noms.includes('Malta') && !g.noms.includes('Riz'),
    `« Dépôt de boissons » : la liste change (${g.noms.slice(0, 4).join(', ')}…), plus de riz`);
  t(/\(11\)/.test(g.bouton), `le bouton compte ce commerce : « ${g.bouton} »`);

  await p.locator('#etg-tout').tap(); await p.waitForTimeout(800);
  const a = await p.evaluate(() => ({
    l: DB.articles.map(x => ({ nm: x.nm, px: x.px, pa: x.pa, s: x._sugg || 0, cat: x.cat })),
    stocke: (JSON.parse(localStorage.getItem('myboutiq_v6') || '{}').articles || []).length,
    snack: (document.getElementById('etg-snack-t') || {}).textContent || '',
    annuler: (document.getElementById('etg-snack-b') || {}).textContent || '',
    parc: DB.parcours && DB.parcours.n }));
  t(a.l.length === 11 && a.stocke === 11, `un toucher : 11 articles dans la caisse, et enregistrés (${a.l.length}, ${a.stocke})`);
  t(a.l.every(x => x.px > 0 && x.pa === 0 && x.s === 1), 'chacun à son prix courant, marqué « indicatif », prix d\'achat jamais inventé');
  const cats = [...new Set(a.l.map(x => x.cat))].sort().join(',');
  t(cats === 'Bières,Eaux,Jus,Sucreries,Vins' && a.l.find(x => x.nm === 'Guinness').cat === 'Bières' && a.l.find(x => x.nm === 'Sachet d\'eau').cat === 'Eaux',
    `le dépôt a SES catégories, pas un seul onglet « Boissons » (${cats})`);
  t(/11 articles dans ta caisse/.test(a.snack) && a.annuler === 'Annuler', `« ${a.snack} » — avec « ${a.annuler} »`);
  t(a.parc && a.parc.rayon === 1 && a.parc.tout === 1, `compté sans rien de personnel : ${JSON.stringify(a.parc)}`);

  // Il vend aussi des boissons : les métiers restent sous « Tu vends aussi… ? »
  await fermer(p);
  const reste = await p.evaluate(() => ({ sep: /Tu vends aussi/.test(document.getElementById('pgrid').textContent), n: document.querySelectorAll('#pgrid .etg-ray').length }));
  t(reste.sep && reste.n === 2, 'le dépôt est rangé, la boutique reste proposée');
  await p.evaluate(() => document.querySelector('.etg-ray[data-rayon=boutique]').scrollIntoView({ block: 'center' }));
  await p.locator('.etg-ray[data-rayon=boutique]').tap(); await p.waitForTimeout(400);
  await p.evaluate(() => { const c = [...document.querySelectorAll('#pgrid .pcard.etg')].find(x => /Insecticide/.test(x.textContent)); c.scrollIntoView({ block: 'center' }); });
  await p.locator('#pgrid .pcard.etg', { hasText: 'Insecticide' }).tap(); await p.waitForTimeout(500);
  const m = await p.evaluate(() => { const x = DB.articles.find(y => y.nm === 'Insecticide'); return x && { px: x.px, cat: x.cat, s: x._sugg || 0 }; });
  t(m && m.px === 1500 && m.cat === 'Ménage' && !m.s, `un seul toucher sur « Insecticide » (boutique) : 1 500, en Ménage, son prix vu sur la tuile (${JSON.stringify(m)})`);
  t(errs.length === 0, 'aucune erreur JS (la question)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2. « Annuler » retire le lot, pas ce qui est vendu ──
{
  // Une boutique qui avait déjà choisi « Téléphonie » (avant la 23.71) : elle garde sa liste.
  const dbt = neuve(); dbt.cfg.rayon = 'tel';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, dbt, { tactile: true });
  await p.locator('.etg-ray[data-rayon=tel]').tap(); await p.waitForTimeout(300);
  await p.locator('#etg-tout').tap(); await p.waitForTimeout(500);
  const n1 = await p.evaluate(() => DB.articles.length);
  await p.locator('#etg-snack-b').tap(); await p.waitForTimeout(400);
  const r1 = await p.evaluate(() => ({ n: DB.articles.length, suppr: (DB.suppr || []).length, stocke: (JSON.parse(localStorage.getItem('myboutiq_v6')).articles || []).length }));
  t(n1 === 10 && r1.n === 0 && r1.suppr === 10 && r1.stocke === 0, `« Annuler » : les 10 articles repartent, et ne reviendront pas par la synchro (${n1} → ${r1.n}, ${r1.suppr} tombstones)`);

  await fermer(p);
  await p.locator('#etg-tout').tap(); await p.waitForTimeout(500);
  const ids = await p.evaluate(() => DB.articles.map(x => x.id));
  const pile = await p.evaluate(() => DB.articles.find(x => x.nm === 'Pile').id);
  await fermer(p);
  await vendre(p, { lignes: [[pile, 2]], mode: 'especes', recu: 300 });
  await p.evaluate(ids => etagereAnnulerTout(ids), ids); await p.waitForTimeout(300);
  const r2 = await p.evaluate(() => ({ noms: DB.articles.map(x => x.nm), ventes: DB.ventes.filter(v => !v.annulee).length }));
  t(r2.noms.length === 1 && r2.noms[0] === 'Pile' && r2.ventes === 1, `la pile vendue reste (son stock se calcule depuis sa vente), le reste part : ${r2.noms.join(',')}`);
  t(errs.length === 0, 'aucune erreur JS (annuler)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3. Les dessins, les prix habituels, le choix gardé ──
{
  const db = neuve(); db.cfg.rayon = 'mode';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  const r = await p.evaluate(() => {
    const ic = n => iconArticle({ nm: n }).ico;
    return { on: (document.querySelector('.etg-ray.on') || {}).dataset.rayon, premier: (document.querySelector('#pgrid .pcard.etg .pnm-ov') || {}).textContent,
      dent: ic('Dentifrice'), toil: ic('Savon de toilette'), sucrerie: ic('Sucrerie'), sucre: ic('Sucre'), riz: ic('Riz parfumé'), huile: ic('Huile de palme'), oil: ic('Vegetable oil'), robe: ic('Robe'),
      ph: (prixHabituel('Dentifrice') || {}).px, fanta: prixHabituel('Fanta') };
  });
  t(r.on === 'mode' && r.premier === 'Robe', `le métier choisi se garde (DB.cfg.rayon) : ${r.on}, « ${r.premier} » en tête`);
  t(r.dent === 'tube' && r.toil === 'soap' && r.sucrerie === 'cup', `« dentifRICE » n'a plus le sac de riz, « savon de tOILette » plus la bouteille d'huile, la sucrerie est une boisson (${r.dent}, ${r.toil}, ${r.sucrerie})`);
  t(r.sucre === 'grain' && r.riz === 'grain' && r.huile === 'bottle' && r.oil === 'bottle' && r.robe === 'shirt', `le riz, le sucre et l'huile gardent leur dessin ; la robe a le sien (${r.sucre}, ${r.riz}, ${r.huile}, ${r.oil}, ${r.robe})`);
  t(r.ph === 900 && r.fanta === null, `prix habituel : le dentifrice connaît 900, « Fanta » reste sans prix inventé (${r.ph}, ${r.fanta})`);
  t(errs.length === 0, 'aucune erreur JS (dessins)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 3b. (23.33) « Boutique · Alimentation » : un peu de tout, les mots d'ici, le métier lu sur l'enseigne ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, neuve(), { tactile: true });
  const r = await p.evaluate(() => ({
    libs: [...document.querySelectorAll('#pgrid .etg-ray .etg-ray-t')].map(x => x.textContent),
    on: (document.querySelector('.etg-ray.on') || {}).dataset.rayon,
    noms: [...document.querySelectorAll('#pgrid .pcard.etg .pnm-ov')].map(x => x.textContent),
    devine: ['Alimentation La Grâce', 'Ets Marie', 'Cosmétiques Awa', 'DÉPÔT DE BOISSONS NGO', 'Call box Chez Paul', 'Prêt-à-porter Élégance', 'Friperie du marché', 'Quincaillerie Fotso']
      .map(n => n + '=' + (_rayonDuNom(n) || '·')),
    cats: (() => { const o = {}; ['Sucrerie', 'Bougie', 'Pile', 'Riz', 'Savon'].forEach(n => { o[n] = _rayonCat(n, 'boutique'); }); return o; })()
  }));
  t(r.libs.join(' | ') === 'Boutique · Alimentation, ménage, maison | Dépôt de boissons' && r.on === 'boutique' && !r.libs.includes('Cosmétiques') && !r.libs.some(x => /Prêt-à-porter/.test(x)),
    `deux commerces seulement, les mots des enseignes d'ici, la boutique d'office : ${r.libs.join(' | ')}`);
  t(['Riz', 'Sardines', 'Sucrerie', 'Bière', 'Savon', 'Biscuits', 'Pile', 'Eau de javel', 'Ampoule'].every(n => r.noms.includes(n)) && !r.noms.includes('Farine'),
    `la boutique : alimentation, boissons, ménage et maison dans la même liste (${r.noms.length} articles)`);
  t(r.cats.Sucrerie === 'Boissons' && r.cats.Bougie === 'Maison' && r.cats.Pile === 'Maison' && r.cats.Savon === 'Ménage' && r.cats.Riz === 'Alimentation',
    `chaque article dans sa catégorie (Alimentation, Boissons, Ménage, Maison) : ${JSON.stringify(r.cats)}`);
  t(r.devine.join(',') === 'Alimentation La Grâce=·,Ets Marie=·,Cosmétiques Awa=·,DÉPÔT DE BOISSONS NGO=boissons,Call box Chez Paul=·,Prêt-à-porter Élégance=·,Friperie du marché=·,Quincaillerie Fotso=·',
    `seul le dépôt se lit encore sur l'enseigne, le reste mène à la boutique : ${r.devine.join(' · ')}`);
  t(errs.length === 0, 'aucune erreur JS (boutique polyvalente)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
{
  const db = neuve(); db.cfg.nom = 'Dépôt Ngo';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  const r = await p.evaluate(() => ({ on: (document.querySelector('.etg-ray.on') || {}).dataset.rayon, premier: (document.querySelector('#pgrid .pcard.etg .pnm-ov') || {}).textContent }));
  await p.locator('.etg-ray[data-rayon=boutique]').tap(); await p.waitForTimeout(300);
  const r2 = await p.evaluate(() => ({ on: (document.querySelector('.etg-ray.on') || {}).dataset.rayon, rayon: DB.cfg.rayon }));
  t(r.on === 'boissons' && r.premier === 'Sucrerie', `« Dépôt Ngo » ouvre sur le dépôt de boissons, sans rien demander (${r.on}, « ${r.premier} »)`);
  t(r2.on === 'boutique' && r2.rayon === 'boutique', 'un toucher sur l\'autre commerce passe avant le nom, et se garde');
  t(errs.length === 0, 'aucune erreur JS (enseigne)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 4. « Utilise les vraies photos » : la photo certifiée, et elle seule ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, neuve(), { tactile: true });
  const URL_CERT = 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/APP/products/4702007051-1783550368433.jpg';
  const URL_OFFERTE = 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/APP/products/9455960712-1783550368999.jpg';
  await p.evaluate(([c, o]) => {
    // Le manifeste tel que chargerManifestePhotos le laisse : une photo
    // certifiée pour le dentifrice, une simplement offerte pour le peigne.
    _photoManif = { base: '', ext: '.jpg', slugs: [], _set: {}, _url: {}, _id: {}, _cert: {} };
    _photoManif._cert[_slugsPourNom('Dentifrice')[0]] = c;
    _photoManif._url[_slugsPourNom('Peigne')[0]] = o;
    etagereRayon('beaute');
  }, [URL_CERT, URL_OFFERTE]);
  await p.waitForTimeout(300);
  const tu = await p.evaluate(() => [...document.querySelectorAll('#pgrid .pcard.etg')].map(x => ({ nm: x.querySelector('.pnm-ov').textContent, ph: !!x.querySelector('.pmedia.pphoto') })));
  const d = tu.find(x => x.nm === 'Dentifrice'), pg = tu.find(x => x.nm === 'Peigne');
  t(d && d.ph && pg && !pg.ph, `la tuile « Dentifrice » montre sa vraie photo ; « Peigne » (photo seulement offerte) garde son dessin`);
  await p.locator('#etg-tout').tap(); await p.waitForTimeout(500);
  const a = await p.evaluate(() => DB.articles.filter(x => x.img).map(x => x.nm + '=' + x.img));
  // 23.74 — les autres reçoivent seules leur photo Open Food Facts (t291) ;
  // la photo seulement offerte (Peigne), jamais.
  t(a.includes('Dentifrice=' + URL_CERT) && !a.some(x => /^Peigne=/.test(x)) && a.every(x => x === 'Dentifrice=' + URL_CERT || /=\/photos-off\//.test(x)), `entré dans la caisse avec SA photo ; Peigne sans (offerte, pas vérifiée) : ${a.join(', ')}`);
  const carte = await p.evaluate(() => { const x = DB.articles.find(y => y.nm === 'Dentifrice'); const c = document.getElementById('pc-' + x.id); return !!(c && c.querySelector('.pmedia.pphoto')); });
  t(carte, 'sa carte dans la caisse porte la photo (le dessin reste dessous si elle ne vient pas)');
  t(errs.length === 0, 'aucune erreur JS (vraies photos)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
