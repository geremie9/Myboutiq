// t303 — LE RIZ ET L'HUILE AUSSI VITE QU'UNE BOUTEILLE (23.88).
// Le patron, le 20/11/2026 : « certains articles en kg, L ou dans certaines
// unités ne respectent pas la rapidité, exemple le riz, l'huile ». Mesuré :
// une bouteille = une touche ; un kilo de riz ouvrait CHAQUE fois une feuille
// de onze choix et deux cases, et le kilo suivant la rouvrait.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t303');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles[1].um = 'kg'; d.articles[1].px = 700; d.articles[1].pa = 600;   // Riz au kilo
d.articles[3].um = 'L'; d.articles[3].px = 1300;                            // Huile au litre
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
const touche = (id) => p.evaluate((id) => { window.__toasts = []; document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); document.getElementById('pc-' + id).click(); return { feuille: document.getElementById('ov-qte').classList.contains('show'), q: panier[id + '-0'] || 0, total: calcTotal(), toast: window.__toasts.slice(-1)[0] || '', hab: document.getElementById('qte-hab').innerText.replace(/\s+/g, ' ').trim() }; }, id);

// ── 1. Pas encore de ventes : la feuille, comme avant (rien n'est deviné) ──
let r = await touche(2);
t(r.feuille && r.q === 0 && r.hab === '', 'première fois : la feuille s\'ouvre, rien n\'est ajouté au hasard');
await p.evaluate(() => viderPanier());

// ── 2. Trois ventes d'1 kg : la tuile vend le kilo d'une touche ──
for (let i = 0; i < 3; i++) await vendre(p, { lignes: [[2, 1]] });
await p.evaluate(() => { fermerSucces(); viderPanier(); });
r = await touche(2);
t(!r.feuille && r.q === 1 && /1 kg/.test(r.toast) && /700/.test(r.toast), `après trois kilos vendus : UNE touche, 1 kg au panier, sans feuille (« ${r.toast} »)`);
r = await touche(2);
t(!r.feuille && r.q === 2 && r.total === 1400, `une deuxième touche : 2 kg, ${r.total} F — comme deux bouteilles`);

// ── 3. Le badge « 2 ⚖ » change la quantité ──
const bd = await p.evaluate(() => { const b = document.getElementById('qb-2'); return { txt: b.innerText.replace(/\s+/g, ' '), vu: b.classList.contains('show') }; });
t(bd.vu && /2/.test(bd.txt) && /⚖/.test(bd.txt), `la tuile porte « ${bd.txt} » (plus de ✕ qui retirait UN kilo)`);
const ch = await p.evaluate(() => { document.getElementById('qb-2').click(); const f = document.getElementById('ov-qte').classList.contains('show'); const txt = document.getElementById('qte-hab').innerText.replace(/\s+/g, ' '); qteRapide(0.25); return { f, txt, q: panier['2-0'], total: calcTotal() }; });
t(ch.f && /Au panier : 2 kg/.test(ch.txt) && /Comme d'habitude/i.test(ch.txt), `le badge ouvre la feuille : « ${ch.txt.trim()} »`);
t(ch.q === 0.25 && ch.total === 175, `il choisit ¼ : la ligne est REMPLACÉE (${ch.q} kg, ${ch.total} F), pas ajoutée`);
const rt = await p.evaluate(() => { document.getElementById('qb-2').click(); retirerMesure(); return { q: panier['2-0'] || 0, lots: JSON.stringify(_grosPanier['2-0'] || null), feuille: document.getElementById('ov-qte').classList.contains('show') }; });
t(rt.q === 0 && rt.lots === 'null' && !rt.feuille, '« Retirer » vide la ligne, lots compris');

// ── 4. « Du riz pour 500 » : l'habitude de la boutique, au prix du jour ──
const d2 = await p.evaluate(async () => {
  for (let i = 0; i < 4; i++) {
    document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier();
    ouvrirQteMesure(DB.articles.find(x => x.id === 2)); qtePourMontant(500);
    procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 1000; calcMonnaie(true); await encaisser(); fermerSucces();
  }
  viderPanier(); return DB.ventes.length;
});
r = await touche(2);
t(!r.feuille && r.total === 500 && Math.abs(r.q - 0.71) < 0.01, `« pour 500 », quatre fois : une touche met du riz pour 500 F (${r.q} kg)`);
await p.evaluate(() => { viderPanier(); DB.articles.find(x => x.id === 2).px = 1000; });
r = await touche(2);
t(r.total === 500 && r.q === 0.5, `le kilo passe à 1 000 F : « pour 500 » repèse ${r.q} kg — toujours 500 F`);

// ── 5. Pas d'habitude nette : la feuille, ses doses en tête ──
const melange = await p.evaluate(async () => {
  const h = DB.articles.find(x => x.id === 4);
  const vend = async (f) => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); ouvrirQteMesure(h); f(); procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 10000; calcMonnaie(true); await encaisser(); fermerSucces(); };
  await vend(() => qteRapide(1)); await vend(() => qteRapide(0.5)); await vend(() => qteRapide(2)); await vend(() => qteRapide(1)); await vend(() => qteRapide(0.5));
  viderPanier(); return true;
});
r = await touche(4);
t(r.feuille && r.q === 0 && /Comme d'habitude/i.test(r.hab) && /1 L/.test(r.hab) && /½|0,5 L|0.5 L/.test(r.hab), `huile vendue 1 L, ½ L, 2 L… : pas d'habitude nette, la feuille s'ouvre avec ses doses en tête (« ${r.hab} »)`);
const vt = await p.evaluate(() => { qteDose(0); return { q: panier['4-0'], f: document.getElementById('ov-qte').classList.contains('show') }; });
t(vt.q > 0 && !vt.f, `une dose d'habitude se vend d'une touche dans la feuille (${vt.q} L)`);
// Une vente annulée ne fait pas une habitude.
t(await p.evaluate(() => { const n = _dosesDe(DB.articles.find(x => x.id === 2)).reduce((s, x) => s + x.n, 0); DB.ventes.forEach(v => { if ((v.lignes || []).some(l => l.pid === 2)) v.annulee = true; }); return n > 0 && _doseHabituelle(DB.articles.find(x => x.id === 2)) === null; }), 'les ventes annulées ne comptent pas');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
