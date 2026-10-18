// t245 — « Concernant la complexité de l'app, on peut simplifier les parties
// qui donnent de la friction sans endommager l'app ? » (23.26)
// Mesuré en base le 18/10 sur 64 boutiques : 26 sans un seul article, 9 avec
// des articles mais aucune vente, 15 qui ont vendu UN jour puis plus rien ;
// 93 % des ventes en espèces. Quatre changements, rien de supprimé :
//  1. Abonnés › « À relancer » : les boutiques arrêtées en route, et WhatsApp ;
//  2. l'étagère d'une boutique neuve : le prix courant déjà écrit ;
//  3. le paiement s'ouvre sur l'essentiel, le reste derrière « Autre paiement » ;
//  4. des compteurs anonymes du parcours (dates et nombres), fusionnés.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t245');
const { s, port } = await serveur();
const b = await chromium.launch();
const visible = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, sel);
const fermer = p => p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); try { fermerSucces(); } catch (e) {} });

// ── 3. Le paiement : l'essentiel d'abord ─────────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await p.evaluate(() => { addPanier(DB.articles.find(x => x.id === 2), 0); });
  await p.locator('#btn-enc').tap(); await p.waitForTimeout(400);
  const ouvert = await p.evaluate(() => document.getElementById('ov-calc').classList.contains('show'));
  t(ouvert && await visible(p, '#calc-recu') && await visible(p, '#btn-conf-vente'),
    'Encaisser ouvre le paiement : le reçu, la monnaie et « Confirmer » sont devant');
  const cache = [];
  for (const sel of ['#pmnt-grid', '#btn-split-toggle', '#btn-rem-toggle']) if (await visible(p, sel)) cache.push(sel);
  t(!cache.length && await visible(p, '#btn-autre-pmt'),
    'les cinq moyens, la remise et le paiement en deux parties attendent derrière « Autre paiement »' + (cache.length ? ' (encore visibles : ' + cache.join(' ') + ')' : ''));
  await p.locator('#calc-recu').fill('1000'); await p.waitForTimeout(1200);
  const m = await p.evaluate(() => ({ v: document.getElementById('calc-res').style.display, a: document.getElementById('calc-res-amt').textContent }));
  t(m.v === 'block' && /400/.test(m.a), `reçu 1 000 pour 600 : « ${m.a} » à rendre, sur l’écran simple`);
  await p.locator('#btn-conf-vente').tap(); await p.waitForTimeout(500);
  let v = await p.evaluate(() => DB.ventes.filter(x => !x.annulee));
  t(v.length === 1 && v[0].paiement && v[0].paiement.mode === 'especes', 'la vente en espèces passe en trois touchers, comme avant');
  await fermer(p);
  // Un client mobile money : un toucher de plus, et tout est là.
  await p.evaluate(() => { addPanier(DB.articles.find(x => x.id === 4), 0); });
  await p.locator('#btn-enc').tap(); await p.waitForTimeout(400);
  await p.locator('#btn-autre-pmt').tap(); await p.waitForTimeout(200);
  t(await visible(p, '#pmv-orange') && await visible(p, '#pmv-credit') && await visible(p, '#btn-rem-toggle') && await visible(p, '#btn-split-toggle'),
    '« Autre paiement » : Orange, MTN, Moov, Crédit, la remise et les deux parties reviennent');
  await p.locator('#pmv-orange').tap(); await p.locator('#btn-conf-vente').tap(); await p.waitForTimeout(500);
  v = await p.evaluate(() => DB.ventes.filter(x => !x.annulee));
  t(v.length === 2 && v[1].paiement.mode === 'orange', 'la vente Orange Money s’enregistre en Orange');
  const n = await p.evaluate(() => DB.parcours && DB.parcours.n);
  t(n && n.simple === 2 && n.autre === 1, `compteurs : écran simple ouvert ${n && n.simple} fois, « Autre paiement » ${n && n.autre} fois`);
  t(errs.length === 0, 'aucune erreur JS (paiement)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// Une boutique où le mobile money pèse (une vente sur cinq) : l'écran complet d'emblée.
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  for (let i = 0; i < 3; i++) await vendre(p, { lignes: [[2, 1]], mode: 'especes', recu: 600 });
  await vendre(p, { lignes: [[2, 1]], mode: 'mtn' });
  await fermer(p);
  const r = await p.evaluate(() => { addPanier(DB.articles.find(x => x.id === 2), 0); procederPmt(); return document.getElementById('ov-calc').classList.contains('pmt-simple'); });
  t(!r && await visible(p, '#pmv-mtn'), 'une boutique qui encaisse souvent en mobile money garde l’écran complet, sans toucher de plus');
  await fermer(p);
  const c = await p.evaluate(() => { DB.ventes = DB.ventes.filter(x => x.paiement && x.paiement.mode === 'especes'); clientVente = DB.clients[0]; procederPmt(); return document.getElementById('ov-calc').classList.contains('pmt-simple'); });
  t(!c, 'une vente qui a déjà son client (un crédit se prépare) s’ouvre complète');
  t(errs.length === 0, 'aucune erreur JS (écran complet)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2. L'étagère d'une boutique neuve : le prix courant déjà écrit ──
{
  const db = nouvelleBoutique({ articles: [], ventes: [] });
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  const tuile = nm => p.locator('.pcard.etg', { hasText: nm }).first();
  t(await tuile('Riz').count() === 1, 'la caisse vide montre l’étagère (Riz, Sucre, Huile…)');
  await tuile('Riz').tap(); await p.waitForTimeout(450);
  let pad = await p.evaluate(() => ({ v: document.getElementById('ppd-px').value, q: document.getElementById('ppd-q').textContent,
    ok: document.getElementById('ppd-ok').textContent, c: [...document.querySelectorAll('#ppd-courants .ppd-c')].map(x => x.textContent + (x.classList.contains('on') ? '*' : '')),
    focus: document.activeElement && document.activeElement.id }));
  t(pad.v === '600' && pad.c.join(' ') === '500 600* 800' && /kilo/.test(pad.q),
    `« Riz » s’ouvre sur 600 déjà écrit, et 500 · 800 à côté (« ${pad.q} » ${pad.c.join(' ')})`);
  t(pad.focus !== 'ppd-px' && pad.focus !== 'ppd-nm-inp', 'le clavier ne s’ouvre pas : il cacherait les prix et le bouton');
  await p.locator('#ppd-ok').tap(); await p.waitForTimeout(400);
  let a = await p.evaluate(() => DB.articles.map(x => x.nm + ':' + x.px));
  t(a.join() === 'Riz:600' && /mon prix/i.test(pad.ok), `« C’est mon prix » : Riz est dans la caisse à 600, sans un chiffre tapé (${a.join()})`);
  await fermer(p);
  await tuile('Sucre').tap(); await p.waitForTimeout(450);
  await p.locator('#ppd-courants .ppd-c', { hasText: '850' }).tap();
  await p.locator('#ppd-ok').tap(); await p.waitForTimeout(400);
  await fermer(p);
  await tuile('Huile').tap(); await p.waitForTimeout(450);
  await p.locator('#ppd-px').fill('1250');
  const on = await p.evaluate(() => document.querySelectorAll('#ppd-courants .ppd-c.on').length);
  await p.locator('#ppd-ok').tap(); await p.waitForTimeout(400);
  a = await p.evaluate(() => DB.articles.map(x => x.nm + ':' + x.px));
  t(a.join() === 'Riz:600,Sucre:850,Huile:1250' && on === 0, `un autre prix d’un toucher (Sucre 850), ou le sien tapé (Huile 1250) : ${a.join()}`);
  await fermer(p);
  await p.locator('.pcard.etg', { hasText: 'Autre article' }).tap(); await p.waitForTimeout(450);
  const autre = await p.evaluate(() => ({ c: document.getElementById('ppd-courants').style.display, v: document.getElementById('ppd-px').value }));
  t(autre.c === 'none' && autre.v === '', '« Autre article » : pas de prix inventé, le champ reste vide');
  await fermer(p);
  const n = await p.evaluate(() => DB.parcours.n);
  t(n.etg === 3 && n.etgOk === 3 && n.etgCourant === 1, `compteurs : ${n.etg} proposés touchés, ${n.etgOk} mis en caisse, ${n.etgCourant} au prix courant tel quel`);
  t(errs.length === 0, 'aucune erreur JS (étagère)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 4. Le parcours : des dates, des nombres, une règle de fusion ─────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique({ ventes: [] }), { tactile: true });
  await vendre(p, { lignes: [[2, 1]], mode: 'especes', recu: 600 });
  const r = await p.evaluate(() => {
    const j = isoJour(), o = {};
    o.etapes = DB.parcours.art1 === j && DB.parcours.vente1 === j && !DB.parcours.retour;
    _parcoursMaj(true); _parcoursMaj(true);
    o.jours = DB.parcours.n.jours;
    DB.parcours.vente1 = '2026-01-02'; DB.parcours.dj = '2026-01-02';
    _parcoursMaj(true);
    o.retour = DB.parcours.retour === j;
    // Deux téléphones : la date la plus ancienne, le compteur le plus haut.
    const m = mergeDB({ cfg: DB.cfg, parcours: { art1: '2026-03-01', vente1: '2026-03-05', n: { etg: 4, jours: 2 } } },
                      { cfg: DB.cfg, parcours: { art1: '2026-02-01', retour: '2026-03-09', n: { etg: 1, autre: 3 } } });
    o.fusion = m.parcours;
    // Rien d'autre que des dates et des nombres.
    const d = migrateDBData({ cfg: {}, parcours: { art1: '<img src=x>', vente1: '2026-03-05', n: { etg: '3', x: 9, autre: -2 }, nom: 'Marie' } });
    o.propre = d.parcours;
    o.idem = JSON.stringify(migrateDBData(JSON.parse(JSON.stringify(d))).parcours) === JSON.stringify(d.parcours);
    return o;
  });
  t(r.etapes, 'premier article et première vente notés au jour même ; pas encore de « retour »');
  t(r.jours === 1, `deux ouvertures le même jour comptent un jour (${r.jours})`);
  t(r.retour, 'ouvrir l’app un jour après la première vente : le « retour » est noté');
  t(JSON.stringify(r.fusion) === JSON.stringify({ n: { jours: 2, etg: 4, autre: 3 }, art1: '2026-02-01', vente1: '2026-03-05', retour: '2026-03-09' }),
    'fusion de deux téléphones : la date la plus ancienne, le compteur le plus haut — ' + JSON.stringify(r.fusion));
  t(JSON.stringify(r.propre) === JSON.stringify({ n: { etg: 3 }, vente1: '2026-03-05' }) && r.idem,
    'migrateDBData ne garde que des dates et des nombres, et reste stable — ' + JSON.stringify(r.propre));
  // À la porte (code PIN), une ouverture ne compte pas : rien ne part au serveur de là.
  const porte = await p.evaluate(() => {
    DB.parcours.dj = '2026-01-03'; const avant = DB.parcours.n.jours;
    document.getElementById('s-caisse').classList.remove('on'); _parcoursOuverture();
    const a = DB.parcours.n.jours === avant && DB.parcours.dj === '2026-01-03';
    document.getElementById('s-caisse').classList.add('on'); _parcoursOuverture();
    return a && DB.parcours.n.jours === avant + 1;
  });
  t(porte, 'une ouverture compte dans la caisse, jamais à la porte du code PIN');
  t(errs.length === 0, 'aucune erreur JS (parcours)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 1. Abonnés › « À relancer » ─────────────────────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  const lignes = await p.evaluate(() => {
    const j = n => { const d = new Date(); d.setDate(d.getDate() - n); return isoJour(d); };
    const L = (code, nom, o) => Object.assign({ code, nom, telephone: '+237 6 77 00 00 ' + code.slice(-2), actif: true, plan: null, abonne_jusqu: null,
      maj: new Date().toISOString(), nb_ventes: 0, nb_articles: 0, jours_vente: 0, derniere_vente: null, cree_le: '2026-10-01T10:00:00Z' }, o);
    window.__rows = [
      L('11111101', 'Vide', { cree_le: '2026-10-15T10:00:00Z' }),
      L('11111102', 'Sans vente', { nb_articles: 12 }),
      L('11111103', '<img src=x onerror=__xss=1>Un jour', { nb_articles: 20, nb_ventes: 6, jours_vente: 1, derniere_vente: j(5) }),
      L('11111104', 'Vivante', { nb_articles: 30, nb_ventes: 80, jours_vente: 9, derniere_vente: j(0) }),
      L('11111105', 'Arrêtée', { nb_articles: 25, nb_ventes: 40, jours_vente: 6, derniere_vente: j(30) }),
      L('11111106', 'Suspendue', { actif: false }),
    ];
    window.__appels = [];
    supa = { rpc: async nom => { __appels.push(nom); return nom === 'admin_boutiques2' ? { data: __rows, error: null } : { data: null, error: { message: 'x' } }; } };
    window.verifierAdmin = async () => true;
    window.__ouvert = []; window.open = u => { __ouvert.push(u); return null; };
    return __rows.length;
  });
  await p.evaluate(() => ouvrirAbonnes()); await p.waitForTimeout(400);
  const tout = await p.evaluate(() => document.querySelectorAll('#ab-lst .hist-sale').length);
  t(tout === lignes && await p.evaluate(() => __appels[0] === 'admin_boutiques2'), `« Toutes » : les ${tout} boutiques, lues par admin_boutiques2`);
  const btn = await p.evaluate(() => document.getElementById('ab-v-rel').textContent);
  await p.locator('#ab-v-rel').tap(); await p.waitForTimeout(200);
  const rel = await p.evaluate(() => [...document.querySelectorAll('#ab-lst .hist-sale')].map(x => ({
    nom: x.querySelector('.hist-d').textContent, etape: (x.querySelector('.ab-etape') || {}).textContent || '', wa: !!x.querySelector('.mini-btn.wa') })));
  t(/\(4\)/.test(btn) && rel.map(x => x.nom.replace(/<.*>/, '')).join(' | ') === 'Un jour | Sans vente | Vide | Arrêtée',
    `« À relancer (4) » : d’abord celle qui a vendu un jour, puis sans vente, vide, arrêtée — ${rel.map(x => x.nom).join(' | ')}`);
  t(/un seul jour.*5 j/.test(rel[0].etape) && /jamais vendu/.test(rel[1].etape) && /aucun article/.test(rel[2].etape) && /30 j/.test(rel[3].etape),
    'chacune dit où elle s’est arrêtée : ' + rel.map(x => x.etape).join(' · '));
  t(rel.every(x => x.wa), 'chacune a son bouton WhatsApp');
  await p.locator('#ab-lst .mini-btn.wa').first().tap(); await p.waitForTimeout(200);
  const u = await p.evaluate(() => __ouvert[0] || '');
  const txt = decodeURIComponent((u.split('text=')[1] || ''));
  t(/^https:\/\/wa\.me\/237677000003\?text=/.test(u) && /vendu/.test(txt) && /manqué/.test(txt), 'WhatsApp s’ouvre sur son numéro, avec un message à son étape : « ' + txt.slice(0, 70) + '… »');
  t(await p.evaluate(() => typeof __xss === 'undefined' && !document.querySelector('#ab-lst img')), 'un nom de boutique piégé reste du texte (escH)');
  // Tant que la fonction n'est pas posée sur le serveur : l'ancienne suffit.
  await p.evaluate(() => {
    supa = { rpc: async nom => nom === 'admin_boutiques'
      ? { data: __rows.map(r => { const o = Object.assign({}, r); delete o.jours_vente; delete o.derniere_vente; delete o.cree_le; return o; }), error: null }
      : { data: null, error: { message: 'Could not find the function' } } };
    vueAbonnes('tout');
  });
  await p.evaluate(() => ouvrirAbonnes()); await p.waitForTimeout(300);
  await p.locator('#ab-v-rel').tap(); await p.waitForTimeout(200);
  const vieux = await p.evaluate(() => [...document.querySelectorAll('#ab-lst .hist-sale .hist-d')].map(x => x.textContent));
  t(vieux.join(' | ') === 'Sans vente | Vide', 'sans admin_boutiques2, la liste marche ; « À relancer » montre ce qu’on sait (sans vente, vide) — ' + vieux.join(' | '));
  t(errs.length === 0, 'aucune erreur JS (abonnés)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
