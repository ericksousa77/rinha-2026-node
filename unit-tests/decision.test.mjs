import assert from 'node:assert/strict';
import test from 'node:test';

import { decideFromLabels } from '../src/engine/decision.js';

const cases = [
  { labels: [0, 0, 0, 0, 0], approved: true, fraud_score: 0 },
  { labels: [1, 0, 0, 0, 0], approved: true, fraud_score: 0.2 },
  { labels: [1, 1, 0, 0, 0], approved: true, fraud_score: 0.4 },
  { labels: [1, 1, 1, 0, 0], approved: false, fraud_score: 0.6 },
  { labels: [1, 1, 1, 1, 0], approved: false, fraud_score: 0.8 },
  { labels: [1, 1, 1, 1, 1], approved: false, fraud_score: 1 },
];

for (const testCase of cases) {
  test(`decision yields ${testCase.fraud_score} for ${testCase.labels.join('')}`, () => {
    const actual = decideFromLabels(Uint8Array.from(testCase.labels));
    assert.deepEqual(actual, {
      approved: testCase.approved,
      fraud_score: testCase.fraud_score,
    });
  });
}
