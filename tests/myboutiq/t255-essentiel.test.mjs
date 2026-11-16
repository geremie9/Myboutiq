// t255 — Diagnostic du 13/11 (23.38) : 77 boutiques, 33 ont vendu, 17 un
// seul jour. 2 618 ventes : 30 ont rapporté des points de fidélité, aucune
// n'en a utilisé. Le menu de l'appui long alignait treize lignes. La photo
// d'une variante refusait encore le hors-ligne. Ce qui ne sert pas se tait.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t255');
const { s, port } = await serveur();
const b = await chromium.launch();
const vis = (p, sel) => p.evaluate(sel => [...document.querySelectorAll(sel)].filter(x => x.offsetParent && getComputedStyle(x).display !== 'none').map(x => x.textContent.trim()), sel);

const db = nouvelleBoutique(); db.cfg.facon = 'detail';
db.articles.push({ id: 30, nm: 'Savon', e: '📦', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [{ id: 1, nm: 'Azur', px: 650, pa: 500, stk: 10, stk0: 10 }, { id: 2, nm: 'Palmida', px: 600, pa: 480, stk: 10, stk0: 10 }] });
const { ctx, p, errs } = await ouvrirCaisse(b, port, db, { tactile: true });
await p.setViewportSize({ width: 360, height: 740 }); await p.waitForTimeout(300);

// ── 1. Le menu de l'appui long ──
await p.evaluate(() => showCtx({ clientX: 80, clientY: 200 }, DB.articles.find(a => a.id === 2))); await p.waitForTimeout(250);
const m1 = await vis(p, '#ctxm .ctxi');
const emo = await p.evaluate(() => /[\u{1F300}-\u{1FAFF}☀-➿]/u.test(document.getElementById('ctxm').textContent));
t(m1.length === 6 && m1[0] === 'Quantité' && m1[5] === 'Plus d\'actions' && !m1.includes('Supprimer'), `l'essentiel d'abord : ${m1.join(' · ')}`);
t(!emo && await p.evaluate(() => document.querySelectorAll('#ctxm .cxic svg').length >= 12), 'au trait, sans emoji');
await p.locator('#ctxi-plus').tap(); await p.waitForTimeout(250);
const m2 = await vis(p, '#ctxm .ctxi');
const ouv = await p.evaluate(() => { const m = document.getElementById('ctxm'), r = m.getBoundingClientRect(); return { show: m.classList.contains('show'), dans: r.bottom <= innerHeight + 1 && r.top >= 0 }; });
t(ouv.show && ouv.dans && m2.includes('Renommer') && m2.includes('Supprimer') && !m2.includes('Plus d\'actions') && m2.some(x => /Vendre sans stock : (oui|non)/.test(x)),
  `« Plus d'actions » déplie le reste sans fermer le menu, et il tient dans l'écran (${m2.length} lignes)`);
await p.evaluate(() => document.getElementById('ctxm').classList.remove('show'));

