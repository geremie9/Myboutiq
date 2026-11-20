// t310 — LA VOIX DE LA BONNE LANGUE (23.94).
// Depuis la 23.93 l'app parle d'elle-même à chaque vente. Lu dans le code le
// 20/11 : sans voix française sur le téléphone, elle imposait `v[0]` — la
// première voix de la liste, souvent anglaise ; et en anglais, elle imposait
// la voix française. Ici, de fausses voix : on regarde laquelle l'app choisit.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse, vendre } from './caisse.mjs';
const { t, fin } = compteur('t310');
const { s, port } = await serveur();
const b = await chromium.launch();
const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
await p.evaluate(() => {
  parler = window.__parlerVrai;
  window.__voix = [];
  window.__dit = [];
  // Un vrai SpeechSynthesisUtterance refuse une fausse voix : on le remplace.
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.speechSynthesis.getVoices = () => window.__voix;
  window.speechSynthesis.speak = u => window.__dit.push({ text: u.text, lang: u.lang, voix: u.voice ? u.voice.name : '' });
  window.speechSynthesis.cancel = () => {};
});
const essai = (voix, lg) => p.evaluate(([voix, lg]) => {
  window.__voix = voix; lang = lg; _voixOk = null; window.__dit = [];
  parler(lg === 'fr' ? 'Merci ! 1300 francs.' : 'Thank you!');
  return window.__dit[0] || {};
}, [voix, lg]);
const V = (name, l, local) => ({ name, lang: l, localService: local });

// ── 1. Un téléphone sans voix française ──
let r = await essai([V('English US', 'en-US', true), V('Deutsch', 'de-DE', true)], 'fr');
t(r.voix === '' && r.lang === 'fr-FR', `aucune voix française : aucune voix imposée, le moteur fait avec « fr-FR » (avant : la voix « English US » imposée) — voix « ${r.voix} »`);
// ── 2. La voix du téléphone avant celle du réseau ──
r = await essai([V('English US', 'en-US', true), V('Google français', 'fr-FR', false), V('Français Canada', 'fr-CA', true), V('Français (téléphone)', 'fr-FR', true)], 'fr');
t(r.voix === 'Français (téléphone)', `la voix française du téléphone d'abord, elle marche sans internet : « ${r.voix} »`);
r = await essai([V('English US', 'en-US', true), V('Google français', 'fr-FR', false), V('Français Canada', 'fr-CA', true)], 'fr');
t(r.voix === 'Français Canada', `une voix française du téléphone, même canadienne, avant celle du réseau : « ${r.voix} »`);
r = await essai([V('fr_FR', 'fr_FR', true), V('English', 'en_US', true)], 'fr');
t(r.voix === 'fr_FR', `les vieux Android écrivent « fr_FR » : reconnue — « ${r.voix} »`);
// ── 3. En anglais : la voix anglaise, plus la française ──
r = await essai([V('Français (téléphone)', 'fr-FR', true), V('English US', 'en-US', true)], 'en');
t(r.voix === 'English US' && r.lang === 'en-US', `en anglais : « ${r.voix} » (avant : la voix française imposée)`);
// ── 4. On change de langue : la voix suit, sans recharger ──
const r4 = await p.evaluate(() => {
  window.__voix = [{ name: 'FR', lang: 'fr-FR', localService: true }, { name: 'EN', lang: 'en-US', localService: true }];
  _voixOk = null; lang = 'fr'; window.__dit = []; parler('un'); lang = 'en'; parler('two'); lang = 'fr';
  return window.__dit.map(x => x.voix).join(',');
});
t(r4 === 'FR,EN', `français puis anglais dans la même ouverture : ${r4}`);
// ── 5. Après une vraie vente, c'est cette voix qui dit merci ──
await p.evaluate(() => { window.__voix = [{ name: 'English US', lang: 'en-US', localService: true }, { name: 'Français (téléphone)', lang: 'fr-FR', localService: true }]; _voixOk = null; window.__dit = []; });
await vendre(p, { lignes: [[2, 1]] });
const d5 = await p.evaluate(() => window.__dit.filter(x => /Merci/.test(x.text)));
t(d5.length && d5.every(x => x.voix === 'Français (téléphone)'), `après la vente : « ${d5[0] && d5[0].text} » dit par « ${d5[0] && d5[0].voix} »`);
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
