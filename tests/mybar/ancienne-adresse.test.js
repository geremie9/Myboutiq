const {chromium,CHROME,URL,SHOT}=require('./lib');
(async()=>{
 const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'fr-FR'});
 const p=await ctx.newPage();
 const errs=[];
 p.on('console',m=>{if(m.type()==='error'&&!/CERT|ERR_FAILED/.test(m.text()))errs.push('CONSOLE: '+m.text());});
 p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
 const step=async(n,fn)=>{try{await fn();console.log('OK  '+n);}catch(e){console.log('KO  '+n+' -> '+e.message);errs.push(n+': '+e.message);}};
 // on se fait passer pour myboutiq.online/bar
 const vieux=async()=>p.evaluate(()=>{window.ancienneAdresse=function(){return true;};});

 await p.goto(URL);await p.waitForTimeout(1300);

 await step('a la bonne adresse : aucun avertissement',async()=>{
   if(await p.isVisible('.vit-adr'))throw new Error('avertissement affiche a tort');
   if(!await p.isVisible('#vit-install'))throw new Error('bouton installer cache a tort');
 });
 await step('ancienne adresse : la vitrine previent, et n’installe plus',async()=>{
   await vieux();
   await p.evaluate(()=>{rendreVitrine();majBoutonsInstaller();});
   await p.waitForTimeout(300);
   if(!await p.isVisible('.vit-adr'))throw new Error('pas d’avertissement');
   console.log('    '+(await p.textContent('.vit-adr b')));
   if(await p.isVisible('#vit-install'))throw new Error('« Installer » encore propose depuis l’ancienne adresse');
   const href=await p.evaluate(()=>MYBAR_URL);
   console.log('    destination: '+href);
   if(href!=='https://bar.myboutiq.online/')throw new Error(href);
 });
 await step('creation d’un bar puis bandeau de demenagement',async()=>{
   await p.evaluate(()=>{window.ancienneAdresse=function(){return false;};});
   await p.click('text=Ouvrir mon bar');await p.waitForSelector('#s-onboard.on');
   await p.click('#ob-pays-lst .pays-it >> nth=0');await p.click('#obs1 .btn-ob');
   await p.click('#ob-type-grid .sec-btn >> nth=0');await p.click('#obs2 .btn-ob');
   await p.fill('#ob-nom','Bar Adresse');await p.fill('#ob-tel','690112233');await p.click('#obs3 .btn-ob');
   await p.fill('#ob-pin','1234');await p.fill('#ob-pin2','1234');
   await p.click('text=🍻 Ouvrir mon bar');await p.waitForSelector('#s-service.on',{timeout:5000});
   if(await p.isVisible('#svc-adresse .inst-band'))throw new Error('bandeau affiche a la bonne adresse');
   await vieux();
   await p.evaluate(()=>{rendreEcran('s-service');});
   await p.waitForTimeout(300);
   if(!await p.isVisible('#svc-adresse .inst-band'))throw new Error('pas de bandeau');
   console.log('    '+(await p.textContent('#svc-adresse .ib-t')).slice(0,80));
 });
 await step('le modal de demenagement donne les trois gestes',async()=>{
   await p.click('#svc-adresse .ib-b');
   await p.waitForSelector('#ov.on',{timeout:3000});
   const t=(await p.textContent('#ovb')).replace(/\s+/g,' ');
   for(const m of ['Sauvegarder maintenant','bar.myboutiq.online','Restaurer une sauvegarde'])
     if(t.indexOf(m)<0)throw new Error('manque : '+m);
   console.log('    '+t.slice(0,90));
   await p.evaluate(()=>fermerModal());
 });
 await step('la connexion previent aussi',async()=>{
   await p.evaluate(()=>{logout();});
   await p.waitForSelector('#s-login.on');
   await p.evaluate(()=>{majBandeauxAdresse();majBoutonsInstaller();});
   await p.waitForTimeout(200);
   if(!await p.isVisible('#lg-adresse .inst-band'))throw new Error('pas de bandeau sur la connexion');
   if(await p.isVisible('#lg-install'))throw new Error('« Installer » encore propose');
 });
 await step('la sauvegarde part bien',async()=>{
   const dl=p.waitForEvent('download',{timeout:5000});
   await p.evaluate(()=>{loginPatron&&0;});
   await p.fill('#p-pin','1234');await p.click('#lg-patron button');
   await p.waitForTimeout(500);
   await p.evaluate(()=>{window.ancienneAdresse=function(){return true;};rendreEcran('s-service');});
   await p.waitForTimeout(300);
   await p.click('#svc-adresse .ib-b');
   await p.waitForSelector('#ov.on');
   await p.click('text=💾 Sauvegarder maintenant');
   const d=await dl;
   console.log('    fichier: '+d.suggestedFilename());
   if(!/mybar-sauvegarde/.test(d.suggestedFilename()))throw new Error(d.suggestedFilename());
 });

 console.log('\n--- erreurs: '+errs.length+' ---');errs.forEach(e=>console.log('  '+e));
 await p.evaluate(()=>fermerModal());
 await p.screenshot({path:SHOT+'x-adresse.png'});
 await b.close();
})();
