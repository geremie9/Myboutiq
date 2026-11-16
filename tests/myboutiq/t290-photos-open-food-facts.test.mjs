// t290 — LES VRAIES PHOTOS D'OPEN FOOD FACTS, LIVRÉES AVEC L'APP (23.72).
// Le patron, le 16/11 : « Go go » pour importer les photos trouvées sur
// Open Food Facts (licence libre CC BY-SA 3.0, à créditer). Sans écrire
// dans `photos_partagees` (la certification est son geste) : des fichiers
// du site, /photos-off/. Une photo de marque ne va qu'à sa marque.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
import fs from 'node:fs';
const { t, fin } = compteur('t290');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique(); d.cfg.facon = 'detail';
d.articles.push({ id: 50, nm: 'Tartina', e: '🍫', cat: 'Alimentation', px: 1500, pa: 1200, stk0: 10, al: 0, vd: 0 });
d.articles.push({ id: 51, nm: 'Mon savon maison', e: '🧼', cat: 'Ménage', px: 300, pa: 200, stk0: 5, al: 0, vd: 0, img: 'data:image/png;base64,iVBORw0KGgo=' });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
await p.waitForTimeout(400);
const m = await p.evaluate(() => { const r = {}; ['Huile Mayor', 'Huile', 'Guness', 'Bière', 'Coca cola', 'Ananas', 'Top ananas 60 cl', 'Riz', 'Lait Nido', 'Lait', 'Reaktor', 'Colgate'].forEach(n => { r[n] = (_photoOff(n) || '').replace('/photos-off/', ''); }); return r; });
t(m['Huile Mayor'] === 'huile-mayor-1l.jpg' && m['Guness'] === 'guinness-65cl.jpg' && m['Coca cola'] === 'coca-cola-1l.jpg' && m['Lait Nido'] === 'lait-nido-sachet.jpg' && m['Reaktor'] === 'reaktor.jpg',
  `les marques ont leur vraie photo, fautes comprises (« Guness ») : ${m['Huile Mayor']}, ${m['Guness']}, ${m['Coca cola']}, ${m['Reaktor']}`);
t(!m['Huile'] && !m['Bière'] && !m['Riz'] && !m['Lait'] && !m['Ananas'], `un nom générique ne reçoit pas une photo de marque : Huile, Bière, Riz, Lait, Ananas (le fruit) gardent leur dessin`);
t(m['Top ananas 60 cl'] === 'top-ananas-1l.jpg', `« Top ananas 60 cl » : ${m['Top ananas 60 cl']}`);
// La certifiée passe avant ; sans elle, Open Food Facts.
const ordre = await p.evaluate(() => { const sans = photoCatalogue('Tartina');
  _photoManif = _photoManif || { _cert: {} }; _photoManif._cert = _photoManif._cert || {}; _photoManif._cert[_slugsPourNom('Tartina')[0]] = 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/APP/products/x.jpg';
  const avec = photoCatalogue('Tartina'); _photoManif._cert = {}; return { sans, avec }; });
t(ordre.sans === '/photos-off/tartina.jpg' && /APP\/products\/x\.jpg/.test(ordre.avec), `sans photo certifiée : celle d'Open Food Facts ; une certifiée passe avant (${ordre.sans})`);
// Sur la tuile : la photo s'affiche, et une photo prise par le commerçant n'est jamais remplacée.
const tu = await p.evaluate(async () => { appliquerPhotosCatalogue(DB.articles); renderProd(DB.articles);
  const im = document.querySelector('#pc-50 img'); if (!im) return null; await new Promise(r => { if (im.complete) r(); else { im.onload = r; im.onerror = r; setTimeout(r, 3000); } });
  return { src: im.getAttribute('src'), w: im.naturalWidth, sienne: String(DB.articles.find(a => a.id === 51).img).slice(0, 15) }; });
t(tu && tu.src === '/photos-off/tartina.jpg' && tu.w === 600, `la tuile « Tartina » montre sa vraie photo, 600 px, servie par le site (${tu && tu.src}, ${tu && tu.w})`);
t(tu && tu.sienne.indexOf('data:image/png') === 0, `la photo prise par le commerçant reste la sienne (${tu && tu.sienne})`);
// Le crédit : Réglages et le fichier de licence.
const cr = await p.evaluate(async () => ({ t: (document.getElementById('credit-off') || {}).textContent || '', lic: await (await fetch('/photos-off/LICENCE.txt')).text() }));
t(/Open Food Facts \(CC BY-SA 3\.0\)/.test(cr.t) && /CC BY-SA 3\.0/.test(cr.lic) && /tartina\.jpg — https:\/\/world\.openfoodfacts\.org\/product\//.test(cr.lic), `crédité comme la licence l'exige : « ${cr.t.trim()} », et la liste photo par photo dans LICENCE.txt`);
// Chaque photo déclarée existe, et aucune n'est en trop.
const decl = await p.evaluate(() => _PHOTOS_OFF.map(x => x[0] + '.jpg'));
const fich = fs.readdirSync(new URL('../../photos-off/', import.meta.url)).filter(f => f.endsWith('.jpg'));
t(decl.length >= 50 && decl.every(f => fich.includes(f)) && fich.every(f => decl.includes(f)), `${decl.length} photos déclarées, toutes présentes dans photos-off/, aucune orpheline`);
const sw = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
t(/\/photos-off\//.test(sw) && /isProductImage/.test(sw), 'le service worker les garde dans le cache des images (hors ligne, d\'une version à l\'autre)');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
