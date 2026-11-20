// t306 — LA VOIX COMPREND LES PHRASES LIBRES ET RELIT LE PANIER (23.91).
// Le patron, le 20/11/2026 : « pour une voix maîtrisée et plus fiable, on
// fera la combinaison de quel outil ? », puis « Go 1+2 ». Ici la partie 1 :
//   · couche 3 — ce que le téléphone n'a pas compris part au serveur, qui le
//     rend en lignes de panier (numéros du catalogue seulement) ;
//   · couche 4 — le panier est relu à voix haute, total compris.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t306');
const { s, port } = await serveur();
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const URL_VOIX = 'https://bbncilovxzkcvlxvoqtg.supabase.co/functions/v1/voix';
const d = nouvelleBoutique();
d.articles[1].um = 'kg'; d.articles[1].px = 700; d.articles[1].pa = 600;          // Riz au kilo (id 2)
d.articles.push({ id: 40, nm: 'Mützig 65 cl', e: '', cat: 'Boissons', px: 650, pa: 520, stk0: 48, al: 0, vd: 9 });
d.articles.push({ id: 50, nm: 'Top', e: '', cat: 'Boissons', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
  vr: [{ id: 501, nm: 'Ananas', px: 700, pa: 550, stk0: 24 }, { id: 502, nm: 'Pamplemousse', px: 700, pa: 550, stk0: 24 }] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
let texte = '', reponse = { ok: true, lignes: [] }, demandes = [];
await p.route(URL_VOIX, async r => {
  const ct = r.request().headers()['content-type'] || '';
  if (ct.includes('application/json')) {
    const c = JSON.parse(r.request().postData() || '{}');
    if (c.action === 'comprendre') { demandes.push(c); return r.fulfill({ status: reponse.status || 200, contentType: 'application/json', body: JSON.stringify(reponse) }); }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reste: 36000 }) });
  }
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, texte }) });
});
// « L'app parle » reste COUPÉ : la relecture d'une commande parle quand même.
await p.evaluate(async () => { window._shopPin = '123456'; DB.cfg.voix = false; window.__dit = [];
  window.speechSynthesis.speak = u => window.__dit.push(u.text); window.speechSynthesis.cancel = () => {}; await voixProEtat(true); });
const dire = async phrase => {
  texte = phrase;
  await p.evaluate(() => { window.__toasts = []; window.__dit = []; viderPanier(); document.getElementById('src-c').value = ''; document.querySelectorAll('.ov').forEach(o => o.classList.remove('show')); voiceSearch(); setTimeout(voixProArreter, 400); });
  await p.waitForFunction(() => window.__dit.length > 0 || (document.getElementById('src-c') || {}).value, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(300);
  return p.evaluate(() => ({ panier: JSON.parse(JSON.stringify(panier)), total: calcTotal(), dit: window.__dit.join(' | '), toast: window.__toasts.join(' / '), q: document.getElementById('src-c').value }));
};

// ── 1. « deux Mützig et pour 200 de riz » : compris sur le téléphone, relu ──
demandes = [];
let r = await dire('deux Mützig et pour 200 de riz');
t(r.panier['40-0'] === 2 && r.total === 1500 && demandes.length === 0, `compris sur place : 2 Mützig + riz pour 200 = ${r.total} F, sans appeler le serveur`);
t(/2 Mützig 65 cl/.test(r.dit) && /Riz pour 200/.test(r.dit) && /total mille cinq cents francs|total 1\s?500 francs/i.test(r.dit), `relu à voix haute, même « l'app parle » coupé : « ${r.dit} »`);

// ── 2. Une phrase libre : le serveur comprend, le téléphone revérifie ──
demandes = []; reponse = { ok: true, lignes: [{ id: '40', sorte: null, qte: 3, montant: null }], inconnus: [] };
r = await dire('ma sœur mets-moi trois grosses vertes et le riz là pour trois cents');
const env = demandes[0] || {};
t(demandes.length === 1 && /vertes/.test(env.texte) && !/riz/.test(env.texte) && Array.isArray(env.articles) && env.articles.some(a => a.id === '50' && a.s && a.s.length === 2) && env.articles.some(a => a.id === '2' && a.m === 1), 'les morceaux non compris partent au serveur, avec le catalogue (sortes, articles au poids)');
t(r.panier['40-0'] === 3 && r.total === 3 * 650 + 300, `« trois grosses vertes » compris par le serveur (3 Mützig), « riz pour trois cents » sur place (300 F, pas 3 kg) → ${r.total} F`);
t(/3 Mützig/.test(r.dit) && /pour 300/.test(r.dit), `et le panier est relu : « ${r.dit} »`);

// ── 3. Une famille sans la sorte : on demande, on ne devine pas ──
reponse = { ok: true, lignes: [{ id: '50', sorte: null, qte: 2 }], inconnus: [] };
r = await dire('donne deux jus là');
t(!Object.keys(r.panier).length && /Quelle sorte de Top/.test(r.dit), `« deux jus là » → Top sans sorte : « ${r.dit} »`);
reponse = { ok: true, lignes: [{ id: '50', sorte: '502', qte: 2 }, { id: '999', qte: 4 }], inconnus: ['sardine'] };
r = await dire('deux top pample et une sardine');
t(r.panier['50-502'] === 2 && !Object.keys(r.panier).some(k => k.startsWith('999')) && /sardine/.test(r.dit), `la bonne sorte (2 Pamplemousse), un numéro inconnu ignoré, « sardine » dite comme pas trouvée`);

// ── 4. Le serveur en panne : la recherche, comme avant ──
reponse = { ok: false, status: 502, motif: 'service' };
r = await dire('tomate');
t(r.q === 'tomate' && !Object.keys(r.panier).length, `serveur en panne : un mot inconnu reste une recherche (« ${r.q} »)`);
const md = await p.evaluate(() => [_montantDit('riz pour cent'), _montantDit('pour deux cents de sucre'), _montantDit('pour mille cinq cents'), _montantDit('pour 500 francs'), _montantDit('trois kilos de riz')]);
t(md.join(',') === '100,200,1500,500,0', `les montants dits en lettres : ${md.join(', ')}`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
