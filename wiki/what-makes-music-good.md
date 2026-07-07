---
title: What makes music good
tags: [craft, evaluation]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: Competing standards for judging music — formalism, expression theories, Meyer's expectation-based meaning, craft-teacher criteria, listener-centered functional value — plus what the 2024–2026 AI-music discourse and attribution-bias studies imply for evaluating generated output.
---

# What makes music good

Before an engine can be improved it needs a target, and "good music" is a contested target with several live definitions: beauty located in the notes themselves, expressive or emotional power, well-managed expectation within a style, professional craft standards, and fitness for a listener's actual use. This page maps those positions, then summarizes the 2024–2026 discourse around AI-generated music — the "slop" critique, the authenticity debates, and the measured bias against machine-attributed work — because this project's output will be judged inside that discourse whether or not it uses machine learning. The practical conclusion up front: aim for formal intention and specificity, evaluate blind where possible, and treat "good for a purpose" as the tractable first target.

## Formalism: the beauty is in the tonal forms

Eduard Hanslick's *Vom Musikalisch-Schönen* (1854) is the founding document of musical formalism. His slogan — music's content is "tonally moving forms" (*tönend bewegte Formen*) — claims musical beauty is specifically musical: it lives in themes, their motion, and their working-out, not in represented feelings. Hanslick denies that music's purpose is to arouse or depict emotion; whatever feelings arise are side effects, and judging music by them is judging it by accident. (Translation note: recent scholarship argues Payzant's standard rendering underplays the *sounding*, acoustic dimension of Hanslick's phrase.) Peter Kivy's "enhanced formalism" softens this: music can genuinely possess expressive properties (a contour can *be* sad the way a St. Bernard's face is sad), but those properties are heard features of the form, and value still rests on structure. Formalism is the friendliest position for an engine: it implies goodness is in principle a property of the note relationships themselves — analyzable, even computable — rather than of the composer's inner life.

## Expression and arousal theories

The opposing family holds that music is good when it expresses or arouses emotion: Tolstoy cast art as the transmission of felt emotion from artist to audience, and Collingwood as the artist's expression and clarification of emotion (not the relay of a pre-formed feeling); arousalists locate value in the listener's evoked response. Pure transmission theories have an obvious problem for algorithmic music (no artist emotion exists to transmit), but they survive in public intuitions — see the AI discourse below, where "the machine felt nothing" functions as a verdict. Arousal versions are empirically tractable: whether listeners actually feel something is measurable (see [emotion-and-meaning.md](emotion-and-meaning.md) and [pleasure-and-reward.md](pleasure-and-reward.md)).

## Meyer: meaning as managed expectation within a style

Leonard Meyer's *Emotion and Meaning in Music* (1956) is the workable synthesis for this project: musical meaning and affect arise when learned stylistic expectations are aroused, inhibited, deviated from, and resolved. Goodness on this view is neither mystical nor purely structural — it is skillful play with a listener's predictions inside a shared style. This account has since acquired quantitative teeth (information content, entropy, the inverted-U preference curve) covered in [musical-expectation.md](musical-expectation.md) and [complexity-and-preference.md](complexity-and-preference.md); it is the position the engine can most directly optimize toward.

## Scruton: understanding as metaphor and motion

Roger Scruton (*The Aesthetics of Music*, 1997) argues musical understanding is hearing sounds acousmatically — detached from their physical sources — and organized through irreducibly metaphorical concepts: movement, space, gravity, tension. To hear music *as music* is to hear motion in tones where physically there are only discrete events. Two takeaways: first, listeners judge music partly by whether it moves coherently through this virtual space (aimless motion reads as bad); second, Scruton ties musical taste to character and culture, a reminder that judgments of "good" carry moral and social freight beyond acoustics.

## What craft teachers actually grade

Composition pedagogy operationalizes "good" as a checklist of learnable competencies, and the list is stable across institutions: correct and purposeful voice leading; harmonic logic; formal clarity (audible sections, transitions that work); pacing and a convincing climax; orchestration balance (melody audible, registers uncluttered); idiomatic writing; memorability of material; and coherence between ambition and technique. Alan Belkin's freely available *Musical Composition: Craft and Art* frames the teachable core as managing the listener's psychological experience — beginnings, momentum, climax, closure — with "art" layered on craft, never substituting for it. These criteria matter to this project because they are the closest thing to an actionable rubric for engine output review: each maps to a checkable property (see [composition-craft.md](composition-craft.md) and [computational-music-metrics.md](computational-music-metrics.md)).

## Good for someone: functional adequacy vs. artistic value

A deflationary but useful position: music is good *for* a listener, purpose, and context — study focus, sleep, a game level, a film scene — and functional adequacy is a different, lower bar than artistic value. Film and game scoring lives on this distinction (see [film-and-game-music.md](film-and-game-music.md)); so does the entire ambient tradition, which Eno explicitly designed to be "as ignorable as it is interesting" (see [ambient-and-generative-genre.md](ambient-and-generative-genre.md) and [attention-and-background-listening.md](attention-and-background-listening.md)). Streaming-era listening data suggests most consumption is functional-background anyway. For the project this suggests a two-tier target: first make output that reliably serves a use (pleasant, non-annoying, appropriate energy — largely achievable through craft rules and perceptual hygiene), then pursue foreground-worthy artistic interest, which is where expectation-shaping and formal intention come in.

## The AI-music discourse, 2024–2026

The Suno/Udio era made "is generated music good?" a public argument. Key data points:

- Volume vs. demand: Deezer reported in April 2026 that ~75,000 fully AI-generated tracks arrive daily — about 44% of all uploads (up from ~10% in January 2025) — yet AI tracks draw only 1–3% of streams, and up to 85% of those streams were fraudulent (bot-driven royalty farming) in 2025. The market is flooded with supply nobody asked for; this is the concrete referent of the "slop" epithet.
- The Velvet Sundown (June–July 2025): a Suno-made "band" with fake members reached ~1M+ monthly Spotify listeners via playlist placement before being exposed, then rebranded as "an ongoing artistic provocation." The episode fixed the discourse's terms: deception, disclosure, and platform responsibility, more than sound quality — listeners had not flagged the music itself.
- The "soulless" critique, stated best by Nick Cave (Red Hand Files #218, January 2023, on ChatGPT lyrics in his style): a great song emerges from human suffering and self-risk; "algorithms don't feel. Data doesn't suffer." He calls the imitation "a grotesque mockery of what it is to be human." Generalized by critics: what generated music lacks is risk, biography, stakes, and specificity — nothing was at stake for anyone in its making, and it is statistically generic rather than particular. Berklee commentary on the Velvet Sundown adds the pragmatic observations that ghost-written and functional music long predate AI, that "sonic quality is the clearest clue" for spotting current AI output, and that the economic threat to working artists is a central real grievance (training data, royalty dilution).

Note what the critique targets: provenance and intention, not measurable acoustic properties. That is exactly where a small, transparent, rule-based project differs from prompt-to-track services — this project can exhibit its intentions (motives, plans, constraints) even though it cannot suffer.

## Does knowing it's machine-made change the judgment? Yes, measurably

- Bellaiche et al. 2023 (*Cognitive Research: Principles & Implications*): identical images randomly labeled "human-created" or "AI-created." Human-labeled art scored higher on everything, modestly for liking/beauty (d ≈ 0.17–0.22), strongly for profundity and worth (d ≈ 0.47–0.61). Bias concentrates in meaning-laden judgments; perceived effort acts as a quality heuristic applied only to humans.
- Music specifically: results are mixed but tilt the same way. Studies find lower ratings and less awe/creativity attributed when listeners believe music is AI-composed, with experts and tradition-focused communities (e.g., Irish folk practitioners) more critical; some studies with pop stimuli find no significant labeling effect. Stammer, Strauss & Knees (2025) found listeners' prior attitudes toward AI were the best predictor of liking AI-attributed music — better than personality or music preferences.
- Without labels, differences shrink: Fišer et al. 2025 (unlabeled, biometric + self-report, film-music context) found AI-generated cues rated similarly on valence, *more* arousing, but less familiar than human scoring, with higher cognitive-load markers.

Implication: expect an attribution penalty of roughly a quarter to half a standard deviation on "deep" judgments whenever provenance is disclosed, over and above any real quality gap. Evaluation of this project's output must therefore separate the two: blind tests measure the music; labeled tests measure the music plus the discourse. Both are real — Tom and future listeners will know the provenance — but only the first is actionable by the engine. See [evaluation-challenges.md](evaluation-challenges.md) and [listening-tests-and-feedback.md](listening-tests-and-feedback.md).

## Implications for generative engines

- Optimize the Meyer target: goodness as managed expectation within an established style is the definition that yields per-note, computable feedback (see [musical-expectation.md](musical-expectation.md), [computational-music-metrics.md](computational-music-metrics.md)).
- Adopt the teachers' rubric as the review checklist: voice leading, harmonic logic, formal clarity, pacing/climax, orchestration balance, memorability — each becomes a lint rule or a listening-test question.
- Target functional adequacy first (background-listenable, non-annoying, purpose-fit), artistic interest second; declare which tier a given engine version aims at, and evaluate against that tier.
- Answer the slop critique in the only ways an engine can: specificity and formal intention. Every piece should have a nameable identity (motive, mode, form, climax plan) and auditable reasons for its choices; avoid the statistically-generic center of a style. Risk and biography cannot be simulated — do not pretend to them (no fake backstories; the Velvet Sundown lesson is that discovered fakery poisons reception).
- Evaluate blind by default; when comparing engine versions or comparing against human baselines, hide provenance. Additionally, measure the attribution penalty directly at least once (same clips, labeled vs. unlabeled) to calibrate all labeled feedback, including Tom's.
- Expect expert listeners to be harsher on known-AI output; weight their blind judgments accordingly.

## Open questions

- Is there a stable blind-test quality gap between current rule-based generation and human functional music (library/production tracks), or is the gap mostly attributional?
- Which rubric items predict blind preference best? (Worth instrumenting in [listening-tests-and-feedback.md](listening-tests-and-feedback.md).)
- Does disclosure of *how* a piece was made (motives, plans, constraints — legible intention) reduce the AI attribution penalty relative to bare "AI-generated" labeling? Untested, directly relevant to this project's public site.

## Related pages

- [musical-expectation.md](musical-expectation.md) — the mechanism behind Meyer's definition
- [emotion-and-meaning.md](emotion-and-meaning.md), [pleasure-and-reward.md](pleasure-and-reward.md) — what listeners actually feel
- [complexity-and-preference.md](complexity-and-preference.md) — inverted-U preference structure
- [composition-craft.md](composition-craft.md) — the craft standards teachers grade
- [attention-and-background-listening.md](attention-and-background-listening.md), [film-and-game-music.md](film-and-game-music.md) — functional adequacy in practice
- [evaluation-challenges.md](evaluation-challenges.md), [listening-tests-and-feedback.md](listening-tests-and-feedback.md), [computational-music-metrics.md](computational-music-metrics.md) — turning these standards into measurements
- [machine-learning-music.md](machine-learning-music.md) — the Suno/Udio technology context

## Sources

- "The Philosophy of Music," *Stanford Encyclopedia of Philosophy* (Hanslick, expression/arousal, Kivy, Scruton) — https://plato.stanford.edu/entries/music/
- Nicole Grimes, review of *Eduard Hanslick's "On the Musically Beautiful": A New Translation* (Rothfarb & Landerer trans.; the translation debate over *tönend bewegte Formen*), *Musicologica Austriaca* (2019) — https://www.musau.org/parts/neue-article-page/view/61
- Alan Belkin, *Musical Composition: Craft and Art* and free pedagogical guides — https://alanbelkinmusic.com/
- Leonard B. Meyer, *Emotion and Meaning in Music*, University of Chicago Press, 1956 — https://press.uchicago.edu/ucp/books/book/chicago/E/bo28551887.html
- Roger Scruton, *The Aesthetics of Music*, Oxford University Press, 1997 (as discussed in the SEP entry above).
- Bellaiche et al., "Humans versus AI: whether and why we prefer human-created compared to AI-created artwork," *Cogn. Research* 8:42, 2023 — https://pmc.ncbi.nlm.nih.gov/articles/PMC10319694/
- Stammer, Strauss & Knees, "Perception of AI-Generated Music — The Role of Composer Identity, Personality Traits, Music Preferences, and Perceived Humanness," 2025 — https://arxiv.org/abs/2512.02785
- Fišer, Martín-Pascual & Andreu-Sánchez, "Emotional impact of AI-generated vs. human-composed music in audiovisual media," 2025 — https://pmc.ncbi.nlm.nih.gov/articles/PMC12194076/
- Nick Cave, The Red Hand Files #218, January 2023 — https://www.theredhandfiles.com/chat-gpt-what-do-you-think/
- Deezer Newsroom, "AI-generated tracks now represent 44% of all new uploaded music," April 2026 — https://newsroom-deezer.com/2026/04/ai-generated-tracks-represent-44-of-new-uploaded-music/ (coverage: https://techcrunch.com/2026/04/20/deezer-says-44-of-songs-uploaded-to-its-platform-daily-are-ai-generated/)
- Euronews, "The Velvet Sundown explained," July 2025 — https://www.euronews.com/culture/2025/07/08/the-velvet-sundown-explained-whats-behind-the-spotify-verified-ai-band-controversy (Suno confirmation: https://www.rollingstone.com/music/music-features/velvet-sundown-ai-band-suno-1235377652/)
- Berklee Now, "The Velvet Sundown: The AI Band Controversy Explained," 2025 — https://www.berklee.edu/berklee-now/news/velvet-sundown-ai-band-controversy
