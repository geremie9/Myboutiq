// ═══════════════════════════════════════════════════════════════════
//  ia — DÉSACTIVÉE (10 octobre 2026)
//
//  La version 1 (vente à la voix, fiche article, assistant) n'a jamais été
//  appelée par l'app : ia_journal, 0 appel depuis sa création. Mais elle
//  était en ligne, et n'importe quel compte pouvait l'utiliser pour sa
//  boutique, 200 fois par jour — avec la clé Anthropic du patron si elle
//  était posée. Cette version répond « désactivée » à tout, sans rien
//  appeler : aucune dépense possible, et la clé n'est pas détruite.
//
//  Le code complet est gardé dans ./original/. Avant de le redéployer :
//  modèles actuels (claude-haiku-5-5 pour vente/fiche, claude-sonnet-5-5
//  pour le chat — voir la skill claude-api), et plus de `tool_choice`
//  forcé : Sonnet 5.5 le refuse.
// ═══════════════════════════════════════════════════════════════════
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  return new Response(JSON.stringify({ erreur: "IA désactivée" }), {
    status: 503,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
