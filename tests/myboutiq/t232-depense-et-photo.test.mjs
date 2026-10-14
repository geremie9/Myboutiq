// t232 — « METTRE LA PHOTO D'UN ARTICLE DEVIENT COMPLIQUÉ, OU ENREGISTRER
// LES DÉPENSES » (23.15). Mesuré sur la 23.14 :
//   · dépense : le patron n'avait AUCUN bouton dans la caisse — Réglages,
//     70 lignes ; puis une description OBLIGATOIRE à taper, sous la liste ;
//   · photo : un rond de 20 px sur la vignette du Stock, ou l'appui long et
//     un menu de quatorze lignes ; la fiche de l'article n'en disait rien.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t232');
const { s, port } = await serveur();
const b = await chromium.launch();
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  // ── LA DÉPENSE : un bouton, un montant, une catégorie ─────────────────
  const btn = await p.evaluate(() => { const x = document.getElementById('btn-dep'); return !!x && getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().width > 0; });
  t(btn, 'le patron a le bouton « Dépenses » en haut de la caisse');
  if (btn) await p.locator('#btn-dep').click(); else await p.evaluate(() => ouvrirDep());
  await p.waitForTimeout(300);
  const ordre = await p.evaluate(() => { const a = document.getElementById('dep-amt'), l = document.getElementById('dep-lst-cont'), n = document.getElementById('dep-nm');
    return { montantDabord: !!(a.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING), listeApres: !!(a.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING) }; });
  t(ordre.montantDabord && ordre.listeApres, `le montant d'abord, la liste du jour en dessous (${JSON.stringify(ordre)})`);
  await p.locator('#dep-amt').fill('2000');
  await p.locator('#dep-c-transp').click();
  await p.locator('#btn-save-dep').click(); await p.waitForTimeout(300);
  const d = await p.evaluate(() => { const x = DB.depenses[DB.depenses.length - 1]; return x && { nm: x.nm, amt: x.amt, cat: x.cat, caisse: x.caisse }; });
  t(d && d.amt === 2000 && d.cat === 'transp' && d.nm === 'Transport' && d.caisse !== false, `2 000 F de transport, sans rien écrire d'autre : ${JSON.stringify(d)}`);
  const att = await p.evaluate(() => caisseAttendue());
  t(att === -2000 || att === (await p.evaluate(() => (DB.fondsDepart || 0) - 2000)), `et la caisse attendue la déduit (${att})`);
  const lst = await p.evaluate(() => document.getElementById('dep-lst-cont').innerText);
  t(/Transport/.test(lst) && /2\s?000/.test(lst), 'elle apparaît dans la liste du jour, sous le formulaire');
  // Pas de montant : il le dit, et n'enregistre rien.
  const n0 = await p.evaluate(() => DB.depenses.length);
  await p.evaluate(() => { window.__t = []; const st = showToast; showToast = m => __t.push(m); document.getElementById('dep-amt').value = ''; saveDep(); showToast = st; });
  t(await p.evaluate(() => DB.depenses.length) === n0 && /montant/.test(await p.evaluate(() => __t.join(' '))), 'sans montant : rien d\'enregistré, et il le dit');
  // Un nom venu d'un autre téléphone ne s'exécute pas dans la liste.
  await p.evaluate(() => { DB.depenses.push({ id: 'x_1_a', nm: '<img src=x onerror="window.__pwn=1">', amt: 5, cat: 'autre', date: new Date().toLocaleDateString('fr-FR'), ts: new Date().toISOString(), caisse: true }); renderDepLst(); });
  await p.waitForTimeout(200);
  t(!(await p.evaluate(() => window.__pwn)) && !(await p.evaluate(() => document.querySelector('#dep-lst-cont img'))), 'un nom de dépense venu de la synchro reste du texte');
  // 23.16 : le bandeau n'est plus posé par-dessus quoi que ce soit (il est dans la page).
  const z = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById('annonce-banner')); return { pos: cs.position, b: +cs.zIndex || 0, o: +getComputedStyle(document.getElementById('ov-dep')).zIndex }; });
  t(z.pos !== 'fixed' || z.b < z.o, `le bandeau « tes articles peuvent avoir leur photo » ne passe jamais par-dessus une feuille ouverte (${z.pos}, ${z.b} < ${z.o})`);
  await p.evaluate(() => closeSheet('ov-dep'));
  // ── LA PHOTO : depuis la fiche de l'article ─────────────────────────────
  await p.evaluate(() => navTo('stock', document.querySelectorAll('.ni')[1])); await p.waitForTimeout(400);
  const rond = await p.evaluate(() => { const r = document.querySelector('.siphoto'); return r ? Math.round(r.getBoundingClientRect().width) : 0; });
  t(rond >= 28, `le rond « photo » de la liste se touche du doigt (${rond} px)`);
  await p.locator('#stk-lst .sit, .sit').first().click(); await p.waitForTimeout(300);
  const f = await p.evaluate(() => { const b = document.getElementById('stk-photo'); return { vu: !!b && b.offsetWidth > 0, txt: b ? b.textContent : '' }; });
  t(f.vu && /Ajouter une photo|Changer la photo/.test(f.txt), `la fiche de l'article propose la photo (« ${f.txt} »)`);
  await p.evaluate(() => { window.__clic = null; const c = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { window.__clic = this.id; }; });
  await p.locator('#stk-photo').click();
  const ok = await p.evaluate(() => ({ clic: window.__clic, art: artCtx && artCtx.id, cours: artStkCours && artStkCours.id }));
  t(ok.clic === 'inp-photo-real-ctx' && ok.art === ok.cours, `un toucher ouvre le choix de la photo, pour CET article (${JSON.stringify(ok)})`);
  await p.evaluate(() => { window.__clic = null; }); await p.locator('#stk-e').click();
  t(await p.evaluate(() => window.__clic) === 'inp-photo-real-ctx', 'toucher la vignette fait de même');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
// Le vendeur sans le droit « articles » ne change pas les photos.
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { vendeur: 'Ibrahim' });
  const r = await p.evaluate(() => { artStkCours = DB.articles[0]; _majStkPhoto(DB.articles[0]); const x = document.getElementById('stk-photo'); window.__clic = null;
    const c = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { window.__clic = this.id; }; stkPhoto(); return { vu: x.style.display, clic: window.__clic }; });
  t(r.vu === 'none' && r.clic === null, `vendeur : pas de bouton photo, et rien ne s'ouvre (${JSON.stringify(r)})`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
