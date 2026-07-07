---
title: Auditory perception basics
tags: [psychology]
status: reviewed
created: 2026-07-06
updated: 2026-07-07
summary: The hard perceptual constraints every engine must respect — auditory scene analysis and streaming, critical bands and masking, pitch and the missing fundamental, equal-loudness contours, temporal resolution and memory, the ~3-voice polyphony limit, and pitch/tuning tolerance.
---

# Auditory perception basics

The auditory system is not a neutral wire from waveform to mind; it groups, fuses, masks, and forgets according to fixed rules, and a generative engine that ignores those rules produces output that is technically correct on paper but muddy, fatiguing, or incoherent in the ear. This page collects the perceptual constraints that bound what music *can* do regardless of style: how many independent lines a listener can actually follow, why low intervals must be spaced wide, why quiet playback loses bass, how fast events can move before they smear, and how much mistuning is noticeable. These are engineering tolerances. Treat them as the physics the composition sits on top of.

## Auditory scene analysis: hearing streams, not sounds

Albert Bregman's auditory scene analysis (ASA) describes how the brain parses one mixed pressure wave at the eardrums into distinct perceptual "streams" (sources/voices). Two grouping problems run in parallel:

- Sequential grouping (across time): successive events fuse into one stream when they are close in pitch, similar in timbre, close in time, and from the same apparent location. When two alternating tones are far apart in frequency or fast enough, they split into two streams — you stop hearing one zig-zag line and start hearing two separate lines (van Noorden's classic finding). Baroque "compound melody" (implied polyphony) exploits exactly this: one instrument's fast wide leaps split into two perceived voices.
- Simultaneous grouping (across frequency at one instant): partials fuse into one sound when they are harmonically related (share an F0), start together (onset synchrony), and modulate together (common fate — shared vibrato, shared amplitude envelope). A partial that starts late or drifts independently pops out as a separate sound.

The load-bearing cues for whether two lines are heard as two voices: frequency proximity, timbre similarity, onset synchrony, common fate (correlated modulation), harmonicity, and spatial location. Bregman's "old-plus-new" heuristic: the system prefers to interpret a spectrum as a continuation of what was already present plus a new event, which is why a note emerging from a chord can be captured by an ongoing stream. These principles are the perceptual derivation of counterpoint's rules — see [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md), which builds on Huron's demonstration that most traditional voice-leading rules fall out of ASA.

## Critical bands, roughness, and masking

The cochlea performs a frequency analysis with finite resolution: it is divided into overlapping critical bands (~1/3 octave wide over much of the range; roughly constant ~100 Hz below ~500 Hz, then proportional above). Two consequences dominate mixing and voicing decisions:

- Roughness / sensory dissonance: when two partials fall within the same critical band but are not identical, they beat, and the beating is heard as roughness. Plomp & Levelt (1965) found maximum roughness at about 25% of the critical bandwidth apart (confirmed in their original paper). Because critical bands are wide in absolute Hz at low frequencies, a musical interval that is smooth in the treble is rough in the bass: a major third at C4 is fine, the same third at C2 is muddy because its partials now sit inside one critical band. This is the perceptual reason arrangers space low intervals wide (fifths, octaves, tenths in the bass) and cluster only in the mid-high register. See [harmony.md](harmony.md), [tuning-and-scales.md](tuning-and-scales.md).
- Masking: a louder sound raises the detection threshold for others nearby. Simultaneous masking spreads asymmetrically — low frequencies mask higher ones far more than the reverse (the "upward spread of masking") — so bass-heavy content buries mid/treble detail, not vice versa. Temporal masking extends in time: forward masking lasts ~100–200 ms after a masker (a loud onset hides quiet events just after it), and a short backward-masking window precedes it. Huron folds "minimum masking" into voice-leading as a principle favoring even spacing of parts.

## Pitch perception: virtual pitch, missing fundamental, octave equivalence

Pitch is inferred from spectral pattern, not read off a single frequency. Present a set of harmonics (300, 400, 500 Hz) with no energy at 100 Hz and listeners still hear pitch at 100 Hz — the missing fundamental / virtual pitch, robust even when noise masks the region where the fundamental would be, so it is a central (neural) computation, not cochlear distortion. This is why telephones (no energy below ~300 Hz) and small speakers still convey bass pitch, and why a thin-sounding synth bass with strong harmonics reads as the right note. Octave equivalence (notes an octave apart share pitch class / chroma) is common across cultures and underlies most scale systems, but it is not a settled universal: Jacoby et al. (2019) found US singers reproduced melodies transposed by whole octaves when pitched outside their vocal range, while Tsimane' singers preserved the interval pattern with no bias toward octave-equivalent transposition — see [musical-universals.md](musical-universals.md) for the full cross-cultural picture and its "contested" framing. Practical upshot: an engine can imply a bass register through harmonics when playback hardware lacks true low end; don't assume octave-equivalent chroma perception is a human universal outside the Western-enculturated listeners this project mostly designs for.

## Loudness: equal-loudness contours

Perceived loudness depends on frequency, not just sound pressure. The equal-loudness contours (ISO 226, revised 2003/2023; historically the Fletcher–Munson curves of 1933) map sound pressure levels heard as equally loud. Key facts for an engine:

- The ear is most sensitive around 2–5 kHz (ear-canal resonance); it takes much more SPL to make a 60 Hz or 12 kHz tone sound as loud as a 3 kHz tone.
- The contours flatten at high levels and steepen at low levels: at quiet playback, bass and treble fall off relative to the mids, so a mix balanced loud sounds thin and mid-heavy when played quietly. Browser/laptop-speaker playback at low volume will lose the bass foundation and air. Design for it.
- Units in one breath: dB SPL is physical intensity; the phon is loudness level (a tone's loudness in phons = the dB SPL of an equally loud 1 kHz tone, so the curves are iso-phon lines); the sone is a linear perceptual scale where 1 sone ≡ 40 phon and +10 phon ≈ a doubling to 2 sones. Equal dB steps are not equal loudness steps.

## Temporal resolution, integration, and memory — how fast, how long is "now"

Three different time constants bound musical motion:

- Gap detection / resolution: listeners detect a silent gap in noise of roughly 2–3 ms (about 2.15 ms at d′=1 in one broadband study), and two clicks resolve as two around a few milliseconds. So event boundaries finer than a couple of milliseconds smear — relevant to click/attack design and grain sizes.
- Loudness integration: the ear integrates energy over roughly a 100–200 ms window (a leaky integrator; classic psychoacoustics puts the time constant around 100–200 ms, with some evidence of longer integration at low frequencies and shorter at high — the frequency-dependent figures are less firmly pinned down than the general 100–200 ms range). Tones shorter than this sound quieter than sustained tones of the same physical level, and very short notes lose perceived loudness and pitch definition. Extremely fast passagework trades loudness and clarity for speed.
- Echoic / auditory sensory memory: the raw sensory trace lasts a few hundred milliseconds; a longer auditory store holds material for roughly 2–4 seconds (mismatch-negativity studies extend detectable traces up to ~10 s for simple tones, but ~2–4 s is the usable "present" for structure). This is the window within which the ear binds notes into a phrase and compares "now" to "just now." It bounds how long a gesture can be before its start is forgotten, and it is why phrase units of a few seconds feel natural. See [phrase-structure.md](phrase-structure.md), [rhythm-and-meter.md](rhythm-and-meter.md), [groove-and-embodiment.md](groove-and-embodiment.md).

## Attention limits on polyphony: about three voices

David Huron's voice-denumerability study (*Music Perception*, 1989) had listeners count concurrent voices in organ textures of homogeneous timbre. Accuracy is near-perfect for one or two voices and drops sharply when a three-voice texture goes to four — the system behaves like "one, two, three, or many," and listeners systematically *underestimate* voice counts above two. A 2025 follow-up study by Bogaard, Mesik & Oxenham, extending Huron's paradigm with a novel inharmonicity manipulation, confirms the pattern (≈97% accuracy at one voice, ≈25% at five) and adds that outer (edge) voices are tracked more accurately than inner ones, and that harmonicity aids but is not essential to hearing voices apart. The design consequence is blunt: you can write four or more real parts, but listeners will reliably follow only about three — usually the outer two plus one salient inner line. Extra independent parts become harmonic wash, not counterpoint. Give parts distinct registers and timbres if you want them heard as separate (ASA cues above). See [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md), [timbre-and-orchestration.md](timbre-and-orchestration.md).

## Pitch JNDs and tuning tolerance

How out-of-tune is noticeable depends heavily on context, and melodic tolerance is far looser than harmonic:

- Bare pitch discrimination (is B higher than A?) is very fine: trained listeners resolve well under 10 cents for pure/resolved tones; one interval-discrimination study measured pitch-discrimination thresholds ~15 cents for musicians vs. ~44 cents for non-musicians on a mid-register complex tone. (100 cents = one equal-tempered semitone.)
- Melodic intonation (notes in sequence) tolerates much more: the ear readily accepts imperfect melodic intervals, with noticeable-mistuning thresholds commonly cited in the ~20–25 cent range and interval-discrimination thresholds around 100 cents for non-musicians — a whole different regime from simultaneous intervals.
- Harmonic intonation (notes sounding together) is unforgiving: mistuning shows up as beating/roughness (the critical-band mechanism above), so simultaneities are audibly out of tune at only a few cents, especially on sustained, harmonic-rich timbres. This is why a synth pad exposes tuning errors a fast melodic line would hide.

Rule of thumb for the engine: melodies survive ±15–25 cents of slop (and small deliberate deviations read as expressive — see [expressive-performance.md](expressive-performance.md)); sustained harmony needs to be within a few cents or it sounds broken, and the tolerance tightens with duration, harmonic richness, and low register.

## Auditory memory for melody: contour first, intervals later

Dowling (1978) showed melodic memory has two components: listeners encode a melody's contour (the up/down pattern) immediately and robustly, but exact interval sizes only with familiarity or explicit tonal framing. For a novel tune, contour is what a listener retains and recognizes; precise intervals and absolute pitches fade fast. Implication: a melody's identity for recognition and recall lives in its contour and rhythm more than its exact intervals, so motivic repetition should preserve contour+rhythm even when intervals are altered (which is also how developing variation stays recognizable — see [melody.md](melody.md), [repetition-and-familiarity.md](repetition-and-familiarity.md)).

## Implications for generative engines

- Cap real independent voices at ~3–4 and make the ones meant to be heard separate obey ASA cues: distinct register, distinct timbre, non-synchronized onsets. Extra parts are texture/pad, not lines — voice them as fusion, not counterpoint.
- Space low intervals wide: below ~C3, prefer fifths, octaves, sixths/tenths; reserve thirds and clusters for the mid-to-high register. Compute roughness against critical bandwidth rather than assuming an interval that works up high works down low. See [effects-and-mixing.md](effects-and-mixing.md).
- Respect masking: a loud low element masks upward, so don't hide melodic/detail content beneath bass energy; carve register lanes so each important line has a clear band.
- Mix and voice for quiet, small-speaker playback (the likely browser context): don't rely on sub-bass or extreme highs for essential content; use the missing-fundamental effect (strong harmonics) to imply bass that laptop speakers can't reproduce.
- Keep essential events coarser than ~3 ms apart and note-durations mostly above ~100 ms so loudness and pitch register fully; treat sub-100 ms events as ornaments/transients, not structural pitches.
- Size phrases and the "surprise horizon" to echoic memory: gestures whose payoff depends on remembering their start should resolve within ~2–4 s, or be reinforced by repetition. Ties to [musical-expectation.md](musical-expectation.md).
- Tune tolerances by context: allow small melodic detuning (expressive, humanizing) but keep sustained harmony within a few cents; tighten as duration/register/harmonic-richness increase. See [tuning-and-scales.md](tuning-and-scales.md).
- Preserve contour+rhythm across motivic transformations so listeners recognize returns even when intervals change.

## Open questions

- What is the right per-voice register/timbre separation budget for the specific thin synth timbres this engine will use, versus the organ/vocal stimuli in the literature?
- How well do symbolic roughness/masking models predict perceived muddiness once real synthesis, reverb, and mixing are applied? (Candidate for in-browser [computational-music-metrics.md](computational-music-metrics.md) using [javascript-music-libraries.md](javascript-music-libraries.md)-style feature extraction.)
- Can the engine detect and avoid its own masking/roughness problems automatically by analyzing its rendered output? See [audio-worklets-and-performance.md](audio-worklets-and-performance.md).

## Related pages

- [counterpoint-and-voice-leading.md](counterpoint-and-voice-leading.md) — voice-leading rules derived from these principles
- [harmony.md](harmony.md), [tuning-and-scales.md](tuning-and-scales.md) — roughness, spacing, intonation
- [timbre-and-orchestration.md](timbre-and-orchestration.md), [effects-and-mixing.md](effects-and-mixing.md) — masking, blend, register lanes
- [melody.md](melody.md), [phrase-structure.md](phrase-structure.md) — contour memory and phrase length
- [rhythm-and-meter.md](rhythm-and-meter.md), [groove-and-embodiment.md](groove-and-embodiment.md) — temporal resolution and integration
- [musical-expectation.md](musical-expectation.md), [repetition-and-familiarity.md](repetition-and-familiarity.md) — memory windows and prediction
- [musical-universals.md](musical-universals.md) — octave equivalence and cross-cultural constants

## Sources

- Albert S. Bregman, *Auditory Scene Analysis*, MIT Press, 1990 (overview) — https://en.wikipedia.org/wiki/Auditory_scene_analysis
- David Huron, "Tone and Voice: A Derivation of the Rules of Voice-Leading from Perceptual Principles," *Music Perception* 19(1), 2001 — https://online.ucpress.edu/mp/article/19/1/1/62106/
- David Huron, "Voice Denumerability in Polyphonic Music of Homogeneous Timbres," *Music Perception* 6(4), 1989 — https://www.semanticscholar.org/paper/5b0c2341019080ee53b374420503444e16a7b24a
- Bogaard, Mesik & Oxenham, "The role of harmonicity on listeners' ability to hear out voices in polyphonic music," *Scientific Reports*, 2025 — https://pmc.ncbi.nlm.nih.gov/articles/PMC12394604/
- R. Plomp & W. J. M. Levelt, "Tonal Consonance and Critical Bandwidth," *JASA* 38, 1965 (roughness at ~25% CB) — https://www.mpi.nl/world/materials/publications/levelt/Plomp_Levelt_Tonal_1965.pdf
- "Equal-loudness contour" and ISO 226 (phon/sone, low-level bass roll-off, Fletcher–Munson; ISO 226:2023 is the current revision) — https://en.wikipedia.org/wiki/Equal-loudness_contour
- "Missing fundamental" / virtual pitch (Schouten, Terhardt) — https://en.wikipedia.org/wiki/Missing_fundamental
- Auditory gap-detection thresholds (~2 ms), Gold, Nodal, Peters, King & Bajo, "Auditory Gap-in-Noise Detection Behavior in Ferrets and Humans," Behavioral Neuroscience, 2015 — https://pmc.ncbi.nlm.nih.gov/articles/PMC4516322/
- Temporal loudness integration (~100–200 ms general range; cochlear-implant-specific data) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10631326/
- Nishihara, Inui, Motomura, Otsuru, Ueno & Kakigi, "Echoic Memory: Investigation of Its Temporal Resolution by Auditory Offset Cortical Responses," PLOS ONE, 2014 (refs Cowan, Lu on sensory-memory decay) — https://pmc.ncbi.nlm.nih.gov/articles/PMC4149571/ ; vowel sensory memory >2.6 s / pure-tone traces up to ~10 s — https://pmc.ncbi.nlm.nih.gov/articles/PMC5874311/
- Pitch- and interval-discrimination thresholds in cents (Zarate, Ritson & Poeppel, "The Effect of Instrumental Timbre on Interval Discrimination," 2013: musicians ~15¢ vs non-musicians ~44¢) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3774646/
- W. J. Dowling, "Scale and contour: Two components of a theory of memory for melodies," *Psychological Review* 85(4), 1978, pp. 341–354 — https://doi.org/10.1037/0033-295X.85.4.341
