// t235 — « TROP DE FONCTIONNALITÉS, PAS BIEN ORGANISÉ » (23.16).
// Mesuré sur la 23.15 :
//   · Réglages : quatre onglets sur cinq sans nom (un emoji seul) ; le
//     cinquième, « Sécurité », était une cloche et ne contenait ni le PIN ni
//     l'empreinte, rangés dans « Boutique » sous « Objectif journalier »
//     (0 boutique sur 28 s'en sert, mesuré en production) ; le code de la
//     boutique et le PIN équipe prenaient la moitié de l'écran avant les
//     onglets.
//   · Caisse : trois bandeaux en même temps, et celui des photos posé PAR-
//     DESSUS les chiffres du jour (Ventes · Bénéfice · Trans.).
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t235');
const { s, port } = await serveur();
const b = await chromium.launch();
const onglet = (p, i) => p.evaluate(i => { document.querySelectorAll('.set-tab')[i].click(); const pane = document.querySelector('.set-pane.on');
  return Array.from(pane.querySelectorAll('.stit2')).filter(x => x.offsetParent).map(x => (x.querySelector('.stitl') || x).textContent.trim()); }, i);
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  // ── 1) LES ONGLETS DISENT LEUR NOM ───────────────────────────────────
  await p.evaluate(() => goSt()); await p.waitForTimeout(400);
  const tabs = await p.evaluate(() => Array.from(document.querySelectorAll('.set-tab')).map(x => { const s = x.querySelector('span'); return { t: s.textContent, w: s.offsetWidth, emoji: /[\u{1F300}-\u{1FAFF}]/u.test(x.textContent) }; }));
  t(tabs.map(x => x.t).join(',') === 'Boutique,Équipe,Articles,Ventes,Compte' && tabs.every(x => x.w > 0 && !x.emoji), `5 onglets, chacun avec son nom écrit, sans emoji : ${tabs.map(x => x.t).join(' · ')}`);
  const haut = await p.evaluate(() => Math.round(document.getElementById('set-tabs').getBoundingClientRect().top));
  t(haut < 200, `les onglets arrivent tout de suite (à ${haut} px du haut ; le code de la boutique ne passe plus devant)`);
  // ── 2) CHAQUE CHOSE À SA PLACE ───────────────────────────────────────
  const boutique = await onglet(p, 0), equipe = await onglet(p, 1), articles = await onglet(p, 2), ventes = await onglet(p, 3), compte = await onglet(p, 4);
  t(!boutique.some(x => /Objectif|Changer mon PIN|Empreinte/.test(x)), `« Boutique » : ${boutique.join(' · ')}`);
  const code = await p.evaluate(() => { document.querySelectorAll('.set-tab')[1].click(); const pane = document.querySelector('.set-pane.on');
    return { code: !!pane.querySelector('#code-val') && pane.querySelector('#code-val').offsetParent !== null, pin: !!pane.querySelector('#teamcode-val'), entete: !!document.querySelector('#s-settings .sthdr .qr-wrap') }; });
  t(code.code && code.pin && !code.entete, `« Équipe » : le code de la boutique et le PIN équipe y sont, plus dans l'en-tête (${JSON.stringify(code)})`);
  t(['Changer mon PIN', 'Ouvrir avec 4 chiffres', 'Empreinte / Face ID', 'Aide & Support', 'Se déconnecter'].every(x => compte.some(y => y.indexOf(x) === 0)), `« Compte » : ${compte.join(' · ')}`);
  t(!compte.concat(boutique).some(x => /Contacter le support/.test(x)), 'plus de doublon « Contacter le support » à côté de « Aide & Support »');
  // ── 3) RIEN DU QUOTIDIEN N'EST CACHÉ ─────────────────────────────────
  // (La leçon du mode expert d'avant : 11 fonctions sans entrée nulle part.)
  const tout = boutique.concat(equipe, articles, ventes, compte).join(' | ');
  const quotidien = ['Tout configurer', 'Modifier les prix', 'Entrée de stock', 'Relevé', 'Photos de mes articles', 'Historique des ventes', 'Mon année', 'Clôture journée', 'Dépenses boutique', 'Inviter un vendeur'];
  const manque = quotidien.filter(x => tout.indexOf(x) < 0);
  t(manque.length === 0, `les outils de tous les jours restent à portée, sans mode expert (manquent : ${manque.join(', ') || 'aucun'})`);
  await p.evaluate(() => toggleParametresAvances()); await p.waitForTimeout(200);
  const exp = (await onglet(p, 0)).join(' | ');
  t(/Objectif journalier/.test(exp), 'l\'objectif journalier reste là, en mode expert');
  await p.evaluate(() => { toggleParametresAvances(); goBack(); });
  // ── 4) LA CAISSE : UN SEUL MESSAGE, ET JAMAIS SUR LES CHIFFRES ────────
  await p.evaluate(() => { navTo('caisse', document.querySelectorAll('.ni')[0]); try { localStorage.removeItem('myboutiq_install_ferme'); } catch (e) {} });
  await p.evaluate(() => { const b = document.getElementById('annonce-banner'); document.getElementById('annonce-titre').textContent = 'Un message'; b.style.display = 'flex'; });
  await p.waitForTimeout(200);
  const c = await p.evaluate(() => { const b = document.getElementById('annonce-banner').getBoundingClientRect(), st = document.querySelector('#s-caisse .stats-bar').getBoundingClientRect();
    return { pos: getComputedStyle(document.getElementById('annonce-banner')).position, dessous: b.top >= st.bottom - 1, install: getComputedStyle(document.getElementById('cai-install')).display }; });
  t(c.pos !== 'fixed' && c.dessous, `le bandeau est dans la page, SOUS les chiffres du jour (${c.pos})`);
  t(c.install === 'none', 'tant qu\'il est là, la carte « Installer » attend');
  await p.evaluate(() => { window.__peutInst = _peutInstaller; _peutInstaller = () => true; fermerAnnonce(); });
  await p.waitForTimeout(200);
  t(await p.evaluate(() => getComputedStyle(document.getElementById('cai-install')).display) === 'flex', 'il part : la carte « Installer » revient');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
