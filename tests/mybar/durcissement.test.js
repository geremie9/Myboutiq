/* Les six défauts trouvés au diagnostic d'architecture, chacun rejoué tel qu'il
   avait été mesuré — et qui ne doivent plus revenir. */
const fs=require('fs');
const {chromium,CHROME,URL,BASE}=require('./lib');
const http=require('http');
const delai=(ms)=>new Promise(r=>http.get(BASE+'/__delai/'+ms,x=>{x.resume();x.on('end',r);}));

(async()=>{
 const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
 const errs=[];
 const step=async(n,fn)=>{try{await fn();console.log('OK  '+n);}catch(e){console.log('KO  '+n+' -> '+e.message);errs.push(n);}};
 const neuf=async()=>{
   const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'fr-FR',acceptDownloads:true});
   const p=await ctx.newPage();
   p.on('pageerror',e=>{console.log('KO  erreur de page -> '+e.message);errs.push('pageerror');});
   await p.goto(URL);await p.waitForTimeout(1200);
   return {ctx,p};
 };
 const creerBar=async(p,nom)=>{
   await p.click('text=Ouvrir mon bar');await p.waitForSelector('#s-onboard.on');
   await p.click('#ob-pays-lst .pays-it >> nth=0');await p.click('#obs1 .btn-ob');
   await p.click('#ob-type-grid .sec-btn >> nth=0');await p.click('#obs2 .btn-ob');
   await p.fill('#ob-nom',nom);await p.fill('#ob-tel','690112233');await p.click('#obs3 .btn-ob');
   await p.fill('#ob-pin','1234');await p.fill('#ob-pin2','1234');
   await p.click('text=🍻 Ouvrir mon bar');await p.waitForSelector('#s-service.on',{timeout:8000});
 };

 // ── 1. l'indicatif sud-africain ──────────────────────────────────
 {
  const {ctx,p}=await neuf();
  await step('chaque pays a un indicatif, et aucun type d’établissement n’en porte un',async()=>{
    const r=await p.evaluate(()=>({sans:PAYS.filter(x=>!/^\d{1,3}$/.test(x.cc||'')).map(x=>x.c),
      typesAvecCc:TYPES.filter(t=>t.cc!==undefined).map(t=>t.c)}));
    if(r.sans.length)throw new Error('pays sans indicatif : '+r.sans);
    if(r.typesAvecCc.length)throw new Error('indicatif posé sur un type : '+r.typesAvecCc);
  });
  await step('un numéro sud-africain reste sud-africain (+27, pas +237)',async()=>{
    const r=await p.evaluate(()=>{const z=PAYS.filter(x=>x.c==='ZA')[0];
      obPays=z;majIndicatif();
      return {intl:telIntl('0821234567',z.cc),cc:document.getElementById('ob-cc').textContent};});
    if(r.intl!=='27821234567')throw new Error('intl = '+r.intl);
    if(!/27/.test(r.cc))throw new Error('indicatif affiché : '+JSON.stringify(r.cc));
  });
  await ctx.close();
 }

 // ── 2. zone avec apostrophe ──────────────────────────────────────
 {
  const {ctx,p}=await neuf();
  await creerBar(p,'Bar Zone');
  await step('une zone « Terrasse de l’hôtel » se filtre',async()=>{
    await p.evaluate(()=>{DB.tables.push({id:uid(),nm:'Table H1',zone:"Terrasse de l'hôtel",ouv:null,srv:null,lignes:[],note:''});save();rendreService();});
    await p.click('#svc-zones .tpil:has-text("hôtel")');
    await p.waitForTimeout(250);
    const r=await p.evaluate(()=>({zone:vueZone,tables:[...document.querySelectorAll('#svc-grid .tcard')].map(x=>x.textContent)}));
    if(r.zone!=="Terrasse de l'hôtel")throw new Error('le filtre n’a pas pris : '+r.zone);
    if(r.tables.length!==1||!/H1/.test(r.tables[0]))throw new Error('tables affichées : '+JSON.stringify(r.tables));
  });
  await step('un nom de zone malveillant ne s’exécute pas',async()=>{
    await p.evaluate(()=>{window.__pwn=0;DB.tables.push({id:uid(),nm:'T-X',zone:"');window.__pwn=1;//",ouv:null,srv:null,lignes:[],note:''});save();rendreService();});
    await p.click('#svc-zones .tpil:has-text("pwn")');await p.waitForTimeout(200);
    if(await p.evaluate(()=>window.__pwn))throw new Error('le nom de zone a été exécuté comme du code');
  });
  await ctx.close();
 }

 // ── 3. le code patron ne sort plus ───────────────────────────────
 {
  const {ctx,p}=await neuf();
  await creerBar(p,'Bar Codes');
  await p.evaluate(()=>{DB.equipe.push({id:77,nm:'Ali',role:'serveur',pin:'1111',actif:1,e:'🧑‍🍳'});save();});
  await step('le fichier de sauvegarde ne contient aucun code',async()=>{
    const dl=p.waitForEvent('download',{timeout:5000});
    await p.evaluate(()=>sauvegarder());
    const d=await dl;const txt=fs.readFileSync(await d.path(),'utf8');
    if(/"pin"/.test(txt))throw new Error('un champ pin est dans le fichier');
    if(/1234|1111/.test(txt.replace(/"(id|ts|nextId|tel)":\d+/g,'')))throw new Error('un code apparaît dans le fichier');
    const j=JSON.parse(txt);if(!j.produits||!j.cfg)throw new Error('sauvegarde incomplète');
  });
  await step('la base en mémoire garde ses codes (seul le fichier en est privé)',async()=>{
    const r=await p.evaluate(()=>({p:DB.cfg.pin,s:DB.equipe.filter(m=>m.id===77)[0].pin}));
    if(r.p!=='1234'||r.s!=='1111')throw new Error(JSON.stringify(r));
  });
  await step('un serveur ne voit ni « Sauvegarde » ni « Restaurer », et ne peut pas les appeler',async()=>{
    const r=await p.evaluate(()=>{moi=DB.equipe.filter(m=>m.id===77)[0];rendreSettings();
      const h=document.getElementById('s-settings').innerHTML;
      let telecharge=false;const av=URL.createObjectURL;URL.createObjectURL=function(){telecharge=true;return av.apply(this,arguments);};
      sauvegarder();URL.createObjectURL=av;
      return {bouton:/onclick="sauvegarder\(\)"/.test(h),restaurer:/fic-restore'\)\.click/.test(h),telecharge};});
    if(r.bouton)throw new Error('bouton Sauvegarde visible pour un serveur');
    if(r.restaurer)throw new Error('bouton Restaurer visible pour un serveur');
    if(r.telecharge)throw new Error('sauvegarder() a produit un fichier pour un serveur');
    await p.evaluate(()=>{moi=DB.equipe[0];});
  });
  await step('restaurer une sauvegarde sans codes redemande un code patron',async()=>{
    const dl=p.waitForEvent('download',{timeout:5000});
    await p.evaluate(()=>sauvegarder());
    const d=await dl;const buf=fs.readFileSync(await d.path());
    p.on('dialog',x=>{if(x.type()==='prompt')x.accept('4321');else x.accept();});
    await p.setInputFiles('#fic-restore',{name:'sauv.json',mimeType:'application/json',buffer:buf});
    await p.waitForTimeout(700);
    const r=await p.evaluate(()=>({pin:DB.cfg.pin,patron:DB.equipe.filter(m=>m.role==='patron')[0].pin,ali:DB.equipe.filter(m=>m.id===77)[0].pin,ok:DB.cfg.sansCodes}));
    if(r.pin!=='4321'||r.patron!=='4321')throw new Error('code patron non posé : '+JSON.stringify(r));
    if(r.ali!=='')throw new Error('le code du serveur n’a pas été vidé : '+JSON.stringify(r.ali));
  });
  await step('un serveur sans code défini ne peut pas entrer avec un champ vide',async()=>{
    await p.evaluate(()=>{logout();switchLogin('serveur');});
    await p.selectOption('#v-nm','77');
    await p.fill('#v-pin','');
    await p.evaluate(()=>loginServeur());await p.waitForTimeout(250);
    const id=await p.getAttribute('.scr.on','id');
    if(id!=='s-login')throw new Error('connecté sans code : écran '+id);
    const t=await p.textContent('#toast');
    if(!/pas encore|not set/i.test(t))throw new Error('message : '+t);
  });
  await ctx.close();
 }

 // ── 4. base illisible ────────────────────────────────────────────
 {
  const {ctx,p}=await neuf();
  await creerBar(p,'Bar Abimé');
  const abimee=await p.evaluate(()=>{const brut=localStorage.getItem('mybar_v1');const t=brut.slice(0,Math.floor(brut.length*0.6));localStorage.setItem('mybar_v1',t);return t;});
  await step('une base illisible est gardée à part et signalée, pas écrasée en silence',async()=>{
    await p.reload();await p.waitForTimeout(1300);
    const id=await p.getAttribute('.scr.on','id');
    if(id!=='s-vitrine')throw new Error('écran : '+id);
    if(!await p.isVisible('#ov.on'))throw new Error('aucun avertissement');
    const t=await p.textContent('#ovb');
    if(!/pas pu être lues|could not be read/i.test(t))throw new Error('texte : '+t.slice(0,80));
    const copie=await p.evaluate(()=>localStorage.getItem('mybar_v1_illisible'));
    if(copie!==abimee)throw new Error('la copie ne correspond pas à la base abîmée');
  });
  await step('ouvrir un nouveau bar n’efface pas la copie, et elle se télécharge',async()=>{
    await p.evaluate(()=>fermerModal());
    await creerBar(p,'Bar Neuf');
    const copie=await p.evaluate(()=>localStorage.getItem('mybar_v1_illisible'));
    if(copie!==abimee)throw new Error('la copie a été perdue');
    const dl=p.waitForEvent('download',{timeout:5000});
    await p.evaluate(()=>telechargerCopieIllisible());
    const d=await dl;
    if(fs.readFileSync(await d.path(),'utf8')!==abimee)throw new Error('le fichier téléchargé n’est pas la copie');
  });
  await ctx.close();
 }

 // ── 5. deux fenêtres, une vente ──────────────────────────────────
 {
  const ctx=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
  const a=await ctx.newPage(),c=await ctx.newPage();
  await a.goto(URL);await a.waitForTimeout(1000);
  await a.evaluate(()=>{DB={cfg:{nom:'X',pin:'1234',lang:'fr',k:1,d:'XAF',s:'F',forme:{}},produits:[],tables:[],equipe:[{id:1,nm:'P',role:'patron',pin:'1234',actif:1}],clients:[],ventes:[],depenses:[],appros:[],clotures:[],reglements:[],nextId:1000};save();});
  await c.goto(URL);await c.waitForTimeout(1000);
  const ventes=(pg)=>pg.evaluate(()=>JSON.parse(localStorage.getItem('mybar_v1')).ventes.map(v=>v.total));
  await step('deux fenêtres ouvertes : aucune vente n’est perdue',async()=>{
    await a.evaluate(()=>{DB=loadDB();});await c.evaluate(()=>{DB=loadDB();});
    await a.evaluate(()=>{DB.ventes.push({id:uid(),ts:Date.now(),total:5000,jour:'j',lignes:[]});save();});
    await c.waitForTimeout(400);                                     // l'avis « storage » arrive dans l'autre fenêtre
    await c.evaluate(()=>{DB.ventes.push({id:uid(),ts:Date.now()+1,total:3000,jour:'j',lignes:[]});save();});
    const v=(await ventes(a)).sort();
    if(JSON.stringify(v)!=='[3000,5000]')throw new Error('en mémoire : '+JSON.stringify(v));
  });
  await step('avis manqué : save() rapatrie ce qui lui manque avant d’écrire',async()=>{
    const snap=await c.evaluate(()=>({s:JSON.stringify(DB),r:revLocale}));
    await a.evaluate(()=>{DB.ventes.push({id:uid(),ts:Date.now()+2,total:700,jour:'j',lignes:[]});save();});
    await c.evaluate(({s,r})=>{DB=JSON.parse(s);revLocale=r;},snap);           // la fenêtre C n'a pas reçu l'avis
    await c.evaluate(()=>{DB.ventes.push({id:uid(),ts:Date.now()+3,total:900,jour:'j',lignes:[]});save();});
    const v=(await ventes(a)).sort((x,y)=>x-y);
    if(JSON.stringify(v)!=='[700,900,3000,5000]')throw new Error('en mémoire : '+JSON.stringify(v));
  });
  await ctx.close();
 }

 // ── 6. réseau présent qui ne débite rien ─────────────────────────
 {
  const {ctx,p}=await neuf();
  await delai(0);
  await p.goto(URL);
  await p.waitForFunction(()=>navigator.serviceWorker.getRegistration().then(r=>!!(r&&r.active)),null,{timeout:10000}).catch(()=>{});
  await p.reload();await p.waitForTimeout(1500);
  await step('le service worker contrôle la page et garde une copie',async()=>{
    if(!await p.evaluate(()=>!!navigator.serviceWorker.controller))throw new Error('pas de contrôle');
  });
  await step('réseau normal : toujours à jour (la version fraîche l’emporte)',async()=>{
    await delai(0);
    const t0=Date.now();
    await p.goto(URL,{waitUntil:'domcontentloaded'});await p.waitForSelector('.scr.on');
    const t=Date.now()-t0;
    console.log('    ouverture : '+t+' ms');
    if(t>2500)throw new Error('ouverture lente sans raison : '+t+' ms');
  });
  await step('réseau à 15 s : l’app s’ouvre en moins de 9 s grâce à la copie locale',async()=>{
    await delai(15000);
    const t0=Date.now();
    await p.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
    await p.waitForSelector('.scr.on',{timeout:60000});
    const t=Date.now()-t0;
    await delai(0);
    console.log('    ouverture : '+t+' ms pour un réseau qui répond en 15 000 ms');
    if(t>9000)throw new Error('l’app attend le réseau : '+t+' ms');
  });
  await delai(0);
  await ctx.close();
 }

 await b.close();
 console.log('\n--- échecs: '+errs.length+' ---');
 process.exit(errs.length?1:0);
})();
