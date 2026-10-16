// t241 — L'ÉCOUTE EN CONTINU N'ENTEND QUE LES NOMS D'ARTICLES (23.22).
// Son idée : « le micro devrait juste entendre les noms des articles dans une
// conversation et réorganiser instantanément. Un client parle sa langue
// locale mais prononce les noms en français ; l'app se fout du reste. »
// Sur la 23.21 : le nom ENTIER devait être dans la phrase (« bière castel
// 33 cl » — personne ne le dit), 13 articles sur 23 ; le réseau coupé
// relançait le micro en boucle (un bip par tour) ; rien n'était compté.
// La reconnaissance du téléphone est remplacée par une fausse, pilotée par
// le banc : on lui fait « dire » des phrases, perdre le réseau, s'arrêter.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t241');
const { s, port } = await serveur();
const b = await chromium.launch();

// Noms réels de la production (noms de produits seulement) et phrases de
// comptoir telles que la reconnaissance française les écrirait.
const NOMS = `33 export|acide chlorhydrique|adaptateur de prise|agrafeuse|ail frais|allumettes|amouré|ampoule à incandescence|aubergine|avocat|azur|basilic frais|basilic séché|bâton de manioc|beignet|beurre|bicarbonate alimentaire|bière 33 export 33 cl|bière beaufort 33 cl|bière castel 33 cl|bière guinness 33 cl|bière kadji 33 cl|bière locale|biscuit salé|biscuit sucré|biscuits|boisson predator|bonbon|bougie|bullet|cacahuète salée|café soluble|cahier|cannelle|carotte|castel milk stout 65 cl|céleri|chips plantain|chou|citron|clou de girofle|coca cola|concentré de tomate|concombre|coque de téléphone|couscous de maïs|crayon à sourcils|crédit tél.|cube jumbo|cube maggi|cube onga|cuillère|déboucheur canalisation|eau minérale|egusi|farine|farine (kg)|fromage|gin|guness|heineken 33 cl|huile|huile d'arachide|huile de cuisine|huile de palme|huile diamaor|igname|jambon|jazz|jus|jus ananas|jus baobab|jus bissap|jus de fruit|jus fruitki 1 l|jus gingembre|jus goyave|jus mangue|jus orange|jus planète|jus reaktor|l'huile mayor 1l|l'huile mayor 5l|lait concentré|lait peak|lessive|macabo|maïs frais|mandarine|mangue|mayor 1l|ndolé|niébé|oeuf|oignon|orange|orangina|oseille|pain|pain mie|riz|riz (kg)|riz 1kg|riz bijou|sachet d'eau|salaka|sardine|sardine pimenté|sardines|savon|savon anti crise|savon azur|savon vaisselle en pâte|sucre|sucre (kg)|tomate elena|tomate fraîche|top ananas 60 cl|top jus|vimto|vin palme|vodka|xxl énergie`.split('|');
const CAS = [
  ['mbolo ma tanti donne moi deux castel', ['bière castel 33 cl', 'castel milk stout 65 cl']],
  ['a sa kwa guinness deux', ['bière guinness 33 cl']],
  ['tu as le savon azur ma soeur', ['savon azur']],
  ['bring me riz bijou small small', ['riz bijou']],
  ['mama yé sardine pimentée trois', ['sardine pimenté']],
  ['ouais donne cube maggi et cube jumbo', ['cube maggi', 'cube jumbo']],
  ['na di wa huile de palme un litre', ['huile de palme']],
  ['eh tanti lait concentré', ['lait concentré']],
  ['wa ka sa top ananas', ['top ananas 60 cl']],
  ['je veux heineken bien glacé', ['heineken 33 cl']],
  ['mon frère allumettes et bougie', ['allumettes', 'bougie']],
  ['tomate elena deux boîtes', ['tomate elena']],
  ['a bolo jus de gingembre', ['jus gingembre']],
  ['biscuit sucré pour le petit', ['biscuit sucré']],
  ['ndolé ndolé ma mère', ['ndolé']],
  ['mi wan sachet d eau', ["sachet d'eau"]],
  ['donne oignon et ail', ['oignon']],
  ['un coca cola froid', ['coca cola']],
  ['huile diamaor', ['huile diamaor']],
  ['castel milk stout', ['castel milk stout 65 cl']],
  ['mbolo a ma ka yé sa wa na mi', []],
  ['how na ma broda you dey', []],
  ['a ndo bi ke ma sa la', []],
  ['ça va la famille on dit quoi', []],
  ['wé wé on est ensemble', []],
];

