// Normalisation du blob boutiques.data vers un contexte compact.
// Le blob fait 20 a 40 Ko : on n'envoie JAMAIS tout au modele.

export type Variante = {
  id: number; nm: string; px: number; pa: number;
  stk: number; stk0?: number; rt?: boolean; qBase?: number; img?: string;
};

export type Article = {
  id: number; nm: string; e?: string; cat?: string;
  px: number; pa: number; stk: number; stk0?: number; al?: number; vd?: number;
  rt?: boolean; vr?: Variante[]; img?: string;
  um?: string;      // unite de mesure : "kg", "L"...
  umSac?: number;   // contenu d'un sac/carton en unites de base
};

export type Ligne = {
  nm: string; pid: number; vid: number | null;
  qte?: number; qty?: number; qBase?: number;
  px: number; pa: number; dep?: number;
};

export type Vente = {
  id: number; date: string; heure?: string; total: number;
  benefice?: number; ben?: number; annulee?: boolean;
  vendeur?: string; clientId?: number | null; lignes: Ligne[];
};

export type Depense = { id: string; nm: string; amt: number; cat?: string; date: string };
export type Client = { id: number; nm: string; tel?: string; credit?: number; points?: number };
export type Appro = { id: string; pid: number; vid: number | null; qty: number; date: string };

export type Data = {
  articles?: Article[]; ventes?: Vente[]; depenses?: Depense[];
  clients?: Client[]; appros?: Appro[]; cfg?: Record<string, unknown>;
};

/** "07/08/2026" ou ISO -> Date. Renvoie null si illisible. */
export function versDate(s?: string): Date | null {
  if (!s) return null;
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (fr) return new Date(+fr[3], +fr[2] - 1, +fr[1]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function joursEcoules(s?: string): number {
  const d = versDate(s);
  if (!d) return 1e9;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

/** Quantite reellement vendue sur une ligne, quel que soit le nom du champ. */
export function qteLigne(l: Ligne): number {
  return Number(l.qte ?? l.qty ?? 0) || 0;
}

/** Marge unitaire d'une ligne de vente. */
export function margeLigne(l: Ligne): number {
  return (Number(l.px) || 0) - (Number(l.pa) || 0) - (Number(l.dep) || 0);
}

/** Stock total d'un article : le sien plus celui de ses variantes. */
export function stockTotal(a: Article): number {
  const base = Number(a.stk) || 0;
  const v = (a.vr || []).reduce((s, x) => s + (Number(x.stk) || 0), 0);
  return base + v;
}

/** Prix representatif : celui de l'article, sinon la 1re variante non nulle. */
export function prixRef(a: Article): { px: number; pa: number } {
  if (a.px > 0) return { px: Number(a.px) || 0, pa: Number(a.pa) || 0 };
  const v = (a.vr || []).find((x) => Number(x.px) > 0);
  return v ? { px: Number(v.px) || 0, pa: Number(v.pa) || 0 } : { px: 0, pa: 0 };
}

/** Catalogue compact envoye au modele, ~25 tokens par article. */
export function catalogueCompact(data: Data, max = 300): string {
  const arts = (data.articles || []).slice(0, max);
  return arts.map((a) => {
    const { px } = prixRef(a);
    const stk = stockTotal(a);
    const vr = (a.vr || []).length
      ? " | variantes: " + a.vr!.map((v) => `${v.id}=${v.nm}@${v.px}F(stk ${v.stk})`).join(", ")
      : "";
    const um = a.um ? ` | vendu au ${a.um}${a.umSac ? `, sac de ${a.umSac}${a.um}` : ""}` : "";
    return `#${a.id} ${a.nm} [${a.cat || "?"}] ${px}F stock ${stk}${um}${vr}`;
  }).join("\n");
}

/** Ventes des N derniers jours, agregees par article. */
export function ventesParArticle(data: Data, jours = 30) {
  const acc = new Map<number, { nm: string; qte: number; ca: number; marge: number }>();
  for (const v of data.ventes || []) {
    if (v.annulee) continue;
    if (joursEcoules(v.date) > jours) continue;
    for (const l of v.lignes || []) {
      const q = qteLigne(l);
      const e = acc.get(l.pid) || { nm: l.nm, qte: 0, ca: 0, marge: 0 };
      e.qte += q;
      e.ca += q * (Number(l.px) || 0);
      e.marge += q * margeLigne(l);
      acc.set(l.pid, e);
    }
  }
  return acc;
}

/** Resume chiffre de la boutique, ~150 tokens. */
export function resume(data: Data, devise = "F"): string {
  const arts = data.articles || [];
  const ventes = (data.ventes || []).filter((v) => !v.annulee);
  const j7 = ventes.filter((v) => joursEcoules(v.date) <= 7);
  const j30 = ventes.filter((v) => joursEcoules(v.date) <= 30);
  const som = (a: Vente[], k: "total" | "benefice") =>
    a.reduce((s, v) => s + (Number(k === "total" ? v.total : (v.benefice ?? v.ben)) || 0), 0);
  const dep30 = (data.depenses || [])
    .filter((d) => joursEcoules(d.date) <= 30)
    .reduce((s, d) => s + (Number(d.amt) || 0), 0);
  const rupture = arts.filter((a) => stockTotal(a) <= 0).length;
  const bas = arts.filter((a) => {
    const s = stockTotal(a);
    return s > 0 && s <= (Number(a.al) || 5);
  }).length;
  const credit = (data.clients || []).reduce((s, c) => s + (Number(c.credit) || 0), 0);

  return [
    `Articles: ${arts.length} (${rupture} en rupture, ${bas} en stock bas)`,
    `Ventes 7j: ${j7.length} tickets, ${som(j7, "total")}${devise} de CA, ${som(j7, "benefice")}${devise} de benefice`,
    `Ventes 30j: ${j30.length} tickets, ${som(j30, "total")}${devise} de CA, ${som(j30, "benefice")}${devise} de benefice`,
    `Depenses 30j: ${dep30}${devise}`,
    `Credit client en cours: ${credit}${devise}`,
  ].join("\n");
}
