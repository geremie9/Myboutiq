// t234 — « LE CODE RAPIDE À 4 CHIFFRES : LE PROPOSER AUX UTILISATEURS » (23.15).
// Il existait depuis la 22.79, au fond des Réglages : personne n'allait le
// chercher. L'app le propose maintenant juste après une ouverture avec le
// PIN à 6 chiffres — sans le lui redemander — puis la porte s'ouvre en 4.
// 23.47 — « je n'aime pas voir les 6 chiffres… il faut au moins 4 seulement. »
// Il ne l'avait pas posé : la proposition était une fiche de trois champs au
// clavier d'Android. C'est maintenant un pavé (4 ronds, « encore une fois »),
// et la porte montre 4 ronds dès qu'il est posé.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { nouvelleBoutique } from './caisse.mjs';
import { fauxSupaScript } from './faux-supa.mjs';
const { t, fin } = compteur('t234');
const { s, port } = await serveur();
const b = await chromium.launch();
const DF = 'df1b5116-4d51-44d4-b973-bd31becabb3d', G = '64972 08757', MAIL = 'owner-237689335389@myboutiq.app';
const gIci = () => { const d = nouvelleBoutique(); d.cfg.nom = 'G'; d.cfg.code = G; d.cfg.ownerId = DF; d.cfg.pin = '123456'; d.cfg.tel = '+237689335389';
  d.cfg.ownerEmail = MAIL; d.boutiques = [{ id: 1, nm: 'G', code: G, actif: true }]; return d; };
const PATRON = { role: 'patron', tel: '+237689335389', email: MAIL, code: G, boutique: 'G', boutiques: [{ code: G, nom: 'G' }] };
const ROWS = [{ id: 'r0', code: G, nom: 'G', owner_id: DF, actif: true, plan: 'gratuit', updated_at: new Date().toISOString(), data: gIci(), pin_vendeur_clair: null }];
async function porte(ctx, garder) {
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  if (!garder) {
    await p.goto(`http://127.0.0.1:${port}/politique-confidentialite.html`);
    await p.evaluate(([db, en]) => { localStorage.clear(); localStorage.setItem('mb_clavier_vu', '1');
      localStorage.setItem('myboutiq_v6', JSON.stringify(db)); localStorage.setItem('myboutiq_entree', JSON.stringify(en)); }, [gIci(), PATRON]);
  }
  await p.goto(`http://127.0.0.1:${port}/index.html`);
  await p.evaluate(([rows, MAIL, DF]) => { __fs.boutiques = rows; rows.forEach(r => { __fs.pins[r.code] = '123456'; }); __fs.comptes[MAIL] = { id: DF, pin: '123456' }; }, [ROWS, MAIL, DF]);
  await p.waitForTimeout(1400);
  return { p, errs };
}
const contexte = async () => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', hasTouch: true, isMobile: true }); await c.addInitScript(fauxSupaScript()); return c; };
const tape = async (p, touches) => { for (const k of touches) { await p.locator(`#er-clavier .kp[data-k="${k}"]`).click(); await p.waitForTimeout(80); } };
const ecran = p => p.evaluate(() => (document.querySelector('.scr.on') || {}).id);
const feuille = p => p.evaluate(() => { const o = document.getElementById('ov-co4'); return { ouverte: o.classList.contains('show'), titre: (o.querySelector('.c4-tit') || {}).textContent || '', ronds: o.querySelectorAll('.c4-pts i').length, pleins: o.querySelectorAll('.c4-pts i.on').length,
  champs: o.querySelectorAll('input').length, fiche: document.getElementById('ov-codeouv').classList.contains('show') }; });
const pave = async (p, chiffres) => { for (const k of chiffres) { await p.locator(`#co4 .c4-pave button:text-is("${k}")`).tap(); await p.waitForTimeout(90); } await p.waitForTimeout(350); };
const dits = p => p.evaluate(() => (window.__dits || []).join(' | '));
const ecouter = p => p.evaluate(() => { window.__dits = []; const st = showToast; showToast = function (m) { window.__dits.push(String(m)); return st.apply(this, arguments); }; });

