/*
 * Minimal dependency-free test runner for the experiments/ prototypes.
 * No framework — just enough to assert and report. Tests register at require
 * time via test(); run.js requires the suites then calls done().
 */
'use strict';

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('.');
  } catch (e) {
    failed++;
    failures.push([name, e]);
    process.stdout.write('F');
  }
}

function eq(actual, expected, msg) {
  const A = JSON.stringify(actual);
  const B = JSON.stringify(expected);
  if (A !== B) {
    throw new Error(`${msg || 'not equal'}\n  expected: ${B}\n  actual:   ${A}`);
  }
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg || 'expected truthy');
}

function approx(actual, expected, eps, msg) {
  const e = eps == null ? 1e-9 : eps;
  if (Math.abs(actual - expected) > e) {
    throw new Error(`${msg || 'not approx equal'}: ${actual} vs ${expected} (eps ${e})`);
  }
}

function done() {
  process.stdout.write(`\n\n${passed} passed, ${failed} failed\n`);
  for (const [name, e] of failures) {
    console.error(`\nFAIL: ${name}\n  ${e.message}`);
  }
  process.exit(failed ? 1 : 0);
}

module.exports = { test, eq, ok, approx, done };
