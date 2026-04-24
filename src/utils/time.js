/**
 * Extrai a hora UTC diretamente da string ISO.
 */
export function getUtcHour(timestamp) {
  return Number(timestamp.slice(11, 13));
}

/**
 * Converte `getUTCDay()` para a convenção da spec: segunda=0, domingo=6.
 */
export function getUtcWeekdayMondayFirst(timestamp) {
  const weekday = new Date(timestamp).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

/**
 * Retorna a diferença em minutos entre dois timestamps ISO UTC.
 */
export function getMinutesBetweenIsoTimestamps(laterTimestamp, earlierTimestamp) {
  const later = Date.parse(laterTimestamp);
  const earlier = Date.parse(earlierTimestamp);
  return (later - earlier) / 60_000;
}
