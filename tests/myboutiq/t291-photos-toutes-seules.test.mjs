// t291 — LES PHOTOS ARRIVENT TOUTES SEULES (23.74).
// Le patron, le 16/11/2026 : « Essaie de simplifier tout au maximum et
// rassure que les photos arrivent, c'est important. »
// Mesuré avant : le bandeau « N de tes articles peuvent avoir une vraie
// photo » ne venait qu'UNE fois dans la vie d'une boutique (clé
// myboutiq_photos_reelles_vues). Une boutique qui l'avait vu ne recevait
// JAMAIS les 58 photos Open Food Facts de la 23.72 : Coca-Cola restait un
// dessin. Maintenant elles se posent seules, à l'ouverture, là où il n'a pas
// mis la sienne, et seulement celles qu'on a vu arriver.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t291');
const { s, port } = await serveur();
const b = await chromium.launch();
const SIENNE = 'data:image/png;base64,iVBORw0KGgo=';
const d = nouvelleBoutique(); d.cfg.facon = 'detail';
d.articles.push({ id: 60, nm: 'Coca cola', e: '🥤', cat: 'Boissons', px: 600, pa: 450, stk0: 24, al: 0, vd: 0 });
d.articles.push({ id: 61, nm: 'Huile Mayor', e: '🛢️', cat: 'Alimentation', px: 1500, pa: 1300, stk0: 6, al: 0, vd: 0, img: SIENNE });
d.articles.push({ id: 62, nm: 'Guinness', e: '🍺', cat: 'Boissons', px: 900, pa: 700, stk0: 12, al: 0, vd: 0, _imgRefus: true, _imgNon: ['/photos-off/guinness-65cl.jpg'] });
d.articles.push({ id: 63, nm: 'Jus', e: '🧃', cat: 'Boissons', px: 700, pa: 500, stk0: 0, al: 0, vd: 0,
  vr: [{ id: 631, nm: 'Top Ananas', px: 700, pa: 500, stk0: 10 }, { id: 632, nm: 'Rouge', px: 700, pa: 500, stk0: 10 }] });
d.articles.push({ id: 64, nm: 'Eau Tangui', e: '💧', cat: 'Boissons', px: 400, pa: 300, stk0: 30, al: 0, vd: 0 });

const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
// Une boutique qui avait DÉJÀ vu (et fermé) l'ancien bandeau : c'est elle
// qui ne recevait plus rien.
await p.evaluate(() => { try { localStorage.setItem('myboutiq_photos_reelles_vues', '1'); } catch (e) {} });
const avant = await p.evaluate(() => DB.articles.map(a => [a.id, a.px, getStk(a)]).join('|'));

// Par le vrai chemin de l'ouverture : aucun appel à la main.
await p.waitForFunction(() => { const a = DB.articles.find(x => x.id === 60); return !!(a && a.img); }, null, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(800);
const r = await p.evaluate(() => {
  const a = id => DB.articles.find(x => x.id === id);
  const st = JSON.parse(localStorage.getItem('myboutiq_v6') || '{}');
  const sa = (st.articles || []).find(x => x.id === 60) || {};
  return {
    coca: a(60).img || '', cocaCat: !!a(60)._imgCat, tangui: a(64).img || '', huile: a(61).img, guinness: a(62).img || '',
    top: (a(63).vr[0] || {}).img || '', rouge: (a(63).vr[1] || {}).img || '', sauve: sa.img || '',
    bandeau: (document.getElementById('annonce-titre') || {}).textContent || '',
    tuile: (document.querySelector('#pc-60 img') || {}).getAttribute ? document.querySelector('#pc-60 img').getAttribute('src') : ''
  };
});
t(r.coca === '/photos-off/coca-cola-1l.jpg' && r.cocaCat, `à l'ouverture, sans rien toucher : « Coca cola » reçoit sa vraie photo (${r.coca || 'rien'})`);
t(r.tangui === '/photos-off/eau-tangui.jpg', `« Eau Tangui » aussi (${r.tangui || 'rien'})`);
t(r.sauve === '/photos-off/coca-cola-1l.jpg', 'la photo est enregistrée dans la boutique (elle repart vers les vendeurs)');
t(!!r.tuile, `la tuile de la caisse la montre aussitôt (détourée ou non) (${r.tuile || 'rien'})`);
t(r.huile === SIENNE, 'la photo prise par le commerçant ne bouge pas');
t(!r.guinness, 'une photo qu\'il avait retirée ne revient pas');
t(r.top === '/photos-off/top-ananas-1l.jpg' && !r.rouge, `une variante « Top Ananas » sans photo la reçoit ; « Rouge » (on ne sait pas quoi) reste sans (${r.top || 'rien'})`);
t(!/vraie photo/.test(r.bandeau), 'aucune question à lire : plus de bandeau « … peuvent avoir une vraie photo »');
const apres = await p.evaluate(() => DB.articles.map(a => [a.id, a.px, getStk(a)]).join('|'));
t(apres === avant, 'les prix et le stock n\'ont pas bougé d\'un franc ni d\'une pièce');

// Une photo qui n'arrive pas (fichier absent, réseau coupé) n'est jamais posée.
const mort = await p.evaluate(async () => {
  _PHOTOS_OFF.push(['fantome-introuvable', 'marquefantome', '0']); _offIdx = null;
  DB.articles.push({ id: 65, nm: 'Marquefantome', e: '❓', cat: 'Boissons', px: 100, pa: 50, stk0: 1, al: 0, vd: 0 });
  const prevu = _photosAPoser().some(x => x.p.id === 65);
  const n = await poserPhotosToutSeul();
  return { prevu, n, img: DB.articles.find(x => x.id === 65).img || '' };
});
t(mort.prevu && mort.n === 0 && !mort.img, `une adresse qui ne répond pas n'est pas posée : la carte garde son dessin (posées : ${mort.n})`);

// Deuxième ouverture : rien à refaire, rien ne bouge.
const deux = await p.evaluate(async () => { const avant = JSON.stringify(DB.articles); _PHOTOS_OFF.pop(); _offIdx = null; DB.articles = DB.articles.filter(x => x.id !== 65); const a2 = JSON.stringify(DB.articles); const n = await poserPhotosToutSeul(); return { n, idem: JSON.stringify(DB.articles) === a2 }; });
t(deux.n === 0 && deux.idem, 'à l\'ouverture suivante, rien n\'est reposé (idempotent)');

// Un vendeur ne pose rien : c'est la boutique du patron, sa copie la lui amène.
const v = await p.evaluate(async () => { const r0 = role; DB.articles.find(x => x.id === 60).img = ''; delete DB.articles.find(x => x.id === 60)._imgCat; role = 'vendeur'; const n = await poserPhotosToutSeul(); role = r0; return { n, img: DB.articles.find(x => x.id === 60).img }; });
t(v.n === 0 && !v.img, 'sur le téléphone d\'un vendeur, rien n\'est écrit');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
