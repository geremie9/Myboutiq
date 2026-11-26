// t344 — D'OÙ VIENT CHAQUE BOUTIQUE (24.23).
// Le patron (26/11) veut un numéro WhatsApp officiel pour faire venir des
// boutiquiers. Pour savoir s'il marche, chaque boutique créée garde la source
// de son premier passage (cfg.origine) : « ?src=wa » sur le lien du numéro,
// une invitation, le site d'où l'on vient, l'app Android. Premier contact
// seulement, et rien qui reconnaisse la personne.
import { chromium, serveur, compteur } from './lib.mjs';
const { t, fin } = compteur('t344');
const { s, port } = await serveur();
const b = await chromium.launch();

const visite = async (chemin, avant) => {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  if (avant) await ctx.addInitScript(avant);
  await p.goto(`http://127.0.0.1:${port}${chemin}`); await p.waitForTimeout(1600);
  return { ctx, p, errs };
};

// 1. Le lien du numéro WhatsApp : /?src=wa
let v = await visite('/index.html?src=wa');
let o = await v.p.evaluate(() => JSON.parse(localStorage.getItem('mb_origine') || 'null'));
t(o && o.s === 'wa', `« /index.html?src=wa » : source notée « ${o && o.s} »`);
// revenir par un autre chemin ne réécrit pas le premier contact
await v.p.goto(`http://127.0.0.1:${port}/index.html?src=google`); await v.p.waitForTimeout(1200);
o = await v.p.evaluate(() => JSON.parse(localStorage.getItem('mb_origine') || 'null'));
t(o && o.s === 'wa', `revenu plus tard par « ?src=google » : toujours « ${o && o.s} » (premier contact)`);
// la boutique créée garde l'origine
const c = await v.p.evaluate(() => { const o = _origineBoutique(); return o; });
t(c.s === 'wa' && c.vu > 0 && c.cree >= c.vu, `ce que la boutique gardera : ${JSON.stringify({ s: c.s, p: c.p })}`);
const src = await v.p.evaluate(() => String(_finaliserObSuite).indexOf('origine:_origineBoutique()') > 0);
t(src, `la création de boutique écrit cfg.origine`);
t(v.errs.length === 0, `aucune erreur JS ${v.errs.slice(0, 2).join(' | ')}`);
await v.ctx.close();

// 2. Une invitation (?code=…)
v = await visite('/index.html?code=MARI0001');
o = await v.p.evaluate(() => JSON.parse(localStorage.getItem('mb_origine') || 'null'));
t(o && o.s === 'invitation', `un lien d'invitation : « ${o && o.s} »`);
await v.ctx.close();

// 3. Arrivé depuis Facebook, puis sans rien
v = await visite('/index.html', `Object.defineProperty(document, 'referrer', { get: () => 'https://m.facebook.com/' });`);
o = await v.p.evaluate(() => JSON.parse(localStorage.getItem('mb_origine') || 'null'));
t(o && o.s === 'facebook', `venu de Facebook : « ${o && o.s} »`);
await v.ctx.close();
v = await visite('/index.html');
o = await v.p.evaluate(() => JSON.parse(localStorage.getItem('mb_origine') || 'null'));
t(o && o.s === 'direct', `adresse tapée : « ${o && o.s} »`);
// une source bizarre n'entre pas telle quelle
await v.ctx.close();
v = await visite('/index.html?src=<script>alert(1)</script>');
o = await v.p.evaluate(() => JSON.parse(localStorage.getItem('mb_origine') || 'null'));
t(o && /^[a-z0-9_-]+$/.test(o.s) && o.s.length <= 20, `« ?src=<script>… » nettoyé : « ${o && o.s} »`);
await v.ctx.close();

await b.close(); s.close();
fin();
