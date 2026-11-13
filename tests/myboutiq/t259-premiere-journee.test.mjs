// t259 — La première journée sans porte (23.41). « Six chiffres du code,
// c'est lent, et l'alternative est cachée. » Le jour de la création, chaque
// retour dans l'app réclamait six chiffres pour une boutique encore vide.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { nouvelleBoutique } from './caisse.mjs';
const { t, fin } = compteur('t259');
const { s, port } = await serveur();
const b = await chromium.launch();
const ouvrir = async (prep) => {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, locale: 'fr-FR', hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
  await couperInternet(p, port);
  await ctx.addInitScript(prep.fn, prep.arg);
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(3200);
  return { ctx, p, errs };
};
const db = nouvelleBoutique();
const ecran = p => p.evaluate(() => ({ scr: (document.querySelector('.scr.on') || {}).id, role: typeof role !== 'undefined' ? role : '', co: document.getElementById('ov-codeouv').classList.contains('show'), note: (document.getElementById('co-note') || {}).textContent || '', pinCase: (() => { const e = document.getElementById('co-pin'); return !!(e && e.offsetParent); })() }));

// 1. Créée il y a deux heures sur ce téléphone : pas de porte, et la question des 4 chiffres.
{
  const { ctx, p, errs } = await ouvrir({ fn: a => { try { if (!localStorage.getItem('myboutiq_v6')) { localStorage.setItem('myboutiq_v6', a.db); localStorage.setItem('mb_porte_libre', JSON.stringify({ c: 'MARI0001', t: Date.now() - 2 * 3600e3 })); } } catch (e) {} }, arg: { db: JSON.stringify(db) } });
  const e = await ecran(p);
  t(e.scr === 's-caisse' && e.role === 'patron', `le jour de la création, le retour ouvre la caisse sans code (${e.scr})`);
  t(e.co && /Choisis 4 chiffres/.test(e.note) && !e.pinCase, 'une seule question : ses 4 chiffres, sans retaper le PIN');
  await p.evaluate(() => { document.getElementById('co-new').value = '7391'; document.getElementById('co-new2').value = '7391'; return validerCodeOuverture(); }); await p.waitForTimeout(500);
  const pose = await p.evaluate(() => codeOuvertureActif());
  t(pose, 'le code à 4 chiffres est posé');
  await p.reload(); await p.waitForTimeout(3200);
  const e2 = await ecran(p);
  t(e2.scr === 's-login', `dès qu'il est posé, la porte revient (${e2.scr})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// 2. Après 24 heures : la porte, comme avant.
{
  const { ctx, p } = await ouvrir({ fn: a => { try { localStorage.setItem('myboutiq_v6', a.db); localStorage.setItem('mb_porte_libre', JSON.stringify({ c: 'MARI0001', t: Date.now() - 25 * 3600e3 })); } catch (e) {} }, arg: { db: JSON.stringify(db) } });
  const e = await ecran(p);
  t(e.scr === 's-login' && (await p.evaluate(() => localStorage.getItem('mb_porte_libre'))) === null, `24 heures passées : la porte est là (${e.scr}), le laissez-passer est effacé`);
  await ctx.close();
}
// 3. Une autre boutique sur ce téléphone, ou un téléphone qui n'a rien créé : la porte.
{
  const { ctx, p } = await ouvrir({ fn: a => { try { localStorage.setItem('myboutiq_v6', a.db); localStorage.setItem('mb_porte_libre', JSON.stringify({ c: 'AUTRE999', t: Date.now() })); } catch (e) {} }, arg: { db: JSON.stringify(db) } });
  t((await ecran(p)).scr === 's-login', 'le laissez-passer d\'une autre boutique n\'ouvre pas celle-ci');
  await ctx.close();
  const o2 = await ouvrir({ fn: a => { try { localStorage.setItem('myboutiq_v6', a.db); } catch (e) {} }, arg: { db: JSON.stringify(db) } });
  t((await ecran(o2.p)).scr === 's-login', 'sans laissez-passer (un autre téléphone) : la porte, comme avant');
  await o2.ctx.close();
}
await b.close(); s.close();
fin();
