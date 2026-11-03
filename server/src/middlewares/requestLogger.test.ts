import { describe, expect, it } from 'vitest';
import { levelForStatus, normalizePath } from './requestLogger';

describe('normalizePath', () => {
  it('removes the query string', () => {
    expect(normalizePath('/api/contacts?page=2')).toBe('/api/contacts');
  });

  it('replaces identifiers so that routes can be aggregated', () => {
    expect(normalizePath('/api/contacts/3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d')).toBe('/api/contacts/:id');
  });
});

describe('levelForStatus', () => {
  it.each([
    [200, 'info'],
    [304, 'info'],
    [400, 'warn'],
    [404, 'warn'],
    [500, 'error'],
    [503, 'error'],
  ])('maps %i to %s', (status, level) => {
    expect(levelForStatus(status)).toBe(level);
  });
});
