// t298 — L'ÉCRAN D'ÉCOUTE ET L'ARRÊT TOUT SEUL (23.84).
// Le patron, le 20/11/2026, au pilote de la voix payante : « l'écran n'est
// pas vraiment adapté et c'est très lent ». Mesuré : le serveur répondait en
// 1,1 à 2,5 s, mais l'écoute attendait qu'il RETOUCHE le micro (ou 6 s), et
// un petit message seulement disait qu'on l'écoutait.
// Une fausse voix : un son d'une seconde, puis le silence.
import { chromium, serveur, compteur } from './lib.mjs';
import { nouvelleBoutique, ouvrirCaisse } from './caisse.mjs';
const { t, fin } = compteur('t298');
const { s, port } = await serveur();
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
const URL_VOIX = 'https://bbncilovxzkcvlxvoqtg.supabase.co/functions/v1/voix';
const d = nouvelleBoutique();
d.articles.push({ id: 40, nm: 'Mützig 65 cl', e: '🍺', cat: 'Boissons', px: 750, pa: 620, stk0: 24, al: 0, vd: 0 });
const { ctx, p, errs } = await ouvrirCaisse(b, port, d);
let etats = 0, phrases = 0;
await p.route(URL_VOIX, async r => {
  const ct = r.request().headers()['content-type'] || '';
  if (ct.includes('application/json')) { etats++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reste: 36000 }) }); }
  phrases++;
  await new Promise(x => setTimeout(x, 700));   // le serveur réfléchit
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, texte: 'deux Mützig' }) });
});
// La fausse voix : 1 s de son, puis le silence.
await p.evaluate(() => {
  window._shopPin = '123456';
  navigator.mediaDevices.getUserMedia = async () => {
    const ac = new AudioContext(); await ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), dst = ac.createMediaStreamDestination();
    o.frequency.value = 300; g.gain.value = 0; o.connect(g); g.connect(dst); o.start();
    setTimeout(() => { g.gain.value = 0.6; }, 500); setTimeout(() => { g.gain.value = 0; }, 1500);
    return dst.stream;
  };
});
await p.evaluate(async () => { await voixProEtat(true); });
etats = 0;

// ── 1. L'écran d'écoute ──
await p.evaluate(() => { window.__t0 = Date.now(); window.__fin = 0; voiceSearch(); const o = setInterval(() => { if (!document.getElementById('vpro-ov') || !document.getElementById('vpro-ov').classList.contains('show')) { if (window.__vu) { window.__fin = Date.now(); clearInterval(o); } } else window.__vu = 1; }, 50); });
await p.waitForTimeout(700);
const e1 = await p.evaluate(() => { const o = document.getElementById('vpro-ov'), r = document.getElementById('vpro-rond').getBoundingClientRect(), bt = document.getElementById('vpro-fini').getBoundingClientRect();
  return { vu: o.classList.contains('show'), t: document.getElementById('vpro-t').textContent, s: document.getElementById('vpro-s').textContent, rond: Math.round(r.width), bouton: Math.round(bt.height), bas: bt.bottom > innerHeight * 0.7 }; });
t(e1.vu && e1.t === 'Je t\'écoute' && /deux Mützig et un Tangui/.test(e1.s), `un écran d'écoute : « ${e1.t} » et la consigne (« ${e1.s} »)`);
t(e1.rond >= 120 && e1.bouton >= 60 && e1.bas, `un grand micro (${e1.rond} px) et un gros « C'est fini » (${e1.bouton} px) sous le pouce`);
const bat = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); return document.getElementById('vpro-rond').style.transform; });
t(/scale\(1\.\d*[1-9]/.test(bat), `le micro bat au rythme de la voix (${bat})`);

// ── 2. L'arrêt tout seul, le serveur réveillé pendant qu'il parle ──
await p.waitForFunction(() => window.__fin > 0, null, { timeout: 12000 }).catch(() => {});
const e2 = await p.evaluate(() => ({ duree: window.__fin - window.__t0, panier: panier['40-0'] || 0 }));
t(e2.panier === 2, `la phrase arrive dans le panier (${e2.panier} Mützig)`);
t(e2.duree > 0 && e2.duree < 4500, `il n'a rien retouché : l'écoute s'arrête toute seule après sa phrase — tout fini en ${(e2.duree / 1000).toFixed(1)} s (avant : 6 s d'attente, plus la réponse)`);
t(etats >= 1 && phrases === 1, `le serveur est réveillé pendant qu'il parle (${etats} petite question, puis la phrase)`);

// ── 3. « C'est fini » arrête tout de suite ──
await p.evaluate(() => { document.querySelectorAll('.ov').forEach(o => o.classList.remove('show')); window.__t1 = Date.now(); voiceSearch(); });
await p.waitForTimeout(400);
await p.locator('#vpro-fini').click();
await p.waitForTimeout(150);
const e3 = await p.evaluate(() => ({ pense: document.getElementById('vpro-ov').classList.contains('pense'), t: document.getElementById('vpro-t').textContent }));
t(e3.pense && /réfléchis/.test(e3.t), `« C'est fini » : l'écoute s'arrête, l'écran dit « ${e3.t} »`);
await p.waitForFunction(() => !document.getElementById('vpro-ov').classList.contains('show'), null, { timeout: 8000 }).catch(() => {});
t(await p.evaluate(() => !document.getElementById('vpro-ov').classList.contains('show')), 'puis l\'écran se ferme sur le panier');
t(errs.length === 0, 'aucune erreur JS' + (errs.length ? ' : ' + errs.join(' | ') : ''));
await ctx.close(); await b.close(); s.close();
fin();
