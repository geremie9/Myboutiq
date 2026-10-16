// Générateur de la vidéo longue MyBoutiQ : minutage pris sur la VRAIE voix
// (voix.json : une piste par phrase), scènes « téléphone » posées sur les
// vraies captures de l'app (assets/app, rects.json), sous-titres découpés
// à la phrase. Usage : node gen.mjs  →  index.html, compositions/frames/*.html, timings.json
import fs from 'node:fs';
import path from 'node:path';
const P = path.dirname(new URL(import.meta.url).pathname);
const VOIX = JSON.parse(fs.readFileSync(path.join(P, 'voix.json'), 'utf8'));
const W = 1080, H = 1920;

// ── Minutage ─────────────────────────────────────────────────────────
const LEAD = { 1: 0.6 }, LEAD_DEF = 1.0, GAP = 0.45, TAIL = 0.9;
const frames = [...new Set(VOIX.map(v => v.frame))];
let t = 0;
const scenes = frames.map(f => {
  const ph = VOIX.filter(v => v.frame === f);
  const start = t;
  let c = LEAD[f] ?? LEAD_DEF;
  const beats = ph.map(v => { const b = { ...v, t: +c.toFixed(3) }; c += v.duree + GAP; return b; });
  c = c - GAP + (f === 15 ? 2.4 : TAIL);
  const dur = +c.toFixed(3);
  t += dur;
  return { f, start: +start.toFixed(3), dur, beats };
});
const TOTAL = +t.toFixed(3);
fs.writeFileSync(path.join(P, 'timings.json'), JSON.stringify({ total: TOTAL, scenes: scenes.map(s => ({ f: s.f, start: s.start, dur: s.dur,
  beats: s.beats.map(b => ({ i: b.i, src: b.src, abs: +(s.start + b.t).toFixed(3), duree: b.duree, texte: b.texte })) })) }, null, 1));

