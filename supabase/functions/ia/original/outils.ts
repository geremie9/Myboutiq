// Les outils de l'agent. Tous calculent en local sur le blob : aucune donnee
// brute ne part chez le modele tant qu'il ne demande pas explicitement.

import {
  type Data, type Article, joursEcoules, margeLigne, prixRef,
  qteLigne, stockTotal, ventesParArticle,
} from "./contexte.ts";

export const OUTILS = [
  {
    name: "chercher_article",
    description: "Retrouve un ou plusieurs articles de la boutique par nom approximatif. A utiliser avant toute reponse qui parle d'un article precis.",
    input_schema: {
      type: "object",
      properties: { terme: { type: "string", description: "Mot cherche, meme mal orthographie" } },
      required: ["terme"],
    },
  },
  {
    name: "top_articles",
    description: "Classement des articles sur une periode, par quantite vendue, chiffre d'affaires ou benefice.",
    input_schema: {
      type: "object",
      properties: {
        jours: { type: "integer", description: "Profondeur en jours (7, 30, 90...)" },
        par: { type: "string", enum: ["quantite", "ca", "benefice"] },
        limite: { type: "integer" },
        ordre: { type: "string", enum: ["haut", "bas"], description: "haut = meilleurs, bas = pires" },
      },
      required: ["jours", "par"],
    },
  },
  {
    name: "a_rassortir",
    description: "Articles a racheter : ruptures et stocks bas, avec le rythme de vente et une estimation du nombre de jours restants.",
    input_schema: {
      type: "object",
      properties: { limite: { type: "integer" } },
    },
  },
  {
    name: "chiffres_periode",
    description: "Chiffre d'affaires, benefice, depenses et nombre de tickets sur une periode, avec comparaison a la periode precedente.",
    input_schema: {
      type: "object",
      properties: { jours: { type: "integer" } },
      required: ["jours"],
    },
  },
  {
    name: "controle_coherence",
    description: "Verifie la sante des donnees : marges negatives, prix a zero, noms de fiches douteux, stock incoherent, variantes mal reglees. C'est l'oeil droit du patron.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "clients_credit",
    description: "Clients qui doivent de l'argent, tries du plus gros credit au plus petit.",
    input_schema: {
      type: "object",
      properties: { limite: { type: "integer" } },
    },
  },
];

// ---------------------------------------------------------------- recherche

export function normaliser(s: string): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Distance de Levenshtein bornee : sort des que le cout depasse max. */
export function distance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prec = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let mini = i;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prec[j] + 1, cur[j - 1] + 1, prec[j - 1] + c);
      if (cur[j] < mini) mini = cur[j];
    }
    if (mini > max) return max + 1;
    prec = cur;
  }
  return prec[b.length];
}

/** Score d'un seul mot contre un article. */
function scoreMot(a: Article, t: string): number {
  const cibles = [a.nm, ...(a.vr || []).map((v) => v.nm), a.cat || ""].map(normaliser);
  let best = 0;
  for (const c of cibles) {
    if (!c) continue;
    if (c === t) { best = Math.max(best, 100); continue; }
    if (c.startsWith(t)) { best = Math.max(best, 92); continue; }
    if (c.includes(t)) { best = Math.max(best, 80); continue; }
    for (const mot of c.split(" ")) {
      if (!mot) continue;
      if (mot.startsWith(t)) { best = Math.max(best, 76); continue; }
      const tol = t.length <= 4 ? 1 : t.length <= 7 ? 2 : 3;
      const d = distance(t, mot, tol);
      if (d <= tol) best = Math.max(best, 70 - d * 12);
    }
  }
  return best;
}

/** Score 0-100, mono ou multi-mots. */
export function scoreArticle(a: Article, terme: string): number {
  const t = normaliser(terme);
  if (!t) return 0;
  const mots = t.split(" ").filter((m) => m.length >= 2);
  if (mots.length <= 1) return scoreMot(a, t);
  const somme = mots.reduce((s, m) => s + scoreMot(a, m), 0);
  return Math.max(scoreMot(a, t), Math.round(somme / mots.length));
}

export function chercher(data: Data, terme: string, limite = 8) {
  return (data.articles || [])
    .map((a) => ({ a, s: scoreArticle(a, terme) }))
    .filter((x) => x.s >= 40)
    .sort((x, y) => y.s - x.s || stockTotal(y.a) - stockTotal(x.a))
    .slice(0, limite)
    .map(({ a, s }) => ({
      id: a.id, nom: a.nm, categorie: a.cat, emoji: a.e,
      prix: prixRef(a).px, achat: prixRef(a).pa, stock: stockTotal(a),
      variantes: (a.vr || []).map((v) => ({ id: v.id, nom: v.nm, prix: v.px, stock: v.stk })),
      score: s,
    }));
}

// ---------------------------------------------------------------- oeil droit

