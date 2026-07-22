/**
 * Lazy API client loader.
 *
 * Modules that do not need immediate network access should import the client
 * via this helper instead of importing directly from `./client`. This defers
 * the module evaluation and avoids eager initialisation on app startup.
 *
 * @example
 *   const { apiClient } = await getLazyApiClient();
 *   const data = await apiClient.get('/quests');
 */
export async function getLazyApiClient() {
  const { getApiClient } = await import('./client');
  return { apiClient: getApiClient() };
}

/**
 * Lazy loader for the authenticated API client.
 * Use in components or services that only need the client on user interaction.
 */
export async function getLazyAuthClient() {
  const { getApiClient } = await import('./client');
  return { authClient: getApiClient() };
}
