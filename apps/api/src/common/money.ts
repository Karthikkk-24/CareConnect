/** Maximum value storable in PostgreSQL NUMERIC(10, 2). */
export const NUMERIC_10_2_MAX = 99_999_999.99;

/** Round to 2 decimal places (NUMERIC(10, 2) / money scale). */
export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
