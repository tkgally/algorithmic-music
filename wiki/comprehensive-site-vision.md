---
title: Comprehensive site vision
tags: [project]
status: draft
created: 2026-07-09
updated: 2026-07-09
summary: Tom's 2026-07-09 definition of the project's long-term goal — one self-contained site that composes and performs instrumental music across many pre-established and original styles, with three tiers of user control — and its first design implications.
---

# Comprehensive site vision

On 2026-07-09, after listening to the first five engines, Tom defined the project's long-term goal: a single comprehensive website that composes and performs instrumental music in a wide variety of styles and forms — both familiar ones grounded in this wiki's research and original ones invented on the fly by the site's own code. This page records that directive faithfully (it arrived as a session prompt, whose text is preserved in the session log cited below and which future sessions cannot otherwise re-read) and derives first design implications. Where this page and older phase framing conflict, this page wins; [project-roadmap](project-roadmap.md) has been redrawn around it.

## The goal, in Tom's terms

- A **self-contained website with no external dependencies** that **composes and performs instrumental music in a wide variety of styles and forms**.
- Some of those styles and forms are **based on pre-established ones** described in previous research and discussions of music **as reported in the wiki**; others are **original, created on the fly by the website's code**.
- The original styles and forms **draw on high-order principles** about piece structure, tonal quality, rhythm, harmony, melody, etc. that are **inspired by previous genres of music while incorporating imaginative and unprecedented elements of their own**.
- The ultimate goal is to create music that is **pleasing, inspiring, and interesting to human listeners** — so **human psychology and response remain important elements**. Tom will offer personal feedback later on beta versions of the site; until then, the design should incorporate what is known about human perception and response to music in general ([musical-expectation](musical-expectation.md), [pleasure-and-reward](pleasure-and-reward.md), [repetition-and-familiarity](repetition-and-familiarity.md), [complexity-and-preference](complexity-and-preference.md), [auditory-perception-basics](auditory-perception-basics.md)).

## The interface: three levels of control

The interface will be similar to the existing engines', except with **three levels of controls**:

1. **Start** — a fairly small number of **familiar genre categories and parameters**; the seed generation chooses from among those genres and parameters. On first access, the user chooses from a few Start-level choices and presses Play.
2. **Intermediate** — about **20 more detailed but still familiar** controls.
3. **Advanced** — a **wide range of other controls, including many for parameters created originally for this website**.

The specifics of those controls will be **suggested by Claude and reviewed by Tom through multiple sessions** — [control-surfaces-and-user-parameters](control-surfaces-and-user-parameters.md) begins that work.

Seed and URL behavior, as specified:

- Pressing Play generates a **random seed that includes the user's choices**, and the piece plays.
- The seed and settings appear as a **suffix to the URL**, and **the same full URL yields the same piece every time** — the determinism rule the engines already follow ([engine-architecture](engine-architecture.md)).
- The encoding should be **more compact** than the current engines' verbose hash; the details **need not be user-decipherable** in the URL itself.
- The seed can be **copied to the clipboard**.
- Other interface elements, such as **playlists, will be developed later**.

## Architecture requirements

- The **entire site lives in one folder**, with a well-organized set of subfolders (scripts, etc.).
- A **large set of shared JS libraries**, created **originally and entirely by Claude** — no code from existing libraries — with the code **annotated clearly** so that what each part does, or is for, is plain. This extends the standing dependency policy ([shared-libraries](shared-libraries.md)); the existing `experiments/lib/` modules (`rng`, `transport`, `theory`, `synth`, `fx`, `analysis`) are the seed of this larger set.
- Vanilla HTML/CSS/JS + Web Audio; instrumental music only; no build step and no network at runtime. *Working assumption (not explicitly restated by Tom for the site): keep the `file://`-runnable classic-script discipline from [engine-architecture](engine-architecture.md), which the one-folder + vendored-libraries requirements are compatible with.*

## What this changes for the project

