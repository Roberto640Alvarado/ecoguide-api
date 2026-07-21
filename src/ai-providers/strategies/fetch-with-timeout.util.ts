const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Wrapper sobre fetch con un timeout (AbortController) para que una llamada
 * lenta a un proveedor de IA externo no deje la petición HTTP colgada
 * indefinidamente. Usado por todas las AIProviderStrategy.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
