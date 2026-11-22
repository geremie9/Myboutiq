// t312 — LE MICRO AU POUCE (23.96).
// Le patron, le 22/11/2026 : « le tactile pour les autres et le vocal pour
// les autres ». Le micro existait, petit, en haut, à côté de la recherche :
// loin du pouce, et rien ne disait qu'on pouvait y dire toute une commande.
// Un gros bouton en bas à droite : une tape, on dit la commande, elle va au
// panier et l'app la relit ; rouge pendant l'écoute, une tape l'arrête.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t312');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles[1].um = 'kg'; d.articles[1].px = 700;
d.articles.push({ id: 40, nm: 'Mützig 65 cl', e: '', cat: 'Boissons', px: 650, pa: 520, stk0: 48, al: 0, vd: 9 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
// Une fausse dictée du téléphone, pilotée par le banc (pas de voix payante).
await p.evaluate(() => {
  window.__sr = { texte: '', repond: true, arrets: 0 };
  function SR() { const r = this; this.start = () => { if (window.__sr.repond) setTimeout(() => { r.onresult && r.onresult({ results: [[{ transcript: window.__sr.texte }]] }); r.onend && r.onend(); }, 120); };
    this.stop = () => { window.__sr.arrets++; setTimeout(() => r.onend && r.onend(), 10); }; this.abort = () => {}; }
  window.SpeechRecognition = window.webkitSpeechRecognition = SR;
  _vpro = { ok: false, ts: Date.now(), code: DB.cfg.code };
  window.__dit = []; parler = window.__parlerVrai; window.speechSynthesis.speak = u => window.__dit.push(u.text); window.speechSynthesis.cancel = () => {};
});
const etat = () => p.evaluate(() => { const m = document.getElementById('mic-pouce'), r = m.getBoundingClientRect();
  return { vu: getComputedStyle(m).display !== 'none' && r.width >= 60, rouge: m.classList.contains('ecoute'), bas: innerHeight - r.bottom, droite: innerWidth - r.right, texte: m.innerText.trim(), panier: JSON.parse(JSON.stringify(panier)) }; });

// ── 1. Il est là, sous le pouce ──
let e = await etat();
t(e.vu && e.bas < 160 && e.droite < 30, `à la caisse : un micro de 66 px en bas à droite, sous le pouce (${Math.round(e.bas)} px du bas)`);
t(e.texte === 'Parle', `il dit ce qu'il fait : « ${e.texte} »`);

// ── 2. Une tape, une commande : au panier, et relue ──
await p.evaluate(() => { window.__sr.texte = 'deux Mützig et pour 200 de riz'; });
await p.click('#mic-pouce');
e = await etat();
t(e.rouge && e.texte === 'Stop', 'pendant l\'écoute : rouge, « Stop »');
await p.waitForTimeout(600);
e = await etat();
const dit = await p.evaluate(() => window.__dit.join(' | '));
t(e.panier['40-0'] === 2 && e.panier['2-0'] > 0, `la commande est au panier (${JSON.stringify(e.panier)})`);
t(/2 Mützig/.test(dit) && /total/.test(dit), `et relue à voix haute : « ${dit} »`);
// Trouvé en route : la première tape du jour sur le micro lançait « Bonjour Marie ! »
// pendant la dictée — le micro l'entend, et il coupait la relecture.
t(!/Bonjour|Bonsoir/.test(dit), 'le bonjour du matin ne part pas sur la tape du micro (avant : « Bonjour Marie ! » pendant la dictée)');
await p.mouse.click(60, 300); await p.waitForTimeout(600);
t(/Bonjour|Bonsoir/.test(await p.evaluate(() => window.__dit.join(' | '))), 'il attend le geste suivant');
t(!e.rouge && e.texte === 'Parle', 'la commande arrivée : le bouton redevient calme');

// ── 3. Panier rempli : il monte au-dessus de la barre « Encaisser » ──
const chev = await p.evaluate(() => { const m = document.getElementById('mic-pouce').getBoundingClientRect(), f = document.querySelector('#fcart .cpill').getBoundingClientRect(); return { micBas: m.bottom, barreHaut: f.top }; });
await p.waitForTimeout(400);
const chev2 = await p.evaluate(() => { const m = document.getElementById('mic-pouce').getBoundingClientRect(), f = document.querySelector('#fcart .cpill').getBoundingClientRect(); return { micBas: m.bottom, barreHaut: f.top }; });
t(chev2.micBas <= chev2.barreHaut + 1, `il ne cache pas « Encaisser » (bas du micro ${Math.round(chev2.micBas)} ≤ haut de la barre ${Math.round(chev2.barreHaut)})`);

// ── 4. Une tape pendant l'écoute l'arrête ──
await p.evaluate(() => { viderPanier(); window.__sr.repond = false; window.__sr.arrets = 0; });
await p.click('#mic-pouce');
t((await etat()).rouge, 'il écoute…');
await p.click('#mic-pouce');
await p.waitForTimeout(100);
e = await etat();
t(!e.rouge && await p.evaluate(() => window.__sr.arrets) === 1, 'une deuxième tape l\'arrête (la dictée est stoppée, le bouton redevient calme)');

// ── 5. Jamais rouge pour toujours ──
await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); _vLoc = { etat: 'absent', ts: Date.now() }; window.__toasts = []; });
await p.click('#mic-pouce');
await p.waitForTimeout(100);
e = await etat();
t(!e.rouge && /Pas d'internet/.test(await p.evaluate(() => window.__toasts.join(' '))), 'sans internet et sans voix du téléphone : il le dit, et ne reste pas rouge');
await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }); window.__sr.repond = false; });
await p.click('#mic-pouce');
await p.waitForTimeout(15300);
t(!(await etat()).rouge, 'la dictée ne répond jamais : au bout de 15 s, le bouton redevient calme tout seul');

// ── 6. Seulement à la caisse ──
await p.evaluate(() => navTo('stock', document.querySelector('.ni-stock')));
await p.waitForTimeout(300);
t(!(await etat()).vu, 'dans le Stock : pas de micro');
await p.evaluate(() => navTo('caisse', document.querySelector('.bnav .ni')));
await p.waitForTimeout(300);
t((await etat()).vu, 'retour à la caisse : il revient');
t(await p.evaluate(() => !!document.getElementById('btn-mic')), 'le petit micro de la recherche reste (appui long : l\'écoute continue)');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
