/* Lance tous les bancs l'un après l'autre contre un serveur local, et échoue
   (code 1) au premier pas en échec ou au moindre plantage.
   Usage : node run.js [filtre]   — ex. node run.js cave
   ⚠️ `spawn` asynchrone, PAS `spawnSync` : le serveur de test vit dans ce même
   processus, et une attente bloquante l'empêcherait de répondre au banc. */
const {spawn}=require('child_process'),fs=require('fs'),path=require('path');
const {demarrer}=require('./server');

function lancer(fichier,url){
  return new Promise(ok=>{
    const enfant=spawn(process.execPath,[path.join(__dirname,fichier)],{env:{...process.env,MYBAR_URL:url}});
    let sortie='';
    enfant.stdout.on('data',d=>sortie+=d);enfant.stderr.on('data',d=>sortie+=d);
    const garde=setTimeout(()=>enfant.kill('SIGKILL'),600000);
    enfant.on('close',code=>{clearTimeout(garde);ok({code,sortie});});
  });
}
(async()=>{
  const racine=path.resolve(__dirname,'..','..');
  const srv=await demarrer(0,racine);
  const url=`http://localhost:${srv.address().port}/bar/index.html`;
  const filtre=process.argv[2]||'';
  const fichiers=fs.readdirSync(__dirname).filter(f=>f.endsWith('.test.js')&&f.includes(filtre)).sort();
  let ok=0,ko=0,plantes=0;
  for(const f of fichiers){
    console.log('\n━━ '+f);
    const {code,sortie}=await lancer(f,url);
    console.log(sortie.split('\n').filter(l=>/^(✓|✗|OK|KO)\s|^\s{4}\S|^---/.test(l)).join('\n'));
    ok+=(sortie.match(/^(✓|OK)\s/gm)||[]).length;ko+=(sortie.match(/^(✗|KO)\s/gm)||[]).length;
    if(code!==0){plantes++;console.log('✗ le banc a planté (code '+code+')');console.log(sortie.split('\n').filter(l=>!/agent-proxy|google\.com|gvt1|curl -sS|For details|android\.clients/.test(l)).slice(0,25).join('\n'));}
  }
  srv.close();
  console.log(`\n═══ ${fichiers.length} suites · ${ok} pas réussis · ${ko} en échec · ${plantes} plantage(s)`);
  process.exit(ko||plantes||!ok?1:0);
})();
