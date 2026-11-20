// t304 — LES FAMILLES SUR L'ÉTAGÈRE : UNE TUILE, UNE CHOSE (23.89).
// Le patron, le 20/11/2026 : « dix façons de la caisse… et on choisit le
// gagnant ; les articles, hors variantes ou en variantes, même logique, même
// comportement ». Gagnant : chaque sorte a SA tuile, sous un ruban au nom de
// sa famille. Mesuré avant : un Top Pamplemousse = 3 gestes (ouvrir, choisir,
// fermer) quand une bière = 1.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t304');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles.push({ id: 50, nm: 'Top', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: [{ id: 501, nm: 'Ananas', px: 700, pa: 550, stk0: 24, umSac: 12, umCont: 'casier', pxGros: 7800, paGros: 6600 },
       { id: 502, nm: 'Pamplemousse', px: 700, pa: 550, stk0: 24 }] });
d.articles.push({ id: 60, nm: 'Jus Foco', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: ['Mangue', 'Goyave', 'Orange', 'Ananas', 'Cocktail', 'Citron', 'Pomme', 'Passion'].map((n, i) => ({ id: 601 + i, nm: n, px: 300, pa: 200, stk0: 20 })) });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
const etat = () => p.evaluate(() => ({ panier: JSON.parse(JSON.stringify(panier)), total: calcTotal(), ov: !!document.querySelector('.vinline'), flou: !!document.querySelector('.vinline-voile, .ov.show') }));

// ── 1. La famille est sur l'étagère, ses sortes en tuiles ──
const vue = await p.evaluate(() => {
  const f = document.getElementById('pc-50');
  return { fam: !!f && f.classList.contains('pfam'), ruban: f ? f.querySelector('.pfam-l').textContent : '', sortes: f ? [...f.querySelectorAll('.vtile')].map(x => x.querySelector('.vt-nm').textContent) : [],
    style: _styleVar(), plat: document.getElementById('pgrid').classList.contains('plat'), hauteur: f ? Math.round(f.querySelector('.vtile').getBoundingClientRect().height) : 0 };
});
t(vue.fam && vue.style === 'plat' && vue.plat, 'par défaut, la famille Top est posée sur l\'étagère (plus de tuile fermée « dès 700 »)');
t(/Top/.test(vue.ruban) && vue.sortes.join('|') === 'Ananas|Pamplemousse', `un ruban « ${vue.ruban} » et ses sortes en tuiles : ${vue.sortes.join(', ')}`);

// ── 2. Une sorte se vend d'UNE touche, comme un article seul ──
await p.evaluate(() => { document.getElementById('pv-50-502').click(); });
let e = await etat();
t(e.panier['50-502'] === 1 && !e.ov, `une touche sur Pamplemousse : 1 au panier, aucune fenêtre ouverte (${JSON.stringify(e.panier)})`);
await p.evaluate(() => { document.getElementById('pv-50-502').click(); document.getElementById('pc-1').click(); });
e = await etat();
t(e.panier['50-502'] === 2 && e.panier['1-0'] === 1 && e.total === 2050, `deux Pamplemousse et une bière : ${e.total} F, même geste partout`);
// La pastille de la sorte : le nombre et ✕, comme dehors ; elle retire UN.
const bd = await p.evaluate(() => { const t2 = document.getElementById('pv-50-502'), bg = t2.querySelector('.vt-badge'); const txt = bg ? bg.innerText.replace(/\s+/g, ' ') : ''; bg.click(); return { txt, q: panier['50-502'] }; });
t(/2/.test(bd.txt) && /✕/.test(bd.txt) && bd.q === 1, `la pastille « ${bd.txt} » retire une Pamplemousse, comme le ✕ d'un article seul`);

// ── 3. Le casier d'une sorte : la barre de sa tuile ──
const cs = await p.evaluate(() => { viderPanier(); const ch = document.querySelector('#pv-50-501 [data-grosv]'); const txt = ch ? ch.innerText.replace(/\s+/g, ' ') : ''; if (ch) ch.click(); return { txt, q: panier['50-501'] || 0, total: calcTotal() }; });
t(cs.q === 12 && cs.total === 7800 && /7\s?800/.test(cs.txt), `le casier d'Ananas se vend depuis sa tuile : 12 pour 7 800 F (« ${cs.txt} »)`);

