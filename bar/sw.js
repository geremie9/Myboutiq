/* MyBar — service worker.
   Même principe que celui de MyBoutiQ : la coquille est gardée une fois
   pour toutes, et l'app s'ouvre à 2 h du matin sans réseau. */
const CACHE_NAME='mybar-v8';
const DELAI_RESEAU=2500;   // au-delà, on sert la copie locale
const FONT_CACHE='mybar-polices-v1';
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
      return k.indexOf('mybar-')===0&&k!==CACHE_NAME&&k!==FONT_CACHE;
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

  // Coquille : le réseau d'abord, mais pas plus de DELAI_RESEAU ms quand une
  // copie locale existe.
  //
  // ⚠️ « Le réseau d'abord » attendait le réseau SANS LIMITE. Or le cas le plus
  // courant chez nous n'est pas l'absence de réseau (le cache répond alors
  // tout de suite) : c'est un réseau PRÉSENT QUI NE DÉBITE RIEN. Mesuré sur
  // l'app déjà installée, copie locale comprise : réseau à 5 s → 6,5 s avant
  // de pouvoir vendre ; à 12 s → 13,4 s. La copie locale est là : on la sert
  // après 2,5 s, et la mise à jour continue en arrière-plan pour l'ouverture
  // suivante. Sans copie (première visite), il n'y a rien à servir : on attend.
  var req=e.request;
  var reseau=fetch(req).then(function(res){
    if(res&&res.status===200){
      var copy=res.clone();
      caches.open(CACHE_NAME).then(function(c){c.put(req,copy);});
    }
    return res;
  });
  e.waitUntil(reseau.catch(function(){}));   // appelé tout de suite : plus tard, le navigateur le refuse
  e.respondWith(
    caches.match(req).then(function(hit){
      if(!hit){
        return reseau.catch(function(){return caches.match('./index.html');});
      }
      var minuteur=new Promise(function(ok){setTimeout(function(){ok(hit);},DELAI_RESEAU);});
      return Promise.race([reseau.catch(function(){return hit;}),minuteur]);
    })
  );
});