const d = nouvelleBoutique();
const A = (id, nm) => ({ id, nm, e: '📦', cat: 'Divers', px: 500, pa: 400, stk0: 20, al: 0, vd: 0, vr: [] });
d.articles.push(A(41, 'Bière Castel 33 cl'), A(42, 'Castel Milk Stout 65 cl'), A(43, 'Cube Maggi'), A(44, 'Cube Jumbo'), A(46, 'Jus'),
  { id: 45, nm: 'Sucreries', e: '🥤', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vd: 0,
    vr: ['Top Ananas', 'Vimto', 'Coca Cola'].map((n, i) => ({ id: i + 1, nm: n, px: 400, pa: 300, stk0: 24, qBase: 1 })) });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);

// ── 1. La règle, sur les noms réels ──
const r = await p.evaluate(([NOMS, CAS]) => {
  const vrai = DB.articles; DB.articles = NOMS.map((nm, i) => ({ id: 1000 + i, nm, vr: [] }));
  let ok = 0, faux = 0, rate = 0; const det = [];
  try {
    CAS.forEach(([txt, att]) => {
      const got = _articlesEntendus(txt).map(id => NOMS[id - 1000]);
      att.forEach(e => got.includes(e) ? ok++ : (rate++, det.push('raté ' + e)));
      got.forEach(g => { if (!att.includes(g)) { faux++; det.push('faux ' + g + ' dans « ' + txt + ' »'); } });
    });
  } finally { DB.articles = vrai; }
  return { ok, faux, rate, det };
}, [NOMS, CAS]);
const att = CAS.reduce((n, c) => n + c[1].length, 0);
t(r.ok === att && r.faux === 0, `noms réels : ${r.ok}/${att} articles entendus, ${r.faux} faux (la 23.21 : 13/23, 1 faux)` + (r.det.length ? ' — ' + r.det.join(' ; ') : ''));

// ── 2. La fausse reconnaissance, pilotée par le banc ──
await p.evaluate(() => {
  const sr = window.__sr = { starts: 0, aborts: 0, cur: null };
  function FSR() { this.continuous = false; this.interimResults = false; this.lang = ''; this._on = false; this._res = []; sr.cur = this; }
  FSR.prototype.start = function () { if (this._on) throw new Error('InvalidStateError'); this._on = true; this._res = []; sr.starts++; sr.cur = this; const z = this; setTimeout(() => z.onstart && z.onstart(), 0); };
  FSR.prototype.stop = function () { if (!this._on) return; this._on = false; const z = this; setTimeout(() => z.onend && z.onend(), 0); };
  FSR.prototype.abort = function () { sr.aborts++; if (!this._on) return; this._on = false; const z = this; setTimeout(() => z.onend && z.onend(), 0); };
  sr.dire = (txt, final) => { const z = sr.cur; if (!z || !z._on) return false; const res = z._res, last = res[res.length - 1];
    const x = [{ transcript: txt }]; x.isFinal = !!final;
    if (last && !last.isFinal) res[res.length - 1] = x; else res.push(x);
    z.onresult && z.onresult({ resultIndex: res.length - 1, results: res }); return true; };
  sr.erreur = code => { const z = sr.cur; z.onerror && z.onerror({ error: code }); if (z._on) { z._on = false; z.onend && z.onend(); } };
  sr.fin = () => { const z = sr.cur; if (!z || !z._on) return; z._on = false; z.onend && z.onend(); };
  window.SpeechRecognition = FSR; window.webkitSpeechRecognition = FSR;
  window.__rendus = 0; const rp = window.renderProd; window.renderProd = function () { window.__rendus++; return rp.apply(this, arguments); };
  window.__toasts.length = 0;
});
// L'appui long, puis le « clic » que le doigt levé produit (il est avalé).
await p.evaluate(() => { micLongPress(null); micTape(); }); await p.waitForTimeout(150);
const e0 = await p.evaluate(() => ({ on: ecouteContinue, st: __sr.starts, lbl: (document.getElementById('ec-etat') || {}).textContent || '' }));
t(e0.on && e0.st === 1 && /J'écoute les noms d'articles/.test(e0.lbl), `appui long : elle écoute, et le dit sous la recherche (« ${e0.lbl} »)`);

