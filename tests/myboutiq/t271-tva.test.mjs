// t271 — LA TVA (23.52). « Certaines grandes boutiques qui tendent à être des
// petits supermarchés : la TVA à 19,25 % au Cameroun, comment on va gérer ça ? »
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, nombre, ligneRapport as ligne } from './caisse.mjs';
const { t, fin } = compteur('t271');
const { s, port } = await serveur();
const b = await chromium.launch();
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
await p.waitForTimeout(400);
// Éteinte par défaut : rien ne change.
await vendre(p, { lignes: [[5, 1]] });
const r0 = await p.evaluate(() => { afficherRecu(); return document.getElementById('recu-cont').textContent; });
t(!/TVA/.test(r0), 'par défaut, aucune TVA sur le reçu');
await p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
// Réglages ▸ « Je facture la TVA »
await p.evaluate(() => goSt()); await p.waitForTimeout(300);
await p.evaluate(() => basculerTVA()); await p.waitForTimeout(200);
const reg = await p.evaluate(() => ({ t: DB.cfg.tva, tog: document.getElementById('tog-tva').className, sub: document.getElementById('st-tva-s').textContent }));
t(reg.t === 19.25 && /on/.test(reg.tog) && /19,25 %/.test(reg.sub), `au Cameroun, 19,25 % : « ${reg.sub} »`);
// Les prix ne changent pas.
const px = await p.evaluate(() => DB.articles.find(a => a.id === 5).px);
t(px === 3200, 'les prix restent ceux que le client paie');
const v = await vendre(p, { lignes: [[5, 1]] });
t(v.v.total === 3200, 'la vente encaisse le même montant');
const r1 = await p.evaluate(() => { afficherRecu(); return [...document.querySelectorAll('#recu-cont .recu-rw')].map(x => x.textContent.replace(/\s+/g, ' ').replace(/[  ]/g, ' ')).join(' | '); });
// 3 200 / 1,1925 = 2 683 HT, 517 de TVA.
t(/dont HT\s*2 683 FCFA/.test(r1) && /dont TVA 19,25 %\s*517 FCFA/.test(r1), `le reçu : total 3 200, dont HT 2 683, dont TVA 517`);
await p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
await p.evaluate(() => { _rptPer = 'jour'; renderRpt(); });
const ca = nombre(await ligne(p, '^Mes ventes')) /* 23.78 : « Chiffre d'affaires » devient « Mes ventes » */, tva = nombre(await ligne(p, 'dont TVA'));
t(ca === 6400 && tva === 1033, `le rapport : chiffre d'affaires ${ca}, dont TVA ${tva} à déclarer`);
// Un autre pays de la zone : 18 %.
const sn = await p.evaluate(() => { DB.cfg.tva = 0; DB.cfg.pays = { cc: '221', nm: 'Sénégal' }; basculerTVA(); return DB.cfg.tva; });
t(sn === 18, 'au Sénégal, 18 %');
// L'éteindre.
await p.evaluate(() => basculerTVA());
t((await p.evaluate(() => tauxTVA())) === 0, 'touché à nouveau : éteinte');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();
// Un vendeur ne la change pas.
const vd = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true, vendeur: true });
await vd.p.waitForTimeout(300);
t((await vd.p.evaluate(() => { basculerTVA(); return tauxTVA(); })) === 0, 'un vendeur ne peut pas l\'allumer');
await vd.ctx.close();
await b.close(); s.close();
fin();