// ── Le téléphone ─────────────────────────────────────────────────────
const K = 1.1, SW = 390 * K, SH = 844 * K, BZ = 16;
const PW = SW + 2 * BZ, PH = SH + 2 * BZ, PX = Math.round((W - PW) / 2), PY = 452;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Scènes téléphone : titre + suite de « temps » (un par phrase de la voix).
// cap = capture, ring = cadre orange [x,y,w,h] en px CSS de l'app (390×844),
// zoom = extrait agrandi, tap = doigt [x,y] (ou [[x,y],[x,y]] plusieurs touches).
const TEL = {
  4: { k: '1 · Commencer', h: 'Ta boutique en une minute', b: {
    1: { cap: '01-site', ring: [20, 356, 350, 57], tap: [195, 384] },
    2: { cap: '02-creer', ring: [39, 464, 312, 52] },
    3: { cap: '02-creer' },
    4: { cap: '04-caisse' } } },
  5: { k: '2 · Tes articles', h: 'Choisis-les en photos', b: {
    1: { cap: '03-photos' },
    2: { cap: '03-photos', ring: [15, 248, 360, 420] },
    3: { cap: '22-recherche', ring: [15, 78, 309, 44] },
    4: { cap: '22-recherche', zoom: [8, 186, 374, 150] } } },
  6: { k: '3 · Vendre', h: 'Vendre en trois touches', b: {
    1: { cap: '04-caisse' },
    2: { cap: '04-caisse', ring: [137, 375, 116, 179], tap: [[195, 450], [195, 450]] },
    3: { cap: '05-panier', zoom: [15, 706, 360, 74] },
    4: { cap: '06-paiement', ring: [15, 196, 360, 92], zoom2: { at: 0.55, r: [22, 536, 346, 140] } },
    5: { cap: '06-paiement', zoom: [22, 536, 346, 140] },
    6: { cap: '07-succes', ring: [70, 526, 76, 60], zoom: [60, 426, 270, 80] } } },
  7: { k: '4 · Gros et détail', h: 'Détail en haut, gros en bas', b: {
    1: { cap: '08-gros' },
    2: { cap: '08-gros', ring: [16, 460, 108, 34] },
    3: { cap: '08-gros', ring: [16, 492, 108, 58], zoom: [8, 371, 124, 187] },
    4: { cap: '23-nego', ring: [19, 300, 352, 130] },
    5: { cap: '23-nego', zoom: [15, 296, 360, 135], ring: [15, 690, 360, 46] } } },
  8: { k: '5 · Le crédit', h: 'Chaque dette, notée pour toi', b: {
    1: { cap: '10-credit' },
    2: { cap: '10-credit', ring: [303, 425, 70, 78], ring2: { at: 0.45, r: [15, 548, 360, 42] } },
    3: { cap: '11-clients', zoom: [15, 79, 360, 68] },
    4: { cap: '11-clients', ring: [15, 158, 360, 62], zoom: [15, 158, 360, 62] },
    5: { cap: '24-client', ring: [19, 534, 352, 50], zoom2: { at: 0.5, r: [15, 698, 360, 60] } },
    6: { cap: '11-clients' } } },
  9: { k: '6 · La caisse du soir', h: 'La caisse tombe juste', b: {
    1: { cap: '12-depense' },
    2: { cap: '12-depense', ring: [19, 410, 352, 56], ring2: { at: 0.5, r: [19, 543, 113, 40] } },
    3: { cap: '13-cloture', ring: [30, 556, 345, 34], zoom: [30, 556, 345, 34] },
    4: { cap: '13-cloture', ring: [19, 628, 352, 52] },
    5: { cap: '13-cloture', zoom: [19, 700, 352, 56] } } },
  10: { k: '7 · Tes chiffres', h: 'Ce que tu gagnes, vraiment', b: {
    1: { cap: '14-rapports' },
    2: { cap: '14-rapports', ring: [197, 790, 95, 54] },
    3: { cap: '14-rapports', zoom: [15, 255, 360, 192] },
    4: { cap: '14-rapports', ring: [10, 70, 370, 48] },
    5: { cap: '15-valeur', zoom: [19, 180, 352, 72], ring2: { at: 0.5, r: [15, 330, 360, 130] } } } },
  11: { k: '8 · Ton stock', h: 'Le stock se compte tout seul', b: {
    1: { cap: '16-stock', ring: [15, 680, 360, 60] },
    2: { cap: '17-commander', zoom: [15, 278, 360, 124] },
    3: { cap: '17-commander', ring: [274, 283, 101, 36], tap: [324, 301] },
    4: { cap: '16-stock', ring: [265, 188, 112, 66] } } },
  12: { k: '9 · Tes vendeurs', h: 'Tu vois tout, même absent', b: {
    1: { cap: '19-vendeur', ring: [0, 0, 390, 66] },
    2: { cap: '18-inviter' },
    3: { cap: '18-inviter', ring: [15, 225, 360, 48], ring2: { at: 0.55, r: [15, 353, 360, 48] } },
    4: { cap: '14-rapports', ring: [15, 455, 360, 30] },
    5: { cap: '14-rapports' } } },
  13: { k: '10 · Sans réseau', h: 'Sans réseau ? Tu vends.', b: {
    1: { cap: '20-horsligne', ring: [10, 700, 370, 58] },
    2: { cap: '20-horsligne', zoom: [10, 700, 370, 58] },
    3: { cap: '04-caisse' },
    4: { cap: '02-creer' },
    5: { cap: '02-creer', ring: [39, 524, 312, 52] } } },
  14: { k: '11 · Le micro', h: 'Il entend le nom de l’article', b: {
    1: { cap: '04-caisse' },
    2: { cap: '04-caisse', ring: [331, 78, 44, 44], tap: [353, 100] },
    3: { cap: '21-micro', ring: [15, 132, 360, 22], zoom2: { at: 0.45, r: [8, 128, 374, 266] } } } },
};

const STYLE_COMMUN = `
@font-face{font-family:"Outfit";src:url("assets/fonts/outfit.woff2") format("woff2");font-weight:100 900;font-display:block}
@font-face{font-family:"Nunito";src:url("assets/fonts/nunito.woff2") format("woff2");font-weight:200 1000;font-display:block}`;

