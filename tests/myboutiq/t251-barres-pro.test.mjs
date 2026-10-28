// t251 — « Ces boutons n'ont pas un visuel pro ou premium. » (23.34)
// Avant : cinq carrés gris sans un mot en haut de la caisse (un portefeuille
// pour « Dépenses », un crayon orange illisible), « Sortir » qui renvoyait le
// patron au code PIN d'un toucher, sans question, sur QUATRE écrans ; « + »
// seul qui couvrait le prix du carton de la dernière tuile.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t251');
const { s, port } = await serveur();
const b = await chromium.launch();
const tete = p => p.evaluate(() => {
  const vis = e => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
  const nm = document.getElementById('u-nm');
  return {
    nom: nm.textContent, taille: parseFloat(getComputedStyle(nm).fontSize), coupe: nm.scrollWidth > nm.clientWidth + 1 || nm.scrollHeight > nm.clientHeight + 1,
    logo: document.getElementById('h-logo').textContent, qui: document.getElementById('h-qui').textContent,
    mots: [...document.querySelectorAll('#s-caisse .mhdr .hbtn')].filter(vis).map(x => (x.querySelector('.hl') || {}).textContent || '?'),
    haut: Math.round(document.querySelector('#s-caisse .mhdr').getBoundingClientRect().height)
  };
});

// ── 1. Le patron ──
{
  const db = nouvelleBoutique(); db.cfg.venteDeverrouillee = false;
  db.clients[0].credit = 5000; db.clients[0].date = new Date().toISOString().slice(0, 10);
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(400);
  await p.evaluate(() => { try { majBoutonVerrou(); majEnteteCaisse(); } catch (e) {} });
  const h = await tete(p);
  t(h.nom === 'Ets Marie' && h.logo === 'M' && h.qui === 'Patron' && h.taille >= 15 && !h.coupe,
    `le nom de la boutique en grand (${h.taille} px), son initiale « ${h.logo} », « ${h.qui} » dessous`);
  t(h.mots.join(',') === 'Dépense,Bloqué,Alertes,Réglages', `une icône et son mot : ${h.mots.join(' · ')} — plus de « Sortir » d'un toucher`);
  t(h.haut <= 72, `toujours une seule rangée (${h.haut} px)`);
  await p.locator('#btn-verrou').tap(); await p.waitForTimeout(250);
  const v = await p.evaluate(() => { const x = document.getElementById('btn-verrou'); return { mot: x.querySelector('.hl').textContent, on: x.classList.contains('on'), svg: !!x.querySelector('svg') }; });
  t(v.mot === 'Modifier' && v.on && v.svg, `le verrou dit son état : « ${v.mot} », allumé`);
  const nav = await p.evaluate(() => {
    const on = document.querySelector('#s-caisse .bnav .ni.on'), ne = on.querySelector('.ne');
    return { pilule: getComputedStyle(ne).backgroundColor, barre: getComputedStyle(on, '::before').display, cli: document.body.classList.contains('cli-a-faire') };
  });
  t(nav.pilule !== 'rgba(0, 0, 0, 0)' && nav.barre === 'none', `l'onglet actif posé dans une pilule (${nav.pilule}), plus de trait au-dessus`);
  t(nav.cli, 'une dette à échéance marque l\'onglet Clients');
  // « + Article » ne cache plus la dernière tuile
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); window.scrollTo(0, document.body.scrollHeight); });
  await p.waitForTimeout(300);
  const f = await p.evaluate(() => {
    const fab = document.getElementById('fab-add'), r = fab.getBoundingClientRect();
    const tuiles = [...document.querySelectorAll('#pgrid .pcard:not(.etg)')], der = tuiles[tuiles.length - 1].getBoundingClientRect();
    return { mot: fab.textContent.replace(/\s+/g, ''), libre: der.bottom <= r.top || der.right <= r.left };
  });
  t(f.mot === '+Article' && f.libre, `« + Article », et la dernière tuile se lit en entier au bout de la liste`);
  // Les autres écrans : même style, et toujours pas de sortie d'un toucher
  const autres = await p.evaluate(() => ['s-stock', 's-rapports', 's-clients'].map(id => {
    const sc = document.getElementById(id);
    const b = [...sc.querySelectorAll('.mhdr .hbtn')];
    return id + ':' + b.filter(x => x.style.display !== 'none' && getComputedStyle(x).display !== 'none').map(x => (x.querySelector('.hl') || {}).textContent || '?').join('/')
      + (sc.querySelector('.mhdr').classList.contains('pro') ? '' : ':pas-pro');
  }));
  t(autres.every(x => !/Sortir|\?|pas-pro/.test(x)), `Stock, Rapports, Clients : des mots, pas de « Sortir » (${autres.join(' · ')})`);
  t(errs.length === 0, 'aucune erreur JS (patron)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2. Fermer la caisse depuis les Réglages : avec une question ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await p.evaluate(() => { window.__q = 0; window.confirm = () => { window.__q++; return false; }; goSt(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => fermerCaisseDepuisReglages()); await p.waitForTimeout(200);
  const r1 = await p.evaluate(() => ({ q: window.__q, ecran: document.querySelector('.scr.on') && document.querySelector('.scr.on').id }));
  await p.evaluate(() => { window.confirm = () => true; fermerCaisseDepuisReglages(); }); await p.waitForTimeout(300);
  const r2 = await p.evaluate(() => document.querySelector('.scr.on') && document.querySelector('.scr.on').id);
  t(r1.q === 1 && r1.ecran === 's-settings' && r2 === 's-login', `une question d'abord (« Non » : on reste, ${r1.ecran}), puis le code (${r2})`);
  t(errs.length === 0, 'aucune erreur JS (fermer)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3. Le vendeur ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true, vendeur: 'Paul' });
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(400);
  const h = await tete(p);
  t(h.nom === 'Ets Marie' && h.qui === 'Vendeur · Paul', `le vendeur voit la boutique, et qui tient la caisse : « ${h.nom} », « ${h.qui} »`);
  t(h.mots.join(',') === 'Écran,Ventes,Alertes,Sortir', `ses boutons, avec leurs mots : ${h.mots.join(' · ')}`);
  await p.locator('#btn-sortir').tap(); await p.waitForTimeout(300);
  t(await p.evaluate(() => document.querySelector('.scr.on').id === 's-login'), 'sur un téléphone partagé, il sort d\'un toucher, comme avant');
  t(errs.length === 0, 'aucune erreur JS (vendeur)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 4. Un nom long, et l'anglais ──
{
  const db = nouvelleBoutique(); db.cfg.nom = 'Alimentation La Grâce de Dieu';
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(400);
  await p.evaluate(() => majEnteteCaisse());
  const h = await tete(p);
  t(h.logo === 'AG' && !h.coupe && h.taille >= 13 && h.haut <= 72, `un nom long se lit en entier, sur deux lignes en ${h.taille} px plutôt qu'une en 10 px ; initiales « ${h.logo} », en-tête ${h.haut} px`);
  await p.evaluate(() => { setLang('en'); try { majBoutonVerrou(); majEnteteCaisse(); } catch (e) {} });
  const en = await tete(p);
  t(en.mots.includes('Expense') && en.mots.includes('Settings') && en.qui === 'Owner', `en anglais : ${en.mots.join(' · ')} · ${en.qui}`);
  t(errs.length === 0, 'aucune erreur JS (nom long, anglais)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