// ── 2. Les points de fidélité se taisent — et se comptent toujours ──
await vendre(p, { lignes: [[2, 2]], mode: 'credit', client: 1 });
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); try { nouvelleVente(); } catch (e) {} });
await p.evaluate(() => navTo('clients', document.querySelectorAll('.ni')[3])); await p.waitForTimeout(500);
const cl = await p.evaluate(() => ({ badge: [...document.querySelectorAll('.lv-badge')].filter(x => x.offsetParent).length, txt: document.getElementById('s-clients').innerText, pts: DB.clients[0].points, dette: DB.clients[0].credit }));
t(cl.badge === 0 && !/Bronze|pts/.test(cl.txt) && /Awa/.test(cl.txt) && cl.dette === 1200, `l'écran Clients dit la dette (${cl.dette}), plus « Bronze · pts »`);
t(cl.pts > 0, `les points continuent de se compter sans bruit (${cl.pts})`);
await p.evaluate(() => ouvrirDetCli(1)); await p.waitForTimeout(300);
const det = await p.evaluate(() => ({ barre: [...document.querySelectorAll('#ov-cli-det .lv-bar, #ov-cli-det .lv-badge, #btn-use-points')].filter(x => x.offsetParent).length, info: (document.getElementById('lbl-info-cred') || {}).textContent || '' }));
t(det.barre === 0 && !/fidélité/.test(det.info), `la fiche du client : sa dette et son historique, sans jauge de points (« ${det.info} »)`);
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show')); navTo('caisse', document.querySelectorAll('.ni')[0]); addPanier(DB.articles[0]); }); await p.waitForTimeout(300);
const lb = await p.evaluate(() => document.getElementById('client-vente-info').textContent);
t(lb === 'Client (optionnel)', `dans le panier : « ${lb} »`);
// Une boutique qui y tient les rallume.
const re = await p.evaluate(() => { DB.cfg.fidelite = true; updateNotifBadge(); navTo('clients', document.querySelectorAll('.ni')[3]); return [...document.querySelectorAll('.lv-badge')].filter(x => x.offsetParent).length; });
t(re >= 1, 'cfg.fidelite les rallume : rien n\'est perdu');
await p.evaluate(() => { DB.cfg.fidelite = false; updateNotifBadge(); try { viderPanier(); } catch (e) {} });

// ── 3. Réglages ──
await p.evaluate(() => goSt()); await p.waitForTimeout(400);
const r1 = await p.evaluate(() => ({ chg: !!document.getElementById('st-chgb').closest('.stit2').offsetParent, adv: document.getElementById('st-adv-t').textContent }));
t(!r1.chg && r1.adv === 'Afficher tous les réglages', `« Changer de boutique » (0 boutique sur 77 en a deux) sort du mode simple ; « ${r1.adv} »`);
await p.evaluate(() => toggleParametresAvances()); await p.waitForTimeout(300);
const r2 = await p.evaluate(() => ({ chg: !!document.getElementById('st-chgb').closest('.stit2').offsetParent, adv: document.getElementById('st-adv-t').textContent }));
t(r2.chg && r2.adv === 'Tous les réglages sont affichés', `tout revient d'un toucher (« ${r2.adv} »)`);
await p.evaluate(() => { toggleParametresAvances(); goBack(); });

// ── 4. La photo d'une variante, sans réseau ──
await p.evaluate(() => {
  window.__envois = 0;
  uploadBlobProduit = function () { window.__envois++; return Promise.resolve('https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/APP/products/MARI0001-v' + window.__envois + '.jpg'); };
  window.confirm = () => false;
});
const jpg = Buffer.from(await p.evaluate(() => { const cv = document.createElement('canvas'); cv.width = 900; cv.height = 1200; const x = cv.getContext('2d'); x.fillStyle = '#16a085'; x.fillRect(0, 0, 900, 1200); return cv.toDataURL('image/jpeg', .9).split(',')[1]; }), 'base64');
await ctx.setOffline(true);
await p.evaluate(() => { const a = DB.articles.find(x => x.id === 30); varArtCours = a; _varPhotoCible = a.vr[0]; });
await p.locator('#inp-photo-var-ctx').setInputFiles({ name: 'v.jpg', mimeType: 'image/jpeg', buffer: jpg }); await p.waitForTimeout(1500);
const v1 = await p.evaluate(() => { const v = DB.articles.find(x => x.id === 30).vr[0]; return { img: (v.img || '').slice(0, 10), att: !!v._imgAttente, toast: window.__toasts.slice(-3).join(' | ') }; });
t(v1.img === 'data:image' && v1.att && !/Connexion requise/.test(v1.toast), 'sans réseau : la photo de la variante est posée, plus de « Connexion requise »');
await ctx.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(4500);
const v2 = await p.evaluate(() => { const v = DB.articles.find(x => x.id === 30).vr[0]; return { img: v.img || '', att: v._imgAttente || null, n: window.__envois }; });
t(/\/APP\/products\//.test(v2.img) && v2.att === null && v2.n === 1, 'réseau revenu : elle part toute seule, comme celle d\'un article');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
