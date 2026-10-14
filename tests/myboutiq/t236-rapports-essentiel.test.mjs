// t236 — RAPPORTS : L'ESSENTIEL D'ABORD (23.17).
// « Trop de fonctionnalités, pas organisé. » Mesuré sur la 23.16 : l'écran
// faisait 1 830 px — résumé, paiements, 7 jours, heures, semaine, un
// camembert qui redisait le résumé, le top, les vendeurs, « Tous les stocks
// OK » sans rien à dire, les dernières ventes — tout ouvert, à la suite,
// une trentaine d'emojis.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, nombre, ligneRapport } from './caisse.mjs';
const { t, fin } = compteur('t236');
const { s, port } = await serveur();
const b = await chromium.launch();
const rapports = async p => { await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); navTo('rapports', document.querySelectorAll('.ni')[2]); }); await p.waitForTimeout(400); };
const tuiles = p => p.evaluate(() => Array.from(document.querySelectorAll('#rpt-cont .rpt-ess > div')).map(d => ({ t: d.querySelector('span').textContent, v: d.querySelector('b').textContent })));
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await vendre(p, { lignes: [[2, 2], [1, 3]] });              // 1 200 + 1 950 en espèces
  await vendre(p, { lignes: [[4, 1]], mode: 'orange' });       // 1 300 en Orange
  await p.evaluate(() => { DB.depenses.push({ id: genVenteId(), nm: 'Moto', amt: 500, cat: 'transp', date: new Date().toLocaleDateString('fr-FR'), ts: new Date().toISOString(), caisse: true }); save(); });
  await rapports(p);
  // ── 1) LES TROIS CHIFFRES EN PREMIER ─────────────────────────────────
  const ordre = await p.evaluate(() => { const c = document.getElementById('rpt-cont'); const ess = c.querySelector('.rpt-ess'), det = c.querySelector('.rcd');
    return !!ess && !!det && !!(ess.compareDocumentPosition(det) & Node.DOCUMENT_POSITION_FOLLOWING); });
  const T = await tuiles(p);
  t(ordre && T.map(x => x.t).join(',') === 'Ventes,Bénéfice net,Espèces à compter', `en tête : ${T.map(x => x.t + ' ' + x.v).join(' · ')}`);
  const cais = await p.evaluate(() => caisseAttendue());
  t(nombre(T[0].v) === 4450, `ventes : ${T[0].v} (calculé : 4 450)`);
  t(nombre(T[2].v) === cais && nombre(await ligneRapport(p, 'à compter')) === cais && cais === 3150 - 500, `espèces à compter : ${T[2].v} — la même que la ligne « à compter » et que la clôture (3 150 − 500 de moto)`);
  t(nombre(T[1].v) === nombre(await ligneRapport(p, 'Bénéfice NET')), `bénéfice net : ${T[1].v}, le même que dans le détail`);
  // ── 2) LE RESTE ATTEND QU'ON L'OUVRE ─────────────────────────────────
  const g = await p.evaluate(() => { const d = document.querySelector('#rpt-cont details.rpt-plus'); return { existe: !!d, ouvert: d && d.open, evo: d && /7 derniers jours/.test(d.innerHTML), top: d && /Top articles/.test(d.innerHTML) }; });
  t(g.existe && !g.ouvert && g.evo && g.top, `les graphiques et classements sont repliés dans un bloc (${JSON.stringify(g)})`);
  t(!(await p.evaluate(() => /conic-gradient|Répartition du chiffre/.test(document.getElementById('rpt-cont').innerHTML))), 'le camembert, qui redisait le résumé, est parti');
  t(!(await p.evaluate(() => /Tous les stocks OK|Alertes stock/.test(document.getElementById('rpt-cont').innerText))), 'aucune alerte : aucune carte « Alertes stock »');
  const h = await p.evaluate(() => document.getElementById('s-rapports').scrollHeight);
  t(h < 1150, `l'écran fait ${h} px (1 830 sur la 23.16)`);
  const emo = await p.evaluate(() => (document.getElementById('rpt-cont').innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{23F0}-\u{23FF}\u{21A9}]/gu) || []).join(''));
  t(emo === '', `sans emoji (${emo || 'aucun'})`);
  // Il l'ouvre : c'est retenu pendant la session.
  await p.locator('#rpt-cont details.rpt-plus > summary').click(); await p.waitForTimeout(150);
  await rapports(p);
  t(await p.evaluate(() => document.querySelector('#rpt-cont details.rpt-plus').open), 'ouvert une fois, il reste ouvert en revenant sur l\'écran');
  // ── 3) UNE ALERTE PARLE QUAND IL Y EN A UNE ──────────────────────────
  await p.evaluate(() => { const a = DB.articles.find(x => x.id === 5); a.al = 20; save(); });
  await rapports(p);
  t(await p.evaluate(() => /Alertes stock/i.test(document.getElementById('rpt-cont').innerText) && /Lait Nido/.test(document.getElementById('rpt-cont').innerText)), 'Lait Nido sous son seuil : la carte « Alertes stock » apparaît');
  // ── 4) SUR 7 JOURS, LA TROISIÈME TUILE DIT LES DÉPENSES ───────────────
  await p.evaluate(() => rptPeriode('7j')); await p.waitForTimeout(200);
  const T7 = await tuiles(p);
  t(T7[2] && T7[2].t === 'Dépenses' && nombre(T7[2].v) === 500, `sur 7 jours : ${T7.map(x => x.t + ' ' + x.v).join(' · ')}`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
