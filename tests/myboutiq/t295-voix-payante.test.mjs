// t295 — LA VOIX PAYANTE, CÔTÉ TÉLÉPHONE (23.80).
// Le patron, le 20/11/2026 : « la voix avec des API payantes à faible coût —
// ceux qui sont prêts à payer ont souvent du wifi et du solaire ».
// Un faux micro (Chromium), une fausse fonction serveur (page.route) : on
// vérifie que la phrase part avec le code, le PIN et les articles de la
// boutique, que le texte revient dans la recherche, et que SANS abonnement,
// SANS réseau ou en PANNE, la dictée gratuite reprend — jamais de blocage.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t295');
const { s, port } = await serveur();
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const URL_VOIX = 'https://bbncilovxzkcvlxvoqtg.supabase.co/functions/v1/voix';

const d = nouvelleBoutique();
d.articles.push({ id: 40, nm: 'Mützig 65 cl', e: '🍺', cat: 'Boissons', px: 750, pa: 620, stk0: 24, al: 0, vd: 99 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
let envois = [], reponseEtat = { ok: true, reste: 36000 }, reponsePhrase = { status: 200, j: { ok: true, texte: 'mützig', fournisseur: 'groq', reste: 35990 } };
await p.route(URL_VOIX, async r => {
  const req = r.request(), ct = req.headers()['content-type'] || '';
  if (ct.includes('application/json')) { envois.push({ etat: JSON.parse(req.postData() || '{}') }); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reponseEtat) }); }
  const corps = req.postDataBuffer() ? req.postDataBuffer().toString('utf8') : '';
  envois.push({ phrase: corps, ct });
  return r.fulfill({ status: reponsePhrase.status, contentType: 'application/json', body: JSON.stringify(reponsePhrase.j) });
});
// Une dictée gratuite factice, pour voir quand elle reprend la main.
await p.evaluate(() => { window.__gratuit = 0; window.webkitSpeechRecognition = window.SpeechRecognition = function () { window.__gratuit++; this.start = () => {}; this.stop = () => {}; this.abort = () => {}; }; window._shopPin = '4321'; });

// ── 1. L'abonnement se demande au serveur ──
const ok = await p.evaluate(async () => { const r = await voixProEtat(true); majBoutonMic(); return { r, dispo: voixProDispo(), pastille: document.getElementById('btn-mic').classList.contains('vpro') }; });
t(ok.r && ok.dispo && ok.pastille, 'boutique abonnée : la voix payante est prête, et le micro porte son point orange');
t(envois[0] && envois[0].etat.code === 'MARI0001' && envois[0].etat.action === 'etat', 'la question part avec le code de la boutique');

// ── 2. Une phrase : le micro, l'envoi, le texte dans la recherche ──
envois = [];
await p.evaluate(() => { voiceSearch(); setTimeout(voixProArreter, 900); });
await p.waitForFunction(() => (document.getElementById('src-c') || {}).value === 'mützig', null, { timeout: 12000 }).catch(() => {});
const ph = envois.find(x => x.phrase);
const r2 = await p.evaluate(() => ({ q: document.getElementById('src-c').value, tete: (document.querySelector('#pgrid .pcard') || {}).id, gratuit: window.__gratuit }));
t(r2.q === 'mützig' && r2.gratuit === 0, `la phrase revient en texte dans la recherche (« ${r2.q} »), sans la dictée gratuite`);
t(!!ph && /multipart\/form-data/.test(ph.ct) && /name="code"\r\n\r\nMARI0001/.test(ph.phrase) && /name="pin"\r\n\r\n4321/.test(ph.phrase), 'la phrase part avec le code et le PIN de la boutique (le serveur vérifie)');
t(!!ph && /name="mots"/.test(ph.phrase) && /M.tzig 65 cl/.test(ph.phrase) && /name="son"; filename="phrase.webm"/.test(ph.phrase), 'avec le son et la liste des articles de la boutique (Mützig 65 cl en tête)');
t(!!ph && ph.phrase.length < 60000, `le son est léger (${Math.round((ph ? ph.phrase.length : 0) / 1024)} Ko envoyés)`);