function sceneTel(s) {
  const cfg = TEL[s.f], id = `s${String(s.f).padStart(2, '0')}`;
  const caps = [...new Set(Object.values(cfg.b).map(b => b.cap))];
  const r2s = ([x, y, w, h], pad = 6) => ({ l: x * K - pad, t: y * K - pad, w: w * K + 2 * pad, h: h * K + 2 * pad });
  let rings = '', zooms = '', taps = '', js = '';
  const capIdx = c => caps.indexOf(c);
  let prev = null, n = 0;
  const ringJS = (sel, at, len) => `tl.fromTo("${sel}",{opacity:0,scale:1.25},{opacity:1,scale:1,duration:0.35,ease:"back.out(2)"},${at.toFixed(2)});
tl.to("${sel}",{opacity:0,duration:0.3},${(at + Math.max(1.2, len)).toFixed(2)});\n`;
  const zoomJS = (sel, at, len) => `tl.fromTo("${sel}",{opacity:0,scale:0.6,y:30},{opacity:1,scale:1,y:0,duration:0.45,ease:"back.out(1.6)"},${at.toFixed(2)});
tl.to("#${id}-tel",{opacity:0.45,duration:0.3},${at.toFixed(2)});
tl.to("${sel}",{opacity:0,scale:0.9,duration:0.3},${(at + Math.max(1.6, len)).toFixed(2)});
tl.to("#${id}-tel",{opacity:1,duration:0.3},${(at + Math.max(1.6, len)).toFixed(2)});\n`;
  const zoomHTML = (zid, r) => {
    const [x, y, w, h] = r, z = Math.min(940 / w, 460 / h, 3.2), cw = w * z, ch = h * z;
    const cy = PY + BZ + (y + h / 2) * K;
    const top = Math.max(500, Math.min(1380 - ch, cy - ch / 2));
    return `<div class="zoom" id="${zid}" style="left:${((W - cw) / 2 - 6).toFixed(0)}px;top:${top.toFixed(0)}px;width:${(cw + 12).toFixed(0)}px;height:${(ch + 12).toFixed(0)}px">
  <div class="zoom-in" style="width:${cw.toFixed(0)}px;height:${ch.toFixed(0)}px;background-image:url('assets/app/CAP.png');background-size:${(390 * z).toFixed(1)}px ${(844 * z).toFixed(1)}px;background-position:${(-x * z).toFixed(1)}px ${(-y * z).toFixed(1)}px"></div></div>`;
  };
  for (const b of s.beats) {
    const c = cfg.b[b.i] || {}, at = b.t, len = b.duree;
    if (c.cap && c.cap !== prev) {
      const i = capIdx(c.cap);
      if (prev === null) js += `tl.set("#${id}-cap${i}",{opacity:1},0);\n`;
      else js += `tl.to("#${id}-cap${i}",{opacity:1,duration:0.35},${(at - 0.2).toFixed(2)});\ntl.to("#${id}-cap${capIdx(prev)}",{opacity:0,duration:0.35},${(at - 0.2).toFixed(2)});\n`;
      prev = c.cap;
    }
    const addRing = (r, a, l) => { const q = r2s(r); const rid = `${id}-r${n++}`;
      rings += `<div class="ring" id="${rid}" style="left:${q.l.toFixed(0)}px;top:${q.t.toFixed(0)}px;width:${q.w.toFixed(0)}px;height:${q.h.toFixed(0)}px"></div>`;
      js += ringJS('#' + rid, a, l); };
    const addZoom = (r, a, l) => { const zid = `${id}-z${n++}`; zooms += zoomHTML(zid, r).replace('CAP', c.cap); js += zoomJS('#' + zid, a, l); };
    if (c.ring) addRing(c.ring, at + 0.15, len - 0.1);
    if (c.ring2) addRing(c.ring2.r, at + len * c.ring2.at, len * (1 - c.ring2.at) + 0.3);
    if (c.zoom) addZoom(c.zoom, at + 0.25, len - 0.2);
    if (c.zoom2) addZoom(c.zoom2.r, at + len * c.zoom2.at, len * (1 - c.zoom2.at) + 0.2);
    if (c.tap) {
      const pts = Array.isArray(c.tap[0]) ? c.tap : [c.tap];
      pts.forEach((pt, j) => { const tid = `${id}-t${n++}`;
        taps += `<div class="tap" id="${tid}" style="left:${(pt[0] * K - 36).toFixed(0)}px;top:${(pt[1] * K - 36).toFixed(0)}px"></div>`;
        const a = at + 0.35 + j * 0.75;
        js += `tl.fromTo("#${tid}",{opacity:0.95,scale:0.4},{opacity:0,scale:1.6,duration:0.6,ease:"power2.out"},${a.toFixed(2)});\n`; });
    }
  }
  const imgs = caps.map((c, i) => `<img class="cap" id="${id}-cap${i}" src="assets/app/${c}.png" alt="">`).join('\n        ');
  return `<!doctype html>
<html lang="fr"><head><meta charset="UTF-8" /></head>
<body>
<template>
<style>
${STYLE_COMMUN}
#root{position:absolute;inset:0;font-family:"Outfit",sans-serif;color:#fff}
#${id}-tete{position:absolute;left:80px;right:80px;top:212px;text-align:center}
.kick{display:inline-block;background:#F5A623;color:#200E4E;font-weight:900;font-size:30px;letter-spacing:.02em;padding:10px 26px;border-radius:999px}
.titre{font-weight:900;font-size:68px;line-height:1.06;letter-spacing:-.01em;margin-top:22px}
#${id}-tel{position:absolute;left:${PX}px;top:${PY}px;width:${PW.toFixed(0)}px;height:${PH.toFixed(0)}px;border-radius:62px;background:#15121F;box-shadow:0 40px 90px rgba(5,0,20,.55),inset 0 0 0 3px rgba(255,255,255,.08)}
.ecran{position:absolute;left:${BZ}px;top:${BZ}px;width:${SW.toFixed(1)}px;height:${SH.toFixed(1)}px;border-radius:46px;overflow:hidden;background:#F4F1FA}
.cap{position:absolute;left:0;top:0;width:100%;height:100%;opacity:0}
.ring{position:absolute;border:6px solid #F5A623;border-radius:16px;box-shadow:0 0 0 6px rgba(245,166,35,.25);opacity:0}
.tap{position:absolute;width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.55);border:4px solid #F5A623;opacity:0}
.zoom{position:absolute;border-radius:30px;background:#F5A623;padding:6px;box-shadow:0 30px 70px rgba(5,0,20,.6);opacity:0}
.zoom-in{position:relative;overflow:hidden;border-radius:24px;background-color:#fff;background-repeat:no-repeat}
</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
  <div id="${id}-tout">
    <div id="${id}-tete"><div class="kick" id="${id}-kick">${esc(cfg.k)}</div><div class="titre" id="${id}-titre">${esc(cfg.h)}</div></div>
    <div id="${id}-tel"><div class="ecran">
        ${imgs}
        ${rings}
        ${taps}
    </div></div>
    ${zooms}
  </div>
</div>
<script>
const tl = gsap.timeline({ paused: true });
tl.fromTo("#${id}-kick",{opacity:0,y:-30},{opacity:1,y:0,duration:0.45,ease:"power3.out"},0.05);
tl.fromTo("#${id}-titre",{opacity:0,y:40},{opacity:1,y:0,duration:0.55,ease:"power3.out"},0.15);
tl.fromTo("#${id}-tel",{opacity:0,y:120,rotation:-3},{opacity:1,y:0,rotation:0,duration:0.75,ease:"power3.out"},0.2);
${js}tl.to("#${id}-tout",{opacity:0,duration:0.35,ease:"power1.in"},${(s.dur - 0.35).toFixed(2)});
window.__timelines["${id}"] = tl;
</script>
</template>
</body></html>
`;
}

