// t249 — « Au moment de la vente, il y a une différence entre la variante et
// les autres. » (23.30)
// Sa capture, à 360 px : dehors « 600F / la pièce » et « 4 000F / palette de
// 12 » ; dedans la famille Jus, « F 750 » plus petit, « Épuisé » / « 69
// restants » sous chaque prix, et « palette de 1 / prix ? » — la palette en
// a douze, le « 2 » était coupé. Sa fiche est reprise telle quelle.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t249');
const { s, port } = await serveur();
const b = await chromium.launch();
const db = nouvelleBoutique();
db.articles.push({ e: '🍍', al: 5, id: 145, nm: 'Jus', pa: 0, px: 0, rt: true, um: null, vd: 0, cat: 'Boissons', stk: 0, dep0: 0, stk0: 0, umSac: 12, umCont: 'palette',
  vr: [{ id: 1, nm: 'Jus ananas 75 cl', pa: 0, px: 750, rt: true, stk: 0, stk0: 0, qBase: 1, umSac: 12, umCont: 'palette', reprisBase: 1 },
       { id: 2, nm: 'Jus ananas 25cl', pa: 0, px: 250, rt: true, stk: 71, stk0: 0, qBase: 1, umSac: 12, umCont: 'palette' }] });
db.articles.push({ e: '🥄', al: 5, id: 147, nm: 'Cuillère', pa: 100, px: 200, cat: 'Boissons', stk0: 50, vd: 0, vr: [], umSac: 24, umCont: 'carton' });
db.articles.push({ e: '🌾', al: 5, id: 148, nm: 'Farine', pa: 500, px: 600, um: 'kg', cat: 'Boissons', stk0: 100, vd: 0, vr: [],
  umSac: 50, umCont: 'sac', pxGros: 25000 });
db.articles.push({ e: '🧼', al: 5, id: 149, nm: 'Savons', pa: 0, px: 0, cat: 'Boissons', stk0: 0, vd: 0,
  vr: [{ id: 1, nm: 'Azur', px: 300, pa: 200, stk0: 2, qBase: 1 }, { id: 2, nm: 'Omo', px: 150, pa: 100, stk0: 0, qBase: 1 }] });
db.cfg.facon = 'gros';
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 760 }); await p.waitForTimeout(300);
const st = (sel, root) => p.evaluate(([sel, root]) => { const r = root ? document.querySelector(root) : document; const e = r && r.querySelector(sel); if (!e) return null; const c = getComputedStyle(e);
  return { t: e.textContent.trim().replace(/\s+/g, ' '), fs: c.fontSize, fw: c.fontWeight, coupe: e.scrollWidth > e.clientWidth + 1 }; }, [sel, root]);
const dehors = { nm: await st('.pnm-ov', '#pc-147'), px: await st('.ppr-ov', '#pc-147'), lib: await st('.ppr-lib', '#pc-147'), barre: await st('.pbarre b', '#pc-147'), i: await st('.pbarre i', '#pc-147') };
const ouvrir = async id => { await p.evaluate(id => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); try { fermerVarInline(); } catch (e) {} document.getElementById('pc-' + id).scrollIntoView({ block: 'start' }); }, id); await p.waitForTimeout(300); await p.locator('#pc-' + id).tap(); await p.waitForTimeout(600); };
await ouvrir(145);
const tuiles = await p.evaluate(() => [...document.querySelectorAll('.vtile')].map(x => { const g = x.querySelector('.vt-gros'), gb = g && g.querySelector('b');
  return { txt: x.innerText.replace(/\s+/g, ' ').trim(), gros: g ? g.innerText.replace(/\s+/g, ' ').trim() : '', coupe: !!gb && gb.scrollWidth > gb.clientWidth + 1 }; }));
const dedans = { nm: await st('.vt-nm', '.vtile'), px: await st('.vt-px', '.vtile'), lib: await st('.vt-lib', '.vtile'), barre: await st('.vt-gros b', '.vtile'), i: await st('.vt-gros i', '.vtile') };
t(dedans.nm && dehors.nm && dedans.nm.fs === dehors.nm.fs && dedans.nm.fw === dehors.nm.fw, `le nom : ${dedans.nm && dedans.nm.fs} / ${dedans.nm && dedans.nm.fw} dedans, ${dehors.nm && dehors.nm.fs} / ${dehors.nm && dehors.nm.fw} dehors`);
t(dedans.px && dehors.px && dedans.px.fs === dehors.px.fs && /^750\s?FCFA$/.test(dedans.px.t) && /^200\s?FCFA$/.test(dehors.px.t), `le prix s’écrit pareil et à la même taille : « ${dedans.px && dedans.px.t} » (${dedans.px && dedans.px.fs}) dedans, « ${dehors.px && dehors.px.t} » (${dehors.px && dehors.px.fs}) dehors`);
t(dedans.lib && dehors.lib && dedans.lib.t === dehors.lib.t && dedans.lib.fs === dehors.lib.fs, `« ${dedans.lib && dedans.lib.t} » sous le prix, dedans comme dehors`);
t(dedans.barre && dehors.barre && dedans.barre.fs === dehors.barre.fs && /palette$/.test(dedans.barre.t) && /carton$/.test(dehors.barre.t), `la barre du gros sans prix : « ${dedans.barre && dedans.barre.t} / ${dedans.i && dedans.i.t} » dedans, « ${dehors.barre && dehors.barre.t} / ${dehors.i && dehors.i.t} » dehors, même taille`);
t(tuiles.length === 2 && tuiles.every(x => !x.coupe && !/palette de 1\b/.test(x.gros)), `rien de coupé : plus jamais « palette de 1 » (${tuiles.map(x => x.gros).join(' · ')})`);
t(tuiles.every(x => !/restants|Épuisé/.test(x.txt)), `pas de compteur « restants » que la carte dehors n’a pas ; stock jamais compté, donc jamais « Épuisé » (${tuiles.map(x => x.txt).join(' | ')})`);
// Avec un prix de gros : la seconde ligne porte la taille, sans rien couper.
await ouvrir(148);
const far = await p.evaluate(() => { const g = document.querySelector('#pc-148 .pbarre'); return g ? g.innerText.replace(/\s+/g, ' ') : ''; });
t(/25\s?000\s?FCFA/.test(far) && /sac de 50/.test(far), `dehors, avec prix : « ${far} »`);
// Une famille dont le stock est compté : « Bas » et « Épuisé », comme dehors.
await ouvrir(149);
const sav = await p.evaluate(() => [...document.querySelectorAll('.vtile')].map(x => ({ nm: x.querySelector('.vt-nm').textContent, al: (x.querySelector('.vt-alerte') || {}).textContent || '' })));
t(sav.length === 2 && sav[0].al === 'Bas' && sav[1].al === 'Épuisé', `stock compté : « Azur » ${sav[0] && sav[0].al}, « Omo » ${sav[1] && sav[1].al} — les mêmes marques que dehors`);
// Et la vente marche toujours : toucher une variante l'ajoute.
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); try { fermerVarInline(); } catch (e) {} viderPanier(); });
await ouvrir(145);
await p.locator('.vtile').nth(1).tap(); await p.waitForTimeout(300);
t(await p.evaluate(() => panier['145-2'] === 1), 'toucher « Jus ananas 25cl » le met au panier, comme avant');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close();
await b.close(); s.close();
fin();
