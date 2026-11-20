// t309 — LE JOURNAL DES ERREURS ARRIVE BIEN AU SERVEUR (banc seul).
// Vérifié le 20/11/2026 : journal_erreurs ne contenait que 2 lignes, la
// dernière du 31/10, après une vingtaine de versions. Silence suspect : le
// capteur était-il cassé ? Non — rejoué ici de bout en bout (et la fonction
// noter_erreurs essayée en base dans une transaction annulée : 1 ligne).
// Mais aucun banc ne le gardait : une régression l'aurait rendu muet sans que
// personne le sache, et « pas d'erreur » aurait voulu dire « pas de capteur ».
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { fauxSupaScript } from './faux-supa.mjs';
const { t, fin } = compteur('t309');
const { s, port } = await serveur();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR', timezoneId: 'Africa/Douala' });
await ctx.addInitScript(fauxSupaScript());
// L'app parle au faux serveur : on garde ce que noter_erreurs reçoit.
await ctx.addInitScript(() => {
  const poser = () => {
    const sb = window.supabase; if (!sb || sb.__sonde) return;
    const cc = sb.createClient; sb.__sonde = true;
    sb.createClient = function () { const c = cc.apply(this, arguments), r = c.rpc;
      c.rpc = function (nom, a) { if (nom === 'noter_erreurs') (window.__recu = window.__recu || []).push(...a.p_lignes); return r.apply(this, arguments); };
      return c; };
  };
  poser(); document.addEventListener('DOMContentLoaded', poser);
});
const p = await ctx.newPage();
await couperInternet(p, port);
await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(2500);

// ── 1. Une vraie erreur et une promesse rejetée, comme sur un téléphone ──
await p.evaluate(() => {
  setTimeout(() => { null.prix; }, 10);
  Promise.reject(new Error('client 677123456 introuvable'));
});
await p.waitForTimeout(400);
const file = await p.evaluate(() => JSON.parse(localStorage.getItem('mb_err_q') || '[]'));
t(file.length === 2, `les deux erreurs sont mises de côté sur le téléphone (${file.length})`);
const e = file.find(x => x.type === 'erreur') || {};
t(/Cannot read properties of null/.test(e.message) && e.version && e.appareil && e.ecran, `avec la version (${e.version}), l'écran (${e.ecran}) et un numéro d'appareil anonyme`);
const pr = file.find(x => x.type === 'promesse') || {};
t(pr.message && !/677123456/.test(pr.message) && /#/.test(pr.message), `un numéro dans le message ne part jamais : « ${pr.message} »`);

// ── 2. Elles partent au serveur, puis quittent le téléphone ──
await p.waitForTimeout(16000);
const r = await p.evaluate(() => ({ recu: window.__recu || [], reste: JSON.parse(localStorage.getItem('mb_err_q') || '[]').length }));
t(r.recu.length === 2 && r.recu.every(x => !('cle' in x)), `noter_erreurs reçoit les 2 lignes (${r.recu.length})`);
t(r.reste === 0, 'envoyées : la file du téléphone est vidée');

// ── 3. La même erreur répétée : comptée, pas empilée ──
await p.evaluate(() => { for (let i = 0; i < 5; i++) setTimeout(() => { undefined.stock; }, 5 + i); });
await p.waitForTimeout(400);
const f3 = await p.evaluate(() => JSON.parse(localStorage.getItem('mb_err_q') || '[]'));
t(f3.length === 1 && f3[0].nb === 5, `5 fois la même : une ligne, nb = ${f3[0] && f3[0].nb}`);

// ── 4. Le bruit du réseau n'est pas un bug ──
await p.evaluate(() => { Promise.reject(new TypeError('Failed to fetch')); });
await p.waitForTimeout(300);
t(await p.evaluate(() => JSON.parse(localStorage.getItem('mb_err_q') || '[]').length) === 1, '« Failed to fetch » (réseau coupé) n\'est pas noté');
await ctx.close(); await b.close(); s.close();
fin();
