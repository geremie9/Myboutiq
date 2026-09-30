/* La mémoire d'un bar est finie : jauge, avertissement, archivage ; et le reste
   de ce qui protège un téléphone de comptoir (écran allumé, stockage durable,
   rappel de sauvegarde). */
const fs=require('fs');
const {chromium,CHROME,URL}=require('./lib');

(async()=>{
 const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
 const errs=[];
 const step=async(n,fn)=>{try{await fn();console.log('OK  '+n);}catch(e){console.log('KO  '+n+' -> '+e.message);errs.push(n);}};
 const neuf=async(avant)=>{
   const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'fr-FR',acceptDownloads:true});
   if(avant)await ctx.addInitScript(avant);
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
 // N ventes réparties sur `jours` jours passés (la plus ancienne il y a `jours` jours)
 const remplir=(p,nb,jours)=>p.evaluate(({nb,jours})=>{
   const pr=DB.produits[0];DB.ventes=[];
   for(let i=0;i<nb;i++){
     const ts=Date.now()-Math.floor(i/nb*jours*86400000)-3600000;
     DB.ventes.push({id:uid(),ts:ts,jour:jour(ts),tableId:1,tableNm:'Table 1',zone:'Salle',srv:1,srvNm:'P',
       lignes:[{pid:pr.id,nm:pr.nm,e:pr.e,q:2,pu:1000,pa:650}],remise:0,total:2000,cout:1300,pourboire:0,mode:'espece',client:null,clientNm:'',vides:2,ouvert:ts,duree:600000});
   }
   DB.depenses=[{id:uid(),ts:Date.now()-100*86400000,cat:'glace',lbl:'glace',montant:1500,par:1},{id:uid(),ts:Date.now()-86400000,cat:'glace',lbl:'glace',montant:700,par:1}];
   save();
 },{nb,jours});

 // ── jauge et avertissement ───────────────────────────────────────
 {
  const {ctx,p}=await neuf();
  await creerBar(p,'Bar Mémoire');
  await step('la jauge reflète la base, et grandit avec les ventes',async()=>{
    const a=await p.evaluate(()=>memoire().pct);
    await remplir(p,3000,90);
    const r=await p.evaluate(()=>memoire());
    console.log('    '+r.pct+' % de '+r.quota.toLocaleString('fr-FR')+' caractères — '+(r.jours==null?'pas d’estimation':r.jours+' jours restants'));
    if(!(r.pct>a))throw new Error('la jauge n’a pas bougé : '+a+' → '+r.pct);
    if(r.jours==null)throw new Error('pas d’estimation de jours restants');
    await p.evaluate(()=>rendreSettings());
    if(!await p.isVisible('#s-settings.on')){await p.evaluate(()=>goSt());}
    const t=await p.textContent('#s-settings');
    if(!/Mémoire de MyBar/.test(t))throw new Error('jauge absente des Paramètres');
  });
  await step('à 70 %, une alerte propose d’archiver ; en dessous, rien',async()=>{
    await p.evaluate(()=>{QUOTA_CHARS=memoire().utilise*10;});
    if(await p.evaluate(()=>alertes().some(a=>/mémoire de MyBar/i.test(a.txt))))throw new Error('alerte à 10 %');
    await p.evaluate(()=>{QUOTA_CHARS=Math.round(memoire().utilise/0.8);});
    const txt=await p.evaluate(()=>alertes().filter(a=>/mémoire de MyBar/i.test(a.txt)).map(a=>a.txt)[0]);
    if(!txt)throw new Error('pas d’alerte à ~80 %');
    console.log('    '+txt.slice(0,100));
    await p.evaluate(()=>{QUOTA_CHARS=Math.round(memoire().utilise/0.95);});
    const cls=await p.evaluate(()=>alertes().filter(a=>/mémoire de MyBar/i.test(a.txt))[0].cls);
    if(cls!=='rouge')throw new Error('pas rouge à 95 % : '+cls);
  });
  await step('le message de saturation ne donne plus une consigne impossible',async()=>{
    const src=await p.evaluate(()=>save.toString());
    if(/lib[èe]re de la place,? sinon/i.test(src))throw new Error('l’ancien message est toujours là');
    if(!/N'EST PAS enregistr/.test(src))throw new Error('le message ne dit pas que la vente n’est pas enregistrée');
  });
  await step('le quota réel est mesuré, et la sonde ne laisse rien derrière elle',async()=>{
    await p.evaluate(()=>{localStorage.removeItem('mybar_quota');QUOTA_CHARS=0;});
    const av=await p.evaluate(()=>({db:localStorage.getItem('mybar_v1').length}));
    const q=await p.evaluate(()=>sondeQuota());
    const ap=await p.evaluate(()=>({db:localStorage.getItem('mybar_v1').length,sonde:localStorage.getItem('__mybar_sonde')}));
    console.log('    quota mesuré : '+q.toLocaleString('fr-FR')+' caractères');
    if(q<1000000)throw new Error('quota absurde : '+q);
    if(ap.sonde!==null)throw new Error('la clé de sonde est restée');
    if(ap.db!==av.db)throw new Error('la base a été touchée');
  });
  await ctx.close();
 }

 // ── archivage ────────────────────────────────────────────────────
 {
  const {ctx,p}=await neuf();
  await creerBar(p,'Bar Archive');
  await remplir(p,1200,120);          // 120 jours : les 60 derniers restent
  const av=await p.evaluate(()=>({nb:DB.ventes.length,taille:derniereTaille,
    vieux:aArchiver().ventes.length,ca:DB.ventes.reduce((s,v)=>s+v.total,0)}));
  console.log('    avant : '+av.nb+' ventes, '+av.vieux+' à archiver');
  await step('l’archivage télécharge un fichier complet avant d’effacer quoi que ce soit',async()=>{
    p.on('dialog',d=>d.accept());
    const dl=p.waitForEvent('download',{timeout:6000});
    await p.evaluate(()=>archiver());
    const d=await dl;const j=JSON.parse(fs.readFileSync(await d.path(),'utf8'));
    if(j.mybarArchive!==1)throw new Error('ce n’est pas une archive');
    if(j.ventes.length!==av.vieux)throw new Error('le fichier contient '+j.ventes.length+' ventes, attendu '+av.vieux);
    if(!j.ventes[0].lignes)throw new Error('les lignes de vente ne sont pas dans le fichier');
    await p.waitForTimeout(300);
  });
  await step('il ne reste que les 60 derniers jours, plus un résumé par mois qui retombe juste',async()=>{
    const r=await p.evaluate(()=>{
      const lim=Date.now()-60*86400000;
      return {nb:DB.ventes.length,tropVieilles:DB.ventes.filter(v=>v.ts<lim).length,
        arch:DB.archive,caArch:(DB.archive||[]).reduce((s,m)=>s+m.ca,0),nbArch:(DB.archive||[]).reduce((s,m)=>s+m.nb,0),
        caReste:DB.ventes.reduce((s,v)=>s+v.total,0),taille:derniereTaille,depArch:(DB.archive||[]).reduce((s,m)=>s+m.dep,0)};});
    if(r.tropVieilles)throw new Error(r.tropVieilles+' ventes trop vieilles sont restées');
    if(r.nb+r.nbArch!==av.nb)throw new Error('des ventes se sont perdues : '+r.nb+' + '+r.nbArch+' ≠ '+av.nb);
    if(r.caArch+r.caReste!==av.ca)throw new Error('la recette ne retombe pas : '+(r.caArch+r.caReste)+' ≠ '+av.ca);
    if(r.depArch!==1500)throw new Error('les dépenses archivées : '+r.depArch+' (attendu 1 500)');
    if(!(r.taille<av.taille))throw new Error('la base n’a pas rétréci : '+av.taille+' → '+r.taille);
    console.log('    '+av.nb+' → '+r.nb+' ventes en base · '+r.arch.length+' mois archivés · '+Math.round(100*r.taille/av.taille)+' % de la taille d’avant');
  });
  await step('les mois archivés apparaissent dans Rapports, et Rapports ne plante pas',async()=>{
    await p.evaluate(()=>{vuePeriode='tout';navTo('rapports');});
    await p.waitForSelector('#s-rapports.on');
    const t=await p.textContent('#rpt-cont');
    if(!/Mois archivés/.test(t))throw new Error('carte « Mois archivés » absente');
  });
  await step('un second archivage, à la suite, n’a rien à faire et ne casse rien',async()=>{
    await p.evaluate(()=>archiver());await p.waitForTimeout(300);
    const t=await p.textContent('#toast');
    if(!/Rien de plus vieux/.test(t))throw new Error('message : '+t);
  });
  await step('un serveur ne peut pas archiver',async()=>{
    const r=await p.evaluate(()=>{DB.equipe.push({id:88,nm:'Ali',role:'serveur',pin:'1',actif:1});moi=DB.equipe.filter(m=>m.id===88)[0];
      const avant=DB.ventes.length;DB.ventes[0].ts=Date.now()-200*86400000;archiver();return {apres:DB.ventes.length,avant:avant};});
    if(r.apres!==r.avant)throw new Error('un serveur a archivé');
  });
  await ctx.close();
 }

 // ── rappel de sauvegarde ─────────────────────────────────────────
 {
  const {ctx,p}=await neuf();
  await creerBar(p,'Bar Rappel');
  await step('pas de rappel pour un bar tout neuf',async()=>{
    if(await p.evaluate(()=>alertes().some(a=>/sauvegarde|backed up/i.test(a.txt))))throw new Error('rappel dès le premier jour');
  });
  await step('après 10 jours sans sauvegarde : un rappel, et il disparaît une fois la sauvegarde faite',async()=>{
    await p.evaluate(()=>{DB.cfg.cree=Date.now()-10*86400000;save();});
    const r1=await p.evaluate(()=>alertes().filter(a=>/sauvegard/i.test(a.txt)).map(a=>a.txt)[0]);
    if(!r1)throw new Error('aucun rappel à 10 jours');
    console.log('    '+r1);
    const dl=p.waitForEvent('download',{timeout:5000});
    await p.evaluate(()=>sauvegarder());await dl;
    if(await p.evaluate(()=>alertes().some(a=>/sauvegarde|backed up/i.test(a.txt))))throw new Error('le rappel est resté après sauvegarde');
    await p.evaluate(()=>{DB.cfg.derniereSauv=Date.now()-9*86400000;save();});
    const r2=await p.evaluate(()=>alertes().filter(a=>/sauvegard/i.test(a.txt)).map(a=>a.txt)[0]);
    if(!/9 jours/.test(r2||''))throw new Error('rappel à 9 jours : '+r2);
  });
  await step('le rappel n’est montré qu’au patron',async()=>{
    const r=await p.evaluate(()=>{DB.equipe.push({id:88,nm:'Ali',role:'serveur',pin:'1',actif:1});moi=DB.equipe.filter(m=>m.id===88)[0];
      return alertes().some(a=>/sauvegard/i.test(a.txt));});
    if(r)throw new Error('rappel montré à un serveur');
  });
  await ctx.close();
 }

 // ── écran allumé et stockage durable (API du navigateur simulées) ─
 {
  const simul=()=>{
    window.__wl=0;window.__wlr=0;window.__persist=0;
    Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>{window.__wl++;const l={released:false,release(){this.released=true;window.__wlr++;return Promise.resolve();},addEventListener(){}};return l;}}});
    try{Object.defineProperty(navigator.storage,'persist',{configurable:true,value:async()=>{window.__persist++;return true;}});}catch(e){}
  };
  const {ctx,p}=await neuf(simul);
  await creerBar(p,'Bar Écran');
  await step('le navigateur est prié de garder les données',async()=>{
    await p.waitForTimeout(300);
    if(!await p.evaluate(()=>window.__persist>0))throw new Error('storage.persist() jamais demandé');
    if(await p.evaluate(()=>localStorage.getItem('mybar_persist'))!=='1')throw new Error('réponse non mémorisée');
  });
  await step('poste « tout le bar » avec tables : l’écran n’est pas retenu',async()=>{
    if(await p.evaluate(()=>window.__wl)!==0)throw new Error('écran retenu à tort');
  });
  await step('poste « comptoir » : l’écran reste allumé',async()=>{
    await p.evaluate(()=>poserPoste('comptoir'));await p.waitForTimeout(300);
    if(!(await p.evaluate(()=>window.__wl>0)))throw new Error('wakeLock non demandé au poste comptoir');
  });
  await step('le réglage est personnel : on le coupe, l’écran est relâché',async()=>{
    await p.evaluate(()=>poserEcran(0));await p.waitForTimeout(300);
    if(!(await p.evaluate(()=>window.__wlr>0)))throw new Error('wakeLock non relâché');
    if(await p.evaluate(()=>ecranAllume()))throw new Error('ecranAllume() vrai après coupure');
  });
  await step('se déconnecter relâche l’écran',async()=>{
    await p.evaluate(()=>poserEcran(1));await p.waitForTimeout(250);
    const av=await p.evaluate(()=>window.__wlr);
    await p.evaluate(()=>logout());await p.waitForTimeout(250);
    if(!(await p.evaluate(a=>window.__wlr>a,av)))throw new Error('écran non relâché à la déconnexion');
  });
  await ctx.close();
 }

 await b.close();
 console.log('\n--- échecs: '+errs.length+' ---');
 process.exit(errs.length?1:0);
})();
