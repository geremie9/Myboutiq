// t313 — LA VOIX TROUVE LES SORTES PAR LEUR NOM (23.97).
// Le patron, le 22/11/2026 : « pourquoi il n'y a plus de variantes ? », et sa
// capture : « savon bebe savon bebe savon bebe » dans la recherche, rien au
// panier. Rejoué avec SES familles (noms et rangements copiés de sa boutique,
// sans photos ni stock réel) — la voix ne connaissait que le nom des familles :
//   « savon bébé »      → rien (la sorte vit sous « Savon vaisselle en pâte ») ;
//   « coca cola 1 L »   → rien (sous « Top ananas 60 cl ») ;
//   « reaktor B »       → « quelle sorte ? » (A et B ne diffèrent que d'une lettre) ;
//   « coca cola 1,5 L » → la virgule coupait la phrase en deux ;
//   « jus ananas 25 cl »→ 25 bouteilles (la taille lue comme une quantité).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t313');
const { s, port } = await serveur();
const b = await chromium.launch();
const V = (id, nm, px) => ({ id, nm, px, pa: Math.round(px * 0.8), stk0: 40, qBase: 1 });
const d = nouvelleBoutique();
d.articles = [
  { id: 1, nm: 'Bière locale', e: '🍺', cat: 'Boissons', px: 600, pa: 300, stk0: 40, al: 0, vr: [] },
  { id: 5, nm: 'Huile', e: '', cat: 'Alimentation', px: 1200, pa: 900, stk0: 0, al: 0, vr: [V(1, 'Diamaor', 1500), V(2, 'Mayor', 1100), V(3, 'Locale', 900), V(4, 'Huile coco', 600)] },
  { id: 27, nm: 'Reaktor', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'REAKTOR A', 300), V(2, 'Reaktor B', 500)] },
  { id: 140, nm: 'Top ananas 60 cl', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Top ananas 60 cl', 350), V(2, 'Coca Cola 50 cl', 250), V(3, 'Coca Cola 1 L', 500), V(4, 'Coca Cola 1,5 L', 600)] },
  { id: 141, nm: 'Savon vaisselle en pâte', e: '', cat: 'Ménage', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Savon vaisselle en pâte', 200), V(2, 'Savon ménage', 300), V(3, 'Savon bébé', 400), V(4, 'Savon noir africain', 300)] },
  { id: 145, nm: 'Jus', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Jus ananas 75 cl', 750), V(2, 'Jus ananas 25cl', 250)] },
  { id: 147, nm: 'Boisson predator', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vr: [V(1, 'Boisson Predator 33 cl', 330), V(2, 'Boisson Predator 1,25 L', 1250), V(3, 'Boisson Predator 1,5 L', 1500), V(5, 'Boisson Predator 25 cl', 250)] },
  { id: 40, nm: 'Mützig 65 cl', e: '', cat: 'Boissons', px: 650, pa: 520, stk0: 48, al: 0, vr: [] },
];
d.cfg.varStyle = 'plat';
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
const dire = ph => p.evaluate(ph => { viderPanier(); const R = _voixPanier(ph); return { panier: JSON.parse(JSON.stringify(panier)), choix: R.aChoisir.map(x => x.nm), absents: R.absents }; }, ph);
const cas = [
  ['savon bébé', { '141-3': 1 }, 'la sorte dite seule, sans sa famille (avant : rien)'],
  ['deux savon bébé', { '141-3': 2 }, 'avec la quantité'],
  ['coca cola 1 L', { '140-3': 1 }, 'rangée sous « Top ananas » (avant : rien)'],
  ['trois coca cola 1,5 L', { '140-4': 3 }, '1,5 L et pas 1 L — la virgule ne coupe plus la phrase'],
  ['reaktor B', { '27-2': 1 }, 'la lettre départage A et B (avant : « quelle sorte ? »)'],
  ['jus ananas 25 cl', { '145-2': 1 }, '« 25 cl » est la taille, pas 25 bouteilles'],
  ['deux jus ananas 75 cl', { '145-1': 2 }, '« 75 cl » écrit séparé, nom écrit « 75 cl »'],
  ['boisson predator 1,5 L', { '147-3': 1 }, '1,5 L et pas 1,25 L'],
  ['deux Mayor', { '5-2': 2 }, 'une marque seule'],
  ['bière locale', { '1-0': 1 }, '« bière locale » reste la bière, pas l\'huile « Locale »'],
  ['deux Mützig et un savon bébé', { '40-0': 2, '141-3': 1 }, 'une commande de deux lignes'],
];
for (const [ph, att, lib] of cas) {
  const r = await dire(ph);
  t(JSON.stringify(r.panier) === JSON.stringify(att), `« ${ph} » → ${JSON.stringify(r.panier)} : ${lib}` + (JSON.stringify(r.panier) === JSON.stringify(att) ? '' : ` (attendu ${JSON.stringify(att)}, choix ${r.choix}, absents ${r.absents})`));
}
// Un mot passe-partout n'attrape pas une sorte au hasard.
const r1 = await dire('un grand');
t(!Object.keys(r1.panier).length, '« un grand » ne met rien au panier');
// ── La phrase répétée par le téléphone (sa capture) ──
const rep = await p.evaluate(() => [_sansRepetition('savon bebe savon bebe savon bebe'), _sansRepetition('deux Mützig deux Mützig'), _sansRepetition('deux Mützig et trois Mützig'), _sansRepetition('riz')]);
t(rep[0] === 'savon bebe' && rep[1] === 'deux Mützig' && rep[2] === 'deux Mützig et trois Mützig' && rep[3] === 'riz', `la phrase répétée compte une fois : « ${rep[0]} », « ${rep[1]} » ; une vraie commande reste entière`);
const r2 = await p.evaluate(() => { viderPanier(); window.__dit = []; _voixTraiterTexte('savon bebe savon bebe savon bebe'); return JSON.parse(JSON.stringify(panier)); });
t(JSON.stringify(r2) === '{"141-3":1}', `dictée « savon bebe ×3 » → un savon bébé au panier (avant : la recherche « savon bebe savon bebe savon bebe », rien au panier)`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
