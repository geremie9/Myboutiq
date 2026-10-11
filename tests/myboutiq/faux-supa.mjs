// UN FAUX SERVEUR SUPABASE, DANS LA PAGE.
// Le banc n'atteint jamais le vrai serveur (aucun domaine ne résout). Pour
// tester la PORTE — connexion du patron, liste de ses boutiques, ouverture —
// il faut pourtant un serveur qui répond. Celui-ci remplace la bibliothèque
// supabase-js : `window.supabase.createClient()` rend un client qui lit et
// écrit dans `window.__fs`, que le test remplit et observe.
//
// Ce qu'il sait faire : comptes (email + PIN), table `boutiques` avec le
// filtre propriétaire, sélection de colonnes (y compris `x:data->cfg->>nom`),
// eq / is / in / order / limit / maybeSingle, update avec la garde `_rev`,
// RPC `boutique_lire`. Tout le reste répond « vide, sans erreur ».
//
// ⚠️ LE DÉBIT SE SIMULE : chaque réponse attend `latence` + taille/`debit`.
// C'est ce qui rend visible le poids de ce qu'on télécharge — sur le réseau
// de Garoua, 660 Ko de boutiques, c'est l'écran qui ne bouge plus.
export function fauxSupaScript() { return '(' + installer.toString() + ')();'; }

