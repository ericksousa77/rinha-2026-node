import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gunzip } from 'node:zlib';

import {
  DEFAULT_MCC_RISK,
  DEFAULT_NORMALIZATION,
  VECTOR_DIMENSIONS,
} from './constants.js';

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const gunzipAsync = promisify(gunzip);

/**
 * Resolve caminhos relativos sempre a partir da raiz do projeto.
 */
function resolveProjectPath(relativePath) {
  return resolve(PROJECT_ROOT, relativePath);
}

/**
 * Helper pequeno para testar presença de arquivos sem poluir o fluxo principal.
 */
async function fileExists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

/**
 * Procura dados primeiro no diretório configurado para runtime e depois em `resources/`.
 */
function resolveResourceDirectories(explicitDirectory) {
  const configuredDirectory = explicitDirectory ?? process.env.RINHA_RESOURCES_DIR ?? './data';
  const resolvedConfiguredDirectory = resolveProjectPath(configuredDirectory);
  const fallbackDirectory = resolveProjectPath('./resources');

  if (resolvedConfiguredDirectory === fallbackDirectory) {
    return [resolvedConfiguredDirectory];
  }

  return [resolvedConfiguredDirectory, fallbackDirectory];
}

async function readJsonFile(pathname) {
  return JSON.parse(await readFile(pathname, 'utf8'));
}

/**
 * Lê o primeiro JSON encontrado na ordem de diretórios resolvida.
 */
async function readFirstJson(directories, filename, fallback) {
  for (const directory of directories) {
    const pathname = join(directory, filename);

    if (await fileExists(pathname)) {
      return {
        pathname,
        value: {
          ...fallback,
          ...await readJsonFile(pathname),
        },
      };
    }
  }

  return {
    pathname: null,
    value: fallback,
  };
}

/**
 * Converte o JSON oficial (AoS) para a estrutura tipada usada pelo hot path.
 */
function buildTypedDataset(references) {
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

  return {
    dimensions: VECTOR_DIMENSIONS,
    labels,
    length: references.length,
    vectors,
  };
}

/**
 * Caminho rápido de boot: carrega vetores e labels já preprocessados em binário.
 */
async function loadBinaryDataset(directory) {
  const referencesPath = join(directory, 'references.bin');
  const labelsPath = join(directory, 'labels.bin');

  if (!await fileExists(referencesPath) || !await fileExists(labelsPath)) {
    return null;
  }

  const [vectorsBuffer, labelsBuffer] = await Promise.all([
    readFile(referencesPath),
    readFile(labelsPath),
  ]);

  const vectors = new Float32Array(
    vectorsBuffer.buffer,
    vectorsBuffer.byteOffset,
    vectorsBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
  );

  const labels = new Uint8Array(
    labelsBuffer.buffer,
    labelsBuffer.byteOffset,
    labelsBuffer.byteLength,
  );

  return {
    dimensions: VECTOR_DIMENSIONS,
    labels,
    length: labels.length,
    source: 'bin',
    vectors,
  };
}

/**
 * Fallback de desenvolvimento quando os binários ainda não foram gerados.
 */
async function loadJsonDataset(directory) {
  const referencesPath = join(directory, 'references.json.gz');

  if (!await fileExists(referencesPath)) {
    return null;
  }

  const compressed = await readFile(referencesPath);
  const decompressed = await gunzipAsync(compressed);
  const references = JSON.parse(decompressed.toString('utf8'));

  return {
    ...buildTypedDataset(references),
    source: 'json.gz',
  };
}

/**
 * Monta o dataset completo da aplicação.
 * Prefere `.bin` por startup rápido e cai para `.json.gz` apenas quando necessário.
 */
export async function loadReferenceData(options = {}) {
  const directories = resolveResourceDirectories(options.resourcesDir);

  const [normalizationResult, mccRiskResult] = await Promise.all([
    readFirstJson(directories, 'normalization.json', DEFAULT_NORMALIZATION),
    readFirstJson(directories, 'mcc_risk.json', DEFAULT_MCC_RISK),
  ]);

  for (const directory of directories) {
    const dataset = await loadBinaryDataset(directory);

    if (dataset) {
      return {
        ...dataset,
        mccRisk: mccRiskResult.value,
        normalization: normalizationResult.value,
        resourcesDir: directory,
      };
    }
  }

  for (const directory of directories) {
    const dataset = await loadJsonDataset(directory);

    if (dataset) {
      return {
        ...dataset,
        mccRisk: mccRiskResult.value,
        normalization: normalizationResult.value,
        resourcesDir: directory,
      };
    }
  }

  throw new Error(
    `reference dataset not found under ${directories.join(', ')}`,
  );
}