// ── 4. Une grande famille : 5 sortes et « +3 », qui déplie sur place ──
const gf = await p.evaluate(() => { const f = document.getElementById('pc-60'); return { n: f.querySelectorAll('.vtile').length, plus: (f.querySelector('.pfam-plus') || {}).textContent || '' }; });
t(gf.n === 5 && /\+3/.test(gf.plus), `Jus Foco (8 sortes) : ${gf.n} tuiles et « ${gf.plus.replace(/\s+/g, ' ')} »`);
const dp = await p.evaluate(() => { document.querySelector('#pc-60 .pfam-plus').click(); const f = document.getElementById('pc-60'); return { n: f.querySelectorAll('.vtile').length, ov: !!document.querySelector('.vinline') }; });
t(dp.n === 8 && !dp.ov, '« +3 » déplie les autres sur place, en tuiles normales, sans fenêtre');

// ── 5. Les plus vendues d'abord (ordre figé pour la journée) ──
await p.evaluate(() => { viderPanier(); _famOrdre = {}; });
for (let i = 0; i < 3; i++) {
  await p.evaluate(async () => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); document.getElementById('pv-50-502').click(); procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 1000; calcMonnaie(true); await encaisser(); fermerSucces(); });
}
const ordre1 = await p.evaluate(() => { _famOrdre = {}; renderProd(DB.articles); return [...document.querySelectorAll('#pc-50 .vtile .vt-nm')].map(x => x.textContent).join('|'); });
t(ordre1 === 'Pamplemousse|Ananas', `après trois Pamplemousse vendues, elle passe devant (${ordre1})`);
const ordre2 = await p.evaluate(async () => { for (let i = 0; i < 5; i++) { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); viderPanier(); document.getElementById('pv-50-501').click(); procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 1000; calcMonnaie(true); await encaisser(); fermerSucces(); } renderProd(DB.articles); return [...document.querySelectorAll('#pc-50 .vtile .vt-nm')].map(x => x.textContent).join('|'); });
t(ordre2 === 'Pamplemousse|Ananas', 'dans la journée, l\'ordre ne bouge plus : une tuile ne saute jamais sous le doigt');

// ── 6. L'appui long : le pavé, comme dehors ──
const pv = await p.evaluate(() => { viderPanier(); ouvrirPave(DB.articles.find(x => x.id === 50), DB.articles.find(x => x.id === 50).vr[1]); ['4'].forEach(k => paveTouche ? paveTouche(k) : null); _pv.s = '4'; paveValider(); return { q: panier['50-502'] || 0, badge: (document.querySelector('#pv-50-502 .vt-badge') || {}).innerText || '' }; });
t(pv.q === 4 && /4/.test(pv.badge), `le pavé (appui long) met 4 Pamplemousse, et la tuile le montre (« ${pv.badge.replace(/\s+/g, ' ')} »)`);

// ── 7. La voix qui hésite : la famille est montrée, pas de fenêtre ──
const vx = await p.evaluate(() => { window.__toasts = []; ouvrirVarInline(DB.articles.find(x => x.id === 50), document.getElementById('pc-50')); return { appel: document.getElementById('pc-50').classList.contains('appel'), ov: !!document.querySelector('.vinline') }; });
t(vx.appel && !vx.ov, 'quand la voix demande « Quelle sorte de Top ? », la famille clignote sur l\'étagère');

// ── 8. La vente encaissée est la même qu'avant ──
const vt = await vendre(p, { lignes: [[1, 1]] });
const enc = await p.evaluate(async () => { viderPanier(); document.getElementById('pv-50-502').click(); document.getElementById('pv-50-502').click(); procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 2000; calcMonnaie(true); await encaisser(); const v = DB.ventes[DB.ventes.length - 1]; return v.lignes.map(l => [l.pid, l.vid, l.qte, l.px]); });
t(JSON.stringify(enc) === JSON.stringify([[50, '502', 2, 700]]) || JSON.stringify(enc) === JSON.stringify([[50, 502, 2, 700]]), `l'encaissement enregistre la sorte comme avant (${JSON.stringify(enc)})`);

// ── 9. La fenêtre existe toujours, d'un réglage ──
const fe = await p.evaluate(() => { fermerSucces(); viderPanier(); role = 'patron'; choisirStyleVar('carre'); const f = document.getElementById('pc-50'); const avant = f && !f.classList.contains('pfam'); f.click(); const ov = !!document.querySelector('.vinline'); fermerVarInline(); choisirStyleVar('plat'); return { avant, ov, retour: document.getElementById('pc-50').classList.contains('pfam') }; });
t(fe.avant && fe.ov && fe.retour, 'Réglages › Les familles à la caisse › Fenêtre : la fenêtre revient ; Étagère : retour sur l\'étagère');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
