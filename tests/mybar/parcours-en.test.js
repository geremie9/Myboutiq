const {chromium,CHROME,URL,SHOT}=require('./lib');
(async()=>{
 const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const p=await ctx.newPage();
 const errs=[];
 p.on('console',m=>{if(m.type()==='error'&&!/ERR_CERT|ERR_CONNECTION|ERR_FAILED|Failed to load resource/.test(m.text()))errs.push('CONSOLE: '+m.text());});
 p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
 const step=async(n,fn)=>{try{await fn();console.log('✓ '+n);}catch(e){console.log('✗ '+n+' → '+e.message.split('\n')[0]);errs.push(n+': '+e.message.split('\n')[0]);}};

 await p.goto(URL);await p.waitForTimeout(1600);

 await step('bascule en anglais depuis la vitrine',async()=>{
   await p.click('#vit-body >> text=🇬🇧 English');
   await p.waitForTimeout(300);
   const t=await p.textContent('.vit-tag');
   if(!/The room is full|books keep up/.test(t))throw new Error('vitrine non traduite: '+t);
 });
 await step('inscription en anglais',async()=>{
   await p.click('#vit-body >> text=Open my bar');
   await p.waitForSelector('#s-onboard.on');
   const h=await p.textContent('#obs1 .ob-step-h');
   if(!/Which country/.test(h))throw new Error('étape 1: '+h);
   const pays=await p.textContent('#ob-pays-lst .pays-it >> nth=0');
   if(!/Cameroon/.test(pays))throw new Error('pays non traduit: '+pays);
   await p.click('#ob-pays-lst .pays-it >> nth=0');
   await p.click('#obs1 .btn-ob');
   const h2=await p.textContent('#obs2 .ob-step-h');
   if(!/What kind of place/.test(h2))throw new Error('étape 2: '+h2);
   await p.click('#ob-type-grid .sec-btn >> nth=0');
   await p.click('#obs2 .btn-ob');
   await p.fill('#ob-nom','Riverside Bar');await p.fill('#ob-tel','690112233');
   await p.click('#obs3 .btn-ob');
   const rec=await p.textContent('#ob-recap');
   if(!/Starting menu/.test(rec))throw new Error('récap: '+rec);
   await p.fill('#ob-pin','1234');await p.fill('#ob-pin2','1234');
   await p.click('#ob-go');
   await p.waitForSelector('#s-service.on',{timeout:4000});
 });
 await step('tables et zones nommées en anglais',async()=>{
   const noms=await p.$$eval('#svc-grid .tcard .tc-nm span',e=>e.map(x=>x.textContent));
   const zones=await p.$$eval('#svc-grid .tcard .tc-zone',e=>[...new Set(e.map(x=>x.textContent))]);
   console.log('   tables: '+noms.slice(0,3).join(', ')+' … '+noms[noms.length-1]);
   console.log('   zones : '+zones.join(', '));
   if(!noms.includes('Takeaway'))throw new Error('pas de table Takeaway: '+noms.join('|'));
   if(!zones.includes('Indoor')||!zones.includes('Counter'))throw new Error('zones: '+zones.join('|'));
   const libre=await p.textContent('#svc-grid .tcard .tc-libre >> nth=0');
   if(!/^Free$/.test(libre.trim()))throw new Error('libre: '+libre);
 });
 await step('produits créés en anglais',async()=>{
   await p.click('#svc-grid .tcard >> nth=0');
   await p.click('.scr.on >> text=+ Add');
   await p.waitForSelector('#s-menu.on');
   const noms=await p.$$eval('#menu-grid .pnm',e=>e.map(x=>x.textContent));
   if(!noms.some(n=>/Beef brochette/.test(n)))throw new Error('produits non traduits');
   console.log('   ex.: '+noms.filter(n=>/brochette|water|fish/i.test(n)).slice(0,3).join(' · '));
   const fams=await p.$$eval('#menu-fams .tpil',e=>e.map(x=>x.textContent));
   console.log('   familles: '+fams.join(' '));
 });
 await step('servir et encaisser en anglais',async()=>{
   const c=await p.$$('#menu-grid .pcard');
   await c[0].click();await c[0].click();await c[3].click();
   await p.click('.scr.on >> text=✓ Done');
   await p.click('#add-bar .cpill');
   await p.waitForSelector('#ov.on');
   const mode=await p.textContent('#pay-modes');
   if(!/Cash/.test(mode))throw new Error('modes: '+mode);
   await p.fill('#pay-recu','10000');
   const mo=await p.textContent('#pay-monnaie');
   console.log('   change: '+mo);
   await p.click('#pay-ok');
   await p.waitForSelector('text=taken in',{timeout:3000});
   await p.click('#ovb >> text=Back to the tables');
 });
 await step('la zone Takeaway ne fabrique pas de vidange',async()=>{
   const idx=await p.$$eval('#svc-grid .tcard .tc-nm span',e=>e.findIndex(x=>x.textContent==='Takeaway'));
   await p.click('#svc-grid .tcard >> nth='+idx);
   await p.click('.scr.on >> text=+ Add');
   const c=await p.$$('#menu-grid .pcard');
   await c[0].click();await c[0].click();
   await p.click('.scr.on >> text=✓ Done');
   await p.click('#add-bar .cpill');
   await p.click('#pay-ok');
   await p.waitForTimeout(400);
   const txt=await p.textContent('#ovb');
   if(/Empties collected/.test(txt))throw new Error('des vidanges ont été comptées sur une vente à emporter');
   console.log('   aucune vidange comptée à emporter ✓');
   await p.click('#ovb >> text=Back to the tables');
 });
 await step('rapports et clôture en anglais',async()=>{
   await p.click('.scr.on .bnav .ni >> nth=2');
   await p.waitForTimeout(300);
   const r=await p.textContent('#rpt-cont');
   if(!/The essentials|Net profit/.test(r))throw new Error('rapport: '+r.slice(0,80));
   console.log('   '+r.replace(/\s+/g,' ').slice(0,95));
   await p.click('.scr.on button[onclick="ouvrirCloture()"]');
   await p.waitForSelector('#cl-compte');
   const cl=await p.textContent('#ovb');
   if(!/Cash expected in the till/.test(cl))throw new Error('clôture non traduite');
   await p.click('.bcl');
 });
 await step('rebascule en français : les noms saisis ne bougent pas',async()=>{
   await p.click('.scr.on .bnav .ni >> nth=1');
   await p.waitForTimeout(200);
   await p.click('.scr.on button[onclick="goSt()"]');
   await p.waitForTimeout(300);
   await p.click('.scr.on >> text=🇫🇷 Français');
   await p.waitForTimeout(400);
   const st=await p.textContent('#st-cont');
   if(!/Sécurité|Données/.test(st))throw new Error('paramètres non repassés en français');
   // L'écran Paramètres n'a pas de barre du bas : on en sort par « Retour ».
   await p.click('#s-settings .hbtn.hback');
   await p.waitForTimeout(300);
   await p.click('.scr.on .bnav .ni >> nth=1');
   await p.waitForTimeout(300);
   const noms=await p.$$eval('#stk-lst .row-t',e=>e.map(x=>x.textContent));
   if(!noms.some(n=>/Beef brochette/.test(n)))throw new Error("les produits ont été retraduits — ils appartiennent au patron");
   console.log('   produits toujours en anglais après bascule ✓');
   const filtres=await p.$$eval('#stk-filtres .tpil',e=>e.map(x=>x.textContent));
   if(!/Tout/.test(filtres[0]))throw new Error('filtres: '+filtres.join('|'));
   console.log('   interface repassée en français ✓ ('+filtres.slice(0,3).join(' ')+')');
 });
 await p.screenshot({path:SHOT+'en-stock.png'});
 console.log('\n--- erreurs: '+errs.length+' ---');errs.forEach(e=>console.log('  '+e));
 await b.close();process.exit(errs.length?1:0);
})();
