// t212 — LE CATALOGUE SANS RÉSEAU, ET LE PRIX QUI MANQUE (22.99).
// Refait hors ligne, le parcours d'une boutique neuve montrait un catalogue
// « en photos »… fait de cases vides : une photo qui ne venait pas se cachait
// et ne laissait rien à sa place. Et la fiche « Son prix », ouverte pour
// vendre un article à qui il ne manque que le prix, n'ouvrait pas le clavier
// sur ce prix. Le banc tourne sans réseau : aucune photo ne peut arriver.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t212');
const { s, port } = await serveur();
const b = await chromium.launch();

// ── 1) LE CATALOGUE : CHAQUE VIGNETTE SE RECONNAÎT SANS PHOTO ─────────
{
  const d = nouvelleBoutique({ articles: [] });
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  await p.evaluate(() => ouvrirChoixArticles());
  await p.waitForTimeout(2500);                       // le temps que les photos échouent
  const v = await p.evaluate(() => {
    const tuiles = Array.from(document.querySelectorAll('#cha-grid > div[onclick]'));
    const sans = tuiles.filter(x => { const m = x.querySelector('.cha-m'); const e = m && m.querySelector('span');
      return !m || !e || !e.textContent.trim() || m.getBoundingClientRect().height < 20; });
    const cassees = Array.from(document.querySelectorAll('#cha-grid img')).filter(i => i.complete && !i.naturalWidth).length;
    return { n: tuiles.length, sans: sans.length, cassees };
  });
  t(v.n >= 20 && v.sans === 0, `hors ligne, les ${v.n} vignettes montrent leur émoji (vides : ${v.sans})`);
  t(v.cassees === 0, `aucune image cassée ne reste à l'écran (${v.cassees})`);
  // Le panier du catalogue, en bas : même chose.
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('#cha-grid > div[onclick]')).find(e => /chaFormats|chaBasculer/.test(e.getAttribute('onclick'))); x.click(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { const ok = document.getElementById('fmt-ok'); if (document.querySelector('#ov-format.show')) { document.querySelector('#fmt-chips button').click(); ok.click(); } });
  await p.waitForTimeout(800);
  const pan = await p.evaluate(() => { const l = document.querySelectorAll('#cha-pn-lst > div'); const x = l[0];
    return { n: l.length, emo: x ? (x.querySelector('.cha-m span') || {}).textContent || '' : '', cassees: Array.from(document.querySelectorAll('#cha-pn-lst img')).filter(i => i.complete && !i.naturalWidth).length }; });
  t(pan.n === 1 && pan.emo.trim().length > 0 && pan.cassees === 0, `le panier du catalogue aussi : « ${pan.emo} », sans image cassée`);
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2) IL NE MANQUE QUE LE PRIX : LE CLAVIER S'OUVRE DESSUS ──────────
{
  const d = nouvelleBoutique();
  d.articles.push({ id: 50, nm: 'Riz parfumé 1 kg', e: '🍚', cat: 'Alimentation', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true });
  const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
  await p.locator('#pc-50').click(); await p.waitForTimeout(600);
  const f = await p.evaluate(() => ({ ouvert: !!document.querySelector('#ov-completer.show'), focus: (document.activeElement || {}).id || '' }));
  t(f.ouvert && f.focus === 'cmp-pv', `la fiche « Son prix » s'ouvre, le curseur déjà dans le prix (${f.focus || 'rien'})`);
  await p.locator('#cmp-pv').fill('650');
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('#ov-completer button')).find(e => /prêt à vendre/i.test(e.textContent)); x.click(); });
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({ px: DB.articles.find(a => a.id === 50).px, panier: panier['50-0'] || 0 }));
  t(r.px === 650 && r.panier === 1, `enregistré à 650 et mis au panier, comme avant (${JSON.stringify(r)})`);
  // Un nom jamais personnalisé : c'est le NOM qui manque, le curseur reste sur le nom.
  await p.evaluate(() => { document.querySelectorAll('.ov').forEach(x => x.classList.remove('show'));
    DB.articles.push({ id: 51, nm: 'Article 51', _autoNm: 'Article 51', e: '📦', cat: 'Divers', px: 0, pa: 0, stk0: 0, al: 0, vd: 0, vr: [], rt: true });
    renderProd(DB.articles); });
  await p.locator('#pc-51').click(); await p.waitForTimeout(600);
  t(await p.evaluate(() => (document.activeElement || {}).id === 'cmp-nm'), 'nom jamais personnalisé : le curseur va sur le nom, pas sur le prix');
  t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