export type Anomalie = {
  gravite: "haute" | "moyenne" | "basse";
  type: string;
  article_id?: number;
  article?: string;
  message: string;
  suggestion: string;
};

/** Controle de coherence, 100 % deterministe, aucun appel modele. */
export function controle(data: Data): Anomalie[] {
  const out: Anomalie[] = [];
  const arts = data.articles || [];
  const vendus30 = ventesParArticle(data, 30);
  const aVenduRecemment = vendus30.size > 0;

  const suspect = /^(screenshot|img|image|photo|whatsapp|capture|dsc|_)/i;

  for (const a of arts) {
    const { px, pa } = prixRef(a);
    const stk = stockTotal(a);

    if (suspect.test(a.nm) || /^\d[\d ]{6,}$/.test(a.nm)) {
      out.push({
        gravite: "haute", type: "nom_douteux", article_id: a.id, article: a.nm,
        message: `La fiche s'appelle « ${a.nm} » — c'est un nom de fichier, pas un produit.`,
        suggestion: "Renommer la fiche avec le vrai nom du produit, ou la supprimer si elle a ete creee par erreur.",
      });
    }

    if (px === 0 && stk > 0) {
      out.push({
        gravite: "haute", type: "prix_zero", article_id: a.id, article: a.nm,
        message: `« ${a.nm} » a ${stk} en stock mais aucun prix de vente.`,
        suggestion: "Mettre un prix de vente, sinon l'article se vend a 0 F.",
      });
    }

    if (px > 0 && pa > 0 && px <= pa) {
      out.push({
        gravite: "haute", type: "marge_negative", article_id: a.id, article: a.nm,
        message: `« ${a.nm} » est achete ${pa} F et vendu ${px} F : tu perds ${pa - px} F a chaque vente.`,
        suggestion: `Remonter le prix de vente au-dessus de ${pa} F, ou corriger le prix d'achat s'il est faux.`,
      });
    } else if (px > 0 && pa > 0 && (px - pa) / px < 0.05) {
      out.push({
        gravite: "moyenne", type: "marge_faible", article_id: a.id, article: a.nm,
        message: `« ${a.nm} » ne laisse que ${px - pa} F de marge sur ${px} F, soit ${Math.round((px - pa) / px * 100)} %.`,
        suggestion: "Verifier le prix d'achat : une marge sous 5 % cache souvent une erreur de saisie.",
      });
    }

    if (px > 0 && pa === 0) {
      out.push({
        gravite: "moyenne", type: "achat_manquant", article_id: a.id, article: a.nm,
        message: `« ${a.nm} » n'a pas de prix d'achat : son benefice est compte comme du 100 % de marge.`,
        suggestion: "Saisir le prix d'achat pour que le benefice affiche soit juste.",
      });
    }

    const vr = (a.vr || []).filter((v) => Number(v.px) > 0);
    if (vr.length >= 2) {
      const prix = vr.map((v) => Number(v.px));
      const mn = Math.min(...prix), mx = Math.max(...prix);
      if (mx >= mn * 2.5) {
        out.push({
          gravite: "basse", type: "variantes_dispersees", article_id: a.id, article: a.nm,
          message: `Les variantes de « ${a.nm} » vont de ${mn} F a ${mx} F.`,
          suggestion: "Si ce sont des conditionnements differents (sachet, litre, carton), regle le champ qBase de chaque variante pour que le stock se decompte correctement.",
        });
      }
      for (const v of vr) {
        if (Number(v.pa) > 0 && Number(v.px) <= Number(v.pa)) {
          out.push({
            gravite: "haute", type: "marge_negative_variante", article_id: a.id, article: `${a.nm} / ${v.nm}`,
            message: `La variante « ${v.nm} » de « ${a.nm} » est achetee ${v.pa} F et vendue ${v.px} F.`,
            suggestion: "Corriger le prix de cette variante.",
          });
        }
      }
    }

    if (a.um && !a.umSac) {
      out.push({
        gravite: "basse", type: "conditionnement_incomplet", article_id: a.id, article: a.nm,
        message: `« ${a.nm} » se vend au ${a.um} mais la contenance du sac n'est pas renseignee.`,
        suggestion: `Indiquer combien de ${a.um} contient un sac, sinon un appro d'un sac n'ajoute qu'une unite au stock.`,
      });
    }

    if (stk < 0) {
      out.push({
        gravite: "haute", type: "stock_negatif", article_id: a.id, article: a.nm,
        message: `Le stock de « ${a.nm} » est negatif (${stk}).`,
        suggestion: "Faire un inventaire de cet article : des ventes ont ete saisies sans appro correspondant.",
      });
    }

    const v30 = vendus30.get(a.id);
    if (aVenduRecemment && !v30 && stk > 0 && px > 0 && stk * px >= 5000) {
      out.push({
        gravite: "basse", type: "dormant", article_id: a.id, article: a.nm,
        message: `« ${a.nm} » n'a rien vendu depuis 30 jours et immobilise ${stk * px} F.`,
        suggestion: "Le mettre en avant, baisser le prix, ou arreter de le rassortir.",
      });
    }
  }

  const parNom = new Map<string, Article[]>();
  for (const a of arts) {
    const k = normaliser(a.nm);
    if (!k) continue;
    parNom.set(k, [...(parNom.get(k) || []), a]);
  }
  for (const [, groupe] of parNom) {
    if (groupe.length > 1) {
      out.push({
        gravite: "moyenne", type: "doublon", article_id: groupe[0].id, article: groupe[0].nm,
        message: `« ${groupe[0].nm} » existe en ${groupe.length} fiches (ids ${groupe.map((a) => a.id).join(", ")}).`,
        suggestion: "Fusionner : garder une seule fiche et passer les autres en variantes.",
      });
    }
  }

  const rang = { haute: 0, moyenne: 1, basse: 2 };
  return out.sort((a, b) => rang[a.gravite] - rang[b.gravite]);
}

