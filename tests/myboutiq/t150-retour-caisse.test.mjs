// t150 — UNE PAGE DU SITE OUVERTE DANS L'APP RAMÈNE À LA CAISSE.
//
// ⚠️⚠️ « Pourquoi souvent quand j'entre sur l'App je me retrouve sur le
// site, où si je fais les recherches ça me renvoie automatiquement dans
// l'App ? » L'app Android réclame tout le domaine (handle_all_urls) : un
// lien Google vers un article « conseils » s'ouvre DANS l'app, et Android
// rouvre ensuite l'app sur cette page. Elle n'avait aucun chemin de retour.
import { chromium, serveur, RACINE } from './lib.mjs';
import fs from 'node:fs';
let ok=0,ko=0;
const t=(c,m)=>{ if(c){ok++;console.log('✅',m);} else {ko++;console.log('❌',m);} };
const {s,port}=await serveur();
const b=await chromium.launch();
const pages=fs.readdirSync(RACINE+'/conseils').filter(f=>f.endsWith('.html')).map(f=>'conseils/'+f).concat(['politique-confidentialite.html']);

async function ouvrir(chemin,dansApp){
  const ctx=await b.newContext({viewport:{width:360,height:740},locale:'fr-FR'});
  if(dansApp)await ctx.addInitScript(()=>{
    const vrai=window.matchMedia.bind(window);
    window.matchMedia=q=>/display-mode:\s*standalone/.test(q)?{matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:vrai(q);
  });
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**', r=>r.request().url().includes('127.0.0.1:'+port)?r.continue():r.abort());
  await p.goto(`http://127.0.0.1:${port}/${chemin}`); await p.waitForTimeout(400);
  return {ctx,p,errs};
}

// ── 1) DANS L'APP : LE BOUTON, SUR CHAQUE PAGE ──────────────────────
let partout=0;
for(const f of pages){
  const {ctx,p,errs}=await ouvrir(f,true);
  const r=await p.evaluate(()=>{const a=document.getElementById('mb-retour-app');if(!a)return null;
    const rr=a.getBoundingClientRect();return {txt:a.textContent,h:Math.round(rr.height),bas:Math.round(innerHeight-rr.bottom),vu:rr.width>0};});
  if(r&&r.vu&&/Retour à ma caisse/.test(r.txt)&&r.h>=44&&errs.length===0)partout++;
  else console.log('   ↳ '+f+' : '+JSON.stringify(r)+' '+errs.join('|'));
  await ctx.close();
}
t(partout===pages.length, `⚠️⚠️ ouverte DANS l'app, chaque page du site offre « 🏪 Retour à ma caisse » (${partout}/${pages.length})`);

// ── 2) LE BOUTON MÈNE À LA CAISSE, SANS RETOUR ARRIÈRE VERS L'ARTICLE ──
{
  const {ctx,p}=await ouvrir('conseils/vendre-sans-reseau.html',true);
  await p.click('#mb-retour-app'); await p.waitForTimeout(800);
  const u=new URL(p.url()).pathname;
  t(u==='/index.html', `une tape → la caisse (${u})`);
  await ctx.close();
}

// ── 3) IL REVIENT DANS L'APP PLUS TARD : ELLE ROUVRE SUR LA CAISSE ──
{
  const {ctx,p}=await ouvrir('conseils/vendre-sans-reseau.html',true);
  // Parti 30 s : on le laisse lire.
  await p.evaluate(()=>{let caché=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>caché});
    window.__cache=v=>{caché=v;document.dispatchEvent(new Event('visibilitychange'));};
    const n=Date.now;window.__decale=0;Date.now=()=>n()+window.__decale;});
  await p.evaluate(()=>{__cache(true);__decale=30000;__cache(false);}); await p.waitForTimeout(400);
  const court=new URL(p.url()).pathname;
  t(court==='/conseils/vendre-sans-reseau.html', 'parti 30 secondes : il retrouve son article, rien ne bouge');
  await p.evaluate(()=>{__decale=0;__cache(true);__decale=10*60*1000;__cache(false);}); await p.waitForTimeout(900);
  const long=new URL(p.url()).pathname;
  t(long==='/index.html', `⚠️ parti 10 minutes : l'app rouvre sur la CAISSE, plus sur le site (${long})`);
  await ctx.close();
}

// ── 4) DANS UN NAVIGATEUR ORDINAIRE : LE SITE RESTE LE SITE ────────
{
  const {ctx,p}=await ouvrir('conseils/vendre-sans-reseau.html',false);
  const r=await p.evaluate(()=>!!document.getElementById('mb-retour-app'));
  t(!r, 'dans Chrome ou Google, la page reste un article : pas de bouton de caisse');
  await ctx.close();
}

await b.close(); s.close();
console.log(ko?('ÉCHECS '+ko):('t150 : '+ok+' vérifications'));
process.exit(ko?1:0);
