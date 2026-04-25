export const VECTOR_DIMENSIONS = 14;
export const TOP_K = 5;
export const DEFAULT_MCC_RISK_FALLBACK = 0.5;
export const DEFAULT_FRAUDE_SCORE_THRESHOLD = 0.6;

export const DEFAULT_NORMALIZATION = Object.freeze({
  max_amount: 10_000,
  max_installments: 12,
  amount_vs_avg_ratio: 10,
  max_minutes: 1_440,
  max_km: 1_000,
  max_tx_count_24h: 20,
  max_merchant_avg_amount: 10_000,
});

export const DEFAULT_MCC_RISK = Object.freeze({
  5411: 0.15,
  5812: 0.3,
  5912: 0.2,
  5944: 0.45,
  7801: 0.8,
  7802: 0.75,
  7995: 0.85,
  4511: 0.35,
  5311: 0.25,
  5999: 0.5,
});
