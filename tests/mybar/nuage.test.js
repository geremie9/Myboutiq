/* La sauvegarde en ligne : ce que le serveur voit (rien), ce que le patron récupère
   (tout), et ce qui arrive quand deux téléphones se croisent.

   Le serveur est simulé de DEUX façons, qui doivent répondre pareil :
   - par défaut, une copie en JavaScript du contrat des fonctions SQL ;
   - avec MYBAR_PG_DB=<base>, le VRAI PostgreSQL (migration appliquée sur une base jetable,
     PGHOST/PGPORT/PGUSER pour l'atteindre), appelé en tant que rôle « anon ».
   Aucune de ces deux voies ne touche un projet Supabase. Le navigateur, lui, n'atteint
   qu'un faux domaine, intercepté par Playwright. */
const crypto=require('crypto'),zlib=require('zlib'),{execFileSync}=require('child_process');
const {chromium,CHROME,URL}=require('./lib');

const SUPA='https://mybar-test.supabase.test';
const PG=process.env.MYBAR_PG_DB||'';

/* ── Le serveur ─────────────────────────────────────────────────── */
function serveurJS(){
  const lignes=new Map();
  const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
  const okId=t=>typeof t==='string'&&/^[A-Za-z0-9_-]{43}$/.test(t);
  return {
    nom:'JS (copie du contrat)',
    vider(){lignes.clear();},
    vue(){return [...lignes.entries()].map(([h,l])=>({id_hash:h,rev:l.rev,data:l.data,appareil:l.appareil}));},
    alterer(data){for(const l of lignes.values())l.data=data;},
    appeler(fn,a){
      if(!okId(a.p_id))return {ok:false,erreur:'identifiant'};
      const h=sha(a.p_id),l=lignes.get(h);
      if(fn==='bar_lire'){
        if(!l)return {ok:false,erreur:'absent'};
        return {ok:true,rev:l.rev,data:l.data,octets:l.data.length,maj:l.maj,appareil:l.appareil,build:l.build};
      }
      if(fn==='bar_effacer'){const n=lignes.delete(h)?1:0;return {ok:true,effacees:n};}
      if(fn==='bar_ecrire'){
        if(typeof a.p_data!=='string'||a.p_data.length<16)return {ok:false,erreur:'donnees'};
        if(a.p_data.length>4000000)return {ok:false,erreur:'trop_gros'};
        if(!l){lignes.set(h,{rev:1,data:a.p_data,appareil:(a.p_appareil||'').slice(0,40),build:(a.p_build||'').slice(0,20),maj:new Date().toISOString()});return {ok:true,rev:1};}
        if(l.rev!==(a.p_rev||0))return {ok:false,erreur:'conflit',rev:l.rev,maj:l.maj,appareil:l.appareil};
        l.rev++;l.data=a.p_data;l.appareil=(a.p_appareil||'').slice(0,40);l.build=(a.p_build||'').slice(0,20);l.maj=new Date().toISOString();
        return {ok:true,rev:l.rev};
      }
      return {ok:false,erreur:'fonction'};
    }
  };
}
function serveurPG(base){
  const psql=(sql)=>execFileSync('psql',['-qAt','-v','ON_ERROR_STOP=1','-d',base],{input:sql,encoding:'utf8',maxBuffer:64*1024*1024});
  const lit=s=>{if(s.includes('$q$'))throw new Error('litéral dangereux');return '$q$'+s+'$q$';};
  return {
    nom:'PostgreSQL réel ('+base+')',
    vider(){psql('truncate public.bar_sauvegardes;');},
    vue(){
      const t=psql("select coalesce(json_agg(json_build_object('id_hash',id_hash,'rev',rev,'data',data,'appareil',appareil)),'[]'::json) from public.bar_sauvegardes;").trim();
      return JSON.parse(t||'[]');
    },
    alterer(data){psql('update public.bar_sauvegardes set data='+lit(data)+';');},
    appeler(fn,a){
      const args=fn==='bar_ecrire'
        ?lit(a.p_id)+','+(+a.p_rev||0)+','+lit(a.p_data)+','+(a.p_appareil==null?'null':lit(a.p_appareil))+','+(a.p_build==null?'null':lit(a.p_build))
        :lit(a.p_id);
      const sortie=psql('set role anon;\nselect public.'+fn+'('+args+');').trim().split('\n').pop();
      return JSON.parse(sortie);
    }
  };
}

