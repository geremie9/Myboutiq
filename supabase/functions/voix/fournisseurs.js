// ═══════════════════════════════════════════════════════════════════
//  Les services de transcription payants (23.80).
//
//  Une phrase courte (3–6 s) part chez UN fournisseur, avec la liste des
//  articles de LA boutique : c'est ce qui fait reconnaître « Mützig »,
//  « Tangui », « Tasty Tom » — là où ces services sont les plus faibles.
//  Interchangeables : le serveur choisit par une variable, et passe au
//  suivant si le premier échoue. Le même fichier sert au comparateur
//  (outils/voix-banc/), pour choisir le fournisseur sur de vraies phrases.
//
//  Prix relevés en novembre 2026 (comparatifs, à revérifier) : Groq ≈
//  0,0007 $/min, AssemblyAI ≈ 0,0025 $/min, OpenAI mini ≈ 0,003 $/min.
// ═══════════════════════════════════════════════════════════════════

export const FOURNISSEURS = {
  groq:       { url: 'https://api.groq.com/openai/v1/audio/transcriptions', modele: 'whisper-large-v3-turbo', format: 'verbose_json' },
  openai:     { url: 'https://api.openai.com/v1/audio/transcriptions',      modele: 'gpt-4o-mini-transcribe', format: 'json' },
  assemblyai: { url: 'https://api.assemblyai.com/v2' },
};

// Les mots de la boutique, propres et bornés : un nom par article, sans
// doublon, sans caractère de contrôle, 150 au plus.
export function motsPropres(mots) {
  const vus = new Set(), out = [];
  for (const m of Array.isArray(mots) ? mots : []) {
    const s = String(m == null ? '' : m).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    const k = s.toLowerCase();
    if (s && !vus.has(k)) { vus.add(k); out.push(s); }
    if (out.length >= 150) break;
  }
  return out;
}

// L'invite donnée au modèle : le contexte, puis les noms qu'il doit connaître.
export function invite(mots) {
  const l = motsPropres(mots);
  return ('Boutique au Cameroun, prix en francs CFA. Articles : ' + l.join(', ') + '.').slice(0, 800);
}

async function compatibleOpenAI(f, cle, son, nomFichier, mots, signal) {
  const fd = new FormData();
  fd.append('file', son, nomFichier || 'phrase.webm');
  fd.append('model', f.modele);
  fd.append('language', 'fr');
  fd.append('prompt', invite(mots));
  fd.append('response_format', f.format);
  fd.append('temperature', '0');
  const r = await fetch(f.url, { method: 'POST', headers: { Authorization: 'Bearer ' + cle }, body: fd, signal });
  if (!r.ok) throw new Error('http-' + r.status);
  const j = await r.json();
  return { texte: String(j.text || '').trim(), secondes: Number(j.duration) || 0 };
}

async function assembly(cle, son, mots, signal, delai) {
  const base = FOURNISSEURS.assemblyai.url;
  const up = await fetch(base + '/upload', { method: 'POST', headers: { authorization: cle }, body: son, signal });
  if (!up.ok) throw new Error('http-' + up.status);
  const { upload_url } = await up.json();
  const cree = await fetch(base + '/transcript', {
    method: 'POST', headers: { authorization: cle, 'content-type': 'application/json' }, signal,
    body: JSON.stringify({ audio_url: upload_url, language_code: 'fr', word_boost: motsPropres(mots).slice(0, 100), boost_param: 'high' }),
  });
  if (!cree.ok) throw new Error('http-' + cree.status);
  const { id } = await cree.json();
  const fin = Date.now() + delai;
  while (Date.now() < fin) {
    await new Promise(r => setTimeout(r, 400));
    const g = await fetch(base + '/transcript/' + encodeURIComponent(id), { headers: { authorization: cle }, signal });
    if (!g.ok) throw new Error('http-' + g.status);
    const j = await g.json();
    if (j.status === 'completed') return { texte: String(j.text || '').trim(), secondes: Number(j.audio_duration) || 0 };
    if (j.status === 'error') throw new Error('assemblyai-erreur');
  }
  throw new Error('delai');
}

// Transcrit `son` (Blob) chez `nom`. Jamais plus de `delai` ms : au-delà, le
// téléphone repasse au tactile — une vente n'attend pas un serveur.
export async function transcrire(nom, cle, son, nomFichier, mots, { delai = 9000 } = {}) {
  const f = FOURNISSEURS[nom];
  if (!f) throw new Error('fournisseur-inconnu');
  if (!cle) throw new Error('cle-absente');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), delai);
  try {
    return nom === 'assemblyai'
      ? await assembly(cle, son, mots, ctl.signal, delai)
      : await compatibleOpenAI(f, cle, son, nomFichier, mots, ctl.signal);
  } finally { clearTimeout(t); }
}
