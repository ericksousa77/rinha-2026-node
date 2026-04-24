import { createTopKState, insertTopK } from '../../utils/topk.js';
import { TOP_K } from '../../data/constants.js';

/**
 * Executa KNN exato por varredura linear.
 * Usa distância euclidiana ao quadrado para evitar `sqrt` sem alterar a ordenação.
 */
export function searchExact(dataset, queryVector, k = TOP_K) {
  const topK = createTopKState(k);
  const { dimensions, labels, length, vectors } = dataset;

  for (let row = 0; row < length; row += 1) {
    const offset = row * dimensions;
    let distanceSquared = 0;

    for (let dimension = 0; dimension < dimensions; dimension += 1) {
      const difference = queryVector[dimension] - vectors[offset + dimension];
      distanceSquared += difference * difference;
    }

    insertTopK(topK, distanceSquared, labels[row]);
  }

  return topK.labels;
}