// ── Scènes de texte : accroche, problème, réponse, appel ──────────────
const ICO = {
  cahier: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  credit: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  caisse: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  stock: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
};
const svg = (k, s = 64, c = 'currentColor') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</svg>`;
function sceneTexte(s) {
  const id = `s${String(s.f).padStart(2, '0')}`, B = s.beats, at = i => B[i - 1].t;
  let html = '', css = '', js = '';
  if (s.f === 1) {
    css = `.q{position:absolute;left:70px;right:70px;text-align:center;font-weight:900;letter-spacing:-.015em}
#${id}-q1{top:330px;font-size:84px;line-height:1.08}#${id}-q2{top:600px;font-size:84px;line-height:1.08}#${id}-q3{top:870px;font-size:84px;line-height:1.08}
#${id}-q4{top:1170px;font-size:62px;line-height:1.15;color:#F5A623}
.q .n{color:#F5A623}`;
    html = `<div class="q" id="${id}-q1">Ta boutique a vendu <span class="n">combien</span> aujourd’hui ?</div>
<div class="q" id="${id}-q2">Et ton <span class="n">bénéfice</span> ?</div>
<div class="q" id="${id}-q3">Combien de clients te <span class="n">doivent</span> ?</div>
<div class="q" id="${id}-q4">Si tu dois réfléchir… cette vidéo est pour toi.</div>`;
    [1, 2, 3, 4].forEach(i => { js += `tl.fromTo("#${id}-q${i}",{opacity:0,y:60,scale:0.92},{opacity:1,y:0,scale:1,duration:0.55,ease:"back.out(1.5)"},${(at(i) - 0.1).toFixed(2)});\n`; });
    js += `tl.to(["#${id}-q1","#${id}-q2","#${id}-q3"],{opacity:0.35,duration:0.4},${(at(4) - 0.1).toFixed(2)});\n`;
  } else if (s.f === 2) {
    const cartes = [['cahier', 'Le cahier se perd'], ['credit', 'Les crédits s’oublient'], ['caisse', 'La caisse ne tombe pas juste'], ['stock', 'Le stock disparaît']];
    css = `.carte{position:absolute;left:110px;right:110px;height:178px;border-radius:32px;background:rgba(255,255,255,.96);color:#200E4E;display:flex;align-items:center;gap:34px;padding:0 44px;box-shadow:0 24px 50px rgba(5,0,20,.35)}
.carte .ic{flex:none;width:100px;height:100px;border-radius:26px;background:#F3EEFF;color:#57216B;display:flex;align-items:center;justify-content:center}
.carte .tx{font-weight:800;font-size:46px;line-height:1.1;margin-right:110px}
.croix{position:absolute;right:34px;top:50%;margin-top:-46px;width:92px;height:92px;border-radius:50%;background:#FF4D3D;color:#fff;font-weight:900;font-size:62px;line-height:92px;text-align:center}
#${id}-fin{position:absolute;left:80px;right:80px;top:1250px;text-align:center;font-weight:900;font-size:66px;line-height:1.12}
#${id}-fin span{color:#F5A623}`;
    html = cartes.map(([k, t], i) => `<div class="carte" id="${id}-c${i + 1}" style="top:${300 + i * 215}px"><div class="ic">${svg(k, 58)}</div><div class="tx">${t}</div><div class="croix" id="${id}-x${i + 1}">×</div></div>`).join('\n')
      + `\n<div id="${id}-fin">Tu travailles dur… mais <span>combien</span> tu gagnes ?</div>`;
    [1, 2, 3, 4].forEach(i => {
      js += `tl.fromTo("#${id}-c${i}",{opacity:0,x:${i % 2 ? -160 : 160}},{opacity:1,x:0,duration:0.5,ease:"power3.out"},${(at(i) - 0.15).toFixed(2)});\n`;
      js += `tl.fromTo("#${id}-x${i}",{opacity:0,scale:2.4,rotation:-25},{opacity:1,scale:1,rotation:0,duration:0.35,ease:"back.out(2.2)"},${(at(i) + 0.7).toFixed(2)});\n`;
    });
    js += `tl.fromTo("#${id}-fin",{opacity:0,y:50},{opacity:1,y:0,duration:0.55,ease:"power3.out"},${(at(5) - 0.1).toFixed(2)});\n`;
  } else if (s.f === 3) {
    css = `#${id}-logo{position:absolute;left:390px;top:330px;width:300px;height:300px;border-radius:72px;box-shadow:0 30px 80px rgba(245,166,35,.35)}
#${id}-nom{position:absolute;left:0;right:0;top:690px;text-align:center;font-weight:900;font-size:128px;letter-spacing:-.02em}
#${id}-nom span{color:#F5A623}
.pil{position:absolute;top:900px;height:96px;border-radius:999px;background:#fff;color:#200E4E;font-weight:900;font-size:44px;display:flex;align-items:center;gap:16px;padding:0 34px}
#${id}-bad{position:absolute;left:90px;right:90px;top:1130px;text-align:center;font-weight:800;font-size:46px;line-height:1.35;color:rgba(255,255,255,.9)}
#${id}-bad b{color:#00C853}`;
    html = `<img id="${id}-logo" src="assets/img/logo.png" alt="">
<div id="${id}-nom">My<span>Bouti</span>Q</div>
<div class="pil" id="${id}-p1" style="left:70px">${svg('caisse', 46, '#57216B')}Caisse</div>
<div class="pil" id="${id}-p2" style="left:395px">${svg('stock', 46, '#57216B')}Stock</div>
<div class="pil" id="${id}-p3" style="left:705px">${svg('credit', 46, '#57216B')}Crédits</div>
<div id="${id}-bad">Fait au Cameroun · marche <b>sans réseau</b> · gratuit pendant qu’on la construit</div>`;
    js += `tl.fromTo("#${id}-logo",{opacity:0,scale:0.3,rotation:-20},{opacity:1,scale:1,rotation:0,duration:0.7,ease:"back.out(1.8)"},0.1);
tl.fromTo("#${id}-nom",{opacity:0,y:50},{opacity:1,y:0,duration:0.55,ease:"power3.out"},0.45);
tl.fromTo(["#${id}-p1","#${id}-p2","#${id}-p3"],{opacity:0,y:40,scale:0.8},{opacity:1,y:0,scale:1,duration:0.45,ease:"back.out(2)",stagger:0.55},${(at(1) + 0.9).toFixed(2)});
tl.fromTo("#${id}-bad",{opacity:0,y:40},{opacity:1,y:0,duration:0.55,ease:"power3.out"},${(at(2) - 0.1).toFixed(2)});\n`;
  } else if (s.f === 15) {
    css = `#${id}-q{position:absolute;left:80px;right:80px;top:300px;text-align:center;font-weight:900;font-size:76px;line-height:1.1}
#${id}-q span{color:#F5A623}
#${id}-logo{position:absolute;left:430px;top:600px;width:220px;height:220px;border-radius:54px}
#${id}-url{position:absolute;left:0;right:0;top:860px;text-align:center;font-weight:900;font-size:96px;letter-spacing:-.02em;color:#F5A623}
#${id}-bt{position:absolute;left:110px;right:110px;top:1020px;height:130px;border-radius:30px;background:#F5A623;color:#200E4E;font-weight:900;font-size:50px;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 50px rgba(245,166,35,.4)}
#${id}-ex{position:absolute;left:110px;right:110px;top:1180px;height:110px;border-radius:30px;border:4px solid rgba(255,255,255,.85);font-weight:800;font-size:42px;display:flex;align-items:center;justify-content:center}
#${id}-fin{position:absolute;left:0;right:0;top:1330px;text-align:center;font-weight:900;font-size:58px}`;
    html = `<div id="${id}-q">Tu sais ce que ta boutique <span>gagne</span> ?</div>
<img id="${id}-logo" src="assets/img/logo.png" alt="">
<div id="${id}-url">myboutiq.online</div>
<div id="${id}-bt">Créer ma boutique — c’est gratuit</div>
<div id="${id}-ex">Essaie d’abord la boutique d’exemple</div>
<div id="${id}-fin">Ta boutique, enfin claire.</div>`;
    js += `tl.fromTo("#${id}-q",{opacity:0,y:40},{opacity:1,y:0,duration:0.55,ease:"power3.out"},${(at(1) - 0.1).toFixed(2)});
tl.fromTo("#${id}-logo",{opacity:0,scale:0.4},{opacity:1,scale:1,duration:0.6,ease:"back.out(1.8)"},${(at(2) - 0.1).toFixed(2)});
tl.fromTo("#${id}-url",{opacity:0,scale:0.7},{opacity:1,scale:1,duration:0.55,ease:"back.out(1.6)"},${(at(3) + 0.3).toFixed(2)});
tl.fromTo("#${id}-bt",{opacity:0,y:40},{opacity:1,y:0,duration:0.5,ease:"power3.out"},${(at(3) + 1.6).toFixed(2)});
tl.to("#${id}-bt",{scale:1.05,duration:0.4,yoyo:true,repeat:3,ease:"sine.inOut"},${(at(3) + 2.2).toFixed(2)});
tl.fromTo("#${id}-ex",{opacity:0,y:40},{opacity:1,y:0,duration:0.5,ease:"power3.out"},${(at(5) - 0.1).toFixed(2)});
tl.fromTo("#${id}-fin",{opacity:0,y:30},{opacity:1,y:0,duration:0.55,ease:"power3.out"},${(at(6) - 0.1).toFixed(2)});\n`;
  }
  const out = s.f === 15 ? '' : `tl.to("#${id}-tout",{opacity:0,duration:0.35,ease:"power1.in"},${(s.dur - 0.35).toFixed(2)});\n`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="UTF-8" /></head>
