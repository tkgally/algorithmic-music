---
title: Synthesis recipes
tags: [implementation]
status: reviewed
created: 2026-07-06
updated: 2026-07-06
summary: Practical node-graph recipes with starting parameters for basses, keys, plucks, mallets, organs, pads, winds, and drums — convincing instruments from oscillators, filters, and noise alone.
---

# Synthesis recipes

This project synthesizes every instrument from stock Web Audio nodes — no samples, no libraries — so the ensemble's credibility rests on a repertoire of proven synthesis topologies with sane starting parameters. Each recipe below gives the graph shape, numbers to start from, and what to vary for expression; they assume the graph, envelope, and lifetime rules of [web-audio-fundamentals](web-audio-fundamentals.md). Voices are written as `source → (filter) → envelope GainNode → instrument bus`, with `t` the scheduled start time; which instruments to use *when* is [timbre-and-orchestration](timbre-and-orchestration.md)'s territory.

## Subtractive: the detuned-saw workhorse

Topology: 2–7 sawtooth oscillators detuned around the target pitch → one summing gain → lowpass `BiquadFilterNode` (cascade two for a 24 dB/oct slope) → envelope gain. The musical core is the **filter envelope**: brightness that moves with the amplitude envelope reads as effort and warmth.

- Detune: ±4–10 cents (subtle ensemble) to ±15–25 (lush analog); randomize each voice's exact offset per note.
- Filter: start cutoff ≈ 2–6 × f0, `Q` 0.5–2 (higher only for deliberate squelch). Envelope the *frequency*: anchor at, say, 8 × f0, `setTargetAtTime` down to 1.5–3 × f0 with τ 0.1–0.4 s for plucky keys/bass; invert (rise) for swells. Use `detune` (cents) on the filter for musically even sweeps, or exponential ramps on `frequency` — never linear ones over wide ranges.
- Amp: attack 2–8 ms (keys/bass) to 0.5–3 s (pads); release ≥ 60 ms.
- Bass variant: 1–2 saws + optional sub sine one octave down, cutoff 1.5–2.5 × f0, mono (no detune width below ~150 Hz — see [effects-and-mixing](effects-and-mixing.md)).
- Brass-ish variant: slowish filter attack (30–80 ms) so each note "blooms", cutoff peaking near 4–6 × f0 (the Synth Secrets brass articles are the reference).

## Two-operator FM: keys, bells, basses

Modulator oscillator → gain (peak deviation in Hz) → carrier's `frequency` AudioParam. With carrier:modulator ratio `1:R`, integer `R` gives harmonic spectra; the **index** `I = deviation / modFreq` sets brightness (Chowning). The signature FM move: *decay the index over the note* so brightness fades faster than amplitude — pianos, EPs, and plucks in one gesture.

```js
function fm(ctx, bus, f, t, { ratio = 1, index = 2.5, dur = 1, level = 0.4 }) {
  const car = new OscillatorNode(ctx, { frequency: f });
  const mod = new OscillatorNode(ctx, { frequency: f * ratio });
  const dev = new GainNode(ctx, { gain: 0 });          // deviation in Hz
  const amp = new GainNode(ctx, { gain: 0 });
  mod.connect(dev); dev.connect(car.frequency); car.connect(amp); amp.connect(bus);
  dev.gain.setValueAtTime(index * f * ratio, t);
  dev.gain.setTargetAtTime(index * f * ratio * 0.12, t, dur * 0.25);  // brightness decay
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(level, t + 0.006);
  amp.gain.setTargetAtTime(0, t + 0.006, dur * 0.35);
  car.start(t); mod.start(t); car.stop(t + dur * 2.5); mod.stop(t + dur * 2.5);
  car.onended = () => [car, mod, dev, amp].forEach(n => n.disconnect());
}
```

Starting points (tune by ear, then by [computational-music-metrics](computational-music-metrics.md)):

