const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface SearchResult {
  id: string;
  type: 'quest' | 'user' | 'submission';
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  suggestions: string[];
  total: number;
}

export interface SearchFilters {
  type?: 'quest' | 'user' | 'submission' | 'all';
  limit?: number;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

export async function searchGlobal(
  query: string,
  filters?: SearchFilters,
): Promise<SearchResponse> {
  try {
    const params = new URLSearchParams();
    params.append('q', query);

    if (filters?.type && filters.type !== 'all') {
      params.append('type', filters.type);
    }

    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }

    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/search?${params}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

export async function getRecentSearches(): Promise<string[]> {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem('recentSearches');
  return stored ? JSON.parse(stored) : [];
}

export function saveRecentSearch(query: string): void {
  if (typeof window === 'undefined') return;

  const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
  const filtered = recent.filter((q: string) => q !== query);
  const updated = [query, ...filtered].slice(0, 5);

  localStorage.setItem('recentSearches', JSON.stringify(updated));
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('recentSearches');
}
