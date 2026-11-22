// t319 — LA PASTILLE DE RAYON (24.02).
// Le patron, le 22/11/2026 : « dans un écran deux rangées d'articles
// seulement — s'il y avait mille, combien de défilement ? » Mesuré au banc :
// 1 000 articles = ≈ 60 écrans (100 avec ses photos). Dans « Tout », au-delà de
// 40 articles : les 30 qui comptent, puis une pastille par rayon.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t319');
const { s, port } = await serveur();
const b = await chromium.launch();
const cats = ['Boissons', 'Alimentation', 'Ménage', 'Hygiène', 'Divers', 'Conserves', 'Céréales', 'Bébé'];
const d = nouvelleBoutique();
d.articles = [];
for (let i = 0; i < 1000; i++) d.articles.push({ id: 1000 + i, nm: 'Article ' + i, e: '', cat: cats[i % 8], px: 100 + i, pa: 50, stk0: 20, al: 0, vr: [] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
const vue = () => p.evaluate(() => ({ tuiles: document.querySelectorAll('#pgrid > [id^="pc-"]').length, rayons: [...document.querySelectorAll('#pgrid .prayon')].map(x => x.innerText.replace(/\s+/g, ' ').trim()), haut: document.getElementById('pgrid').scrollHeight, ecran: innerHeight }));

// ── 1. « Tout » : 30 articles, puis une pastille par rayon ──
let v = await vue();
t(v.tuiles === 30 && v.rayons.length === 8, `1 000 articles : 30 tuiles, puis ${v.rayons.length} pastilles de rayon`);
t(/Boissons 1\d\d autres ›/.test(v.rayons.join(' | ')), `la pastille dit le rayon et ce qu'il reste : « ${v.rayons[0]} »`);
const ecrans = v.haut / (v.ecran - 280);
t(ecrans < 6, `« Tout » tient en ≈ ${ecrans.toFixed(1)} écrans (avant : ≈ 60)`);
// ── 2. La pastille ouvre le rayon entier ──
await p.click('#pgrid .prayon >> nth=0');
await p.waitForTimeout(200);
v = await vue();
const on = await p.evaluate(() => (document.querySelector('#tabs-c .tpil.on span') || {}).textContent);
t(on && !v.rayons.length && v.tuiles >= 60, `la pastille ouvre le rayon « ${on} » : ses articles, sans pastille (${v.tuiles} dessinés, le reste en descendant)`);
// ── 3. La recherche montre tout ──
await p.evaluate(() => { document.querySelector('#tabs-c .tpil').click(); const c = document.getElementById('src-c'); c.value = 'Article 99'; filtrC('Article 99'); });
v = await vue();
t(v.tuiles === 11 && !v.rayons.length, `chercher « Article 99 » : les 11 qui répondent, même derrière une pastille (${v.tuiles})`);
await p.evaluate(() => { const c = document.getElementById('src-c'); c.value = ''; filtrC(''); });
// ── 4. Une tuile cherchée par l'app (article caché) est trouvée ──
const tr = await p.evaluate(() => !!_tuileCaisse(1987));
t(tr, 'une tuile cachée derrière une pastille reste atteignable (_tuileCaisse)');
// ── 5. Une petite boutique ne change pas ──
await p.evaluate(() => { DB.articles = DB.articles.slice(0, 35); initTabs(); renderProd(DB.articles); });
v = await vue();
t(v.tuiles === 35 && !v.rayons.length, '35 articles : tout est posé, aucune pastille');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
