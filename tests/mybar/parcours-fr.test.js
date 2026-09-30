const {chromium,CHROME,URL,SHOT}=require('./lib');
(async()=>{
 const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'fr-FR'});
 const p=await ctx.newPage();
 const errs=[];
 p.on('console',m=>{if(m.type()==='error'&&!/ERR_CERT|ERR_CONNECTION|ERR_FAILED|Failed to load resource/.test(m.text()))errs.push('CONSOLE: '+m.text());});
 p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
 const step=async(n,fn)=>{try{await fn();console.log('✓ '+n);}catch(e){console.log('✗ '+n+' → '+e.message);errs.push(n+': '+e.message);}};

 await p.goto(URL);
 await p.waitForTimeout(1600);

 await step('vitrine affichée',async()=>{
   if(!await p.isVisible('#s-vitrine'))throw new Error('vitrine cachée');
 });
 await step('inscription → onboarding',async()=>{
   await p.click('text=Ouvrir mon bar');
   await p.waitForSelector('#s-onboard.on');
   if(!(await p.$$('#ob-pays-lst .pays-it')).length)throw new Error('liste pays vide');
 });
 await step('étape pays → type',async()=>{
   await p.click('#ob-pays-lst .pays-it >> nth=0');
   await p.click('#obs1 .btn-ob');
   await p.waitForSelector('#obs2.on');
   await p.click('#ob-type-grid .sec-btn >> nth=0');
   await p.click('#obs2 .btn-ob');
   await p.waitForSelector('#obs3.on');
 });
 await step('étape identité → PIN',async()=>{
   await p.fill('#ob-nom','Bar Test');
   await p.fill('#ob-tel','690112233');
   await p.click('#obs3 .btn-ob');
   await p.waitForSelector('#obs4.on');
   const recap=await p.textContent('#ob-recap');
   if(!recap.includes('Bar Test'))throw new Error('récap sans nom');
 });
 await step('création du bar',async()=>{
   await p.fill('#ob-pin','1234');await p.fill('#ob-pin2','1234');
   await p.click('text=🍻 Ouvrir mon bar');
   await p.waitForSelector('#s-service.on',{timeout:4000});
   const n=(await p.$$('#svc-grid .tcard')).length;
   if(n<12)throw new Error('tables créées: '+n);
   console.log('   tables: '+n);
 });
 await step('ouvrir une table et servir',async()=>{
   await p.click('#svc-grid .tcard >> nth=0');
   await p.waitForSelector('#s-addition.on');
   await p.click('text=+ Ajouter');
   await p.waitForSelector('#s-menu.on');
   const cards=await p.$$('#menu-grid .pcard');
   if(!cards.length)throw new Error('carte vide');
   console.log('   produits sur la carte: '+cards.length);
   await cards[0].click();await cards[0].click();await cards[1].click();
   const t=await p.textContent('#menu-ctot');
   console.log('   total après 3 taps: '+t);
   if(t.trim()==='F 0')throw new Error('total resté à zéro');
 });
 await step('retour addition + quantité',async()=>{
   await p.click('text=✓ Terminé');
   await p.waitForSelector('#s-addition.on');
   const lignes=(await p.$$('#add-lignes .row')).length;
   if(lignes<2)throw new Error('lignes: '+lignes);
   await p.click('#add-lignes .row >> nth=0 >> .qb.plus');
   const nb=await p.textContent('#add-nb');
   console.log('   articles: '+nb);
 });
 await step('encaissement espèces + monnaie',async()=>{
   await p.click('#add-bar .cpill');
   await p.waitForSelector('#ov.on');
   await p.fill('#pay-recu','10000');
   const mo=await p.textContent('#pay-monnaie');
   console.log('   monnaie rendue: '+mo);
   if(mo==='—')throw new Error('monnaie non calculée');
   await p.click('#pay-ok');
   await p.waitForSelector('text=encaissés',{timeout:3000});
   await p.click('text=Retour aux tables');
   await p.waitForSelector('#s-service.on');
   await p.waitForTimeout(900);            // la recette monte en 520 ms
   const ca=await p.textContent('#sv-ca');
   console.log('   recette du soir: '+ca);
   if(ca.trim()==='F 0')throw new Error('recette non enregistrée');
 });
 await step('stock : vidanges créées, appro',async()=>{
   await p.click('.scr.on .bnav .ni >> nth=1');
   await p.waitForSelector('#s-stock.on');
   await p.click('.scr.on button[onclick="ouvrirVidanges()"]');
   await p.waitForSelector('#ov.on');
   const txt=await p.textContent('#ovb');
   console.log('   '+(txt.match(/\d+ bouteille\(s\)[^·]*· [^\n]{0,18}/)||['(aucune vidange)'])[0].trim());
   await p.click('.bcl');
   await p.click('.scr.on button[onclick="ouvrirAppro()"]');
   await p.waitForSelector('#ap-p');
   await p.fill('#ap-c','2');await p.fill('#ap-pc','8400');
   await p.click('text=+ Ajouter au bon');
   await p.click('text=✅ Valider le bon');
   await p.waitForTimeout(300);
   const r=await p.textContent('#stk-resume');
   console.log('   '+r.replace(/\s+/g,' ').slice(0,90));
 });
 await step('mise au frais',async()=>{
   await p.click('#stk-lst .row >> nth=0');
   await p.waitForSelector('#ov.on');
   await p.click('text=🧊 Mettre au frais');
   await p.fill('#fr-q','12');
   await p.click('text=Transférer au frigo');
   await p.waitForTimeout(300);
 });
 await step('rapports',async()=>{
   await p.click('.scr.on .bnav .ni >> nth=2');
   await p.waitForSelector('#s-rapports.on');
   const c=await p.textContent('#rpt-cont');
   if(c.includes('Rien sur cette période'))throw new Error('rapport vide après une vente');
   console.log('   '+c.replace(/\s+/g,' ').slice(0,100));
 });
 await step('clôture du service',async()=>{
   await p.click('.scr.on button[onclick="ouvrirCloture()"]');
   await p.waitForSelector('#cl-compte');
   await p.fill('#cl-compte','5000');
   const e=await p.textContent('#cl-ecart');
   console.log('   écart annoncé: '+e);
   await p.click('text=🌙 Clôturer le service');
   await p.waitForTimeout(400);
 });
 await step('déconnexion / reconnexion patron',async()=>{
   await p.click('.scr.on .bnav .ni >> nth=0');
   await p.click('.scr.on button[onclick="logout()"]');
   await p.waitForSelector('#s-login.on');
   await p.fill('#p-pin','1234');
   await p.click('text=Connexion 👑');
   await p.waitForSelector('#s-service.on',{timeout:3000});
 });
 await step('démo',async()=>{
   await p.evaluate(()=>{localStorage.clear();});
   await p.reload();await p.waitForTimeout(1500);
   await p.click("text=Voir une soirée d'exemple");
   await p.waitForSelector('#s-service.on',{timeout:3000});
   const ca=await p.textContent('#sv-ca'),ouv=await p.textContent('#sv-ouv');
   console.log('   démo — recette '+ca+' · en cours '+ouv);
   await p.click('.scr.on .bnav .ni >> nth=2');
   await p.waitForTimeout(300);
   const c=await p.textContent('#rpt-cont');
   if(c.includes('Rien sur cette période'))throw new Error('démo sans ventes');
 });
 await p.screenshot({path:SHOT+'shot-rapports.png'});
 await p.click('.scr.on .bnav .ni >> nth=0');await p.waitForTimeout(300);
 await p.screenshot({path:SHOT+'shot-service.png'});
 await p.click('#svc-grid .tcard >> nth=2');await p.waitForTimeout(300);
 await p.screenshot({path:SHOT+'shot-addition.png'});
 await p.click('text=+ Ajouter');await p.waitForTimeout(300);
 await p.screenshot({path:SHOT+'shot-menu.png'});

 console.log('\n--- erreurs console/page: '+errs.length+' ---');
 errs.forEach(e=>console.log('  '+e));
 await b.close();
 process.exit(errs.length?1:0);
})();