// ── 3. Le serveur en panne : un mot, puis la dictée gratuite 5 minutes ──
reponsePhrase = { status: 502, j: { ok: false, motif: 'service' } };
await p.evaluate(() => { window.__toasts = []; voiceSearch(); setTimeout(voixProArreter, 600); });
await p.waitForFunction(() => (window.__toasts || []).some(x => /ne répond pas/.test(x)), null, { timeout: 12000 }).catch(() => {});
const r3 = await p.evaluate(() => { const toasts = window.__toasts.slice(); voiceSearch(); return { toasts, dispo: voixProDispo(), gratuit: window.__gratuit }; });
t(r3.toasts.some(x => /ne répond pas.*touche l'article/.test(x)), `en panne, il est prévenu en une phrase (« ${r3.toasts.filter(x => /voix/i.test(x)).join(' | ')} »)`);
t(!r3.dispo && r3.gratuit === 1, `la tape suivante prend la dictée gratuite : rien n'est bloqué (${JSON.stringify({ dispo: r3.dispo, gratuit: r3.gratuit })})`);

// ── 4. L'abonnement fini : la voix payante s'éteint ──
await p.evaluate(() => { _vproPanne = 0; });
reponsePhrase = { status: 402, j: { ok: false, motif: 'abonnement' } };
await p.evaluate(() => { voiceSearch(); setTimeout(voixProArreter, 600); });
await p.waitForFunction(() => !_vpro.ok, null, { timeout: 12000 }).catch(() => {});
t(await p.evaluate(() => !_vpro.ok && !voixProDispo() && !document.getElementById('btn-mic').classList.contains('vpro')), 'abonnement fini : la voix payante s\'éteint, le point orange disparaît');

// ── 5. Sans réseau, pas d'appel ; la démo n'appelle jamais ──
envois = [];
const r5 = await p.evaluate(async () => {
  _vpro = { ok: true, ts: Date.now(), code: DB.cfg.code };
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  const horsLigne = voixProDispo();
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  const vraie = estDemo; estDemo = () => true; const demo = voixProDispo(); const e = await voixProEtat(true); estDemo = vraie;
  return { horsLigne, demo, e };
});
t(!r5.horsLigne, 'sans réseau : la dictée gratuite, sans même essayer le serveur');
t(!r5.demo && !r5.e && envois.length === 0, 'la boutique de démonstration n\'appelle jamais le serveur');

// ── 6. Les champs (nom d'un client) passent aussi par la voix payante ──
reponsePhrase = { status: 200, j: { ok: true, texte: 'mama bertine' } };
await p.evaluate(() => { _vpro = { ok: true, ts: Date.now(), code: DB.cfg.code }; _vproPanne = 0; ouvrirAddCli(); dicterDans('cli-nm', 'mic-clinm'); setTimeout(voixProArreter, 700); });
await p.waitForFunction(() => document.getElementById('cli-nm').value === 'Mama bertine', null, { timeout: 12000 }).catch(() => {});
t(await p.evaluate(() => document.getElementById('cli-nm').value) === 'Mama bertine', '« Nouveau client » : le nom dicté arrive dans le champ, avec sa majuscule');
// ── 7. 23.81 — un « non » ne se garde que 10 minutes (pilote du 20/11) ──
envois = []; reponseEtat = { ok: true, reste: 36000 };
const r7 = await p.evaluate(async () => {
  _vpro = { ok: false, ts: Date.now() - 5 * 60e3, code: DB.cfg.code }; const a = await voixProEtat();
  _vpro = { ok: false, ts: Date.now() - 11 * 60e3, code: DB.cfg.code }; const b = await voixProEtat();
  return { a, b };
});
t(!r7.a && r7.b && envois.filter(x => x.etat).length === 1, `un « non » de 5 min reste « non » ; de 11 min, on redemande, et le « oui » arrive (${envois.length} demande)`);
// Le patron revenu sans PIN de session : celui de la boutique part.
envois = [];
await p.evaluate(async () => { window._shopPin = null; role = 'patron'; DB.cfg.pin = '123456'; await voixProEtat(true); });
t(envois[0] && envois[0].etat.pin === '123456', 'le patron sans PIN de session : celui gardé dans la boutique part (le serveur le vérifie)');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
