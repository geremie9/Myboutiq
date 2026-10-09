const CACHE_NAME='myboutiq-v294';
const IMG_CACHE='myboutiq-images-v1';
// ⚠️ Les polices vivaient hors du cache : chaque ouverture repartait les
// chercher chez Google, et hors ligne la boutique s'affichait dans une police
// de secours qu'il ne reconnaît pas. Gardées une fois, servies pour toujours.
const FONT_CACHE='myboutiq-polices-v1';
// photos-catalogue.json fait partie de la coquille : la boutique doit pouvoir
// décider hors ligne quelle photo poser, sans redemander au serveur.
const APP_SHELL=['./index.html','./manifest.json','./icon-192.png','./icon-512.png','./badge-96.png','./photos-catalogue.json','./catalogue-600.json'];
const SUPABASE_STORAGE_HOST='bbncilovxzkcvlxvoqtg.supabase.co';

self.addEventListener('install',function(e){
  // Pas de skipWaiting auto : la nouvelle version ATTEND que l'utilisateur touche
  // "Recharger" (bandeau), pour ne jamais casser un écran en pleine vente.
  e.waitUntil(caches.open(CACHE_NAME).then(function(c){return c.addAll(APP_SHELL);}));
});
self.addEventListener('message',function(e){
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
  // La page demande si CE worker sait montrer une notification : un ancien
  // ne répond pas, et la page attend qu'il soit remplacé pour s'inscrire.
  if(e.data&&e.data.type==='CAPACITES'&&e.ports&&e.ports[0])e.ports[0].postMessage({push:1});
});

// ═══ 🔔 LES NOTIFICATIONS PUSH ═══
// Le serveur dépose un message chiffré ; le téléphone le déchiffre et nous
// le passe, même app fermée. On le montre tel quel.
var SUPA_URL='https://bbncilovxzkcvlxvoqtg.supabase.co';
var SUPA_KEY='sb_publishable_ioKcc8BWl0W5jXm4sJM1DA_KEi2ySXQ';
self.addEventListener('push',function(e){
  var d={};
  try{d=e.data?e.data.json():{};}catch(x){try{d={b:e.data.text()};}catch(y){}}
  e.waitUntil(self.registration.showNotification(String(d.t||'MyBoutiQ').slice(0,90),{
    body:String(d.b||'').slice(0,400),
    icon:'./icon-192.png',
    badge:'./badge-96.png',
    tag:String(d.g||'mb'),
    data:{u:d.u||'./index.html',j:d.j||null},
    lang:'fr'
  }));
});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var d=e.notification.data||{};
  var cible=new URL(d.u||'./index.html',self.location.href).href;
  var taches=[];
  // On note qu'elle a servi : c'est ce qui dit, côté admin, quels messages valent la peine.
  if(d.j)taches.push(fetch(SUPA_URL+'/rest/v1/rpc/notif_ouvert',{method:'POST',
    headers:{'apikey':SUPA_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_jeton:d.j})}).catch(function(){}));
  taches.push(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(fen){
    for(var i=0;i<fen.length;i++){
      if(new URL(fen[i].url).origin===self.location.origin&&'focus' in fen[i])return fen[i].focus();
    }
    return self.clients.openWindow(cible);
  }));
  e.waitUntil(Promise.all(taches));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE_NAME&&k!==IMG_CACHE&&k!==FONT_CACHE;}).map(function(k){return caches.delete(k);}));
  }));
  self.clients.claim();
});

function isProductImage(url){
  return url.hostname===SUPABASE_STORAGE_HOST&&url.pathname.indexOf('/storage/')!==-1;
}

self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);

  // ⚠️⚠️ LE SERVICE WORKER NE DOIT JAMAIS SE GARDER LUI-MEME.
  // Sa remarque : « pas de mise a jour visible dans l'app ».
  // Ce gestionnaire garde en cache TOUTE reponse 200 de meme origine — y
  // compris `sw.js` s'il passe par ici. Or c'est ce fichier que le
  // navigateur va relire pour SAVOIR s'il existe une nouvelle version : le
  // servir depuis le cache, c'est lui repondre « rien de neuf » pour
  // toujours. Le fichier de version des annonces a le meme probleme.
  // La regle sort AVANT tout le reste : ces deux-la vont au reseau, point.
  if(url.pathname.indexOf('sw.js')!==-1){e.respondWith(fetch(e.request));return;}

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

  // Les polices : gardées une fois, servies pour toujours. Elles ne changent
  // jamais, et elles ne doivent plus jamais faire attendre une ouverture.
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(
      caches.open(FONT_CACHE).then(function(c){
        return c.match(e.request).then(function(garde){
          if(garde)return garde;
          return fetch(e.request).then(function(res){
            if(res&&(res.status===200||res.type==='opaque'))c.put(e.request,res.clone());
            return res;
          }).catch(function(){return garde;});
        });
      })
    );
    return;
  }

  // La bibliothèque du serveur (supabase-js) : gardée une fois, servie
  // pour toujours. Elle ne sert qu'à la synchronisation, jamais à ouvrir
  // la caisse — mais elle repartait chez jsDelivr à CHAQUE ouverture, et
  // le lecteur de page l'attendait (voir le commentaire de sa balise).
  // Même traitement que les polices : cache d'abord, réseau seulement la
  // première fois.
  if(url.hostname==='cdn.jsdelivr.net'){
    e.respondWith(
      caches.open(FONT_CACHE).then(function(c){
        return c.match(e.request).then(function(garde){
          if(garde)return garde;
          return fetch(e.request).then(function(res){
            if(res&&(res.status===200||res.type==='opaque'))c.put(e.request,res.clone());
            return res;
          }).catch(function(){return garde;});
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
