const CACHE_NAME='myboutiq-v88';
const IMG_CACHE='myboutiq-images-v1';
// photos-catalogue.json fait partie de la coquille : la boutique doit pouvoir
// décider hors ligne quelle photo poser, sans redemander au serveur.
const APP_SHELL=['./index.html','./manifest.json','./icon-192.png','./icon-512.png','./photos-catalogue.json','./catalogue-600.json'];
const SUPABASE_STORAGE_HOST='bbncilovxzkcvlxvoqtg.supabase.co';

self.addEventListener('install',function(e){
  // Pas de skipWaiting auto : la nouvelle version ATTEND que l'utilisateur touche
  // "Recharger" (bandeau), pour ne jamais casser un écran en pleine vente.
  e.waitUntil(caches.open(CACHE_NAME).then(function(c){return c.addAll(APP_SHELL);}));
});
self.addEventListener('message',function(e){
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
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
            if(res&&(res.status===200||res.type==='opaque'))c.put(e.request,res.clone());
            return res;
          }).catch(function(){return cached;});
          return cached||fetchPromise;
        });
      })
    );
    return;
  }

  if(url.origin!==location.origin)return;

  // ⚠️ AVANT : « réseau d'abord ». L'app attendait 216 Ko à CHAQUE ouverture
  // avant d'afficher le moindre pixel — même pour un commerçant qui l'a
  // installée depuis un mois. Une seconde sur une bonne connexion, cinq à
  // quinze sur une connexion camerounaise. C'était ça, « ça dure ».
  //
  // MAINTENANT : on sert la copie gardée TOUT DE SUITE, et on va chercher la
  // nouvelle version en arrière-plan pour la fois d'après. Exactement ce que
  // fait déjà le cache des photos, quelques lignes plus haut.
  // Il peut donc avoir une version de retard d'UNE ouverture — c'est pour ça
  // que le bandeau « Recharger » existe, et qu'on cherche les mises à jour au
  // retour sur l'app (19.55).
  e.respondWith(
    caches.open(CACHE_NAME).then(function(c){
      return c.match(e.request).then(function(garde){
        var reseau=fetch(e.request).then(function(res){
          if(res&&res.status===200)c.put(e.request,res.clone());
          return res;
        }).catch(function(){
          // Hors ligne et rien en cache pour CETTE adresse : on retombe sur
          // la page principale, qui elle est dans la coquille.
          return garde||caches.match('./index.html');
        });
        return garde||reseau;
      });
    })
  );
});
