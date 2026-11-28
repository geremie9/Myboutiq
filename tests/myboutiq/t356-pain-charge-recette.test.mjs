// t356 — LES RECETTES : LE PAIN CHARGÉ (24.36).
// Le patron, 27/11 : « les articles comme les pains chargés existent déjà ? »
// À moitié : on vendait le « Pain chargé », mais le pain et les œufs restaient
// en stock. Ici : la fiche « Fait avec… » (menu de la tuile), le stock des
// ingrédients qui sort à la vente et revient à l'annulation, le blocage quand
// les œufs manquent, le coût qui suit les ingrédients, la recette figée sur la
// vente, l'archivage qui ne fait rien sauter, et une sorte de famille.
// Et le bug trouvé en route : une famille jamais comptée refusée à « Encaisser ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre, stock } from './caisse.mjs';
const { t, fin } = compteur('t356');
const { s, port } = await serveur();
const b = await chromium.launch();

const art = (id, nm, px, pa, stk0, x) => Object.assign({ id, nm, e: '', cat: 'Divers', px, pa, stk0, al: 0, vd: 0, vr: [], rt: true }, x || {});
const d = nouvelleBoutique();
delete d.cfg.sansStock;                                         // le défaut : vente sans stock interdite
d.articles.push(art(10, 'Pain', 150, 100, 20), art(11, 'Œuf', 100, 60, 8), art(12, 'Pain chargé', 300, 0, 0),
  art(14, 'Spaghetti', 650, 600, 4),
  art(13, 'Sandwich', 0, 0, 0, { vr: [{ id: 1, nm: 'Omelette', px: 350, pa: 0, rt: true, qBase: 1 }, { id: 2, nm: 'Spaghetti', px: 300, pa: 0, rt: true, qBase: 1 }] }),
  art(20, 'Sucrerie', 0, 0, 0, { vr: [{ id: 1, nm: 'Coca', px: 600, pa: 450, rt: true, qBase: 1 }, { id: 2, nm: 'Fanta', px: 600, pa: 450, rt: true, qBase: 1 }] }));
const { p, errs } = await ouvrirCaisse(b, port, d);

// ── La fiche, par le menu de la tuile ─────────────────────────────
const fiche = await p.evaluate(() => {
  const a = DB.articles.find(x => x.id === 12);
  showCtx({ clientX: 100, clientY: 200 }, a);
  const e = document.getElementById('ctxi-rec');
  const vu = e && getComputedStyle(e).display !== 'none' ? e.textContent.trim() : '';
  e.click();
  const ov = document.getElementById('ov-recette');
  const tuile = nm => [...document.querySelectorAll('#rc-corps .rc-t')].find(x => [...x.querySelectorAll('span')].some(y => y.textContent.trim() === nm));
  const avant = { ouvert: ov.classList.contains('show'), q: document.querySelector('#rc-corps .rc-q').textContent, recette: !!tuile('Pain chargé') };
  tuile('Pain').click(); tuile('Œuf').click();
  [...document.querySelectorAll('#rc-corps .rc-l')].find(l => /Œuf/.test(l.textContent)).querySelectorAll('.rc-b')[1].click();
  const lignes = [...document.querySelectorAll('#rc-corps .rc-l')].map(l => l.querySelector('b').firstChild.textContent.trim() + ' ' + l.querySelector('.rc-n').textContent);   // 24.46 — la ligne dit aussi le prix
  const bilan = document.querySelector('#rc-corps .rc-bilan').textContent;
  document.getElementById('rc-ok').click();
  return { vu, avant, lignes, bilan, ferme: !ov.classList.contains('show'), rec: a.rec, pa: a.pa, toast: window.__toasts.slice(-1)[0] || '' };
});
t(/Fait avec/.test(fiche.vu), `la tuile « Pain chargé » a « ${fiche.vu} » dans son menu`);
const riz = await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); showCtx({ clientX: 100, clientY: 200 }, DB.articles.find(x => x.id === 2)); const c = document.getElementById('ctxi-rec').classList.contains('ctx-sec'); document.getElementById('ctxm').classList.remove('show'); return c; });
t(riz, `sur le Riz, « Fait avec… » attend sous « Plus d'actions » (le menu garde ses six gestes, 23.38)`);
t(fiche.avant.ouvert && /fait avec quoi/i.test(fiche.avant.q), `la fiche s'ouvre : « ${fiche.avant.q} »`);
t(!fiche.avant.recette, `l'article ne se propose pas comme son propre ingrédient`);
t(fiche.lignes.join(' | ') === 'Pain 1 | Œuf 2', `deux touches + un « + » : ${fiche.lignes.join(' | ')}`);
t(/coûte.?220/.test(fiche.bilan.replace(/\s/g, ' ')) && /gagnes.?80/.test(fiche.bilan.replace(/\s/g, ' ')), `la fiche dit le coût et le gain : « ${fiche.bilan} »`);
t(fiche.ferme && JSON.stringify(fiche.rec) === JSON.stringify([{ pid: 10, vid: null, q: 1 }, { pid: 11, vid: null, q: 2 }]), `enregistrée sur l'article : ${JSON.stringify(fiche.rec)}`);
t(fiche.pa === 220, `son prix d'achat devient la somme des ingrédients : ${fiche.pa}`);
t(/Pain chargé = 1 Pain \+ 2 Œuf/.test(fiche.toast), `il entend ce qui sortira : « ${fiche.toast} »`);
t(await stock(p, 12) === 4, `stock du pain chargé = ce que les œufs permettent (8 œufs ÷ 2) : ${await stock(p, 12)}`);

