// Un faux client Supabase, en mémoire, juste ce que `notifier` utilise.
export const BASE = { notif_cles: [], notif_abonnements: [], notif_envois: [], app_admins: [], _rpc: {}, _users: {} };
let seq = 1;
class Q {
  constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.one = false; this.maybe = false; this.head = false; }
  select(c, o) { if (this.op === 'insert') { this.ret = true; return this; } this.op = this.op === 'select' ? 'select' : this.op; if (o && o.head) this.head = true; if (o && o.count) this.cnt = true; return this; }
  eq(k, v) { this.f.push(r => r[k] === v); return this; }
  is(k, v) { this.f.push(r => (r[k] ?? null) === v); return this; }
  gte(k, v) { this.f.push(r => r[k] >= v); return this; }
  update(o) { this.op = 'update'; this.val = o; return this; }
  insert(o) { this.op = 'insert'; this.val = o; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; this.maybe = true; return this; }
  then(res, rej) { try { res(this.run()); } catch (e) { rej(e); } }
  run() {
    const T = BASE[this.t];
    if (this.op === 'insert') {
      const r = { id: seq++, jeton: 'j' + seq, cree_le: new Date().toISOString(), nb_ok: 0, ...this.val };
      if (r.cle != null && T.some(x => x.user_id === r.user_id && x.cle === r.cle)) return { data: null, error: { code: '23505', message: 'dup' } };
      T.push(r); return { data: { id: r.id, jeton: r.jeton }, error: null };
    }
    const rows = T.filter(r => this.f.every(f => f(r)));
    if (this.op === 'update') { rows.forEach(r => Object.assign(r, this.val)); return { data: null, error: null }; }
    if (this.head) return { count: rows.length, error: null };
    if (this.one) return rows.length ? { data: { ...rows[0] }, error: null } : { data: null, error: this.maybe ? null : { message: 'none' } };
    return { data: rows.map(r => ({ ...r })), error: null };
  }
}
export function createClient() {
  return {
    from: t => new Q(t),
    rpc: async n => ({ data: BASE._rpc[n] ? BASE._rpc[n]() : [], error: null }),
    auth: { getUser: async j => ({ data: { user: BASE._users[j] || null } }) },
  };
}
