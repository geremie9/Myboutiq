// t242 — « SUR L'IMAGE, C'EST SEULEMENT LA MOITIÉ DE L'ÉCRAN DU TÉLÉPHONE QUI
// EST UTILISÉE POUR LA VENTE » (23.23).
// Mesuré sur la 23.22, à 360 × 760 : en-tête 66, Ventes/Bénéfice/Trans. 60,
// bandeau jusqu'à 124, recherche + catégories 119, « TOUS LES ARTICLES ·
// Montant libre · + Ajouter » 52 — le premier article à 431 px. Et le
// bénéfice du jour lisible par le client debout devant le comptoir.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t242');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.cfg.facon = 'gros';
// Un carton connu, sans son prix : de quoi faire apparaître la carte « sans prix de gros ».
d.articles.push({ id: 30, nm: 'Sucre', e: '📦', cat: 'Divers', px: 900, pa: 800, stk0: 50, al: 0, vd: 0, vr: [], umSac: 20, umCont: 'sac' });
for (let i = 0; i < 12; i++) d.articles.push({ id: 100 + i, nm: 'Article ' + i, e: '📦', cat: 'Divers', px: 500, pa: 400, stk0: 20, al: 0, vd: 0, vr: [] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { tactile: true });
await p.setViewportSize({ width: 360, height: 760 }); await p.waitForTimeout(300);
// Le cas le plus chargé : une annonce de MyBoutiQ est là.
await p.evaluate(() => { afficherAnnonce({ id: 'a1', titre: 'Nouveau : le reçu par WhatsApp est plus court et plus lisible', message: 'Touche « Reçu » après la vente.', niveau: 'info' }); renderProd(DB.articles); });
await p.waitForTimeout(300);
const m = await p.evaluate(() => {
  const g = document.getElementById('pgrid').getBoundingClientRect(), nav = document.querySelector('#s-caisse .bnav').getBoundingClientRect();
  const cartes = [...document.querySelectorAll('#pgrid .pcard')].filter(c => { const r = c.getBoundingClientRect(); return r.top >= g.top - 1 && r.bottom <= nav.top; });
  const vu = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  return { haut: Math.round(g.top), part: Math.round((nav.top - g.top) / nav.top * 100), entieres: cartes.length,
    stats: vu(document.querySelector('#s-caisse .stats-bar')), benef: vu(document.getElementById('sb')) };
});
t(m.haut <= 270, `le premier article commence à ${m.haut} px (la 23.22 : 431 px)`);
t(m.part >= 60 && m.entieres >= 6, `les articles ont ${m.part} % de l'écran, ${m.entieres} tuiles entières visibles`);
t(!m.stats && !m.benef, 'Ventes / Bénéfice / Trans. ne sont plus sur la caisse : le client ne lit plus le bénéfice du jour');
// Les chiffres sont toujours à un toucher : Rapports.
await p.evaluate(() => navTo('rapports', document.querySelectorAll('#s-caisse .bnav .ni')[2])); await p.waitForTimeout(500);
t(await p.evaluate(() => /Bénéfice net/i.test(document.getElementById('s-rapports').innerText)), 'le bénéfice est dans Rapports, en tête');
await p.evaluate(() => navTo('caisse', document.querySelector('#s-rapports .bnav .ni'))); await p.waitForTimeout(400);

// Une seule ligne pour les catégories et « Montant libre ».
const l = await p.evaluate(() => { const tb = document.getElementById('tabs-c').getBoundingClientRect(), ml = document.getElementById('btn-libre').getBoundingClientRect();
  return { meme: Math.abs((tb.top + tb.height / 2) - (ml.top + ml.height / 2)) < 6, h: Math.round(ml.height), droite: Math.round(ml.right), lbl: getComputedStyle(document.getElementById('sec-lbl')).display === 'none' || document.getElementById('sec-lbl').getBoundingClientRect().height === 0 }; });
t(l.meme && l.h >= 36 && l.droite <= 360, `« Montant libre » est sur la ligne des catégories (${l.h} px, bord droit à ${l.droite})`);
await p.locator('#btn-libre').tap(); await p.waitForTimeout(300);
t(await p.evaluate(() => document.getElementById('ov-libre').classList.contains('show')), 'et il ouvre toujours sa feuille');
await p.evaluate(() => closeSheet('ov-libre')); await p.waitForTimeout(250);

// Le bandeau : une ligne, et il s'ouvre au toucher.
const a0 = await p.evaluate(() => { const bn = document.getElementById('annonce-banner'), m = document.getElementById('annonce-msg');
  return { h: Math.round(bn.getBoundingClientRect().height), msg: m.getBoundingClientRect().height }; });
t(a0.h <= 52 && a0.msg === 0, `une annonce tient sur une ligne (${a0.h} px), le message attend`);
await p.locator('#annonce-titre').tap(); await p.waitForTimeout(200);
const a1 = await p.evaluate(() => ({ msg: document.getElementById('annonce-msg').getBoundingClientRect().height, txt: document.getElementById('annonce-msg').textContent }));
t(a1.msg > 0 && /Reçu/.test(a1.txt), `un toucher, et le message s'affiche (« ${a1.txt} »)`);
await p.locator('#annonce-banner .bcl').tap(); await p.waitForTimeout(200);
t(await p.evaluate(() => document.getElementById('annonce-banner').style.display === 'none'), 'la croix le ferme');

// Le rangement est dans Stock, et l'onglet le signale.
const r = await p.evaluate(() => {
  const z = document.getElementById('caisse-sansgros'), btn = document.querySelector('#s-caisse .ni-stock .ne');
  return { surCaisse: !!z.closest('#s-caisse'), dansStock: !!z.closest('#s-stock'), txt: z.textContent,
    pastille: document.body.classList.contains('stk-a-faire') && getComputedStyle(btn, '::after').content !== 'none',
    install: !!document.getElementById('cai-install').closest('#s-stock'), bio: !!document.getElementById('cai-bio').closest('#s-stock') };
});
t(!r.surCaisse && r.dansStock && r.install && r.bio, 'les cartes de rangement (prix de gros, installer, empreinte) vivent dans Stock');
t(r.pastille && /1 article sans prix de gros/.test(r.txt), `une pastille sur l'onglet Stock dit qu'il y a quelque chose (« ${r.txt} »)`);
await p.locator('#s-caisse .ni-stock').tap(); await p.waitForTimeout(400);
const st = await p.evaluate(() => { const z = document.getElementById('caisse-sansgros').getBoundingClientRect(); return { vu: z.height > 0, haut: Math.round(z.top) }; });
t(st.vu && st.haut < 200, `dans Stock, la carte est en tête (${st.haut} px)`);
await p.locator('#caisse-sansgros').tap(); await p.waitForTimeout(400);
t(await p.evaluate(() => !!document.querySelector('#ov-grille.show')), 'et elle ouvre « Tout configurer », comme avant');

t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
