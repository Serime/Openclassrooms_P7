import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installErrorReporter, reportClientError } from './errorReporter';

const fetchMock = vi.fn();

function sentBody(): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('errorReporter', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the error to the client logs endpoint', () => {
    reportClientError({ message: 'Boom', source: 'app.js', line: 3, column: 7 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/client-logs',
      expect.objectContaining({ method: 'POST', keepalive: true }),
    );
    expect(sentBody()).toMatchObject({ level: 'error', message: 'Boom', source: 'app.js', line: 3, column: 7, page: '/' });
  });

  it('truncates long values to the limits accepted by the API', () => {
    reportClientError({ message: 'x'.repeat(2000), stack: 'y'.repeat(6000) });

    const body = sentBody();
    expect((body.message as string).length).toBe(1000);
    expect((body.stack as string).length).toBe(5000);
  });

  it('never throws when the report cannot be sent', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    expect(() => reportClientError({ message: 'Boom' })).not.toThrow();
    await Promise.resolve();
  });

  it('reports uncaught errors and unhandled rejections', () => {
    installErrorReporter();

    window.dispatchEvent(new ErrorEvent('error', { message: 'Uncaught TypeError', error: new TypeError('bad') }));
    const rejection = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(rejection, 'reason', { value: 'timeout' });
    window.dispatchEvent(rejection);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentBody()).toMatchObject({ message: 'Uncaught TypeError' });
    const [, second] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(second.body as string)).toMatchObject({ message: 'timeout' });
  });
});
