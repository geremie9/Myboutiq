// t256 — Le rappel de dette par WhatsApp (23.39). Le geste qui a fait
// adopter les cahiers numériques en Inde : noter la dette, et la rappeler au
// client par un message qu'il reçoit. Ici la dette se notait ; la réclamer
// restait à faire de vive voix.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t256');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique();
db.clients.push({ id: 2, nm: 'Paul', tel: 'N/A', credit: 0, points: 0, hist: [] }, { id: 3, nm: 'Fatou', tel: '+221 77 123 45 67', credit: 0, points: 0, hist: [] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);
await p.evaluate(() => { window.__ouv = []; window.open = u => { window.__ouv.push(String(u)); return null; }; });
const fiche = async id => { await p.evaluate(id => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); ouvrirDetCli(id); }, id); await p.waitForTimeout(300);
  return p.evaluate(() => ({ btn: !!document.getElementById('btn-rappel').offsetParent, txt: document.getElementById('btn-rappel').textContent.trim(), info: document.getElementById('cli-rappel-info').offsetParent ? document.getElementById('cli-rappel-info').textContent : '' })); };

// Un client qui ne doit rien : pas de bouton.
let f = await fiche(1);
t(!f.btn, 'un client qui ne doit rien : pas de rappel proposé');
// Awa prend à crédit.
await vendre(p, { lignes: [[2, 2]], mode: 'credit', client: 1 });
await p.evaluate(() => { try { nouvelleVente(); } catch (e) {} });
f = await fiche(1);
t(f.btn && f.txt === 'Rappeler sur WhatsApp' && !f.info, `Awa doit 1 200 : « ${f.txt} »`);
await p.locator('#btn-rappel').tap(); await p.waitForTimeout(300);
const r = await p.evaluate(() => { const u = window.__ouv[0] || ''; return { u, txt: decodeURIComponent((u.split('text=')[1] || '')), rappel: DB.clients[0].rappel || '', j: DB.journal.filter(x => x.act === 'rappel').length, dette: DB.clients[0].credit }; });
t(r.u.indexOf('https://wa.me/237677111111?text=') === 0, `WhatsApp s'ouvre sur son numéro, indicatif du pays devant (${r.u.slice(0, 31)})`);
t(/^Bonjour Awa, c'est Ets Marie\./.test(r.txt) && /Il te reste .*1.200.* à payer/.test(r.txt.replace(/\s/g, ' ')), `le message est déjà écrit : « ${r.txt.replace(/\n/g, ' ')} »`);
t(r.dette === 1200 && !!r.rappel && r.j === 1, 'la dette ne bouge pas ; le rappel est noté (fiche et journal)');
f = await fiche(1);
t(/Dernier rappel : \d\d\/\d\d\/\d{4}/.test(f.info), `la fiche s'en souvient : « ${f.info} »`);
// Sans numéro : WhatsApp ouvre son choix de contact, et on le dit.
await p.evaluate(() => { DB.clients[1].credit = 500; window.__ouv = []; });
f = await fiche(2); await p.locator('#btn-rappel').tap(); await p.waitForTimeout(200);
const s2 = await p.evaluate(() => ({ u: window.__ouv[0] || '', toast: window.__toasts.slice(-1)[0] }));
t(s2.u.indexOf('https://wa.me/?text=') === 0 && /Pas de numéro pour Paul/.test(s2.toast), 'sans numéro : il choisit le contact dans WhatsApp, et l\'app le dit');
// Un numéro déjà international est gardé tel quel.
const intl = await p.evaluate(() => _waClient(DB.clients[2]));
t(intl === '221771234567', `un numéro déjà international n'est pas préfixé deux fois (${intl})`);
// Une fois payé, le bouton s'en va.
await p.evaluate(() => { cliCours = DB.clients[0]; document.getElementById('cli-pmt').value = '1200'; enregPmt(); }); await p.waitForTimeout(300);
f = await fiche(1);
t(!f.btn && (await p.evaluate(() => DB.clients[0].credit)) === 0, 'dette payée : plus de rappel');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
