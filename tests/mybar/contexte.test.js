/* MyBar vu depuis un pays, pas depuis le Cameroun : billets, marques, opérateurs de
   paiement mobile, heure de bascule du jour. Les coupures et les opérateurs ont été
   vérifiés à la source (banques centrales, régulateurs, presse) ; les marques le sont
   pour les pays où une source les confirme, les autres reçoivent des noms génériques. */
const {chromium,CHROME,URL}=require('./lib');

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
 const creerBarDans=async(p,codePays,nom,tel)=>{
   await p.click('text=Ouvrir mon bar');await p.waitForSelector('#s-onboard.on');
   await p.evaluate(c=>{obPays=PAYS.filter(x=>x.c===c)[0];majIndicatif();},codePays);
   await p.click('#obs1 .btn-ob');
   await p.click('#ob-type-grid .sec-btn >> nth=0');await p.click('#obs2 .btn-ob');
   await p.fill('#ob-nom',nom);await p.fill('#ob-tel',tel||'690112233');await p.click('#obs3 .btn-ob');
   await p.fill('#ob-pin','1234');await p.fill('#ob-pin2','1234');
   await p.click('text=🍻 Ouvrir mon bar');await p.waitForSelector('#s-service.on',{timeout:8000});
 };

 const {ctx,p}=await neuf();

 await step('chaque pays a ses coupures, croissantes, et les billets proposés sont des billets de ce pays',async()=>{
   const r=await p.evaluate(()=>PAYS.map(x=>({c:x.c,bil:x.bil,ok:Array.isArray(x.bil)&&x.bil.length>=3&&x.bil.every((v,i,a)=>i===0||v>a[i-1])})));
   const mauvais=r.filter(x=>!x.ok).map(x=>x.c);
   if(mauvais.length)throw new Error('coupures absentes ou mal rangées : '+mauvais);
 });
 await step('la zone CFA propose les billets CFA',async()=>{
   const r=await p.evaluate(()=>({cm:billetsProposes(1000,PAYS.filter(x=>x.c==='CM')[0]),ci:billetsProposes(10800,PAYS.filter(x=>x.c==='CI')[0])}));
   if(JSON.stringify(r.cm)!=='[1000,2000,5000,10000]')throw new Error('CM 1000 → '+JSON.stringify(r.cm));
   if(JSON.stringify(r.ci)!=='[10800,11000,12000,15000,20000]')throw new Error('CI 10800 → '+JSON.stringify(r.ci));
 });
 await step('Kenya, Afrique du Sud, Ghana, Maroc, Nigeria : on propose ce que le client tend vraiment',async()=>{
   const r=await p.evaluate(()=>{const g=c=>PAYS.filter(x=>x.c===c)[0];
     return {ke:billetsProposes(210,g('KE')),za:billetsProposes(31,g('ZA')),gh:billetsProposes(25,g('GH')),ma:billetsProposes(16,g('MA')),ng:billetsProposes(2600,g('NG')),cd:billetsProposes(4500,g('CD'))};});
   console.log('    '+JSON.stringify(r));
   if(!r.ke.includes(500)&&!r.ke.includes(250))throw new Error('KE 210 : '+r.ke);
   if(!r.za.includes(50))throw new Error('ZA 31 : pas de R50 → '+r.za);
   if(!r.gh.includes(50))throw new Error('GH 25 : pas de GH₵50 → '+r.gh);
   if(!r.ma.includes(20))throw new Error('MA 16 : pas de 20 DH → '+r.ma);
   if(r.ng.some(v=>v===5000||v===10000||v===2000))throw new Error('NG propose un billet inexistant : '+r.ng);
   if(!r.cd.includes(5000))throw new Error('CD 4500 : pas de 5 000 FC → '+r.cd);
 });

 await step('aucune marque camerounaise hors d’Afrique centrale',async()=>{
   const r=await p.evaluate(()=>{
     const interdit=/33 Export|Kadji|Isenbeck|Booster|Doppel Munich|Beaufort|Djino|XXL Energy|Top (Ananas|Grenadine)/;
     const out={};
     PAYS.forEach(pa=>{
       const noms=carteDuType(TYPES[0],pa).map(x=>x.n);
       out[pa.c]={n:noms.length,biere:carteDuType(TYPES[0],pa).filter(x=>x.f==='biere').length,mauvais:noms.filter(n=>interdit.test(n))};
     });return out;});
   const centrale=['CM','GA','CG','TD','CF'];
   const fautifs=Object.keys(r).filter(c=>centrale.indexOf(c)<0&&r[c].mauvais.length);
   if(fautifs.length)throw new Error('marques camerounaises en '+fautifs.map(c=>c+' ('+r[c].mauvais.join(', ')+')'));
   const sansBiere=Object.keys(r).filter(c=>r[c].biere<2);
   if(sansBiere.length)throw new Error('moins de 2 bières en : '+sansBiere);
   console.log('    bières par pays : '+Object.keys(r).map(c=>c+':'+r[c].biere).join(' '));
 });
 await step('le Cameroun garde sa carte, et les bières du pays passent en premier',async()=>{
   const r=await p.evaluate(()=>{
     const cm=carteDuType(TYPES[0],PAYS.filter(x=>x.c==='CM')[0]).map(x=>x.n);
     const ke=carteDuType(TYPES[0],PAYS.filter(x=>x.c==='KE')[0]);
     const ng=carteDuType(TYPES[0],PAYS.filter(x=>x.c==='NG')[0]);
     return {cm33:cm.some(n=>/33 Export/.test(n)),kePremier:ke[0].n,ngPremier:ng[0].n,
             keBieresDabord:ke.slice(0,6).every(x=>x.f==='biere'),demo:carteDuType(TYPES[0]).some(x=>/33 Export/.test(x.n))};});
   if(!r.cm33)throw new Error('le Cameroun a perdu 33 Export');
   if(!r.demo)throw new Error('la démo (sans pays) a perdu sa carte');
   if(!/Tusker/.test(r.kePremier))throw new Error('Kenya : premier produit '+r.kePremier);
   if(!/Star/.test(r.ngPremier))throw new Error('Nigeria : premier produit '+r.ngPremier);
   if(!r.keBieresDabord)throw new Error('les bières ne sont pas en tête');
   console.log('    Kenya → '+r.kePremier+' · Nigeria → '+r.ngPremier);
 });
 await step('chaque produit de départ a une marge positive dans chaque monnaie',async()=>{
   const r=await p.evaluate(()=>{const mauvais=[];
     PAYS.forEach(pa=>carteDuType(TYPES[0],pa).forEach(x=>{
       const pv=arrondi(x.pv,pa.k),pa_=arrondi(x.pa,pa.k);
       if(!(pv>pa_))mauvais.push(pa.c+' '+x.n+' '+pa_+'→'+pv);}));
     return mauvais;});
   if(r.length)throw new Error(r.slice(0,6).join(' | ')+(r.length>6?' … ('+r.length+')':''));
 });
 await step('les noms bilingues existent (aucun produit ne reste sans nom anglais)',async()=>{
   const r=await p.evaluate(()=>{const m=[];PAYS.forEach(pa=>carteDuType(TYPES[0],pa).forEach(x=>{if(!x.e2)m.push(pa.c+' '+x.n);}));return m;});
   if(r.length)throw new Error(r.slice(0,4).join(', '));
 });
 await ctx.close();

 // ── un bar kényan, de bout en bout ───────────────────────────────
 {
  const {ctx,p}=await neuf();
  await creerBarDans(p,'KE','Kenya Bar');
  await step('à la création, la carte est kényane et le bar garde les opérateurs de son pays',async()=>{
    const r=await p.evaluate(()=>({pays:DB.cfg.pays,ops:DB.cfg.mmOps,premier:DB.produits[0].nm,
      mauvais:DB.produits.filter(x=>/33 Export|Kadji|Isenbeck/.test(x.nm)).length,pvTusker:DB.produits[0].pv,bascule:DB.cfg.basculeH}));
    if(r.pays!=='KE'||!/Tusker/.test(r.premier))throw new Error(JSON.stringify(r));
    if(r.mauvais)throw new Error('marques camerounaises dans un bar kényan');
    if(JSON.stringify(r.ops)!=='["M-Pesa","Airtel Money"]')throw new Error('opérateurs : '+JSON.stringify(r.ops));
    console.log('    '+r.premier+' à '+r.pvTusker+' KSh');
  });
  await step('l’inscription dit que les prix de départ sont indicatifs',async()=>{
    await p.evaluate(()=>{goScreen('s-onboard');obEtape=4;majRecap();});
    const t=await p.textContent('#ob-recap');
    if(!/INDICATIFS|indicatifs/.test(t))throw new Error('pas de mention');
  });
  await step('encaisser en M-Pesa : l’opérateur se choisit, se mémorise, et se retrouve au rapport et à la clôture',async()=>{
    await p.evaluate(()=>{navTo('service');});
    await p.click('#svc-grid .tcard >> nth=0');await p.waitForSelector('#s-addition.on');
    await p.click('text=+ Ajouter');await p.waitForSelector('#s-menu.on');
    const c=await p.$$('#menu-grid .pcard');await c[0].click();await c[0].click();
    await p.click('#menu-benc');await p.waitForSelector('#s-addition.on');
    await p.click('#add-bar .cpill');await p.waitForSelector('#pay-ok');
    await p.click('#pay-modes .chip:nth-child(2)');await p.waitForSelector('#pay-ops');
    const ops=await p.$$eval('#pay-ops .chip',l=>l.map(x=>x.textContent));
    if(JSON.stringify(ops)!=='["M-Pesa","Airtel Money"]')throw new Error('puces : '+JSON.stringify(ops));
    await p.click('#pay-ops .chip:nth-child(2)');                          // Airtel Money
    await p.click('#pay-ok');await p.waitForTimeout(400);
    const v=await p.evaluate(()=>DB.ventes[DB.ventes.length-1]);
    if(v.mode!=='mm'||v.op!=='Airtel Money')throw new Error('vente : '+JSON.stringify({m:v.mode,op:v.op}));
    if(await p.evaluate(()=>DB.cfg.dernierOp)!=='Airtel Money')throw new Error('dernier opérateur non mémorisé');
    await p.evaluate(()=>fermerModal());
    await p.evaluate(()=>{vuePeriode='tout';navTo('rapports');});await p.waitForSelector('#s-rapports.on');
    const rap=await p.textContent('#rpt-cont');
    if(!/Airtel Money/.test(rap))throw new Error('l’opérateur n’apparaît pas dans Rapports');
    await p.evaluate(()=>ouvrirCloture());await p.waitForSelector('#ov.on');
    const clo=await p.textContent('#ovb');
    if(!/Airtel Money.*portefeuille/.test(clo))throw new Error('la clôture ne dit pas quoi vérifier sur le portefeuille');
    await p.evaluate(()=>fermerModal());
  });
  await step('le dernier opérateur est déjà sélectionné à l’encaissement suivant',async()=>{
    await p.evaluate(()=>{navTo('service');});
    await p.click('#svc-grid .tcard >> nth=1');await p.waitForSelector('#s-addition.on');
    await p.click('text=+ Ajouter');await p.waitForSelector('#s-menu.on');
    const c=await p.$$('#menu-grid .pcard');await c[0].click();
    await p.click('#menu-benc');await p.waitForSelector('#s-addition.on');
    await p.click('#add-bar .cpill');await p.waitForSelector('#pay-ok');
    await p.click('#pay-modes .chip:nth-child(2)');await p.waitForSelector('#pay-ops');
    const on=await p.$$eval('#pay-ops .chip.on',l=>l.map(x=>x.textContent));
    if(JSON.stringify(on)!=='["Airtel Money"]')throw new Error('présélection : '+JSON.stringify(on));
    await p.evaluate(()=>fermerModal());
  });
  await step('le patron règle sa liste d’opérateurs ; vide, le paiement mobile reste un seul compte',async()=>{
    await p.evaluate(()=>{moi=DB.equipe[0];goSt();});await p.waitForSelector('#s-settings.on');
    await p.fill('#se-ops','Equitel, M-Pesa, equitel ,  T-Kash');
    await p.evaluate(()=>sauverOps());
    const o=await p.evaluate(()=>DB.cfg.mmOps);
    if(JSON.stringify(o)!=='["Equitel","M-Pesa","T-Kash"]')throw new Error('liste : '+JSON.stringify(o));
    await p.fill('#se-ops','');await p.evaluate(()=>sauverOps());
    if(await p.evaluate(()=>mmOps().length))throw new Error('liste vide non respectée');
    // la vente s'encaisse toujours, sans puces
    await p.evaluate(()=>{navTo('service');});
    await p.click('#svc-grid .tcard >> nth=1');await p.waitForSelector('#s-addition.on');
    await p.click('text=+ Ajouter');await p.waitForSelector('#s-menu.on');
    const c=await p.$$('#menu-grid .pcard');await c[0].click();
    await p.click('#menu-benc');await p.waitForSelector('#s-addition.on');
    await p.click('#add-bar .cpill');await p.waitForSelector('#pay-ok');
    await p.click('#pay-modes .chip:nth-child(2)');await p.waitForTimeout(200);
    if(await p.isVisible('#pay-ops'))throw new Error('des puces malgré une liste vide');
    await p.click('#pay-ok');await p.waitForTimeout(300);
    const v=await p.evaluate(()=>DB.ventes[DB.ventes.length-1]);
    if(v.mode!=='mm'||v.op!=='')throw new Error('vente : '+JSON.stringify({m:v.mode,op:v.op}));
    await p.evaluate(()=>fermerModal());
  });
  await ctx.close();
 }

 // ── Nigeria et Afrique du Sud : le mot « Mobile Money » n'est pas le bon ──
 {
  const {ctx,p}=await neuf();
  await creerBarDans(p,'NG','Lagos Bar','8031234567');
  await step('au Nigeria, le mode s’appelle « Virement / POS » et propose OPay, PalmPay, Moniepoint',async()=>{
    const r=await p.evaluate(()=>({lib:modeLib(MODES.filter(m=>m.c==='mm')[0]),ops:mmOps(),billets:billetsProposes(2600)}));
    if(!/Virement \/ POS/.test(r.lib))throw new Error('libellé : '+r.lib);
    for(const o of ['OPay','PalmPay','Moniepoint'])if(r.ops.indexOf(o)<0)throw new Error('manque '+o);
    if(r.billets.some(v=>v===5000||v===10000))throw new Error('billet inexistant : '+r.billets);
    await p.evaluate(()=>setLang('en',true));
    const en=await p.evaluate(()=>modeLib(MODES.filter(m=>m.c==='mm')[0]));
    if(!/Transfer \/ POS/.test(en))throw new Error('anglais : '+en);
  });
  await ctx.close();
 }

 // ── l'heure de bascule du jour ───────────────────────────────────
 {
  const {ctx,p}=await neuf();
  await creerBarDans(p,'CM','Bar Aube');
  const jourDe=(h)=>p.evaluate(h=>{const d=new Date();d.setHours(h,30,0,0);return jourService(d.getTime())===jour(d.getTime());},h);
  await step('par défaut, le jour change à 6 h (comportement inchangé)',async()=>{
    if(await p.evaluate(()=>heureBascule())!==6)throw new Error('défaut ≠ 6');
    if(!(await jourDe(7)))throw new Error('7 h devrait être le jour même');
    if(await jourDe(5))throw new Error('5 h devrait compter pour la veille');
  });
  await step('à 10 h : une vente à 8 h compte encore pour le soir d’avant',async()=>{
    await p.evaluate(()=>{moi=DB.equipe[0];goSt();});await p.waitForSelector('#s-settings.on');
    await p.fill('#se-bascule','10');await p.evaluate(()=>sauverBascule());
    if(await p.evaluate(()=>DB.cfg.basculeH)!==10)throw new Error('réglage non enregistré');
    if(await jourDe(8))throw new Error('8 h devrait compter pour la veille');
    if(!(await jourDe(11)))throw new Error('11 h devrait être le jour même');
  });
  await step('à 0 h : minuit, comme dans un commerce ordinaire',async()=>{
    await p.fill('#se-bascule','0');await p.evaluate(()=>sauverBascule());
    if(!(await jourDe(1)))throw new Error('1 h devrait être le jour même');
  });
  await step('une valeur absurde est refusée, l’ancienne reste',async()=>{
    for(const v of ['12','-1','abc','']){
      await p.fill('#se-bascule',v);await p.evaluate(()=>sauverBascule());
      if(await p.evaluate(()=>DB.cfg.basculeH)!==0)throw new Error('« '+v+' » a été accepté');
    }
  });
  await step('un bar plus ancien, sans réglage, garde 6 h',async()=>{
    await p.evaluate(()=>{delete DB.cfg.basculeH;delete DB.cfg.mmOps;save();});
    if(await p.evaluate(()=>heureBascule())!==6)throw new Error('pas de repli sur 6');
    const ops=await p.evaluate(()=>mmOps());
    if(JSON.stringify(ops)!=='["Orange Money","MTN MoMo"]')throw new Error('pas de repli sur les opérateurs du pays : '+JSON.stringify(ops));
  });
  await ctx.close();
 }

 await b.close();
 console.log('\n--- échecs: '+errs.length+' ---');
 process.exit(errs.length?1:0);
})();
