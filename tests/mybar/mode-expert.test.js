const {chromium,CHROME,URL,SHOT}=require('./lib');
(async()=>{
 const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'fr-FR'});
 const p=await ctx.newPage();
 const errs=[];
 p.on('console',m=>{if(m.type()==='error'&&!/CERT|ERR_FAILED/.test(m.text()))errs.push('CONSOLE: '+m.text());});
 p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
 const step=async(n,fn)=>{try{await fn();console.log('OK  '+n);}catch(e){console.log('KO  '+n+' -> '+e.message);errs.push(n+': '+e.message);}};
 const ecran=async()=>p.getAttribute('.scr.on','id');
 const navs=async()=>p.$$eval('.scr.on .bnav .ni .nl',l=>l.map(x=>x.textContent));
 // rentrer dans l'app comme le fait un patron le matin
 const ouvrir=async()=>{
   await p.reload();await p.waitForTimeout(1300);
   await p.fill('#p-pin','1234');
   await p.click('#lg-patron button');
   await p.waitForTimeout(700);
 };
 const reglages=async()=>{await p.click('.scr.on .hrgt .hbtn[onclick="goSt()"]');await p.waitForSelector('#s-settings.on');};
 const basculer=async(txt)=>{
   await p.click(`.strow:has-text("${txt}") .tog`);
   await p.waitForTimeout(400);
 };

 await p.goto(URL);
 await p.waitForTimeout(1300);

 await step('inscription (bar a tables)',async()=>{
   await p.click('text=Ouvrir mon bar');
   await p.waitForSelector('#s-onboard.on');
   await p.click('#ob-pays-lst .pays-it >> nth=0');await p.click('#obs1 .btn-ob');
   await p.click('#ob-type-grid .sec-btn >> nth=0');await p.click('#obs2 .btn-ob');
   await p.fill('#ob-nom','Bar Expert');await p.fill('#ob-tel','690112233');await p.click('#obs3 .btn-ob');
   await p.fill('#ob-pin','1234');await p.fill('#ob-pin2','1234');
   await p.click('text=🍻 Ouvrir mon bar');
   await p.waitForSelector('#s-service.on',{timeout:5000});
 });
 await step('onglets par defaut',async()=>{
   const n=await navs();console.log('    '+n.join(' · '));
   if(n.join(',')!=='Service,Stock,Rapports,Équipe')throw new Error(''+n);
 });

 await step('poste « stock » : ce telephone ouvre sur la cave',async()=>{
   await reglages();
   await p.click('text=📦 Le stock');await p.waitForTimeout(300);
   await ouvrir();
   const n=await navs();console.log('    '+await ecran()+' — '+n.join(' · '));
   if(await ecran()!=='s-stock')throw new Error('ecran '+await ecran());
   if(n[0]!=='Stock')throw new Error(''+n);
 });
 await step('poste « comptoir » : ce telephone ouvre sur la carte',async()=>{
   await reglages();
   await p.click('text=🍺 Le comptoir');await p.waitForTimeout(300);
   await ouvrir();
   const n=await navs();
   console.log('    '+await ecran()+' — '+n.join(' · ')+' — titre: '+await p.textContent('#menu-tit')+' — '+await p.textContent('#menu-benc'));
   if(await ecran()!=='s-menu')throw new Error('ecran '+await ecran());
   if(n.join(',')!=='Comptoir,Service,Stock,Équipe')throw new Error(''+n);
   if(!/comptoir/i.test(await p.textContent('#menu-tit')))throw new Error('titre');
   if(!await p.isVisible('#menu-st'))throw new Error('pas de reglages au comptoir');
   if(await p.isVisible('#menu-back'))throw new Error('bouton retour affiche au comptoir');
 });
 await step('vente au comptoir : servir puis encaisser',async()=>{
   const c=await p.$$('#menu-grid .pcard');
   if(!c.length)throw new Error('carte vide');
   await c[0].click();await c[0].click();
   if((await p.textContent('#menu-ctot')).trim()==='F 0')throw new Error('total a zero');
   await p.click('#menu-benc');
   await p.waitForSelector('#pay-ok',{timeout:3000});
   await p.click('#pay-ok');await p.waitForTimeout(500);
   const t=(await p.textContent('#ovb')).replace(/\s+/g,' ');
   console.log('    '+t.slice(0,70));
   if(!/Vente suivante/.test(t))throw new Error('pas de « vente suivante »');
   await p.click('text=Vente suivante');await p.waitForTimeout(400);
   if((await p.textContent('#menu-ctot')).trim()!=='F 0')throw new Error('ticket non remis a zero');
   const v=await p.evaluate(()=>DB.ventes.length);
   console.log('    ventes enregistrees: '+v);
   if(!v)throw new Error('vente non enregistree');
 });
 await step('le comptoir ne laisse pas de table ouverte',async()=>{
   const o=await p.evaluate(()=>DB.tables.filter(t=>t.lignes&&t.lignes.length).length);
   if(o)throw new Error(o+' table(s) encore ouverte(s)');
 });

 await step('eteindre les tables : plus de plan de salle',async()=>{
   await p.click('#menu-st');await p.waitForSelector('#s-settings.on');
   await basculer('Service à table');
   if(await p.isVisible('.rcard:has-text("🪑 Les tables (")'))throw new Error('carte des tables encore la');
   if(await p.isVisible('.rcard:has-text("Ce téléphone sert à")'))throw new Error('carte du poste encore la');
   await ouvrir();
   const n=await navs();console.log('    '+await ecran()+' — '+n.join(' · '));
   if(n.join(',')!=='Comptoir,Stock,Rapports,Équipe')throw new Error(''+n);
 });
 await step('eteindre les vidanges : le ♻️ quitte le stock',async()=>{
   await p.click('.scr.on .hrgt .hbtn[onclick="goSt()"]');await p.waitForSelector('#s-settings.on');
   await basculer('Vidanges consignées');
   await p.click('#s-settings .hback');await p.waitForTimeout(400);
   await p.click('.scr.on .bnav .ni >> nth=1');
   await p.waitForSelector('#s-stock.on');
   if(await p.isVisible('#stk-vid'))throw new Error('bouton ♻️ encore visible');
   const fl=await p.$$eval('#stk-filtres .tpil',l=>l.map(x=>x.textContent));
   console.log('    filtres: '+fl.join(' '));
   if(fl.some(x=>/Vidanges/.test(x)))throw new Error('filtre vidanges encore la');
 });
 await step('eteindre la cuisine : la famille quitte la carte',async()=>{
   await p.click('.scr.on .hrgt .hbtn[onclick="goSt()"]');await p.waitForSelector('#s-settings.on');
   await basculer('Cuisine');
   await p.click('#s-settings .hback');await p.waitForTimeout(400);
   await p.click('.scr.on .bnav .ni >> nth=0');
   await p.waitForSelector('#s-menu.on');
   const fam=await p.$$eval('#menu-fams .tpil',l=>l.map(x=>x.textContent));
   console.log('    familles: '+fam.join(' '));
   if(fam.some(x=>/Cuisine/.test(x)))throw new Error('cuisine encore la');
 });
 await step('eteindre l’equipe : l’onglet devient Clients',async()=>{
   await p.click('#menu-st');await p.waitForSelector('#s-settings.on');
   await basculer('Plusieurs personnes');
   await p.click('#s-settings .hback');await p.waitForTimeout(400);
   const n=await navs();console.log('    '+n.join(' · '));
   if(!n.includes('Clients'))throw new Error(''+n);
   await p.click('.scr.on .bnav .ni >> nth=3');
   await p.waitForSelector('#s-equipe.on');
   if((await p.$$('#eq-onglets .tpil')).length)throw new Error('sous-onglets encore la');
   console.log('    en-tete: '+await p.textContent('#eq-hn'));
 });
 await step('tout tient apres rechargement',async()=>{
   await ouvrir();
   const n=await navs();console.log('    '+await ecran()+' — '+n.join(' · '));
   if(await ecran()!=='s-menu')throw new Error('ecran '+await ecran());
   if(n.join(',')!=='Comptoir,Stock,Rapports,Clients')throw new Error(''+n);
 });
 await step('le poste ne part pas dans la sauvegarde',async()=>{
   const j=await p.evaluate(()=>JSON.stringify(DB));
   if(/mybar_poste|"poste"/.test(j))throw new Error('le poste est dans la base');
   const f=await p.evaluate(()=>JSON.stringify(DB.cfg.forme));
   console.log('    cfg.forme = '+f);
 });
 await p.screenshot({path:SHOT+'x-comptoir.png'});
 await p.click('#menu-st');await p.waitForTimeout(500);
 await p.evaluate(()=>{var e=document.querySelector('.rcard .rct');});
 await p.screenshot({path:SHOT+'x-reglages.png',fullPage:true});

 console.log('\n--- erreurs: '+errs.length+' ---');errs.forEach(e=>console.log('  '+e));
 await b.close();
})();
