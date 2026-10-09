// t153 — LES NOTIFICATIONS PUSH : L'APP FERMÉE, LE TÉLÉPHONE SONNE QUAND MÊME.
//
// « Y a-t-il une possibilité de notifier les utilisateurs ? Automatiquement,
// sans être en[ligne]. » Le serveur (fonction `notifier`, tâche de 9 h) est
// vérifié à part (t153a chiffrement RFC 8291, t153b la fonction). Ici : le
// téléphone — qui s'inscrit, quand on demande, ce qu'on montre.
import { chromium, serveur, RACINE } from './lib.mjs';
let ok=0,ko=0;
const t=(c,m)=>{ if(c){ok++;console.log('✅',m);} else {ko++;console.log('❌',m);} };
const {s,port}=await serveur();
const b=await chromium.launch();
const CLE='BE6qe-BGEilyRGfrpz2YJdIgSqpqgL6cC-TtP59muLfY1GLkHOzgSyzpj98m8l-OxLaWNE8nGNlWp11ikemlHc8';
const neuve=(x)=>Object.assign({cfg:{lang:'fr',nom:'Chez Awa',tel:'+237699000111',pin:'908172',s:'FCFA',d:'XAF',secteur:'boutique',code:'AWAA0001',plan:'gratuit',notifAsked:false,notifOk:false,
  pays:{cc:'237',nm:'Cameroun',fl:'🇨🇲',s:'FCFA',d:'XAF'}},articles:[],boutiques:[{id:1,nm:'Chez Awa',code:'AWAA0001',secteur:'boutique',actif:true,ventes:0}],
  boutiqueCourante:0,clients:[],equipe:[{id:1,nm:'Awa',role:'patron',bg:'#FFF',tc:'#000',actif:true}],fournisseurs:[],ventes:[],depenses:[],
  objectif:0,fondsDepart:0,nextId:2000,journal:[],stats:{}},x||{});

// Le faux téléphone : permission, worker, service de push, serveur.
function faux(opts){
  const o=Object.assign({perm:'default',reponse:'granted',swPush:true},opts||{});
  window.__j={demandes:0,subscribe:[],unsub:0,rpc:[],invoke:[]};
  let perm=o.perm;
  Object.defineProperty(Notification,'permission',{configurable:true,get:()=>perm});
  Notification.requestPermission=async()=>{window.__j.demandes++;perm=o.reponse;return perm;};
  let abo=null;
  const mkAbo=(k)=>({endpoint:'https://fcm.googleapis.com/fcm/send/TEL-'+Math.random().toString(36).slice(2,8),
    options:{applicationServerKey:k},
    toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'B'+'x'.repeat(86),auth:'a'.repeat(22)}};},
    async unsubscribe(){window.__j.unsub++;abo=null;return true;}});
  const reg={active:{postMessage(m,ports){if(o.swPush&&m&&m.type==='CAPACITES')setTimeout(()=>ports[0].postMessage({push:1}),10);}},
    pushManager:{async getSubscription(){return abo;},
      async subscribe(x){window.__j.subscribe.push(x);abo=mkAbo(x.applicationServerKey.buffer||x.applicationServerKey);return abo;}}};
  Object.defineProperty(navigator.serviceWorker,'ready',{configurable:true,get:()=>Promise.resolve(reg)});
  window.__fauxSupa={
    rpc:async(n,a)=>{window.__j.rpc.push([n,a]);
      if(n==='notif_cle_publique')return {data:window.__CLE,error:null};
      if(n==='notif_stats')return {data:{telephones:12,comptes:9,envois_7j:30,recus_7j:27,ouverts_7j:11},error:null};
      return {data:{ok:true},error:null};},
    auth:{getUser:async()=>({data:{user:{id:'U-AWA'}}}),getSession:async()=>({data:{session:null}})},
    functions:{invoke:async(n,x)=>{window.__j.invoke.push([n,x.body]);return {data:x.body.action==='essai'?{ok:true,appareils:1,recus:1}:{ok:true,comptes:9,envoyes:9,recus:8},error:null};}},
    // Tout le reste de l'app parle aussi au serveur : une chaîne qui répond « rien ».
    from:()=>{const ch=new Proxy(function(){},{get:(t,k)=>k==='then'?(r=>r({data:[],error:null})):(()=>ch),apply:()=>ch});return ch;},
    channel:()=>{const ch=new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:(()=>ch),apply:()=>ch});return ch;},
    removeChannel:()=>{},
  };
  window.__toasts=[];
  document.addEventListener('DOMContentLoaded',()=>{const v=window.showToast;if(v)window.showToast=function(m){window.__toasts.push(String(m));return v.apply(this,arguments);};});
}
async function ouvrir(B,opts,av){
  const ctx=await b.newContext({viewport:{width:360,height:740},locale:'fr-FR',timezoneId:'Africa/Douala'});
  // Avant tout script de la page : la permission et le worker sont faux dès le départ.
  await ctx.addInitScript({content:`window.__CLE=${JSON.stringify(CLE)};(${faux.toString()})(${JSON.stringify(opts||{})});`});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));
  await p.route('**', r=>r.request().url().includes('127.0.0.1:'+port)?r.continue():r.abort());
  await p.goto(`http://127.0.0.1:${port}/index.html`);
  await p.evaluate(([B,av])=>{localStorage.setItem('myboutiq_v6',JSON.stringify(B));
    localStorage.setItem('myboutiq_entree',JSON.stringify({role:'patron',tel:'+237699000111',code:'AWAA0001',nom:'Chez Awa',boutiques:[{code:'AWAA0001',nm:'Chez Awa'}]}));
    if(av)for(const k in av)localStorage.setItem(k,av[k]);},[B,av||null]);
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(2300);
  await p.evaluate(()=>{supa=window.__fauxSupa;window.parler=()=>{};try{role='patron';_ouvrirCaissePatron();}catch(e){try{lancerApp();}catch(x){}}});
  await p.waitForTimeout(2200);
  return {ctx,p,errs};
}
const J=p=>p.evaluate(()=>JSON.parse(JSON.stringify(window.__j)));
const abonnes=j=>j.rpc.filter(r=>r[0]==='notif_abonner');

