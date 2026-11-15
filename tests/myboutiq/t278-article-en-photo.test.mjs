// t278 — UN ARTICLE NOUVEAU, EN PHOTO, EN DEUX GESTES (23.59).
// Le patron, le 15/11 : « ajouter un nouveau produit, la navigation devient
// complexe, avec des frictions » ; « après la prise de photo, les articles
// doivent être posés comme dans la vie réelle » ; « rognage aussi ».
// Mesuré : quatre écrans avant le formulaire ; toute photo recadrée en
// carré AU CENTRE (une bouteille debout perdait bouchon ou pied) ; une
// photo prise sur une table restait un rectangle.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t278');
const { s, port } = await serveur();
const b = await chromium.launch();

// Les photos d'essai, faites au téléphone : posées sur une table à deux tons.
const pg = await b.newPage();
const photo = (bouteille) => pg.evaluate(async (bouteille) => {
  const c = document.createElement('canvas'); c.width = 300; c.height = 600; const x = c.getContext('2d');
  for (let y = 0; y < 600; y += 16) { x.fillStyle = '#b98d5a'; x.fillRect(0, y, 300, 10); x.fillStyle = '#a67b4c'; x.fillRect(0, y + 10, 300, 6); }
  x.fillStyle = bouteille; x.fillRect(150, 40, 40, 50); x.fillRect(125, 85, 90, 470);          // debout, pas au centre
  x.fillStyle = '#fff'; x.fillRect(125, 260, 90, 80);                                          // son étiquette blanche
  return c.toDataURL('image/jpeg', 0.9).split(',')[1];
}, bouteille);
const VERTE = Buffer.from(await photo('#2e7d32'), 'base64'), BOIS = Buffer.from(await photo('#ad8253'), 'base64');
await pg.close();

const db = nouvelleBoutique(); db.cfg.facon = 'detail';
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 760 });

// 1. Le geste : + → « Un article en photo » → l'appareil.
await p.evaluate(() => ouvrirAjoutRapide()); await p.waitForTimeout(300);
const fc = p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
await p.locator('#ajr-aph').tap();
const ch = await fc;
t(!!ch && await p.evaluate(() => document.getElementById('inp-apn').getAttribute('capture')) === 'environment', '« + » → « Un article en photo » ouvre directement l\'appareil photo');
await ch.setFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: VERTE });
await p.waitForFunction(() => document.getElementById('ov-apn').classList.contains('show'), null, { timeout: 5000 }).catch(() => {});
await p.waitForTimeout(300);
const a = await p.evaluate(() => { const k = _apn.crop, pr = document.getElementById('apn-prod');
  return { show: document.getElementById('ov-apn').classList.contains('show'), detoure: !!pr && !pr.classList.contains('apn-cadre') && !!pr.querySelector('canvas'),
    haut: k.y <= 40 + 2, bas: k.y + k.c >= 555 - 2, champs: !!document.getElementById('apn-nm') && !!document.getElementById('apn-px') && !!document.getElementById('apn-q') }; });
t(a.show && a.champs, 'la photo prise : une seule feuille — son article, son nom, son prix, combien il en a');
t(a.detoure, 'l\'article est déjà posé sur la planche, détouré de sa table (fond à deux tons)');
t(a.haut && a.bas, 'recadré tout seul sur le produit : la bouteille debout garde son bouchon ET son pied (avant : carré au centre)');

// 2. Recadrer : le carré se déplace du doigt, se rapetisse et s'agrandit.
await p.evaluate(() => apnRecadrer()); await p.waitForTimeout(200);
const av = await p.evaluate(() => ({ x: _apn.crop.x, c: _apn.crop.c }));
const bx = await p.locator('#apn-car').boundingBox();
await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.mouse.move(bx.x + bx.width / 2 - 30, bx.y + bx.height / 2, { steps: 4 }); await p.mouse.up();
await p.evaluate(() => apnTaille(0.85));
const ap = await p.evaluate(() => ({ x: _apn.crop.x, c: _apn.crop.c }));
t(ap.c < av.c && ap.x !== av.x, `« Recadrer » : le carré bouge sous le doigt, « − » le rapetisse (${Math.round(av.c)} → ${Math.round(ap.c)} px)`);
await p.evaluate(() => { _apn.crop = _apnCropAuto(); _apn.recadre = true; _apnApercu(); }); await p.waitForTimeout(200);

// 3. Sans prix, le bouton le dit ; un nom déjà pris est refusé.
t(/sans prix/i.test(await p.locator('#apn-ok').textContent()), 'sans prix, le bouton dit « Ajouter sans prix »');
await p.fill('#apn-nm', 'riz'); await p.evaluate(() => { window.__t = []; const st = window.showToast; window.showToast = function (m) { window.__t.push(m); try { return st.apply(this, arguments); } catch (e) {} }; });
await p.locator('#apn-ok').tap(); await p.waitForTimeout(300);
t(await p.evaluate(() => document.getElementById('ov-apn').classList.contains('show') && __t.some(m => /déjà dans ta boutique/.test(m))), '« Riz » existe déjà : il le lit, rien n\'est créé en double');

// 4. Ajouter.
await p.fill('#apn-nm', 'Sprite 1 L'); await p.fill('#apn-px', '700'); await p.fill('#apn-q', '12');
t(/700/.test(await p.locator('#apn-ok').textContent()), `le bouton répète le prix (« ${(await p.locator('#apn-ok').textContent()).trim()} »)`);
await p.locator('#apn-ok').tap(); await p.waitForTimeout(1500);
const c = await p.evaluate(() => { const a = DB.articles.find(x => x.nm === 'Sprite 1 L'); const s = document.getElementById('snack-ph');
  return a ? { px: a.px, stk: getStk(a), img: !!a.img, tuile: !!document.getElementById('pc-' + a.id), ferme: !document.getElementById('ov-apn').classList.contains('show'),
    snack: !!(s && s.classList.contains('show') && /Mal cadrée/.test(s.textContent)) } : null; });
t(c && c.px === 700 && c.stk === 12 && c.img && c.tuile && c.ferme, `« Sprite 1 L » est sur l'étagère : 700 F, 12 en stock, avec sa photo (${JSON.stringify(c)})`);
t(c && !c.snack, 'pas de « Mal cadrée ? » : il vient de voir son cadrage');

// 5. L'appareil aussi là où il cherche, dans le catalogue.
await p.evaluate(() => ouvrirChoixArticles()); await p.waitForTimeout(400);
t(await p.evaluate(() => !!document.querySelector('#ov-choixart.show #cha-photo')), 'dans « Ajouter des articles », l\'appareil photo est à côté de la recherche');
await p.evaluate(() => closeSheet('ov-choixart'));

// 6. Un produit de la couleur de la table : on ne le découpe pas, on l'encadre.
const m = await p.evaluate(async (b64) => { const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode(); return _dtCalculer(im).mode; }, BOIS.toString('base64'));
t(m === 'c', `un article de la couleur de la table n'est pas découpé au hasard : il est encadré (${m})`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();

// 7. Un vendeur sans le droit « articles » ne voit pas l'entrée.
{
  const { ctx, p } = await ouvrirCaisse(b, port, nouvelleBoutique({}), { vendeur: 'Ibrahim', tactile: true });
  const v = await p.evaluate(() => { try { return _ajrChoix().map(x => x.k); } catch (e) { return ['?']; } });
  t(!v.includes('aph'), `le vendeur sans droit sur les articles ne voit pas « Un article en photo » (${v.join(', ')})`);
  await ctx.close();
}
await b.close(); s.close(); fin();
