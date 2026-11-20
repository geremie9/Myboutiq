// t297 — LE PANIER À LA VOIX (23.83).
// Le patron, le 20/11/2026, avec la capture de sa caisse G (point orange de
// la voix payante allumé) : « avec l'aide de ton API, l'app doit être
// capable, de façon automatique, de mettre les articles prononcés dans le
// panier ; le commerçant valide juste ».
// Vu sur la même capture : la recherche affichait « … » — le service rend
// « … » quand il n'a entendu que le silence.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t297');
const { s, port } = await serveur();
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const URL_VOIX = 'https://bbncilovxzkcvlxvoqtg.supabase.co/functions/v1/voix';
const d = nouvelleBoutique();
d.articles.push({ id: 40, nm: 'Mützig 65 cl', e: '🍺', cat: 'Boissons', px: 750, pa: 620, stk0: 24, al: 0, vd: 0 });
d.articles.push({ id: 41, nm: 'Eau Tangui', e: '💧', cat: 'Boissons', px: 400, pa: 300, stk0: 36, al: 0, vd: 0 });
d.articles.push({ id: 42, nm: 'Biscuit Tonton', e: '🍪', cat: 'Alimentation', px: 100, pa: 80, stk0: 0, al: 0, vd: 0,
  vr: [{ id: 421, nm: 'Vanille', px: 100, pa: 80, stk0: 10 }, { id: 422, nm: 'Chocolat', px: 100, pa: 80, stk0: 10 }] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
let texte = '';
await p.route(URL_VOIX, async r => {
  const ct = r.request().headers()['content-type'] || '';
  if (ct.includes('application/json')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reste: 36000 }) });
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, texte }) });
});
await p.evaluate(async () => { window._shopPin = '123456'; await voixProEtat(true); });
const dire = async phrase => {
  texte = phrase;
  await p.evaluate(() => { window.__toasts = []; document.getElementById('src-c').value = ''; document.querySelectorAll('.ov').forEach(o => o.classList.remove('show')); voiceSearch(); setTimeout(voixProArreter, 500); });
  await p.waitForFunction(() => (window.__toasts || []).some(x => !/Parle|écoute/i.test(x)) || document.getElementById('ov-pan').classList.contains('show'), null, { timeout: 12000 }).catch(() => {});
  await p.waitForTimeout(400);
  return p.evaluate(() => ({ panier: JSON.parse(JSON.stringify(panier)), ouvert: document.getElementById('ov-pan').classList.contains('show'), toasts: window.__toasts.slice(), q: document.getElementById('src-c').value }));
};

// ── 1. « Deux Mützig et un Tangui » : dans le panier, le panier s'ouvre ──
let r = await dire('Donne-moi deux Mützig et un Tangui.');
t(r.panier['40-0'] === 2 && r.panier['41-0'] === 1, `« deux Mützig et un Tangui » : 2 Mützig et 1 Tangui dans le panier (${JSON.stringify(r.panier)})`);
t(r.ouvert, 'le panier s\'ouvre : il n\'a plus qu\'à valider');
t(r.toasts.some(x => /2 Mützig.*1 Eau Tangui/.test(x)), `il voit ce qui a été compris (« ${r.toasts.find(x => /🛒/.test(x)) || ''} »)`);
t(r.q === '', 'la recherche n\'est pas remplie : ce n\'était pas une recherche');

// ── 2. Les chiffres, les fautes d'une lettre ──
await p.evaluate(() => viderPanier());
r = await dire('3 mutzig, une sardine'); // « sardine » n'existe pas dans cette boutique
t(r.panier['40-0'] === 3, `« 3 mutzig » (sans tréma) : 3 Mützig (${r.panier['40-0'] || 0})`);
t(r.toasts.some(x => /Pas trouvé : une sardine/.test(x)), 'ce qui n\'existe pas est dit (« Pas trouvé »), jamais ajouté au hasard');

// ── 3. Une famille à plusieurs sortes : on ne devine pas ──
await p.evaluate(() => viderPanier());
r = await dire('un biscuit tonton');
const v3 = await p.evaluate(() => ({ ouvert: !!document.querySelector('.vinline'), panier: Object.keys(panier).length }));
t(v3.panier === 0 && v3.ouvert && r.toasts.some(x => /Quelle sorte de Biscuit Tonton/.test(x)), '« un biscuit Tonton » : ses sortes s\'ouvrent en images, rien n\'est deviné');
await p.evaluate(() => { document.querySelectorAll('.vinline').forEach(x => x.remove()); try { fermerVarInline(); } catch (e) {} viderPanier(); });
r = await dire('deux tonton vanille');
t(r.panier['42-421'] === 2, `« deux Tonton vanille » : la bonne sorte, directement (${JSON.stringify(r.panier)})`);
// Trois savons dans la boutique : « un savon » ne choisit pas — la grille les montre.
await p.evaluate(() => viderPanier());
r = await dire('un savon');
const sav = await p.evaluate(() => [...document.querySelectorAll('#pgrid .pcard')].filter(c => c.offsetParent).map(c => (c.querySelector('.pnm-ov') || c).textContent).join('|'));
t(!Object.keys(r.panier).length && r.q === 'savon' && /Azur/.test(sav) && /Mont Claire/.test(sav), `« un savon » parmi trois savons : rien n'est deviné, la recherche montre les savons (« ${r.q} »)`);

// ── 4. Le silence : « … » ne va nulle part ──
await p.evaluate(() => viderPanier());
r = await dire('...');
t(r.q === '' && !Object.keys(r.panier).length && r.toasts.some(x => /rien entendu/.test(x)), `le silence (« … ») : « Je n'ai rien entendu », la recherche reste vide (avant : « Créer « … » moi-même »)`);
r = await dire('Sous-titrage ST\' 501');
t(r.q === '' && r.toasts.some(x => /rien entendu/.test(x)), 'une phrase fantôme de sous-titres est ignorée aussi');

// ── 5. Un mot qui n'est pas un article : c'est une recherche, comme avant ──
r = await dire('tomate');
t(r.q === 'tomate' && !Object.keys(r.panier).length, `un mot inconnu reste une recherche (« ${r.q} »)`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
