// t231 — « L'APP MONTRE UNIQUEMENT L'ARGENT EN CAISSE AUJOURD'HUI » (23.15).
// Sa capture de « Ce que vaut ma boutique » : marchandise 916 790, caisse
// 50 450 (le jour), crédits 1 000. L'argent des jours passés — Orange Money,
// banque, tontine — n'apparaissait nulle part. Il le dit, l'app le compte.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, nombre } from './caisse.mjs';
const { t, fin } = compteur('t231');
const { s, port } = await serveur();
const b = await chromium.launch();
const total = p => p.evaluate(() => document.querySelector('#vb-corps .vb-total b').textContent);
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await p.evaluate(() => ouvrirValeur()); await p.waitForTimeout(300);
  const avant = nombre(await total(p));
  const cases = await p.evaluate(() => Array.from(document.querySelectorAll('#vb-corps .vb-a label')).map(x => x.textContent));
  t(cases.length === 3 && /Mobile Money/.test(cases[0]) && /Banque/.test(cases[1]) && /Tontine/.test(cases[2]), `trois cases : ${cases.join(' · ')}`);
  await p.locator('#vb-a-mm').click(); await p.keyboard.type('120000', { delay: 20 });
  await p.locator('#vb-a-bq').click(); await p.keyboard.type('300000', { delay: 20 });
  await p.waitForTimeout(900);
  const apres = nombre(await total(p));
  t(apres === avant + 420000, `le total suit pendant qu'il tape : ${avant} → ${apres} (+420 000)`);
  const r = await p.evaluate(() => ({ v: document.getElementById('vb-a-bq').value, foc: document.activeElement && document.activeElement.id,
    g: JSON.parse(localStorage.getItem('myboutiq_v6')).cfg.argentHors }));
  t(r.v === '300000' && r.foc === 'vb-a-bq', `la case garde ce qu'il tape et son curseur (« ${r.v} »)`);
  t(r.g && r.g.mm === 120000 && r.g.bq === 300000 && !!r.g.d, `gardé sur le téléphone, avec la date (${JSON.stringify(r.g)})`);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => ouvrirValeur()); await p.waitForTimeout(300);
  const re = await p.evaluate(() => ({ mm: document.getElementById('vb-a-mm').value, maj: document.getElementById('vb-a-maj').textContent }));
  t(nombre(await total(p)) === apres && re.mm === '120000' && /Mis à jour le/.test(re.maj), `après un rechargement : toujours là (« ${re.maj} »)`);
  const sous = await p.evaluate(() => document.querySelectorAll('#vb-corps .vb-l i')[1].textContent);
  t(/espèces d'aujourd'hui/.test(sous), `la caisse dit ce qu'elle est : « ${sous} »`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// Le vendeur ne voit pas l'argent du patron, et son total ne le compte pas.
{
  const d = nouvelleBoutique(); d.cfg.argentHors = { mm: 120000, bq: 300000, d: new Date().toISOString() };
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { vendeur: 'Ibrahim' });
  const r = await p.evaluate(() => { const v = valeurBoutique(); return { autre: v.autre, total: v.total, somme: v.achat + v.caisse + v.credits }; });
  t(r.autre === 0 && r.total === r.somme, `vendeur : l'argent du patron n'est pas compté (${r.autre})`);
  await p.evaluate(() => { argentHorsTape('mm', '5'); });
  t(await p.evaluate(() => DB.cfg.argentHors.mm) === 120000, 'et il ne peut pas l\'écrire');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
