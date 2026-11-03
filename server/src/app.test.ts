import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from './app';
import { logger } from './logger';

describe('app', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('answers the health check', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('answers 404 on unknown routes and logs the request as a warning', async () => {
    const log = vi.spyOn(logger, 'log');

    const res = await request(app).get('/api/unknown?page=2');

    expect(res.status).toBe(404);
    expect(log).toHaveBeenCalledWith(
      'warn',
      'http_request',
      expect.objectContaining({
        http: expect.objectContaining({ method: 'GET', path: '/api/unknown', status_code: 404 }),
      }),
    );
  });

  it('answers 400 on malformed JSON without reporting an unhandled error', async () => {
    const error = vi.spyOn(logger, 'error');

    const res = await request(app)
      .post('/api/client-logs')
      .set('Content-Type', 'application/json')
      .send('{"level":');

    expect(res.status).toBe(400);
    expect(error).not.toHaveBeenCalled();
  });

  describe('POST /api/client-logs', () => {
    it('logs a valid browser report at its level', async () => {
      const log = vi.spyOn(logger, 'log');

      const res = await request(app)
        .post('/api/client-logs')
        .send({ level: 'error', message: 'Cannot read properties of undefined', page: '/contacts', line: 12 });

      expect(res.status).toBe(204);
      expect(log).toHaveBeenCalledWith('error', 'client_log', {
        origin: 'browser',
        client: { message: 'Cannot read properties of undefined', page: '/contacts', line: 12 },
      });
    });

    it('rejects a report with an unknown level', async () => {
      const res = await request(app).post('/api/client-logs').send({ level: 'fatal', message: 'boom' });

      expect(res.status).toBe(400);
    });

    it('rejects an oversized message', async () => {
      const res = await request(app)
        .post('/api/client-logs')
        .send({ level: 'error', message: 'x'.repeat(1001) });

      expect(res.status).toBe(400);
    });
  });
});
