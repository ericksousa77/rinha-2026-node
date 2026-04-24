import { loadReferenceData } from '../data/loader.js';
import { searchExact } from './backends/exact.js';
import { createHnswSearchBackend } from './backends/hnsw.js';
import { decideFromLabels } from './decision.js';
import { vectorizeTransaction } from './vectorize.js';

/**
 * Resolve o backend de busca vetorial configurado para o processo atual.
 */
async function createSearchBackend(name, dataset, options = {}) {
  switch (name) {
    case 'exact':
      return (queryVector) => searchExact(dataset, queryVector);
    case 'hnsw':
      return createHnswSearchBackend(dataset, options);
    default:
      throw new Error(`unsupported search backend: ${name}`);
  }
}

export class FraudEngine {
  constructor(dataset, searchBackend) {
    this.dataset = dataset;
    this.searchBackend = searchBackend;
  }

  /**
   * Converte um payload HTTP no vetor de 14 dimensões da spec.
   */
  vectorize(payload) {
    return vectorizeTransaction(payload, this.dataset);
  }

  /**
   * Executa o fluxo completo da decisão de fraude.
   */
  score(payload) {
    const vector = this.vectorize(payload);
    const labels = this.searchBackend(vector);
    return decideFromLabels(labels);
  }
}

/**
 * Carrega o dataset e devolve uma instância pronta para ser usada pelo servidor.
 */
export async function createFraudEngine(options = {}) {
  const dataset = await loadReferenceData(options);
  const backendName = options.searchBackend ?? process.env.RINHA_SEARCH_BACKEND ?? 'exact';
  const searchBackend = await createSearchBackend(backendName, dataset, options);

  return new FraudEngine(dataset, searchBackend);
}
