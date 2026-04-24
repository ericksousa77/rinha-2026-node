/**
 * Cria o estado fixo do top-k. Para k=5, insertion sort é simples e barato.
 */
export function createTopKState(size) {
  const distances = new Float64Array(size);
  distances.fill(Number.POSITIVE_INFINITY);

  return {
    distances,
    labels: new Uint8Array(size),
    size,
  };
}

/**
 * Insere um candidato melhor no top-k, mantendo o array ordenado por distância.
 */
export function insertTopK(state, distance, label) {
  const lastIndex = state.size - 1;

  if (distance >= state.distances[lastIndex]) {
    return;
  }

  let insertIndex = lastIndex;

  while (insertIndex > 0 && distance < state.distances[insertIndex - 1]) {
    state.distances[insertIndex] = state.distances[insertIndex - 1];
    state.labels[insertIndex] = state.labels[insertIndex - 1];
    insertIndex -= 1;
  }

  state.distances[insertIndex] = distance;
  state.labels[insertIndex] = label;
}
