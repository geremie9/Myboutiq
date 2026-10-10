// t211 — L'ÉTAGÈRE DE DÉPART : DE LA BOUTIQUE NEUVE À LA PREMIÈRE VENTE (22.97).
// Mesuré le 10 octobre : 26 boutiques sur 64 n'ont jamais eu un article, et
// sur les 18 du dernier mois, 3 ont vendu. Refait sur téléphone, il fallait
// onze gestes et trois prix à taper avant de voir trois articles en caisse.
// Ici on rejoue le parcours d'une boutique neuve EN VRAIS CLICS : toucher
// « Riz », dire son prix, le vendre. Rien n'est fabriqué dans DB.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t211');
const { s, port } = await serveur();
const b = await chromium.launch();

// Telle que l'inscription la crée : vide, jamais vendu, aucun drapeau de démarrage.
const neuve = (cfg) => {
  const d = nouvelleBoutique({ articles: [], clients: [] });
  d.cfg = Object.assign({ lang: 'fr', nom: 'Chez Awa', tel: '+237677000001', pin: '123456', s: 'FCFA', d: 'XAF', secteur: 'boutique',
    code: 'AWA00001', plan: 'gratuit', region: 'Douala', pays: { cc: '237', nm: 'Cameroun', fl: '🇨🇲', s: 'FCFA', d: 'XAF' } }, cfg || {});
  d.equipe = [{ id: 1, nm: 'Awa', role: 'patron', bg: '#FFF', tc: '#000', actif: true },
              { id: 2, nm: 'Ibrahim', role: 'vendeur', bg: '#EEE', tc: '#333', actif: true, perms: { vente: true } }];
  return d;
};
const fantomes = (p) => p.evaluate(() => Array.from(document.querySelectorAll('#pgrid .pcard.etg')).map(x => x.querySelector('.pnm-ov').textContent));
const ouvert = (p, id) => p.evaluate(id => !!document.querySelector('#' + id + '.show'), id);
const toasts = (p) => p.evaluate(() => (window.__toasts || []).join(' / '));
const prixPad = async (p, prix, nom) => {
  if (nom != null) { await p.evaluate(() => { const w = document.getElementById('ppd-nm-wrap'); if (w.style.display === 'none') prixPadRenommer(); }); await p.locator('#ppd-nm-inp').fill(nom); }
  if (prix != null) await p.locator('#ppd-px').fill(String(prix));
  await p.locator('#ppd-ok').click(); await p.waitForTimeout(400);
};