| Sound | ratio | index | notes |
|---|---|---|---|
| Rhodes-like EP | 1 | 1.5–3, fast decay | add a second quiet "tine" pair at ratio ~14 (or a high sine partial), index < 1, very fast decay; velocity → index |
| FM bass | 1 | 2–5, τ ≈ 0.08–0.2 s | slight index rise on attack adds growl |
| Bell / EP glass | 3.5 or 1.4 (inharmonic) | 4–10, slow decay 2–8 s | detune carrier pair ±3 cents for shimmer |
| Hollow organ/clarinet | 2 | 0.5–1.5, static | odd-harmonic flavor |

Velocity should scale index more than level — louder = brighter is the physical cue.

## Karplus-Strong plucked strings

A noise burst circulating in `DelayNode → lowpass → gain(< 1) → back into the delay`, tapped to the output: the 1983 Karplus-Strong string, whose loop filter is essentially a two-point average (Jaffe/Smith formalized the extensions).

```js
// Feasible as a node graph only below sampleRate/128 ≈ 345 Hz at 44.1 kHz:
// a DelayNode inside a cycle is clamped to ≥ one render quantum (128 frames).
const delay = new DelayNode(ctx, { delayTime: 1 / f0, maxDelayTime: 0.1 });
const damp  = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 3000 + f0 * 4 });
const fb    = new GainNode(ctx, { gain: 0.95 });        // sustain: 0.9 short … 0.995 long
burst.connect(delay); delay.connect(damp); damp.connect(fb); fb.connect(delay);
delay.connect(out);                                      // burst: 5–15 ms of noise, lowpassed for softer picks
```

The render-quantum clamp means node-graph KS covers bass/low-mid strings only; melodic plucks above ~F4 need an [AudioWorklet](audio-worklets-and-performance.md) implementation (a ring buffer with fractional-delay interpolation — also fixes the tuning error from filter delay, which flattens pitch slightly; at low f0 it is ignorable, or pre-shorten `delayTime` by ~0.5–1 sample). Color knobs: burst spectrum = pick hardness; loop lowpass cutoff = string brightness/material; feedback = decay; brief `detune` drop on the delay ≈ pluck pitch bend. For harp/koto-like timbres keep bursts soft and feedback high; add a body: a short synthesized IR convolver shared by all strings ([effects-and-mixing](effects-and-mixing.md)).

## Additive sines: organs and drawbars

A bank of sine oscillators at harmonic ratios into one gain each. The Hammond drawbar map (ratios relative to the played note): 0.5, 1.5, 1, 2, 3, 4, 5, 6, 8 — classic registrations: gospel full (all high), jazz 8-8-8-0-0-0-0-0-0 (first three), flute-y 0-0-8-4-0-0-0-0-0. Drawbar steps ≈ 3 dB each. Add: key click (2–4 ms noise blip), slow chorus/vibrato (see [effects-and-mixing](effects-and-mixing.md)), and a "percussion" partial (2nd or 3rd harmonic, fast 200 ms decay). For *static* spectra, collapse the whole bank into one oscillator with a `PeriodicWave` (below) — one node instead of nine; keep separate oscillators only when partials need independent envelopes (organ percussion, additive swells).

## Modal synthesis: mallets, bells, blocks

Excite parallel resonators with a short noise burst or click; each resonator is a high-`Q` bandpass `BiquadFilterNode` (or, for exact decay control, an exponentially-decaying sine oscillator per mode). Mode tables:

- Ideal uniform bar (free ends) — wood block, chime bar, untuned metallophone: f × **1, 2.756, 5.404, 8.933** (Rossing; confirmed across the percussion-acoustics literature).
- Tuned marimba/vibraphone bars (arched cut): ≈ 1, 4, 10; xylophone ≈ 1, 3, ~6 — the tuned low partials are why they read as pitched.
- Church bell (five principal partials): hum 0.5, prime 1, tierce 1.2 (the minor third!), quint 1.5, nominal 2 — name the pitch by the *prime/nominal*, keep the 1.2 or it stops being a bell.
- Q/decay: glockenspiel-bright metals Q ≈ 500–2000 (seconds of ring), woods Q ≈ 30–120 (tens of ms). Decay of mode k should shorten with frequency (scale τ by ~1/fk). Strike position = relative mode gains; softer mallet = excite burst lowpassed harder.

