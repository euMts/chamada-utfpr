export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return "Erro desconhecido.";
}

export function logApiError(scope: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[${scope}]`, {
    ...context,
    cause: getErrorMessage(error),
  });
}
