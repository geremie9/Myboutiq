/* Sert le dépôt tel que Vercel le servirait, avec deux ajouts pour les bancs :
   `/bar` redirige vers `/bar/index.html` (comme vercel.json), et `/__delai/N` fait
   attendre N ms chaque réponse suivante — un réseau présent qui ne débite rien. */
const http=require('http'),fs=require('fs'),path=require('path');
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.jpg':'image/jpeg','.xml':'application/xml','.txt':'text/plain'};
function demarrer(port,racine){
  let delai=0;
  const srv=http.createServer((req,res)=>{
    if(req.url.startsWith('/__delai/')){delai=+req.url.split('/')[2]||0;res.end('ok '+delai);return;}
    if(req.url==='/bar'){res.writeHead(307,{Location:'/bar/index.html'});res.end();return;}
    const servir=()=>{
      let p=path.join(racine,decodeURIComponent(req.url.split('?')[0]));
      if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
      if(!fs.existsSync(p)){res.writeHead(404);res.end('nope');return;}
      res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});
      fs.createReadStream(p).pipe(res);
    };
    delai?setTimeout(servir,delai):servir();
  });
  return new Promise(ok=>srv.listen(port,()=>ok(srv)));
}
module.exports={demarrer};
