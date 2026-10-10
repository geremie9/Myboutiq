// t210 — LE TEMPS RÉEL N'ENVOIE PLUS LES CODES DE TOUTES LES BOUTIQUES (22.96).
// Avant, chaque téléphone écoutait toute la table boutique_signal et triait
// lui-même par code : la liste de tous les codes arrivait chez tout le monde.
// Le serveur donne maintenant à chaque boutique un canal secret
// (data.cfg.canal) ; l'app n'écoute plus que « canal=eq.… ».
// Un faux client temps réel enregistre ce que l'app demande.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t210');
const { s, port } = await serveur();
const b = await chromium.launch();
const CANAL = '0123456789abcdef0123456789abcdef';

const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
await p.evaluate(() => {
  window.__chans = []; window.__relus = [];
  supa = {
    channel(nom) { const ch = { nom, ecoutes: [], retire: false,
      on(type, filtre, cb) { this.ecoutes.push({ type, filtre, cb }); return this; }, subscribe() { return this; } };
      window.__chans.push(ch); return ch; },
    removeChannel(ch) { ch.retire = true; },
  };
  _rtRefetch = code => { window.__relus.push(code); };
});
const etat = () => p.evaluate(() => window.__chans.map(c => ({ nom: c.nom, retire: c.retire, filtre: c.ecoutes[0] && c.ecoutes[0].filtre.filter || null })));
const signal = (row) => p.evaluate(async row => {
  window.__relus = [];
  const c = window.__chans.filter(x => !x.retire).pop();
  c.ecoutes[0].cb({ new: row });
  await new Promise(r => setTimeout(r, 300));
  return window.__relus.slice();
}, row);

// ── 1) PAS ENCORE DE CANAL : L'ANCIENNE ÉCOUTE, SANS RIEN CASSER ──────
{
  await p.evaluate(() => subscribeRealtime(DB.cfg.code));
  const e = await etat();
  t(e.length === 1 && e[0].filtre === null, `sans canal, l'ancienne écoute reste (${JSON.stringify(e[0])})`);
  t((await signal({ code: 'MARI0001' })).length === 1, 'un signal de sa boutique déclenche la relecture');
  t((await signal({ code: 'AUTR0002' })).length === 0, 'celui d\'une autre boutique, non');
}
// ── 2) LE CANAL ARRIVE PAR LA SYNCHRO : ON PASSE DESSUS ───────────────
{
  await p.evaluate(canal => { const d = JSON.parse(JSON.stringify(DB)); d.cfg.canal = canal; _applyRemoteDB(d, true); }, CANAL);
  const e = await etat();
  const actif = e.filter(c => !c.retire);
  t(e[0].retire && actif.length === 1 && actif[0].filtre === 'canal=eq.' + CANAL,
    `dès que le canal arrive, l'app n'écoute plus que lui (${actif[0] && actif[0].filtre})`);
  t(actif[0].nom === 'signal:' + CANAL, 'le nom du canal d\'écoute ne contient plus le code de la boutique');
  t((await signal({ code: 'MARI0001', canal: CANAL })).length === 1, 'un signal sur son canal déclenche la relecture');
  t((await signal({ code: 'MARI0001', canal: 'ffffffffffffffffffffffffffffffff' })).length === 0, 'un autre canal, non (même avec le bon code)');
  await p.evaluate(canal => { const d = JSON.parse(JSON.stringify(DB)); d.cfg.canal = canal; _applyRemoteDB(d, true); }, CANAL);
  t((await etat()).filter(c => !c.retire).length === 1 && (await etat()).length === 2, 'une nouvelle synchro avec le même canal ne réabonne pas pour rien');
}
// ── 3) UN CANAL QUI N'EN EST PAS UN ───────────────────────────────────
{
  const r = await p.evaluate(() => { DB.cfg.canal = '<img src=x>'; return _canalSignal(); });
  t(r === '', 'un canal mal formé est ignoré : on retombe sur l\'ancienne écoute plutôt que d\'écouter n\'importe quoi');
}
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
