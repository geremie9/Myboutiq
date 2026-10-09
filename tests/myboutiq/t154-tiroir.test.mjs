// t154 — LE TIROIR : LE RAPPORT ET LA CLÔTURE DISENT LE MÊME CHIFFRE.
//
// Trouvé en préparant la page « compter sa caisse le soir » : Rapports ›
// « Espèces en caisse (à compter) » annonçait 8 200 F quand la clôture en
// attendait 2 700 (fonds de départ et dépenses payées du tiroir oubliés), et
// la consigne d'une vente payée par Orange Money était comptée en espèces.
import { chromium, serveur, RACINE } from './lib.mjs';
let ok=0,ko=0;const t=(c,m)=>{if(c){ok++;console.log('✅',m);}else{ko++;console.log('❌',m);}};
const {s,port}=await serveur();
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:390,height:800}});
const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
await p.route('**', r=>r.request().url().includes('127.0.0.1')?r.continue():r.abort());
await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(2200);
await p.evaluate(()=>{
  const A=(id,nm,px,pa,stk,extra)=>Object.assign({id,nm,e:'📦',cat:'Divers',px,pa,stk0:stk,al:0,vd:0,vr:[]},extra||{});
  DB={cfg:{lang:'fr',nom:'Ets Marie',tel:'+237677000000',pin:'123456',s:'FCFA',d:'XAF',secteur:'boutique',code:'MARI0001',plan:'gratuit',
      pays:PAYS.find(x=>x.cc==='237')||PAYS[0],venteDeverrouillee:true,premiereVenteVue:true,demarrageFini:true},
    articles:[A(1,'Bière 65 cl',650,520,48,{consigne:100}),A(2,'Riz',600,500,40),A(3,'Savon',650,500,30),A(6,'Lait',3200,2800,12)],
    boutiques:[{id:1,nm:'Ets Marie',code:'MARI0001',secteur:'boutique',actif:true,ventes:0}],boutiqueCourante:0,clients:[],
    equipe:[{id:1,nm:'Marie',role:'patron',bg:'#FFF',tc:'#000',actif:true}],fournisseurs:[],ventes:[],depenses:[],objectif:0,fondsDepart:10000,nextId:200,journal:[],stats:{}};
  role='patron';lang='fr';_suppressSync=true;_demarre=true;window.parler=()=>{};window.showToast=()=>{};lancerApp();
});
await p.waitForTimeout(700);
const vendre=(lignes,mode,cons)=>p.evaluate(async([lignes,mode,cons])=>{
  viderPanier();
  for(const [id,q] of lignes){const a=DB.articles.find(x=>x.id===id);for(let i=0;i<q;i++)addPanier(a,0);}
  if(cons)chgConsigne('prises',cons);
  procederPmt();selPmntVente(mode);
  if(mode==='especes'){document.getElementById('calc-recu').value=Math.ceil(calcAPayer()/1000)*1000;calcMonnaie(true);}
  await encaisser();document.querySelectorAll('.ov').forEach(x=>x.classList.remove('show'));
},[lignes,mode,cons||0]);
await vendre([[2,3]],'especes');          // 1 800 espèces
await vendre([[1,4]],'especes',4);        // 2 600 + 400 consigne, espèces
await vendre([[1,2]],'orange',2);         // 1 300 + 200 consigne, Orange Money
await vendre([[6,1]],'mtn');              // 3 200 MTN
await p.evaluate(()=>{
  DB.depenses.push({id:'d1',nm:'Électricité ENEO',amt:4500,cat:'elec',date:new Date().toLocaleDateString('fr-FR'),ts:new Date().toISOString(),caisse:true,vendeur:'Patron'});
  DB.depenses.push({id:'d2',nm:'Recharge',amt:1000,cat:'tel',date:new Date().toLocaleDateString('fr-FR'),ts:new Date().toISOString(),caisse:false,vendeur:'Patron'});
});
const r=await p.evaluate(()=>{
  const pb=paiementBreakdown(getCaisseSales());
  _rptPer='jour';goScreen('s-rapports');renderRpt();
  const lignes=[...document.querySelectorAll('#s-rapports .rrow')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  return {pb,att:caisseAttendue(),esp:totalEspecesJour(),lignes};
});
console.log('   ↳ '+JSON.stringify(r.pb)+' attendu '+r.att);
// Espèces : 1 800 + 2 600 + 400 = 4 800. Attendu : 10 000 + 4 800 − 4 500 = 10 300.
t(r.esp===4800&&r.pb.especes===4800, `espèces : la clôture et le rapport comptent pareil (${r.pb.especes} / ${r.esp})`);
t(r.pb.orange===1500, `⚠️ la consigne payée par Orange Money est sur la ligne Orange Money (${r.pb.orange}), plus dans le tiroir`);
t(r.pb.mtn===3200,'MTN MoMo : 3 200');
t(r.pb.especes+r.pb.orange+r.pb.mtn===1800+2600+1300+3200+600, 'tout l\'argent reçu est compté une fois et une seule (8 900 + 600 de consignes)');
const comp=r.lignes.find(x=>/à compter/.test(x))||'';
t(r.att===10300&&/10\s?300/.test(comp), `⚠️⚠️ « à compter » = le montant de la clôture : ${comp}`);
t(/fonds de départ/.test(comp)&&/dépenses payées de la caisse/.test(comp)&&!/Recharge|5\s?500/.test(comp), 'et il dit d\'où il vient (la recharge payée hors caisse n\'y est pas)');
const tir=r.lignes.find(x=>/dont consignes/.test(x))||'';
t(/\+FCFA\s?400|\+400/.test(tir.replace(/\s/g,' ')), `« dont consignes (dans le tiroir) » : seulement celles payées en espèces — ${tir}`);
const dep=await p.evaluate(()=>{ouvrirDep();return document.getElementById('dep-lst-cont').textContent;});
t(/⚡ Électricité ·/.test(dep)&&/📱 Téléphone ·/.test(dep)&&!/\belec ·|\btel ·/.test(dep), 'les dépenses disent « ⚡ Électricité », plus « elec »');
// La clôture elle-même n'a pas bougé.
const cl=await p.evaluate(()=>{document.querySelectorAll('.ov').forEach(x=>x.classList.remove('show'));ouvrirClot();
  document.getElementById('inp-compt').value='10300';calcEcart();return document.getElementById('ecart-lbl').textContent;});
t(/Équilibrée/.test(cl), `il compte 10 300 F dans le tiroir : la clôture dit « ${cl.trim()} »`);
// Le cadre « Consigne » ne survit pas à la vente qui l'a rempli.
const cs=await p.evaluate(async()=>{
  document.querySelectorAll('.ov').forEach(x=>x.classList.remove('show'));
  viderPanier();const bi=DB.articles.find(x=>x.id===1),riz=DB.articles.find(x=>x.id===2);
  addPanier(bi,0);procederPmt();const avecBiere=getComputedStyle(document.getElementById('consigne-row')).display;
  chgConsigne('prises',1);document.getElementById('calc-recu').value=1000;calcMonnaie(true);await encaisser();
  document.querySelectorAll('.ov').forEach(x=>x.classList.remove('show'));
  addPanier(riz,0);procederPmt();
  return {avecBiere,riz:getComputedStyle(document.getElementById('consigne-row')).display};
});
t(cs.avecBiere==='block'&&cs.riz==='none', `⚠️ après une vente consignée, un sac de riz ne montre plus le cadre « Consigne » de la vente d'avant (${cs.avecBiere} → ${cs.riz})`);
t(errs.length===0,'aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
await b.close();s.close();
console.log(ko?('ÉCHECS '+ko):('t154 : '+ok+' vérifications'));process.exit(ko?1:0);
