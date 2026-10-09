// t155 — LES PAGES DE VISIBILITÉ : chaque guide est trouvable, lisible au
// téléphone, et ne mène nulle part de cassé.
import { chromium, serveur, RACINE } from './lib.mjs';
import fs from 'node:fs';
let ok=0,ko=0;const t=(c,m)=>{if(c){ok++;console.log('✅',m);}else{ko++;console.log('❌',m);}};
const R=RACINE+'/';
const pages=fs.readdirSync(R+'conseils').filter(f=>f.endsWith('.html'));
const existe=u=>{ // une adresse du site → un fichier
  u=u.replace(/^https:\/\/myboutiq\.online/,'').split('#')[0].split('?')[0];
  if(u==='/'||u==='')return fs.existsSync(R+'index.html');
  if(u==='/conseils')return fs.existsSync(R+'conseils/index.html');
  if(/^\/conseils\/[a-z0-9-]+$/.test(u))return fs.existsSync(R+u.slice(1)+'.html');
  return fs.existsSync(R+u.replace(/^\//,''));
};
let cass=[],ld=0,meta=0,seuls=0;
const titres=new Set(),descs=new Set();
for(const f of pages){
  const h=fs.readFileSync(R+'conseils/'+f,'utf8');
  for(const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){try{JSON.parse(m[1]);ld++;}catch(e){cass.push(f+' JSON-LD');}}
  for(const m of h.matchAll(/(?:href|src)="(\/[^"]*|https:\/\/myboutiq\.online[^"]*)"/g)){if(!existe(m[1]))cass.push(f+' → '+m[1]);}
  const ti=(h.match(/<title>([^<]*)<\/title>/)||[])[1]||'',de=(h.match(/<meta name="description" content="([^"]*)"/)||[])[1]||'';
  const ca=(h.match(/<link rel="canonical" href="([^"]*)"/)||[])[1]||'';
  const attendu='https://myboutiq.online/conseils'+(f==='index.html'?'':'/'+f.replace('.html',''));
  if(ti&&de&&ca===attendu&&(h.match(/<h1>/g)||[]).length===1)meta++;else console.log('   ↳ méta '+f,ti.length,de.length,ca);
  titres.add(ti);descs.add(de);
}
t(cass.length===0,`aucun lien ni image cassé dans les ${pages.length} pages`+(cass.length?' : '+cass.join(' | '):''));
t(meta===pages.length,`titre, description, adresse canonique et un seul H1 sur chaque page (${meta}/${pages.length})`);
t(titres.size===pages.length&&descs.size===pages.length,'aucun titre ni description en double (Google les traiterait comme la même page)');
t(ld>=pages.length,`données structurées valides (${ld} blocs JSON-LD)`);
// Le plan du site : chaque guide y est, et chaque entrée existe.
const sm=fs.readFileSync(R+'sitemap.xml','utf8');const locs=[...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m=>m[1]);
const manque=pages.map(f=>'https://myboutiq.online/conseils'+(f==='index.html'?'':'/'+f.replace('.html',''))).filter(u=>!locs.includes(u));
t(manque.length===0&&locs.every(u=>existe(u)||/\/bar$/.test(u)),'plan du site : tous les guides, aucune entrée morte'+(manque.length?' — manque '+manque.join(', '):''));
// Le sommaire mène à chaque guide.
const hub=fs.readFileSync(R+'conseils/index.html','utf8');
const sansLien=pages.filter(f=>f!=='index.html'&&!hub.includes('/conseils/'+f.replace('.html','')+'"'));
t(sansLien.length===0,'le sommaire mène à tous les guides'+(sansLien.length?' — manque '+sansLien.join(', '):''));
// Aucun guide orphelin : chacun est lié depuis au moins une AUTRE page.
const tout=pages.map(f=>[f,fs.readFileSync(R+'conseils/'+f,'utf8')]).concat([['accueil',fs.readFileSync(R+'index.html','utf8')]]);
const orph=pages.filter(f=>f!=='index.html').filter(f=>!tout.some(([g,h])=>g!==f&&h.includes('/conseils/'+f.replace('.html','')+'"')));
t(orph.length===0,'aucun guide orphelin'+(orph.length?' : '+orph.join(', '):''));
const acc=fs.readFileSync(R+'index.html','utf8');
t(acc.includes('href="/conseils"'),'la page d\'accueil mène au sommaire des guides');

// Au téléphone : 360 px, rien ne dépasse, rien n'est coupé.
const {s,port}=await serveur();const b=await chromium.launch();
let lisibles=0;
for(const f of pages){
  const p=await b.newPage({viewport:{width:360,height:740}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**',r=>r.request().url().includes('127.0.0.1')?r.continue():r.abort());
  await p.goto(`http://127.0.0.1:${port}/conseils/${f}`);await p.waitForTimeout(250);
  const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,
    imgs:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length,
    h1:document.querySelector('h1').getBoundingClientRect().width}));
  if(r.sw<=r.iw&&r.imgs===0&&errs.length===0)lisibles++;else console.log('   ↳ '+f+' '+JSON.stringify(r)+' '+errs.join('|'));
  await p.close();
}
t(lisibles===pages.length,`à 360 px : pas de défilement de côté, toutes les images chargent, aucune erreur (${lisibles}/${pages.length})`);
await b.close();s.close();
console.log(ko?('ÉCHECS '+ko):('t155 : '+ok+' vérifications'));process.exit(ko?1:0);
