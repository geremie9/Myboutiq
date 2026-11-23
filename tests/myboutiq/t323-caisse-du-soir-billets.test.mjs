// t323 — LA CAISSE DU SOIR AVEC LES BILLETS (24.06).
// « Servir une communauté non lettrée, moins à l'aise avec les outils. » La
// clôture demandait « Compte tes billets, tape le total » : additionner de
// tête toute la caisse, puis taper un grand nombre. Le soir, comme à la vente
// (23.40) : une ligne par billet et par pièce, toucher = un billet compté.
// En vrais clics, au doigt, sur 360×640.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t323');
const { s, port } = await serveur();
const b = await chromium.launch();
const ecart = p => p.evaluate(() => ({ vu: document.getElementById('ecart-cd').style.display !== 'none', lbl: document.getElementById('ecart-lbl').textContent, amt: document.getElementById('ecart-amt').textContent.replace(/[  \s]/g, '') }));
const toucher = async (p, v, n = 1, moins = false) => { for (let i = 0; i < n; i++) await p.tap(`#clot-bil .cb-l[data-v="${v}"] ${moins ? '.cb-m' : '.cb-b'}`); };

// ── 1) COMPTER SA CAISSE EN TOUCHANT LES BILLETS ──────────────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique({ fondsDepart: 5000 }), { tactile: true });
  await p.setViewportSize({ width: 360, height: 640 });
  await vendre(p, { lignes: [[2, 1]] }); await vendre(p, { lignes: [[3, 1]] }); await vendre(p, { lignes: [[4, 2]] });   // 600 + 650 + 2 600
  const att = await p.evaluate(() => caisseAttendue());
  t(att === 8850, `caisse attendue : 5 000 de fonds + 3 850 de ventes = ${att}`);
  await p.evaluate(() => ouvrirClot()); await p.waitForTimeout(300);
  const lignes = await p.evaluate(() => [...document.querySelectorAll('#clot-bil .cb-l')].map(l => Number(l.dataset.v)));
  t(lignes.join(',') === '10000,5000,2000,1000,500,100,50,25', `une ligne par billet et par pièce : ${lignes.join(' · ')}`);
  const tailles = await p.evaluate(() => [...document.querySelectorAll('#clot-bil .cb-m, #clot-bil .cb-b')].map(e => { const r = e.getBoundingClientRect(); return Math.min(Math.round(r.width), Math.round(r.height)); }));
  t(Math.min(...tailles) >= 48, `chaque touche tient un doigt (plus petit côté : ${Math.min(...tailles)} px)`);
  // Ses piles : 1 × 5 000, 1 × 2 000, 1 × 1 000, 1 × 500, 3 × 100, 1 × 50 = 8 850
  await toucher(p, 5000); await toucher(p, 2000); await toucher(p, 1000); await toucher(p, 500); await toucher(p, 100, 3); await toucher(p, 50);
  let e = await ecart(p);
  t(await p.evaluate(() => document.getElementById('inp-compt').value) === '8850', 'le total s\'écrit seul : 8 850');
  t(e.vu && /Équilibrée/.test(e.lbl), `l'écart se fait seul : « ${e.lbl} ${e.amt} »`);
  t(await p.evaluate(() => /×3/.test(document.querySelector('#clot-bil .cb-l[data-v="100"] .cb-n').textContent) && /300/.test(document.querySelector('#clot-bil .cb-l[data-v="100"] .cb-t').textContent.replace(/[  \s]/g, ''))), 'la ligne des 100 dit « ×3 » et 300');
  // Il s'est trompé d'une pièce : le « − » corrige.
  await toucher(p, 100, 1, true);
  e = await ecart(p);
  t(/Déficit/.test(e.lbl) && e.amt === '-100FCFA', `un « − » sur les 100 : il manque 100 (« ${e.lbl} ${e.amt} »)`);
  await toucher(p, 100);
  // Le champ reste pour qui préfère taper.
  await p.evaluate(() => { const i = document.getElementById('inp-compt'); i.value = '9000'; calcEcart(); });
  e = await ecart(p);
  t(/Excédent/.test(e.lbl), `taper 9 000 au clavier marche toujours : « ${e.lbl} ${e.amt} »`);
  // La clôture se valide comme avant.
  await p.evaluate(() => validerClot()); await p.waitForTimeout(300);
  t(await p.evaluate(() => DB.ventes.filter(v => !v.annulee).every(v => v.cloturee)), 'Valider clôture les ventes du jour, comme avant');
  t(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) « ANNULER LA VENTE » NE COUVRE PLUS UNE FEUILLE OUVERTE ─────────
{
  const { ctx, p } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await vendre(p, { lignes: [[2, 1]] }); await p.evaluate(() => fermerSucces()); await p.waitForTimeout(500);   // la pastille vient quand l'écran vert part
  const avant = await p.evaluate(() => document.getElementById('annul-chip').classList.contains('show'));
  await p.evaluate(() => ouvrirClot()); await p.waitForTimeout(500);
  const pendant = await p.evaluate(() => document.getElementById('annul-chip').classList.contains('show'));
  await p.evaluate(() => closeSheet('ov-clot')); await p.waitForTimeout(500);
  const apres = await p.evaluate(() => document.getElementById('annul-chip').classList.contains('show'));
  t(avant && !pendant && apres, `la pastille « Annuler la vente » se retire sous une feuille ouverte et revient après (${avant}/${pendant}/${apres})`);
  await ctx.close();
}

// ── 3) HORS FRANCS CFA : LE CHAMP, COMME AVANT ─────────────────────────
{
  const d = nouvelleBoutique(); d.cfg.d = 'GHS'; d.cfg.s = 'GH₵';
  const { ctx, p } = await ouvrirCaisse(b, port, d);
  await p.evaluate(() => ouvrirClot()); await p.waitForTimeout(300);
  t(await p.evaluate(() => document.getElementById('clot-bil').style.display === 'none' && !!document.getElementById('inp-compt')), 'une boutique hors francs CFA garde le champ seul');
  await ctx.close();
}

await b.close(); s.close();
fin();
