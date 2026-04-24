import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gunzip } from 'node:zlib';

import { VECTOR_DIMENSIONS } from '../src/data/constants.js';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const gunzipAsync = promisify(gunzip);

function resolvePath(pathname) {
  return resolve(PROJECT_ROOT, pathname);
}

const resourcesDir = resolvePath(process.env.RINHA_SOURCE_RESOURCES_DIR ?? './resources');
const outputDir = resolvePath(process.env.RINHA_OUTPUT_DIR ?? './data');

const compressedReferencesPath = join(resourcesDir, 'references.json.gz');
const normalizationPath = join(resourcesDir, 'normalization.json');
const mccRiskPath = join(resourcesDir, 'mcc_risk.json');
const referencesOutputPath = join(outputDir, 'references.bin');
const labelsOutputPath = join(outputDir, 'labels.bin');

await mkdir(outputDir, { recursive: true });

const compressedReferences = await readFile(compressedReferencesPath);
const decompressedReferences = await gunzipAsync(compressedReferences);
const references = JSON.parse(decompressedReferences.toString('utf8'));

const vectors = new Float32Array(references.length * VECTOR_DIMENSIONS);
const labels = new Uint8Array(references.length);

for (let row = 0; row < references.length; row += 1) {
  const reference = references[row];
  const offset = row * VECTOR_DIMENSIONS;

  for (let dimension = 0; dimension < VECTOR_DIMENSIONS; dimension += 1) {
    vectors[offset + dimension] = reference.vector[dimension];
  }

  labels[row] = reference.label === 'fraud' ? 1 : 0;
}

await Promise.all([
  writeFile(
    referencesOutputPath,
    Buffer.from(vectors.buffer, vectors.byteOffset, vectors.byteLength),
  ),
  writeFile(
    labelsOutputPath,
    Buffer.from(labels.buffer, labels.byteOffset, labels.byteLength),
  ),
  copyFile(normalizationPath, join(outputDir, 'normalization.json')),
  copyFile(mccRiskPath, join(outputDir, 'mcc_risk.json')),
]);

console.log(`preprocessed ${references.length} reference vectors into ${outputDir}`);
