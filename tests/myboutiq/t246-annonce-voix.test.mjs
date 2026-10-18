// t246 — « Contourne pour afficher les notifications, car il y a d'autres
// commerçants qui ne savent pas lire. » (23.27)
//  · le bandeau d'annonce a un haut-parleur ; l'annonce se dit une fois toute
//    seule (tout de suite si l'écran a déjà été touché, sinon au premier
//    toucher), puis à la demande ;
//  · la voix enregistrée par l'administrateur se joue si elle vient de NOTRE
//    seau, sinon la voix du téléphone lit le texte ;
//  · « Écrire une annonce » enregistre sa voix et l'envoie avant l'annonce ;
//  · la question des notifications a des images et se dit à voix haute, sans
//    couper ce qui se dit déjà.
// Le moteur de voix et le micro sont simulés : on vérifie CE QUI EST DIT.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t246');
const { s, port } = await serveur();
const b = await chromium.launch();
const SEAU = 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/annonces-voix/';
// Un moteur de voix qui note ce qu'on lui fait dire, et un lecteur de son.
const simuler = p => p.evaluate(() => {
  window.__dits = []; window.__cancels = 0; window.__sons = [];
  const moteur = { speaking: false, pending: false, getVoices: () => [],
    speak(u) { if (String(u.text).trim().length > 2) __dits.push(String(u.text)); setTimeout(() => { try { u.onend && u.onend(); } catch (e) {} }, 20); },
    cancel() { __cancels++; } };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: moteur });
  _voixOk = null;
  window.__sonEchoue = false;
  window.Audio = function (u) { const o = { src: u, onended: null, onerror: null, pause() {},
    play() { __sons.push(u); return window.__sonEchoue ? Promise.reject(new Error('réseau')) : Promise.resolve(); } }; return o; };
});
const etat = p => p.evaluate(() => {
  const bt = document.getElementById('annonce-voix'), r = bt.getBoundingClientRect();
  return { vu: getComputedStyle(bt).display !== 'none' && r.width >= 40 && r.height >= 40, respire: bt.classList.contains('a-ecouter') };
});

