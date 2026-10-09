// t205 — LA BOUTIQUE D'EXEMPLE NE TOUCHE JAMAIS LA VRAIE. On y entre, on y
// vend pour essayer, on en sort : la vraie boutique revient intacte, et
// rien de l'exemple n'est jamais parti au serveur.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t205');
const { s, port } = await serveur();
const b = await chromium.launch();
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
await vendre(p, { lignes: [[2, 3]] });
await vendre(p, { lignes: [[5, 1]], mode: 'orange' });
const garde = () => p.evaluate(() => { const x = JSON.parse(localStorage.getItem('myboutiq_v6_avant_demo') || 'null'); return x ? { code: x.cfg.code, n: x.ventes.length, demo: !!x.cfg.demo } : null; });

await p.evaluate(async () => { await entrerDemo(); });
await p.waitForTimeout(400);
{
  const d = await p.evaluate(() => ({ demo: estDemo(), nom: DB.cfg.nom, n: DB.articles.length }));
  t(d.demo && /exemple/i.test(d.nom) && d.n > 5, `dans l'exemple : « ${d.nom} », ${d.n} articles`);
  const g = await garde();
  t(g && g.code === 'MARI0001' && g.n === 2 && !g.demo, `la vraie boutique est mise de côté, avec ses 2 ventes (${JSON.stringify(g)})`);
}
// ── RIEN NE PART AU SERVEUR ───────────────────────────────────────────
{
  const appels = await p.evaluate(async () => {
    let n = 0;
    const espion = new Proxy({}, { get: (o, k) => { n++; return espion; }, apply: () => { n++; return espion; } });
    const vrai = supa; supa = new Proxy(function () {}, { get: () => { n++; return () => espion; } });
    const sup = _suppressSync; _suppressSync = false;
    try { await syncToSupa(); } catch (e) {}
    supa = vrai; _suppressSync = sup;
    return n;
  });
  t(appels === 0, `l'exemple ne parle jamais au serveur (${appels} appel)`);
}
// ── ON Y VEND, PUIS ON REVIENT DEUX FOIS : LA VRAIE NE BOUGE PAS ──────
{
  const r = await p.evaluate(() => { const a = DB.articles.find(x => getStk(x) > 2 && x.px > 0); viderPanier(); addPanier(a, 0); procederPmt(); selPmntVente('especes');
    document.getElementById('calc-recu').value = Math.ceil(calcAPayer() / 1000) * 1000; calcMonnaie(true); const n0 = DB.ventes.length; encaisser(); return DB.ventes.length - n0; });
  t(r === 1, 'une vente d\'essai dans l\'exemple');
  await p.evaluate(async () => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); await entrerDemo(); });
  const g = await garde();
  t(g && g.code === 'MARI0001' && g.n === 2, 'rentrer une 2e fois dans l\'exemple n\'écrase pas la vraie boutique mise de côté');
}
await p.evaluate(() => quitterDemo(true));
await p.waitForTimeout(2600);
{
  const v = await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('myboutiq_v6') || 'null');
    return { code: x && x.cfg.code, demo: !!(x && x.cfg.demo), n: x && x.ventes.length, garde: localStorage.getItem('myboutiq_v6_avant_demo') }; });
  t(v.code === 'MARI0001' && !v.demo && v.n === 2 && v.garde === null, `sortie de l'exemple : la vraie boutique revient, ses 2 ventes, rien de l'essai (${JSON.stringify(v)})`);
}
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
