const ENDPOINT = `${import.meta.env.VITE_API_URL || '/api'}/client-logs`;

const MAX_MESSAGE_LENGTH = 1000;
const MAX_STACK_LENGTH = 5000;
const MAX_TEXT_LENGTH = 500;
const MAX_USER_AGENT_LENGTH = 300;

export interface ClientError {
  message: string;
  source?: string;
  line?: number;
  column?: number;
  stack?: string;
}

function truncate(value: string | undefined, maxLength: number): string | undefined {
  return value === undefined ? undefined : value.slice(0, maxLength);
}

export function reportClientError(error: ClientError): void {
  const body = JSON.stringify({
    level: 'error',
    message: truncate(error.message || 'Unknown error', MAX_MESSAGE_LENGTH),
    source: truncate(error.source, MAX_TEXT_LENGTH),
    line: error.line,
    column: error.column,
    stack: truncate(error.stack, MAX_STACK_LENGTH),
    page: truncate(window.location.pathname, MAX_TEXT_LENGTH),
    userAgent: truncate(navigator.userAgent, MAX_USER_AGENT_LENGTH),
  });

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function installErrorReporter(): void {
  window.addEventListener('error', (event: ErrorEvent) => {
    reportClientError({
      message: event.message,
      source: event.filename || undefined,
      line: event.lineno || undefined,
      column: event.colno || undefined,
      stack: event.error instanceof Error ? event.error.stack : undefined,
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason: unknown = event.reason;
    reportClientError({
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
