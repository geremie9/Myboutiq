// t257 — La monnaie avec les billets (23.40). « Servir une communauté non
// lettrée. » Dire ce que le client donne demandait de taper un montant ;
// un billet se reconnaît à sa couleur et ne change jamais de place.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t257');
const { s, port } = await serveur();
const b = await chromium.launch();
const etat = p => p.evaluate(() => ({ recu: document.getElementById('calc-recu').value, rend: document.getElementById('calc-res').style.display !== 'none' ? document.getElementById('calc-res-amt').textContent.replace(/[^\d]/g, '') : '', lbl: document.getElementById('calc-res-lbl').textContent,
  pastilles: [...document.querySelectorAll('#calc-shcts [data-v] em')].filter(e => e.textContent).map(e => e.parentElement.getAttribute('data-v') + '×' + e.textContent).join(',') }));
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__dit = []; parler = x => window.__dit.push(String(x)); });
  await p.locator('#pc-2').tap(); await p.locator('#pc-3').tap(); await p.locator('#pc-2').tap();   // 600 + 650 + 600 = 1 850
  await p.evaluate(() => procederPmt()); await p.waitForTimeout(500);
  const g = await p.evaluate(() => ({ billets: [...document.querySelectorAll('#calc-shcts .bil[data-v]')].map(x => x.getAttribute('data-v')).join(','), pieces: [...document.querySelectorAll('#calc-shcts .pce[data-v]')].map(x => x.getAttribute('data-v')).join(','), q: document.querySelector('.bil-q').textContent, champ: !!document.getElementById('calc-recu').offsetParent }));
  t(g.billets === '10000,5000,2000,1000,500' && g.pieces === '100,50,25' && g.champ, `les billets et les pièces du franc CFA, toujours à la même place (« ${g.q} ») ; le champ reste pour taper`);
  await p.locator('.bil[data-v="1000"]').tap(); await p.waitForTimeout(350);
  let e = await etat(p);
  t(e.recu === '1000' && /insuffisant|manque/i.test(e.lbl), `un billet de 1 000 pour 1 850 : « ${e.lbl} »`);
  await p.locator('.bil[data-v="1000"]').tap(); await p.waitForTimeout(350);
  e = await etat(p);
  t(e.recu === '2000' && e.rend === '150' && e.pastilles === '1000×2', `deux billets de 1 000 s'additionnent : reçu ${e.recu}, à rendre ${e.rend} (${e.pastilles})`);
  const dit = await p.evaluate(() => window.__dit.slice(-1)[0] || '');
  t(/Rends 150 francs/i.test(dit), `et l'app le dit : « ${dit} »`);
  const conf = await p.evaluate(() => { const r = document.getElementById('btn-conf-vente').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top > 0; });
  t(conf, '« Confirmer la vente » reste sous le pouce, sans défiler');
  await p.locator('.pce-x').tap(); await p.waitForTimeout(200);
  e = await etat(p);
  t(e.recu === '' && !e.rend && !e.pastilles, '✕ efface tout : il recommence');
  await p.locator('.bil-juste').tap(); await p.waitForTimeout(300);
  e = await etat(p);
  t(e.recu === '1850' && e.rend === '0', '« Le compte juste » : rien à rendre');
  await p.locator('#btn-conf-vente').tap(); await p.waitForTimeout(600);
  const v = await p.evaluate(() => { const x = DB.ventes[DB.ventes.length - 1]; return x ? [x.total, x.paiement.mode].join(' ') : ''; });
  t(v === '1850 especes', `la vente s'enregistre comme avant (${v})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// Une autre monnaie : les raccourcis d'avant, pas des billets qui n'existent pas.
{
  const db = nouvelleBoutique(); db.cfg.d = 'NGN'; db.cfg.s = '₦';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  await p.locator('#pc-2').tap(); await p.evaluate(() => procederPmt()); await p.waitForTimeout(400);
  const g = await p.evaluate(() => ({ bil: document.querySelectorAll('#calc-shcts .bil').length, anciens: document.querySelectorAll('#calc-shcts .calc-shct').length }));
  t(g.bil === 0 && g.anciens > 0 && errs.length === 0, `hors franc CFA : pas de billets inventés (${g.anciens} raccourcis d'avant)`);
  await ctx.close();
}
await b.close(); s.close();
fin();
