// t235 — LE CRÉDIT DES PHOTOS OPEN FOOD FACTS (23.69).
// Le 17/11/2026, 29 articles réels des boutiques (Diamaor, Mayor, Coca-Cola,
// Guinness, Tangui, Reaktor…) ont reçu une photo certifiée venue d'Open Food
// Facts. Ces photos sont sous licence CC BY-SA 3.0 : la licence OBLIGE à
// créditer la source. Sans cette ligne, chaque téléphone affichait des photos
// en violation de leur licence.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t235');
const { s, port } = await serveur();
const b = await chromium.launch();
{
  const { p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique());
  const c = await p.evaluate(() => {
    const e = document.querySelector('#s-settings #st-credits');
    const a = e && e.querySelector('a');
    return { txt: e ? e.textContent : '', href: a ? a.getAttribute('href') : '', rel: a ? a.getAttribute('rel') : '' };
  });
  t(/open food facts/i.test(c.txt) && /CC BY-SA 3\.0/.test(c.txt), `Réglages crédite les photos : « ${c.txt.trim()} »`);
  t(c.href === 'https://world.openfoodfacts.org' && /noopener/.test(c.rel || ''), `le lien mène à Open Food Facts, sans donner la main à la page (${c.href})`);
  t(errs.length === 0, `aucune erreur JS (${errs.join(' | ')})`);
}
await b.close(); s.close();
fin();