<body>
<template>
<style>
${STYLE_COMMUN}
#root{position:absolute;inset:0;font-family:"Outfit",sans-serif;color:#fff}
#${id}-tout{position:absolute;inset:0}
${css}
</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
<div id="${id}-tout">
${html}
</div>
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js}${out}window.__timelines["${id}"] = tl;
</script>
</template>
</body></html>
`;
}

// ── Sous-titres : la phrase, découpée en morceaux de 2 lignes ──────────
function morceaux(txt) {
  // « À commander », « Créer ma boutique » : jamais coupés en deux.
  txt = txt.replace(/«\s([^»]*)\s»/g, (m, x) => '«\u00a0' + x.replace(/ /g, '\u00a0') + '\u00a0»');
  const mots = txt.split(' '), out = []; let cur = '';
  for (const m of mots) {
    if ((cur + ' ' + m).trim().length > 40 && cur) { out.push(cur.trim()); cur = m; }
    else cur = (cur + ' ' + m).trim();
    if (/[,:]$/.test(m) && cur.length > 26) { out.push(cur.trim()); cur = ''; }
  }
  if (cur) out.push(cur.trim());
  // un dernier morceau d'un seul mot rejoint le précédent
  if (out.length > 1 && out[out.length - 1].split(' ').length < 2) { const l = out.pop(); out[out.length - 1] += ' ' + l; }
  return out;
}
const subs = [];
for (const s of scenes) for (const b of s.beats) {
  const parts = morceaux(b.texte), tot = parts.reduce((a, p) => a + p.length, 0);
  let c = s.start + b.t;
  parts.forEach((p, j) => { const d = b.duree * p.length / tot; subs.push({ t: +c.toFixed(3), d: +(j === parts.length - 1 ? d + 0.35 : d).toFixed(3), x: p }); c += d; });
}

// ── index.html ───────────────────────────────────────────────────────
const NOMS = { 1: 'accroche', 2: 'probleme', 3: 'reponse', 4: 'creer', 5: 'articles', 6: 'vendre', 7: 'gros', 8: 'credit', 9: 'cloture', 10: 'rapports', 11: 'stock', 12: 'vendeurs', 13: 'hors-ligne', 14: 'micro', 15: 'appel' };
fs.mkdirSync(path.join(P, 'compositions/frames'), { recursive: true });
const hosts = scenes.map(s => {
  const id = `s${String(s.f).padStart(2, '0')}`, src = `compositions/frames/${String(s.f).padStart(2, '0')}-${NOMS[s.f]}.html`;
  fs.writeFileSync(path.join(P, src), TEL[s.f] ? sceneTel(s) : sceneTexte(s));
  return `    <div id="${id}" data-composition-id="${id}" data-composition-src="${src}" data-start="${s.start}" data-duration="${s.dur}" data-track-index="2" data-width="${W}" data-height="${H}"></div>`;
}).join('\n');
// Le fond (dégradé de l'app qui dérive) et les sous-titres : chacun sa composition.
const fond = `<!doctype html>
<html lang="fr"><head><meta charset="UTF-8" /></head>
<body>
<template>
<style>
${STYLE_COMMUN}
#root{position:absolute;inset:0;font-family:"Outfit",sans-serif}
#bg-grad{position:absolute;left:-120px;top:-160px;width:1320px;height:2240px;background:linear-gradient(165deg,#200E4E 0%,#341764 52%,#57216B 100%)}
.glow{position:absolute;border-radius:50%}
#glow-a{left:-420px;top:1180px;width:1300px;height:1300px;background:radial-gradient(circle,rgba(245,166,35,.26) 0%,rgba(245,166,35,0) 62%)}
#glow-b{left:420px;top:-420px;width:1200px;height:1200px;background:radial-gradient(circle,rgba(214,72,170,.24) 0%,rgba(214,72,170,0) 62%)}
#bg-dots{position:absolute;left:0;top:0;width:1080px;height:2400px;background-image:radial-gradient(rgba(255,255,255,.08) 2px,transparent 2.6px);background-size:46px 46px}
#marque{position:absolute;left:0;right:0;top:120px;text-align:center;font-weight:800;font-size:30px;letter-spacing:.14em;color:rgba(255,255,255,.62)}
</style>
<div id="root" data-composition-id="fond" data-width="${W}" data-height="${H}">
  <div id="bg-grad"></div><div class="glow" id="glow-a"></div><div class="glow" id="glow-b"></div><div id="bg-dots"></div>
  <div id="marque">MYBOUTIQ</div>
