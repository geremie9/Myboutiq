// t347 — LES MESURES DU MARCHÉ, SANS FENÊTRE DU TÉLÉPHONE (24.26).
// L'agent « marché » (25/11) : le verre de riz, le kopo d'arachides, la
// cuvette de tomates n'étaient pas dans les listes ; « autre mot… » ouvrait
// une fenêtre du téléphone (prompt) où taper le mot. Et l'unité du vivrier
// proposait « sceau » (le cachet) au lieu de « seau ».
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t347');
const { s, port } = await serveur();
const b = await chromium.launch();
const d = nouvelleBoutique();
d.articles.push({ id: 70, nm: 'Arachides', e: '', cat: 'Vivrier', px: 150, pa: 100, stk0: 40, al: 0, vr: [] });
const { p, errs } = await ouvrirCaisse(b, port, d);
await p.evaluate(() => { window.__prompts = 0; window.prompt = () => { window.__prompts++; return 'xx'; }; });

await p.evaluate(() => ouvrirConditionnement({ p: DB.articles.find(x => x.id === 70) }));
await p.waitForTimeout(300);
const opts = await p.evaluate(() => [...document.querySelectorAll('#cond-u option')].map(o => o.value));
t(['verre', 'kopo', 'cuvette', 'seau'].every(m => opts.includes(m)), `« le plus petit » propose verre, kopo, cuvette, seau (${opts.filter(m => /verre|kopo|cuvette|seau|bol/.test(m)).join(', ')})`);
await p.selectOption('#cond-u', 'kopo'); await p.waitForTimeout(150);
t(await p.evaluate(() => _cond.unite) === 'kopo', `kopo choisi d'une touche`);

// « autre mot… » : une case sur place, pas de fenêtre
await p.selectOption('#cond-u', '__autre'); await p.waitForTimeout(150);
const libre = await p.evaluate(() => { const i = document.querySelector('.cond-libre input'); return { vu: !!i, foc: document.activeElement === i }; });
t(libre.vu && libre.foc, `« autre mot… » : une case à écrire à la même place, le clavier dessus`);
await p.keyboard.type('Gobelet'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
const apres = await p.evaluate(() => ({ u: _cond.unite, prompts: window.__prompts, sel: !!document.getElementById('cond-u') }));
t(apres.u === 'gobelet' && apres.prompts === 0 && apres.sel, `« Gobelet » ↵ : l'unité devient « ${apres.u} », la liste revient, aucune fenêtre du téléphone (${apres.prompts})`);
// la quitter vide remet le mot d'avant
await p.selectOption('#cond-u', '__autre'); await p.waitForTimeout(150);
await p.evaluate(() => document.querySelector('.cond-libre input').blur()); await p.waitForTimeout(300);
t(await p.evaluate(() => _cond.unite) === 'gobelet', `quittée sans rien écrire : le mot d'avant reste`);

// le vivrier : « seau », pas « sceau »
t(await p.evaluate(() => UNITES_VIVRIER.includes('seau') && !UNITES_VIVRIER.includes('sceau') && UNITES_VIVRIER.includes('kopo')), `unités du vivrier : seau, verre, kopo (plus de « sceau »)`);

t(errs.length === 0, `aucune erreur JS ${errs.slice(0, 2).join(' | ')}`);
await b.close(); s.close();
fin();
