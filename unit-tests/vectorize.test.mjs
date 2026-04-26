import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { loadReferenceData } from '../src/data/loader.js';
import { vectorizeTransaction } from '../src/engine/vectorize.js';

const fixturePath = new URL('./fixtures/official-examples.json', import.meta.url);
const examples = JSON.parse(await readFile(fixturePath, 'utf8'));
const dataset = await loadReferenceData({ resourcesDir: './resources' });

function assertVectorMatches(actual, expected, messagePrefix) {
  assert.equal(actual.length, expected.length, `${messagePrefix}: vector length mismatch`);

  for (let index = 0; index < expected.length; index += 1) {
    const difference = Math.abs(actual[index] - expected[index]);
    assert.ok(
      difference <= 1e-6,
      `${messagePrefix}: dimension ${index} differs (${actual[index]} vs ${expected[index]})`,
    );
  }
}

for (const example of examples.slice(0, 3)) {
  test(`vectorize matches official vector for ${example.id}`, () => {
    const vector = vectorizeTransaction(example.request, dataset);
    assertVectorMatches(vector, example.vector, example.id);
  });
}
