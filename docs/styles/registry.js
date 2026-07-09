/*
 * styles/registry — the genre-pack registry the comprehensive site's style
 * machinery reads. Each genre pack (docs/styles/<genre>.js) is a classic
 * script that calls AM.styles.register({...}) with its preset region and its
 * incremental compose strategy; docs/lib/style.js samples vectors from the
 * registered presets and docs/lib/compose.js runs the registered strategies.
 *
 * A pack registers ONE object:
 *   {
 *     id: 'classical',            // stable id (also the URL enum value, by order)
 *     name: 'Classical',          // UI label
 *     order: 0,                   // Start-button order AND the 3-bit URL enum value
 *     blurb: '...',               // one line under the Start button
 *     preset: { ...region... },   // per-field regions style.sample() draws from
 *     strategy: {                 // the just-in-time composer for this family
 *       unitBars: 4,
 *       init(vector, rng) -> plan,
 *       nextUnit(plan, vector, pos, rng) -> unit,
 *     },
 *   }
 * See docs/lib/style.js for the region grammar and docs/lib/compose.js for the
 * plan/unit contracts. Load order: registry.js before any pack, packs before
 * app.js. Part of the site's first-party libraries (original code, CC0).
 */
;(function (global) {
  'use strict';
  const AM = global.AM || (global.AM = {});
  const packs = {};
  AM.styles = {
    register(pack) {
      if (!pack || !pack.id) throw new Error('styles.register: pack needs an id');
      packs[pack.id] = pack;
      return pack;
    },
    get(id) { return packs[id] || null; },
    /** All packs sorted by their Start-button order. */
    list() { return Object.keys(packs).map((k) => packs[k]).sort((a, b) => (a.order || 0) - (b.order || 0)); },
    /** id for a URL enum value (the pack order), and back. */
    byOrder(n) { return this.list().find((p) => p.order === n) || null; },
  };
})(typeof self !== 'undefined' ? self : this);
