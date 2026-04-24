import { TOP_K } from '../../data/constants.js';
import { searchExact } from './exact.js';

/**
 * HNSW (Hierarchical Navigable Small World) e um indice aproximado de
 * vizinhos mais proximos baseado em grafo.
 *
 * Ideia geral:
 * - no bootstrap, os vetores de referencia sao organizados em um grafo com
 *   atalhos entre pontos "proximos"
 * - na consulta, a busca navega por esse grafo em vez de varrer todas as
 *   100k referencias
 *
 * Trade-off:
 * - startup mais caro e maior uso de memoria
 * - consultas muito mais baratas
 * - por ser ANN (Approximate Nearest Neighbors), pode perder algum vizinho
 *   exato em troca de latencia menor
 */
const DEFAULT_HNSW_EF_SEARCH = 50;
const DEFAULT_HNSW_EF_CONSTRUCTION = 200;
const DEFAULT_HNSW_M = 16;
const DEFAULT_HNSW_RANDOM_SEED = 100;

/**
 * Le opcoes numericas vindas de env ou de `options` e aplica validacao basica.
 */
function parseIntegerOption(value, fallback, label) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`invalid ${label}: ${value}`);
  }

  return parsed;
}

/**
 * A binding nativa do `hnswlib-node` espera um vetor JS comum ao adicionar
 * pontos no indice. O dataset, por eficiencia, fica em um bloco tipado e
 * linear (`Float32Array`), entao aqui fazemos a extracao de uma linha.
 */
function vectorRowToArray(vectors, offset, dimensions) {
  const point = new Array(dimensions);

  for (let dimension = 0; dimension < dimensions; dimension += 1) {
    point[dimension] = vectors[offset + dimension];
  }

  return point;
}

/**
 * Cria um backend de busca vetorial baseado em HNSW e devolve uma funcao com
 * a mesma interface do backend `exact`.
 *
 * Parametros relevantes do algoritmo:
 * - `m`: numero maximo de conexoes por no no grafo. Mais alto tende a melhorar
 *   recall, mas aumenta memoria e custo de construcao.
 * - `efConstruction`: largura da busca durante a montagem do indice. Mais alto
 *   tende a produzir um grafo melhor, mas deixa o startup mais caro.
 * - `efSearch`: largura da busca durante a consulta. Mais alto tende a melhorar
 *   recall, mas aumenta latencia por request.
 * - `randomSeed`: deixa a construcao reproduzivel entre boots.
 *
 * Observacao importante:
 * o custo pesado deste backend acontece antes do servidor ficar pronto. Por
 * isso, o ganho principal aparece no p99 de request, nao no tempo de startup.
 */
export async function createHnswSearchBackend(dataset, options = {}) {
  const hnswlibNode = await import('hnswlib-node');
  const { HierarchicalNSW } = hnswlibNode.default;

  const efSearch = parseIntegerOption(
    options.hnswEfSearch ?? process.env.RINHA_HNSW_EF_SEARCH,
    DEFAULT_HNSW_EF_SEARCH,
    'RINHA_HNSW_EF_SEARCH',
  );

  const efConstruction = parseIntegerOption(
    options.hnswEfConstruction ?? process.env.RINHA_HNSW_EF_CONSTRUCTION,
    DEFAULT_HNSW_EF_CONSTRUCTION,
    'RINHA_HNSW_EF_CONSTRUCTION',
  );

  const m = parseIntegerOption(
    options.hnswM ?? process.env.RINHA_HNSW_M,
    DEFAULT_HNSW_M,
    'RINHA_HNSW_M',
  );

  const randomSeed = parseIntegerOption(
    options.hnswRandomSeed ?? process.env.RINHA_HNSW_RANDOM_SEED,
    DEFAULT_HNSW_RANDOM_SEED,
    'RINHA_HNSW_RANDOM_SEED',
  );

  // Usa distancia euclidiana ao quadrado (`l2`) para manter a mesma metrica
  // conceitual do backend exato.
  const index = new HierarchicalNSW('l2', dataset.dimensions);
  index.initIndex(dataset.length, m, efConstruction, randomSeed);
  index.setEf(Math.max(efSearch, TOP_K));

  // A construcao do indice e O(N) no numero de referencias e ocorre uma vez
  // no bootstrap. Depois disso, as consultas deixam de depender de varredura
  // completa.
  for (let row = 0; row < dataset.length; row += 1) {
    const offset = row * dataset.dimensions;
    index.addPoint(vectorRowToArray(dataset.vectors, offset, dataset.dimensions), row);
  }

  /**
   * Executa KNN aproximado sobre o indice HNSW.
   *
   * A biblioteca devolve os ids das referencias mais proximas; aqui apenas
   * mapeamos esses ids para os labels usados pela regra de decisao.
   *
   * Se a binding devolver menos resultados que o esperado, caimos para o
   * backend exato como protecao de corretude.
   */
  return function searchWithHnsw(queryVector, k = TOP_K) {
    const queryPoint = Array.from(queryVector);
    const result = index.searchKnn(queryPoint, k);
    const neighbors = result?.neighbors ?? [];

    if (neighbors.length < k) {
      return searchExact(dataset, queryVector, k);
    }

    const labels = new Uint8Array(k);

    for (let indexPosition = 0; indexPosition < k; indexPosition += 1) {
      labels[indexPosition] = dataset.labels[neighbors[indexPosition]];
    }

    return labels;
  };
}
