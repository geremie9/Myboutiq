// t209 — UN TEXTE VENU D'AILLEURS N'EST JAMAIS DU CODE (22.94).
// Chaque piège pose `window.__pwn` s'il s'exécute. Aucun ne doit y arriver :
//  · une boutique nommée avec une balise, dans la liste des abonnés (admin) ;
//  · une photo proposée par n'importe qui, dans la file de modération (admin) ;
//  · un article d'une autre boutique, dans le catalogue régional ;
//  · un vendeur qui piège ses noms et ses identifiants, chez le patron.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t209');
const { s, port } = await serveur();
const b = await chromium.launch();
const pwn = p => p.evaluate(() => window.__pwn || null);
const STOCKAGE = 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/APP/';

const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
// ── 1) LA LISTE DES ABONNÉS (administrateur) ──────────────────────────
{
  const r = await p.evaluate(() => {
    window.__pwn = null;
    _abonnes = [{ nom: '<img src=x onerror="window.__pwn=\'abonnes-nom\'">Chez Piège', code: "1234' onclick=\"window.__pwn='abonnes-code'\" x='",
      telephone: '<svg onload="window.__pwn=\'abonnes-tel\'">', nb_ventes: '<b>9</b>', nb_articles: 2, actif: true }];
    document.getElementById('ov-abonnes').classList.add('show');
    renderAbonnes();
    const c = document.getElementById('ab-lst');
    c.querySelectorAll('button').forEach(x => { try { x.onclick = null; } catch (e) {} });
    return { img: c.querySelectorAll('img,svg').length, texte: c.textContent,
      boutons: [...c.querySelectorAll('button')].map(x => x.getAttribute('onclick')) };
  });
  await p.waitForTimeout(300);
  t(!(await pwn(p)) && r.img === 0, `une boutique nommée avec une balise ne s'exécute pas chez l'administrateur (${await pwn(p) || 'rien'})`);
  t(/<img src=x/.test(r.texte) && /Chez Piège/.test(r.texte), 'son nom s\'affiche tel qu\'il a été écrit, en texte');
  // Le code piégé reste du texte inerte DANS la chaîne : chaque bouton garde la forme f('…') ou f('…',vrai/faux).
  t(r.boutons.length > 0 && r.boutons.every(x => /^[A-Za-z]+\('[A-Za-z0-9 _-]*'(,(true|false))?\)$/.test(x)), `son code ne sort pas du bouton « Prolonger » (${r.boutons[0]})`);
}
// ── 2) LA FILE DES PHOTOS PROPOSÉES (ouverte à tous, même sans compte) ─
{
  const r = await p.evaluate(STOCKAGE => {
    window.__pwn = null;
    const d = document.createElement('div'); document.body.appendChild(d);
    d.innerHTML = _ligPhotoAdmin({ id: "abc') ;window.__pwn=('photo-id", slug: 'riz', url: STOCKAGE + 'x.jpg" onerror="window.__pwn=\'photo-url\'',
      article_nm: '<img src=y onerror="window.__pwn=\'photo-nm\'">', nb_garde: 0, nb_signale: 0 }, true, false)
      + _ligPhotoAdmin({ id: '9f1c', slug: 'x', url: 'javascript:window.__pwn="photo-js"', article_nm: 'Riz', nb_garde: 0, nb_signale: 0 }, true, false);
    const imgs = [...d.querySelectorAll('img')];
    return { n: imgs.length, onerror: imgs.map(i => i.getAttribute('onerror')), src2: imgs[1] && imgs[1].getAttribute('src'),
      texte: d.textContent, boutons: [...d.querySelectorAll('button')].map(x => x.getAttribute('onclick')) };
  }, STOCKAGE);
  await p.waitForTimeout(500);
  t(!(await pwn(p)), `une photo piégée (adresse, nom) ne s'exécute pas dans la modération (${await pwn(p) || 'rien'})`);
  t(r.n === 2 && r.onerror.every(x => x === 'this.style.opacity=.25'), 'l\'adresse piégée ne fabrique pas son propre « onerror »');
  t(r.src2 === '', `une adresse qui n'est pas notre stockage n'est pas chargée (« ${r.src2} »)`);
  t(/<img src=y/.test(r.texte), 'le nom proposé s\'affiche en texte');
  t(r.boutons.every(x => !/__pwn/.test(x)), `l'identifiant piégé ne sort pas des boutons (${r.boutons[0]})`);
}
// ── 3) LE CATALOGUE RÉGIONAL (les articles des AUTRES boutiques) ──────
{
  const r = await p.evaluate(STOCKAGE => {
    window.__pwn = null;
    _catalogModeles = [{ nm: '<img src=z onerror="window.__pwn=\'catalogue-nm\'">Savon', e: '📦', cat: 'x', boutique: 'autre',
      img: STOCKAGE + 'a.jpg" onerror="window.__pwn=\'catalogue-img\'' }];
    renderCatalogueRegional();
    const g = document.getElementById('catalog-grid');
    return { imgs: [...g.querySelectorAll('img')].map(i => i.getAttribute('onerror')), texte: g.textContent };
  }, STOCKAGE);
  await p.waitForTimeout(400);
  t(!(await pwn(p)) && r.imgs.length === 1 && r.imgs[0] === null, `un article piégé d'une autre boutique reste une image et un nom (${await pwn(p) || 'rien'})`);
  t(/<img src=z/.test(r.texte), 'son nom s\'affiche en texte');
}
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();
// ── 4) UN VENDEUR MALVEILLANT, CHEZ LE PATRON ─────────────────────────
// Ses noms et ses identifiants arrivent par la synchro (mergeDB puis
// migrateDBData), puis s'affichent dans toute l'app du patron.
{
  const A = await ouvrirCaisse(b, port, nouvelleBoutique());
  const piege = nouvelleBoutique();
  piege.articles.push({ id: 90, nm: '<img src=x onerror="window.__pwn=\'article\'">Riz piégé', e: '<svg onload="window.__pwn=\'emoji\'">',
    cat: 'Divers', px: 500, pa: 400, stk0: 5, al: 0, vd: 0, vr: [], img: 'data:image/png;base64,AAAA" onerror="window.__pwn=\'img\'' });
  piege.clients.push({ id: "3);window.__pwn=('client-id", nm: '"><img src=x onerror="window.__pwn=\'client\'">', tel: '6', credit: 0, points: 0, hist: [],
    bg: 'red;" onmouseover="window.__pwn=\'couleur\'', tc: '#000' });
  piege.equipe.push({ id: 7, nm: '<b onmouseover=window.__pwn=1>Kofi</b>', role: 'vendeur', actif: true, perms: { vente: true } });
  const r = await A.p.evaluate(d => {
    window.__pwn = null;
    DB = migrateDBData(mergeDB(d, DB)); recalcTotaux();
    renderProd(DB.articles); renderStock(DB.articles); renderClients(); renderRpt();
    try { navTo('stock', document.querySelector('[data-tab="stock"]')); } catch (e) {}
    const a = DB.articles.find(x => x.id === 90), c = DB.clients.find(x => /img/.test(x.nm)), e = DB.equipe.find(x => /Kofi/.test(x.nm));
    return { a: a && [a.nm, a.e, a.img], c: c && [c.id, c.nm, c.bg], e: e && e.nm };
  }, piege);
  await A.p.waitForTimeout(600);
  t(!(await pwn(A.p)), `les pièges du vendeur ne s'exécutent pas chez le patron (${await pwn(A.p) || 'rien'})`);
  t(r.a && r.a[0] === '‹img src=x onerror=″window.__pwn=\'article\'″›Riz piégé', `le nom d'article garde sa forme, sans chevron ni guillemet (${r.a && r.a[0]})`);
  t(r.a && !/[<>"]/.test(r.a[1] + r.a[2]), 'l\'emoji et la photo aussi');
  t(r.c && r.c[0] === '3window.__pwnclient-id' && !/[<>"]/.test(r.c[1] + r.c[2]), `l'identifiant du client ne peut plus appeler de fonction (${r.c && r.c[0]})`);
  t(r.e && !/[<>]/.test(r.e), 'le nom dans l\'équipe aussi');
  // L'emoji va dans le petit code qui remplace une photo cassée : une
  // apostrophe suffisait à en sortir. Même s'il en restait une, il ne sort plus.
  const emo = await A.p.evaluate(() => {
    window.__pwn = null;
    const a = DB.articles.find(x => x.id === 90);
    a.e = "');window.__pwn=('emoji-js"; a.img = 'photo-absente.png';
    renderProd(DB.articles); renderStock(DB.articles);
    return a.e;
  });
  await A.p.waitForTimeout(800);
  t(!(await pwn(A.p)), `un emoji piégé dans une photo cassée ne s'exécute pas (${await pwn(A.p) || 'rien'})`);
  const emo2 = await A.p.evaluate(() => { DB = migrateDBData(DB); return DB.articles.find(x => x.id === 90).e; });
  t(!/'/.test(emo2), `et à la sauvegarde suivante, l'apostrophe quitte l'emoji (${emo2})`);
  const deux = await A.p.evaluate(() => { const avant = JSON.stringify(DB); DB = migrateDBData(DB); return JSON.stringify(DB) === avant; });
  t(deux, 'neutraliser deux fois ne change plus rien (pas de synchro sans fin)');
  t(A.errs.length === 0, 'aucune erreur JS chez le patron' + (A.errs.length ? ' : ' + A.errs.join(' | ') : ''));
  await A.ctx.close();
}
// ── 5) UNE LECTURE PARTIE AVANT UN CHANGEMENT DE BOUTIQUE ─────────────
// Le patron a deux boutiques. Une lecture du serveur pour A part, il passe
// à B et vend ; la réponse de A arrive après. Elle ne doit pas écraser B.
{
  const B = nouvelleBoutique(); B.cfg.code = 'BOUT0002'; B.cfg.nom = 'Ets Marie 2';
  const X = await ouvrirCaisse(b, port, B);
  const r = await X.p.evaluate(a => {
    const avant = DB.ventes.length;
    DB.ventes.push({ id: genVenteId(), total: 600, ben: 100, benefice: 100, lignes: [{ pid: 2, qty: 1, qte: 1, px: 600, pa: 500 }],
      date: new Date().toLocaleDateString('fr-FR'), paiement: { mode: 'especes' }, annulee: false, cloturee: false });   // la vente de B, pas encore envoyée
    _applyRemoteDB(a, true);                                          // la réponse tardive de A
    return { code: DB.cfg.code, nom: DB.cfg.nom, ventes: DB.ventes.length - avant,
      stocke: JSON.parse(localStorage.getItem('myboutiq_v6')).cfg.code };
  }, nouvelleBoutique());
  t(r.code === 'BOUT0002' && r.nom === 'Ets Marie 2' && r.ventes === 1, `la réponse tardive de la boutique A n'écrase pas la boutique B (${r.nom}, ${r.ventes} vente gardée)`);
  t(r.stocke !== 'MARI0001', 'et le téléphone ne range pas A à la place de B');
  t(X.errs.length === 0, 'aucune erreur JS' + (X.errs.length ? ' : ' + X.errs.join(' | ') : ''));
  await X.ctx.close();
}
await b.close(); s.close();
fin();