- **From five single-style engines to one site whose composer covers a style space.** Engines 01–05 remain live as style studies and validated component sources (working assumption pending Tom's confirmation — see [project-open-questions](project-open-questions.md)). Their shared libraries, composers, performers, and UI conventions are the proven raw material the site generalizes.
- **The wiki's breadth is now load-bearing for design breadth.** The variety of human music documented here is simultaneously the specification of the familiar styles and the inspiration pool for the original ones. Tom directed a full session (028) of wide-coverage expansion — world traditions, popular genres, deeper theory, and an original-style design pillar — before any site design begins.
- **A new design pillar** enters the wiki: [style-invention-and-style-space](style-invention-and-style-space.md) (what a style is as a formal object and what makes invented styles cohere), [hybridization-and-fusion](hybridization-and-fusion.md) (how real musical hybrids work — history's A/B tests for on-the-fly style creation), [meta-composition-and-style-machines](meta-composition-and-style-machines.md) (systems that parameterized composition itself), [control-surfaces-and-user-parameters](control-surfaces-and-user-parameters.md) (evidence and precedent for the three-tier control design), and [music-representation-and-notation](music-representation-and-notation.md) (internal representations and compact state encoding).

## First design implications

*Informed speculation, to be worked out in the coming design sessions and confirmed with Tom:*

- **The site needs an explicit style representation** — a "style pack" or style vector that preset styles and invented styles both instantiate, covering at least: pitch material/tuning, harmonic motion type, rhythm/meter/groove, texture and ensemble, timbre palette, form template, tempo/dynamics ranges, expression profile, and ending/beginning idioms. Preset genres are hand-tuned points in this space; original styles are seeded samples from it, passed through coherence constraints.
- **Original styles must be coherent, not arbitrary.** The failed lesson of naive generativity ([generative-music-failure-modes](generative-music-failure-modes.md)) generalizes: an invented style needs a small set of audible rules, enough internal repetition to be statistically learnable within one piece, and anchors on perceptual universals (meter or pulse, moderate event density, tension shaping) so novelty spends its budget where listeners can afford it ([complexity-and-preference](complexity-and-preference.md), [musical-universals](musical-universals.md)).
- **Start-level genre categories will lean on familiar worlds** the wiki now documents — classical, ambient, jazz/blues, groove/beats, folk/world, electronic — with the exact shortlist to be proposed and reviewed. About 6–10 categories is the working assumption.
- **Determinism end to end:** the entire path — genre choice → style sampling or invention → composition → performance → synthesis — must run from the seed plus explicit settings, or the same-URL-same-piece guarantee breaks. This is already the engines' rule; the style-invention layer must obey it too.
- **Compact state encoding:** a versioned, bit-packed or base-N payload replacing the current verbose `key=value` hash — small enough for comfortable sharing, with a version field so old URLs keep working as the site evolves. Design details belong to a future session's site-architecture document.

## Open questions

Filed in [project-open-questions](project-open-questions.md) → "Questions for Tom" (2026-07-09): whether Engines 01–05 stay live alongside the site; where the site lives (working assumption: a new folder under `docs/`); roughly how many Start-level genre categories; and the review cadence for control-taxonomy proposals.

## Related pages

- [project-mission](project-mission.md) · [project-roadmap](project-roadmap.md) · [project-open-questions](project-open-questions.md)
- [engine-architecture](engine-architecture.md) · [shared-libraries](shared-libraries.md) · [improvement-loop](improvement-loop.md)
- [style-and-genre-overview](style-and-genre-overview.md) · [generative-music-design-patterns](generative-music-design-patterns.md) · [generative-music-failure-modes](generative-music-failure-modes.md)
- New pillar: [style-invention-and-style-space](style-invention-and-style-space.md) · [hybridization-and-fusion](hybridization-and-fusion.md) · [meta-composition-and-style-machines](meta-composition-and-style-machines.md) · [control-surfaces-and-user-parameters](control-surfaces-and-user-parameters.md) · [music-representation-and-notation](music-representation-and-notation.md)

## Sources

- Tom Gally, session directive defining the long-term goal, 2026-07-09 — preserved verbatim in `logs/sessions/028-2026-07-09.md` (this repository).
