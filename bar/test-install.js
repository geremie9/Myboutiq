const {chromium}=require('/tmp/claude-0/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 async function essai(titre,prep,url){
   const ctx=await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
   const p=await ctx.newPage();
   if(prep){await p.goto(prep);await p.waitForTimeout(3500);}   // MyBoutiQ d'abord
   await p.goto(url);await p.waitForTimeout(4000);
   const man=await p.evaluate(async()=>{
     const l=document.querySelector('link[rel=manifest]');
     if(!l)return {href:'(aucun)',nom:'—'};
     try{const j=await (await fetch(l.href)).json();return {href:l.href,nom:j.name};}
     catch(e){return {href:l.href,nom:'ERREUR '+e};}
   });
   const sw=await p.evaluate(async()=>(await navigator.serviceWorker.getRegistrations())
       .map(r=>r.scope+'  ←  '+((r.active||r.installing||r.waiting||{}).scriptURL||'?')));
   const ico=await p.evaluate(()=>{const l=document.querySelector('link[rel=icon]');return l?l.href:'(aucune)';});
   console.log('\n── '+titre);
   console.log('   document   :', p.url());
   console.log('   manifeste  :', man.href);
   console.log('   >>> INSTALLERAIT :', man.nom);
   console.log('   icône      :', ico);
   console.log('   service workers :', sw.join(' | ')||'(aucun)');
   // hors ligne
   await ctx.setOffline(true);
   await p.goto(url).catch(()=>{});
   await p.waitForTimeout(1200);
   console.log('   HORS LIGNE :', await p.title());
   await ctx.close();
 }
 await essai('A. sous-domaine (bar.myboutiq.online/)',null,'http://localhost:8789/');
 await essai('B. sous-dossier (myboutiq.online/bar), MyBoutiQ visitée avant',
             'http://localhost:8788/index.html','http://localhost:8788/bar');
 await essai('C. sous-dossier, arrivée directe',null,'http://localhost:8788/bar');
 await b.close();
})();
