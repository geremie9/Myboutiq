// t277 — CHANGER DE BOUTIQUE SANS ACCROC, ET LE RELEVÉ EN VRAI PDF (23.58).
// Le patron, le 15/11 : « on n'arrive pas à changer de boutique, même quand
// il y a le réseau, souvent ça perturbe » ; « pour le relevé d'activité, il
// fallait un enregistrement en PDF ». Rejoué contre le faux serveur :
// la session serveur perdue faisait dire « Tu n'as qu'une seule boutique »
// à un patron qui en a trois ; la liste attendait l'envoi complet de la
// boutique en cours ; une boutique aux ventes pas encore parties était
// quittée — et effacée du téléphone. Le bouton « Imprimer / PDF », lui,
// ne fait rien dans l'app Android (pas d'impression dans une TWA).
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
import { fauxSupaScript } from './faux-supa.mjs';
const { t, fin } = compteur('t277');
const { s, port } = await serveur();
const b = await chromium.launch();

const DF = 'df1b5116-4d51-44d4-b973-bd31becabb3d', MAIL = 'owner-237689335389@myboutiq.app';
const BOUT = [['Ets Marie', 'MARI0001'], ['Ets Marie 2', '22222 33333'], ['Dépôt Akwa', '44444 55555']];
const rangee = ([nom, code], i) => { const d = nouvelleBoutique(); d.cfg.nom = nom; d.cfg.code = code; delete d.cfg.pin;
  return { id: 'r' + i, code, nom, owner_id: DF, actif: true, plan: 'gratuit', updated_at: new Date(Date.now() - i * 36e5).toISOString(), data: d, pin_vendeur_clair: null }; };
async function telephone({ session = true, pinIci = '123456' } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR', timezoneId: 'Africa/Douala' });
  await ctx.addInitScript(fauxSupaScript());
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/politique-confidentialite.html`);
  const ici = nouvelleBoutique(); ici.cfg.pin = pinIci; ici.cfg.tel = '+237689335389'; ici.cfg.ownerEmail = MAIL; ici.cfg.facon = 'detail';
  await p.evaluate(([db, gardees]) => { localStorage.clear(); localStorage.setItem('myboutiq_v6', JSON.stringify(db));
    localStorage.setItem('myboutiq_entree', JSON.stringify({ role: 'patron', tel: '+237689335389', code: 'MARI0001', boutiques: gardees })); },
    [ici, BOUT.map(([nom, code]) => ({ nom, code }))]);
  await p.goto(`http://127.0.0.1:${port}/index.html`);
  await p.evaluate(([rows, DF, session]) => { __fs.boutiques = rows; rows.forEach(r => { __fs.pins[r.code] = '123456'; });
    __fs.comptes['owner-237689335389@myboutiq.app'] = { id: DF, pin: '123456' }; __fs.session = session ? { user: { id: DF, email: 'owner-237689335389@myboutiq.app' } } : null; __fs.latence = 150;
    window.__toasts = []; const st = window.showToast; window.showToast = function (m) { window.__toasts.push(String(m)); try { return st.apply(this, arguments); } catch (e) {} }; },
    [BOUT.map(rangee), DF, session]);
  await p.evaluate(() => { try { role = 'patron'; lancerApp(); } catch (e) {} }); await p.waitForTimeout(900);
  return { ctx, p, errs };
}
const lignes = p => p.evaluate(() => document.querySelectorAll('#ov-choixb.show #cb-lst > button').length);
const etat = p => p.evaluate(() => ((document.getElementById('cb-etat') || {}).textContent || '') + ' / ' + __toasts.join(' / '));

