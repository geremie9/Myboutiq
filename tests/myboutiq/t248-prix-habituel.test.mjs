// t248 — « Ça peut fausser le calcul des bénéfices, un prix habituel — ça
// serait mieux intelligemment. » (23.29)
// Mesuré en base le 20/10 : 304 articles sur 791 sans prix de vente, 6
// boutiques à moitié invendables (4 n'ont jamais vendu). La règle :
//  · jamais de prix d'ACHAT deviné (le bénéfice resterait faux pour toujours) ;
//  · le prix de VENTE proposé vient d'abord de SA boutique, puis du catalogue,
//    puis de l'étagère ; jamais si les contenances se contredisent ;
//  · ce qui vient du catalogue se propose d'un toucher et reste marqué
//    « prix indicatif » ; ce qu'il écrit ou enregistre lui-même ne l'est plus.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t248');
const { s, port } = await serveur();
const b = await chromium.launch();
const fermer = p => p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); });

// ── 1. Le prix habituel : d'où il vient, quand il se tait ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique({ articles: [], ventes: [] }), { tactile: true });
  const r = await p.evaluate(async () => {
    try { await chargerCatalogue600(); } catch (e) {}
    const ph = n => { const x = prixHabituel(n); return x ? x.px + ':' + x.src : 'rien'; };
    const o = { riz: ph('Riz parfumé'), all: ph('Allumettes'), cinq: ph('Riz parfumé 5 kg'), coca: ph('Coca Cola 50 cl'), fanta: ph('Fanta') };
    o.cles = Object.keys(prixHabituel('Allumettes') || {}).sort().join(',');
    DB.articles.push({ id: 950, nm: 'Riz parfumé', px: 650, pa: 0, vr: [] });
    o.sienne = ph('Riz parfumé 1 kg');
    DB.articles[DB.articles.length - 1]._sugg = 1;
    o.pasSuggestion = ph('Riz parfumé 1 kg');
    DB.articles.pop();
    const a = { nm: 'Allumettes', px: 0, pa: 0 };
    appliquerFicheCatalogue(a);
    o.fiche = a;
    return o;
  });
  t(r.riz === '600:catalogue' && r.all === '50:catalogue', `le catalogue retrouve « Riz parfumé » (Riz parfumé 1 kg, ${r.riz}) et « Allumettes » (Allumettes (boîte), ${r.all})`);
  t(r.cinq === 'rien' && r.coca === 'rien', 'contenances contradictoires : rien (le sac de 5 kg ne prend pas le prix du kilo, le 50 cl pas celui du 60 cl)');
  t(r.fanta === 'rien', 'un nom trop vague (« Fanta ») ne reçoit pas de prix inventé');
  t(r.sienne === '650:boutique', `SA boutique d'abord : il vend « Riz parfumé » à 650, le 1 kg reçoit 650 et non les 600 du catalogue (${r.sienne})`);
  t(r.pasSuggestion === '600:catalogue', 'un prix encore « indicatif » chez lui ne se recopie pas de proche en proche');
  t(!/pa/.test(r.cles), `le prix habituel ne porte aucun prix d'achat (${r.cles})`);
  t(r.fiche.px === 50 && r.fiche.pa === 0 && r.fiche._sugg === 1, `appliquerFicheCatalogue : prix de vente indicatif posé, prix d'achat LAISSÉ VIDE (${JSON.stringify(r.fiche)})`);
  t(errs.length === 0, 'aucune erreur JS (prix habituel)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2. « Leurs prix » après le catalogue en photos ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique({ articles: [], ventes: [] }), { tactile: true });
  await p.setViewportSize({ width: 360, height: 640 });
  await p.evaluate(() => ouvrirAjouter()); await p.waitForTimeout(400);
  if (await p.locator('#fq-det').count()) { await p.locator('#fq-det').tap(); await p.waitForTimeout(500); }
  const tuile = nm => p.locator('#ov-choixart div[onclick]', { hasText: nm }).first();
  await tuile('Riz').tap(); await p.waitForTimeout(300);
  await tuile('parfumé').tap(); await p.waitForTimeout(300);
  await p.locator('#ov-choixart button', { hasText: 'Retour' }).first().tap().catch(() => {}); await p.waitForTimeout(300);
  await tuile('Allumettes').tap(); await p.waitForTimeout(300);
  await tuile('Coca Cola').tap(); await p.waitForTimeout(400);
  await p.locator('#ov-format button', { hasText: '50 cl' }).first().tap(); await p.waitForTimeout(200);
  await p.locator('#fmt-ok').tap(); await p.waitForTimeout(400);
  await p.locator('#cha-btn').tap(); await p.waitForTimeout(600);
  const hab = await p.locator('#exp-hab').innerText().catch(() => '');
  t(/Mettre les prix habituels \(2\)/.test(hab) && /prix de vente seulement/i.test(hab), `« Leurs prix » propose « ${hab.split('\n')[0]} » — le prix de vente seulement`);
  const avant = await p.evaluate(() => [...document.querySelectorAll('#exp-liste input[type=number]')].map(i => i.value));
  t(avant.every(v => v === ''), 'rien n’est écrit à sa place avant qu’il le demande (le catalogue se propose, il ne s’impose pas)');
  await p.locator('#exp-hab').tap(); await p.waitForTimeout(400);
  const apres = await p.evaluate(() => [...document.querySelectorAll('#exp-liste input[type=number]')].map(i => i.value));
  t(apres.join(',') === '600,50,', `un toucher : 600 et 50 écrits, le Coca 50 cl reste vide (aucun prix sûr) — ${apres.join(',')}`);
  const lignes = await p.locator('#exp-liste').innerText();
  t(/prix courant — vérifie/.test(lignes) && /prix d'achat inconnu/.test(lignes), 'chaque prix dit d’où il vient (« prix courant — vérifie ») et le prix d’achat reste « inconnu »');
  await p.locator('#exp-liste input[type=number]').nth(2).fill('500');
  await p.locator('#exp-valider').tap(); await p.waitForTimeout(700);
  const a = await p.evaluate(() => DB.articles.map(x => ({ nm: x.nm, px: x.px, pa: x.pa, s: x._sugg || 0 })));
  const riz = a.find(x => /Riz/.test(x.nm)), all = a.find(x => /Allumettes/.test(x.nm)), coca = a.find(x => /Coca/.test(x.nm));
  t(riz && riz.px === 600 && riz.pa === 0 && riz.s === 1 && all && all.px === 50 && all.pa === 0 && all.s === 1,
    `créés au prix courant, prix d’achat 0 (bénéfice inconnu, pas inventé), marqués « indicatif » : ${JSON.stringify([riz, all])}`);
  t(coca && coca.px === 500 && !coca.s, `le prix qu’il a tapé lui-même (Coca 500) n’est pas marqué « indicatif »`);
  t(errs.length === 0, 'aucune erreur JS (Leurs prix)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3. « Son prix » : le prix d'abord ──
{
  const db = nouvelleBoutique();
  db.articles.push({ id: 900, nm: 'Allumettes', e: '📦', cat: 'Ménage', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true });
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  await p.setViewportSize({ width: 360, height: 640 }); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('pc-900').scrollIntoView({ block: 'center' }));
  await p.locator('#pc-900').tap(); await p.waitForTimeout(600);
  const g = await p.evaluate(() => {
    const pv = document.getElementById('cmp-pv'), um = document.getElementById('cmp-um-resume'), ok = document.querySelector('#ov-completer .bnxt');
    const avant = !!(pv.compareDocumentPosition(um) & Node.DOCUMENT_POSITION_FOLLOWING);
    const r = ok.getBoundingClientRect();
    return { avant, okVu: r.bottom <= innerHeight + 1 && r.top >= 0, sugg: (document.getElementById('cmp-sugg-b') || {}).textContent || '' };
  });
  t(g.avant, 'le champ du prix vient avant la façon de vendre (il ne manque que lui)');
  t(/Prix habituel : FCFA 50/.test(g.sugg), `le prix habituel est proposé sous le champ (« ${g.sugg.trim()} »)`);
  t(g.okVu, '« Enregistrer » est visible sans faire défiler, à 360 × 640');
  await p.locator('#cmp-sugg-b').tap(); await p.waitForTimeout(200);
  t(await p.locator('#cmp-pv').inputValue() === '50', 'un toucher écrit 50 dans le champ');
  await p.locator('#ov-completer .bnxt').tap(); await p.waitForTimeout(500);
  const a = await p.evaluate(() => { const x = DB.articles.find(y => y.id === 900); return { px: x.px, pa: x.pa, s: x._sugg || 0 }; });
  t(a.px === 50 && a.pa === 0 && !a.s, `enregistré par lui : 50, prix d’achat toujours 0, plus « indicatif » (${JSON.stringify(a)})`);
  t(errs.length === 0, 'aucune erreur JS (Son prix)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 4. « Mets leurs prix » : la liste des articles invendables ──
{
  const db = nouvelleBoutique();
  db.articles.push({ id: 901, nm: 'Allumettes', e: '📦', cat: 'Ménage', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true });
  db.articles.push({ id: 902, nm: 'Sucre en poudre', e: '📦', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true });
  db.articles.push({ id: 903, nm: 'Ndolé séché', e: '📦', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true });
  const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
  await p.evaluate(() => ouvrirPrixVite()); await p.waitForTimeout(400);
  const hab = await p.locator('#pxv-hab').innerText().catch(() => '');
  t(/\(2\)/.test(hab), `« Mettre les prix habituels (2) » : deux des trois ont un prix connu (« ${hab.split('\n')[0]} »)`);
  await p.locator('#pxv-lst [data-pxv="902"]').fill('750');
  await p.locator('#pxv-hab').tap(); await p.waitForTimeout(300);
  const v = await p.evaluate(() => [901, 902, 903].map(id => document.querySelector('#pxv-lst [data-pxv="' + id + '"]').value));
  t(v.join(',') === '50,750,', `les champs vides reçoivent le prix habituel, ce qu’il a tapé reste (Sucre 750), l’inconnu reste vide — ${v.join(',')}`);
  t(await p.evaluate(() => DB.articles.find(x => x.id === 901).px === 0), 'rien n’est enregistré avant « Enregistrer les prix »');
  await p.evaluate(() => enregPrixVite()); await p.waitForTimeout(300);
  const a = await p.evaluate(() => [901, 902, 903].map(id => { const x = DB.articles.find(y => y.id === id); return x.px + '/' + x.pa; }));
  t(a.join(',') === '50/0,750/0,0/0', `enregistrés : prix de vente posés, prix d’achat jamais inventés (${a.join(',')})`);
  t(errs.length === 0, 'aucune erreur JS (mets leurs prix)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
