/* Test entry point: `node experiments/tests/run.js` (or from experiments/tests: `node run.js`). */
'use strict';
const { done } = require('./_runner');
require('./rng.test');
require('./transport.test');
require('./theory.test');
require('./composer.test');
require('./analysis.test');
require('./engine.test');
done();
