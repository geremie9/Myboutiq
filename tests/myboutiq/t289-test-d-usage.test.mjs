// t289 — TEST D'USAGE À TROIS (23.70). Le patron, le 16/11 : « essaie encore
// une expérience utilisateur de deux ou trois utilisateurs, et sois sincère
// sur ce qui bloquera un non-lettré ». Rejoué de bout en bout :
//  · Mama Bello (ne lit pas) : du site à sa première vente, une dette, le soir ;
//  · Kodji (lit un peu) : le lien d'invitation de son patron.
// Ce qui la bloquait et qu'on pouvait lever tout de suite :
//  · la bulle qui guide la première vente était muette (texte seul) ;
//  · le nom d'un client ne pouvait que s'ÉCRIRE ;
//  · le bouton le plus vif après « Tout mettre dans ma caisse » était « Annuler » ;
//  · les trois chiffres de « Ma journée » n'avaient que leur titre ;
//  · la clôture laissait un champ vide sans dire quoi y mettre ;
//  · la page d'invitation donnait trois consignes contradictoires.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
const { t, fin } = compteur('t289');
const { s, port } = await serveur();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, locale: 'fr-FR', timezoneId: 'Africa/Douala', hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { window.__dits = []; const tente = () => { if (typeof window.parler === 'function' && !window.parler.__espion) { const o = window.parler; window.parler = function (x) { window.__dits.push(String(x)); }; window.parler.__espion = 1; } }; setInterval(tente, 50); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
p.on('dialog', d => d.accept());
await couperInternet(p, port);
await p.goto(`http://127.0.0.1:${port}/?site`); await p.waitForTimeout(1500);
await p.locator('#vt-b2').tap(); await p.waitForTimeout(600);
await p.locator('#ob-tel').fill('699112233'); await p.locator('#ob-pin').fill('246810'); await p.locator('#ob5-btn').tap();
for (let i = 0; i < 24; i++) { await p.waitForTimeout(250); if (await p.evaluate(() => document.getElementById('s-caisse').classList.contains('on'))) break; }
await p.waitForTimeout(2500);
const tap = async (re, sel) => { const id = await p.evaluate(([src, sel]) => { const e = Array.from(document.querySelectorAll(sel)).find(x => x.getBoundingClientRect().width > 0 && new RegExp(src, 'i').test(x.innerText || '')); if (!e) return null; e.id = e.id || 'ux' + Math.random().toString(36).slice(2); return e.id; }, [re.source, sel]); if (id) { await p.locator('#' + id).scrollIntoViewIfNeeded(); await p.locator('#' + id).tap(); await p.waitForTimeout(800); } return !!id; };
await tap(/Boutique · Alimentation/, 'button, [onclick]');
await tap(/Tout mettre dans ma caisse/, 'button, [onclick]'); await p.waitForTimeout(1200);
// 1. Le bouton « Annuler » du lot ne brille plus.
const sn = await p.evaluate(() => { const b = document.getElementById('etg-snack-b'); if (!b) return null; const cs = getComputedStyle(b); return { t: b.textContent, fond: cs.backgroundColor, neutre: b.classList.contains('neutre') }; });
t(sn && /Annuler/.test(sn.t) && sn.neutre && /rgba\(0, 0, 0, 0\)|transparent/.test(sn.fond), `après « Tout mettre dans ma caisse », « Annuler » n'est plus le bouton orange de l'écran (fond ${sn && sn.fond})`);
// 2. La bulle du guide parle.
await p.waitForTimeout(1500);
const dits = await p.evaluate(() => window.__dits.slice());
t(dits.some(x => /Touche un article pour le vendre/.test(x)) && !dits.some(x => /👆/.test(x)), `la bulle « Touche un article pour le vendre » se dit à voix haute, sans l'émoji (${dits.filter(x => /Touche/.test(x)).join(' | ')})`);
// 3. Le nom d'un client se dicte.
await p.evaluate(() => { document.querySelectorAll('.ov.show').forEach(o => o.classList.remove('show')); ouvrirAddCli(); });
await p.waitForTimeout(500);
const mic = await p.evaluate(() => { const b = document.getElementById('mic-clinm'), i = document.getElementById('cli-nm'); if (!b || !i) return null; const r = b.getBoundingClientRect(), q = i.getBoundingClientRect(); return { dans: r.left >= q.left && r.right <= q.right + 1, h: Math.round(r.height), fn: /dicterDans\('cli-nm'/.test(b.getAttribute('onclick') || '') }; });
t(mic && mic.dans && mic.h >= 36 && mic.fn, `« Nouveau client » : un micro dans le champ du nom, comme pour le nom de la boutique (${mic && mic.h} px)`);
// 4. « Ma journée » : chaque chiffre a son dessin.
await p.evaluate(() => { document.querySelectorAll('.ov.show').forEach(o => o.classList.remove('show')); navTo('rapports'); }); await p.waitForTimeout(700);
const ic = await p.evaluate(() => Array.from(document.querySelectorAll('.rpt-ess > div > span')).map(sp => !!sp.querySelector('svg')));
t(ic.length === 3 && ic.every(Boolean), `« Ma journée » : Ventes, Bénéfice, Espèces portent chacun leur dessin (${ic.join(',')})`);
// 5. La clôture dit quoi taper.
await p.evaluate(() => { navTo('caisse'); ouvrirClot(); }); await p.waitForTimeout(600);
const ph = await p.evaluate(() => document.getElementById('inp-compt').placeholder);
t(/Compte tes billets/.test(ph), `la clôture dit quoi mettre dans le champ vide (« ${ph} »)`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();
// 6. Kodji : le lien d'invitation, des consignes qui se suivent.
{ const c2 = await b.newContext({ viewport: { width: 360, height: 740 }, locale: 'fr-FR' }); const q = await c2.newPage(); await couperInternet(q, port);
  await q.goto(`http://127.0.0.1:${port}/join/1234567890?n=Kodji`); await q.waitForTimeout(800);
  const li = await q.evaluate(() => Array.from(document.querySelectorAll('.steps li')).map(x => x.textContent));
  t(li.length === 2 && /bouton orange/.test(li[0]) && /code équipe/.test(li[1]) && !li.some(x => /prénom/.test(x)), `le lien de Kodji : deux consignes qui se suivent (« ${li.join(' » / « ')} »)`);
  await c2.close(); }
await b.close(); s.close();
fin();
