import { DEFAULT_MCC_RISK_FALLBACK } from '../data/constants.js';
import {
  getUtcHour,
  getUtcWeekdayMondayFirst,
  getMinutesBetweenIsoTimestamps,
} from '../utils/time.js';

/**
 * Mantém dimensões contínuas dentro do intervalo aceito pelo dataset oficial.
 */
function clamp01(value) {
  if (!Number.isFinite(value)) {
    return value > 0 ? 1 : 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

/**
 * Os vetores oficiais são persistidos com 4 casas decimais.
 */
function round4(value) {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Aplica clamp e arredondamento em um único passo.
 */
function normalizeClamped(value) {
  return round4(clamp01(value));
}

function booleanAsNumber(value) {
  return value ? 1 : 0;
}

/**
 * Implementa as 14 dimensões da vetorização, preservando o sentinela `-1`
 * nos campos dependentes de `last_transaction`.
 */
export function vectorizeTransaction(payload, dataset) {
  const { normalization, mccRisk } = dataset;
  const vector = new Float32Array(14);

  vector[0] = normalizeClamped(payload.transaction.amount / normalization.max_amount);
  vector[1] = normalizeClamped(payload.transaction.installments / normalization.max_installments);

  const amountVsAvgBase = payload.customer.avg_amount > 0
    ? payload.transaction.amount / payload.customer.avg_amount
    : Number.POSITIVE_INFINITY;

  vector[2] = normalizeClamped(amountVsAvgBase / normalization.amount_vs_avg_ratio);
  vector[3] = normalizeClamped(getUtcHour(payload.transaction.requested_at) / 23);
  vector[4] = normalizeClamped(getUtcWeekdayMondayFirst(payload.transaction.requested_at) / 6);

  if (payload.last_transaction === null) {
    // O sentinela faz parte do espaço vetorial oficial e não deve ser normalizado.
    vector[5] = -1;
    vector[6] = -1;
  } else {
    const minutesSinceLastTransaction = getMinutesBetweenIsoTimestamps(
      payload.transaction.requested_at,
      payload.last_transaction.timestamp,
    );

    vector[5] = normalizeClamped(minutesSinceLastTransaction / normalization.max_minutes);
    vector[6] = normalizeClamped(payload.last_transaction.km_from_current / normalization.max_km);
  }

  vector[7] = normalizeClamped(payload.terminal.km_from_home / normalization.max_km);
  vector[8] = normalizeClamped(payload.customer.tx_count_24h / normalization.max_tx_count_24h);
  vector[9] = booleanAsNumber(payload.terminal.is_online);
  vector[10] = booleanAsNumber(payload.terminal.card_present);
  vector[11] = payload.customer.known_merchants.includes(payload.merchant.id) ? 0 : 1;
  vector[12] = round4(mccRisk[payload.merchant.mcc] ?? DEFAULT_MCC_RISK_FALLBACK);
  vector[13] = normalizeClamped(payload.merchant.avg_amount / normalization.max_merchant_avg_amount);

  return vector;
}
