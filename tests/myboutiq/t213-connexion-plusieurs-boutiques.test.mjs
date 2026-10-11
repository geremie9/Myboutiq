// t213 — LA PORTE D'UN PATRON QUI A PLUSIEURS BOUTIQUES (23.00).
// « J'ai créé une nouvelle boutique… et puis je n'arrive pas à me connecter
// sur mes boutiques test. » Mesuré le 10/10 sur son téléphone (Orange,
// Garoua) : seize connexions acceptées en une minute et demie, aucune
// boutique ouverte. Trois causes, toutes rejouées ici contre un faux
// serveur (faux-supa.mjs) au débit d'un réseau lent :
//   1. la liste de ses boutiques téléchargeait leurs DONNÉES entières
//      (660 Ko) — douze secondes sans que rien ne bouge, et chaque nouvel
//      appui sur « Connexion » relançait le tout ;
//   2. la porte rapide retenait le numéro de sa NOUVELLE boutique sans
//      l'afficher : son PIN ouvrait celle-là d'office ;
//   3. « Connexion » touché pendant que l'app se lisait : « loginP is not
//      defined », le geste perdu.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, serveur, compteur, couperInternet, RACINE } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
import { fauxSupaScript } from './faux-supa.mjs';
const { t, fin } = compteur('t213');
const { s, port } = await serveur();
const b = await chromium.launch();

// Une VRAIE vente, faite par la caisse : c'est elle qu'on recopie pour
// donner aux boutiques du faux serveur le poids des vraies.
const { ctx: c0, p: p0 } = await ouvrirCaisse(b, port, nouvelleBoutique());
await vendre(p0, { lignes: [[2, 2], [3, 1]] });
const MODELE = await p0.evaluate(() => JSON.parse(JSON.stringify(DB.ventes[0])));
await c0.close();

const DF = 'df1b5116-4d51-44d4-b973-bd31becabb3d', YOU = '35c8f103-3906-4965-bd8a-3beb26c614cd';
const MAIL_DF = 'owner-237689335389@myboutiq.app', MAIL_YOU = 'owner-237699138770@myboutiq.app';
const G = '64972 08757', ETS_YOU = '84117 28737';
// ⚠️ DONNÉES ANCIENNES SIMULÉES : les ventes sont des copies d'une vraie
// vente (ids et heures changés). On ne teste pas la caisse ici, mais ce
// que la porte télécharge — il faut donc des boutiques qui pèsent.
function boutique(nom, code, owner, nbV, nbA) {
  const d = nouvelleBoutique();
  d.cfg.nom = nom; d.cfg.code = code; d.cfg.ownerId = owner; delete d.cfg.pin;
  d.boutiques = [{ id: 1, nm: nom, code, secteur: 'boutique', actif: true, ventes: 0 }];
  while (d.articles.length < nbA) d.articles.push(Object.assign({}, d.articles[1], { id: d.articles.length + 10, nm: 'Article ' + d.articles.length }));
  const t0 = Date.now() - 30 * 864e5;
  for (let i = 0; i < nbV; i++) { const v = JSON.parse(JSON.stringify(MODELE)); v.id = 'devX_' + (t0 + i * 60000) + '_' + i; v.ts = t0 + i * 60000; d.ventes.push(v); }
  return d;
}
// Son compte de test tel qu'il est en base : six boutiques actives (dont
// trois homonymes), une désactivée — plus une au nom piégé, écrit par
// quelqu'un d'autre que lui.
const PIEGE = '<img src=x onerror="window.__xss=1">Piège';
function rangees() {
  return [
    ['Ets you', ETS_YOU, YOU, 0, 3, true],
    ['G', G, DF, 496, 21, true],
    ['ETS KODJI', '90896 09298', DF, 196, 28, true],
    ['Gggg', '54570 98819', DF, 1, 31, true],
    ['Gggg', '82362 74552', DF, 3, 31, true],
    ['ETS KODJI', '85492 01759', DF, 170, 31, true],
    ['Teko center', '72942 42563', DF, 0, 11, true],
    [PIEGE, '11111 22222', DF, 0, 2, true],
    ['ETS KODJI', '28456 27351', DF, 218, 16, false],
  ].map(([nom, code, owner, nbV, nbA, actif], i) => ({ id: 'row' + i, code, nom, owner_id: owner, actif, plan: 'gratuit', abonne_jusqu: null,
    updated_at: new Date(Date.now() - i * 3600e3).toISOString(), data: boutique(nom, code, owner, nbV, nbA), pin_vendeur_clair: null }));
}
const ROWS = rangees();
const TAILLE_G = JSON.stringify(ROWS[1].data).length;
const TOUT_DF = ROWS.filter(r => r.owner_id === DF).reduce((n, r) => n + JSON.stringify(r.data).length, 0);

