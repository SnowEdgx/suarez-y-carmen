export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Unknown error";
}

export function logAppError(scope: string, context: string, error: unknown) {
  console.error(`[${scope}] ${context}: ${getErrorMessage(error)}`);
}
