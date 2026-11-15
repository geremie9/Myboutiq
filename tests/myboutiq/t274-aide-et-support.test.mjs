// t274 — « AIDE & SUPPORT » DIT L'APP D'AUJOURD'HUI (23.55).
// Le patron, le 15/11 : « fais un diagnostic du contact et support dans l'app,
// ça reflète les anciennes versions ». Mesuré : « Va dans ⚙️ Paramètres →
// Ajouter un article. Choisis un emoji », « 📊 Rapports », « 👥 Clients »…
// et « comment annuler une vente » recevait la recette pour ajouter un
// article (la recherche ne regardait que le premier mot, « comment »).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t274');
const { s, port } = await serveur();
const b = await chromium.launch();

const db = nouvelleBoutique(); db.cfg.facon = 'detail';
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 });
// 0. Le « Bonjour » de l'aide s'écrit au démarrage : il ne doit pas faire
//    descendre la caisse (mesuré en 23.55 avant publication : t243, t261).
t(await p.evaluate(() => { initAssistance(); return (document.scrollingElement || document.documentElement).scrollTop; }) === 0, 'l\'aide qui se prépare au démarrage ne fait pas défiler la caisse');
await p.evaluate(() => { window.__ouverts = []; window.open = u => { window.__ouverts.push(u); return null; }; goScreen('s-assist'); initAssistance(); });
await p.waitForTimeout(300);

// 1. Plus un mot de l'ancienne app dans les réponses (FR et EN).
const vieux = await p.evaluate(() => {
  const txt = [...document.querySelectorAll('#faq-grid .faq-btn')].map(x => x.textContent).join(' | ')
    + ' | ' + (typeof _FAQ !== 'undefined' ? _FAQ.map(f => f.fr.join(' ') + ' ' + f.en.join(' ')).join(' | ') : (FAQ_FR.concat(FAQ_EN)).map(f => f.q + ' ' + f.r).join(' | '));
  return ['Paramètres', 'emoji', 'Rapports', '👥 Clients', 'Reports', 'Customers → Add', 'PIN à 4 chiffres'].filter(m => txt.includes(m));
});
t(!vieux.length, `aucune réponse ne parle de l'ancienne app${vieux.length ? ' — ' + vieux.join(', ') : ''}`);

const demander = async q => {
  await p.fill('#assist-inp', q); await p.evaluate(() => envoyerMsg()); await p.waitForTimeout(650);
  return p.evaluate(() => { const m = [...document.querySelectorAll('#assist-msgs .assist-msg:not(.user)')].pop(); return { txt: m.textContent, go: !!m.querySelector('.faq-go:not(.faq-wa)'), wa: !!m.querySelector('.faq-wa') }; });
};
let r = await demander('comment annuler une vente');
t(/Annuler la vente/.test(r.txt) && r.go, `« comment annuler une vente » : la vraie réponse, avec « Montre-moi » (${r.txt.slice(0, 50)}…)`);
r = await demander('Comment ajouter un article ?');
t(/« \+ » en bas/.test(r.txt) && /Un article/.test(r.txt), `« comment ajouter un article » : le « + » du bas, « Un article »`);
r = await demander("j'ai reçu une livraison");
t(/Un arrivage/.test(r.txt), `« j'ai reçu une livraison » (avec l'accent) : l'arrivage`);
r = await demander('mot de passe oublié');
t(/PIN oublié/.test(r.txt) && /Ne donne jamais ton code/.test(r.txt), `« mot de passe oublié » : « PIN oublié ? », et jamais le code à personne`);
const vu = await p.evaluate(() => { const m = [...document.querySelectorAll('#assist-msgs .assist-msg:not(.user)')].pop().getBoundingClientRect(), bar = document.querySelector('#s-assist .assist-bottom-bar').getBoundingClientRect(); return { bas: Math.round(m.bottom), barre: Math.round(bar.top) }; });
t(vu.bas <= vu.barre, `la dernière réponse se lit au-dessus de la barre des questions (bas ${vu.bas} px, barre ${vu.barre} px)`);
r = await demander('xyz blabla');
t(r.wa && !r.go, 'une question qu\'il ne comprend pas : le bouton « Écrire au support sur WhatsApp »');

// 2. « Montre-moi » ouvre l'endroit.
await demander('ajouter du stock');
await p.evaluate(() => [...document.querySelectorAll('#assist-msgs .faq-go:not(.faq-wa)')].pop().click()); await p.waitForTimeout(400);
t(await p.evaluate(() => document.getElementById('ov-stk').classList.contains('show')), '« Montre-moi » sur l\'arrivage ouvre la feuille de l\'arrivage');
await p.evaluate(() => { closeSheet('ov-stk'); goScreen('s-assist'); });

// 3. Ce qu'il tape s'écrit comme du texte.
await p.fill('#assist-inp', '<b id="pirate">x</b>'); await p.evaluate(() => envoyerMsg()); await p.waitForTimeout(300);
t(await p.evaluate(() => !document.getElementById('pirate')), 'ce qu\'il tape n\'est jamais lu comme du HTML');

// 4. Le message au support part avec la version et le rôle.
await p.evaluate(() => contacterSupport());
const u = decodeURIComponent((await p.evaluate(() => window.__ouverts.pop())) || '');
const v = await p.evaluate(() => APP_BUILD);
t(u.includes('MARI0001') && u.includes('v' + v) && /patron/.test(u), `le message WhatsApp dit la boutique, la version et le rôle (« ${u.split('text=')[1]} »)`);
t(await p.evaluate(() => document.getElementById('h-assist-s').textContent) === 'Touche ta question, ou écris-la', 'l\'écran tutoie, comme toute l\'app');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();

// 5. Le vendeur : seulement ce qui le concerne.
{
  const d = nouvelleBoutique(); d.cfg.facon = 'detail';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d, { vendeur: 'Ibrahim', tactile: true });
  await p.evaluate(() => { window.open = () => null; goScreen('s-assist'); initAssistance(); }); await p.waitForTimeout(300);
  const q = await p.evaluate(() => [...document.querySelectorAll('#faq-grid .faq-btn')].map(x => x.textContent));
  t(!q.includes('Ajouter un vendeur') && !q.includes('Fermer la journée') && !q.includes('Noter une dépense') && q.includes('Annuler une vente'), `le vendeur ne voit pas les questions du patron (${q.join(', ')})`);
  const w = await p.evaluate(() => _supportTexte());
  t(/vendeur Ibrahim/.test(w), `son message au support dit « vendeur Ibrahim » (${w})`);
  t(errs.length === 0, 'aucune erreur JS (vendeur)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close(); fin();
