# Vidéo longue MyBoutiQ (verticale) — sources

Projet HyperFrames. Les MP4 et l'audio généré ne sont pas versionnés : ils se refabriquent.

- `BRIEF.md` — la demande, les décisions et la suite.
- `STORYBOARD.md` — les 15 parties et le texte de la v1 (voix seule, 4 min 08, livrée le 16/10/2026).
- `SCRIPT-dialogue.md` — le texte EN DIALOGUE validé (H = le boutiquier, F = MyBoutiQ) : la v2.
- `captures/capt.mjs` — les captures réelles de l'app, par le banc (chemins de sortie à adapter) ;
  `rects.json` = positions des éléments ; `assets/app/` = les captures.
- `voix.py` (v1) / `voix-dialogue.py` (v2) — voix par phrase / par réplique (Kokoro local) → `voix.json`.
- `gen.mjs` — scènes, sous-titres et `index.html` calés sur la vraie voix → `timings.json`.
- `mix.py` / `musique.py` — piste de voix unique et musique (synthèse locale) baissée sous la voix.

## Refaire la v2 (dialogue, 3 min 35)

    pip install kokoro-onnx soundfile numpy
    HYPERFRAMES_PYTHON=$(which python3) python3 voix-dialogue.py
    node gen.mjs && python3 mix.py
    npx hyperframes check
    npx hyperframes render -o renders/myboutiq-dialogue.mp4 --fps 30 --crf 21

Voix v2 : H = `pm_alex` (Kokoro, phonèmes fr-fr), F = `ff_siwis` (vitesse 1,0), « H et F » mêlées.
Sous-titres : orange = le boutiquier, sombre = MyBoutiQ, blanc = les deux.
Pour de vraies voix françaises (HeyGen) : autoriser api.heygen.com / app.heygen.com /
upload.heygen.com dans le réseau de l'environnement et poser la clé dans HEYGEN_API_KEY.