// 1. La session est là : la liste s'ouvre tout de suite, puis se met à jour.
{
  const { ctx, p, errs } = await telephone();
  await p.evaluate(() => { __fs.latence = 1500; });                    // un réseau qui traîne
  const t0 = Date.now(); p.evaluate(() => changerDeBoutique()).catch(() => {});
  await p.waitForFunction(() => !!document.querySelector('#ov-choixb.show'), null, { timeout: 5000 }).catch(() => {});
  const dt = Date.now() - t0;
  t(dt < 700 && (await lignes(p)) === 3, `la liste s'ouvre tout de suite, avec les boutiques gardées sur le téléphone (${dt} ms, ${await lignes(p)})`);
  await p.waitForFunction(() => !(document.getElementById('cb-etat') || {}).textContent, null, { timeout: 15000 }).catch(() => {});
  t(!/une seule boutique/.test(await etat(p)) && (await lignes(p)) === 3, `puis la liste du serveur la remplace, sans message faux (« ${await etat(p)} »)`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// 2. La session s'est perdue : elle se refait en silence avec le PIN d'ici.
{
  const { ctx, p, errs } = await telephone({ session: false });
  await p.evaluate(() => changerDeBoutique()); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ sess: !!__fs.session, txt: __toasts.join(' / ') }));
  t(r.sess && (await lignes(p)) === 3 && !/une seule boutique/.test(r.txt), `session perdue : refaite avec le PIN du téléphone, ses 3 boutiques sont là (avant : « Tu n'as qu'une seule boutique »)`);
  await ctx.close();
}
// 3. Le PIN a changé ailleurs : on le lui dit, au lieu d'un faux « une seule boutique ».
{
  const { ctx, p } = await telephone({ session: false, pinIci: '999999' });
  await p.evaluate(() => changerDeBoutique()); await p.waitForTimeout(1500);
  const e = await etat(p);
  t(/se reconnecter/.test(e) && !/une seule boutique/.test(e), `son PIN a changé sur un autre téléphone : « ${e.slice(0, 90)} »`);
  await ctx.close();
}
// 4. Des ventes pas encore parties : on ne quitte pas la boutique.
{
  const { ctx, p, errs } = await telephone();
  await vendre(p, { lignes: [[2, 1]] });
  const nv = await p.evaluate(() => DB.ventes.length);
  // ⚠️ PANNE SIMULÉE : l'envoi échoue (réseau coupé au moment de partir).
  // La vente vient d'être faite : le drapeau « en attente » ne le sait pas
  // encore — c'est exactement le cas qui perdait la vente.
  await p.evaluate(() => { _offlinePending = false; window.syncToSupa = async function () { return false; }; });
  await p.evaluate(() => changerDeBoutique()); await p.waitForTimeout(1200);
  await p.evaluate(() => { const x = [...document.querySelectorAll('#cb-lst > button')].find(e => /44444 55555/.test(e.innerText)); if (x) x.click(); });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ code: DB.cfg.code, nv: DB.ventes.length, ici: JSON.parse(localStorage.getItem('myboutiq_v6')).cfg.code, e: (document.getElementById('cb-etat') || {}).textContent || '' }));
  t(r.code === 'MARI0001' && r.ici === 'MARI0001' && r.nv === nv, `ses ventes ne sont pas parties : il reste sur « Ets Marie », rien n'est effacé (${r.code}, ${r.nv} ventes)`);
  t(/pas encore parties/.test(r.e), `et il sait pourquoi (« ${r.e.slice(0, 80)} »)`);
  // Le réseau revient : l'envoi passe, la boutique s'ouvre.
  await p.evaluate(() => { window.syncToSupa = async function () { return true; }; });
  await p.evaluate(() => { const x = [...document.querySelectorAll('#cb-lst > button')].find(e => /44444 55555/.test(e.innerText)); if (x) x.click(); });
  await p.waitForFunction(() => DB && DB.cfg && DB.cfg.code === '44444 55555', null, { timeout: 15000 }).catch(() => {});
  t(await p.evaluate(() => DB.cfg.code) === '44444 55555', 'ses ventes parties, « Dépôt Akwa » s\'ouvre');
  t(errs.length === 0, 'aucune erreur JS (ventes en attente)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// 5. Le réseau trop lent : une fin, et un message vrai.
{
  const { ctx, p } = await telephone();
  await p.evaluate(() => { localStorage.setItem('myboutiq_entree', JSON.stringify({ role: 'patron', tel: '+237689335389', code: 'MARI0001' })); __fs.latence = 20000; });
  await p.evaluate(() => changerDeBoutique()); await p.waitForTimeout(13500);
  const e = await etat(p);
  t(/trop lent/.test(e) && !/une seule boutique/.test(e), `réseau qui ne répond pas : au bout de 12 s, « ${e.slice(-80)} »`);
  await ctx.close();
}

// 6. Le relevé : un vrai PDF, fabriqué dans le téléphone.
{
  const db = nouvelleBoutique(); db.cfg.facon = 'detail'; db.cfg.nom = 'Ets « Marie » & Fils';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  for (let i = 0; i < 2; i++) await vendre(p, { lignes: [[2, 2], [3, 1]] });
  const r = await p.evaluate(() => {
    if (typeof _pdfReleve !== 'function') return {};          // l'ancienne app
    ouvrirReleve(); const d = _relDonnees; const u = _pdfReleve(d); const txt = Array.from(u, c => String.fromCharCode(c)).join('');
    // chaque objet est bien là où la table des renvois le dit
    const x = /startxref\n(\d+)/.exec(txt), off = x ? +x[1] : -1;
    const tbl = txt.slice(off).split('\n').slice(3).filter(l => / 00000 n $/.test(l)).map(l => +l.slice(0, 10));
    const juste = tbl.length > 3 && tbl.every((o, i) => txt.slice(o, o + 12).startsWith((i + 1) + ' 0 obj'));
    return { debut: txt.slice(0, 8), fin: /%%EOF$/.test(txt), juste, accents: txt.indexOf('(Relev\\351 d\\222activit\\351)') >= 0, nom: _nomPdfReleve(d),
      bouton: (document.getElementById('rel-pdf') || {}).textContent || '' };
  });
  t(r.debut === '%PDF-1.4' && r.fin && r.juste, `un fichier PDF valide : en-tête, table des renvois juste, fin (${r.debut})`);
  t(r.accents, 'les accents et l\'apostrophe du français sont écrits dans la police du PDF');
  t(/^releve-ets-marie-fils-\d{4}-\d\d-\d\d\.pdf$/.test(r.nom) && /PDF/.test(r.bouton), `il s'appelle « ${r.nom} », le bouton dit « ${r.bouton.trim()} »`);
  // Partagé quand le téléphone sait partager un fichier…
  const sh = await p.evaluate(async () => { if (typeof enregistrerRelevePDF !== 'function') return null; let f = null; navigator.canShare = () => true; navigator.share = async o => { f = o.files[0]; };
    await enregistrerRelevePDF(); return f ? { nom: f.name, type: f.type, taille: f.size } : null; });
  t(sh && sh.type === 'application/pdf' && sh.taille > 1500, `partagé (WhatsApp, Drive…) : ${sh && sh.nom}, ${sh && sh.taille} octets`);
  // …enregistré sinon.
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await p.evaluate(() => { navigator.canShare = undefined; if (typeof enregistrerRelevePDF === 'function') enregistrerRelevePDF(); });
  const f = await dl;
  t(!!f && /\.pdf$/.test(f.suggestedFilename()), `sans partage, il va dans les téléchargements (${f && f.suggestedFilename()})`);
  t(errs.length === 0, 'aucune erreur JS (relevé)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close(); fin();
