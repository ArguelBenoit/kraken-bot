/** Client HTTP de l'API Flask. Toute réponse `ok:false` ou HTTP d'erreur devient une exception avec le message du serveur. */
class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.ok === false || data?.error) throw new ApiError(data?.error ?? `Erreur ${res.status}`, res.status)
  return data as T
}

/** Appels HTTP typés vers l'API Python (même origine ; en développement, Vite proxifie /api). */
export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  put: <T>(url: string, body: unknown) => request<T>('PUT', url, body),
  post: <T = { ok: true }>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  del: <T = { ok: true }>(url: string) => request<T>('DELETE', url),
}

/** 404 sur une route /api : le serveur Python tourne encore avec une ancienne version du code. */
export const isMissingRoute = (e: unknown) => e instanceof ApiError && e.status === 404

/** Message affichable d'une erreur inconnue. */
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))
