// t153a — le chiffrement Web Push contre le vecteur officiel de la RFC 8291.
import { pathToFileURL } from 'node:url';
import { RACINE } from './lib.mjs';
const { chiffrer, jetonVapid, genererVapid, b64u, deb64u, envoyer } = await import(pathToFileURL(RACINE+'/supabase/functions/notifier/webpush.js').href);
let ok=0,ko=0;const t=(c,m)=>{if(c){ok++;console.log('✅',m);}else{ko++;console.log('❌',m);}};
const corps=await chiffrer('BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4','BTBZMqHH6r4Tts7J_aSIgg',
  'When I grow up, I want to be a watermelon',
  {asPrivate:'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',asPublic:'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',salt:'DGv6ra1nlYgDCS1FRnbzlw'});
t(b64u(corps.slice(0,86))==='DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8','en-tête identique à la RFC 8291');
t(b64u(corps.slice(86))==='8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ','texte chiffré identique à la RFC 8291');
t(b64u(corps)==='DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN','message complet identique à la RFC 8291');

// Aller-retour avec un vrai « téléphone » : on déchiffre comme le ferait Chrome.
const s=crypto.subtle;
const ua=await s.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
const uaPub=new Uint8Array(await s.exportKey('raw',ua.publicKey));const auth=crypto.getRandomValues(new Uint8Array(16));
const msg=JSON.stringify({t:'MyBoutiQ',b:'Bonjour 🎉 éàç'});
const c2=await chiffrer(b64u(uaPub),b64u(auth),msg);
async function hm(k,d){const kk=await s.importKey('raw',k,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await s.sign('HMAC',kk,d));}
const te=new TextEncoder();const cat=(...p)=>{const o=new Uint8Array(p.reduce((a,x)=>a+x.length,0));let i=0;for(const x of p){o.set(x,i);i+=x.length;}return o;};
const sel=c2.slice(0,16),idl=c2[20],asPub=c2.slice(21,21+idl),ct=c2.slice(21+idl);
const asK=await s.importKey('raw',asPub,{name:'ECDH',namedCurve:'P-256'},false,[]);
const ecdh=new Uint8Array(await s.deriveBits({name:'ECDH',public:asK},ua.privateKey,256));
const ikm=await hm(await hm(auth,ecdh),cat(te.encode('WebPush: info\0'),uaPub,asPub,new Uint8Array([1])));
const prk=await hm(sel,ikm);
const cek=(await hm(prk,cat(te.encode('Content-Encoding: aes128gcm\0'),new Uint8Array([1])))).slice(0,16);
const nonce=(await hm(prk,cat(te.encode('Content-Encoding: nonce\0'),new Uint8Array([1])))).slice(0,12);
const clair=new Uint8Array(await s.decrypt({name:'AES-GCM',iv:nonce},await s.importKey('raw',cek,'AES-GCM',false,['decrypt']),ct));
t(clair[clair.length-1]===2&&new TextDecoder().decode(clair.slice(0,-1))===msg,'aller-retour : le téléphone relit le message, accents et emoji compris');
t(c2.length<4096,'message bien sous la limite de 4 Ko ('+c2.length+' o)');

// VAPID : le jeton se vérifie avec la clé publique.
const v=await genererVapid();
t(deb64u(v.publique).length===65&&deb64u(v.publique)[0]===4,'clé publique VAPID : 65 octets, non compressée');
const jwt=await jetonVapid('https://fcm.googleapis.com/fcm/send/abc',v.privee,'https://myboutiq.online');
const [h,p,sg]=jwt.split('.');
const pk=await s.importKey('raw',deb64u(v.publique),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
t(await s.verify({name:'ECDSA',hash:'SHA-256'},pk,deb64u(sg),te.encode(h+'.'+p)),'jeton VAPID ES256 : signature vérifiée par la clé publique');
const cl=JSON.parse(new TextDecoder().decode(deb64u(p)));
t(cl.aud==='https://fcm.googleapis.com'&&cl.sub==='https://myboutiq.online'&&cl.exp-Date.now()/1000<=86400,'jeton : aud = origine du service, sub = le site, exp ≤ 24 h');

// Envoi : en-têtes et lecture des réponses (404/410 = abonnement mort).
let vu=null;const faux=st=>async(u,i)=>{vu={u,i};return new Response(st===201?'':'gone',{status:st});};
const abo={endpoint:'https://fcm.googleapis.com/fcm/send/abc',p256dh:b64u(uaPub),auth:b64u(auth)};
const r1=await envoyer(abo,{t:'x'},{...v,contact:'https://myboutiq.online'},{fetch:faux(201),ttl:600,sujet:'rappel'});
t(r1.ok&&!r1.mort&&vu.i.headers['Content-Encoding']==='aes128gcm'&&vu.i.headers.TTL==='600'&&vu.i.headers.Topic==='rappel'&&/^vapid t=.+, k=B/.test(vu.i.headers.Authorization),'envoi : aes128gcm, TTL, Topic, Authorization vapid');
const r2=await envoyer(abo,{t:'x'},{...v,contact:'https://myboutiq.online'},{fetch:faux(410)});
t(!r2.ok&&r2.mort,'410 → abonnement mort');
const r3=await envoyer(abo,{t:'x'},{...v,contact:'https://myboutiq.online'},{fetch:async()=>{throw new Error('reseau');}});
t(!r3.ok&&!r3.mort&&r3.statut===0,'panne réseau → ni succès ni abonnement mort');
console.log(ko?('ÉCHECS '+ko):('t153a : '+ok+' vérifications'));process.exit(ko?1:0);
