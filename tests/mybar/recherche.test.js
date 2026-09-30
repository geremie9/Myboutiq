const {chromium,CHROME,URL,SHOT}=require('./lib');
(async()=>{
 const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'fr-FR'});
 const p=await ctx.newPage();
 const errs=[];
 p.on('console',m=>{if(m.type()==='error'&&!/CERT|ERR_FAILED/.test(m.text()))errs.push('CONSOLE: '+m.text());});
 p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
 const step=async(n,fn)=>{try{await fn();console.log('OK  '+n);}catch(e){console.log('KO  '+n+' -> '+e.message);errs.push(n+': '+e.message);}};

 await p.goto(URL);await p.waitForTimeout(1300);
 await p.click('text=Ouvrir mon bar');await p.waitForSelector('#s-onboard.on');
 await p.click('#ob-pays-lst .pays-it >> nth=0');await p.click('#obs1 .btn-ob');
 await p.click('#ob-type-grid .sec-btn >> nth=0');await p.click('#obs2 .btn-ob');
 await p.fill('#ob-nom','Bar Recherche');await p.fill('#ob-tel','690112233');await p.click('#obs3 .btn-ob');
 await p.fill('#ob-pin','1234');await p.fill('#ob-pin2','1234');
 await p.click('text=🍻 Ouvrir mon bar');await p.waitForSelector('#s-service.on',{timeout:6000});

 await step('la carte : chercher sans accent',async()=>{
   await p.click('#svc-grid .tcard >> nth=0');await p.waitForSelector('#s-addition.on');
   await p.click('text=+ Ajouter');await p.waitForSelector('#s-menu.on');
   for(const [q,min] of [['biere',5],['bière',5],['energisant',1],['eaux',1],['EXPORT',1],['  biere ',5]]){
     await p.fill('#menu-src',q);await p.waitForTimeout(220);
     const n=(await p.$$('#menu-grid .pcard')).length;
     console.log('    « '+q+' » → '+n+' produit(s)');
     if(n<min)throw new Error('« '+q+' » ne rend que '+n);
   }
   await p.fill('#menu-src','');await p.waitForTimeout(200);
 });
 await step('le stock : chercher sans accent',async()=>{
   await p.evaluate(()=>{navTo('stock');});await p.waitForSelector('#s-stock.on');
   for(const [q,min] of [['biere',5],['energisant',1],['sucrerie',1]]){
     await p.fill('#stk-src',q);await p.waitForTimeout(220);
     const n=(await p.$$('#stk-lst .row')).length;
     console.log('    « '+q+' » → '+n+' ligne(s)');
     if(n<min)throw new Error('« '+q+' » ne rend que '+n);
   }
   await p.fill('#stk-src','');await p.waitForTimeout(200);
 });
 await step('chercher une contenance : « 65cl »',async()=>{
   await p.fill('#stk-src','65cl');await p.waitForTimeout(250);
   const n=(await p.$$('#stk-lst .row')).length;
   console.log('    « 65cl » → '+n+' ligne(s)');
   if(n<3)throw new Error(''+n);
   await p.fill('#stk-src','');
 });
 await step('le comptoir voit enfin les alertes',async()=>{
   // un bar sans tables : la carte devient l'écran d'accueil
   await p.evaluate(()=>{poserForme('tables',0);});
   await p.waitForTimeout(400);
   await p.evaluate(()=>{ouvrirDepart();});
   await p.waitForTimeout(400);
   const id=await p.getAttribute('.scr.on','id');
   if(id!=='s-menu')throw new Error('ecran '+id);
   const n=(await p.$$('#menu-alertes .note')).length;
   const att=await p.evaluate(()=>alertes().length);
   console.log('    alertes en cours: '+att+' — affichées au comptoir: '+n);
   if(att>0&&n===0)throw new Error('le comptoir n’en montre aucune');
   console.log('    '+(await p.textContent('#menu-alertes')).replace(/\s+/g,' ').slice(0,80));
 });
 await step('à table, la carte reste propre',async()=>{
   await p.evaluate(()=>{poserForme('tables',1);ouvrirDepart();});
   await p.waitForTimeout(400);
   await p.click('#svc-grid .tcard >> nth=0');await p.waitForSelector('#s-addition.on');
   await p.click('text=+ Ajouter');await p.waitForSelector('#s-menu.on');
   if((await p.$$('#menu-alertes .note')).length)throw new Error('alertes affichées dans la carte d’une table');
 });

 console.log('\n--- erreurs: '+errs.length+' ---');errs.forEach(e=>console.log('  '+e));
 await b.close();
})();
