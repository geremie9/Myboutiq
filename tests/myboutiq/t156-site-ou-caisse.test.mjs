// t156 — LE SITE OU LA CAISSE ?
//
// « Pourquoi quand je veux naviguer sur le site ça me renvoie uniquement
// sur l'App en me demandant le code, or quand j'écris MyBoutiQ à Google
// c'est pour voir mon site, mes pages ? »
// Sur un téléphone qui avait déjà une boutique, la racine du site ouvrait
// TOUJOURS la porte du PIN. Règle : le site quand on l'a demandé (Google,
// un guide, un lien ouvert dans l'app, ?site) ; la porte pour tout le reste.
import { chromium, serveur, RACINE } from './lib.mjs';
let ok=0,ko=0;const t=(c,m)=>{if(c){ok++;console.log('✅',m);}else{ko++;console.log('❌',m);}};
const {s,port}=await serveur();const B=`http://127.0.0.1:${port}`;
const b=await chromium.launch();
const DB={cfg:{lang:'fr',nom:'Chez Awa',tel:'+237699000111',pin:'908172',s:'FCFA',d:'XAF',secteur:'boutique',code:'AWAA0001',plan:'gratuit',
  pays:{cc:'237',nm:'Cameroun',fl:'🇨🇲',s:'FCFA',d:'XAF'}},articles:[{id:1,nm:'Riz',px:500,pa:400,stk0:10,al:0,vd:0,vr:[]}],
  boutiques:[{id:1,nm:'Chez Awa',code:'AWAA0001',secteur:'boutique',actif:true,ventes:0}],boutiqueCourante:0,clients:[],
  equipe:[{id:1,nm:'Awa',role:'patron',bg:'#FFF',tc:'#000',actif:true}],fournisseurs:[],ventes:[],depenses:[],objectif:0,fondsDepart:0,nextId:2000,journal:[],stats:{}};
