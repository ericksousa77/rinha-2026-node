const FRAUD_SCORES = Object.freeze([0, 0.2, 0.4, 0.6, 0.8, 1]);

/**
 * Converte os labels dos vizinhos mais próximos no contrato final da API.
 */
export function decideFromLabels(labelBits) {
  let fraudCount = 0;

  for (let index = 0; index < labelBits.length; index += 1) {
    fraudCount += labelBits[index];
  }

  const fraudScore = labelBits.length === 5
    ? FRAUD_SCORES[fraudCount]
    : Number((fraudCount / labelBits.length).toFixed(4));

  return {
    approved: fraudScore < 0.6,
    fraud_score: fraudScore,
  };
}