// Le téléphone : sa mémoire (boutique, porte retenue), puis l'app, branchée
// sur le faux serveur. `url` permet de passer par un serveur plus lent.
async function telephone({ db = null, entree = null, debit = 0, rows = ROWS, comptes = null, url = null, portPage = port } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR', timezoneId: 'Africa/Douala' });
  await ctx.addInitScript(fauxSupaScript());
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, portPage);
  await p.goto(`http://127.0.0.1:${portPage}/politique-confidentialite.html`);
  await p.evaluate(([db, en]) => { localStorage.clear(); if (db) localStorage.setItem('myboutiq_v6', JSON.stringify(db)); if (en) localStorage.setItem('myboutiq_entree', JSON.stringify(en)); }, [db, entree]);
  const remplir = () => p.evaluate(([rows, debit, comptes]) => {
    __fs.boutiques = rows; rows.forEach(r => { __fs.pins[r.code] = '123456'; });
    Object.assign(__fs.comptes, comptes || {
      'owner-237689335389@myboutiq.app': { id: 'df1b5116-4d51-44d4-b973-bd31becabb3d', pin: '123456' },
      'owner-237699138770@myboutiq.app': { id: '35c8f103-3906-4965-bd8a-3beb26c614cd', pin: '123456' } });
    __fs.debit = debit; __fs.latence = 150;
    window.__toasts = window.__toasts || [];
  }, [rows, debit, comptes]);
  if (url) { await p.goto(url, { waitUntil: 'commit' }); await p.waitForFunction(() => !!window.__fs); await remplir(); }
  else { await p.goto(`http://127.0.0.1:${portPage}/index.html`); await remplir(); await p.waitForTimeout(1200); }
  return { ctx, p, errs };
}
const ecran = p => p.evaluate(() => (document.querySelector('.scr.on') || {}).id);
const octets = p => p.evaluate(() => __fs.appels.reduce((n, a) => n + a.octets, 0));
const connexions = p => p.evaluate(() => __fs.appels.filter(a => a.quoi === 'connexion').length);
const ko = n => Math.round(n / 1024) + ' Ko';

const ETS_YOU_ICI = () => { const d = JSON.parse(JSON.stringify(ROWS[0].data)); d.cfg.pin = '123456'; d.cfg.tel = '+237699138770'; d.cfg.ownerEmail = MAIL_YOU; return d; };