const ENTREE={role:'patron',tel:'+237699000111',code:'AWAA0001',nom:'Chez Awa',boutiques:[{code:'AWAA0001',nm:'Chez Awa'}]};
// opts : connu (boutique sur le téléphone), app (ouvert dans l'app installée)
async function ouvrir(chemin,{connu=true,referer=null,app=false,demo=false}={}){
  const ctx=await b.newContext({viewport:{width:360,height:740},locale:'fr-FR'});
  if(app)await ctx.addInitScript(()=>{const v=window.matchMedia.bind(window);
    window.matchMedia=q=>/display-mode:\s*standalone/.test(q)?{matches:true,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:v(q);});
  // La première classe posée sur <html> : c'est ce que l'œil voit avant le script.
  await ctx.addInitScript(()=>{window.__premier=null;new MutationObserver((m,o)=>{const h=document.documentElement;const c=h?h.className:'';
    if(/porte-/.test(c)&&window.__premier===null){window.__premier=c;o.disconnect();}}).observe(document,{subtree:true,attributes:true,attributeFilter:['class']});});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
  await p.route('**',r=>r.request().url().includes('127.0.0.1')?r.continue():r.abort());
  if(connu){
    await p.goto(B+'/politique-confidentialite.html');
    await p.evaluate(([db,en,demo])=>{if(demo)db.cfg.demo=true;localStorage.setItem('myboutiq_v6',JSON.stringify(db));localStorage.setItem('myboutiq_entree',JSON.stringify(en));},[DB,ENTREE,demo]);
  }
  // La peinture du premier instant, avant le mégaoctet de script.
  await p.goto(B+chemin,referer?{referer}:{});
  await p.waitForTimeout(1600);
  const premier=await p.evaluate(()=>window.__premier);
  const r=await p.evaluate(()=>{const on=[...document.querySelectorAll('.scr.on')].map(x=>x.id);
    const vis=id=>{const e=document.getElementById(id);return !!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;};
    return {ecran:on[0]||'',connuBar:vis('vt-connu'),nom:(document.getElementById('vt-connu-nm')||{}).textContent||'',
      creer:vis('vt-b2'),b3:(document.getElementById('vt-b3')||{}).textContent||'',lien:vis('lg-site'),cls:document.documentElement.className};});
  return {ctx,p,r,errs,premier};
}
const GOOGLE='https://www.google.com/';
// ── 1) LE CAS DU PATRON : il tape MyBoutiQ dans Google ─────────────────
{
  const {ctx,r,errs,premier}=await ouvrir('/',{referer:GOOGLE});
  t(r.ecran==='s-landing', `⚠️⚠️ boutique sur le téléphone + arrivée par Google : le SITE s'ouvre (${r.ecran})`);
  t(r.connuBar&&/Chez Awa/.test(r.nom), `en haut : « ${r.nom} » et « Ouvrir ma caisse »`);
  t(!r.creer&&/Ouvrir ma caisse/.test(r.b3), '« Créer ma boutique » disparaît, « J\'ai déjà une boutique » devient « Ouvrir ma caisse »');
  t(premier&&/porte-vitrine/.test(premier)&&!/porte-login|porte-rapide/.test(premier), `dès le premier instant le site est peint, pas la porte (${premier})`);
  t(errs.length===0,'aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
  await ctx.close();
}
// ── 2) DEPUIS UN GUIDE : le logo « MyBoutiQ » mène au site ─────────────
{
  const {ctx,r}=await ouvrir('/',{referer:B+'/conseils/compter-sa-caisse-le-soir'});
  t(r.ecran==='s-landing'&&r.connuBar, 'depuis un guide, « MyBoutiQ » ouvre le site, pas la porte');
  await ctx.close();
}
// ── 3) CE QUI NE CHANGE PAS : la porte ─────────────────────────────────
{
  const a=await ouvrir('/index.html',{app:true});
  t(a.r.ecran==='s-login', `⚠️ l'icône de l'app (/index.html) ouvre toujours la PORTE (${a.r.ecran})`);
  t(a.r.lien, 'la porte offre « 🌐 Voir le site MyBoutiQ »');
  t(/porte-(login|rapide)/.test(a.premier||'')&&!/porte-vitrine/.test(a.premier||''), `et c'est bien la porte qui est peinte d'emblée (${a.premier})`);
  await a.ctx.close();
  const c=await ouvrir('/',{});
  t(c.r.ecran==='s-login', `adresse tapée à la main, sans venir de nulle part : la porte (${c.r.ecran})`);
  await c.ctx.close();
  const d=await ouvrir('/index.html',{referer:B+'/conseils/vendre-sans-reseau'});
  t(d.r.ecran==='s-login', '« Retour à ma caisse » depuis un guide (/index.html) : la porte');
  await d.ctx.close();
}
// ── 4) DANS L'APP, UN LIEN VERS LE SITE (Google, WhatsApp) ─────────────
{
  const {ctx,p,r}=await ouvrir('/',{app:true});
  t(r.ecran==='s-landing'&&r.connuBar, 'dans l\'app, un lien vers myboutiq.online ouvre le site, caisse à une tape');
  // Parti 30 s : il retrouve le site. Parti 10 min : sa caisse.
  await p.evaluate(()=>{let c=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>c});
    window.__cache=v=>{c=v;document.dispatchEvent(new Event('visibilitychange'));};
    const n=Date.now;window.__d=0;Date.now=()=>n()+window.__d;});
  await p.evaluate(()=>{__cache(true);__d=30000;__cache(false);});await p.waitForTimeout(300);
  const e1=await p.evaluate(()=>document.querySelector('.scr.on').id);
  await p.evaluate(()=>{__d=0;__cache(true);__d=600000;__cache(false);});await p.waitForTimeout(500);
  const e2=await p.evaluate(()=>document.querySelector('.scr.on').id);
  t(e1==='s-landing'&&e2==='s-login', `⚠️ dans l'app : parti 30 s il reste sur le site, parti 10 min il retrouve sa caisse (${e1} → ${e2})`);
  await ctx.close();
}
// ── 5) LES DEUX PASSAGES : site → caisse → site ────────────────────────
{
  const {ctx,p}=await ouvrir('/?site');
  const a=await p.evaluate(()=>document.querySelector('.scr.on').id);
  await p.click('#vt-connu-b');await p.waitForTimeout(500);
  const z=await p.evaluate(()=>({ecran:document.querySelector('.scr.on').id,pin:!!document.getElementById('er-pin')&&getComputedStyle(document.getElementById('entree-rapide')).display!=='none'}));
  t(a==='s-landing'&&z.ecran==='s-login'&&z.pin, `« ?site » ouvre le site ; « Ouvrir ma caisse » mène à la porte rapide, PIN prêt (${a} → ${z.ecran})`);
  await p.click('#lg-site');await p.waitForTimeout(400);
  const w=await p.evaluate(()=>({ecran:document.querySelector('.scr.on').id,bar:getComputedStyle(document.getElementById('vt-connu')).display}));
  t(w.ecran==='s-landing'&&w.bar!=='none', 'et « Voir le site » ramène au site, sa barre en haut');
  // La barre de navigation suit aussi.
  const cta=await p.evaluate(()=>document.getElementById('nv-cta').textContent);
  t(/Ma caisse/.test(cta), `la barre du site propose « ${cta.trim()} » au lieu d'« Essayer »`);
  await ctx.close();
}
// ── 6) RIEN NE CHANGE POUR UN INCONNU, NI POUR L'INVITATION ────────────
{
  const n=await ouvrir('/',{connu:false,referer:GOOGLE});
  t(n.r.ecran==='s-landing'&&!n.r.connuBar&&n.r.creer, 'un inconnu venu de Google : la vitrine habituelle, « Créer ma boutique » en vue');
  await n.ctx.close();
  const i=await ouvrir('/?code=12345678901&nom=Ali',{referer:GOOGLE});
  const v=await i.p.evaluate(()=>({ecran:document.querySelector('.scr.on').id,code:document.getElementById('v-code').value}));
  t(v.ecran==='s-login'&&/12345/.test(v.code), `lien d'invitation d'un vendeur : la porte vendeur, code pré-rempli (${v.ecran})`);
  await i.ctx.close();
  const d=await ouvrir('/',{referer:GOOGLE,demo:true});
  t(d.r.ecran==='s-caisse', `boutique d'exemple en cours : elle reste ouverte (${d.r.ecran})`);
  await d.ctx.close();
}
// ── 7) L'INVITATION D'UN VENDEUR, DE BOUT EN BOUT ──────────────────────
{
  const fs=await import('node:fs');
  const JOIN=fs.readFileSync(RACINE+'/join.html','utf8');
  const ctx=await b.newContext({viewport:{width:360,height:740}});const p=await ctx.newPage();
  // Comme Vercel : /join/CODE sert join.html.
  await p.route('**',r=>{const u=r.request().url();
    if(/127\.0\.0\.1:\d+\/join\//.test(u)&&!/\.(png|css|js)$/.test(u))return r.fulfill({status:200,contentType:'text/html',body:JOIN});
    return u.includes('127.0.0.1')?r.continue():r.abort();});
  await p.goto(B+'/join/1234567890?n=Ali');await p.waitForTimeout(300);
  const j=await p.evaluate(()=>({open:document.getElementById('open').href,icone:document.querySelector('link[rel=icon]').href,
    conf:[...document.querySelectorAll('a')].find(a=>/confidentialit/.test(a.textContent)).href}));
  t(new URL(j.open).pathname==='/'&&new URL(j.open).search==='?code=1234567890&nom=Ali', `⚠️⚠️ « Ouvrir MyBoutiQ » mène à l'app, plus à /join/ (${new URL(j.open).pathname+new URL(j.open).search})`);
  t(new URL(j.icone).pathname==='/icon-192.png'&&new URL(j.conf).pathname==='/politique-confidentialite.html', 'l\'icône et la politique de confidentialité ne retombent plus sur la page d\'invitation');
  // Téléphone NEUF : le service worker s'installe pendant qu'il tape.
  let charges=0;p.on('load',()=>charges++);
  await p.click('#open');await p.waitForTimeout(6000);
  const v=await p.evaluate(()=>({ecran:(document.querySelector('.scr.on')||{}).id,code:document.getElementById('v-code').value,nom:document.getElementById('v-nom').value,sw:!!navigator.serviceWorker.controller}));
  t(v.sw&&charges===1, `⚠️⚠️ téléphone neuf : le service worker prend la main SANS recharger la page (${charges} chargement)`);
  t(v.ecran==='s-login'&&/12345/.test(v.code)&&v.nom==='Ali', `et le vendeur garde son code et son prénom (« ${v.code} », « ${v.nom} »)`);
  await ctx.close();
}
// ── 8) « RECHARGER » (nouvelle version) PENDANT QU'IL LIT LE SITE ───────
{
  const {ctx,p}=await ouvrir('/',{referer:GOOGLE});
  await p.reload();await p.waitForTimeout(1500);
  const e=await p.evaluate(()=>document.querySelector('.scr.on').id);
  t(e==='s-landing', `rechargée pendant qu'il lisait le site : il y reste (${e})`);
  await p.click('#vt-connu-b');await p.waitForTimeout(300);await p.reload();await p.waitForTimeout(1500);
  const f=await p.evaluate(()=>document.querySelector('.scr.on').id);
  t(f==='s-login', `rechargée après « Ouvrir ma caisse » : la porte (${f})`);
  await ctx.close();
}
await b.close();s.close();
console.log(ko?('ÉCHECS '+ko):('t156 : '+ok+' vérifications'));process.exit(ko?1:0);
