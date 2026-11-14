// t264 — « Ranger ma boutique » : un article à la fois (23.46).
// La simulation du 14/11 : l'arrivage coûtait 4 gestes + 5 chiffres par
// article et se refermait à chaque fois ; passer le riz « au kilo »
// demandait un lien puis une liste déroulante.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t264');
const { s, port } = await serveur();
const b = await chromium.launch();
const A = (id, nm, px, cat, x) => Object.assign({ id, nm, e: '📦', cat, px, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true }, x || {});
const db = nouvelleBoutique(); db.cfg.facon = 'detail';
// Ce que laisse « Tout mettre dans ma caisse » : des prix courants, aucun stock.
db.articles = [A(1, 'Riz', 600, 'Alimentation'), A(2, 'Savon', 0, 'Ménage'), A(3, 'Huile', 1300, 'Alimentation'), A(4, 'Pain', 150, 'Alimentation'), A(5, 'Bougie', 150, 'Ménage'),
  A(6, 'Eau', 0, 'Boissons', { vr: [{ id: 1, nm: '50 cl', px: 300, pa: 0, stk0: 0 }, { id: 2, nm: '1,5 L', px: 500, pa: 0, stk0: 0 }] })]; db.nextId = 50;
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(400);
let gestes = 0;
const tap = async sel => { await p.locator(sel).first().tap(); gestes++; await p.waitForTimeout(120); };
const taper = async n => { for (const c of String(n)) await tap(`#rg .rg-pave button:text-is("${c}")`); };
const ecran = () => p.evaluate(() => ({ nom: (document.querySelector('.rg-planche') || {}).textContent, cpt: (document.querySelector('.rg-cpt') || {}).textContent, ray: (document.querySelector('.rg-ray') || {}).textContent, champ: (document.querySelector('.rg-val.on') || {}).id, px: document.querySelector('#rg-px b').textContent, stk: document.querySelector('#rg-stk b').textContent, um: (document.querySelector('.rg-um .on') || {}).textContent }));

// Le Stock le propose, en haut, sans chercher.
await p.evaluate(() => navTo('stock', document.querySelectorAll('.ni')[1])); await p.waitForTimeout(400);
const band = await p.evaluate(() => { const x = document.getElementById('stk-ranger'); return x.offsetParent ? x.textContent : ''; });
t(/5 articles à ranger/.test(band), `le Stock le propose en haut : « ${band} » (la famille se règle dans son panneau)`);
await tap('#stk-ranger');
let e = await ecran();
t(e.nom === 'Riz' && /1 sur 5/.test(e.cpt) && e.ray === 'Alimentation' && /600/.test(e.px) && e.champ === 'rg-stk', `un article à la fois, rayon par rayon : ${e.nom} · ${e.cpt} · ${e.ray} — son prix est déjà là, on demande la quantité`);

// ── Le riz : au kilo, 650 F, 50 kg ──
gestes = 0;
await tap('#rg .rg-um button:nth-child(2)');
await tap('#rg-px'); await taper(650);
await tap('#rg-suiv');                       // du prix → la quantité
e = await ecran();
t(e.champ === 'rg-stk' && /650/.test(e.px) && /kilo/i.test(e.um), 'le même bouton vert passe du prix à la quantité');
await taper(50); await tap('#rg-suiv');
const riz = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 1); return { px: a.px, um: a.um, stk: getStk(a), rg: a.rg, mesure: estMesure(a), garde: JSON.parse(localStorage.getItem('myboutiq_v6')).articles.find(x => x.id === 1).px }; });
t(riz.px === 650 && riz.um === 'kg' && riz.mesure && riz.stk === 50 && riz.garde === 650, `le riz est au kilo, à 650 F, 50 kg en stock — enregistré tout de suite (${gestes} gestes, unité et prix changés compris)`);
e = await ecran();
t(e.nom === 'Huile' && /2 sur 5/.test(e.cpt), `la suite arrive toute seule : ${e.nom} · ${e.cpt}`);

// ── L'huile : rien à changer au prix, 12 pièces → 3 gestes ──
gestes = 0;
await taper(12); await tap('#rg-suiv');
t(gestes === 3 && (await stock(p, 3)) === 12, `prix déjà bon : ${gestes} gestes pour un article (2 chiffres + « Suivant »)`);

// ── Le pain : il ne compte pas son stock ──
await tap('#rg .rg-sans');
const pain = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 4); return { rg: a.rg, jamais: _stockJamaisCompte(a), appros: DB.appros.filter(x => String(x.pid) === '4').length }; });
t(pain.rg === 1 && pain.jamais && pain.appros === 0, '« Je ne compte pas le stock » : l\'article est rangé, sans faux stock ni fausse entrée');
e = await ecran();
// ── Le savon n'a pas de prix : « Suivant » ne passe pas sans lui ──
t(e.nom === 'Savon' && e.champ === 'rg-px' && /Prix \?/.test(e.px), 'un article sans prix commence par le prix');
await tap('#rg-suiv');
t((await ecran()).nom === 'Savon' && (await p.evaluate(() => (window.__toasts || []).join('|'))).match(/prix/i), 'sans prix, on ne passe pas en silence : il le dit');
// Il a dit ne pas compter : un seul toucher après le prix.
gestes = 0; await taper(400); await tap('#rg-suiv');
t(gestes === 4 && (await p.evaluate(() => DB.articles.find(x => x.id === 2).px)) === 400 && (await ecran()).nom === 'Bougie', `il ne compte pas : le prix puis UN « Suivant » (${gestes} gestes), la quantité n'est plus redemandée`);

// ── « Passer », puis s'arrêter : ce qui reste revient ──
await tap('#rg .rg-passer');
const finE = await p.evaluate(() => (document.querySelector('.rg-fin b') || {}).textContent || '');
t(/reste 1/.test(finE), `tout le reste passé : « ${finE} »`);
await tap('#rg .rg-suiv'); await p.waitForTimeout(300);
const apres = await p.evaluate(() => ({ ouvert: document.getElementById('ov-rgb').classList.contains('show'), band: document.getElementById('stk-ranger').textContent, tuile: (document.querySelector('#pc-1 .ppr-ov') || {}).textContent }));
t(!apres.ouvert && /1 article à ranger/.test(apres.band) && /650/.test(apres.tuile), `de retour : « ${apres.band} », et la caisse montre le nouveau prix (${apres.tuile})`);

// La caisse vend au kilo ce qui a été rangé au kilo, et le stock suit.
await p.evaluate(() => navTo('caisse', document.querySelectorAll('.ni')[0])); await p.waitForTimeout(300);
await vendre(p, { lignes: [[3, 2]], mode: 'especes' });
t((await stock(p, 3)) === 10, 'une vente retire bien du stock posé en rangeant (12 → 10)');
// Le journal garde la trace.
const j = await p.evaluate(() => (DB.journal || []).filter(x => x.art === 'Riz').map(x => x.act).join(','));
t(/prix/.test(j) && /unite/.test(j), `le journal garde la trace : ${j}`);
// Un vendeur sans droit n'y entre pas.
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await p.evaluate(() => { navTo('stock', document.querySelectorAll('.ni')[1]); ouvrirRangerBoutique(); }); await p.waitForTimeout(300);
await p.screenshot({ path: process.env.CAPTURE || '/dev/null' }).catch(() => {});
await ctx.close(); await b.close(); s.close();
fin();
