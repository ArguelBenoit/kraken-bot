/** Client HTTP de l'API Flask. Toute réponse `ok:false` ou HTTP d'erreur devient une exception avec le message du serveur. */
export class ApiError extends Error {}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.ok === false || data?.error) throw new ApiError(data?.error ?? `Erreur ${res.status}`)
  return data as T
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T = { ok: true }>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  del: <T = { ok: true }>(url: string) => request<T>('DELETE', url),
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))
