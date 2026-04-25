/**
 * Test to verify useUserStats hook properly uses authenticated user address
 */

// Mock the dependencies
const mockUseAuth = jest.fn();
const mockFetchDashboardData = jest.fn();

// Mock the modules
jest.mock('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

jest.mock('@/lib/api/user', () => ({
  fetchDashboardData: mockFetchDashboardData,
}));

describe('useUserStats Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should not fetch data when user is not authenticated', () => {
    // Mock unauthenticated user
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Import and render the hook
    const { result } = renderHook(() => useUserStats());

    // Should not call fetchDashboardData
    expect(mockFetchDashboardData).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.stats).toBe(null);
  });

  test('should fetch data with user address when authenticated', async () => {
    // Mock authenticated user
    const mockUser = {
      stellarAddress: 'GD5DJ3D6KQW3YVQHDYRJZKYPQDQJ3J6JQ3J6JQ3J6JQ3J6JQ3J6JQ',
      role: 'USER' as const,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });

    // Mock successful API response
    const mockDashboardData = {
      stats: { totalXp: 100, level: 2, questsCompleted: 5 },
      activeQuests: [],
      recentSubmissions: [],
      earningsHistory: [],
      badges: [],
    };

    mockFetchDashboardData.mockResolvedValue(mockDashboardData);

    // Import and render the hook
    const { result, waitForNextUpdate } = renderHook(() => useUserStats());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the async operation to complete
    await waitForNextUpdate();

    // Should call fetchDashboardData with user address
    expect(mockFetchDashboardData).toHaveBeenCalledWith(mockUser.stellarAddress);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.stats).toEqual(mockDashboardData.stats);
  });

  test('should handle API errors gracefully', async () => {
    // Mock authenticated user
    const mockUser = {
      stellarAddress: 'GD5DJ3D6KQW3YVQHDYRJZKYPQDQJ3J6JQ3J6JQ3J6JQ3J6JQ3J6JQ',
      role: 'USER' as const,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });

    // Mock API error
    const errorMessage = 'Failed to fetch dashboard data';
    mockFetchDashboardData.mockRejectedValue(new Error(errorMessage));

    // Import and render the hook
    const { result, waitForNextUpdate } = renderHook(() => useUserStats());

    // Wait for the async operation to complete
    await waitForNextUpdate();

    // Should handle error
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.stats).toBe(null);
  });

  test('should refetch data when refetch is called', async () => {
    // Mock authenticated user
    const mockUser = {
      stellarAddress: 'GD5DJ3D6KQW3YVQHDYRJZKYPQDQJ3J6JQ3J6JQ3J6JQ3J6JQ3J6JQ',
      role: 'USER' as const,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });

    // Mock successful API response
    const mockDashboardData = {
      stats: { totalXp: 100, level: 2, questsCompleted: 5 },
      activeQuests: [],
      recentSubmissions: [],
      earningsHistory: [],
      badges: [],
    };

    mockFetchDashboardData.mockResolvedValue(mockDashboardData);

    // Import and render the hook
    const { result, waitForNextUpdate } = renderHook(() => useUserStats());

    // Wait for initial load
    await waitForNextUpdate();

    // Clear the mock to test refetch
    mockFetchDashboardData.mockClear();

    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });

    // Should call fetchDashboardData again with user address
    expect(mockFetchDashboardData).toHaveBeenCalledWith(mockUser.stellarAddress);
    expect(mockFetchDashboardData).toHaveBeenCalledTimes(1);
  });
});

// Helper function for testing React hooks
function renderHook<T>(hook: () => T) {
  let result: { current: T };
  let rerender: () => void;

  const TestComponent = () => {
    const [state, setState] = React.useState(() => hook());
    result = { current: state };
    rerender = () => setState(hook());
    return null;
  };

  React.act(() => {
    React.createElement(TestComponent);
  });

  return {
    result,
    waitForNextUpdate: () => Promise.resolve(),
    rerender: rerender!,
  };
}

// Helper for async actions
async function act<T>(callback: () => T): Promise<T> {
  return await callback();
}