// ── Vendre, bloquer, annuler ──────────────────────────────────────
let r = await vendre(p, { lignes: [[12, 3]] });
const l = r.v && r.v.lignes[0];
t(!!r.v && JSON.stringify(l.ing) === JSON.stringify([{ pid: 10, vid: null, q: 1, qb: 1 }, { pid: 11, vid: null, q: 2, qb: 1 }]), `la vente porte sa recette : ${JSON.stringify(l && l.ing)}`);
t(await stock(p, 10) === 17 && await stock(p, 11) === 2, `3 pains chargés : Pain 20 → ${await stock(p, 10)}, Œuf 8 → ${await stock(p, 11)}`);
t(r.v && r.v.ben === 240, `bénéfice juste : 3 × (300 − 220) = ${r.v && r.v.ben}`);
t(l && !l.dep && !l.dt, `la recette elle-même n'est ni un dépannage ni une dette`);
const vendu = await p.evaluate(() => DB.articles.find(x => x.id === 12).vd);
t(vendu === 3, `le compteur « vendu » du pain chargé : ${vendu}`);
const r2 = await vendre(p, { lignes: [[12, 1], [11, 1]] });   // 2 œufs dans le pain chargé + 1 seul : il en reste 2
t(!r2.v && r2.toasts.some(x => /Pas assez de Œuf.*il en reste 2/.test(x)), `1 pain chargé + 1 œuf pour 2 œufs : refusé (« ${(r2.toasts.find(x => /Pas assez/.test(x)) || r2.toasts.join('|')).slice(0, 70)}… »)`);
await p.evaluate(id => { annulerVente(id); confirmerAnnulVente(); }, r.v.id);
t(await stock(p, 10) === 20 && await stock(p, 11) === 8, `annulée : Pain ${await stock(p, 10)}, Œuf ${await stock(p, 11)} (tout revient)`);

// ── La recette change : le passé ne bouge pas ────────────────────
r = await vendre(p, { lignes: [[12, 2]] });                    // 2 pains, 4 œufs
await p.evaluate(() => { const a = DB.articles.find(x => x.id === 12); a.rec = [{ pid: 10, vid: null, q: 1 }, { pid: 11, vid: null, q: 3 }]; save(); });
t(await stock(p, 11) === 4 && await stock(p, 12) === 1, `3 œufs par pain désormais : les 2 déjà vendus gardent leurs 2 œufs (Œuf ${await stock(p, 11)}, possibles ${await stock(p, 12)})`);
const pa2 = await p.evaluate(() => { DB.articles.find(x => x.id === 11).pa = 75; save(); return DB.articles.find(x => x.id === 12).pa; });
t(pa2 === 325, `l'œuf passe à 75 F : le coût du pain chargé suit (100 + 3×75 = ${pa2})`);

