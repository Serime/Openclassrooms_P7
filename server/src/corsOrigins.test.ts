import { describe, expect, it } from 'vitest';
import { parseCorsOrigins } from './corsOrigins';

describe('parseCorsOrigins', () => {
  it('allows no origin when the variable is not set', () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
    expect(parseCorsOrigins('')).toEqual([]);
  });

  it('reads a comma separated list of origins', () => {
    expect(parseCorsOrigins('http://localhost:4200, http://127.0.0.1:4200 ,')).toEqual([
      'http://localhost:4200',
      'http://127.0.0.1:4200',
    ]);
  });
});
