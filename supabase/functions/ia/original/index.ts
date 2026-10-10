// ⚠️ CE CODE N'EST PAS DÉPLOYÉ. C'est la version 1 de la fonction « ia »,
// recopiée depuis Supabase le 10 octobre 2026 avant d'être remplacée par un
// interrupteur (../index.ts). Jamais appelée par l'app (ia_journal : 0 appel),
// elle restait ouverte à tout compte, sur la clé Anthropic du patron.
// Avant de la redéployer : passer aux modèles actuels (claude-haiku-5-5,
// claude-sonnet-5-5 — voir la skill claude-api) ; Sonnet 5.5 refuse le
// `tool_choice` forcé utilisé par `extraire`.
//
// Myboutiq — Edge Function « ia »
// Quatre actions :
//   controle : audit des donnees, 100 % local, aucun appel modele, gratuit
//   vente    : « deux savons et un litre d'huile » -> lignes de panier
//   fiche    : propose categorie, emoji, prix et mots-cles pour un article
//   chat     : assistant de gestion avec outils sur les donnees de la boutique
//
// Secret obligatoire :
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Optionnels : MODELE_CHAT, MODELE_RAPIDE, QUOTA_JOUR

import { createClient } from "jsr:@supabase/supabase-js@2";
import { type Data, catalogueCompact, resume } from "./contexte.ts";
import { OUTILS, controle, executer } from "./outils.ts";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const CLE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLE_IA = Deno.env.get("ANTHROPIC_API_KEY");
const MODELE_CHAT = Deno.env.get("MODELE_CHAT") ?? "claude-sonnet-5";
const MODELE_RAPIDE = Deno.env.get("MODELE_RAPIDE") ?? "claude-haiku-4-5-20251001";
const QUOTA_JOUR = Number(Deno.env.get("QUOTA_JOUR") ?? "200");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type Bloc = { type: string; [k: string]: unknown };

async function appelIA(corps: Record<string, unknown>) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CLE_IA!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(corps),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return await r.json();
}

/** Force le modele a repondre via un outil : on recupere du JSON garanti. */
async function extraire(modele: string, systeme: string, message: string, outil: Record<string, unknown>) {
  const rep = await appelIA({
    model: modele,
    max_tokens: 1500,
    system: systeme,
    tools: [outil],
    tool_choice: { type: "tool", name: outil.name },
    messages: [{ role: "user", content: message }],
  });
  const bloc = (rep.content as Bloc[]).find((b) => b.type === "tool_use");
  return { donnees: bloc?.input ?? null, usage: rep.usage };
}

const SYS_VENTE = `Tu transformes une phrase dite a voix haute par un commercant camerounais en lignes de panier.

Regles absolues :
- Tu ne choisis QUE parmi les articles du catalogue fourni, jamais un article inexistant.
- Si la phrase mentionne quelque chose qui n'est pas au catalogue, mets-le dans "non_trouves".
- Si deux articles collent autant l'un que l'autre, ne devine pas : confiance basse et les deux dans "ambigus".
- Les quantites peuvent etre dites en toutes lettres ("deux", "une demi-douzaine") ou implicites ("un savon" = 1).
- Le francais peut etre approximatif. "uile" = huile, "savon menage" = savon de menage.
- Attention au conditionnement : "un sac de riz" et "un kilo de riz" ne sont pas la meme ligne. Si l'article a des variantes, choisis la bonne et dis laquelle.
- Tu ne valides jamais la vente : tu proposes, le commercant confirme.`;

const SYS_FICHE = `Tu remplis la fiche d'un nouvel article pour une boutique de quartier au Cameroun.
Reste sobre et concret : le nom doit etre celui qu'un commercant dit au comptoir, pas un libelle marketing.
Ne propose JAMAIS de prix invente comme s'il etait certain : un prix propose est un ordre de grandeur a confirmer.`;

