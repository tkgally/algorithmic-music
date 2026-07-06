---
title: Machine learning and music generation
tags: [algorithms]
status: draft
created: 2026-07-06
updated: 2026-07-06
summary: Survey of ML music generation (symbolic and audio), what it teaches this project, and why the engines here remain rule/knowledge-based — with the browser-feasibility facts for revisiting that choice.
---

# Machine learning and music generation

Machine learning dominates music generation research and industry since the late 2010s, and any honest knowledge base must map it — both for its lessons and to justify this project's deliberate choice *not* to build neural engines. This page stays at survey depth; if the project ever revisits the choice, this page gets expanded first. Claims are stated to the author's knowledge cutoff (early 2026) and should be re-verified when acted on.

## The two families

**Symbolic models** generate notes/events: folk-rnn (LSTM over ABC notation folk tunes — notably idiomatic within its narrow style); MusicVAE (hierarchical latent space over melodies/trios, meaningful interpolation); Music Transformer (long-range structure via attention; convincing piano continuations); Coconet (Bach chorale infilling); pop-song systems (e.g., "Pop Music Transformer"/REMI representations emphasizing beat-position tokens). Lessons transferable to this project: representation matters enormously (beat-position and bar-aware encodings outperform raw event streams — mirroring this project's beats-first [engine-architecture](engine-architecture.md)); narrow stylistic scope beats general mush ([style-and-genre-overview](style-and-genre-overview.md)); long-range structure remains the hard problem even for transformers — exactly the failure this project attacks with explicit planning ([generative-music-design-patterns](generative-music-design-patterns.md) P1–P3).

**Audio models** generate waveforms: Jukebox (2020, raw-audio VQ-VAE, striking but incoherent long-range), then diffusion and token-based systems culminating in the commercial Suno/Udio generation (2023–), which produce full produced songs. Their reception is instructive for evaluation: fluent surface, popular uptake, and persistent critiques of sameness and "slop" — see [what-makes-music-good](what-makes-music-good.md). Legally contested training practices (label lawsuits against Suno/Udio filed 2024) also inform this project's caution about corpus use ([corpus-analysis](corpus-analysis.md)).

## Why this project's engines are not neural

1. **Constraint fit.** Engines must run client-side, dependency-free, ideally from `file://` ([project-mission](project-mission.md)). Useful neural models mean shipping weights (tens of MB+) and an inference runtime — possible (Magenta.js/TensorFlow.js, onnxruntime-web, WebGPU) but hostile to the constraint and to longevity.
2. **Inspectability.** The project's method is knowledge-driven iteration: every musical decision should be traceable to a rule, table, or plan that can be criticized and improved ([improvement-loop](improvement-loop.md)). Neural decisions resist that loop at this project's scale.
3. **The interesting bet.** An LLM (Claude) authoring and tuning arbitrarily large *explicit* rule systems is a genuinely under-explored regime — historically, rule-based systems were limited by human authoring budgets (Ebcioğlu hand-wrote ~350 rules; see [constraint-and-rule-based-methods](constraint-and-rule-based-methods.md)). That budget constraint is gone. This project tests how far knowledge-plus-rules can now go.

## What ML still contributes here

- **Analysis, not synthesis**: dev-time corpus statistics (possibly using ML tooling offline) feeding style packs ([corpus-analysis](corpus-analysis.md)).
- **Evaluation ideas**: the generative-model evaluation literature (feature-distribution comparisons against reference corpora — Yang & Lerch-style) transfers directly to [computational-music-metrics](computational-music-metrics.md).
- **Representation lessons** as above; and interpolation/latent-space ideas inspire parameter-space design for macro controls.
- **A future option**: tiny learned components (e.g., a few-KB Markov/PPM table trained on public-domain corpora is technically "ML" and fully compatible with the constraints — the boundary worth watching is *shipped opaque weights*, not learning per se).

## Implications for generative engines

- Do not chase neural fluency; compete where explicit systems win — form, intention, inspectability, endless duration, tiny footprint, interactivity.
- Steal representations: beat/bar-aware event encodings, explicit cadence/section tokens (this project's `tags` field carries analytical intent for exactly this reason).
- Watch the browser-inference frontier casually (WebGPU inference matures fast) but revisit only with a concrete musical need metrics can't meet otherwise.

## Related pages

- [algorithmic-composition-history](algorithmic-composition-history.md) — where ML sits in the longer arc
- [markov-and-statistical-models](markov-and-statistical-models.md) — the statistical border zone
- [constraint-and-rule-based-methods](constraint-and-rule-based-methods.md) · [corpus-analysis](corpus-analysis.md) · [what-makes-music-good](what-makes-music-good.md)

## Sources

- Author knowledge (cutoff early 2026) of: folk-rnn (Sturm et al.), MusicVAE (Roberts et al. 2018), Music Transformer (Huang et al. 2018), Coconet (Huang et al. 2017), Jukebox (Dhariwal et al. 2020), Magenta.js documentation, RIAA/label suits vs Suno & Udio (2024, ongoing). A future session should verify current state and add URLs — flagged as this page's main lint debt.
