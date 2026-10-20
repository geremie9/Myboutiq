// t247 — « Continue de faciliter la tâche aux utilisateurs, surtout leur
// premier contact. » (23.28)
//  · depuis le site, « Créer ma boutique » mène DROIT à « Ta boutique »
//    (avant : un second « Créer ma boutique », « Commencer l'inscription »,
//    puis un écran de langue déjà réglé et son « Continuer ») ;
//  · la langue se change d'un toucher sur cet écran ; la marque remplace
//    l'emoji ;
//  · la caisse neuve ne crie pas « Pas de liaison avec le serveur » pendant
//    les secondes où la bibliothèque du serveur arrive encore.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
const { t, fin } = compteur('t247');
const { s, port } = await serveur();
const b = await chromium.launch();
const vu = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);

// ── 1. Du site au premier champ : un toucher ──
{
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, locale: 'fr-FR', timezoneId: 'Africa/Douala', hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/?site`); await p.waitForTimeout(1500);
  await p.locator('#vt-b2').tap(); await p.waitForTimeout(600);
  const e = await p.evaluate(() => ({ onb: document.getElementById('s-onboard').classList.contains('on'), s5: document.getElementById('obs5').classList.contains('on') }));
  t(e.onb && e.s5 && await vu(p, '#ob-tel') && await vu(p, '#ob-pin') && await vu(p, '#ob5-btn'),
    '« Créer ma boutique » sur le site : on arrive directement sur « Ta boutique » (numéro, PIN, Continuer)');
  t(await p.evaluate(() => !!document.querySelector('#s-onboard .ob-logo svg') && !/🏪/.test(document.querySelector('#s-onboard .ob-logo').textContent)),
    'la marque (l’auvent et le Q) remplace l’emoji 🏪');
  t(/English/.test(await p.locator('#ob5-langue').innerText()), 'la langue se change sur cet écran (« English »)');
  await p.locator('#ob5-langue').tap(); await p.waitForTimeout(300);
  const en = await p.evaluate(() => ({ h: document.getElementById('ob5-h').textContent, b: document.getElementById('ob5-langue').textContent, l: lang }));
  t(/Your shop/.test(en.h) && /Français/.test(en.b) && en.l === 'en', `un toucher : l’écran passe en anglais (« ${en.h.trim()} »), et le bouton propose « Français »`);
  await p.locator('#ob5-langue').tap(); await p.waitForTimeout(300);
  t(await p.evaluate(() => /Ta boutique/.test(document.getElementById('ob5-h').textContent) && lang === 'fr'), 'et revient en français');
  await p.locator('#ob-tel').fill('677123456'); await p.locator('#ob-pin').fill('123456');
  await p.locator('#ob5-btn').tap();
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(250); if (await p.evaluate(() => document.getElementById('s-caisse').classList.contains('on'))) break; }
  t(await p.evaluate(() => document.getElementById('s-caisse').classList.contains('on') && DB && DB.cfg && /677123456/.test(DB.cfg.tel || '')),
    'trois touchers et deux champs plus tard, la caisse est ouverte, sans réseau');
  t(errs.length === 0, 'aucune erreur JS (inscription)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// La porte (« J'ai déjà une boutique ») ne change pas.
{
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, locale: 'fr-FR', hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/?site`); await p.waitForTimeout(1500);
  await p.locator('#vt-b3').tap(); await p.waitForTimeout(500);
  t(await p.evaluate(() => document.getElementById('s-login').classList.contains('on')) && await vu(p, '#p-tel'), '« J’ai déjà une boutique » ouvre toujours la porte (numéro et PIN)');
  await ctx.close();
}

// ── 2. Pas d'alarme pendant que l'app se prépare ──
{
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, locale: 'fr-FR', hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/?site`); await p.waitForTimeout(1500);
  const bar = () => p.evaluate(() => { const b = document.getElementById('conn-bar'); return { vu: getComputedStyle(b).display !== 'none', txt: b.textContent.trim() }; });
  // Le réseau est là, la bibliothèque du serveur pas encore : l'état « srv ».
  await p.evaluate(() => { supa = null; _connEtat = null; _connDebut = Date.now(); majEtatConnexion(); });
  let r = await bar();
  t(!r.vu, 'dans les premières secondes, « Pas de liaison avec le serveur » ne s’affiche pas (la bibliothèque arrive encore)');
  await p.evaluate(() => { _connDebut = Date.now() - CONN_GRACE + 300; majEtatConnexion(); });
  await p.waitForTimeout(700);
  r = await bar();
  t(r.vu && /Pas de liaison avec le serveur/.test(r.txt), 'passé 15 s sans serveur, elle s’affiche : là, elle dit vrai');
  // Sans réseau du tout : on le dit tout de suite.
  await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); _connEtat = null; _connDebut = Date.now(); majEtatConnexion(); });
  r = await bar();
  t(r.vu && /Hors ligne/.test(r.txt), 'sans réseau du tout, « Hors ligne — tes ventes sont gardées ici » s’affiche aussitôt');
  t(errs.length === 0, 'aucune erreur JS (bandeau de liaison)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
