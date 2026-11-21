// t311 — LA VOIX DIT LES KILOS ET LES LITRES COMME AU COMPTOIR (23.95).
// Le patron, le 21/11/2026 : « tous ceux qui ont kg se vendent comment ? »,
// puis « el litre aussi ». En relisant ce que l'app DIT d'eux (elle parle à
// chaque vente depuis la 23.93) : la relecture d'une commande et l'alerte de
// stock recopiaient l'écran — « 0,25 kg Riz », « plus que 2 L de Huile ».
// La voix lit « L » comme la lettre (« deux elle »), « zéro virgule vingt-cinq
// kg », et « de huile ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t311');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles[1].um = 'kg'; d.articles[1].px = 700; d.articles[1].pa = 600; d.articles[1].al = 5; d.articles[1].stk0 = 6;   // Riz au kilo (id 2)
d.articles.push({ id: 41, nm: 'Huile Diamaor', e: '', cat: 'Alimentation', px: 1400, pa: 1200, stk0: 3, al: 2, vd: 0, um: 'L' });
d.articles.push({ id: 42, nm: 'Tomates', e: '', cat: 'Vivrier', px: 1000, pa: 700, stk0: 10, al: 0, vd: 0, umNom: 'cuvette' });
d.articles.push({ id: 40, nm: 'Mützig 65 cl', e: '', cat: 'Boissons', px: 650, pa: 520, stk0: 48, al: 0, vd: 9 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
await p.evaluate(() => { parler = window.__parlerVrai; window.__dit = []; window.speechSynthesis.speak = u => window.__dit.push(u.text); window.speechSynthesis.cancel = () => {}; });

// ── 1. Les quantités, à l'oreille ──
const q = await p.evaluate(() => {
  const a = id => DB.articles.find(x => x.id === id);
  return [
    _qteNomDit(a(2), 0.25, 'Riz'), _qteNomDit(a(2), 0.5, 'Riz'), _qteNomDit(a(2), 0.286, 'Riz'), _qteNomDit(a(2), 0.004, 'Safran'),
    _qteNomDit(a(2), 1, 'Riz'), _qteNomDit(a(2), 2.5, 'Riz'),
    _qteNomDit(a(41), 0.5, 'Huile Diamaor'), _qteNomDit(a(41), 0.75, 'Huile Diamaor'), _qteNomDit(a(41), 2, 'Huile Diamaor'),
    _qteNomDit(a(42), 0.5, 'Tomates'), _qteNomDit(a(42), 2, 'Tomates'), _qteNomDit(a(40), 3, 'Mützig 65 cl')];
});
const att = ['un quart de kilo de Riz', 'un demi-kilo de Riz', '290 grammes de Riz', '4 grammes de Safran',
  'un kilo de Riz', '2,5 kilos de Riz',
  "un demi-litre d'Huile Diamaor", "75 centilitres d'Huile Diamaor", "2 litres d'Huile Diamaor",
  'une demi-cuvette de Tomates', '2 cuvettes de Tomates', '3 Mützig 65 cl'];
q.forEach((x, i) => t(x === att[i], `« ${x} »` + (x === att[i] ? '' : ` (attendu « ${att[i]} »)`)));
t(!q.some(x => /\bL\b|kg|0,/.test(x)), 'jamais « L », « kg » ni « 0, » dans ce que la voix dit');

// ── 2. L'alerte de stock après une vraie vente ──
await vendre(p, { lignes: [[41, 2]] });          // 3 L − 2 = 1 L, sous l'alerte (2)
let dit = await p.evaluate(() => { const l = window.__dit.join(' | '); window.__dit = []; return l; });
t(/plus qu'un litre d'Huile Diamaor/.test(dit) && !/ L /.test(dit), `l'huile qui baisse : « ${dit} » (avant : « plus que 1 L de Huile Diamaor »)`);
await vendre(p, { lignes: [[2, 2]] });           // 6 kg − 2 = 4 kg, sous l'alerte (5)
dit = await p.evaluate(() => { const l = window.__dit.join(' | '); window.__dit = []; return l; });
t(/plus que 4 kilos de Riz/.test(dit), `le riz qui baisse : « ${dit} »`);
// Le kilo vendu au gramme : ce qui reste se dit en grammes.
dit = await p.evaluate(async () => {
  viderPanier(); window.__dit = []; _qteArt = DB.articles.find(x => x.id === 2); qtePourMontant(2600);   // 3,714 kg
  procederPmt(); selPmntVente('especes'); document.getElementById('calc-recu').value = 3000; calcMonnaie(true);
  await encaisser(); document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
  const l = window.__dit.join(' | '); window.__dit = []; return l; });
t(/plus que 290 grammes de Riz/.test(dit), `après « pour 2600 » de riz : « ${dit} »`);

// ── 3. La relecture d'une commande dictée ──
const r3 = await p.evaluate(() => {
  const a = id => DB.articles.find(x => x.id === id);
  return [_voixNomLigne({ p: a(2), q: 0.25 }, true), _voixNomLigne({ p: a(2), q: 0.25 }), _voixNomLigne({ p: a(2), q: 0.714, mt: 500 }, true), _voixNomLigne({ p: a(2), q: 1.43, mt: 1000 }, true)];
});
t(r3[0] === 'un quart de kilo de Riz', `relu : « ${r3[0]} » (avant : « 0,25 kg Riz »)`);
t(r3[1] === '0,25 kg Riz', `l'écrit (le message à l'écran) ne change pas : « ${r3[1]} »`);
t(r3[2] === 'Riz pour 500 francs' && r3[3] === 'Riz pour 1000 francs', `« pour un montant » se dit en francs, sans espace qui fasse épeler : « ${r3[3]} »`);

// ── 4. En anglais ──
const en = await p.evaluate(() => { lang = 'en'; const a = id => DB.articles.find(x => x.id === id); const r = [_qteNomDit(a(2), 0.5, 'Rice'), _qteNomDit(a(41), 2, 'Oil')]; lang = 'fr'; return r; });
t(en[0] === 'half a kilo of Rice' && en[1] === '2 liters of Oil', `en anglais : « ${en.join(' », « ')} »`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