// ── 1) LE FORMULAIRE, SUR UN RÉSEAU LENT (50 Ko/s) ─────────────────────
// Ets you est sur le téléphone ; il a touché « Changer de compte » et tape
// le numéro de son compte de test.
{
  const { ctx, p, errs } = await telephone({ db: ETS_YOU_ICI(), debit: 50000 });
  await p.locator('#p-tel').fill('689335389');
  await p.locator('#p-pin').fill('123456');
  const t0 = Date.now();
  await p.locator('#btn-lp').click();
  await p.waitForTimeout(150);
  const bt = await p.evaluate(() => { const x = document.getElementById('btn-lp'); return { txt: x.textContent, dis: x.disabled }; });
  t(/Connexion…/.test(bt.txt) && bt.dis, `pendant le travail, le bouton le dit et ne se laisse pas retoucher (« ${bt.txt} »)`);
  await p.evaluate(() => { window.__toasts = []; const st = window.showToast; window.showToast = function (m) { window.__toasts.push(String(m)); try { return st.apply(this, arguments); } catch (e) {} }; loginP(); });
  await p.waitForFunction(() => !!document.querySelector('#ov-choixb.show'), null, { timeout: 30000 });
  const dt = (Date.now() - t0) / 1000, avant = await octets(p);
  t(dt < 5, `la liste de ses boutiques arrive en ${dt.toFixed(1)} s (avant : ~14 s à ce débit)`);
  t(avant < 10 * 1024, `et coûte ${ko(avant)} — plus les ${ko(TOUT_DF)} de données de toutes ses boutiques`);
  t(await connexions(p) === 1, `un second appui ne relance pas une seconde connexion (${await connexions(p)})`);
  t((await p.evaluate(() => __toasts.join(' / '))).match(/en cours/), 'et il est prévenu que ça travaille');
  const l = await p.evaluate(() => ({ n: document.querySelectorAll('#cb-lst > button').length, img: document.querySelectorAll('#cb-lst img').length, xss: !!window.__xss,
    txt: document.getElementById('cb-lst').innerText, btn: document.getElementById('btn-lp').textContent }));
  t(l.n === 7 && !/28456 27351/.test(l.txt), `les 7 boutiques actives, pas la désactivée (${l.n})`);
  t(l.img === 0 && !l.xss && l.txt.includes('<img'), 'un nom piégé reste du texte dans la liste');
  t(/90896 09298/.test(l.txt) && /85492 01759/.test(l.txt), 'les homonymes se distinguent par leur code');
  // Il touche G.
  const avantG = await octets(p);
  await p.evaluate(G => { const x = Array.from(document.querySelectorAll('#cb-lst > button')).find(e => e.innerText.includes(G)); x.click(); }, G);
  await p.waitForTimeout(100);
  const occ = await p.evaluate(G => { const x = Array.from(document.querySelectorAll('#cb-lst > button')).find(e => e.innerText.includes(G)); const f = x.querySelector('.lb-fl'); return { fl: f ? f.textContent : '', dis: x.disabled }; }, G);
  t(occ.fl === '⏳' && occ.dis, 'la ligne touchée montre qu\'elle ouvre, et ne se retouche pas');
  await p.waitForFunction(() => (document.querySelector('.scr.on') || {}).id === 's-caisse', null, { timeout: 30000 });
  const o = await p.evaluate(() => ({ code: DB.cfg.code, nv: DB.ventes.length, mail: DB.cfg.ownerEmail, ov: !!document.querySelector('#ov-choixb.show'),
    en: JSON.parse(localStorage.getItem('myboutiq_entree') || '{}'),
    lourds: __fs.appels.filter(a => a.cols === 'code,data,pin_vendeur_clair').map(a => a.octets) }));
  t(o.code === G && o.nv === 496 && !o.ov, `G s'ouvre, avec ses 496 ventes (${o.code}, ${o.nv})`);
  t(o.lourds.length >= 1 && o.lourds.every(x => x < TAILLE_G * 1.05), `on ne télécharge QUE G : ${o.lourds.map(ko).join(', ')} (G pèse ${ko(TAILLE_G)})`);
  t(o.en.code === G && /689335389/.test(o.en.tel || ''), `la porte retient maintenant G et le 689 33 53 89 (${o.en.code}, ${o.en.tel})`);
  t(o.mail === MAIL_DF, `la boutique sait à quel compte elle appartient (${o.mail})`);
  // ── 2) LA LECTURE DE FOND (avant chaque envoi, à chaque signal) ──────
  await p.evaluate(() => { __fs.debit = 0; __fs.appels = []; });
  await p.evaluate(G => _lireBoutique(G), G);
  const fond = await p.evaluate(() => __fs.appels.filter(a => a.cols === 'code,data,pin_vendeur_clair').map(a => a.octets));
  t(fond.length >= 1 && fond.every(x => x < TAILLE_G * 1.05), `la lecture de fond ne rapatrie que G : ${fond.map(ko).join(', ')} (avant : ${ko(TOUT_DF)}, tout le compte)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) LA PORTE RAPIDE DIT QUEL COMPTE ELLE OUVRE ─────────────────────
{
  const { ctx, p, errs } = await telephone({ db: ETS_YOU_ICI(),
    entree: { role: 'patron', tel: '+237699138770', code: ETS_YOU, boutique: 'Ets you', boutiques: [{ code: ETS_YOU, nom: 'Ets you' }] } });
  const r = await p.evaluate(() => ({ bj: document.getElementById('er-bonjour').textContent, so: document.getElementById('er-sous').textContent,
    chg: document.getElementById('er-chg').textContent, vis: document.getElementById('entree-rapide').style.display }));
  t(r.vis === 'block' && /699 13 87 70/.test(r.bj), `le numéro retenu est affiché (« ${r.bj} »)`);
  t(/Ets you/.test(r.so), `et la boutique que le PIN va ouvrir (« ${r.so} »)`);
  t(/Autre numéro/.test(r.chg), `l'autre compte est à une tape (« ${r.chg} »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 4) LA PORTE RAPIDE, PIN VÉRIFIÉ AU SERVEUR ────────────────────────
// G est sur le téléphone avec une vente pas encore envoyée — mais son PIN
// a changé sur un autre téléphone : il faut passer par le serveur. La porte
// retenait aussi l'adresse de l'AUTRE compte (Ets you).
{
  const g = JSON.parse(JSON.stringify(ROWS[1].data));
  g.cfg.pin = '000000'; g.cfg.tel = '+237689335389'; g.cfg.ownerEmail = MAIL_DF;
  const locale = JSON.parse(JSON.stringify(MODELE)); locale.id = 'telA_' + Date.now() + '_x'; locale.ts = Date.now(); g.ventes.push(locale);
  const rows = rangees();
  const ailleurs = JSON.parse(JSON.stringify(MODELE)); ailleurs.id = 'telB_' + (Date.now() - 5000) + '_y'; ailleurs.ts = Date.now() - 5000;
  rows[1].data.ventes.push(ailleurs); rows[1].data.cfg._rev = 'r1';
  const { ctx, p, errs } = await telephone({ db: g, rows, debit: 200000,
    entree: { role: 'patron', tel: '+237689335389', email: MAIL_YOU, code: G, boutique: 'G', boutiques: [{ code: G, nom: 'G' }] } });
  t(/689 33 53 89/.test(await p.evaluate(() => document.getElementById('er-bonjour').textContent)), 'la porte montre le 689 33 53 89');
  await p.evaluate(() => { document.getElementById('er-pin').value = '123456'; validerEntreeRapide(); validerEntreeRapide(); });
  await p.waitForTimeout(200);
  const so = await p.evaluate(() => document.getElementById('er-sous').textContent);
  t(/^⏳/.test(so), `pendant la vérification, la ligne dit où on en est (« ${so} »)`);
  await p.waitForFunction(() => document.getElementById('er-lst').style.display === 'block' && document.querySelectorAll('#er-lst > button').length > 0, null, { timeout: 20000 });
  const l = await p.evaluate(() => ({ n: document.querySelectorAll('#er-lst > button').length, img: document.querySelectorAll('#er-lst img').length, xss: !!window.__xss, txt: document.getElementById('er-lst').innerText }));
  t(await connexions(p) === 1, `deux ✓ coup sur coup : une seule connexion (${await connexions(p)})`);
  t(l.n === 7 && l.img === 0 && !l.xss && l.txt.includes('<img'), `ses 7 boutiques, le nom piégé reste du texte (${l.n})`);
  const avant = await octets(p);
  t(avant < 10 * 1024, `la liste ne coûte que ${ko(avant)}`);
  await p.evaluate(G => { const x = Array.from(document.querySelectorAll('#er-lst > button')).find(e => e.innerText.includes(G)); x.click(); }, G);
  await p.waitForFunction(() => (document.querySelector('.scr.on') || {}).id === 's-caisse', null, { timeout: 20000 });
  const tOuvert = await octets(p);
  t(tOuvert - avant < 10 * 1024, `G est déjà sur le téléphone : elle s'ouvre sans rien télécharger d'abord (${ko(tOuvert - avant)})`);
  // La synchro rapatrie ce qui a changé ailleurs, et envoie ce qui attendait ici.
  await p.waitForFunction(id => DB.ventes.some(v => v.id === id), ailleurs.id, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const r = await p.evaluate(([a, b]) => ({ ici: DB.ventes.some(v => v.id === a), arrivee: DB.ventes.some(v => v.id === b), mail: DB.cfg.ownerEmail,
    serveur: (__fs.boutiques.find(x => x.code === '64972 08757').data.ventes || []).some(v => v.id === a) }), [locale.id, ailleurs.id]);
  t(r.ici && r.arrivee, `la vente pas encore envoyée est gardée, celle de l'autre téléphone arrive (${JSON.stringify(r)})`);
  t(r.serveur, 'et la vente gardée est bien partie au serveur');
  t(r.mail === MAIL_DF, `l'adresse retenue d'un autre compte n'est pas reprise (${r.mail})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 5) « CONNEXION » TOUCHÉ PENDANT QUE L'APP SE LIT ──────────────────
// Un serveur qui livre la page en deux temps : la porte d'abord, le gros
// script 2,5 s plus tard — c'est ce que vit un téléphone lent.
{
  const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  const coupe = html.indexOf('\n<script>', html.indexOf('id="ov-choixb"'));
  const tete = html.slice(0, coupe);
  t(tete.includes('id="btn-lp"') && !tete.includes('function loginP'), 'la première moitié a le bouton, pas encore l\'app');
  const lent = http.createServer((req, res) => {
    if (req.url.split('?')[0] === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.write(tete); setTimeout(() => res.end(html.slice(coupe)), 2500); return;
    }
    const r = http.request({ host: '127.0.0.1', port, path: req.url, method: req.method, headers: req.headers }, rr => { res.writeHead(rr.statusCode, rr.headers); rr.pipe(res); });
    req.pipe(r);
  });
  await new Promise(ok => lent.listen(0, '127.0.0.1', ok));
  const pl = lent.address().port;
  const { ctx, p, errs } = await telephone({ db: ETS_YOU_ICI(), portPage: pl, url: `http://127.0.0.1:${pl}/index.html` });
  await p.locator('#btn-lp').waitFor({ state: 'visible', timeout: 5000 });
  const tot = await p.evaluate(() => typeof window.loginP);
  await p.locator('#p-tel').fill('689335389');
  await p.locator('#p-pin').fill('123456');
  await p.locator('#btn-lp').click();
  const g1 = await p.evaluate(() => ({ voulu: !!window._loginVoulu, txt: document.getElementById('btn-lp').textContent }));
  t(tot === 'undefined' && g1.voulu && /Connexion…/.test(g1.txt), `touché avant l'app (loginP : ${tot}) : le geste est gardé (« ${g1.txt} »)`);
  await p.waitForFunction(() => !!document.querySelector('#ov-choixb.show'), null, { timeout: 15000 }).catch(() => {});
  const g2 = await p.evaluate(() => ({ ch: !!document.querySelector('#ov-choixb.show'), btn: document.getElementById('btn-lp').textContent }));
  t(g2.ch, 'dès que l\'app est prête, la connexion repart toute seule : la liste de ses boutiques s\'ouvre');
  t(/Connexion 👑/.test(g2.btn), `le bouton reprend son mot (« ${g2.btn} »)`);
  t(await connexions(p) === 1, `une seule connexion (${await connexions(p)})`);
  t(errs.length === 0, 'aucune erreur JS (avant : « loginP is not defined »)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close(); lent.close();
}

// ── 6) SANS SERVEUR : LE PIN NE SUFFIT PAS, IL FAUT AUSSI LE NUMÉRO ───
// Ets you est ici, même PIN que son compte de test. Sans liaison, taper
// l'AUTRE numéro ouvrait Ets you sans un mot.
{
  const { ctx, p, errs } = await telephone({ db: ETS_YOU_ICI() });
  await ctx.setOffline(true);
  await p.evaluate(() => { window.__toasts = []; const st = window.showToast; window.showToast = function (m) { window.__toasts.push(String(m)); try { return st.apply(this, arguments); } catch (e) {} }; });
  await p.locator('#p-tel').fill('689335389'); await p.locator('#p-pin').fill('123456');
  await p.locator('#btn-lp').click(); await p.waitForTimeout(600);
  const a = await p.evaluate(() => ({ ecran: (document.querySelector('.scr.on') || {}).id, toasts: __toasts.join(' / ') }));
  t(a.ecran === 's-login' && /n'ouvre que « Ets you »/.test(a.toasts) && /699 13 87 70/.test(a.toasts), `l'autre numéro n'ouvre pas Ets you, et la porte dit pourquoi (« ${a.toasts} »)`);
  await p.locator('#p-tel').fill('699138770'); await p.locator('#p-pin').fill('123456');
  await p.locator('#btn-lp').click(); await p.waitForTimeout(600);
  t(await ecran(p) === 's-caisse', 'son propre numéro l\'ouvre toujours sans réseau');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 7) LA BOUTIQUE QUE LE SERVEUR N'A JAMAIS VUE ──────────────────────
// Créée sur ce téléphone, jamais envoyée ; son compte existe mais n'a
// aucune boutique en ligne. Le repli « on reprend celle du téléphone »
// lisait une variable qui n'existait pas (`res`) : il s'arrêtait net.
{
  const d = nouvelleBoutique();
  const { ctx, p, errs } = await telephone({ db: d, rows: [], comptes: { 'owner-237677000000@myboutiq.app': { id: 'neuf-0001', pin: '123456' } } });
  await p.locator('#p-tel').fill('677000000');
  await p.locator('#p-pin').fill('123456');
  await p.locator('#btn-lp').click();
  await p.waitForFunction(() => (document.querySelector('.scr.on') || {}).id === 's-caisse', null, { timeout: 15000 }).catch(() => {});
  const r = await p.evaluate(() => ({ ecran: (document.querySelector('.scr.on') || {}).id, owner: DB && DB.cfg && DB.cfg.ownerId, srv: __fs.boutiques.map(x => x.code) }));
  t(r.ecran === 's-caisse' && r.owner === 'neuf-0001', `sa boutique s'ouvre et prend son compte (${r.ecran}, ${r.owner})`);
  t(r.srv.includes('MARI0001'), `et part enfin au serveur (${r.srv.join(', ')})`);
  t(errs.length === 0, 'aucune erreur JS (avant : « res is not defined »)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
