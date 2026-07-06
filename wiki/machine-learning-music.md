---
title: Machine learning and music generation
tags: [algorithms]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: Survey of ML music generation (symbolic and audio), what it teaches this project, and why the engines here remain rule/knowledge-based — with the browser-feasibility facts for revisiting that choice.
---

# Machine learning and music generation

Machine learning dominates music generation research and industry since the late 2010s, and any honest knowledge base must map it — both for its lessons and to justify this project's deliberate choice *not* to build neural engines. This page stays at survey depth; if the project ever revisits the choice, this page gets expanded first. Claims are stated to the author's knowledge cutoff (early 2026) and should be re-verified when acted on.

## The two families

**Symbolic models** generate notes/events: folk-rnn (LSTM over ABC-notation folk tunes — notably idiomatic within its narrow style); MusicVAE (hierarchical latent space over melodies/trios, whose hierarchical decoder avoids posterior collapse and yields meaningful interpolation); Music Transformer (long-range structure via *relative* attention; convincing minute-long piano continuations); Coconet (Bach-chorale infilling via blocked Gibbs sampling over a convolutional NADE — the model behind Google's 2019 Bach Doodle); pop-song systems (e.g., "Pop Music Transformer"/REMI representations emphasizing beat-position tokens). Lessons transferable to this project: representation matters enormously (beat-position and bar-aware encodings outperform raw event streams — mirroring this project's beats-first [engine-architecture](engine-architecture.md)); narrow stylistic scope beats general mush ([style-and-genre-overview](style-and-genre-overview.md)); long-range structure remains the hard problem even for transformers — exactly the failure this project attacks with explicit planning ([generative-music-design-patterns](generative-music-design-patterns.md) P1–P3).

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

- Sturm, B. L., Santos, J. F., Ben-Tal, O. & Korshunova, I. "Music transcription modelling and composition using deep learning" (folk-rnn). *Proc. 1st Conf. on Computer Simulation of Musical Creativity* (2016). https://arxiv.org/abs/1604.08723
- Roberts, A., Engel, J., Raffel, C., Hawthorne, C. & Eck, D. "A Hierarchical Latent Vector Model for Learning Long-Term Structure in Music" (MusicVAE). *ICML 2018*. https://arxiv.org/abs/1803.05428
- Huang, C.-Z. A. et al. "Music Transformer: Generating Music with Long-Term Structure." arXiv 2018 (*ICLR 2019*). https://arxiv.org/abs/1809.04281
- Huang, C.-Z. A., Cooijmans, T., Roberts, A., Courville, A. & Eck, D. "Counterpoint by Convolution" (Coconet). *ISMIR 2017*; arXiv:1903.07227 (2019). https://arxiv.org/abs/1903.07227 — Bach Doodle write-up: https://magenta.withgoogle.com/coconet
- Huang, Y.-S. & Yang, Y.-H. "Pop Music Transformer: Beat-based Modeling and Generation of Expressive Pop Piano Compositions" (REMI). *ACM Multimedia 2020*. https://arxiv.org/abs/2002.00212
- Dhariwal, P., Jun, H., Payne, C., Kim, J. W., Radford, A. & Sutskever, I. "Jukebox: A Generative Model for Music." arXiv 2020. https://arxiv.org/abs/2005.00341
- Yang, L.-C. & Lerch, A. "On the evaluation of generative models in music." *Neural Computing and Applications* 32 (2020), 4773–4784. https://doi.org/10.1007/s00521-018-3849-7
- RIAA. "Record Companies Bring Landmark Cases for Responsible AI Against Suno and Udio…" Press release, 2024-06-24 (suits by Sony Music, UMG, and Warner in D. Mass. and SDNY). https://www.riaa.com/record-companies-bring-landmark-cases-for-responsible-ai-againstsuno-and-udio-in-boston-and-new-york-federal-courts-respectively/
