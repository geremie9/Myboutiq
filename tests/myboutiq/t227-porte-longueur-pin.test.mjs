// t227 — « ÇA DEMANDE 4 CODES… MAIS L'ACCÈS EST BLOQUÉ » (23.12).
// Le patron, après la 23.11 : la porte lui montrait QUATRE ronds. Son PIN
// en a six (imposé à l'inscription). Il tapait quatre chiffres, touchait ✓,
// et lisait « PIN incorrect » — un essai compté contre lui, et l'impression
// d'être enfermé dehors. Rejoué ici au clavier de l'app, comme sur son
// téléphone, contre un faux serveur.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { nouvelleBoutique } from './caisse.mjs';
import { fauxSupaScript } from './faux-supa.mjs';
const { t, fin } = compteur('t227');
const { s, port } = await serveur();
const b = await chromium.launch();
const DF = 'df1b5116-4d51-44d4-b973-bd31becabb3d', G = '64972 08757', MAIL = 'owner-237689335389@myboutiq.app';
const shop = (nom, code) => { const d = nouvelleBoutique(); d.cfg.nom = nom; d.cfg.code = code; d.cfg.ownerId = DF; delete d.cfg.pin; d.boutiques = [{ id: 1, nm: nom, code, actif: true }]; return d; };
const ROWS = [['G', G], ['ETS KODJI', '90896 09298']].map(([n, c], i) => ({ id: 'r' + i, code: c, nom: n, owner_id: DF, actif: true, plan: 'gratuit',
  updated_at: new Date().toISOString(), data: shop(n, c), pin_vendeur_clair: null }));
const gIci = pin => { const d = shop('G', G); d.cfg.pin = pin; d.cfg.tel = '+237689335389'; d.cfg.ownerEmail = MAIL; return d; };
const PATRON = { role: 'patron', tel: '+237689335389', email: MAIL, code: G, boutique: 'G', boutiques: [{ code: G, nom: 'G' }] };

async function porte(db, entree, pinServeur = '123456') {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', hasTouch: true, isMobile: true });
  await ctx.addInitScript(fauxSupaScript());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/politique-confidentialite.html`);
  await p.evaluate(([db, en]) => { localStorage.clear(); localStorage.setItem('mb_clavier_vu', '1');
    localStorage.setItem('myboutiq_v6', JSON.stringify(db)); localStorage.setItem('myboutiq_entree', JSON.stringify(en)); }, [db, entree]);
  await p.goto(`http://127.0.0.1:${port}/index.html`);
  await p.evaluate(([rows, MAIL, DF, pin]) => { __fs.boutiques = rows; rows.forEach(r => { __fs.pins[r.code] = pin; }); __fs.comptes[MAIL] = { id: DF, pin };
    window.__t = []; const st = window.showToast; window.showToast = function (m) { __t.push(String(m)); try { return st.apply(this, arguments); } catch (e) {} }; }, [ROWS, MAIL, DF, pinServeur]);
  await p.waitForTimeout(1400);
  return { ctx, p, errs };
}
const tape = async (p, touches) => { for (const k of touches) { const l = p.locator(`#er-clavier .kp[data-k="${k}"]`); if (!(await l.isVisible())) break; await l.click(); await p.waitForTimeout(100); } };
const etat = p => p.evaluate(() => ({ ecran: (document.querySelector('.scr.on') || {}).id, pin: document.getElementById('er-pin').value,
  n: document.querySelectorAll('#er-points i').length, on: document.querySelectorAll('#er-points i.on').length,
  so: document.getElementById('er-sous').textContent, toasts: (window.__t || []).join(' | '),
  essais: (window.__fs && __fs.appels || []).filter(a => a.quoi === 'connexion').length }));

// ── 1) LE PATRON, SON PIN À 6 CHIFFRES ─────────────────────────────────
{
  const { ctx, p, errs } = await porte(gIci('123456'), PATRON);
  let e = await etat(p);
  t(e.n === 6 && e.on === 0, `la porte montre 6 ronds — la longueur de son PIN (${e.on}/${e.n})`);
  t(/PIN à 6 chiffres/.test(e.so), `et le dit en toutes lettres (« ${e.so} »)`);
  await tape(p, ['1', '2', '3', '4', 'ok']); await p.waitForTimeout(600);
  e = await etat(p);
  t(e.ecran === 's-login' && /il en manque 2/.test(e.toasts) && !/incorrect/i.test(e.toasts),
    `4 chiffres puis ✓ : « il en manque 2 », jamais « PIN incorrect » (« ${e.toasts} »)`);
  t(e.pin === '1234' && e.on === 4, `ses 4 chiffres restent, il complète (${e.pin}, ${e.on}/${e.n})`);
  t(e.essais === 0, `et rien n'est parti au serveur comme mauvais essai (${e.essais})`);
  await tape(p, ['5', '6']); await p.waitForTimeout(1500);
  e = await etat(p);
  t(e.ecran === 's-caisse', `les deux derniers chiffres : la caisse s'ouvre (${e.ecran})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 2) UN TRÈS VIEUX COMPTE, PIN À 4 CHIFFRES GARDÉ ICI ──────────────────
{
  const { ctx, p, errs } = await porte(gIci('1234'), PATRON, '1234');
  let e = await etat(p);
  t(e.n === 4 && /PIN à 4 chiffres/.test(e.so), `son PIN en a 4 : 4 ronds (${e.n}, « ${e.so} »)`);
  await tape(p, ['1', '2', '3', '4']); await p.waitForTimeout(1500);
  e = await etat(p);
  t(e.ecran === 's-caisse', `4 chiffres suffisent : la caisse s'ouvre (${e.ecran})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 3) LE VENDEUR, PIN ÉQUIPE À 4 CHIFFRES ──────────────────────────────
{
  const d = gIci('123456'); d.cfg.pinVendeur = '4321';
  const { ctx, p, errs } = await porte(d, { role: 'vendeur', code: G, nom: 'Ibrahim', boutique: 'G' });
  const e = await etat(p);
  t(e.n === 4 && /PIN équipe/.test(e.so), `le vendeur voit 4 ronds, son PIN équipe (${e.n}, « ${e.so} »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 4) LE PIN A CHANGÉ SUR UN AUTRE TÉLÉPHONE : LE SERVEUR TRANCHE ───────
{
  const { ctx, p, errs } = await porte(gIci('000000'), Object.assign({}, PATRON, { boutiques: ROWS.map(r => ({ code: r.code, nom: r.nom })) }));
  await tape(p, ['1', '2', '3', '4', '5', '6', 'ok']); await p.waitForTimeout(2500);
  const l = await p.evaluate(() => document.querySelectorAll('#er-lst > button').length);
  t(l === 2, `six chiffres justes pour le serveur : la liste de ses boutiques (${l})`);
  if (l) { await p.locator('#er-lst > button').first().click(); await p.waitForTimeout(2500); }
  t((await etat(p)).ecran === 's-caisse', 'il touche sa boutique : la caisse s\'ouvre');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
