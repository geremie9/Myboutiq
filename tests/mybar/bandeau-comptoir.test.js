const {chromium,CHROME,URL,SHOT}=require('./lib');
(async()=>{
 const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'fr-FR'});
 const p=await ctx.newPage();
 const errs=[];
 p.on('console',m=>{if(m.type()==='error'&&!/CERT|ERR_FAILED/.test(m.text()))errs.push('CONSOLE: '+m.text());});
 p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
 const step=async(n,fn)=>{try{await fn();console.log('OK  '+n);}catch(e){console.log('KO  '+n+' -> '+e.message);errs.push(n+': '+e.message);}};
 const lire=async()=>p.evaluate(()=>({
   visible:getComputedStyle(document.getElementById('cpt-stats')).display!=='none',
   lca:document.getElementById('cpt-lca').textContent,
   lnb:document.getElementById('cpt-lnb').textContent,
   ca:document.getElementById('cpt-ca').textContent,
   nb:document.getElementById('cpt-nb').textContent,
   net:document.getElementById('cpt-ben').textContent,
   netVisible:getComputedStyle(document.getElementById('cpt-sben')).display!=='none'}));

 await p.goto(URL);await p.waitForTimeout(1300);
 // une cave : le comptoir est l'écran de toute la journée
 await p.click('text=Ouvrir mon bar');await p.waitForSelector('#s-onboard.on');
 await p.click('#ob-pays-lst .pays-it >> nth=0');await p.click('#obs1 .btn-ob');
 const idx=await p.$$eval('#ob-type-grid .sec-btn',l=>l.findIndex(x=>/Cave/i.test(x.textContent)));
 await p.click('#ob-type-grid .sec-btn >> nth='+idx);await p.click('#obs2 .btn-ob');
 await p.fill('#ob-nom','Cave Test');await p.fill('#ob-tel','690112233');await p.click('#obs3 .btn-ob');
 await p.fill('#ob-pin','1234');await p.fill('#ob-pin2','1234');
 await p.click('text=🍻 Ouvrir mon bar');await p.waitForSelector('#s-menu.on',{timeout:6000});

 await step('le bandeau s’affiche, et parle du JOUR',async()=>{
   await p.waitForTimeout(700);
   const r=await lire();
   console.log('    '+r.lca+' = '+r.ca+' · '+r.lnb+' = '+r.nb+' · net = '+r.net);
   if(!r.visible)throw new Error('bandeau caché');
   if(!/jour/i.test(r.lca))throw new Error('libellé: '+r.lca);
   if(!/vente/i.test(r.lnb))throw new Error('libellé: '+r.lnb);
   if(r.ca.replace(/\D/g,'')!=='0')throw new Error('recette non nulle au départ: '+r.ca);
 });
 await step('une vente encaissée le fait bouger',async()=>{
   const c=await p.$$('#menu-grid .pcard');
   await c[0].click();await c[0].click();
   const att=await p.evaluate(()=>totalTable(table(tableCourante)));
   await p.click('#menu-benc');await p.waitForSelector('#pay-ok');
   await p.click('#pay-ok');await p.waitForTimeout(400);
   await p.click('text=Vente suivante');await p.waitForTimeout(900);
   const r=await lire();
   console.log('    attendu '+att+' — affiché '+r.ca+' · '+r.nb+' vente(s) · net '+r.net);
   if(+r.ca.replace(/\D/g,'')!==att)throw new Error('recette '+r.ca+' ≠ '+att);
   if(r.nb!=='1')throw new Error('compte: '+r.nb);
   if(+r.net.replace(/[^\d-]/g,'')<=0)throw new Error('net nul ou négatif: '+r.net);
 });
 await step('deux ventes : le compte suit',async()=>{
   const c=await p.$$('#menu-grid .pcard');await c[1].click();
   await p.click('#menu-benc');await p.waitForSelector('#pay-ok');
   await p.click('#pay-ok');await p.waitForTimeout(400);
   await p.click('text=Vente suivante');await p.waitForTimeout(900);
   const r=await lire();
   console.log('    '+r.ca+' · '+r.nb+' ventes');
   if(r.nb!=='2')throw new Error('compte: '+r.nb);
 });
 await step('une dépense entame le net, pas la recette',async()=>{
   const av=await lire();
   await p.evaluate(()=>{DB.depenses.push({id:uid(),ts:now(),cat:'glace',lbl:'2 sacs',montant:1000,par:1});save();rendreMenu();});
   await p.waitForTimeout(900);
   const ap=await lire();
   console.log('    recette '+av.ca+' → '+ap.ca+' · net '+av.net+' → '+ap.net);
   if(ap.ca!==av.ca)throw new Error('la recette a bougé');
   if(+ap.net.replace(/[^\d-]/g,'')>=+av.net.replace(/[^\d-]/g,''))throw new Error('le net n’a pas baissé');
 });
 await step('un serveur ne voit pas le net',async()=>{
   await p.evaluate(()=>{DB.equipe.push({id:99,nm:'Ali',role:'serveur',pin:'1111',actif:1,e:'🧑‍🍳'});save();
     moi=DB.equipe.filter(m=>m.id===99)[0];rendreMenu();});
   await p.waitForTimeout(400);
   const r=await lire();
   console.log('    net visible pour le serveur: '+r.netVisible);
   if(r.netVisible)throw new Error('le serveur voit le net');
   if(!r.visible)throw new Error('le bandeau a disparu pour le serveur');
   await p.evaluate(()=>{moi=DB.equipe[0];rendreMenu();});
 });
 await step('un bar à tables : pas de bandeau dans la carte d’une table',async()=>{
   await p.evaluate(()=>{poserForme('tables',1);ouvrirDepart();});
   await p.waitForTimeout(500);
   await p.click('#svc-grid .tcard >> nth=0');await p.waitForSelector('#s-addition.on');
   await p.click('text=+ Ajouter');await p.waitForSelector('#s-menu.on');
   const r=await lire();
   if(r.visible)throw new Error('bandeau affiché dans la carte d’une table');
   console.log('    caché ✓');
 });
 await step('poste comptoir dans un bar à tables : « du soir »',async()=>{
   await p.evaluate(()=>{fermerMenu();poserPoste('comptoir');ouvrirDepart();});
   await p.waitForTimeout(700);
   const r=await lire();
   console.log('    '+r.lca+' · '+r.lnb);
   if(!r.visible)throw new Error('bandeau caché');
   if(!/soir/i.test(r.lca))throw new Error('libellé: '+r.lca);
   if(!/addition/i.test(r.lnb))throw new Error('libellé: '+r.lnb);
 });
 await step('en anglais',async()=>{
   await p.evaluate(()=>setLang('en',true));await p.waitForTimeout(600);
   const r=await lire();
   console.log('    '+r.lca+' · '+r.lnb);
   if(!/tonight/i.test(r.lca))throw new Error(r.lca);
   if(!/bill/i.test(r.lnb))throw new Error(r.lnb);
 });

 console.log('\n--- erreurs: '+errs.length+' ---');errs.forEach(e=>console.log('  '+e));
 await p.evaluate(()=>setLang('fr',true));await p.waitForTimeout(500);
 await p.screenshot({path:SHOT+'x-cpt-stats.png'});
 await b.close();
})();
