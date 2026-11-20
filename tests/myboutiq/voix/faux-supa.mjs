// Une fausse base pour la fonction `voix` : les deux RPC et les comptes.
// voix_autoriser reproduit la règle SQL (base-de-donnees/2026-11-20-voix.sql) :
// compte propriétaire, ou PIN de la boutique avec frein aux essais ; puis
// abonnement actif et minutes restantes.
export const BASE = {
  boutiques: { MARI0001: { owner: 'u-marie', pins: { '123456': 'patron', '4321': 'vendeur' } }, SANS0001: { owner: 'u-x', pins: { '9999': 'patron' } } },
  abonnes: { MARI0001: { actif: true, minutes: 600 } },
  usage: {}, echecs: {}, users: { 'aaa.bbb.ccc': { id: 'u-marie' } }, appels: [],
};
export function createClient() {
  return {
    auth: { getUser: async j => ({ data: { user: BASE.users[j] || null } }) },
    rpc: async (n, a) => {
      BASE.appels.push([n, a]);
      if (n === 'voix_compter') { BASE.usage[a.p_code] = (BASE.usage[a.p_code] || 0) + Math.max(1, a.p_secondes); return { data: null, error: null }; }
      if (n !== 'voix_autoriser') return { data: null, error: { message: 'rpc inconnue' } };
      const b = BASE.boutiques[a.p_code];
      let role = null;
      if (b && a.p_user && b.owner === a.p_user) role = 'patron';
      else {
        if ((BASE.echecs[a.p_code] || 0) >= 5) return { data: { ok: false, motif: 'bloque', attente: 60 }, error: null };
        role = b ? (b.pins[a.p_pin] || null) : null;
        if (!role) { BASE.echecs[a.p_code] = (BASE.echecs[a.p_code] || 0) + 1; return { data: { ok: false, motif: 'acces' }, error: null }; }
        BASE.echecs[a.p_code] = 0;
      }
      const ab = BASE.abonnes[a.p_code];
      if (!ab || !ab.actif) return { data: { ok: false, motif: 'abonnement', role }, error: null };
      const u = BASE.usage[a.p_code] || 0;
      if (u >= ab.minutes * 60) return { data: { ok: false, motif: 'quota', role }, error: null };
      return { data: { ok: true, role, reste: ab.minutes * 60 - u }, error: null };
    },
  };
}