function installer() {
  var fs = window.__fs = {
    comptes: {},        // email -> { id, pin }
    boutiques: [],      // { id, code, nom, owner_id, actif, updated_at, data, pin_vendeur_clair, plan, abonne_jusqu }
    pins: {},           // code -> PIN accepté par boutique_lire
    session: null,      // { user: { id, email } }
    appels: [],         // { quoi, table, cols, octets, t }
    debit: 0,           // octets par seconde (0 = instantané)
    latence: 0,         // ms ajoutées à chaque réponse
    enVol: 0, maxEnVol: 0
  };
  function taille(x) { try { return x == null ? 0 : JSON.stringify(x).length; } catch (e) { return 0; } }
  function copie(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function attendre(octets) {
    var ms = fs.latence + (fs.debit ? octets * 1000 / fs.debit : 0);
    return new Promise(function (r) { setTimeout(r, ms); });
  }
  function noter(quoi, table, cols, octets) {
    fs.appels.push({ quoi: quoi, table: table || '', cols: cols || '', octets: octets, t: Date.now() });
  }
  // « data->cfg->>nom » : chemin JSON, -> garde l'objet, ->> rend du texte.
  function chemin(row, expr) {
    var parts = String(expr).split(/->>?/), v = row[parts[0]];
    for (var i = 1; i < parts.length; i++) { if (v == null) return null; v = v[parts[i]]; }
    if (/->>/.test(expr) && v != null && typeof v === 'object') v = JSON.stringify(v);
    if (/->>/.test(expr) && v != null) v = String(v);
    return v === undefined ? null : v;
  }
  function projeter(row, cols) {
    if (!cols || cols === '*') return copie(row);
    var o = {};
    String(cols).split(',').forEach(function (c) {
      c = c.trim(); if (!c) return;
      var alias = c, expr = c, k = c.indexOf(':');
      if (k > 0) { alias = c.slice(0, k); expr = c.slice(k + 1); }
      else if (/->/.test(c)) { alias = c.split(/->>?/).pop(); }
      o[alias] = copie(chemin(row, expr));
    });
    return o;
  }
  function Requete(table) { this.table = table; this.op = 'select'; this.cols = '*'; this.filtres = []; this.ordre = null; this.lim = null; this.unique = false; this.payload = null; this.retour = false; }
  Requete.prototype.select = function (c) { if (this.op === 'select') this.cols = c || '*'; else { this.retour = true; this.colsRetour = c || '*'; } return this; };
  Requete.prototype.eq = function (k, v) { this.filtres.push(['eq', k, v]); return this; };
  Requete.prototype.neq = function (k, v) { this.filtres.push(['neq', k, v]); return this; };
  Requete.prototype.is = function (k, v) { this.filtres.push(['is', k, v]); return this; };
  Requete.prototype.in = function (k, v) { this.filtres.push(['in', k, v]); return this; };
  Requete.prototype.gte = function (k, v) { this.filtres.push(['gte', k, v]); return this; };
  Requete.prototype.lte = function (k, v) { this.filtres.push(['lte', k, v]); return this; };
  Requete.prototype.lt = function (k, v) { this.filtres.push(['lt', k, v]); return this; };
  Requete.prototype.gt = function (k, v) { this.filtres.push(['gt', k, v]); return this; };
  Requete.prototype.order = function (k, o) { this.ordre = [k, !(o && o.ascending === false)]; return this; };
  Requete.prototype.limit = function (n) { this.lim = n; return this; };
  Requete.prototype.maybeSingle = function () { this.unique = 'peut'; return this; };
  Requete.prototype.single = function () { this.unique = 'doit'; return this; };
  Requete.prototype.update = function (p) { this.op = 'update'; this.payload = p; return this; };
  Requete.prototype.insert = function (p) { this.op = 'insert'; this.payload = p; return this; };
  Requete.prototype.upsert = function (p) { this.op = 'upsert'; this.payload = p; return this; };
  Requete.prototype.delete = function () { this.op = 'delete'; return this; };
  Requete.prototype.then = function (ok, ko) { return executer(this).then(ok, ko); };
  function passe(row, f) {
    var v = chemin(row, f[1]);
    if (f[0] === 'eq') return v != null && String(v) === String(f[2]);
    if (f[0] === 'neq') return String(v) !== String(f[2]);
    if (f[0] === 'is') return f[2] === null ? v == null : v === f[2];
    if (f[0] === 'in') return (f[2] || []).map(String).indexOf(String(v)) >= 0;
    if (f[0] === 'gte') return v >= f[2]; if (f[0] === 'lte') return v <= f[2];
    if (f[0] === 'gt') return v > f[2]; if (f[0] === 'lt') return v < f[2];
    return true;
  }
  function lignes(table) { return table === 'boutiques' ? fs.boutiques : (fs[table] || (fs[table] = [])); }
  async function executer(q) {
    fs.enVol++; fs.maxEnVol = Math.max(fs.maxEnVol, fs.enVol);
    try {
      var tab = lignes(q.table);
      var sel = tab.filter(function (r) { return q.filtres.every(function (f) { return passe(r, f); }); });
      // RLS de `boutiques` : le propriétaire ne lit que les siennes (la
      // lecture de l'abonnement par code reste publique, comme en vrai).
      if (q.table === 'boutiques' && q.op === 'select' && !/^actif,plan,abonne_jusqu$/.test(q.cols))
        sel = sel.filter(function (r) { return fs.session && r.owner_id === fs.session.user.id; });
      if (q.op === 'select') {
        if (q.ordre) sel = sel.slice().sort(function (a, b) { var x = chemin(a, q.ordre[0]), y = chemin(b, q.ordre[0]); return (x < y ? -1 : x > y ? 1 : 0) * (q.ordre[1] ? 1 : -1); });
        if (q.lim != null) sel = sel.slice(0, q.lim);
        var data = sel.map(function (r) { return projeter(r, q.cols); });
        if (q.unique) data = data[0] || null;
        var oct = taille(data);
        await attendre(oct); noter('select', q.table, q.cols, oct);
        return { data: data, error: null };
      }
      if (q.op === 'update') {
        sel.forEach(function (r) { Object.keys(q.payload || {}).forEach(function (k) { r[k] = copie(q.payload[k]); }); });
        var oc = taille(q.payload);
        await attendre(0); noter('update', q.table, '', oc);
        return { data: q.retour ? sel.map(function (r) { return projeter(r, q.colsRetour); }) : null, error: null };
      }
      if (q.op === 'insert' || q.op === 'upsert') {
        var l = Array.isArray(q.payload) ? q.payload : [q.payload];
        l.forEach(function (p) { var r = copie(p); if (r.id == null) r.id = 'id-' + Math.random().toString(16).slice(2); tab.push(r); });
        await attendre(0); noter(q.op, q.table, '', taille(q.payload));
        return { data: null, error: null };
      }
      await attendre(0); noter(q.op, q.table, '', 0);
      return { data: null, error: null };
    } finally { fs.enVol--; }
  }
  var client = {
    auth: {
      signInWithPassword: async function (o) {
        var c = fs.comptes[o.email];
        await attendre(1200); noter('connexion', '', o.email, 1200);
        if (!c || c.pin !== o.password) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials', status: 400 } };
        fs.session = { user: { id: c.id, email: o.email } };
        return { data: { user: fs.session.user, session: { access_token: 'x', user: fs.session.user } }, error: null };
      },
      getUser: async function () { await attendre(0); noter('user', '', '', 0); return { data: { user: fs.session ? fs.session.user : null }, error: null }; },
      getSession: async function () { return { data: { session: fs.session ? { user: fs.session.user } : null }, error: null }; },
      signOut: async function () { fs.session = null; return { error: null }; },
      signUp: async function () { return { data: { user: null }, error: { message: 'faux serveur : pas d\'inscription' } }; },
      updateUser: async function () { return { data: null, error: null }; },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
    },
    from: function (t) { return new Requete(t); },
    rpc: async function (nom, a) {
      if (nom === 'boutique_lire') {
        var r = fs.boutiques.filter(function (b) { return b.code === a.p_code; })[0];
        var ok = r && fs.pins[r.code] && String(fs.pins[r.code]) === String(a.p_pin);
        var d = ok ? copie(r.data) : null, o = taille(d);
        await attendre(o); noter('rpc:boutique_lire', '', a.p_code, o);
        return { data: d, error: null };
      }
      // L'écriture par PIN, avec le même verrou de version que le vrai.
      if (nom === 'boutique_ecrire2') {
        var w = fs.boutiques.filter(function (b) { return b.code === a.p_code; })[0], rep;
        if (!w || !fs.pins[w.code] || String(fs.pins[w.code]) !== String(a.p_pin)) rep = { ok: false, motif: 'pin' };
        else if (((w.data && w.data.cfg && w.data.cfg._rev) || null) !== (a.p_rev || null)) rep = { ok: false, motif: 'conflit' };
        else { w.data = copie(a.p_data); w.updated_at = new Date().toISOString(); rep = { ok: true }; }
        await attendre(0); noter('rpc:boutique_ecrire2', '', a.p_code, taille(a.p_data));
        return { data: rep, error: null };
      }
      await attendre(0); noter('rpc:' + nom, '', '', 0);
      return { data: null, error: null };
    },
    channel: function () { var ch = { on: function () { return ch; }, subscribe: function () { return ch; }, unsubscribe: function () {} }; return ch; },
    removeChannel: function () {},
    storage: { from: function () { return { upload: async function () { return { data: null, error: null }; }, getPublicUrl: function () { return { data: { publicUrl: '' } }; } }; } },
    functions: { invoke: async function () { return { data: null, error: null }; } }
  };
  window.supabase = { createClient: function () { return client; } };
}
