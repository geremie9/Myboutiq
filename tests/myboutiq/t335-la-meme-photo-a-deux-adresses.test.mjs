// t335 — LA MÊME PHOTO À DEUX ADRESSES NE SE REPOSE PLUS À CHAQUE OUVERTURE (24.18).
// Trouvé le 26/11 dans le journal de sa boutique : « Photos posées → Boisson
// predator », six fois en deux jours (05:01, 09:11, 13:28, 17:44, 20:00,
// 20:40). Sa famille porte la photo du serveur (…/APP/catalogue-off/
// boisson-predator.jpg) ; hors réseau, le catalogue répond par la même photo
// livrée avec l'app (/photos-off/boisson-predator.jpg). Deux adresses, une
// photo : l'app la reposait, réenregistrait la boutique, la renvoyait au
// serveur et l'écrivait au journal à chaque ouverture.
// Le banc tourne hors réseau : le catalogue y répond par /photos-off/.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t335');
const { s, port } = await serveur();
const b = await chromium.launch();
const SERVEUR = 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/APP/catalogue-off/boisson-predator.jpg';
const d = nouvelleBoutique();
d.articles.push({ id: 147, nm: 'Boisson predator', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, img: SERVEUR, _imgCat: true,
  vr: [{ id: 1, nm: 'Boisson Predator 33 cl', px: 300, pa: 250, stk0: 24, img: '/photos-off/boisson-predator.jpg' }] },
  { id: 148, nm: 'Biere Beaufort 65cl', e: '', cat: 'Boissons', px: 650, pa: 550, stk0: 12, al: 0, vd: 0, vr: [] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);

const u = await p.evaluate(() => photoCatalogue('Boisson predator'));
t(/\/photos-off\/boisson-predator\.jpg$/.test(u), `hors réseau, le catalogue propose la photo livrée avec l'app (${u})`);
const r = await p.evaluate(async () => { const nj = (DB.journal || []).length; const n = await poserPhotosToutSeul(); const a = DB.articles.find(x => x.id === 147);
  return { n, img: a.img, j: (DB.journal || []).length - nj, beaufort: DB.articles.find(x => x.id === 148).img || '' }; });
t(r.img === SERVEUR && !(r.j > 0 && /predator/i.test(JSON.stringify(await p.evaluate(() => DB.journal[0])))), `la même photo à une autre adresse : la famille garde la sienne, rien au journal (${r.img.slice(-40)})`);
t(/beaufort/.test(r.beaufort), `une vraie nouvelle photo se pose toujours : Bière Beaufort reçoit la sienne (${r.beaufort})`);
const r2 = await p.evaluate(async () => { const nj = (DB.journal || []).length; const n = await poserPhotosToutSeul(); return { n, j: (DB.journal || []).length - nj }; });
t(r2.n === 0 && r2.j === 0, `l'ouverture suivante : rien à poser, rien au journal (${r2.n} photo, ${r2.j} ligne)`);

t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
