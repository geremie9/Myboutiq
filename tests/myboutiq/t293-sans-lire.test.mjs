// t293 — QUATRE ÉCRANS QUI DEMANDAIENT DE LIRE (23.76).
// Test d'usage du 23.70, ce qui bloquerait encore un non-lettré ; le patron,
// le 16/11/2026 : « Go et arrange ».
//  1. Le carnet de dettes se lisait par les NOMS (une initiale ronde) → son
//     visage, pris au comptoir, partout où il choisit un client.
//  2. « Ma journée » : « Bénéfice net », « marge 16 % », « Espèces à
//     compter », et « Bénéfice 0 » quand aucun prix d'achat n'est connu.
//  3. Le Stock : « Vendu 30 j : 0 » sous chaque article, « + Entrée » en 9 px.
//  4. Le code PIN tapé en points, et « Note-les » à qui n'écrit pas.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, nombre } from './caisse.mjs';
const { t, fin } = compteur('t293');
const { s, port } = await serveur();
const b = await chromium.launch();
// Une petite image rouge de 4 × 4 : « la photo de Mama Awa ».
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8DAwMDAxMDAAAAvDwMBfU2H0QAAAABJRU5ErkJggg==', 'base64');

// ── 1. Le visage du client ──
{
  const d = nouvelleBoutique();
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  await p.setViewportSize({ width: 360, height: 740 });
  await p.evaluate(() => { navTo('clients', null); ouvrirAddCli(); }); await p.waitForTimeout(300);
  const b0 = await p.evaluate(() => { const x = document.getElementById('cli-ph-btn'); const r = x.getBoundingClientRect(); return { vu: !!x.offsetParent, l: Math.round(r.width), svg: !!x.querySelector('svg'), avantNom: !!(x.compareDocumentPosition(document.getElementById('cli-nm')) & Node.DOCUMENT_POSITION_FOLLOWING) }; });
  t(b0.vu && b0.l >= 80 && b0.svg && b0.avantNom, `« Nouveau client » : un grand appareil photo rond (${b0.l} px), avant même le nom`);
  await p.evaluate(() => cliPhotoPrendre('neuf'));
  await p.setInputFiles('#inp-cli-photo', { name: 'awa.png', mimeType: 'image/png', buffer: PNG });
  await p.waitForFunction(() => !!document.querySelector('#cli-ph-btn img'), null, { timeout: 5000 }).catch(() => {});
  await p.evaluate(() => { document.getElementById('cli-nm').value = 'Mama Bertine'; document.getElementById('cli-cred').value = '2500'; saveCli(); }); await p.waitForTimeout(300);
  const c = await p.evaluate(() => { const cl = DB.clients.find(x => x.nm === 'Mama Bertine'); const st = JSON.parse(localStorage.getItem('myboutiq_v6')).clients.find(x => x.nm === 'Mama Bertine');
    const ligne = [...document.querySelectorAll('#cli-cont .cit')].find(x => /Mama Bertine/.test(x.textContent));
    return { ph: (cl && cl.ph || '').slice(0, 22), taille: (cl && cl.ph || '').length, sauve: !!(st && st.ph), img: !!(ligne && ligne.querySelector('.cav.ph img')), awa: !!([...document.querySelectorAll('#cli-cont .cit')].find(x => /Awa/.test(x.textContent)) || {}).querySelector };
  });
  t(c.ph === 'data:image/jpeg;base64' && c.taille < 20000 && c.sauve, `sa photo est gardée avec la boutique, réduite (${c.taille} caractères), et voyage avec elle`);
  t(c.img, 'dans le carnet, Mama Bertine a son visage au lieu d\'un « M »');
  await p.evaluate(() => ouvrirDetCli(DB.clients.find(x => x.nm === 'Mama Bertine').id)); await p.waitForTimeout(300);
  const det = await p.evaluate(() => ({ img: !!document.querySelector('#cli-det-ph img'), gros: document.getElementById('cli-det-gros').textContent, fs: parseFloat(getComputedStyle(document.getElementById('cli-det-gros')).fontSize) }));
  t(det.img && nombre(det.gros) === 2500 && det.fs >= 26, `sa fiche : son visage, et ce qu'il doit en grand (${det.gros}, ${det.fs} px)`);
  // Awa (sans photo) : toucher son rond pour la prendre.
  await p.evaluate(() => { closeSheet('ov-cli-det'); ouvrirDetCli(DB.clients.find(x => x.nm === 'Awa').id); cliPhotoPrendre('det'); });
  await p.setInputFiles('#inp-cli-photo', { name: 'a.png', mimeType: 'image/png', buffer: PNG });
  await p.waitForFunction(() => !!(DB.clients.find(x => x.nm === 'Awa') || {}).ph, null, { timeout: 5000 }).catch(() => {});
  t(await p.evaluate(() => !!DB.clients.find(x => x.nm === 'Awa').ph && !!document.querySelector('#cli-det-ph img')), 'un client déjà inscrit : on touche son rond, on prend sa photo');
  // Au moment de vendre à crédit : « Quel client ? » montre les visages.
  await p.evaluate(() => { closeSheet('ov-cli-det'); renderClientVenteList(); document.getElementById('ov-client-vente').classList.add('show'); }); await p.waitForTimeout(200);
  t(await p.evaluate(() => document.querySelectorAll('#client-vente-list .cav.ph img').length === 2), '« Quel client ? » : les visages devant les noms');
  // Une adresse qui ne vient pas de chez nous n'est jamais posée (srcSure).
  const sur = await p.evaluate(() => { const cl = DB.clients.find(x => x.nm === 'Awa'); cl.ph = 'https://pirate.example/x.jpg"><script>1</script>'; renderClients(); renderClientVenteList(); return document.getElementById('cli-cont').innerHTML.indexOf('pirate') < 0 && document.getElementById('client-vente-list').innerHTML.indexOf('pirate') < 0; });
  t(sur, 'une photo venue d\'ailleurs par la synchro (autre site) ne s\'affiche pas');
  t(errs.length === 0, 'aucune erreur JS (clients)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2. Ma journée sans jargon ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await vendre(p, { lignes: [[2, 2]] });
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); try { fermerSucces(); } catch (e) {} navTo('rapports', null); }); await p.waitForTimeout(500);
  // 23.78 — le patron : « l'essentiel est masqué, les écritures petit petit ».
  // Tout est visible, en grand.
  const r = await p.evaluate(() => { const c = document.getElementById('rpt-cont');
    const vu = sel => { const e = c.querySelector(sel); return !!e && !!e.offsetParent && !e.closest('details:not([open])'); };
    return { titres: [...c.querySelectorAll('.rpt-ess > div > span')].map(x => x.textContent.trim()), fs: parseFloat(getComputedStyle(c.querySelector('.rpt-ess span')).fontSize), txt: c.innerText,
      lbl: parseFloat(getComputedStyle(c.querySelector('.rpt-gagne .rlbl')).fontSize), gros: parseFloat(getComputedStyle(c.querySelector('.rpt-ess > div:first-child b')).fontSize),
      replie: !c.querySelector('details.rpt-det'), garde: vu('.rpt-gagne') && vu('.rpt-paye') && vu('.rpt-top') && /Espèces en caisse/.test(c.innerText) && /gagné \(après dépenses\)/i.test(c.innerText) }; });
  t(r.titres.join(',') === "J'ai vendu,J'ai gagné,Dans la caisse" && r.fs >= 15 && r.gros >= 32, `les trois questions qu'il se pose : ${r.titres.join(' · ')} (titres ${r.fs} px, « J'ai vendu » en ${r.gros} px)`);
  t(!/Bénéfice net|Chiffre d'affaires|Coût des ventes/i.test(r.txt), 'plus de « Bénéfice net », « Chiffre d\'affaires » ni « Coût des ventes »');
  t(r.replie && r.garde && r.lbl >= 15, `rien de caché : meilleurs articles, comment on m'a payé, comment j'ai gagné, à compter — tout visible, en ${r.lbl} px`);
  // Sans aucun prix d'achat : « ? », jamais un faux zéro.
  await p.evaluate(() => { DB.ventes = []; DB.articles.find(a => a.id === 7).pa = 0; save(); }); await vendre(p, { lignes: [[7, 4]] });
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); try { fermerSucces(); } catch (e) {} navTo('rapports', null); }); await p.waitForTimeout(500);
  const g = await p.evaluate(() => { const d = [...document.querySelectorAll('.rpt-ess > div')][1]; return { b: d.querySelector('b').textContent.trim(), i: (d.querySelector('i') || {}).textContent || '', tap: d.getAttribute('onclick') || '' }; });
  t(g.b === '?' && /prix d.achat/.test(g.i) && /ouvrirReparerBenefice/.test(g.tap), `Piment sans prix d'achat : « J'ai gagné ? » (pas 0), et le toucher mène à la réparation (« ${g.b} · ${g.i} »)`);
  t(errs.length === 0, 'aucune erreur JS (Ma journée)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3. Le Stock ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  await p.evaluate(() => navTo('stock', null)); await p.waitForTimeout(600);
  const st = await p.evaluate(() => ({ txt: document.getElementById('s-stock').innerText, plus: document.querySelectorAll('#s-stock .si-plus').length, n: document.querySelectorAll('#s-stock .sit').length }));
  t(!/Vendu 30 j|\+ Entrée/.test(st.txt), 'plus de « Vendu 30 j : 0 » ni de « + Entrée » à lire sous chaque article');
  t(st.plus === st.n && st.n === 7, `un rond « + » par article (${st.plus} / ${st.n})`);
  t(/prix d'achat \?/.test(st.txt), 'Piment : « prix d\'achat ? »');
  t(errs.length === 0, 'aucune erreur JS (Stock)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 4. Le code PIN ──
{
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(1200);
  const pin = await p.evaluate(() => { const i = document.getElementById('ob-pin'), a = document.getElementById('ob-pin-aide');
    return { type: i.type, fs: parseFloat(getComputedStyle(i).fontSize), aide: a.textContent, afs: parseFloat(getComputedStyle(a).fontSize) }; });
  t(pin.type !== 'password' && pin.fs >= 22, `les chiffres se voient en grand pendant qu'il les choisit (champ ${pin.type}, ${pin.fs} px)`);
  t(!/Note-les/.test(pin.aide) && /clé/.test(pin.aide) && pin.afs >= 14, `« ${pin.aide} » (${pin.afs} px), plus « Note-les »`);
  await ctx.close();
}
await b.close(); s.close();
fin();