</div>
<script>
const tl = gsap.timeline({ paused: true });
tl.fromTo("#glow-a",{x:0,y:0,scale:1},{x:160,y:-120,scale:1.15,duration:${(TOTAL / 2).toFixed(2)},ease:"sine.inOut",yoyo:true,repeat:1},0);
tl.fromTo("#glow-b",{x:0,y:0,scale:1},{x:-140,y:160,scale:1.1,duration:${(TOTAL / 2).toFixed(2)},ease:"sine.inOut",yoyo:true,repeat:1},0);
tl.fromTo("#bg-dots",{y:0},{y:-46*8,duration:${TOTAL},ease:"none"},0);
window.__timelines["fond"] = tl;
</script>
</template>
</body></html>
`;
fs.writeFileSync(path.join(P, 'compositions/fond.html'), fond);
// Sous-titres : de simples blocs que la timeline allume et éteint, en trois fichiers.
const groupes = [];
for (let g = 0; g < 3; g++) groupes.push(subs.slice(Math.round(g * subs.length / 3), Math.round((g + 1) * subs.length / 3)));
const stHosts = groupes.map((G, g) => {
  const id = `st${g + 1}`, d0 = g === 0 ? 0 : +(G[0].t - 0.05).toFixed(3);
  const fin = g === 2 ? TOTAL : +(groupes[g + 1][0].t - 0.05).toFixed(3);
  const file = `<!doctype html>
