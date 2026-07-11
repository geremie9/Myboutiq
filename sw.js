const CACHE_NAME='myboutiq-v3';
const IMG_CACHE='myboutiq-images-v1';
const APP_SHELL=['./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
const SUPABASE_STORAGE_HOST='bbncilovxzkcvlxvoqtg.supabase.co';

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(function(c){return c.addAll(APP_SHELL);}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE_NAME&&k!==IMG_CACHE;}).map(function(k){return caches.delete(k);}));
  }));
  self.clients.claim();
});

function isProductImage(url){
  return url.hostname===SUPABASE_STORAGE_HOST&&url.pathname.indexOf('/storage/')!==-1;
}

self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);

  if(isProductImage(url)){
    e.respondWith(
      caches.open(IMG_CACHE).then(function(c){
        return c.match(e.request).then(function(cached){
          var fetchPromise=fetch(e.request).then(function(res){
            if(res&&res.status===200)c.put(e.request,res.clone());
            return res;
          }).catch(function(){return cached;});
          return cached||fetchPromise;
        });
      })
    );
    return;
  }

  if(url.origin!==location.origin)return;

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
