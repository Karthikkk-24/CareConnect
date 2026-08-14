import { NUMERIC_10_2_MAX, roundMoney } from './money';

describe('roundMoney', () => {
  it('rounds classic float sums to 2 decimal places', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('preserves exact hundredths', () => {
    expect(roundMoney(10.1)).toBe(10.1);
    expect(roundMoney(10.12)).toBe(10.12);
  });

  it('rounds to the nearest cent', () => {
    expect(roundMoney(1.006)).toBe(1.01);
    expect(roundMoney(1.004)).toBe(1);
  });

  it('matches NUMERIC(10, 2) max after rounding', () => {
    expect(roundMoney(NUMERIC_10_2_MAX)).toBe(99_999_999.99);
  });
});
