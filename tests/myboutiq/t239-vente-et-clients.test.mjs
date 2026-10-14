// t239 — L'ÉCRAN « VENTE ENREGISTRÉE » ET L'ÉCRAN CLIENTS (23.20).
// Mesuré sur la 23.19 :
//   · après chaque vente, un ✅ d'emoji de 78 px et le montant — rien sur la
//     monnaie à rendre, rien sur le crédit ;
//   · Clients : dans l'ordre de création (12 000 dû en dernier), « 0 F » en
//     rouge pour qui ne doit rien, « 📅 N/A », un badge « OK » muet, le nom
//     posé tel quel dans le HTML.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t239');
const { s, port } = await serveur();
const b = await chromium.launch();
const EMO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const hier = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
const d = nouvelleBoutique();
d.clients = [{ id: 1, nm: 'Awa', tel: '677111111', credit: 2500, points: 0, hist: [] },
  { id: 2, nm: 'Moussa Kamga', tel: '699222333', credit: 0, points: 0, hist: [] },
  { id: 3, nm: 'Mama Brigitte', tel: '655444555', credit: 12000, points: 0, date: hier, hist: [] }];
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
const succ = () => p.evaluate(() => ({ det: document.getElementById('succ-det').innerText.replace(/\s+/g, ' ').trim(),
  ico: !!document.querySelector('#succ .succ-ico svg'), emo: document.getElementById('succ').innerText }));
// ── 1) APRÈS LA VENTE : CE QU'IL DOIT FAIRE MAINTENANT ─────────────────
await vendre(p, { lignes: [[2, 2]], recu: 2000 });                     // 1 200, il tend 2 000
let r = await succ();
t(r.ico && !EMO.test(r.emo), 'la coche est dessinée, plus d\'emoji sur l\'écran');
t(/Reçu FCFA 2\s?000/.test(r.det) && /rends/.test(r.det) && /800/.test(r.det), `espèces : « ${r.det} »`);
const tempo = await p.evaluate(() => { const t0 = Date.now(); return new Promise(res => { const sc = document.getElementById('succ'); sc.classList.add('show'); planifierFermetureSucces(sc, true);
  const i = setInterval(() => { if (!sc.classList.contains('show')) { clearInterval(i); res(Date.now() - t0); } }, 100); }); });
t(tempo > 3500, `avec de la monnaie à rendre, l'écran reste le temps de compter (${tempo} ms)`);
await vendre(p, { lignes: [[2, 1]], mode: 'orange' });
t((await succ()).det === 'Orange Money', `Orange Money : « ${(await succ()).det} »`);
await vendre(p, { lignes: [[4, 1]], mode: 'credit', client: 1, avance: 300 });
r = await succ();
t(/Awa doit/.test(r.det) && /1\s?000/.test(r.det) && /avance/.test(r.det), `à crédit : « ${r.det} »`);
// ── 2) CLIENTS : CEUX QUI DOIVENT D'ABORD ───────────────────────────────
await p.evaluate(() => { document.querySelectorAll('.succ').forEach(x => x.classList.remove('show')); navTo('clients', document.querySelectorAll('.ni')[3]); });
await p.waitForTimeout(300);
const c = await p.evaluate(() => ({ noms: Array.from(document.querySelectorAll('#cli-cont .cit .cinm')).map(x => x.textContent),
  txt: document.getElementById('cli-cont').innerText, tot: document.querySelector('#cli-cont .cli-tot-v').textContent }));
t(c.noms.join(',') === 'Mama Brigitte,Awa,Moussa Kamga', `ordre : ${c.noms.join(' · ')} (en retard d'abord, puis le plus gros, puis ceux qui ne doivent rien)`);
t(/En retard de 3 j/.test(c.txt) && /Ne doit rien/.test(c.txt), 'le retard est dit, et « Ne doit rien » remplace un 0 F en rouge');
t(!/N\/A|\bOK\b|Soldé/.test(c.txt) && !EMO.test(c.txt), 'plus de « N/A », de badge « OK » muet, ni d\'emoji');
// Le nom vient aussi de la synchro : il reste du texte.
await p.evaluate(() => { DB.clients[1].nm = '<img src=x onerror="window.__pwn=1">Moussa'; renderClients(); });
await p.waitForTimeout(200);
t(!(await p.evaluate(() => window.__pwn || document.querySelector('#cli-cont .cinm img'))), 'un nom venu d\'ailleurs ne s\'exécute pas');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