This family is cheap, endlessly variable by seed (randomize mode gains/detunes slightly per instrument, not per note), and one of the easiest routes to *novel but physical* timbres.

## Drums from noise and sine

- **Kick:** sine with an exponential pitch drop — `frequency.setValueAtTime(150, t); frequency.exponentialRampToValueAtTime(45, t + 0.05)` — amp attack 1–3 ms, `setTargetAtTime` decay τ 0.06–0.15 s; add a click (1–2 ms noise or 1 kHz blip, −12 dB) for beater definition. Deeper 808-style: start ~80 Hz, drop to 40–50 Hz, τ 0.3–0.6 s, touch of waveshaper drive.
- **Snare:** two detuned triangles/sines (~185 and ~330 Hz, fast τ ≈ 0.05 s) + white noise through a bandpass 1–3 kHz (`Q` ≈ 0.7), noise τ 0.08–0.2 s; velocity scales the noise more than the tone. Rim/clave: single very-high-`Q` (30–80) bandpass ping at ~1.7–2.5 kHz excited by a click.
- **Hi-hats/cymbals:** the TR-808 recipe is six square oscillators clustered roughly 200–800 Hz, summed → bandpass ~10 kHz → highpass 7–8 kHz; closed τ ≈ 0.03–0.06 s, open τ ≈ 0.3–0.6 s. Highpassed white noise (≥ 8 kHz) is an acceptable cheap substitute in a mix; the square-bank version adds the metallic beating that reads as "cymbal alloy". Ride: add a sine "ping" ~5 kHz over the wash.
- **Toms:** kick topology, higher start pitches (200→90 Hz etc.), longer tone decay, small noise component.
- Shared noise: generate one seeded noise `AudioBuffer` (1–2 s) at startup and play offset slices per hit — deterministic and allocation-free ([previous-experiments-lessons](previous-experiments-lessons.md)).

## Pads

