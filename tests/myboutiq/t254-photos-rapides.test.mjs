// t254 — « Mettre les photos est devenu un peu compliqué : ça prend
// plusieurs temps, plusieurs techniques. » (23.37)
// Avant : sans réseau, « Connexion requise » et la photo perdue ; avec
// réseau, l'écran de recadrage à chaque fois, l'attente de l'envoi, et
// « partager ? » après CHAQUE photo.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t254');
const { s, port } = await serveur();
const b = await chromium.launch();
const STO = 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/APP/products/';

const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
// Une vraie photo de téléphone : 1200 × 900, en paysage.
const jpg = async (couleur) => Buffer.from(await p.evaluate(c => {
  const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 900;
  const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 1200, 900); x.fillStyle = '#fff'; x.fillRect(500, 350, 200, 200);
  return cv.toDataURL('image/jpeg', 0.9).split(',')[1];
}, couleur), 'base64');
const fichier = async c => ({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: await jpg(c) });
await p.evaluate(() => {
  window.__q = 0; window.confirm = () => { window.__q++; return true; };
  window.__envois = [];
  uploadBlobProduit = function (blob) {
    return createImageBitmap(blob).then(bm => { window.__envois.push(bm.width + 'x' + bm.height); return 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/APP/products/MARI0001-t' + window.__envois.length + '.jpg'; });
  };
});

// ── 1. Sans réseau : la photo est posée tout de suite ──
await ctx.setOffline(true);
await p.evaluate(() => { artCtx = DB.articles.find(a => a.id === 2); });
await p.locator('#inp-photo-real-ctx').setInputFiles(await fichier('#c0392b'));
await p.waitForTimeout(1500);
const r1 = await p.evaluate(() => {
  const a = DB.articles.find(x => x.id === 2), tuile = document.querySelector('#pc-2 img');
  return { img: (a.img || '').slice(0, 23), att: a._imgAttente || '', moi: _deviceId, crop: document.getElementById('ov-crop').classList.contains('show'),
    tuile: !!tuile && /^data:image\/jpeg/.test(tuile.getAttribute('src') || ''), toast: window.__toasts.join(' | '), snack: (document.getElementById('snack-ph') || {}).className || '',
    garde: JSON.parse(localStorage.getItem('myboutiq_v6')).articles.find(x => x.id === 2)._imgAttente || '', taille: (a.img || '').length };
});
t(!r1.crop && r1.img === 'data:image/jpeg;base64,' && r1.tuile, 'sans réseau : pas d\'écran de recadrage, la photo est sur la tuile tout de suite');
t(/elle part au retour du réseau/.test(r1.toast) && !/Connexion requise/.test(r1.toast), 'il est prévenu qu\'elle partira toute seule — plus de « Connexion requise »');
t(r1.att.indexOf(r1.moi + '|') === 0 && r1.garde === r1.att, `en attente, et c'est CE téléphone qui l'enverra (gardé dans la boutique)`);
t(r1.taille < 40000, `la vignette gardée dans la boutique reste légère (${Math.round(r1.taille / 1024)} Ko)`);
t(/show/.test(r1.snack), '« Recadrer » est proposé, pas imposé');
const q1 = await p.evaluate(() => window.__q);
t(q1 === 1 && (await p.evaluate(() => localStorage.getItem('myboutiq_partage_photos'))) === 'oui', 'la question du partage, une fois');

// « Recadrer » : l'écran de toujours, et la photo recadrée remplace la première.
await p.locator('#snack-ph-b').tap(); await p.waitForTimeout(600);
const crop = await p.evaluate(() => document.getElementById('ov-crop').classList.contains('show'));
const att0 = r1.att;
await p.evaluate(() => validerCrop()); await p.waitForTimeout(1200);
const r2 = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 2); return { att: a._imgAttente, img: (a.img || '').slice(0, 10) }; });
t(crop && r2.att && r2.att !== att0 && r2.img === 'data:image', `recadrer à la main reste possible, et remplace la photo en attente [crop=${crop} img=${r2.img}]`);

// Une photo prise par un AUTRE téléphone, arrivée par la synchro : jamais envoyée d'ici.
await p.evaluate(() => { const a = DB.articles.find(x => x.id === 4); a.img = 'data:image/jpeg;base64,AAAA'; a._imgAttente = 'autre-tel|ph1'; });