const tete = n => p.evaluate(n => Array.from(document.querySelectorAll('#pgrid .pcard')).slice(0, n).map(c => Number(c.id.replace('pc-', ''))), n);
// Il parle sa langue ; seul « castel » est un nom d'article. Phrase encore provisoire.
await p.evaluate(() => { __sr.dire('mbolo ma tanti', false); __sr.dire('mbolo ma tanti donne moi deux castel', false); });
await p.waitForTimeout(100);
let h = await tete(2), lbl = await p.evaluate(() => document.getElementById('ec-etat').textContent);
t(h.includes(41) && h.includes(42) && /Castel/.test(lbl), `« … deux castel » : les deux Castel en tête de la grille, avant la fin de la phrase (${h}) — « ${lbl} »`);
const rendus1 = await p.evaluate(() => __rendus);
// La phrase devient définitive, puis il répète : rien ne bouge.
await p.evaluate(() => { __sr.dire('mbolo ma tanti donne moi deux castel', true); __sr.dire('deux castel ma soeur', true); });
await p.waitForTimeout(100);
t(await p.evaluate(() => __rendus) === rendus1, 'la même phrase finie, puis « deux castel » répété : la grille ne saute pas une seconde fois');
await p.evaluate(() => { __sr.dire('a ndo bi ke ma sa la ça va la famille', true); });
await p.waitForTimeout(100);
t(await p.evaluate(() => __rendus) === rendus1, 'une phrase sans nom d\'article : rien ne bouge');
await p.evaluate(() => { __sr.dire('ouais donne cube maggi et cube jumbo', true); });
await p.waitForTimeout(100);
h = await tete(3);
t(h.slice(0, 2).sort().join() === '43,44' && (h[2] === 41 || h[2] === 42), `« cube maggi et cube jumbo » : les deux cubes passent devant, trois entendus au plus (${h})`);
await p.evaluate(() => { __sr.dire('tanti tu as le vimto', true); });
await p.waitForTimeout(100);
h = await tete(1);
t(h[0] === 45, `« vimto », une sorte de « Sucreries » : la famille remonte (${h})`);
// Les entendus passent devant sans toucher au classement des touches.
t(await p.evaluate(() => ordrePrio.indexOf(41) < 0 && ordrePrio.indexOf(45) < 0), 'entendre n\'est pas toucher : le classement au nombre de touches ne change pas');

// ── 3. Le réseau coupé : une pause, dite, et une reprise seule — pas de boucle ──
const st0 = await p.evaluate(() => __sr.starts);
await p.evaluate(() => { __toasts.length = 0; __sr.erreur('network'); });
await p.waitForTimeout(300);
const pz = await p.evaluate(() => ({ lbl: document.getElementById('ec-etat').textContent, cls: document.getElementById('ec-etat').className,
  btn: document.getElementById('btn-mic').className, st: __sr.starts, toasts: __toasts.slice() }));
t(/Écoute en pause — pas de réseau/.test(pz.lbl) && /pause/.test(pz.cls) && /pause/.test(pz.btn) && pz.toasts.some(x => /pas de réseau/.test(x)),
  `réseau coupé : « ${pz.lbl} », le micro passe au gris`);
