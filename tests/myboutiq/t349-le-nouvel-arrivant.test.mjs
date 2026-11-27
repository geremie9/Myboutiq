// t349 — LE NOUVEL ARRIVANT : OUVERT D'ABORD, LES PRIX PROPOSÉS SUR UN ÉCRAN (24.28).
// Le patron, 27/11, sa boutique « Yana » : « simplifier la tâche au nouvel
// arrivant ; certains ne connaissent pas l'importance du bouton de
// modification en haut ; simplifier le nouvel arrivage si les prix proposés
// ne nous conviennent pas ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t349');
const { s, port } = await serveur();
const b = await chromium.launch();

// ── 1. Une boutique neuve démarre ouverte ; à la 20e vente, l'app la bloque une fois ──
const d = nouvelleBoutique();
d.cfg.venteDeverrouillee = true; d.cfg.verrouAuto = 1;            // ce que la création écrit maintenant
const { p, errs } = await ouvrirCaisse(b, port, d);
t(await p.evaluate(() => String(_finaliserObSuite).indexOf('venteDeverrouillee:true,verrouAuto:1') > 0), `la création d'une boutique l'ouvre aux modifications (verrou des débuts)`);
const crayon = await p.evaluate(() => ({ ouvert: !venteVerrouillee(), crayons: document.querySelectorAll('#pgrid .pedit').length, lab: document.getElementById('btn-verrou').textContent }));
t(crayon.ouvert && crayon.crayons > 0 && /Modifier/.test(crayon.lab), `boutique neuve : le crayon est sur les tuiles (${crayon.crayons}), le bouton dit « ${crayon.lab} »`);
for (let i = 0; i < 19; i++) { await vendre(p, { lignes: [[7, 1]] }); await p.evaluate(() => { try { fermerSucces(); } catch (e) {} }); }
t(await p.evaluate(() => !venteVerrouillee() && DB.cfg.verrouAuto === 1), `19 ventes : toujours ouvert`);
await p.evaluate(() => { window.__toasts = []; });
await vendre(p, { lignes: [[7, 1]] }); await p.evaluate(() => { try { fermerSucces(); } catch (e) {} });
await p.waitForTimeout(1100);
const v20 = await p.evaluate(() => ({ bloque: venteVerrouillee(), auto: DB.cfg.verrouAuto, toast: window.__toasts.find(x => /Bloqué/.test(x)) || '', appel: document.getElementById('btn-verrou').classList.contains('appel'), lab: document.getElementById('btn-verrou').textContent }));
t(v20.bloque && v20.auto === 2 && /20 ventes/.test(v20.toast) && v20.appel, `20e vente : bloqué une fois, le bouton s'anime, et l'app dit pourquoi (« ${v20.toast.slice(0, 70)}… »)`);
// il rouvre lui-même : plus jamais l'app ne décide
await p.evaluate(() => { toggleVerrouVente(); });
await vendre(p, { lignes: [[7, 1]] }); await p.evaluate(() => { try { fermerSucces(); } catch (e) {} });
t(await p.evaluate(() => !venteVerrouillee()), `il rouvre lui-même : l'app ne rebloque pas à sa place`);
const d2 = await p.evaluate(() => { DB.cfg.verrouAuto = 1; DB.cfg.venteDeverrouillee = true; toggleVerrouVente(); toggleVerrouVente(); return DB.cfg.verrouAuto; });
t(d2 === 0, `toucher le bouton pendant les débuts : le verrou automatique s'éteint (${d2})`);

// ── 2. Les prix proposés : un bandeau, un écran ──
await p.evaluate(() => {
  DB.articles.find(x => x.id === 2)._sugg = 1; DB.articles.find(x => x.id === 3)._sugg = 1; DB.articles.find(x => x.id === 3)._suggSrc = 'courant';
  renderProd(DB.articles);
});
const ban = await p.evaluate(() => { const b = document.getElementById('prix-verif-b'); return { vu: getComputedStyle(b).display !== 'none', txt: b.textContent }; });
t(ban.vu && /2 prix proposés/.test(ban.txt), `bandeau sur la caisse : « ${ban.txt} »`);
await p.locator('#prix-verif-b').click(); await p.waitForTimeout(300);
const ecr = await p.evaluate(() => ({ lignes: document.querySelectorAll('#vp-lst .vp-l').length, v: [...document.querySelectorAll('#vp-lst input')].map(x => x.value) }));
t(ecr.lignes === 2 && ecr.v.join(',') === '600,650', `un écran : Riz 600, Savon Azur 650 en grand (${ecr.v.join(', ')})`);
await p.locator('#vp-1').fill('700');
await p.locator('#vp-ok').click(); await p.waitForTimeout(300);
const apres = await p.evaluate(() => { const r = DB.articles.find(x => x.id === 2), a = DB.articles.find(x => x.id === 3); return { r: [r.px, !!r._sugg], a: [a.px, !!a._sugg], ban: getComputedStyle(document.getElementById('prix-verif-b')).display, j: (DB.journal || []).slice(-1)[0] }; });
t(apres.r[0] === 600 && !apres.r[1] && apres.a[0] === 700 && !apres.a[1], `« Tout est bon » : Riz gardé à 600, Savon Azur passé à 700, plus « indicatif » ni l'un ni l'autre`);
t(apres.ban === 'none', `le bandeau disparaît`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
