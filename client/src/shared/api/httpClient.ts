export function request(path: string, options?: RequestInit): Promise<Response> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
  return fetch(new URL(path, baseUrl || window.location.origin), options)
}
