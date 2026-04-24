import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

import { createFraudEngine } from '../src/engine/index.js';

const engine = await createFraudEngine();
const payloads = JSON.parse(
  await readFile(new URL('../resources/example-payloads.json', import.meta.url), 'utf8'),
);

const iterations = Number(process.env.BENCH_ITERATIONS ?? 10_000);

const startedAt = performance.now();

for (let iteration = 0; iteration < iterations; iteration += 1) {
  engine.score(payloads[iteration % payloads.length]);
}

const durationMs = performance.now() - startedAt;
const requestsPerSecond = (iterations / durationMs) * 1000;

console.log(JSON.stringify({
  dataset_source: engine.dataset.source,
  duration_ms: Number(durationMs.toFixed(2)),
  iterations,
  requests_per_second: Number(requestsPerSecond.toFixed(2)),
}, null, 2));
