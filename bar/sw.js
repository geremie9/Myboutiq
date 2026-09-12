/* MyBarQ — service worker.
   Même principe que celui de MyBoutiQ : la coquille est gardée une fois
   pour toutes, et l'app s'ouvre à 2 h du matin sans réseau. */
const CACHE_NAME='mybarq-v1';
const FONT_CACHE='mybarq-polices-v1';
const APP_SHELL=['./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];

self.addEventListener('install',function(e){
  // Pas de skipWaiting automatique : on ne remplace jamais l'application
  // sous les doigts d'un serveur en plein encaissement.
  e.waitUntil(caches.open(CACHE_NAME).then(function(c){return c.addAll(APP_SHELL);}));
});
self.addEventListener('message',function(e){
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){
      return k.indexOf('mybarq-')===0&&k!==CACHE_NAME&&k!==FONT_CACHE;
    }).map(function(k){return caches.delete(k);}));
  }));
  self.clients.claim();
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);

  // ⚠️ Le service worker ne se met JAMAIS en cache lui-même : c'est le
  // fichier que le navigateur relit pour savoir s'il existe une nouvelle
  // version. Le servir depuis le cache, c'est répondre « rien de neuf »
  // pour toujours.
  if(url.pathname.indexOf('sw.js')!==-1){e.respondWith(fetch(e.request));return;}

  // Les polices Google : gardées une fois, servies pour toujours.
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(FONT_CACHE).then(function(c){
      return c.match(e.request).then(function(hit){
        return hit||fetch(e.request).then(function(res){
          if(res&&(res.status===200||res.type==='opaque'))c.put(e.request,res.clone());
          return res;
        }).catch(function(){return hit;});
      });
    }));
    return;
  }

  if(url.origin!==self.location.origin)return;

  // Coquille : le réseau d'abord quand il répond, le cache dès qu'il tousse.
  e.respondWith(
    fetch(e.request).then(function(res){
      if(res&&res.status===200){
        var copy=res.clone();
        caches.open(CACHE_NAME).then(function(c){c.put(e.request,copy);});
      }
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(hit){
        return hit||caches.match('./index.html');
      });
    })
  );
});
