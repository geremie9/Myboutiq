// t234 — « LE CODE RAPIDE À 4 CHIFFRES : LE PROPOSER AUX UTILISATEURS » (23.15).
// Il existait depuis la 22.79, au fond des Réglages : personne n'allait le
// chercher. L'app le propose maintenant juste après une ouverture avec le
// PIN à 6 chiffres — sans le lui redemander — puis la porte s'ouvre en 4.
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
const feuille = p => p.evaluate(() => { const o = document.getElementById('ov-codeouv'); const pin = document.getElementById('co-pin');
  return { ouverte: o.classList.contains('show'), pinVisible: !!pin && pin.parentNode.style.display !== 'none', note: document.getElementById('co-note').textContent }; });

// ── 1) IL ENTRE AVEC SES 6 CHIFFRES : L'APP LUI PROPOSE LES 4 ─────────────
{
  const ctx = await contexte();
  let { p, errs } = await porte(ctx);
  await tape(p, ['1', '2', '3', '4', '5', '6']); await p.waitForTimeout(1200);
  t(await ecran(p) === 's-caisse', 'six chiffres : la caisse s\'ouvre');
  t(!(await feuille(p)).ouverte, 'la proposition attend un peu : elle ne coupe pas l\'ouverture');
  await p.waitForTimeout(2200);
  let f = await feuille(p);
  t(f.ouverte && !f.pinVisible && /Tu viens de taper ton PIN/.test(f.note), `puis elle arrive, SANS lui redemander son PIN (« ${f.note.slice(0, 60)}… »)`);
  await p.locator('#co-new').fill('5829'); await p.locator('#co-new2').fill('5829');
  await p.locator('#ov-codeouv .bnxt', { hasText: 'Ouvrir avec 4 chiffres' }).click(); await p.waitForTimeout(1500);
  t(await p.evaluate(() => codeOuvertureActif()) && !(await feuille(p)).ouverte, 'deux fois quatre chiffres : c\'est posé');
  const garde = await p.evaluate(() => localStorage.getItem('mb_code_ouv'));
  t(garde && !/5829/.test(garde), 'gardé haché sur le téléphone, jamais en clair');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  // Il revient : quatre chiffres ouvrent, et on ne lui repropose rien.
  await p.close();
  ({ p, errs } = await porte(ctx, true));
  t(/ton code d'ouverture ou ton PIN/.test(await p.evaluate(() => document.getElementById('er-sous').textContent)), 'la porte dit « ton code d\'ouverture ou ton PIN »');
  await tape(p, ['5', '8', '2', '9']); await p.waitForTimeout(3500);
  t(await ecran(p) === 's-caisse' && !(await feuille(p)).ouverte, 'quatre chiffres ouvrent la caisse, et rien n\'est reproposé');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 2) « NE PLUS ME PROPOSER » ─────────────────────────────────────────
{
  const ctx = await contexte();
  let { p, errs } = await porte(ctx);
  await tape(p, ['1', '2', '3', '4', '5', '6']); await p.waitForTimeout(3600);
  t((await feuille(p)).ouverte, 'proposé une première fois');
  await p.locator('#co-jamais').click(); await p.waitForTimeout(300);
  const o = await p.evaluate(() => JSON.parse(localStorage.getItem('mb_co_prop') || '{}'));
  t(o.non === true && !(await feuille(p)).ouverte, `« Ne plus me proposer » : retenu (${JSON.stringify(o)})`);
  await p.close();
  ({ p, errs } = await porte(ctx, true));
  await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('mb_co_prop')); o.t = 1; localStorage.setItem('mb_co_prop', JSON.stringify(o)); });
  await tape(p, ['1', '2', '3', '4', '5', '6']); await p.waitForTimeout(3600);
  t(await ecran(p) === 's-caisse' && !(await feuille(p)).ouverte, 'il rentre au PIN : plus jamais proposé');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 3) « PLUS TARD » : PAS AVANT TROIS JOURS ──────────────────────────────
{
  const ctx = await contexte();
  let { p, errs } = await porte(ctx);
  await tape(p, ['1', '2', '3', '4', '5', '6']); await p.waitForTimeout(3600);
  await p.locator('#co-tard').click(); await p.waitForTimeout(300);
  await p.close();
  ({ p, errs } = await porte(ctx, true));
  await tape(p, ['1', '2', '3', '4', '5', '6']); await p.waitForTimeout(3600);
  t(await ecran(p) === 's-caisse' && !(await feuille(p)).ouverte, '« Plus tard », puis il revient le jour même : on ne l\'embête pas');
  // Trois jours après, et la proposition revient. Elle ne dure que deux minutes sans PIN.
  await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('mb_co_prop')); o.t = Date.now() - 4 * 864e5; localStorage.setItem('mb_co_prop', JSON.stringify(o)); _proposerCodeCourt(); });
  await p.waitForTimeout(2600);
  t((await feuille(p)).ouverte, 'trois jours plus tard, elle revient');
  await p.evaluate(() => { _coProposeT = Date.now() - 3 * 60e3; });
  await p.locator('#co-new').fill('5829'); await p.locator('#co-new2').fill('5829');
  await p.evaluate(() => { window.__t = []; const st = showToast; showToast = m => __t.push(String(m)); validerCodeOuverture().then(() => { showToast = st; }); });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({ actif: codeOuvertureActif(), dit: __t.join(' '), pin: document.getElementById('co-pin').parentNode.style.display }));
  t(!r.actif && /Retape ton PIN/.test(r.dit) && r.pin !== 'none', `laissée ouverte plus de deux minutes : il doit retaper son PIN (« ${r.dit} »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