const SYS_CHAT = `Tu es l'assistant de gestion de Myboutiq, pour un commercant de boutique de quartier au Cameroun.

Ta facon de repondre :
- Court. Trois phrases valent mieux qu'un rapport.
- Des chiffres, pas des generalites. Toujours passer par les outils avant d'avancer un nombre : tu n'as pas le droit d'estimer de tete.
- Francais simple, direct, sans jargon comptable. Montants en FCFA, arrondis.
- Si les donnees ne permettent pas de repondre, dis-le franchement plutot que de meubler.
- Tu peux donner un avis quand on te le demande, mais distingue ce que disent les chiffres de ce que tu supposes.
- Tu ne modifies rien dans la boutique : tu lis, tu analyses, tu conseilles. Toute action reste au commercant.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "POST attendu" }, 405);

  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer /i, "");
    if (!jwt) return json({ erreur: "Non authentifie" }, 401);

    const sbUser = createClient(URL_SB, CLE_ANON, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: auth, error: errAuth } = await sbUser.auth.getUser();
    if (errAuth || !auth?.user) return json({ erreur: "Session invalide" }, 401);
    const userId = auth.user.id;

    const corps = await req.json().catch(() => ({}));
    const action = String(corps.action || "");
    const code = String(corps.code || "");
    if (!code) return json({ erreur: "code boutique manquant" }, 400);

    const sb = createClient(URL_SB, CLE_SERVICE);
    const { data: bq } = await sb.from("boutiques")
      .select("id, code, nom, owner_id, data, devise_symbole, plan")
      .eq("code", code).maybeSingle();
    if (!bq) return json({ erreur: "Boutique introuvable" }, 404);

    let autorise = bq.owner_id === userId;
    if (!autorise) {
      const { data: acc } = await sb.from("acces_boutique")
        .select("id").eq("boutique_id", bq.id).eq("user_id", userId).maybeSingle();
      autorise = !!acc;
    }
    if (!autorise) {
      const { data: adm } = await sb.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
      autorise = !!adm;
    }
    if (!autorise) return json({ erreur: "Acces refuse a cette boutique" }, 403);

    const data = (bq.data || {}) as Data;
    const devise = bq.devise_symbole || "F";

    if (action === "controle") {
      const an = controle(data);
      return json({
        ok: true, cout: 0, anomalies: an,
        resume: {
          total: an.length,
          hautes: an.filter((x) => x.gravite === "haute").length,
          moyennes: an.filter((x) => x.gravite === "moyenne").length,
          basses: an.filter((x) => x.gravite === "basse").length,
        },
      });
    }

    if (!CLE_IA) return json({ erreur: "ANTHROPIC_API_KEY non configuree" }, 503);

    const debut = new Date(); debut.setHours(0, 0, 0, 0);
    const { count } = await sb.from("ia_journal")
      .select("id", { count: "exact", head: true })
      .eq("boutique_id", bq.id).gte("created_at", debut.toISOString());
    if ((count ?? 0) >= QUOTA_JOUR) {
      return json({ erreur: `Quota IA du jour atteint (${QUOTA_JOUR} requetes).` }, 429);
    }

    const journaliser = async (act: string, usage: Record<string, number> | undefined, modele: string) => {
      await sb.from("ia_journal").insert({
        boutique_id: bq.id, user_id: userId, action: act, modele,
        tokens_entree: usage?.input_tokens ?? 0, tokens_sortie: usage?.output_tokens ?? 0,
      });
    };

    if (action === "vente") {
      const texte = String(corps.texte || "").slice(0, 500);
      if (!texte.trim()) return json({ erreur: "texte vide" }, 400);

      const outil = {
        name: "panier",
        description: "Lignes de panier reconnues dans la phrase.",
        input_schema: {
          type: "object",
          properties: {
            lignes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  article_id: { type: "integer" },
                  variante_id: { type: ["integer", "null"] },
                  nom: { type: "string" },
                  quantite: { type: "number" },
                  confiance: { type: "number", description: "0 a 1" },
                },
                required: ["article_id", "nom", "quantite", "confiance"],
              },
            },
            non_trouves: { type: "array", items: { type: "string" } },
            ambigus: { type: "array", items: { type: "string" } },
          },
          required: ["lignes", "non_trouves", "ambigus"],
        },
      };

      const { donnees, usage } = await extraire(
        MODELE_RAPIDE, SYS_VENTE,
        `Catalogue de la boutique :\n${catalogueCompact(data)}\n\nPhrase entendue : « ${texte} »`,
        outil,
      );
      await journaliser("vente", usage, MODELE_RAPIDE);
      return json({ ok: true, ...(donnees as object), texte });
    }

    if (action === "fiche") {
      const nom = String(corps.nom || "").slice(0, 120);
      if (!nom.trim()) return json({ erreur: "nom vide" }, 400);

      const cats = [...new Set((data.articles || []).map((a) => a.cat).filter(Boolean))];
      const outil = {
        name: "fiche_article",
        description: "Fiche proposee pour un nouvel article.",
        input_schema: {
          type: "object",
          properties: {
            nom: { type: "string", description: "Nom court tel qu'un commercant le dit, 30 caracteres max" },
            emoji: { type: "string" },
            categorie: { type: "string" },
            unite: { type: "string", description: "unite, kg, L, sachet, carton..." },
            contenance: { type: "string" },
            mots_cles: { type: "array", items: { type: "string" }, description: "3 a 5 synonymes, fautes courantes incluses" },
            conditionnements: {
              type: "array",
              description: "Variantes de vente si le produit se vend en plusieurs formats",
              items: {
                type: "object",
                properties: {
                  nom: { type: "string" },
                  q_base: { type: "number", description: "combien d'unites de base dans ce format" },
                },
                required: ["nom", "q_base"],
              },
            },
            prix_indicatif: { type: ["number", "null"], description: "ordre de grandeur en FCFA, null si inconnu" },
            avertissement: { type: "string", description: "ce dont tu n'es pas sur" },
          },
          required: ["nom", "emoji", "categorie", "unite", "mots_cles"],
        },
      };

      const { donnees, usage } = await extraire(
        MODELE_RAPIDE, SYS_FICHE,
        `Nouvel article a ficher : « ${nom} »\n` +
        `Categories deja utilisees dans cette boutique : ${cats.join(", ") || "aucune"}.\n` +
        `Reutilise une categorie existante si elle convient.`,
        outil,
      );
      await journaliser("fiche", usage, MODELE_RAPIDE);
      return json({ ok: true, fiche: donnees });
    }

    if (action === "chat") {
      const entrants = Array.isArray(corps.messages) ? corps.messages : [];
      const messages: Record<string, unknown>[] = entrants.slice(-12).map((m: Record<string, unknown>) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 4000),
      }));
      if (!messages.length) return json({ erreur: "aucun message" }, 400);

      const systeme =
        `${SYS_CHAT}\n\n` +
        `Boutique : ${bq.nom}. Monnaie : ${devise} (FCFA). Date du jour : ${new Date().toISOString().slice(0, 10)}.\n\n` +
        `Etat actuel :\n${resume(data, devise)}`;

      const usageTotal = { input_tokens: 0, output_tokens: 0 };
      const outilsUtilises: string[] = [];

      for (let tour = 0; tour < 6; tour++) {
        const rep = await appelIA({
          model: MODELE_CHAT, max_tokens: 1200, system: systeme,
          tools: OUTILS, messages,
        });
        usageTotal.input_tokens += rep.usage?.input_tokens ?? 0;
        usageTotal.output_tokens += rep.usage?.output_tokens ?? 0;

        const blocs = rep.content as Bloc[];
        const appels = blocs.filter((b) => b.type === "tool_use");

        if (rep.stop_reason !== "tool_use" || !appels.length) {
          const texte = blocs.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
          await journaliser("chat", usageTotal, MODELE_CHAT);
          return json({ ok: true, reponse: texte, outils: outilsUtilises, usage: usageTotal });
        }

        messages.push({ role: "assistant", content: blocs });
        messages.push({
          role: "user",
          content: appels.map((a) => {
            outilsUtilises.push(String(a.name));
            let res: unknown;
            try {
              res = executer(String(a.name), (a.input || {}) as Record<string, unknown>, data);
            } catch (e) {
              res = { erreur: String(e) };
            }
            return { type: "tool_result", tool_use_id: a.id, content: JSON.stringify(res).slice(0, 12000) };
          }),
        });
      }

      await journaliser("chat", usageTotal, MODELE_CHAT);
      return json({ ok: true, reponse: "Je n'ai pas reussi a conclure. Reformule ta question plus simplement.", usage: usageTotal });
    }

    return json({ erreur: `action inconnue: ${action}` }, 400);
  } catch (e) {
    console.error(e);
    return json({ erreur: String(e).slice(0, 300) }, 500);
  }
});