// ── 1) IL A DÉJÀ DIT OUI : INSCRIT SANS UN MOT ─────────────────────────
{
  const {ctx,p,errs}=await ouvrir(neuve({articles:[{id:1,nm:'Riz',px:500,pa:400,stk:10,rt:1,al:0}]}),{perm:'granted'});
  const j=await J(p);
  const ab=abonnes(j);
  t(j.demandes===0, 'aucune question posée au démarrage');
  t(j.subscribe.length===1&&j.subscribe[0].userVisibleOnly===true, 'le téléphone prend son adresse de livraison, une fois');
  t(ab.length===1&&/^https:\/\/fcm\.googleapis\.com\//.test(ab[0][1].p_endpoint)&&ab[0][1].p_auth.length===22&&ab[0][1].p_langue==='fr',
    'et la confie au serveur (adresse Google, clés, langue)');
  const k=await p.evaluate(()=>{const a=window.__j.subscribe[0].applicationServerKey;return _octetsB64u(a);});
  t(k===CLE, 'avec la clé publique du serveur, à l\'octet près');
  // Rouvert le lendemain : pas de nouvel appel (une fois par semaine suffit).
  await p.evaluate(()=>_pushSynchro()); await p.waitForTimeout(300);
  t(abonnes(await J(p)).length===1, 'rouverte : rien de renvoyé au serveur avant 7 jours');
  const row=await p.evaluate(()=>({vu:getComputedStyle(document.getElementById('row-push')).display!=='none',s:document.getElementById('st-push-s').textContent}));
  t(row.vu&&/Activées/.test(row.s), `Réglages › Notifications : « ${row.s} »`);
  // Tester : envoie VRAIMENT par le serveur, sur ses propres téléphones.
  await p.evaluate(()=>pushTester()); await p.waitForTimeout(500);
  const j2=await J(p);
  t(j2.invoke.length===1&&j2.invoke[0][0]==='notifier'&&j2.invoke[0][1].action==='essai', '« Tester » demande au serveur une vraie notification d\'essai');
  // Couper.
  await p.evaluate(()=>pushCouper()); await p.waitForTimeout(400);
  const j3=await J(p);
  t(j3.unsub===1&&j3.rpc.some(r=>r[0]==='notif_desabonner'), 'Couper : l\'adresse est détruite ET retirée du serveur');
  await p.evaluate(()=>_pushSynchro()); await p.waitForTimeout(300);
  t((await J(p)).subscribe.length===1, 'coupées, elles le restent : pas de réinscription en douce');
  t(errs.length===0,'aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
  await ctx.close();
}

// ── 2) JAMAIS DEMANDÉ : ON DEMANDE QUAND IL S'EN VA SANS AVOIR FINI ────
{
  const {ctx,p,errs}=await ouvrir(neuve(),{perm:'default',reponse:'granted'});
  const r=await p.evaluate(()=>({lien:[...document.querySelectorAll('#pgrid button')].find(x=>/Rappelle-moi demain/.test(x.textContent)),
     row:document.getElementById('st-push-s').textContent}));
  const j=await J(p);
  t(j.demandes===0&&j.subscribe.length===0, '⚠️⚠️ plus de question système à l\'aveugle au premier lancement (21 oui sur 48)');
  const lien=await p.evaluate(()=>{const x=[...document.querySelectorAll('#pgrid button')].find(x=>/Rappelle-moi demain/.test(x.textContent));
    if(!x)return null;const rr=x.getBoundingClientRect();return {h:Math.round(rr.height),txt:x.textContent.trim()};});
  t(lien&&lien.h>=44, `boutique vide : « ${lien&&lien.txt} » (${lien&&lien.h} px)`);
  t(/Désactivées/.test(r.row), 'Réglages : « Désactivées — touche pour activer »');
  await p.evaluate(()=>{[...document.querySelectorAll('#pgrid button')].find(x=>/Rappelle-moi demain/.test(x.textContent)).click();});
  await p.waitForTimeout(900);
  const j2=await J(p);
  const toast=await p.evaluate(()=>(window.__toasts||[]).filter(x=>/🔔/.test(x)).join(' / '));
  t(j2.demandes===1&&abonnes(j2).length===1, 'une tape : la question système, puis l\'inscription');
  t(/demain matin/.test(toast), `il sait ce qui va se passer : « ${toast.trim()} »`);
  const encore=await p.evaluate(()=>!![...document.querySelectorAll('#pgrid button')].find(x=>/Rappelle-moi demain/.test(x.textContent)));
  t(!encore, 'le lien disparaît une fois la réponse donnée');
  t(errs.length===0,'aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
  await ctx.close();
}

// ── 3) LA CARTE DES 3 PAS : MÊME PROPOSITION ─────────────────────────
{
  const {ctx,p}=await ouvrir(neuve({articles:[{id:1,nm:'Riz',px:500,pa:400,stk:10,rt:1,al:0}]}),{perm:'default',reponse:'denied'});
  const c=await p.evaluate(()=>document.getElementById('demarrage').textContent);
  t(/Rappelle-moi demain/.test(c), 'articles posés, pas encore vendu : la carte des 3 pas propose aussi le rappel');
  await p.evaluate(()=>{[...document.querySelectorAll('#demarrage button')].find(x=>/Rappelle-moi demain/.test(x.textContent)).click();});
  await p.waitForTimeout(700);
  const j=await J(p);
  const st=await p.evaluate(()=>({s:document.getElementById('st-push-s').textContent,carte:document.getElementById('demarrage').textContent}));
  t(abonnes(j).length===0&&/Bloquées/.test(st.s), `il refuse : rien d'inscrit, Réglages dit « ${st.s} »`);
  t(!/Rappelle-moi demain/.test(st.carte), 'et on ne repose plus la question');
  await p.evaluate(()=>ouvrirNotifs()); await p.waitForTimeout(200);
  const f=await p.evaluate(()=>document.getElementById('push-corps').textContent);
  t(/Réglages du téléphone/.test(f)&&!/Activer les notifications/.test(f), 'bloquées : la feuille dit OÙ les rouvrir, sans faux bouton');
  await ctx.close();
}

// ── 4) L'ANCIEN WORKER ATTEND « RECHARGER » : ON N'INSCRIT PAS ENCORE ──
{
  const {ctx,p}=await ouvrir(neuve({articles:[{id:1,nm:'Riz',px:500,pa:400,stk:10,rt:1,al:0}]}),{perm:'granted',swPush:false});
  await p.waitForTimeout(1800);
  const j=await J(p);
  t(j.subscribe.length===0&&abonnes(j).length===0, '⚠️ worker d\'avant la 22.90 : pas d\'inscription (Chrome aurait affiché « site mis à jour en arrière-plan »)');
  await ctx.close();
}

// ── 5) VENDEUR ET BOUTIQUE D'EXEMPLE : RIEN ───────────────────────────
{
  const {ctx,p}=await ouvrir(neuve({articles:[{id:1,nm:'Riz',px:500,pa:400,stk:10,rt:1,al:0}]}),{perm:'granted'});
  await p.evaluate(()=>{window.__j.subscribe=[];window.__j.rpc=[];localStorage.removeItem('mb_push');role='vendeur';});
  await p.evaluate(()=>{const x=navigator.serviceWorker;});
  const r=await p.evaluate(async()=>{const a=await _pushSynchro(true);majLignePush();return {a,row:getComputedStyle(document.getElementById('row-push')).display};});
  t(r.a===false&&r.row==='none', 'vendeur : pas d\'inscription, pas de ligne (les rappels sont pour le patron)');
  const d=await p.evaluate(()=>{const v=estDemo;estDemo=()=>true;const r={p:_pushPossible(),l:_htmlRappelDemain()};estDemo=v;return r;});
  t(!d.p&&d.l==='', 'boutique d\'exemple : jamais de notification');
  await ctx.close();
}

// ── 6) L'ANNONCE, AUSSI EN NOTIFICATION ───────────────────────────────
{
  const {ctx,p}=await ouvrir(neuve({articles:[{id:1,nm:'Riz',px:500,pa:400,stk:10,rt:1,al:0}]}),{perm:'granted'});
  await p.evaluate(async()=>{verifierAdmin=async()=>true;await ouvrirEcrireAnnonce();});
  await p.waitForTimeout(400);
  const st=await p.evaluate(()=>({c:document.getElementById('ann-push').checked,s:document.getElementById('ann-push-stats').textContent}));
  t(st.c&&/12 téléphones inscrits/.test(st.s)&&/11 ouvertes/.test(st.s), `case cochée, et les chiffres : « ${st.s} »`);
  await p.evaluate(async()=>{document.getElementById('ann-titre').value='Merci';document.getElementById('ann-msg').value='Merci à tous';await publierAnnonce();});
  await p.waitForTimeout(500);
  let j=await J(p);
  const d=j.invoke.find(x=>x[1].action==='diffuser');
  t(d&&d[1].titre==='Merci'&&d[1].message==='Merci à tous'&&/^a[a-z0-9]+$/.test(d[1].ref), 'publiée : partie aussi en notification (titre, message, référence anti-doublon)');
  await p.evaluate(async()=>{window.__j.invoke=[];selAnnCible('vendeur',document.getElementById('ann-c-vendeur'));
    document.getElementById('ann-titre').value='V';document.getElementById('ann-msg').value='Pour les vendeurs';await publierAnnonce();});
  await p.waitForTimeout(400);
  j=await J(p);
  t(!j.invoke.some(x=>x[1].action==='diffuser'), 'une annonce « vendeurs » reste dans l\'app (les inscrits sont des patrons)');
  await ctx.close();
}

// ── 7) LE VRAI WORKER : IL MONTRE LE MESSAGE ──────────────────────────
{
  const ctx=await b.newContext({viewport:{width:360,height:740}});
  await ctx.grantPermissions(['notifications'],{origin:`http://127.0.0.1:${port}`});
  const p=await ctx.newPage();
  await p.route('**', r=>r.request().url().includes('127.0.0.1:'+port)?r.continue():r.abort());
  await p.goto(`http://127.0.0.1:${port}/index.html`);
  // Le worker s'installe, prend la main, la page peut se recharger : on attend que tout soit posé.
  for(let i=0;i<20;i++){await p.waitForTimeout(500);try{if(await p.evaluate(()=>!!navigator.serviceWorker.controller))break;}catch(e){}}
  await p.waitForTimeout(1500);
  const pret=await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return !!r.active;});
  const cap=await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return await new Promise(ok=>{const ch=new MessageChannel();ch.port1.onmessage=e=>ok(e.data);r.active.postMessage({type:'CAPACITES'},[ch.port2]);setTimeout(()=>ok(null),2000);});});
  t(pret&&cap&&cap.push===1, 'le worker 22.90 répond « je sais montrer une notification »');
  // Chromium sans écran refuse toute permission de notification : on regarde
  // donc CE QUE le worker demande d'afficher, de l'intérieur du worker.
  const sw=ctx.serviceWorkers()[0];
  const n=await sw.evaluate(async()=>{
    const vus=[];self.registration.showNotification=(t,o)=>{vus.push({t,o});return Promise.resolve();};
    const pousser=d=>{const ev=new PushEvent('push',{data:d});self.dispatchEvent(ev);};
    pousser(JSON.stringify({t:'🏪 Chez Awa t\'attend',b:'Ajoute ton premier article : une minute suffit.',u:'/index.html',g:'mb-vide',j:'0f8c7c1e-0000-4000-8000-000000000001'}));
    pousser('texte brut, pas du JSON');
    await new Promise(r=>setTimeout(r,300));
    return vus.map(x=>({t:x.t,b:x.o.body,tag:x.o.tag,icon:x.o.icon,badge:x.o.badge,d:x.o.data}));
  });
  console.log('   ↳ '+JSON.stringify(n));
  t(n.length===2&&n[0].t==='🏪 Chez Awa t\'attend'&&/premier article/.test(n[0].b)&&n[0].tag==='mb-vide', 'un message poussé s\'affiche : titre, texte, étiquette');
  t(/icon-192\.png$/.test(n[0].icon)&&/badge-96\.png$/.test(n[0].badge)&&n[0].d.j&&n[0].d.u==='/index.html', 'avec l\'icône, la silhouette de barre d\'état, et le jeton « ouverte »');
  t(n[1].t==='MyBoutiQ'&&n[1].b==='texte brut, pas du JSON', 'un message mal formé s\'affiche quand même (titre MyBoutiQ), sans planter');
  await ctx.close();
}

await b.close(); s.close();
console.log(ko?('ÉCHECS '+ko):('t153 : '+ok+' vérifications'));
process.exit(ko?1:0);
