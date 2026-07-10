const CACHE_NAME='myboutiq-v2';
const APP_SHELL=['./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(function(c){return c.addAll(APP_SHELL);}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);}));
  }));
  self.clients.claim();
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  // Reseau en priorite (toujours la derniere version en ligne). Le cache ne sert que si hors-ligne.
  e.respondWith(
    fetch(e.request).then(function(res){
      if(res&&res.status===200){
        var resClone=res.clone();
        caches.open(CACHE_NAME).then(function(c){c.put(e.request,resClone);});
      }
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(cached){return cached||caches.match('./index.html');});
    })
  );
});
