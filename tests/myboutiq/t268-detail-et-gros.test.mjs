// t268 — « Si je vends surtout en détail, ça ne veut pas dire que je ne vends
// pas en gros. Quand on vend en détail, le gros disparaît. » (23.51)
// Mesuré le 14/11, mêmes articles : un carton qui a son prix se vendait déjà
// au détail. Ce qui disparaissait, c'était le chemin pour DONNER ce prix.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t268');
const { s, port } = await serveur();
const b = await chromium.launch();
const boutique = facon => { const db = nouvelleBoutique(); db.cfg.facon = facon;
  db.articles = [
    { id: 1, nm: 'Savon', e: '📦', cat: 'A', px: 600, pa: 500, stk0: 96, al: 0, vd: 0, vr: [], umSac: 24, umCont: 'carton', pxGros: 13000 },
    { id: 2, nm: 'Riz', e: '📦', cat: 'A', px: 600, pa: 480, stk0: 100, al: 0, vd: 0, vr: [], umSac: 50, umCont: 'sac' },
    { id: 3, nm: 'Pain', e: '📦', cat: 'A', px: 100, pa: 80, stk0: 10, al: 0, vd: 0, vr: [] }]; return db; };
const pbas = (p, id) => p.evaluate(id => { const b = document.querySelector('#pc-' + id + ' .pbas'); return b ? [...b.children].map(x => x.className + ':' + x.innerText.replace(/\s+/g, ' ').trim()).join(' / ') : ''; }, id);

// ── Au détail, patron ──
const d = await ouvrirCaisse(b, port, boutique('detail'), { tactile: true });
await d.p.setViewportSize({ width: 360, height: 740 }); await d.p.waitForTimeout(500);
t(/13\s?000/.test(await pbas(d.p, 1)), 'au détail, un carton qui a son prix se vend toujours depuis la tuile');
const riz = await pbas(d.p, 2);
t(/vide/.test(riz) && /sac/.test(riz) && /prix \?/.test(riz), `au détail, un sac connu sans prix le dit au patron : « ${riz} » (avant : rien)`);
t((await pbas(d.p, 3)) === '', 'au détail, un article dont on ne connaît pas le contenant ne montre rien : pas de cubes partout');
const n = await d.p.evaluate(() => { navTo('stock', document.querySelectorAll('.ni')[1]); majBandeauSansGros(); const z = document.getElementById('caisse-sansgros'); return { n: _articlesSansPrixGros().length, vu: z && z.style.display !== 'none', txt: z ? z.textContent : '' }; });
t(n.n === 1 && n.vu && /1 article sans prix de gros/.test(n.txt), `au détail, le bandeau « ${n.txt} » apparaît aussi`);
await d.p.evaluate(() => navTo('caisse', document.querySelectorAll('.ni')[0])); await d.p.waitForTimeout(300);
await d.p.locator('#pc-2 .pbarre').tap(); await d.p.waitForTimeout(500);
const ouvert = await d.p.evaluate(() => [...document.querySelectorAll('.ov.show')].map(o => o.id).join(','));
t(ouvert.length > 0 && !(await d.p.evaluate(() => Object.keys(panier).length)), `toucher « sac · prix ? » demande le prix du sac (${ouvert}), rien ne part au panier à 0 F`);
t(d.errs.length === 0, 'aucune erreur JS (détail)' + (d.errs.length ? ' : ' + d.errs.join(' | ') : ''));
await d.ctx.close();

// ── Au détail, vendeur : il ne règle pas les prix ──
const v = await ouvrirCaisse(b, port, boutique('detail'), { tactile: true, vendeur: true });
await v.p.waitForTimeout(500);
t(!/prix \?/.test(await pbas(v.p, 2)), 'un vendeur ne voit pas « prix ? » : ce n\'est pas à lui de le régler');
await v.ctx.close();

// ── En gros : rien ne change ──
const g = await ouvrirCaisse(b, port, boutique('gros'), { tactile: true });
await g.p.setViewportSize({ width: 360, height: 740 }); await g.p.waitForTimeout(500);
t(/prix \?/.test(await pbas(g.p, 2)) && /pgros vide/.test(await pbas(g.p, 3)), 'en gros, comme avant : « sac · prix ? », et le repère « gros » discret sur les autres articles');
await g.ctx.close();
await b.close(); s.close();
fin();
