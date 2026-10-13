// t225 — LA CAISSE SANS EMOJI (23.10), DEUXIÈME ÉTAPE DE LA REFONTE « PRO ».
// Relevé sur la 23.09 pendant une vente ordinaire (patron, vendeur, panier,
// variantes, paiement, boutique en gros) : 86 emplacements avec un emoji —
// « 🔍 Chercher… », « 🎤 », « ⭐ Tout », « 🍖 Alimentation », « 💰 Autre »,
// « 📲 », « ⚠️ », « 🖼️ … 💬 Dis-moi », « 📦 carton de 24 », « 💵 Encaisser »,
// les ronds 🟠 🟡 🔵 des opérateurs, « ✅ Confirmer la vente »…
// Les ✕ et ✓ restent : ce sont des caractères de texte, dessinés pareil
// sur tous les téléphones (les emojis, eux, changent de visage d'un Tecno
// à un Samsung, et deviennent des carrés vides sur les vieux Android).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t225');
const { s, port } = await serveur();
const b = await chromium.launch();
// Emojis et pictogrammes colorés ; PAS ✓ (U+2713) ni ✕ (U+2715).
const EMO = '[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{2712}\\u{2714}\\u{2716}-\\u{27BF}\\u{2B50}\\u{2B06}\\u{2194}-\\u{21FF}\\u{2328}\\u{232B}]';
const releve = p => p.evaluate(EMO => {
  const re = new RegExp(EMO, 'u'), out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode, e = n.parentElement;
    if (!e || (!e.offsetParent && getComputedStyle(e).position !== 'fixed')) continue;
    const r = e.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
    if (e.closest('#toast')) continue;                 // les messages : leur propre étape
    if (re.test(n.textContent)) out.push((e.id || e.className || e.tagName) + ' « ' + n.textContent.trim().slice(0, 30) + ' »');
  }
  return [...new Set(out)];
}, EMO);
const HUILE = { id: 30, nm: 'Huile', e: '🫗', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: [{ id: 1, nm: '1 L', px: 900, pa: 700, stk0: 48, umSac: 12, umCont: 'carton', pxGros: 10000 }, { id: 2, nm: '5 L', px: 4000, pa: 3400, stk0: 8 }] };

{
  const d = nouvelleBoutique(); d.cfg.venteDeverrouillee = false; d.articles.push(HUILE);
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  let r = await releve(p);
  t(!r.length, `la caisse : aucun emoji${r.length ? ' — ' + r.slice(0, 5).join(' · ') : ''}`);
  const ui = await p.evaluate(() => ({ ph: document.getElementById('src-c').placeholder, ic: !!document.querySelector('.sbar2 .sinp-ic'),
    mic: !!document.querySelector('#btn-mic svg'), cats: Array.from(document.querySelectorAll('#tabs-c .tpil')).map(x => x.textContent),
    sec: document.getElementById('sec-lbl').textContent }));
  t(ui.ph === 'Chercher un article' && ui.ic && ui.mic, `la recherche : « ${ui.ph} », sa loupe et son micro dessinés`);
  t(ui.cats[0] === 'Tout' && ui.cats.includes('Alimentation') && ui.sec === 'Tous les articles', `les catégories en mots (${ui.cats.join(', ')}) · « ${ui.sec} »`);
  await p.evaluate(() => { addPanier(DB.articles.find(a => a.id === 1), null); addPanier(DB.articles.find(a => a.id === 6), null); });
  await p.waitForTimeout(250);
  r = await releve(p);
  t(!r.length, `avec un panier : aucun emoji${r.length ? ' — ' + r.slice(0, 5).join(' · ') : ''}`);
  t(await p.evaluate(() => document.getElementById('btn-enc').textContent.trim()) === 'Encaisser', '« Encaisser », en toutes lettres');
  await p.locator('#pc-30 .pnm-ov').click(); await p.waitForTimeout(500);
  r = await releve(p);
  t(!r.length, `les variantes (et les suggestions dessous) : aucun emoji${r.length ? ' — ' + r.slice(0, 5).join(' · ') : ''}`);
  t(await p.evaluate(() => document.querySelector('.vinline-t').textContent) === 'Huile', 'le panneau dit « Huile », sans l\'emoji de l\'article');
  await p.evaluate(() => { try { fermerVarInline(); } catch (e) {} procederPmt(); });
  await p.waitForTimeout(500);
  r = await releve(p);
  t(!r.length, `le paiement : aucun emoji${r.length ? ' — ' + r.slice(0, 5).join(' · ') : ''}`);
  const pm = await p.evaluate(() => ({
    pts: Array.from(document.querySelectorAll('#ov-calc .pmnt-grid .pm-pt')).map(x => getComputedStyle(x).backgroundColor),
    esp: !!document.querySelector('#pmv-especes svg'), cre: !!document.querySelector('#pmv-credit svg'),
    tit: document.getElementById('ov-calc-t').textContent, ok: document.getElementById('btn-conf-vente').innerText.trim() }));
  t(pm.pts.join() === 'rgb(255, 121, 0),rgb(255, 204, 0),rgb(15, 108, 189)' && pm.esp && pm.cre,
    `Orange, MTN, Moov en pastilles de leur couleur ; espèces et crédit dessinés (${pm.pts.join(' / ')})`);
  t(pm.tit === 'Monnaie à rendre' && pm.ok === 'Confirmer la vente', `« ${pm.tit} » · « ${pm.ok} »`);
  // La vente passe toujours, au même prix : on n'a touché qu'au dessin.
  await p.evaluate(() => encaisser()); await p.waitForTimeout(500);
  const v = await p.evaluate(() => { const x = DB.ventes[DB.ventes.length - 1]; return x && { tot: x.total, mode: x.paiement && x.paiement.mode }; });
  t(!!v && v.tot === 1250 && v.mode === 'especes', `la vente est enregistrée comme avant (${JSON.stringify(v)})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
{
  const d = nouvelleBoutique(); d.cfg.facon = 'gros'; d.cfg.venteDeverrouillee = false;
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  const r = await releve(p);
  t(!r.length, `boutique en gros : aucun emoji${r.length ? ' — ' + r.slice(0, 5).join(' · ') : ''}`);
  t(await p.evaluate(() => !!document.querySelector('#pc-6 .pbarre svg.g-svg')), 'la barre du carton porte la boîte dessinée');
  // Hors réseau, le bandeau dit son état avec une icône, pas un emoji.
  await p.evaluate(() => { try { majConnexion && majConnexion(); } catch (e) {} const b = document.getElementById('conn-bar'); if (b) b.style.display = 'flex'; });
  t(await p.evaluate(() => !!document.querySelector('#conn-ico svg')), 'le bandeau de connexion : une icône dessinée');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { vendeur: 'Ibrahim' });
  const r = await releve(p);
  t(!r.length, `le vendeur : aucun emoji${r.length ? ' — ' + r.slice(0, 5).join(' · ') : ''}`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