// ── 2. Le réseau revient : la vraie photo part, et remplace la vignette ──
await ctx.setOffline(false);
await p.evaluate(() => window.dispatchEvent(new Event('online')));
await p.waitForTimeout(4500);
const r3 = await p.evaluate(async () => {
  const a = DB.articles.find(x => x.id === 2), autre = DB.articles.find(x => x.id === 4);
  const reste = await _phLire(String(a._imgAttente || 'x').split('|')[1] || 'x');
  return { img: a.img, att: a._imgAttente || null, envois: window.__envois.slice(), autre: autre._imgAttente, q: window.__q, idb: reste };
});
t(r3.img.indexOf(STO) === 0 && r3.att === null, `réseau revenu : la photo est envoyée et l'article pointe vers elle (${r3.img.slice(-22)})`);
t(r3.envois.length === 1 && r3.envois[0] === '600x600', `c'est la vraie photo qui part, en carré de 600 (${r3.envois.join(',')}), pas la vignette`);
t(r3.autre === 'autre-tel|ph1', 'la photo en attente d\'un autre téléphone n\'est pas envoyée d\'ici');

// ── 3. En ligne : une deuxième photo, aucune question de plus ──
await p.evaluate(() => { artCtx = DB.articles.find(a => a.id === 3); });
await p.locator('#inp-photo-real-ctx').setInputFiles(await fichier('#2980b9'));
await p.waitForTimeout(2500);
const r4 = await p.evaluate(() => ({ q: window.__q, img: DB.articles.find(x => x.id === 3).img || '', n: window.__envois.length }));
t(r4.q === 1 && r4.img.indexOf(STO) === 0 && r4.n === 2, 'en ligne : posée puis envoyée toute seule, sans redemander le partage');

// ── 4. « Photographier mes articles » : un après l'autre ──
await p.evaluate(() => navTo('stock', document.querySelectorAll('.ni')[1])); await p.waitForTimeout(500);
const band = await p.evaluate(() => { const x = document.getElementById('stk-photos'); return x && x.offsetParent ? x.textContent : ''; });
t(/articles sans photo/.test(band), `le Stock le dit : « ${band} »`);
await p.locator('#stk-photos').tap(); await p.waitForTimeout(400);
const c0 = await p.evaluate(() => document.querySelector('#phot-cont .phot-cpt').textContent + ' · ' + document.querySelector('#phot-cont .phot-nm').textContent);
const capt = await p.evaluate(() => document.getElementById('inp-phot').getAttribute('capture'));
await p.locator('#inp-phot').setInputFiles(await fichier('#27ae60')); await p.waitForTimeout(1500);
const c1 = await p.evaluate(() => document.querySelector('#phot-cont .phot-cpt').textContent);
await p.getByText('Passer ›').tap(); await p.waitForTimeout(200);
const c2 = await p.evaluate(() => document.querySelector('#phot-cont .phot-cpt').textContent);
t(/Article 1 sur 4/.test(c0) && capt === 'environment' && /Article 2 sur 4/.test(c1) && /Article 3 sur 4/.test(c2), `appareil ouvert, un par un : ${c0} → ${c1} → « Passer » → ${c2}`);
await p.getByText('Passer ›').tap(); await p.waitForTimeout(200);
await p.locator('#inp-phot').setInputFiles(await fichier('#8e44ad')); await p.waitForTimeout(1500);
const fini = await p.evaluate(() => document.querySelector('#phot-cont .phot-fin b').textContent);
t(/2 photos posées/.test(fini) && (await p.evaluate(() => window.__q)) === 1, `à la fin : « ${fini} », et toujours une seule question`);

// ── 5. Réglages : il peut revenir sur sa réponse ──
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); goSt(); }); await p.waitForTimeout(300);
const tg0 = await p.evaluate(() => document.getElementById('tog-partage').className);
await p.evaluate(() => basculerPartagePhotos());
const tg1 = await p.evaluate(() => [document.getElementById('tog-partage').className, localStorage.getItem('myboutiq_partage_photos')].join(' '));
t(/on/.test(tg0) && /off non/.test(tg1), `Réglages ▸ « Partager mes photos » : ${tg0} → ${tg1}`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();
await b.close(); s.close();
fin();
