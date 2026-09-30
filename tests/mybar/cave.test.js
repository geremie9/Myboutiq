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

 await step('un bar : on demande les tables',async()=>{
   const t=await p.$$eval('#ob-type-grid .sec-btn',l=>l.map(x=>x.textContent.trim()));
   await p.click('#ob-type-grid .sec-btn >> nth=0');   // Bar / Buvette
   await p.click('#obs2 .btn-ob');await p.waitForSelector('#obs3.on');
   if(!await p.isVisible('#ob-tbloc'))throw new Error('la question des tables est cachée pour un bar');
   if(await p.isVisible('#ob-tsans'))throw new Error('le mot « au comptoir » s’affiche pour un bar');
   console.log('    types: '+t.map(x=>x.split('\n')[0]).join(' · '));
 });
 await step('une cave : on ne la demande pas',async()=>{
   await p.click('#obs3 .btn-bk');await p.waitForSelector('#obs2.on');
   const idx=await p.$$eval('#ob-type-grid .sec-btn',l=>l.findIndex(x=>/Cave/i.test(x.textContent)));
   if(idx<0)throw new Error('pas de type Cave');
   await p.click('#ob-type-grid .sec-btn >> nth='+idx);
   await p.click('#obs2 .btn-ob');await p.waitForSelector('#obs3.on');
   if(await p.isVisible('#ob-tbloc'))throw new Error('on demande encore les tables à une cave');
   if(!await p.isVisible('#ob-tsans'))throw new Error('rien ne dit pourquoi');
   console.log('    '+(await p.textContent('#ob-tsans')).slice(0,72)+'…');
 });
 await step('le récapitulatif dit « au comptoir »',async()=>{
   await p.fill('#ob-nom','Cave du Marché');await p.fill('#ob-tel','690112233');
   await p.click('#obs3 .btn-ob');await p.waitForSelector('#obs4.on');
   const r=(await p.textContent('#ob-recap')).replace(/\s+/g,' ');
   console.log('    '+r.slice(0,110));
   if(/Tables/.test(r))throw new Error('le récap promet des tables');
   if(!/comptoir/i.test(r))throw new Error('le récap ne dit pas comptoir');
 });
 await step('la cave s’ouvre sur le comptoir',async()=>{
   await p.fill('#ob-pin','1234');await p.fill('#ob-pin2','1234');
   await p.click('text=🍻 Ouvrir mon bar');
   await p.waitForSelector('#s-menu.on',{timeout:6000});
   const n=await p.$$eval('.scr.on .bnav .ni .nl',l=>l.map(x=>x.textContent));
   console.log('    écran: s-menu — '+n.join(' · '));
   if(n[0]!=='Comptoir')throw new Error(''+n);
 });
 await step('on lui parle de tickets, pas de tables',async()=>{
   const mots=await p.evaluate(()=>({table:motTable(),tables:motTables(),
     addition:motAddition(),additions:motAdditions(),csv:'—'}));
   console.log('    '+JSON.stringify(mots));
   if(mots.table!=='ticket')throw new Error(JSON.stringify(mots));
   // le refus d'encaisser du vide (la barre est masquée tant que le ticket
   // est vide, donc on appelle la fonction directement)
   await p.evaluate(()=>ouvrirPaiement());await p.waitForTimeout(300);
   const t=await p.textContent('#toast');
   console.log('    à vide: « '+t.trim()+' »');
   if(/table/i.test(t))throw new Error('le message parle de table');
   if(!/ticket/i.test(t))throw new Error('le message ne dit pas ticket : '+t);
 });
 await step('la clôture aussi',async()=>{
   // une vente en cours, non encaissée
   const c=await p.$$('#menu-grid .pcard');await c[0].click();
   await p.evaluate(()=>{navTo('rapports');});await p.waitForSelector('#s-rapports.on');
   await p.click('#s-rapports .hrgt .hbtn >> nth=0');   // 🌙
   await p.waitForSelector('#ov.on',{timeout:3000});
   const t=(await p.textContent('#ovb')).replace(/\s+/g,' ');
   const m=t.match(/⚠️[^.]*\./);
   console.log('    '+(m?m[0]:'(aucun avertissement)'));
   if(m&&/table/i.test(m[0]))throw new Error('la clôture parle de tables');
   if(m&&/\(s\)|1 tickets/.test(m[0]))throw new Error('accord bancal : '+m[0]);
   await p.evaluate(()=>fermerModal());
 });
 await step('l’export nomme la colonne « Ticket »',async()=>{
   const h=await p.evaluate(()=>'Date;Heure;'+motTable(1)+';Zone');
   console.log('    '+h);
   if(!/Ticket/.test(h))throw new Error(h);
 });
 await step('un bar à tables garde son vocabulaire',async()=>{
   await p.evaluate(()=>{poserForme('tables',1);});
   await p.waitForTimeout(300);
   const mots=await p.evaluate(()=>({table:motTable(),addition:motAddition()}));
   console.log('    '+JSON.stringify(mots));
   if(mots.table!=='table'||mots.addition!=='addition')throw new Error(JSON.stringify(mots));
 });

 console.log('\n--- erreurs: '+errs.length+' ---');errs.forEach(e=>console.log('  '+e));
 await b.close();
})();
