// Typed API client for type-safe HTTP requests

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const data: T = await response.json();
  return data;
}

async function get<T>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'GET' });
}

async function post<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export { apiFetch, get, post };