// ── 1. L'annonce se dit : au premier toucher, une fois, puis à la demande ──
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await simuler(p);
  // Le navigateur du banc compte déjà un geste ; un téléphone ouvert depuis une
  // notification, non. On le met dans cet état-là.
  await p.evaluate(() => Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: false, isActive: false } }));
  const actif = await p.evaluate(() => !!(navigator.userActivation && navigator.userActivation.hasBeenActive));
  await p.evaluate(() => afficherAnnonce({ id: 'a1', titre: 'Nouvelle version', message: 'Touche Recharger en haut de l’écran', niveau: 'info' }));
  await p.waitForTimeout(900);
  let e = await etat(p);
  const avant = await p.evaluate(() => __dits.length);
  t(e.vu && e.respire, 'le bandeau replié montre un haut-parleur de 44 px, qui respire tant que l’annonce n’est pas entendue');
  t(!actif && avant === 0, 'personne n’a encore touché l’écran : Android refuserait le son, on attend le premier toucher');
  await p.locator('#src-c').tap(); await p.waitForTimeout(500);
  let d = await p.evaluate(() => __dits.slice());
  e = await etat(p);
  t(d.length === 1 && d[0] === 'Message de MyBoutiQ. Nouvelle version. Touche Recharger en haut de l’écran' && !e.respire,
    `au premier toucher, l’annonce se dit (« ${d[0]} ») et le haut-parleur se calme`);
  await p.locator('#src-c').tap(); await p.waitForTimeout(400);
  await p.evaluate(() => { fermerAnnonce(); localStorage.removeItem('myboutiq_annonces_vues'); afficherAnnonce({ id: 'a1', titre: 'Nouvelle version', message: 'Touche Recharger en haut de l’écran', niveau: 'info' }); });
  await p.waitForTimeout(900);
  e = await etat(p);
  t(await p.evaluate(() => __dits.length) === 1 && !e.respire, 'une fois entendue, elle ne se redit plus jamais toute seule');
  await p.locator('#annonce-voix').tap(); await p.waitForTimeout(300);
  t(await p.evaluate(() => __dits.length) === 2, 'le haut-parleur la redit à la demande');
  const ouvert = await p.evaluate(() => document.getElementById('annonce-banner').classList.contains('ouvert'));
  t(!ouvert, 'toucher le haut-parleur n’ouvre pas le bandeau (le geste lui appartient)');
  // L'écran déjà touché : une nouvelle annonce se dit tout de suite.
  await p.evaluate(() => { Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: true, isActive: false } }); fermerAnnonce(); afficherAnnonce({ id: 'a2', titre: 'Promo', message: 'Un mois offert', niveau: 'info' }); });
  await p.waitForTimeout(1000);
  d = await p.evaluate(() => __dits.slice());
  t(d.length === 3 && /Promo\. Un mois offert$/.test(d[2]), 'l’écran déjà touché : la nouvelle annonce se dit tout de suite');
  // La voix coupée dans les réglages : rien tout seul, mais le haut-parleur parle.
  await p.evaluate(() => { DB.cfg.voix = false; fermerAnnonce(); afficherAnnonce({ id: 'a3', titre: 'Silence', message: 'Réglé sans voix', niveau: 'info' }); });
  await p.waitForTimeout(1000);
  const n3 = await p.evaluate(() => __dits.length);
  await p.locator('#annonce-voix').tap(); await p.waitForTimeout(300);
  t(n3 === 3 && await p.evaluate(() => __dits.length) === 4, 'voix coupée dans les réglages : rien tout seul, mais le haut-parleur parle quand il le demande');
  await p.evaluate(() => { DB.cfg.voix = true; });
  // Une proposition (photos, empreinte) passe aussi par le bandeau : le haut-parleur la lit, sans « Message de MyBoutiQ ».
  await p.evaluate(() => { fermerAnnonce(); _annonceCourante = null;
    document.getElementById('annonce-titre').textContent = '5 de tes articles peuvent avoir leur photo';
    document.getElementById('annonce-msg').textContent = 'Touche ici pour voir.';
    document.getElementById('annonce-banner').style.display = 'flex'; });
  const resp = (await etat(p)).respire;
  await p.locator('#annonce-voix').tap(); await p.waitForTimeout(300);
  d = await p.evaluate(() => __dits.slice(-1)[0]);
  t(!resp && d === '5 de tes articles peuvent avoir leur photo. Touche ici pour voir.', `une proposition se lit aussi, sans respirer d’avance : « ${d} »`);
  t(errs.length === 0, 'aucune erreur JS (annonce dite)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 2. La voix enregistrée : la nôtre se joue, aucune autre ─────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await simuler(p);
  await p.locator('#src-c').tap();
  await p.evaluate(u => afficherAnnonce({ id: 'v1', titre: 'Bonjour', message: 'Écoute', niveau: 'info', audio: u }), SEAU + 'vabc123.webm');
  await p.waitForTimeout(900);
  let r = await p.evaluate(() => ({ sons: __sons.slice(), dits: __dits.slice() }));
  t(r.sons.length === 1 && r.sons[0].endsWith('/annonces-voix/vabc123.webm') && r.dits.length === 0, 'sa voix enregistrée se joue, la voix du téléphone se tait');
  await p.evaluate(() => { fermerAnnonce(); __sonEchoue = true; afficherAnnonce({ id: 'v2', titre: 'Sans réseau', message: 'Le son ne vient pas', niveau: 'info', audio: 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/annonces-voix/v2.webm' }); });
  await p.waitForTimeout(900);
  r = await p.evaluate(() => ({ sons: __sons.slice(), dits: __dits.slice() }));
  t(r.sons.length === 2 && r.dits.length === 1 && /Sans réseau\. Le son ne vient pas$/.test(r.dits[0]), 'sans réseau, le son échoue : la voix du téléphone lit le texte');
  for (const [i, u] of [['v3', 'https://exemple.com/annonces-voix/x.webm'], ['v4', SEAU + '../APP/x.webm'], ['v5', 'javascript:alert(1)']]) {
    await p.evaluate(([i, u]) => { fermerAnnonce(); __sonEchoue = false; afficherAnnonce({ id: i, titre: 'T' + i, message: 'M', niveau: 'info', audio: u }); }, [i, u]);
    await p.waitForTimeout(900);
  }
  r = await p.evaluate(() => ({ sons: __sons.length, dits: __dits.length }));
  t(r.sons === 2 && r.dits === 4, 'une adresse hors de notre seau (autre site, « ../ », javascript:) ne se joue jamais : le texte est lu');
  t(errs.length === 0, 'aucune erreur JS (voix enregistrée)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 3. « Écrire une annonce » : enregistrer sa voix, l'envoyer d'abord ─
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await simuler(p);
  await p.evaluate(() => {
    window.__envois = []; window.__lignes = []; window.__envoiEchoue = false;
    window.verifierAdmin = async () => true; window.getAuthUser = async () => ({ id: 'u1' });
    const chaine = { select() { return chaine; }, order() { return chaine; },
      limit() { return Promise.resolve({ data: __lignes.map((l, i) => Object.assign({ id: 'id' + i, actif: true, niveau: 'info' }, l)), error: null }); },
      insert(l) { __lignes.push(l); return Promise.resolve({ error: null }); } };
    supa = { from: () => chaine, rpc: async () => ({ data: null, error: null }),
      functions: { invoke: async () => ({ data: { recus: 0, comptes: 0 }, error: null }) },
      storage: { from: seau => ({
        upload: async (nom, blob, o) => { __envois.push({ seau, nom, type: o && o.contentType, taille: blob.size }); return window.__envoiEchoue ? { error: { message: 'refusé' } } : { data: {}, error: null }; },
        getPublicUrl: nom => ({ data: { publicUrl: 'https://bbncilovxzkcvlxvoqtg.supabase.co/storage/v1/object/public/' + seau + '/' + nom } }) }) } };
    // Le micro : un faux flux, un faux enregistreur qui rend un petit son.
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop() {} }] });
    window.MediaRecorder = function () { const m = { state: 'inactive', mimeType: 'audio/webm;codecs=opus',
      start() { m.state = 'recording'; }, stop() { m.state = 'inactive'; m.ondataavailable && m.ondataavailable({ data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }) }); m.onstop && m.onstop(); } }; return m; };
    MediaRecorder.isTypeSupported = t => /webm/.test(t);
  });
  await p.evaluate(() => ouvrirEcrireAnnonce()); await p.waitForTimeout(400);
  t(await p.locator('#ann-rec').isVisible() && /pidgin/.test(await p.locator('#ann-rec-s').innerText()), '« Écrire une annonce » propose d’enregistrer sa voix, dans sa langue');
  await p.locator('#ann-rec-go').tap(); await p.waitForTimeout(700);
  const enCours = await p.locator('#ann-rec-go').innerText();
  await p.locator('#ann-rec-go').tap(); await p.waitForTimeout(300);
  const apres = await p.evaluate(() => ({ go: document.getElementById('ann-rec-go').textContent, ec: getComputedStyle(document.getElementById('ann-rec-ecoute')).display !== 'none' }));
  t(/Arrêter/.test(enCours) && /Recommencer/.test(apres.go) && apres.ec, `on enregistre (« ${enCours} »), on arrête, on peut réécouter ou recommencer`);
  // Le titre seul suffit avec la voix : c'est elle qui parle.
  await p.locator('#ann-titre').fill('Nouvelle version');
  await p.evaluate(() => { document.getElementById('ann-push').checked = false; });
  await p.locator('#btn-pub-ann').tap(); await p.waitForTimeout(600);
  let r = await p.evaluate(() => ({ e: __envois.slice(), l: __lignes.slice() }));
  t(r.e.length === 1 && r.e[0].seau === 'annonces-voix' && /^v[a-z0-9]+\.webm$/.test(r.e[0].nom) && r.e[0].type === 'audio/webm' && r.e[0].taille === 4000,
    `le son part dans le seau annonces-voix (${r.e[0] && r.e[0].nom}, ${r.e[0] && r.e[0].type})`);
  t(r.l.length === 1 && r.l[0].audio === SEAU + r.e[0].nom && /haut-parleur/.test(r.l[0].message),
    'puis l’annonce, avec l’adresse de sa voix et un texte qui renvoie au haut-parleur');
  const liste = await p.locator('#ann-encours').innerText();
  t(/avec ta voix/.test(liste), 'la liste « En cours » dit qu’elle porte sa voix');
  // Le son refusé : on demande avant de publier sans la voix.
  await p.evaluate(() => { __envoiEchoue = true; window.confirm = () => false; });
  await p.locator('#ann-rec-go').tap(); await p.waitForTimeout(300); await p.locator('#ann-rec-go').tap(); await p.waitForTimeout(300);
  await p.locator('#ann-titre').fill('Deuxième');
  await p.locator('#btn-pub-ann').tap(); await p.waitForTimeout(600);
  t(await p.evaluate(() => __lignes.length) === 1, 'la voix refusée par le serveur : rien n’est publié sans son accord');
  // La liste échappe ce qu'elle affiche.
  await p.evaluate(() => { __lignes.push({ titre: '<img src=x onerror=__x2=1>', message: '<b>gras</b>' }); renderAnnoncesEnCours(); });
  await p.waitForTimeout(300);
  t(await p.evaluate(() => typeof __x2 === 'undefined' && !document.querySelector('#ann-encours img') && !document.querySelector('#ann-encours b')), 'la liste « En cours » échappe titre et message (escH)');
  t(errs.length === 0, 'aucune erreur JS (écrire une annonce)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}

// ── 4. La question des notifications : images et voix ──────────────
{
  const { ctx, p, errs } = await ouvrirCaisse(b, port, nouvelleBoutique(), { tactile: true });
  await simuler(p);
  await p.evaluate(() => {
    window._pushPossible = () => true;
    try { Object.defineProperty(Notification, 'permission', { get: () => 'default', configurable: true }); } catch (e) {}
    window.pushActiver = async () => true;
  });
  await p.evaluate(async () => { viderPanier(); addPanier(DB.articles.find(x => x.id === 2), 0); procederPmt(); selPmntVente('orange'); __cancels = 0; await encaisser(); });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => ({ oui: !!document.querySelector('#succ-push-oui svg'), non: !!document.querySelector('#succ-push-non svg'),
    txtOui: document.getElementById('succ-push-oui').innerText, dits: __dits.slice(), cancels: __cancels }));
  t(r.oui && r.non && /Oui, préviens-moi/.test(r.txtOui), 'les deux boutons ont une image : la cloche pour oui, l’horloge pour plus tard');
  t(r.dits.length === 1 && /cloche verte/.test(r.dits[0]) && r.cancels === 0, `la question se dit toute seule, à la file, sans couper ce qui se dit (« ${(r.dits[0] || '').slice(0, 50)}… »)`);
  await p.locator('#succ-push-voix').tap(); await p.waitForTimeout(300);
  t(await p.evaluate(() => __dits.length) === 2, '« Écouter » la redit');
  t(errs.length === 0, 'aucune erreur JS (question des notifications)' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
}
await b.close(); s.close();
fin();
