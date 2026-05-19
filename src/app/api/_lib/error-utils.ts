export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return "Erro desconhecido.";
}

export function getErrorDetails(error: unknown, depth = 0): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return {
      value: error,
    };
  }

  const errorWithCause = error as Error & {
    cause?: unknown;
    code?: unknown;
    errno?: unknown;
    syscall?: unknown;
    hostname?: unknown;
    host?: unknown;
    port?: unknown;
    address?: unknown;
  };

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: errorWithCause.code,
    errno: errorWithCause.errno,
    syscall: errorWithCause.syscall,
    hostname: errorWithCause.hostname,
    host: errorWithCause.host,
    port: errorWithCause.port,
    address: errorWithCause.address,
    cause: errorWithCause.cause && depth < 3
      ? getErrorDetails(errorWithCause.cause, depth + 1)
      : errorWithCause.cause,
  };
}

export function logApiError(scope: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[${scope}]`, {
    ...context,
    cause: getErrorMessage(error),
    errorDetails: getErrorDetails(error),
  });
}