// ── L'archivage ne fait rien sauter ──────────────────────────────
const arch = await p.evaluate(() => {
  const av = [10, 11].map(id => getStk(DB.articles.find(x => x.id === id)));
  archiverAnciennesVentes(Date.now() + 86400000); DB = recomputeStock(DB);
  return { av, ap: [10, 11].map(id => getStk(DB.articles.find(x => x.id === id))), reste: DB.ventes.length };
});
t(JSON.stringify(arch.av) === JSON.stringify(arch.ap) && arch.reste === 0, `archivage : Pain/Œuf ${arch.av} → ${arch.ap}`);

// ── Une sorte de famille ─────────────────────────────────────────
const fam = await p.evaluate(() => {
  const a = DB.articles.find(x => x.id === 13), v = a.vr[1];
  showCtxVar({ clientX: 100, clientY: 200 }, a, v); ctxvRecette();
  const tuile = nm => [...document.querySelectorAll('#rc-corps .rc-t')].find(x => [...x.querySelectorAll('span')].some(y => y.textContent.trim() === nm));
  tuile('Pain').click(); tuile('Spaghetti').click();
  const sp = [...document.querySelectorAll('#rc-corps .rc-l')].find(l => /Spaghetti/.test(l.textContent));
  sp.querySelectorAll('.rc-b')[0].click(); sp.querySelectorAll('.rc-b')[0].click();      // 1 → ½ → ¼
  const q = [...document.querySelectorAll('#rc-corps .rc-l')].find(l => /Spaghetti/.test(l.textContent)).querySelector('.rc-n').textContent;
  document.getElementById('rc-ok').click();
  return { q, rec: v.rec, pa: v.pa, stk: stockVarDispo(a, v) };
});
t(fam.q === '¼', `un paquet de spaghetti fait quatre sandwichs : « ${fam.q} »`);
t(JSON.stringify(fam.rec) === JSON.stringify([{ pid: 10, vid: null, q: 1 }, { pid: 14, vid: null, q: 0.25 }]) && fam.pa === 250, `recette de la sorte « Spaghetti » : ${JSON.stringify(fam.rec)}, coût ${fam.pa}`);
t(fam.stk === 16, `possibles : 4 paquets × 4 = ${fam.stk}`);
r = await p.evaluate(() => {
  window.__toasts = []; viderPanier(); panier['13-2'] = 6;
  const n0 = DB.ventes.length; procederPmt(); selPmntVente('especes'); encaisser(); try { fermerSucces(); } catch (e) {}
  return { vendu: DB.ventes.length > n0, toast: window.__toasts.join(' | ') };
});
t(r.vendu && await stock(p, 14) === 2.5, `6 sandwichs spaghetti : Spaghetti 4 → ${await stock(p, 14)} paquets`);

// ── Rien de compté : la recette se vend librement ────────────────
const d2 = nouvelleBoutique(); delete d2.cfg.sansStock;
d2.articles.push(art(10, 'Pain', 150, 100, 0), art(11, 'Œuf', 100, 60, 0), art(12, 'Pain chargé', 300, 0, 0, { rec: [{ pid: 10, q: 1 }, { pid: 11, q: 2 }] }));
const B = await ouvrirCaisse(b, port, d2);
r = await vendre(B.p, { lignes: [[12, 2]] });
t(!!r.v, `boutique qui ne compte ni pain ni œufs : 2 pains chargés se vendent (${r.toasts.join('|').slice(0, 60)})`);

// ── Trouvé en route : la famille jamais comptée ──────────────────
r = await p.evaluate(() => {
  window.__toasts = []; viderPanier(); addPanier(DB.articles.find(x => x.id === 20), DB.articles.find(x => x.id === 20).vr[0]); panier['20-1'] = 2;
  const n0 = DB.ventes.length; procederPmt(); selPmntVente('especes'); encaisser(); try { fermerSucces(); } catch (e) {}
  return { vendu: DB.ventes.length > n0, toast: window.__toasts.join(' | ') };
});
t(r.vendu, `une famille jamais comptée (Sucrerie : Coca) se vend avec la vente sans stock interdite (${r.toast.slice(0, 60)})`);

t(errs.length === 0 && B.errs.length === 0, `aucune erreur JS ${errs.concat(B.errs).slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
