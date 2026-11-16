// t292 — 17 VRAIES PHOTOS DE PLUS, D'OPEN FOOD FACTS (23.79).
// Le patron, le 16/11, quand la recherche OFF a été finie : mettre en ligne
// les nouvelles photos. Seulement celles dont la MARQUE est la bonne (Dano,
// Cowbell, Nan, Dolait, Ovaltine…) ; une marque prise au hasard attend son tri.
// ⚠️ Mesuré en écrivant la table : avec l'expression « dangote » seule, le sac
// de sucre allait sur « Spaghetti Dangote » ; avec « golden penny » seule, les
// spaghettis allaient sur « Semoule Golden Penny ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t292');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique(); d.cfg.facon = 'detail';
d.articles.push({ id: 60, nm: 'Lait Dano', e: '🥛', cat: 'Alimentation', px: 1500, pa: 1200, stk0: 10, al: 0, vd: 0 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
await p.waitForTimeout(400);
const noms = ['Lait Dano', 'Cowbell', 'Lait Three Crowns', 'Lait bébé Nan', 'Yaourt Dolait', 'Bournvita', 'Ovaltine', 'Vache qui rit',
  'Jus Chivita', 'Spaghetti Golden Penny', 'Sucre Dangote', 'Couches Pampers', 'Serviettes Always', 'Piles Duracell',
  'Insecticide Baygon', "Gin Gordon's", 'Arachides grillées', 'Mafor',
  'Spaghetti Dangote', 'Semoule Golden Penny', 'Yaourt', 'Arachides', 'Pâte d\'arachide grillée', 'Sucre', 'Piles', 'Gin', 'Lait'];
const m = await p.evaluate(n => { const r = {}; n.forEach(x => { r[x] = (_photoOff(x) || '').replace('/photos-off/', ''); }); return r; }, noms);
const attendu = { 'Lait Dano': 'lait-dano-poudre-400g', 'Cowbell': 'lait-cowbell-sachet', 'Lait Three Crowns': 'lait-three-crowns-boite',
  'Lait bébé Nan': 'lait-bebe-nan-400g', 'Yaourt Dolait': 'yaourt-dolait', 'Bournvita': 'bournvita', 'Ovaltine': 'ovaltine-800g',
  'Vache qui rit': 'vache-qui-rit', 'Jus Chivita': 'jus-chivita-1l', 'Spaghetti Golden Penny': 'spaghetti-golden-penny-500g',
  'Sucre Dangote': 'sucre-dangote-500g', 'Couches Pampers': 'couches-pampers', 'Serviettes Always': 'serviettes-always',
  'Piles Duracell': 'piles-duracell-aa', 'Insecticide Baygon': 'insecticide-baygon', "Gin Gordon's": 'gin-gordons-1l',
  'Arachides grillées': 'arachides-grillees-mafor', 'Mafor': 'arachides-grillees-mafor' };
const rates = Object.keys(attendu).filter(n => m[n] !== attendu[n] + '.jpg');
t(rates.length === 0, `les 17 nouvelles marques ont leur vraie photo` + (rates.length ? ' — ratées : ' + rates.map(n => n + '→' + (m[n] || '∅')).join(', ') : ''));
t(!m['Spaghetti Dangote'] && !m['Semoule Golden Penny'], `« Spaghetti Dangote » ne reçoit pas le sucre, « Semoule Golden Penny » pas les spaghettis (${m['Spaghetti Dangote'] || '∅'}, ${m['Semoule Golden Penny'] || '∅'})`);
t(!m['Yaourt'] && !m['Arachides'] && !m['Pâte d\'arachide grillée'] && !m['Sucre'] && !m['Piles'] && !m['Gin'] && !m['Lait'],
  `un nom générique garde son dessin : Yaourt, Arachides, Pâte d'arachide grillée, Sucre, Piles, Gin, Lait`);
// Les nouvelles photos sont servies par le site, 600×600, et créditées.
const im = await p.evaluate(async () => { const r = []; for (const f of ['lait-dano-poudre-400g', 'vache-qui-rit', 'insecticide-baygon']) {
  const i = new Image(); i.src = '/photos-off/' + f + '.jpg'; await new Promise(z => { i.onload = z; i.onerror = z; setTimeout(z, 3000); }); r.push(i.naturalWidth + 'x' + i.naturalHeight); }
  const lic = await (await fetch('/photos-off/LICENCE.txt')).text();
  return { r, lic: /vache-qui-rit\.jpg — https:\/\/world\.openfoodfacts\.org\/product\/3073781175011/.test(lic) && /lait-dano-poudre-400g\.jpg — /.test(lic) }; });
t(im.r.every(x => x === '600x600') && im.lic, `servies en 600×600 (${im.r.join(', ')}) et listées une à une dans LICENCE.txt`);
// Sur la tuile : l'article « Lait Dano » montre sa photo.
const tu = await p.evaluate(async () => { appliquerPhotosCatalogue(DB.articles); renderProd(DB.articles);
  const i = document.querySelector('#pc-60 img'); return i ? i.getAttribute('src') : null; });
t(tu === '/photos-off/lait-dano-poudre-400g.jpg', `la tuile « Lait Dano » montre sa vraie photo (${tu})`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