<html lang="fr"><head><meta charset="UTF-8" /></head>
<body>
<template>
<style>
${STYLE_COMMUN}
#root{position:absolute;inset:0;font-family:"Outfit",sans-serif}
.st{position:absolute;left:0;right:0;bottom:330px;margin:0 auto;width:fit-content;max-width:980px;background:rgba(12,6,32,.82);border-radius:26px;padding:18px 32px;text-align:center;font-weight:700;font-size:46px;line-height:1.22;color:#fff;opacity:0}
</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}" data-layout-allow-overlap>
${G.map((x, i) => `  <div class="st" id="${id}-${i}">${esc(x.x)}</div>`).join('\n')}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${G.map((x, i) => `tl.fromTo("#${id}-${i}",{opacity:0,y:14},{opacity:1,y:0,duration:0.16,ease:"power2.out"},${(x.t - d0).toFixed(3)});
tl.to("#${id}-${i}",{opacity:0,duration:0.12},${(x.t - d0 + x.d - 0.12).toFixed(3)});`).join('\n')}
window.__timelines["${id}"] = tl;
</script>
</template>
</body></html>
`;
  fs.writeFileSync(path.join(P, `compositions/soustitres-${g + 1}.html`), file);
  return `    <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/soustitres-${g + 1}.html" data-start="${d0}" data-duration="${(fin - d0).toFixed(3)}" data-track-index="5" data-width="${W}" data-height="${H}"></div>`;
}).join('\n');
try { fs.unlinkSync(path.join(P, 'compositions/soustitres.html')); } catch (e) {}
const index = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>MyBoutiQ — la vidéo complète</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
${STYLE_COMMUN}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #200E4E; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #200E4E; font-family: "Outfit", sans-serif; color: #fff; }
    </style>
  </head>
  <body>
  <div id="root" data-composition-id="main" data-width="${W}" data-height="${H}" data-duration="${TOTAL}">
    <div id="fond" data-composition-id="fond" data-composition-src="compositions/fond.html" data-start="0" data-duration="${TOTAL}" data-track-index="0" data-width="${W}" data-height="${H}"></div>
${hosts}
${stHosts}
    <audio id="voix" src="assets/audio/voix.wav" data-start="0" data-duration="${TOTAL}" data-track-index="8" data-volume="1"></audio>
    <audio id="musique" src="assets/audio/musique.wav" data-start="0" data-duration="${TOTAL}" data-track-index="9" data-volume="0.55"></audio>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    window.__timelines["main"] = tl;
  </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(P, 'index.html'), index);
console.log('durée', TOTAL, 's ·', scenes.length, 'scènes ·', subs.length, 'sous-titres');
scenes.forEach(s => console.log(String(s.f).padStart(2), s.start.toFixed(1), s.dur.toFixed(1)));