(async()=>{
 const serveur=PG?serveurPG(PG):serveurJS();
 console.log('    serveur : '+serveur.nom);
 const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
 const errs=[];
 const step=async(n,fn)=>{try{await fn();console.log('OK  '+n);}catch(e){console.log('KO  '+n+' -> '+e.message);errs.push(n);}};
 const verifie=(c,m)=>{if(!c)throw new Error(m);};

 /* Ce que voit le réseau : chaque appel, et un interrupteur pour le couper. */
 const appels=[];let coupe=false;
 const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'};
 const brancher=async(ctx)=>{
   await ctx.addInitScript(()=>{window.MYBAR_SUPA={url:'https://mybar-test.supabase.test',key:'sb_publishable_test'};});
   await ctx.route(SUPA+'/**',async route=>{
     const rq=route.request();
     if(rq.method()==='OPTIONS'){await route.fulfill({status:204,headers:CORS});return;}
     if(coupe){await route.abort('connectionfailed');return;}
     const fn=rq.url().split('/rpc/')[1],args=JSON.parse(rq.postData()||'{}');
     appels.push({fn,args,taille:(rq.postData()||'').length,entetes:rq.headers(),url:rq.url()});
     const rep=serveur.appeler(fn,args);
     await route.fulfill({status:200,headers:{...CORS,'content-type':'application/json'},body:JSON.stringify(rep)});
   });
 };
 const telephone=async({configure=true}={})=>{
   const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'fr-FR'});
   if(configure)await brancher(ctx);
   const p=await ctx.newPage();
   const dialogues=[];
   p.on('dialog',d=>{dialogues.push({type:d.type(),msg:d.message()});d.accept(d.type()==='prompt'?'4321':undefined);});
   p.on('pageerror',e=>{console.log('KO  erreur de page -> '+e.message);errs.push('pageerror');});
   await p.goto(URL);await p.waitForTimeout(1200);
   return {ctx,p,dialogues};
 };
 const creerBar=async(p,nom)=>{
   await p.click('text=Ouvrir mon bar');await p.waitForSelector('#s-onboard.on');
   await p.click('#ob-pays-lst .pays-it >> nth=0');await p.click('#obs1 .btn-ob');
   await p.click('#ob-type-grid .sec-btn >> nth=0');await p.click('#obs2 .btn-ob');
   await p.fill('#ob-nom',nom);await p.fill('#ob-tel','690112233');await p.click('#obs3 .btn-ob');
   await p.fill('#ob-pin','1234');await p.fill('#ob-pin2','1234');
   await p.click('text=🍻 Ouvrir mon bar');await p.waitForSelector('#s-service.on',{timeout:8000});
 };
 const remplir=(p,nb)=>p.evaluate(nb=>{
   const pr=DB.produits[0];
   for(let i=0;i<nb;i++){
     const ts=Date.now()-Math.floor(i/nb*20*86400000)-3600000;
     DB.ventes.push({id:uid(),ts:ts,jour:jour(ts),tableId:1,tableNm:'Table 1',zone:'Salle',srv:1,srvNm:'P',
       lignes:[{pid:pr.id,nm:pr.nm,e:pr.e,q:2,pu:1000,pa:650}],remise:0,total:2000,cout:1300,pourboire:0,mode:'espece',client:null,clientNm:'',vides:2,ouvert:ts,duree:600000});
   }
   save();
 },nb);
 const vendre=(p)=>p.evaluate(()=>{
   const pr=DB.produits[0],ts=Date.now();
   DB.ventes.push({id:uid(),ts:ts,jour:jour(ts),tableId:1,tableNm:'Table 1',zone:'Salle',srv:1,srvNm:'P',
     lignes:[{pid:pr.id,nm:pr.nm,e:pr.e,q:1,pu:1000,pa:650}],remise:0,total:1000,cout:650,pourboire:0,mode:'espece',client:null,clientNm:'',vides:1,ouvert:ts,duree:60000});
   save();return DB.ventes.length;
 });
 const etat=p=>p.evaluate(()=>nuageEtat());
 const libre=async p=>{await p.waitForTimeout(150);await p.waitForFunction(()=>!window.nuageEnCours,null,{timeout:20000});};
 const vieillir=(p,min)=>p.evaluate(m=>{nuagePoser({maj:now()-m*60000-1000,essai:now()-m*60000-1000});},min);
 const nb=()=>appels.filter(a=>a.fn==='bar_ecrire').length;
 const ouvrirParametres=async p=>{await p.evaluate(()=>goSt());await p.waitForSelector('#s-settings.on');};

 /* Le déchiffrement « de l'extérieur », avec le seul Node : le format est un contrat, pas un accident de ce navigateur. */
 const hkdf=(cle,info,n)=>Buffer.from(crypto.hkdfSync('sha256',Buffer.from(cle),Buffer.from('mybar-sauvegarde-v1'),Buffer.from(info),n));
 const idDe=cle=>hkdf(cle,'identifiant',32).toString('base64url');
 const lireDehors=(cle,data)=>{
   const e=JSON.parse(data),ct=Buffer.from(e.ct,'base64'),cle2=hkdf(cle,'chiffrement',32);
   const d=crypto.createDecipheriv('aes-256-gcm',cle2,Buffer.from(e.iv,'base64'));
   d.setAuthTag(ct.subarray(ct.length-16));
   let u=Buffer.concat([d.update(ct.subarray(0,ct.length-16)),d.final()]);
   if(e.z)u=zlib.gunzipSync(u);
   return JSON.parse(u.toString('utf8'));
 };

 // ── 0. Sans projet configuré, la fonction n'existe pas — et rien ne sort ──
 {
  const {ctx,p}=await telephone({configure:false});
  const sortants=[];p.on('request',r=>{if(/supabase/.test(r.url()))sortants.push(r.url());});
  await creerBar(p,'Bar Sans Nuage');
  await step('sans configuration : pas de carte, pas de bouton de clé, aucun appel',async()=>{
    verifie(!await p.evaluate(()=>nuageDispo()),'nuageDispo() vrai sans configuration');
    await ouvrirParametres(p);
    const t=await p.textContent('#s-settings');
    verifie(!/Sauvegarde en ligne/.test(t),'la carte apparaît sans serveur');
    await p.evaluate(()=>{save();nuageTic();goScreen('s-vitrine');ouvrirRetrouver();});
    const m=await p.textContent('#ovb');
    verifie(/fichier de sauvegarde/.test(m),'plus de restauration par fichier');
    verifie(!/clé de sauvegarde/.test(m),'l’option « clé » est proposée sans serveur');
    verifie(sortants.length===0,'requête vers un serveur : '+sortants[0]);
  });
  await ctx.close();
 }

 // ── 1. Activer, ce que le serveur voit, ce qu'on peut lire dehors ──
 serveur.vider();
 const A=await telephone();
 const pA=A.p;
 await creerBar(pA,'Bar Nuage');
 let CLE='';
 await pA.evaluate(()=>{
   DB.produits[0].nm='Zéphyr-Secret-Brune';
   DB.clients.push({id:uid(),nm:'Tonton Confidentiel',tel:'237699887766',ardoise:4500,total:12000,visites:3,derniere:Date.now()});
   save();
 });
 await remplir(pA,40);

 await step('la carte est proposée au patron, avec le prix en données et le risque de perte de clé',async()=>{
   await ouvrirParametres(pA);
   const t=await pA.textContent('#s-settings');
   verifie(/Sauvegarde en ligne/.test(t),'carte absente');
   verifie(/Activer la sauvegarde en ligne/.test(t),'bouton absent');
   verifie(/30 minutes/.test(t)&&/données mobiles/.test(t),'le coût en données n’est pas dit');
 });
 await step('« Activer » montre une clé de 20 symboles et n’envoie RIEN avant confirmation',async()=>{
   await pA.evaluate(()=>activerNuage());
   const aff=(await pA.textContent('#nu-cle-aff')).trim();
   verifie(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/.test(aff),'forme de la clé : '+aff);
   const m=await pA.textContent('#ovb');
   verifie(/SEULE façon/.test(m)&&/perdue, la sauvegarde est perdue/.test(m),'l’avertissement de perte de clé manque');
   verifie(appels.length===0,'un appel est parti avant confirmation');
   await pA.evaluate(()=>fermerModal());
   verifie(!(await etat(pA)).cle,'la clé a été retenue après « Annuler »');
   verifie(appels.length===0,'un appel après annulation');
 });
 await step('confirmer envoie la première copie : révision 1, à jour',async()=>{
   await pA.evaluate(()=>activerNuage());
   CLE=(await pA.textContent('#nu-cle-aff')).trim().replace(/-/g,'');
   await pA.click('button:has-text("J\'ai noté ma clé")');
   await pA.waitForFunction(()=>nuageEtat().rev>=1,null,{timeout:15000});
   const e=await etat(pA);
   verifie(e.cle===CLE,'la clé locale n’est pas celle affichée');
   verifie(e.rev===1&&e.sale===0&&!e.erreur,'état : '+JSON.stringify(e));
   verifie(nb()===1,nb()+' envois au lieu d’un');
   await ouvrirParametres(pA);
   verifie(/à jour/.test(await pA.textContent('#s-settings')),'la carte ne dit pas « à jour »');
 });
 await step('le serveur ne reçoit ni texte clair, ni la clé, ni les codes — et range un HACHAGE',async()=>{
   const envoi=appels.find(a=>a.fn==='bar_ecrire');
   const brut=JSON.stringify(envoi.args)+JSON.stringify(envoi.entetes);
   for(const secret of ['Zéphyr','Confidentiel','237699887766','Bar Nuage','Table 1'])
     verifie(!brut.includes(secret),'« '+secret+' » part en clair');
   verifie(!brut.includes(CLE)&&!brut.toLowerCase().includes(CLE.toLowerCase()),'la clé part vers le serveur');
   verifie(envoi.args.p_id.length===43&&envoi.args.p_id!==CLE,'identifiant : '+envoi.args.p_id);
   verifie(envoi.args.p_id===idDe(CLE),'l’identifiant n’est pas la dérivation documentée');
   const env=JSON.parse(envoi.args.p_data);
   verifie(env.v===1&&env.iv&&env.ct,'enveloppe : '+Object.keys(env));
   verifie(/^[A-Za-z0-9+/=]+$/.test(env.ct),'texte chiffré non base64');
   const vue=serveur.vue();
   verifie(vue.length===1,vue.length+' lignes côté serveur');
   const rangee=JSON.stringify(vue);
   verifie(!rangee.includes(envoi.args.p_id),'l’identifiant brut est rangé tel quel');
   verifie(vue[0].id_hash===crypto.createHash('sha256').update(envoi.args.p_id).digest('hex'),'ce n’est pas le SHA-256 de l’identifiant');
   verifie(envoi.entetes['apikey']==='sb_publishable_test'&&!/service_role/i.test(JSON.stringify(envoi.entetes)),'clé d’API inattendue');
 });
 await step('hors du navigateur, la clé seule suffit à tout relire — sans les codes',async()=>{
   const vue=serveur.vue(),d=lireDehors(CLE,vue[0].data);
   verifie(d.cfg.nom==='Bar Nuage','nom : '+d.cfg.nom);
   verifie(d.produits[0].nm==='Zéphyr-Secret-Brune','produit : '+d.produits[0].nm);
   verifie(d.ventes.length===40,d.ventes.length+' ventes');
   verifie(d.clients.some(c=>c.nm==='Tonton Confidentiel'&&c.ardoise===4500),'l’ardoise manque');
   verifie(d.cfg.pin===undefined&&d.equipe.every(m=>m.pin===undefined),'des codes voyagent');
   const mauvaise=CLE.slice(0,19)+(CLE[19]==='0'?'1':'0');
   let refuse=false;try{lireDehors(mauvaise,vue[0].data);}catch(e){refuse=true;}
   verifie(refuse,'une clé fausse déchiffre');
 });
 await step('la clé n’entre ni dans la base ni dans le fichier de sauvegarde',async()=>{
   const r=await pA.evaluate(c=>({base:JSON.stringify(DB).includes(c),fichier:JSON.stringify(copieSansCodes()).includes(c)}),CLE);
   verifie(!r.base&&!r.fichier,'la clé est dans '+JSON.stringify(r));
 });

 // ── 2. Le rythme : pas à chaque touche, pas sans changement, pas sans données ──
 await step('save() lève un drapeau mais n’envoie pas',async()=>{
   const avant=nb();
   await vendre(pA);
   verifie((await etat(pA)).sale===1,'le drapeau n’est pas levé');
   await pA.evaluate(()=>nuageTic());await libre(pA);
   verifie(nb()===avant,'envoi immédiat (dernier envoi il y a quelques secondes)');
   await vieillir(pA,15);await pA.evaluate(()=>nuageTic());await libre(pA);
   verifie(nb()===avant,'envoi 15 minutes après le précédent : le délai est de 30');
 });
 await step('passé 30 minutes, un seul envoi — puis plus rien tant que rien ne change',async()=>{
   const avant=nb();
   await vieillir(pA,31);await pA.evaluate(()=>nuageTic());await libre(pA);
   verifie(nb()===avant+1,(nb()-avant)+' envois');
   const e=await etat(pA);verifie(e.rev===2&&e.sale===0,'état : '+JSON.stringify(e));
   await vieillir(pA,500);await pA.evaluate(()=>nuageTic());await libre(pA);
   verifie(nb()===avant+1,'envoi sans changement');
 });
 await step('« économie de données » : aucun envoi automatique, l’envoi manuel reste possible',async()=>{
   await vendre(pA);await vieillir(pA,60);
   await pA.evaluate(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}));
   const avant=nb();
   await pA.evaluate(()=>nuageTic());await libre(pA);
   verifie(nb()===avant,'envoi malgré saveData');
   await pA.evaluate(()=>sauvegarderEnLigne({manuel:1}));await libre(pA);
   verifie(nb()===avant+1,'l’envoi manuel est bloqué');
   await pA.evaluate(()=>Object.defineProperty(navigator,'connection',{value:{saveData:false},configurable:true}));
 });
 await step('« envoi automatique » désactivé : rien ne part tout seul',async()=>{
   await vendre(pA);await vieillir(pA,60);
   await pA.evaluate(()=>nuagePoser({auto:0}));
   const avant=nb();
   await pA.evaluate(()=>nuageTic());await libre(pA);
   verifie(nb()===avant,'envoi malgré auto:0');
   await pA.evaluate(()=>nuagePoser({auto:1}));
 });
 await step('deux envois simultanés : un seul part',async()=>{
   await vendre(pA);
   const avant=nb();
   await pA.evaluate(()=>{sauvegarderEnLigne({manuel:1});sauvegarderEnLigne({manuel:1});sauvegarderEnLigne({manuel:1});});
   await libre(pA);
   verifie(nb()===avant+1,(nb()-avant)+' envois pour 3 déclenchements');
 });

 // ── 3. Pas de réseau : rien n'est perdu, et on réessaie sans harceler ──
 await step('réseau coupé : l’erreur est dite, le drapeau reste, l’app continue',async()=>{
   await vendre(pA);await vieillir(pA,40);
   coupe=true;
   const r=await pA.evaluate(()=>sauvegarderEnLigne({manuel:1}));
   verifie(r&&r.erreur==='reseau','retour : '+JSON.stringify(r));
   let e=await etat(pA);verifie(e.erreur==='reseau'&&e.sale===1,'état : '+JSON.stringify(e));
   const avant=nb();
   await pA.evaluate(()=>nuageTic());await libre(pA);
   verifie(nb()===avant,'nouvel essai sans attendre le délai de reprise');
   coupe=false;
   await pA.evaluate(()=>nuagePoser({essai:now()-11*60000,maj:now()-40*60000}));
   await pA.evaluate(()=>nuageTic());await libre(pA);
   e=await etat(pA);verifie(!e.erreur&&e.sale===0,'pas de reprise après retour du réseau : '+JSON.stringify(e));
 });
 await step('téléphone hors ligne : aucun appel tenté, le message le dit',async()=>{
   await vendre(pA);
   await A.ctx.setOffline(true);
   const avant=appels.length;
   const r=await pA.evaluate(()=>sauvegarderEnLigne({manuel:1}));
   await A.ctx.setOffline(false);
   verifie(r&&r.erreur==='reseau'&&appels.length===avant,'appel tenté hors ligne');
   verifie(/Pas de réseau/.test(await pA.textContent('#toast')),'le message manque');
   await pA.evaluate(()=>sauvegarderEnLigne({manuel:1}));await libre(pA);
 });

 // ── 4. Fin de service ──
 await step('la clôture envoie une copie (sauf en économie de données)',async()=>{
   await vendre(pA);
   const depart=nb();
   await pA.evaluate(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}));
   await pA.evaluate(()=>ouvrirCloture());await pA.click('button:has-text("Clôturer le service")');
   await pA.waitForTimeout(600);await libre(pA);
   const sans=nb();
   verifie(sans===depart,'la clôture envoie malgré l’économie de données');
   await pA.evaluate(()=>Object.defineProperty(navigator,'connection',{value:{saveData:false},configurable:true}));
   await vendre(pA);
   await pA.evaluate(()=>ouvrirCloture());await pA.click('button:has-text("Clôturer le service")');
   await pA.waitForTimeout(600);await libre(pA);
   verifie(nb()===sans+1,'envoi de clôture : '+(nb()-sans));
   verifie((await etat(pA)).sale===0,'la copie de clôture n’est pas à jour');
 });

 // ── 5. Retrouver son bar sur un téléphone neuf ──
 const B=await telephone();
 const pB=B.p;
 await step('téléphone neuf : la clé tapée en minuscules, sans tirets, avec des O pour des 0, retrouve le bar',async()=>{
   await pB.evaluate(()=>ouvrirRetrouver());
   await pB.click('button:has-text("Avec ma clé de sauvegarde")');
   const saisie=CLE.toLowerCase().replace(/0/g,'o').replace(/1/g,'l');
   await pB.fill('#nu-cle',saisie);
   await pB.click('button:has-text("Retrouver mon bar") >> nth=-1');
   await pB.waitForFunction(()=>window.DB&&DB.cfg&&DB.cfg.nom==='Bar Nuage',null,{timeout:15000});
   const r=await pB.evaluate(()=>({nom:DB.cfg.nom,prod:DB.produits[0].nm,ventes:DB.ventes.length,pin:DB.cfg.pin,
     patron:DB.equipe.filter(m=>m.role==='patron')[0].pin,moi:moi&&moi.role,nuage:nuageEtat()}));
   verifie(r.prod==='Zéphyr-Secret-Brune'&&r.ventes>40,'contenu : '+JSON.stringify(r));
   verifie(r.pin==='4321'&&r.patron==='4321','le code patron redemandé n’est pas appliqué : '+r.pin);
   verifie(r.moi==='patron','pas connecté en patron');
   verifie(r.nuage.cle===CLE&&r.nuage.rev===serveur.vue()[0].rev&&r.nuage.sale===0,'état en ligne : '+JSON.stringify(r.nuage));
   const conf=B.dialogues.find(d=>d.type==='confirm');
   verifie(conf&&/Bar Nuage/.test(conf.msg)&&/REMPLACÉ/.test(conf.msg)&&/Sauvegardée le/.test(conf.msg),'la confirmation ne dit pas ce qui est remplacé : '+(conf&&conf.msg));
   verifie(B.dialogues.some(d=>d.type==='prompt'),'le code patron n’est pas redemandé');
 });
 await step('la suite des sauvegardes continue sous la même clé, à la bonne révision',async()=>{
   const avant=serveur.vue()[0].rev;
   await vendre(pB);
   await pB.evaluate(()=>sauvegarderEnLigne({manuel:1}));await libre(pB);
   const e=await etat(pB);
   verifie(!e.erreur&&e.rev===avant+1,'état : '+JSON.stringify(e)+' (serveur à '+avant+')');
 });

 // ── 6. Deux téléphones, une clé : on ne choisit jamais à la place du patron ──
 await step('A est dépassé : l’envoi automatique n’écrase RIEN et n’ouvre pas de fenêtre',async()=>{
   await vendre(pA);
   const serveurAvant=serveur.vue()[0].data;
   await pA.evaluate(()=>{nuagePoser({maj:now()-60*60000,essai:now()-60*60000});return sauvegarderEnLigne({auto:1});});
   await libre(pA);
   const e=await etat(pA);
   verifie(e.erreur==='conflit'&&e.conf&&e.conf.rev>=3,'état : '+JSON.stringify(e));
   verifie(serveur.vue()[0].data===serveurAvant,'le serveur a été écrasé');
   verifie(!await pA.evaluate(()=>$('ov').classList.contains('on')),'une fenêtre s’est ouverte au milieu du service');
   const al=await pA.evaluate(()=>alertes().filter(a=>/plus récente/.test(a.txt)).map(a=>a.cls));
   verifie(al[0]==='rouge','pas d’alerte rouge : '+JSON.stringify(al));
   const avant=nb();
   await pA.evaluate(()=>{nuagePoser({maj:now()-9e6,essai:now()-9e6});nuageTic();});await libre(pA);
   verifie(nb()===avant,'l’appli réessaie en boucle malgré le conflit');
 });
 await step('le patron voit les deux versions et choisit : « reprendre » garde ses codes',async()=>{
   await pA.evaluate(()=>proposerConflitNuage(nuageEtat().conf));
   const m=await pA.textContent('#ovb');
   verifie(/Reprendre la version en ligne/.test(m)&&/Garder CE téléphone/.test(m)&&/Décider plus tard/.test(m),'les trois choix manquent');
   const ventesB=await pB.evaluate(()=>DB.ventes.length),ventesA=await pA.evaluate(()=>DB.ventes.length);
   verifie(ventesA!==ventesB||true,'');
   const prompts=A.dialogues.filter(d=>d.type==='prompt').length;
   await pA.click('button:has-text("Reprendre la version en ligne")');
   await pA.waitForFunction(n=>DB.ventes.length===n&&!nuageEtat().erreur,ventesB,{timeout:15000});
   const r=await pA.evaluate(()=>({pin:DB.cfg.pin,rev:nuageEtat().rev,conf:nuageEtat().conf}));
   verifie(r.pin==='1234','le code patron local a été perdu : '+r.pin);
   verifie(A.dialogues.filter(d=>d.type==='prompt').length===prompts,'le code est redemandé sur le MÊME téléphone');
   verifie(r.rev===serveur.vue()[0].rev&&!r.conf,'état : '+JSON.stringify(r));
 });
 await step('« garder CE téléphone » écrase la version en ligne — et c’est alors B qui est dépassé',async()=>{
   await vendre(pB);await pB.evaluate(()=>sauvegarderEnLigne({manuel:1}));await libre(pB);       // B prend de l'avance
   await vendre(pA);await vendre(pA);
   const ventesA=await pA.evaluate(()=>DB.ventes.length);
   await pA.evaluate(()=>sauvegarderEnLigne({manuel:1}));await libre(pA);
   verifie((await etat(pA)).erreur==='conflit','pas de conflit');
   verifie(await pA.evaluate(()=>$('ov').classList.contains('on')),'un envoi manuel doit ouvrir la fenêtre de choix');
   await pA.click('button:has-text("Garder CE téléphone")');
   await pA.waitForFunction(()=>nuageEtat().erreur===''&&!nuageEtat().conf,null,{timeout:15000});await libre(pA);
   const d=lireDehors(CLE,serveur.vue()[0].data);
   verifie(d.ventes.length===ventesA,'le serveur a '+d.ventes.length+' ventes au lieu de '+ventesA);
   await vendre(pB);
   await pB.evaluate(()=>sauvegarderEnLigne({auto:1}));await libre(pB);
   verifie((await etat(pB)).erreur==='conflit','B n’est pas dit dépassé');
   await pB.evaluate(()=>nuagePoser({erreur:'',conf:null,rev:nuageEtat().conf?nuageEtat().conf.rev:0}));
 });

 // ── 7. Ce qui peut mal tourner à la restauration ──
 await step('clé mal formée ou inconnue : message clair, rien n’est remplacé',async()=>{
   const avant=await pB.evaluate(()=>JSON.stringify(DB).length);
   await pB.evaluate(()=>restaurerDepuisNuage('1234-5678'));
   verifie(/bonne forme/.test(await pB.textContent('#toast')),'forme non signalée');
   const inconnue=idDe('0000000000000000000A')===idDe(CLE)?'0000000000000000000B':'0000000000000000000A';
   await pB.evaluate(c=>restaurerDepuisNuage(c),inconnue);
   await pB.waitForFunction(()=>/Aucune sauvegarde/.test($('toast').textContent),null,{timeout:8000});
   verifie(await pB.evaluate(()=>JSON.stringify(DB).length)===avant,'la base a changé');
 });
 await step('copie altérée en ligne : refusée à la lecture (AES-GCM), la base locale reste intacte',async()=>{
   const vue=serveur.vue()[0],env=JSON.parse(vue.data);
   const ct=Buffer.from(env.ct,'base64');ct[ct.length>>1]^=0xff;
   serveur.alterer(JSON.stringify({...env,ct:ct.toString('base64')}));
   const avant=await pB.evaluate(()=>JSON.stringify(DB).length);
   await pB.evaluate(c=>restaurerDepuisNuage(c),CLE);
   await pB.waitForFunction(()=>/n'a pas pu être lue/.test($('toast').textContent),null,{timeout:8000});
   verifie(await pB.evaluate(()=>JSON.stringify(DB).length)===avant,'la base locale a changé');
   serveur.alterer(vue.data);
 });
 await step('un fichier de MyBoutiQ (ou tout ce qui n’est pas un bar) est refusé par la même porte',async()=>{
   const avant=await pB.evaluate(()=>JSON.stringify(DB).length);
   await pB.evaluate(()=>appliquerSauvegarde({boutiques:[],articles:[]},{cle:'AAAAAAAAAAAAAAAAAAAA',rev:9}));
   verifie(/pas une sauvegarde MyBar/.test(await pB.textContent('#toast')),'pas de refus');
   verifie(await pB.evaluate(()=>JSON.stringify(DB).length)===avant,'la base a changé');
   verifie((await etat(pB)).cle===CLE,'la clé locale a été remplacée par celle d’un fichier refusé');
 });
 await step('refuser la confirmation ne change ni la base ni l’état en ligne',async()=>{
   const avant=await pB.evaluate(()=>JSON.stringify(DB).length),etatAvant=JSON.stringify(await etat(pB));
   pB.removeAllListeners('dialog');pB.on('dialog',d=>d.dismiss());
   await pB.evaluate(c=>restaurerDepuisNuage(c),CLE);
   await pB.waitForTimeout(800);
   verifie(await pB.evaluate(()=>JSON.stringify(DB).length)===avant,'la base a changé');
   verifie(JSON.stringify(await etat(pB))===etatAvant,'l’état en ligne a changé');
   pB.removeAllListeners('dialog');pB.on('dialog',d=>{B.dialogues.push({type:d.type(),msg:d.message()});d.accept(d.type()==='prompt'?'4321':undefined);});
 });

 // ── 8. Qui peut quoi ──
 await step('un serveur (non patron) ne peut ni activer, ni voir la clé, ni voir la carte',async()=>{
   await pA.evaluate(()=>{window.__patron=moi;moi=DB.equipe.filter(function(m){return m.role!=='patron';})[0]||{id:99,role:'serveur',nm:'Test'};});
   await pA.evaluate(()=>{afficherCleNuage();activerNuage();});
   verifie(!await pA.evaluate(()=>$('ov').classList.contains('on')),'une fenêtre de clé s’est ouverte pour un serveur');
   await ouvrirParametres(pA);
   verifie(!/Sauvegarde en ligne/.test(await pA.textContent('#s-settings')),'la carte est visible d’un serveur');
   verifie(!await pA.evaluate(()=>alertes().some(a=>/plus récente|sauvegarde en ligne/i.test(a.txt))),'alerte de sauvegarde vue d’un serveur');
   await pA.evaluate(()=>{moi=window.__patron;});
 });

 // ── 9. Gros bars ──
 await step('trois mille additions : la copie reste petite, bien en dessous de la limite',async()=>{
   await pA.evaluate(()=>{window.__v=DB.ventes.slice();});
   await remplir(pA,3000);
   const r=await pA.evaluate(()=>sauvegarderEnLigne({manuel:1}));
   await libre(pA);
   const e=await etat(pA);
   console.log('    3 040 additions → '+Math.round(e.octets/1024)+' Ko envoyés'+(r&&r.erreur?' ('+r.erreur+')':''));
   verifie(r&&r.ok,'envoi : '+JSON.stringify(r));
   verifie(e.octets<1500000,'copie de '+e.octets+' caractères');
   await pA.evaluate(()=>{DB.ventes=window.__v;save();});
 });
 await step('une base trop volumineuse n’est pas envoyée : le patron est prévenu',async()=>{
   await pA.evaluate(()=>{window.__cs=copieSansCodes;copieSansCodes=function(){
     var s='',k=new Uint8Array(65536),i;for(i=0;i<56;i++){crypto.getRandomValues(k);s+=String.fromCharCode.apply(null,k);}return {gros:btoa(s)+btoa(s.split('').reverse().join(''))+s.length};};});
   const avant=nb();
   const r=await pA.evaluate(()=>sauvegarderEnLigne({manuel:1}));
   await pA.evaluate(()=>{copieSansCodes=window.__cs;});
   verifie(r&&r.erreur==='trop_gros'&&nb()===avant,'retour : '+JSON.stringify(r)+', envois '+(nb()-avant));
   await pA.evaluate(()=>nuagePoser({erreur:''}));
 });

 // ── 10. Effacer ──
 await step('effacer supprime la copie en ligne et oublie la clé ; la clé ne retrouve plus rien',async()=>{
   await ouvrirParametres(pA);
   await pA.evaluate(()=>effacerNuage());
   await pA.waitForFunction(()=>!nuageEtat().cle,null,{timeout:10000});
   verifie(serveur.vue().length===0,'la copie est toujours en ligne');
   verifie(/Activer la sauvegarde en ligne/.test(await pA.textContent('#s-settings')),'la carte n’est pas revenue à l’état initial');
   await pB.evaluate(c=>restaurerDepuisNuage(c),CLE);
   await pB.waitForFunction(()=>/Aucune sauvegarde/.test($('toast').textContent),null,{timeout:8000});
 });
 await step('« Tout effacer » prévient que la clé sera oubliée, et ne laisse pas de clé orpheline',async()=>{
   await pB.evaluate(()=>{nuagePoser({cle:'AAAAAAAAAAAAAAAAAAAA'});});
   B.dialogues.length=0;
   await pB.evaluate(()=>toutEffacer());
   verifie(B.dialogues[0]&&/clé/.test(B.dialogues[0].msg)&&/copie en ligne/.test(B.dialogues[0].msg),'le premier message ne parle pas de la copie en ligne : '+(B.dialogues[0]&&B.dialogues[0].msg));
   verifie(await pB.evaluate(()=>localStorage.getItem('mybar_nuage'))===null,'la clé est restée dans le téléphone');
 });

 await A.ctx.close();await B.ctx.close();
 await b.close();
 console.log(errs.length?'\n'+errs.length+' pas en échec':'\nTout est passé');
 process.exit(errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
