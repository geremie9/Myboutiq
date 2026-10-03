// Web Push sans dépendance : chiffrement aes128gcm (RFC 8291) et
// signature VAPID (RFC 8292), avec la seule WebCrypto — le même fichier
// tourne dans Deno (Supabase) et dans Node (le banc d'essai).
const sub = globalThis.crypto.subtle;
const te = new TextEncoder();

export function b64u(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function deb64u(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts) {
  const n = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmac(cle, data) {
  const k = await sub.importKey('raw', cle, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await sub.sign('HMAC', k, data));
}

// Une paire VAPID neuve : la publique (brute, 65 octets) pour les
// téléphones, la privée en JWK pour la base.
export async function genererVapid() {
  const p = await sub.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = new Uint8Array(await sub.exportKey('raw', p.publicKey));
  const jwk = await sub.exportKey('jwk', p.privateKey);
  return { publique: b64u(pub), privee: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d } };
}

// Jeton VAPID : ES256, signé pour l'origine du service de push.
export async function jetonVapid(endpoint, privee, contact, maintenant) {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor((maintenant || Date.now()) / 1000) + 12 * 3600;
  const tete = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corps = b64u(te.encode(JSON.stringify({ aud, exp, sub: contact })));
  const k = await sub.importKey('jwk', { kty: 'EC', crv: 'P-256', x: privee.x, y: privee.y, d: privee.d },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await sub.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, te.encode(tete + '.' + corps)));
  return tete + '.' + corps + '.' + b64u(sig);
}

// Chiffrement d'un message pour UN abonnement (p256dh + auth du téléphone).
// `_essai` n'existe que pour le vecteur de la RFC (clé éphémère et sel imposés).
export async function chiffrer(p256dh, authSecret, texte, _essai) {
  const uaPub = deb64u(p256dh), auth = deb64u(authSecret);
  if (uaPub.length !== 65 || auth.length !== 16) throw new Error('cles-abonnement-invalides');
  let asPriv, asPub;
  if (_essai) {
    asPub = deb64u(_essai.asPublic);
    asPriv = await sub.importKey('jwk', { kty: 'EC', crv: 'P-256', d: _essai.asPrivate,
      x: b64u(asPub.slice(1, 33)), y: b64u(asPub.slice(33, 65)) }, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  } else {
    const p = await sub.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    asPriv = p.privateKey;
    asPub = new Uint8Array(await sub.exportKey('raw', p.publicKey));
  }
  const uaKey = await sub.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await sub.deriveBits({ name: 'ECDH', public: uaKey }, asPriv, 256));
  const sel = _essai ? deb64u(_essai.salt) : globalThis.crypto.getRandomValues(new Uint8Array(16));
  const prkKey = await hmac(auth, ecdh);
  const ikm = await hmac(prkKey, concat(te.encode('WebPush: info\0'), uaPub, asPub, new Uint8Array([1])));
  const prk = await hmac(sel, ikm);
  const cek = (await hmac(prk, concat(te.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(te.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const clair = concat(te.encode(texte), new Uint8Array([2]));   // 0x02 : dernier (et seul) bloc
  const k = await sub.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const chiffre = new Uint8Array(await sub.encrypt({ name: 'AES-GCM', iv: nonce }, k, clair));
  const rs = new Uint8Array([0, 0, 0x10, 0]);                     // 4096
  return concat(sel, rs, new Uint8Array([asPub.length]), asPub, chiffre);
}

// Envoi d'un message. Rend { statut, ok, mort } : `mort` = l'abonnement
// n'existe plus (404/410), on le retire.
export async function envoyer(abo, charge, vapid, opts) {
  const o = opts || {};
  const corps = await chiffrer(abo.p256dh, abo.auth, typeof charge === 'string' ? charge : JSON.stringify(charge));
  const jwt = await jetonVapid(abo.endpoint, vapid.privee, vapid.contact);
  const h = {
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    'TTL': String(o.ttl != null ? o.ttl : 3 * 86400),
    'Urgency': o.urgence || 'normal',
    'Authorization': 'vapid t=' + jwt + ', k=' + vapid.publique,
  };
  if (o.sujet) h['Topic'] = String(o.sujet).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  let r;
  try {
    r = await (o.fetch || fetch)(abo.endpoint, { method: 'POST', headers: h, body: corps });
  } catch (e) {
    return { statut: 0, ok: false, mort: false, erreur: String(e && e.message || e).slice(0, 200) };
  }
  let detail = '';
  if (!r.ok) { try { detail = (await r.text()).slice(0, 200); } catch (_) {} }
  return { statut: r.status, ok: r.status >= 200 && r.status < 300, mort: r.status === 404 || r.status === 410, erreur: detail };
}