// ── 1) IL ENTRE AVEC SES 6 CHIFFRES : L'APP LUI PROPOSE LES 4, SUR UN PAVÉ ──
{
  const ctx = await contexte();
  let { p, errs } = await porte(ctx);
  t(await p.evaluate(() => document.querySelectorAll('#er-points i').length) === 6, 'sans code court, la porte montre 6 ronds');
  await tape(p, ['1', '2', '3', '4', '5', '6']); await p.waitForTimeout(700);
  t(await ecran(p) === 's-caisse', 'six chiffres : la caisse s\'ouvre');
  t(!(await feuille(p)).ouverte, 'la proposition attend un peu : elle ne coupe pas l\'ouverture');
  await p.waitForTimeout(1800);
  let f = await feuille(p);
  t(f.ouverte && !f.fiche && f.champs === 0 && f.ronds === 4 && /Choisis 4 chiffres/.test(f.titre), `puis elle arrive : un pavé et 4 ronds, aucun champ à remplir, sans redemander le PIN (« ${f.titre} »)`);
  await ecouter(p);
  // Des chiffres de son PIN : refusés, et il le dit.
  await pave(p, '2345');
  f = await feuille(p);
  t(f.pleins === 0 && /Choisis/.test(f.titre) && /chiffres de ton PIN/.test(await dits(p)), 'quatre chiffres tirés de son PIN sont refusés, avec la raison');
  await pave(p, '5829');
  f = await feuille(p);
  t(/Encore une fois/.test(f.titre) && f.pleins === 0, 'quatre chiffres : « Encore une fois »');
  // Il se trompe la seconde fois : on recommence, rien n'est posé.
  await pave(p, '5820');
  f = await feuille(p);
  t(/Choisis/.test(f.titre) && !(await p.evaluate(() => codeOuvertureActif())), 'pas les mêmes : on recommence, rien n\'est posé');
  await pave(p, '5829'); await pave(p, '5829'); await p.waitForTimeout(1500);
  t(await p.evaluate(() => codeOuvertureActif()) && !(await feuille(p)).ouverte, 'deux fois les mêmes quatre chiffres : c\'est posé — 8 touches, aucun clavier');
  const garde = await p.evaluate(() => localStorage.getItem('mb_code_ouv'));
  t(garde && !/5829/.test(garde), 'gardé haché sur le téléphone, jamais en clair');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  // Il revient : la porte montre 4 ronds, quatre chiffres ouvrent, rien n'est reproposé.
  await p.close();
  ({ p, errs } = await porte(ctx, true));
  const pt = await p.evaluate(() => ({ n: document.querySelectorAll('#er-points i').length, sous: document.getElementById('er-sous').textContent }));
  t(pt.n === 4 && /tes 4 chiffres/.test(pt.sous) && !/6 chiffres/.test(pt.sous), `la porte ne montre plus que 4 ronds : « ${pt.sous} »`);
  await tape(p, ['5', '8', '2', '9']); await p.waitForTimeout(3500);
  t(await ecran(p) === 's-caisse' && !(await feuille(p)).ouverte, 'quatre chiffres ouvrent la caisse, et rien n\'est reproposé');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  // Son PIN à 6 chiffres ouvre toujours : impossible de s'enfermer dehors.
  await p.close();
  ({ p, errs } = await porte(ctx, true));
  await tape(p, ['1', '2', '3']); await p.waitForTimeout(150);
  await tape(p, ['4', '5', '6']); await p.waitForTimeout(3500);
  t(await ecran(p) === 's-caisse', 'son PIN à 6 chiffres ouvre toujours (les ronds s\'allongent)');
  await ctx.close();
}
// ── 2) « NE PLUS ME PROPOSER » ─────────────────────────────────────────
{
  const ctx = await contexte();
  let { p, errs } = await porte(ctx);
  // Il avait refusé l'ANCIENNE fiche : le pavé lui est quand même proposé une fois.
  await p.evaluate(() => localStorage.setItem('mb_co_prop', JSON.stringify({ non: true, n: 3, t: 1 })));
  await tape(p, ['1', '2', '3', '4', '5', '6']); await p.waitForTimeout(2800);
  t((await feuille(p)).ouverte, 'il avait refusé l\'ancienne fiche : le pavé lui est proposé quand même');
  await p.locator('#c4-jamais').tap(); await p.waitForTimeout(300);
  const o = await p.evaluate(() => JSON.parse(localStorage.getItem('mb_co_prop') || '{}'));
  t(o.non2 === true && !(await feuille(p)).ouverte, '« Ne plus me proposer » : retenu');
  await p.close();
  ({ p, errs } = await porte(ctx, true));
  await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('mb_co_prop')); o.t = 1; localStorage.setItem('mb_co_prop', JSON.stringify(o)); });
  await tape(p, ['1', '2', '3', '4', '5', '6']); await p.waitForTimeout(2800);
  t(await ecran(p) === 's-caisse' && !(await feuille(p)).ouverte, 'il rentre au PIN : plus jamais proposé');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 3) « PLUS TARD » : PAS DEUX FOIS LE MÊME JOUR ─────────────────────────
{
  const ctx = await contexte();
  let { p, errs } = await porte(ctx);
  await tape(p, ['1', '2', '3', '4', '5', '6']); await p.waitForTimeout(2800);
  await p.locator('#c4-tard').tap(); await p.waitForTimeout(300);
  await p.close();
  ({ p, errs } = await porte(ctx, true));
  await tape(p, ['1', '2', '3', '4', '5', '6']); await p.waitForTimeout(2800);
  t(await ecran(p) === 's-caisse' && !(await feuille(p)).ouverte, '« Plus tard », puis il revient le jour même : on ne l\'embête pas');
  // Le lendemain, elle revient. Elle ne vaut que deux minutes sans PIN.
  await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('mb_co_prop')); o.t = Date.now() - 864e5; localStorage.setItem('mb_co_prop', JSON.stringify(o)); _proposerCodeCourt(); });
  await p.waitForTimeout(1800);
  t((await feuille(p)).ouverte, 'le lendemain, elle revient');
  await ecouter(p);
  await p.evaluate(() => { _coProposeT = Date.now() - 3 * 60e3; });
  await pave(p, '5829'); await pave(p, '5829'); await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({ actif: codeOuvertureActif(), ouverte: document.getElementById('ov-co4').classList.contains('show') }));
  t(!r.actif && !r.ouverte && /Trop de temps/.test(await dits(p)), 'laissée ouverte plus de deux minutes : rien n\'est posé sans son PIN');
  // Réglages garde la fiche complète, avec le PIN.
  await p.evaluate(() => ouvrirCodeOuverture()); await p.waitForTimeout(300);
  t(await p.evaluate(() => document.getElementById('ov-codeouv').classList.contains('show') && document.getElementById('co-pin').parentNode.style.display !== 'none'), 'dans Réglages, la fiche demande toujours le PIN');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