// ── 1) LA CAISSE NEUVE N'EST PLUS VIDE ────────────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, neuve());
  await p.evaluate(() => { window.__prompts = 0; window.prompt = () => { window.__prompts++; return null; }; });
  const g = await fantomes(p);
  const titre = await p.evaluate(() => (document.querySelector('#pgrid .etg-tete') || {}).textContent || '');
  t(/Touche ce que tu vends/.test(titre) && /juste le prix/.test(titre), `elle dit quoi faire en une phrase : « ${titre.trim().slice(0, 60)}… »`);
  t(g.length === 16 && g.includes('Riz') && g.includes('Huile') && g.includes('Bougie') && g[15] === 'Autre article',
    `les 15 articles que les boutiques mettent vraiment en rayon, plus « Autre article » (${g.length})`);
  t(await p.evaluate(() => !!Array.from(document.querySelectorAll('#pgrid button')).find(x => /Beaucoup d'articles d'un coup/.test(x.textContent))
    && !!Array.from(document.querySelectorAll('#pgrid button')).find(x => /boutique d'exemple/.test(x.textContent))),
    'les autres chemins restent : le catalogue (« beaucoup d\'articles d\'un coup ») et la boutique d\'exemple');
  t(await p.evaluate(() => DB.articles.length === 0), 'rien n\'est créé d\'avance : pas quinze articles à zéro franc à nettoyer');
  // Il tape ce qu'il vend, dans une boutique encore vide : on le lui propose.
  await p.locator('#src-c').fill('Tomate'); await p.waitForTimeout(500);
  t(await p.evaluate(() => !!Array.from(document.querySelectorAll('#pgrid [onclick]')).find(e => /creerEnVendant\(-1\)/.test(e.getAttribute('onclick')))),
    'boutique vide : taper « Tomate » dans Chercher propose de le créer en le vendant (avant : le guide revenait)');
  await p.locator('#src-c').fill(''); await p.waitForTimeout(400);
  t((await fantomes(p)).length === 16, 'la recherche effacée, l\'étagère revient');

  // ── 2) UNE TOUCHE, UN PRIX ──
  await p.locator('#pgrid .pcard.etg', { hasText: 'Riz' }).click(); await p.waitForTimeout(400);
  t(await ouvert(p, 'ov-prixpad') && (await p.evaluate(() => document.getElementById('ppd-nm').textContent)) === 'Riz',
    'toucher « Riz » ouvre UNE question : son prix');
  await prixPad(p, '');
  t(await ouvert(p, 'ov-prixpad') && await p.evaluate(() => DB.articles.length === 0) && /prix de vente/.test(await toasts(p)),
    'sans prix, rien n\'est créé et il sait pourquoi');
  await prixPad(p, 600);
  const riz = await p.evaluate(() => { const a = DB.articles.find(x => x.nm === 'Riz'); return a && { id: a.id, px: a.px, rt: a.rt, stk0: a.stk0, um: a.um || null }; });
  t(riz && riz.px === 600 && riz.rt === true && riz.stk0 === 0 && !riz.um,
    `Riz est dans la caisse à 600, stock jamais compté, vendu à la pièce (${JSON.stringify(riz)})`);
  t(!(await ouvert(p, 'ov-prixpad')) && await p.evaluate(() => panierVide()),
    'ajouter n\'est pas vendre : le panier reste vide (pas de vente fantôme au premier « Encaisser »)');
  t(await p.evaluate(id => { const c = document.getElementById('pc-' + id); return !!c && /600/.test(c.textContent) && !c.classList.contains('etg'); }, riz.id),
    'sa carte apparaît, avec son prix');
  t(await p.evaluate(() => /"nm":"Riz"/.test(localStorage.getItem('myboutiq_v6') || '')), 'et elle est gardée sur le téléphone');
  const g2 = await fantomes(p);
  t(!g2.includes('Riz') && g2.includes('Huile') && await p.evaluate(() => /Tu vends aussi/.test(document.getElementById('pgrid').textContent)),
    'la suggestion « Riz » s\'en va, les autres restent sous « Tu vends aussi… ? »');
  await p.waitForTimeout(1300);
  const bulle = await p.evaluate(() => { const x = document.getElementById('demo-bulle'); return x && getComputedStyle(x).display !== 'none' ? x.textContent : ''; });   // fixe : pas d'offsetParent
  t(/Touche un article pour le vendre/.test(bulle), `et on lui montre aussitôt comment le vendre : « ${bulle.trim().slice(0, 45)} »`);

  // ── 3) « AUTRE ARTICLE » : LE NOM, PUIS LE PRIX ──
  await p.locator('#pgrid .pcard.etg', { hasText: 'Autre article' }).click(); await p.waitForTimeout(400);
  t(await p.evaluate(() => document.getElementById('ppd-nm-wrap').style.display !== 'none'), '« Autre article » demande d\'abord le nom');
  await prixPad(p, 100, '');
  t(await p.evaluate(() => DB.articles.length === 1) && /nom de l'article/.test(await toasts(p)), 'sans nom, rien n\'est créé');
  await prixPad(p, 100, 'Piment rouge');
  t(await p.evaluate(() => !!DB.articles.find(a => a.nm === 'Piment rouge' && a.px === 100)), '« Piment rouge » à 100 : créé');
  await p.locator('#pgrid .pcard.etg', { hasText: 'Autre article' }).click(); await p.waitForTimeout(300);
  await prixPad(p, 500, 'riz');
  t(await p.evaluate(() => DB.articles.filter(a => /^riz$/i.test(a.nm)).length === 1) && /déjà dans ta boutique/.test(await toasts(p)),
    'un deuxième « riz » n\'est pas créé : on l\'emmène sur celui qui existe');
  await p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
  await p.locator('#pgrid .pcard.etg', { hasText: 'Autre article' }).click(); await p.waitForTimeout(300);
  await prixPad(p, 50, '<img src=x onerror=alert(1)>');
  t(await p.evaluate(() => DB.articles.every(a => !/[<>]/.test(a.nm))), 'un nom avec des balises est neutralisé avant d\'entrer dans la caisse');

  // ── 4) LA PREMIÈRE VENTE, EN VRAIS CLICS ──
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); window.__toasts = []; });
  await p.locator('#pc-' + riz.id).click(); await p.waitForTimeout(300);
  // 22.98 : le nombre et le total ouvrent toujours le panier (corriger une
  // quantité, un prix négocié)…
  await p.locator('#fcart .csum').click(); await p.waitForTimeout(400);
  t(await ouvert(p, 'ov-pan'), 'toucher le total ouvre toujours le panier, pour corriger');
  await p.evaluate(() => closeSheet('ov-pan')); await p.waitForTimeout(300);
  // … mais le vert « Encaisser » va DROIT au paiement : plus d'écran panier.
  await p.locator('#btn-enc').click(); await p.waitForTimeout(400);
  t(await ouvert(p, 'ov-calc') && !(await ouvert(p, 'ov-pan')), '« Encaisser » ouvre directement le paiement : plus d\'étape panier');
  await p.locator('#btn-conf-vente').click(); await p.waitForTimeout(2200);
  const v = await p.evaluate(() => ({ n: DB.ventes.length, total: DB.ventes[0] && DB.ventes[0].total, bravo: !!document.querySelector('#ov-demo-bravo.show'), tit: document.getElementById('db-tit').textContent }));
  t(v.n === 1 && v.total === 600, `vendue : une vente de ${v.total} F`);
  t(v.bravo && /première vente/i.test(v.tit), `et fêtée : « ${v.tit} »`);
  t(await p.evaluate(id => { const c = document.getElementById('pc-' + id); return !!c && !c.querySelector('.sout,.sneg'); }, riz.id),
    'stock jamais compté : ni « épuisé » ni « -1 » après la vente');
  t((await fantomes(p)).length === 0, 'après la première vente, la caisse redevient la sienne : plus de suggestions');

  // ── 5) « CRÉER EN VENDANT » NE PASSE PLUS PAR prompt() ──
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); });
  await p.locator('#src-c').fill('Tomate'); await p.waitForTimeout(500);
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('#pgrid [onclick]')).find(e => /creerEnVendant\(-1\)/.test(e.getAttribute('onclick'))); x.click(); });
  await p.waitForTimeout(400);
  t(await ouvert(p, 'ov-prixpad') && /Vendre/.test(await p.evaluate(() => document.getElementById('ppd-ok').textContent)),
    'créer en vendant ouvre la même fenêtre, bouton « Vendre »');
  await prixPad(p, 150);
  const tom = await p.evaluate(() => { const a = DB.articles.find(x => x.nm === 'Tomate'); return a && { px: a.px, panier: panier[a.id + '-0'] || 0 }; });
  t(tom && tom.px === 150 && tom.panier === 1, `Tomate créée à 150 ET mise au panier (${JSON.stringify(tom)})`);
  t(await p.evaluate(() => window.__prompts === 0), '⚠️ aucun prompt() : l\'app installée peut les bloquer sans un mot');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 6) À QUI ELLE S'ADRESSE — ET À QUI NON ────────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, neuve(), { vendeur: 'Ibrahim' });
  t((await fantomes(p)).length === 0, 'un vendeur ne voit pas l\'étagère : il ne peut pas créer d\'article');
  t(errs.length === 0, 'vendeur : aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
{
  const { ctx, p } = await ouvrirCaisse(b, port, neuve());
  await p.evaluate(() => { DB.cfg.demo = true; renderProd(DB.articles); });
  t((await fantomes(p)).length === 0, 'la boutique d\'exemple n\'a pas d\'étagère');
  await ctx.close();
}
{
  const d = neuve({ lang: 'en' });
  const { ctx, p } = await ouvrirCaisse(b, port, d);
  await p.evaluate(() => { lang = 'en'; renderProd(DB.articles); });
  const g = await fantomes(p);
  t(g.includes('Rice') && g.includes('Other item') && /Tap what you sell/.test(await p.evaluate(() => document.getElementById('pgrid').textContent)),
    'en anglais : « Tap what you sell », « Rice »');
  await ctx.close();
}
{
  const { ctx, p } = await ouvrirCaisse(b, port, neuve({ secteur: 'mode' }));
  const g = await fantomes(p);
  t(g.includes('Robe') && !g.includes('Riz'), 'une boutique de mode voit des vêtements, pas du riz');
  await ctx.close();
}
{
  const d = neuve();
  d.articles = [{ id: 101, nm: 'Huile d\'arachide', e: '🫗', cat: 'Alimentation', px: 1200, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true }];
  const { ctx, p } = await ouvrirCaisse(b, port, d);
  const g = await fantomes(p);
  t(!g.includes('Huile') && g.includes('Riz'), 'il a déjà « Huile d\'arachide » : on ne lui propose plus « Huile »');
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('#pgrid button')).find(e => /Masquer ces suggestions/.test(e.textContent)); x.click(); });
  await p.waitForTimeout(300);
  t((await fantomes(p)).length === 0 && await p.evaluate(() => DB.cfg.etagereFinie === true), '« Masquer ces suggestions » les range pour de bon');
  await ctx.close();
}
await b.close(); s.close();
fin();