t(pz.st === st0, `et le micro ne se relance PAS aussitôt (${pz.st - st0} relance)`);
await p.waitForTimeout(3000);
const st1 = await p.evaluate(() => ({ st: __sr.starts, pause: _ec.pause }));
t(st1.st === st0 + 1 && !st1.pause, `3 s après, un seul nouvel essai (${st1.st - st0})`);
await p.evaluate(() => __sr.erreur('network'));
await p.waitForTimeout(5000);
const st2 = await p.evaluate(() => ({ st: __sr.starts, n: __toasts.filter(x => /pas de réseau/.test(x)).length }));
t(st2.st === st0 + 1, `toujours pas de réseau : le suivant attend 10 s — 0 relance en 5 s (${st2.st - st0 - 1})`);
await p.evaluate(() => window.dispatchEvent(new Event('online')));
await p.waitForTimeout(150);
const st3 = await p.evaluate(() => ({ st: __sr.starts, pause: _ec.pause, lbl: document.getElementById('ec-etat').textContent, btn: document.getElementById('btn-mic').className }));
t(st3.st === st0 + 2 && !st3.pause && !/pause/.test(st3.btn) && !/pause/.test(st3.lbl), `le réseau revient : elle reprend tout de suite (« ${st3.lbl} »)`);

// ── 4. Des fins trop rapprochées (silence, micro capricieux) : la relance freine ──
const f0 = await p.evaluate(() => __sr.starts);
await p.evaluate(() => __sr.fin()); await p.waitForTimeout(50);
await p.evaluate(() => __sr.fin()); await p.waitForTimeout(400);
const f1 = await p.evaluate(() => __sr.starts);
await p.waitForTimeout(900);
const f2 = await p.evaluate(() => __sr.starts);
t(f1 === f0 + 1 && f2 === f0 + 2, `deux fins coup sur coup : la 1re relance tout de suite, la 2e attend 1 s (${f1 - f0} puis ${f2 - f0})`);

// ── 5. Les compteurs : anonymes, gardés, synchronisés ──
await p.waitForTimeout(1200);
await p.evaluate(() => micTape()); await p.waitForTimeout(200);
const c = await p.evaluate(() => {
  const m = DB.ecoute || {}, k = Object.keys(m), x = m[k[0]] || {};
  const lu = JSON.parse(localStorage.getItem('myboutiq_v6') || '{}').ecoute || {};
  return { on: ecouteContinue, etat: !!document.getElementById('ec-etat'), k, x, lu: JSON.stringify(lu), json: JSON.stringify(m) };
});
t(!c.on && !c.etat, 'une tape sur le micro : l\'écoute s\'arrête, la ligne d\'état disparaît');
t(c.k.length === 1 && c.x.s === 1 && c.x.tr === 5 && c.x.pa === 2 && c.x.sec >= 3 && c.x.jrs === 1,
  `compteurs de ce téléphone : 1 écoute, ${c.x.sec} s, ${c.x.tr} articles trouvés, ${c.x.pa} pauses réseau`);
t(c.lu === c.json && !/castel|cube|vimto|mbolo|tanti/i.test(c.json), 'gardés dans la boutique (stockage local) — que des nombres, ni phrase ni nom d\'article');
const m = await p.evaluate(() => {
  const dist = JSON.parse(JSON.stringify(DB)), moi = Object.keys(DB.ecoute)[0];
  dist.ecoute = { autre_tel: { s: 5, sec: 600, tr: 40, pa: 1 } }; dist.ecoute[moi] = { s: 0, sec: 0, tr: 0, pa: 0 };
  const f = mergeDB(dist, DB);
  return { k: Object.keys(f.ecoute).sort().join(), moi: f.ecoute[moi].tr, autre: f.ecoute.autre_tel.tr };
});
t(m.autre === 40 && m.moi === 5, `fusion avec un autre téléphone : ses chiffres arrivent (${m.autre}), une copie en retard n'efface pas les miens (${m.moi})`);
const z = await p.evaluate(() => { const x = migrateDBData({ cfg: {}, ecoute: { 'a<b>': { s: '3', tr: -2, mot: 'castel', j0: '<x>' }, ok: 7 } }); return JSON.stringify(x.ecoute); });
t(z === '{"ab":{"s":3,"sec":0,"tr":0,"pa":0,"jrs":0}}', `ce qui arrive d'ailleurs est réduit à des nombres (${z})`);

t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
