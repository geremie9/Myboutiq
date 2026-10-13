// t224 — AUTHENTICITÉ ET PROFESSIONNALISME, PREMIÈRE ÉTAPE (23.09).
// « Je parle en termes d'authenticité et de professionnalisme. »
// Mesuré sur la 23.08 : 3 460 emojis dans le fichier, 216 boutons qui
// commencent par un emoji. Ils changent de dessin d'un téléphone à l'autre
// (Tecno, Itel, Samsung) et deviennent des carrés vides sur les vieux
// Android : la même caisse n'a pas le même visage chez deux commerçants.
// Cette étape : la marque en aplats (l'auvent + le Q), la porte, les
// en-têtes et la barre du bas — une seule famille d'icônes au trait.
// Les écrans suivants (caisse, stock, rapports, clients, messages) auront
// leur propre étape ; ce banc garde ce qui est déjà fait.
import { chromium, serveur, compteur, couperInternet } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t224');
const { s, port } = await serveur();
const b = await chromium.launch();
const EMO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2194}-\u{21FF}\u{2328}\u{232B}]/u;
const ENTREE = { role: 'patron', tel: '+237689335389', code: 'MARI0001', nom: 'G', boutiques: [{ code: 'MARI0001', nm: 'G' }] };

// ── 1) LA PORTE ───────────────────────────────────────────────────────
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/politique-confidentialite.html`);
  await p.evaluate(([db, en]) => { localStorage.clear(); localStorage.setItem('mb_clavier_vu', '1');
    localStorage.setItem('myboutiq_v6', JSON.stringify(db)); localStorage.setItem('myboutiq_entree', JSON.stringify(en)); }, [nouvelleBoutique(), ENTREE]);
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(1500);
  const vus = () => p.evaluate(() => { const r = []; const w = document.createTreeWalker(document.getElementById('s-login'), NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const n = w.currentNode, e = n.parentElement; if (e && e.offsetParent && n.textContent.trim()) r.push(n.textContent.trim()); } return r.join(' | '); });
  const txt = await vus();
  const emo = (txt.match(EMO) || [])[0];
  t(!emo, `la porte n'affiche aucun emoji${emo ? ' (« ' + emo + ' » dans : ' + txt.slice(0, 160) + ')' : ''}`);
  const pts = () => p.evaluate(() => { const l = document.querySelectorAll('#er-points i'); return { n: l.length, on: document.querySelectorAll('#er-points i.on').length, vu: !!(document.getElementById('er-points') || {}).offsetParent }; });
  let a = await pts();
  t(a.vu && a.n === 6 && a.on === 0, `les points du PIN : 6 ronds vides, la longueur d'un PIN de patron (${a.on}/${a.n})`);
  for (const k of ['1', '2']) await p.locator(`#er-clavier .kp[data-k="${k}"]`).click();
  a = await pts();
  t(a.on === 2 && a.n === 6, `deux chiffres tapés, deux ronds pleins (${a.on}/${a.n})`);
  for (const k of ['3', '4', '5']) await p.locator(`#er-clavier .kp[data-k="${k}"]`).click();
  a = await pts();
  t(a.on === 5 && a.n === 6, `cinq chiffres : cinq ronds pleins sur six (${a.on}/${a.n})`);
  await p.locator('#kp-eff').click(); await p.locator('#kp-eff').click();
  a = await pts();
  t(a.on === 3 && await p.evaluate(() => document.getElementById('er-pin').value) === '123', `l'effacement vide les ronds avec le champ (${a.on})`);
  await p.evaluate(() => { document.getElementById('er-pin').value = ''; });
  t((await pts()).on === 0, 'le champ vidé par l\'app (mauvais PIN) vide aussi les ronds');
  const c = await p.evaluate(() => ({ t: (document.getElementById('lg-confiance') || {}).innerText || '', v: APP_BUILD }));
  t(/Sauvegarde en ligne/.test(c.t) && c.t.includes('v' + c.v), `la ligne de confiance, avec la version (« ${c.t} »)`);
  const ok = await p.evaluate(() => getComputedStyle(document.getElementById('kp-ok')).backgroundColor);
  t(ok === 'rgb(255, 176, 32)', `le ✓ reste ambre (${ok})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) EN-TÊTES ET BARRE DU BAS, PATRON ET VENDEUR ────────────────────
for (const [qui, opt] of [['patron', {}], ['vendeur', { vendeur: 'Ibrahim' }]]) {
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), opt);
  const r = await p.evaluate(EMOs => {
    const EMO = new RegExp(EMOs, 'u'), mauvais = [];
    document.querySelectorAll('.mhdr .hbtn, .mhdr .hg, .mhdr .hn, .bnav .ni').forEach(e => {
      const tx = (e.innerText || '').trim(); if (EMO.test(tx)) mauvais.push(tx.slice(0, 20));
    });
    const sansIcone = Array.from(document.querySelectorAll('#s-caisse .mhdr .hbtn')).filter(e => e.offsetParent && !e.querySelector('svg')).length;
    const nav = Array.from(document.querySelectorAll('.bnav .ni .ne')).every(e => e.querySelector('svg'));
    return { mauvais, sansIcone, nav };
  }, EMO.source);
  t(!r.mauvais.length, `${qui} : aucun emoji dans les en-têtes ni la barre du bas${r.mauvais.length ? ' (' + r.mauvais.join(', ') + ')' : ''}`);
  t(r.sansIcone === 0 && r.nav, `${qui} : chaque bouton d'en-tête et d'onglet porte son icône au trait`);
  if (qui === 'patron') {
    // Le verrou change d'icône, pas d'emoji : cadenas fermé ↔ crayon.
    const v1 = await p.evaluate(() => { try { majBoutonVerrou(); } catch (e) {} return document.getElementById('btn-verrou').innerHTML; });
    await p.evaluate(() => { try { toggleVerrouVente(); } catch (e) {} });
    await p.waitForTimeout(200);
    const v2 = await p.evaluate(() => document.getElementById('btn-verrou').innerHTML);
    t(/<svg/.test(v1) && /<svg/.test(v2) && v1 !== v2 && !EMO.test(v1 + v2), 'le verrou passe du cadenas au crayon, en icônes');
  }
  t(errs.length === 0, `${qui} : aucune erreur JS` + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3) LA MARQUE A : L'AUVENT EN AMBRE, LE Q EN BLANC, EN APLATS ──────
{
  const ctx = await b.newContext(); const p = await ctx.newPage();
  await couperInternet(p, port);
  await p.goto(`http://127.0.0.1:${port}/politique-confidentialite.html`);
  const px = (f, x, y) => p.evaluate(async ([f, x, y]) => {
    const im = new Image(); im.src = '/' + f + '?' + Math.random(); await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); return Array.from(g.getImageData(x, y, 1, 1).data).slice(0, 3).join();
  }, [f, x, y]);
  // Le premier pan de l'auvent, et le haut de l'anneau du Q (échelle 0,9 dans l'icône).
  const auvent = await px('icon-512.png', 160, 142), q = await px('icon-512.png', 256, 25.6 + 230 * .9 | 0);
  t(auvent === '255,176,32' && q === '255,255,255', `icon-512 : l'auvent ambre, le Q blanc (${auvent} · ${q})`);
  const fond = await px('icon-maskable-512.png', 10, 500);
  t(fond === '36,18,87', `l'icône d'Android : le violet uni du démarrage, sans dégradé (${fond})`);
  await ctx.close();
}
await b.close(); s.close();
fin();
