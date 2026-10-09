// t203 — LA PORTE : le bon PIN ouvre la caisse, même sans réseau ; un
// mauvais ne l'ouvre jamais. Et le vendeur ne voit que ce que le patron
// lui a permis de voir.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t203');
const { s, port } = await serveur();
const b = await chromium.launch();
const ENTREE = { role: 'patron', tel: '+237677000000', code: 'MARI0001', nom: 'Ets Marie', boutiques: [{ code: 'MARI0001', nm: 'Ets Marie' }] };

// ── 1) HORS RÉSEAU, À LA PORTE DU MATIN ───────────────────────────────
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/politique-confidentialite.html`);
  await p.evaluate(([db, en]) => { localStorage.setItem('myboutiq_v6', JSON.stringify(db)); localStorage.setItem('myboutiq_entree', JSON.stringify(en)); }, [nouvelleBoutique(), ENTREE]);
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(1800);
  await ctx.setOffline(true);
  const essai = pin => p.evaluate(async pin => {
    window.__t = []; const st = window.showToast; window.showToast = m => { window.__t.push(String(m)); };
    document.getElementById('er-pin').value = pin; await validerEntreeRapide();
    window.showToast = st;
    return { ecran: (document.querySelector('.scr.on') || {}).id, role, toasts: window.__t };
  }, pin);
  const a = await p.evaluate(() => (document.querySelector('.scr.on') || {}).id);
  t(a === 's-login', `le téléphone connaît la boutique : la porte s'ouvre sur le PIN (${a})`);
  const faux = await essai('999999');
  t(faux.ecran === 's-login' && faux.toasts.some(x => /ne correspond pas/.test(x)), `mauvais PIN hors réseau : la porte reste fermée (« ${faux.toasts.join(' / ')} »)`);
  const bon = await essai('123456');
  t(bon.ecran === 's-caisse' && bon.role === 'patron', `bon PIN hors réseau : la caisse s'ouvre (${bon.ecran})`);
  t(bon.toasts.some(x => /Hors ligne/.test(x)), `et l'app dit qu'elle travaille hors ligne (« ${bon.toasts.join(' / ')} »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// ── 2) LE VENDEUR ET LES CHIFFRES DE LA BOUTIQUE ──────────────────────
const rapports = p => p.evaluate(() => { goScreen('s-rapports'); renderRpt(); return document.getElementById('s-rapports').innerText; });
{
  const v = await ouvrirCaisse(b, port, nouvelleBoutique(), { vendeur: 'Ibrahim' });
  const txt = await rapports(v.p);
  // innerText suit la mise en forme : les titres de carte sont en capitales.
  t(/Mon activité/i.test(txt) && /réservé au patron/i.test(txt) && !/Bénéfice NET/i.test(txt), 'vendeur sans le droit « rapports » : il voit son activité, jamais le bénéfice');
  const perms = await v.p.evaluate(() => ({ vente: hasPerm('vente'), annuler: hasPerm('annuler'), depenses: hasPerm('depenses'), clients: hasPerm('clients') }));
  t(perms.vente && !perms.annuler && !perms.depenses && !perms.clients, `par défaut un vendeur ne fait QUE vendre (${JSON.stringify(perms)})`);
  await v.ctx.close();
}
{
  const db = nouvelleBoutique(); db.equipe[1].perms = { vente: true, rapports: true };
  const v = await ouvrirCaisse(b, port, db, { vendeur: 'Ibrahim' });
  const txt = await rapports(v.p);
  t(/Bénéfice NET/i.test(txt), 'le patron lui donne « rapports » : il voit le bénéfice');
  await v.ctx.close();
}
{
  const db = nouvelleBoutique(); db.equipe[1].actif = false;
  const v = await ouvrirCaisse(b, port, db, { vendeur: 'Ibrahim' });
  const r = await v.p.evaluate(() => registerVendeurEquipe('Ibrahim'));
  t(r === 'desactive', `un vendeur désactivé par le patron ne rentre plus (${r})`);
  await v.ctx.close();
}
await b.close(); s.close();
fin();
