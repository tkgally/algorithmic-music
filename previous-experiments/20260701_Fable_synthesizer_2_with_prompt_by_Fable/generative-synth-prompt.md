# Prompt for Claude Code: Generative Polyphonic Browser Synthesizer

Build a browser-based generative synthesizer that composes and performs its own polyphonic music continuously, with multiple voices that play off against each other in both harmony and contrast. The user does not play notes; the user shapes the music's character through controls. The goal is an instrument for listening and exploration, not performance.

## Musical engine

- Three to eight simultaneous voices, each with its own melodic line, register, timbre, and rhythmic behavior.
- The voices must genuinely interact, not just run in parallel. Implement mechanisms such as:
  - **Imitation and answer**: a voice can pick up a motif recently played by another voice and repeat, invert, transpose, or vary it.
  - **Counterpoint rules, loosely applied**: voices prefer contrary or oblique motion against each other some of the time, and deliberately break the preference some of the time.
  - **Harmonic negotiation**: voices are aware of the current aggregate harmony and each voice decides, per note, whether to reinforce it, color it, or push against it.
  - **Call and response and silence**: voices should sometimes drop out and listen, so the texture breathes rather than staying uniformly dense.
- Music should evolve over time on its own: motifs recur and transform, tonal centers drift, textures thicken and thin. Ten minutes of listening should never feel like a static loop, but the piece should also feel coherent, not like unrelated noodling.
- Default settings must sound genuinely good within the first thirty seconds, before the user touches anything.

## Controls: original, metaphorical, musically deep

Do NOT expose standard synthesizer controls (ADSR, filter cutoff, LFO rate, waveform selectors). Every control should be a named musical or physical metaphor whose effect is audible, meaningful, and composed of several coordinated parameter changes under the hood. A naive user with no music theory should be able to turn any knob and hear an interesting, describable change.

Implement controls along these lines — refine the names and behaviors, and invent additional ones in the same spirit:

- **Conversation** — from total independence (each voice ignores the others) to tight imitation (voices echo and answer each other's motifs). Governs the imitation/answer machinery.
- **Gravity** — the pull toward consonance and a tonal center. Low gravity lets voices float into modal ambiguity and dissonance; high gravity keeps everything resolving homeward.
- **Weather** — the rate and depth of slow, autonomous change: drifting tonal centers, gradually mutating scales, evolving timbres and tempi. Calm weather means near-stasis; stormy weather means the piece keeps transforming under the listener.
- **Crowd** — number of active voices, but implemented musically: voices should enter and exit gracefully (fading in mid-phrase, finishing a phrase before leaving), not pop in and out.
- **Mischief** — melodic and rhythmic unpredictability: how often voices break patterns, leap unexpectedly, syncopate, or interrupt each other. At zero, the music is orderly and hymn-like; at maximum, it is playful and unstable but should still avoid pure randomness.
- **Memory** — how strongly the piece remembers and returns to its own earlier material. High memory produces recurring themes and a sense of form; low memory produces perpetual novelty.
- **Material** — the overall sound-world of the voices, expressed as physical materials rather than synthesis jargon: e.g., glass, wood, brass, breath, water. Each material is a designed timbre family (oscillator mix, envelope shapes, inharmonicity, noise content, effects) applied with per-voice variation so voices remain distinguishable.
- **Pulse** — the rhythmic feel, from free floating rubato through gentle pulse to insistent groove, including how strictly the voices share a common grid versus drifting in and out of phase with one another.

Controls should interact: e.g., high Conversation plus high Mischief should yield voices that mock and interrupt each other; high Gravity plus high Memory should tend toward chorale-like statements of a returning theme. Design for these emergent combinations.

Add a **"Surprise me"** button that jumps to a randomly chosen but curated (musically plausible) combination of settings, and a small set of named presets with evocative titles so users can hear the range of the instrument immediately.

## Interface

- Clean, inviting, single-page UI. Controls labeled only with their metaphor names plus a one-line poetic hint on hover or tap. No technical jargon anywhere.
- Some simple, attractive real-time visualization of the voices and their interactions (e.g., each voice as a colored trace or moving shape whose behavior reflects what it is playing), so users can see the polyphony as well as hear it.
- Works on desktop and reasonably on mobile/tablet.
- Audio starts only after a user gesture (browser autoplay policy); include a clear start/stop control and a master volume.

## Technical requirements

- Single self-contained `index.html` (HTML, CSS, JavaScript in one file), vanilla JavaScript, Web Audio API only, no build step, no external dependencies, no network access. It must run by simply opening the file in a modern browser.
- Structure the code readably with clear separation between the composition engine (decides what notes to play) and the synthesis engine (makes the sounds), with comments explaining the musical logic, since the code will be read and modified later.
- Keep CPU use reasonable; the piece should be able to run for an hour without glitches or memory growth.

## Process

Before writing code, briefly present your plan: the control set you intend to implement (including any you invent beyond those listed), the musical mechanisms behind each, and the materials/presets you'll include. Then build it. After building, test that it produces sound correctly and that every control has a clearly audible effect.