// ---------------------------------------------------------------- executeur

export function executer(nom: string, args: Record<string, unknown>, data: Data): unknown {
  switch (nom) {
    case "chercher_article":
      return chercher(data, String(args.terme || ""));

    case "top_articles": {
      const jours = Number(args.jours) || 30;
      const par = String(args.par || "quantite");
      const limite = Number(args.limite) || 10;
      const bas = args.ordre === "bas";
      const acc = ventesParArticle(data, jours);
      const cle = par === "ca" ? "ca" : par === "benefice" ? "benefice" : "quantite";
      const liste = [...acc.entries()].map(([id, v]) => ({
        id, nom: v.nm, quantite: v.qte, ca: Math.round(v.ca), benefice: Math.round(v.marge),
      }));
      liste.sort((a, b) => {
        const x = (a as Record<string, number>)[cle];
        const y = (b as Record<string, number>)[cle];
        return bas ? x - y : y - x;
      });
      return { periode_jours: jours, classement: liste.slice(0, limite) };
    }

    case "a_rassortir": {
      const limite = Number(args.limite) || 15;
      const acc = ventesParArticle(data, 30);
      const liste = (data.articles || []).map((a) => {
        const stk = stockTotal(a);
        const vendu30 = acc.get(a.id)?.qte || 0;
        const parJour = vendu30 / 30;
        const jours = parJour > 0 ? Math.floor(stk / parJour) : null;
        return {
          id: a.id, nom: a.nm, stock: stk, alerte: Number(a.al) || 5,
          vendu_30j: vendu30, jours_restants: jours,
          conseil_quantite: parJour > 0 ? Math.max(1, Math.ceil(parJour * 14 - stk)) : null,
        };
      }).filter((x) => x.stock <= x.alerte || (x.jours_restants !== null && x.jours_restants <= 7))
        .sort((a, b) => (a.jours_restants ?? 999) - (b.jours_restants ?? 999) || b.vendu_30j - a.vendu_30j);
      return { a_rassortir: liste.slice(0, limite), note: "conseil_quantite couvre environ 14 jours de vente" };
    }

    case "chiffres_periode": {
      const j = Number(args.jours) || 7;
      const calc = (de: number, a: number) => {
        const v = (data.ventes || []).filter((x) => {
          if (x.annulee) return false;
          const e = joursEcoules(x.date);
          return e >= de && e < a;
        });
        const dep = (data.depenses || []).filter((x) => {
          const e = joursEcoules(x.date);
          return e >= de && e < a;
        }).reduce((s, x) => s + (Number(x.amt) || 0), 0);
        return {
          tickets: v.length,
          ca: Math.round(v.reduce((s, x) => s + (Number(x.total) || 0), 0)),
          benefice: Math.round(v.reduce((s, x) => s + (Number(x.benefice ?? x.ben) || 0), 0)),
          depenses: Math.round(dep),
        };
      };
      const actuel = calc(0, j);
      const precedent = calc(j, j * 2);
      return {
        periode: `${j} derniers jours`, actuel, periode_precedente: precedent,
        evolution_ca_pct: precedent.ca ? Math.round((actuel.ca - precedent.ca) / precedent.ca * 100) : null,
        resultat_net: actuel.benefice - actuel.depenses,
      };
    }

    case "controle_coherence": {
      const an = controle(data);
      return {
        total: an.length,
        hautes: an.filter((x) => x.gravite === "haute").length,
        anomalies: an.slice(0, 25),
      };
    }

    case "clients_credit": {
      const limite = Number(args.limite) || 10;
      return (data.clients || [])
        .filter((c) => (Number(c.credit) || 0) > 0)
        .sort((a, b) => (Number(b.credit) || 0) - (Number(a.credit) || 0))
        .slice(0, limite)
        .map((c) => ({ id: c.id, nom: c.nm, telephone: c.tel, credit: Number(c.credit) || 0 }));
    }

    default:
      return { erreur: `outil inconnu: ${nom}` };
  }
}