Slow-attack detuned layers with *internal motion*: 4–8 saws or PeriodicWave oscillators, detune ±8–20 cents, attack 0.8–3 s, release 2–6 s → gentle lowpass whose cutoff drifts (audio-rate LFO 0.05–0.2 Hz, depth ±0.3 octave) → chorus → reverb send. Add width by panning voice pairs L/R and decorrelating (different LFO phases per side). Keep pads dark (cutoff ≤ ~2 kHz) so they sit under leads; a quiet octave-up sine layer adds air without harshness. The failure mode is *static* pads — one LFO on cutoff and one on level at unrelated slow periods is the minimum motion budget (a proven idiom from the previous experiments' drones).

## Bowed strings and winds (approximations)

Honest approximations, good in ensembles rather than exposed solos:

- **Bowed strings:** sawtooth (the stick-slip waveform) → 2–3 fixed peaking filters as a crude body (e.g., +4–6 dB around 300, 700, 1200 Hz, Q ≈ 2–5, fixed per "instrument", not per note) → lowpass ~3–5 kHz. Attack 100–300 ms with slight overshoot ("bow bite": brief +3 dB then settle); delayed vibrato (start after ~0.3 s, 5–6 Hz, ±10–20 cents, via sine LFO into `detune`); constant quiet bow noise: bandpassed noise around 2–4 kHz at −25 to −30 dB relative, gated by the same envelope.
- **Flute:** strong sine fundamental + 2nd/3rd harmonics at −12/−18 dB (one PeriodicWave) + breath noise (bandpass near 2 × f0, Q ≈ 1–2, −18 dB) sharing the amp envelope; attack 30–80 ms with a brief octave-up "overblow" transient (a fast pitch envelope from 2f down to f over ~20 ms, subtle); vibrato 4–6 Hz appearing after onset. SOS's flute installments confirm this sine+noise+transient decomposition as the perceptual minimum.
- Winds/strings both live or die by *phrasing*: connect notes with small `setTargetAtTime` pitch glides (portamento 20–60 ms) and shared continuous envelopes rather than per-note retriggers — implementation hooks for [expressive-performance](expressive-performance.md).

## Custom spectra with PeriodicWave

`new PeriodicWave(ctx, { real, imag, disableNormalization })` — `real[k]`/`imag[k]` are cosine/sine amplitudes of harmonic k (index 0 is DC; leave 0). One oscillator then plays the whole spectrum, band-limited and alias-free. Uses: drawbar organs, vowel-ish pads (put energy at harmonics nearest formants), soft "analog" variants (saw with 1/k amplitudes, rolled off harder), inharmonic shimmer via *pairs* of slightly detuned oscillators sharing one wave. Normalization (default on) equalizes loudness across spectra — usually what you want; disable only when crafting exact partial levels. Spectra are immutable — morphing requires crossfading two oscillators.

## Waveshaping color

`WaveShaperNode` with a soft-clip curve adds harmonics cheaply. The musicdsp standard (Tarrabia/de Jong): `f(x) = (1 + k)·x / (1 + k·|x|)` with `k = 2a/(1 − a)`, `a ∈ [0, 1)` — fill a 1024-sample `Float32Array` over x ∈ [−1, 1]. Gentle (`a` ≈ 0.1–0.3) on a full bus = glue warmth; hard (`a` ≥ 0.7) on single voices = distortion. `Math.tanh(g·x)` curves behave similarly. A sine-fold curve `f(x) = sin(1.5π·x)` gives wavefolder timbres (rich, West-Coast) — drive it with a pre-gain envelope so fold depth becomes an expressive parameter. Always set `oversample: "2x"` or `"4x"`: shaping creates harmonics above Nyquist that otherwise alias, especially on bright inputs. Drive with a pre-gain, trim with a post-gain; nonlinear stages are level-dependent, so gain-stage deliberately ([effects-and-mixing](effects-and-mixing.md)).

## Unison, detune, and layering

- Detune ranges (per voice, ± around center): 2–6 cents barely-thick; 8–15 classic supersaw lushness; 15–25 wide/dreamy; > 30 reads as out of tune or as chorus. Randomize per note within the band.
- Odd voice counts keep a center anchor (1 on-pitch + symmetric pairs). Pan pairs outward; keep the center voice and anything < ~150 Hz mono.
- Layer roles, not clones: sub (sine, mono) + body (main recipe) + air (quiet octave-up or noise layer). Give layers different envelopes so the composite evolves.
- Beating between static detuned pairs is a *tempo*: 3 cents at A4 beats ~0.8 Hz — audible as slow shimmer; pick detunes whose beat rates suit the music's pace (relates to [tuning-and-scales](tuning-and-scales.md) — just-intoned drones beat slower and sound deeper than equal-tempered stacks).

## Anti-click discipline

Every recipe above obeys [web-audio-fundamentals](web-audio-fundamentals.md)' rules: every note has an envelope gain starting at 0; attacks ≥ 2 ms (even "instant" percussion); releases before every `stop()`, with `stop(t + release + margin)`; no `.value` jumps on audible params; oscillators/bursts are created per note and disconnected `onended`. Percussion clicks you *want* are made of shaped noise, not of envelope discontinuities — a designed click is mixable, an accidental one is not.

## Implications for generative engines

- **Do** build the palette from these six families — subtractive, FM, Karplus-Strong, additive/PeriodicWave, modal, noise-percussion — all cheap, seedable, and sample-free.
- **Do** give every instrument velocity→brightness mapping (filter cutoff, FM index, burst spectrum), not just velocity→level; it is the main realism lever.
- **Do** fix per-instrument randomness at instrument creation (body resonances, mode detunes) and vary per-note randomness only slightly — instruments must keep identities ([timbre-and-orchestration](timbre-and-orchestration.md)).
- **Do** respect register limits: node-graph KS below ~345 Hz; sub-bass mono; pads below ~2 kHz cutoff; hats above ~7 kHz.
- **Do** encode starting parameters as named presets with ranges, so the composer layer can pick timbres semantically ("soft EP", "dark pad").
- **Don't** ship a voice without an envelope on its output gain, or stop sources mid-sound.
- **Don't** waveshape without oversampling, detune bass stacks, or let every instrument share one attack character — differentiated onsets are what make an ensemble legible.

## Open questions

- Which recipes survive blind comparison against sampled instruments at this project's mix levels — where is synthesis quality actually the bottleneck vs. composition? (Feeds [listening-tests-and-feedback](listening-tests-and-feedback.md).)
- Is a worklet-based Karplus-Strong worth the file:// loading complexity, or do FM plucks cover the melodic-pluck niche well enough?
- Modal-synthesis instrument *design by search*: can offline rendering + metrics auto-tune mode tables toward target timbre descriptors?

## Related pages

- [web-audio-fundamentals](web-audio-fundamentals.md) — envelopes, params, node lifetime these recipes assume
- [effects-and-mixing](effects-and-mixing.md) — the buses, reverbs, and EQ that finish these sounds
- [audio-worklets-and-performance](audio-worklets-and-performance.md) — when a recipe outgrows the node graph
- [timbre-and-orchestration](timbre-and-orchestration.md) — choosing and combining these instruments
- [tuning-and-scales](tuning-and-scales.md) — detune, beating, and intonation choices
- [expressive-performance](expressive-performance.md) — the control signals these voices should expose

## Sources

- Gordon Reid — "Synth Secrets" series (63 parts), Sound on Sound, 1999–2004: filters/envelopes basics; "Synthesizing Drums" (bass drum, snare), "Synthesizing Realistic Cymbals", "Synthesizing Bells", "Synthesizing Plucked Strings", "Practical Bowed-String Synthesis", "Practical Flute Synthesis", "Synthesizing Tonewheel Organs", brass installments. Index: https://www.soundonsound.com/series/synth-secrets-sound-sound
- Gordon Reid — "An Introduction to Frequency Modulation", Synth Secrets part 12, Sound on Sound, 2000. https://www.soundonsound.com/techniques/introduction-frequency-modulation
- Julius O. Smith III — "Karplus-Strong Algorithm" in *Physical Audio Signal Processing*, CCRMA, Stanford (online book; loop-filter and tuning analysis; accessed 2026-07-06). https://ccrma.stanford.edu/~jos/pasp/Karplus_Strong_Algorithm.html
- K. Karplus & A. Strong — "Digital Synthesis of Plucked-String and Drum Timbres", Computer Music Journal 7(2), 1983 (the original algorithm; summarized via the CCRMA treatment above).
- musicdsp.org — "Waveshaper" (Tarrabia/de Jong soft-clip curve; accessed 2026-07-06). https://www.musicdsp.org/en/latest/Effects/46-waveshaper.html
- MDN Web Docs — "PeriodicWave" (accessed 2026-07-06). https://developer.mozilla.org/en-US/docs/Web/API/PeriodicWave
- W3C — "Web Audio API 1.1" Editor's Draft (delay-in-cycle render-quantum clamp; accessed 2026-07-06). https://webaudio.github.io/web-audio-api/
- Thomas D. Rossing — *Science of Percussion Instruments*, World Scientific, 2000 (bar mode ratios 1 : 2.756 : 5.404 : 8.933; tuned-bar and bell partial structures; ratios cross-checked against percussion-acoustics literature).
