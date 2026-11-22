// t315 — CHAQUE SORTE SANS PHOTO A SA COULEUR ET SON MOT (23.98).
// Sa capture du 22/11/2026 et l'analyse qu'on lui a envoyée : « Savon bébé »,
// « Savon ménage », « Savon noir » portaient la même icône et la même couleur
// (celles de la famille) — un nid à erreurs devant le client.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t315');
const { s, port } = await serveur();
const b = await chromium.launch();
const V = (id, nm, px) => ({ id, nm, px, pa: Math.round(px * 0.8), stk0: 40, qBase: 1 });
const d = nouvelleBoutique();
d.articles.push({ id: 141, nm: 'Savon vaisselle en pâte', e: '', cat: 'Ménage', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Savon vaisselle en pâte', 200), V(2, 'Savon ménage', 300), V(3, 'Savon bébé', 400), V(4, 'Savon noir africain', 300)] });
d.articles.push({ id: 27, nm: 'Reaktor', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'REAKTOR A', 300), V(2, 'Reaktor B', 500)] });
d.articles.push({ id: 140, nm: 'Top', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(2, 'Coca Cola 50 cl', 250), V(3, 'Coca Cola 1 L', 500), V(4, 'Coca Cola 1,5 L', 600)] });
d.articles.push({ id: 150, nm: 'Lait', e: '', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Lait Nido', 3200)] });
d.cfg.varStyle = 'plat';
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
const fam = id => p.evaluate(id => [...document.querySelectorAll('#pc-' + id + ' .vtile')].map(x => { const m = x.querySelector('.pmedia'); return { mot: (x.querySelector('.pv-mot') || {}).textContent || '', fond: m ? getComputedStyle(m).color : '' }; }), id);

const sav = await fam(141);
t(sav.length === 4, `la famille Savon : 4 sortes sur l'étagère`);
t(sav[1].mot === 'ménage' && sav[2].mot === 'bébé' && sav[3].mot === 'noir', `chaque savon dit ce qui le distingue : ${sav.map(x => x.mot || '—').join(', ')} (avant : 4 icônes identiques)`);
t(new Set(sav.map(x => x.fond)).size === 4, `et quatre couleurs différentes : ${sav.map(x => x.fond).join(' / ')}`);
const rk = await fam(27);
t(rk.map(x => x.mot).join(',') === 'A,B', `« REAKTOR A » / « Reaktor B » : la lettre qui les sépare — ${rk.map(x => x.mot).join(', ')}`);
const top = await fam(140);
t(top.map(x => x.mot).join(',') === '50 cl,1 L,1,5 L', `« Coca Cola » est commun aux trois : seule la taille s'écrit — ${top.map(x => x.mot).join(', ')}`);
// Une sorte seule dans sa famille : rien ne change.
const lait = await p.evaluate(() => document.querySelectorAll('#pc-150 .pv-mot').length);
t(lait === 0, 'une famille d\'une seule sorte : pas de mot ajouté');
// Le mot vient du nom de la sorte : jamais du HTML brut.
const sur = await p.evaluate(() => { const a = DB.articles.find(x => x.id === 27); a.vr[1].nm = 'Reaktor <img src=x onerror=alert(1)>'; return _mediaVar(a, a.vr[1]); });
t(!/<img/i.test(sur), 'un nom piégé reste du texte (escH)');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
