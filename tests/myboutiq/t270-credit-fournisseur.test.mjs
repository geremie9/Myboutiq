// t270 — LE CRÉDIT FOURNISSEUR (23.52). « Et si j'achète à un fournisseur à
// crédit, comment je vais gérer cette situation, et quand il va être
// remboursé, où et comment je vais faire ? » Rien n'existait.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, nombre, ligneRapport as ligne } from './caisse.mjs';
const { t, fin } = compteur('t270');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique({ fondsDepart: 10000 }); db.cfg.facon = 'detail';
db.fournisseurs = [{ nm: 'Ets Fotso', articles: 'Riz, huile' }];
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(400);
const fermer = () => p.evaluate(() => document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')));
const arrivage = async (id, q, pa, credit, nom, du) => {
  await p.evaluate(id => ouvrirStk(DB.articles.find(a => a.id === id)), id); await p.waitForTimeout(250);
  await p.locator('#inp-sqte').fill(String(q)); await p.locator('#inp-spa').fill(String(pa));
  await p.evaluate(() => majApercuStk());
  if (credit) { await p.locator('#stk-acredit').tap(); await p.waitForTimeout(150); if (nom != null) await p.locator('#inp-cfourn').fill(nom); if (du != null) { await p.locator('#inp-cdu').fill(String(du)); await p.evaluate(() => { document.getElementById('inp-cdu').dataset.touche = '1'; }); } }
  return p.evaluate(() => { window.__toasts = []; saveStk(); return { dit: (window.__toasts || []).join(' | '), ouvert: document.getElementById('ov-stk').classList.contains('show') }; });
};

// ── 1. Un arrivage à crédit ──
await p.evaluate(() => ouvrirStk(DB.articles.find(a => a.id === 2))); await p.waitForTimeout(250);
const vue = await p.evaluate(() => ({ paye: document.getElementById('stk-paye').classList.contains('on'), det: getComputedStyle(document.getElementById('stk-credit-det')).display, sug: [...document.querySelectorAll('#dl-fourn option')].map(o => o.value).join(',') }));
t(vue.paye && vue.det === 'none', 'à l\'arrivée, « Payé » est choisi : rien de plus à remplir si c\'est payé');
t(/Ets Fotso/.test(vue.sug), `ses fournisseurs sont proposés en tapant (${vue.sug})`);
await fermer();
const sansNom = await arrivage(2, 20, 500, true, '', null);
t(/Chez qui/.test(sansNom.dit) && (await p.evaluate(() => getStk(DB.articles.find(a => a.id === 2)))) === 40, `à crédit sans nom : il le demande, et rien n'est écrit (« ${sansNom.dit} »)`);
await fermer();
const a1 = await arrivage(2, 20, 500, true, 'Ets Fotso', null);
const e1 = await p.evaluate(() => ({ stk: getStk(DB.articles.find(a => a.id === 2)), d: DB.fournDettes.map(e => [e.type, e.fourn, e.amt]), ap: DB.appros[DB.appros.length - 1].fourn }));
t(e1.stk === 60, 'la marchandise entre en stock tout de suite (40 + 20)');
t(e1.d.length === 1 && e1.d[0][0] === 'achat' && e1.d[0][1] === 'Ets Fotso' && e1.d[0][2] === 10000, `la dette est notée : 20 × 500 = ${e1.d[0] && e1.d[0][2]} chez Ets Fotso`);
t(/tu dois/.test(a1.dit) && /10\s?000/.test(a1.dit.replace(/[  ]/g, ' ')), `et il le lit : « ${a1.dit} »`);
t(e1.ap === 'Ets Fotso', 'le fournisseur est gardé sur l\'arrivée');
await fermer();
// Un autre arrivage, il a payé une partie : il corrige le montant dû.
await arrivage(4, 10, 1100, true, 'Ets Fotso', 6000);
await arrivage(5, 5, 2800, true, 'Mama Ngo', null);
const so = await p.evaluate(() => _fdSoldes().map(x => x.nom + '=' + x.du).join(' · '));
t(so === 'Ets Fotso=16000 · Mama Ngo=14000', `ce qu'il doit, par fournisseur : ${so}`);
await fermer();
// Un arrivage payé : aucune dette.
await arrivage(3, 10, 500, false);
t((await p.evaluate(() => DB.fournDettes.length)) === 3, 'un arrivage « Payé » n\'écrit aucune dette');
await fermer();

// ── 2. Le bénéfice ne bouge pas ──
await vendre(p, { lignes: [[2, 2]] });
await p.evaluate(() => { _rptPer = 'jour'; renderRpt(); });
const brut = nombre(await ligne(p, 'Bénéfice brut'));
t(brut === 200, `le bénéfice reste celui de la vente (2 × (600 − 500) = ${brut}) : la dette ne le change pas`);

// ── 3. Le Stock le dit, et il paie ──
await p.evaluate(() => navTo('stock', document.querySelectorAll('.ni')[1])); await p.waitForTimeout(300);
const band = await p.evaluate(() => { const x = document.getElementById('stk-dette'); return x ? x.textContent : ''; });
t(/Tu dois/.test(band) && /30\s?000/.test(band.replace(/[  ]/g, ' ')) && /2 fournisseurs/.test(band), `le Stock le dit : « ${band} »`);
await p.locator('#stk-dette').tap(); await p.waitForTimeout(300);
const lignes = await p.evaluate(() => [...document.querySelectorAll('#fd-cont .fd-ligne b')].map(x => x.textContent));
t(lignes.join(',') === 'Ets Fotso,Mama Ngo', `la liste, du plus gros au plus petit (${lignes.join(', ')})`);
const ix = nom => p.evaluate(nom => _fdSoldes().findIndex(x => x.nom === nom), nom);
const payer = async (nom, montant, horsCaisse) => { const i = await ix(nom); await p.locator('#fd-payer-' + i).tap(); await p.waitForTimeout(200); if (horsCaisse) await p.locator('#fd-h-' + i).tap(); await p.locator('#fd-amt-' + i).fill(String(montant)); return p.evaluate(i => { window.__toasts = []; document.getElementById('fd-ok-' + i).click(); return (window.__toasts || []).join('|'); }, i); };
const du = nom => p.evaluate(nom => (_fdSoldes().find(x => x.nom === nom) || { du: 0 }).du, nom);
const att0 = await p.evaluate(() => caisseAttendue());
await payer('Ets Fotso', 10000); await p.waitForTimeout(200);
const ap1 = { f: await du('Ets Fotso'), m: await du('Mama Ngo'), att: await p.evaluate(() => caisseAttendue()) };
t(ap1.f === 6000 && ap1.m === 14000, `payé 10 000 à Ets Fotso : il lui reste ${ap1.f}, Mama Ngo toujours ${ap1.m}`);
t(ap1.att === att0 - 10000, `payé de la caisse : la caisse attendue baisse de 10 000 (${att0} → ${ap1.att})`);
// Hors caisse : le tiroir n'y touche pas.
await payer('Mama Ngo', 4000, true); await p.waitForTimeout(200);
t((await p.evaluate(() => caisseAttendue())) === ap1.att && (await du('Mama Ngo')) === 10000, 'payé 4 000 « hors caisse » à Mama Ngo : sa dette baisse, le tiroir ne bouge pas');
// Plus que la dette : on ne paie que ce qu'on doit.
const dit = await payer('Ets Fotso', 9000);
t(/ne lui devais que/.test(dit) && (await p.evaluate(() => _fdSoldes().map(x => x.nom).join(','))) === 'Mama Ngo', `9 000 tendus pour 6 000 dus : 6 000 seulement, et il le dit (« ${dit} »)`);
await fermer();
// ── 4. Le rapport et la clôture disent le même montant ──
await p.evaluate(() => { _rptPer = 'jour'; renderRpt(); });
const aCompter = nombre(await ligne(p, 'à compter')), att = await p.evaluate(() => caisseAttendue());
const det = await p.evaluate(() => { for (const r of document.querySelectorAll('#rpt-cont .rrow')) if (/à compter/.test(r.textContent)) return r.textContent.replace(/\s+/g, ' '); return ''; });
t(aCompter === att && /fournisseurs payés de la caisse/.test(det), `Rapports « à compter » = la clôture (${aCompter}), et il dit d'où vient l'écart`);
const clot = await p.evaluate(() => { ouvrirClot(); return document.getElementById('clot-det').textContent.replace(/[\s  ]+/g, ' '); });
t(/Fournisseurs payés de la caisse/.test(clot), 'la clôture montre la ligne des fournisseurs payés');
await p.evaluate(() => { document.getElementById('inp-compt').value = caisseAttendue(); calcEcart(); validerClot(); });
t((await p.evaluate(() => DB.fournDettes.filter(e => e.type === 'paye').every(e => e.cloturee) && _fdSoldes().length === 1)), 'clôturé : les paiements du jour sont fermés, la dette restante reste (Mama Ngo)');
// ── 5. Un autre téléphone ──
const fus = await p.evaluate(() => { const autre = JSON.parse(JSON.stringify(DB)); autre.fournDettes.push({ id: 'autre_1_x', ts: new Date().toISOString(), date: '', type: 'achat', fourn: 'Mama Ngo', amt: 2000 }); DB = migrateDBData(mergeDB(autre, DB)); return { n: DB.fournDettes.length, so: _fdSoldes().map(x => x.nom + '=' + x.du).join(' · ') }; });
t(fus.n === 7 && fus.so === 'Mama Ngo=12000', `un achat fait sur l'autre téléphone arrive, rien n'est doublé (${fus.so})`);
const inj = await p.evaluate(() => { DB.fournDettes.push({ id: 'x2', ts: new Date().toISOString(), type: 'achat', fourn: '<img src=x onerror=alert(1)>', amt: 1 }); DB = migrateDBData(DB); ouvrirDettesFourn(); return document.getElementById('fd-cont').innerHTML.indexOf('<img') < 0; });
t(inj, 'un nom de fournisseur piégé venu d\'ailleurs ne s\'exécute pas');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
