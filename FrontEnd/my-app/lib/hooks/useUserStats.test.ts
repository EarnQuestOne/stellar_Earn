import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/context/AuthContext";
import { fetchDashboardData } from "@/lib/api/user";

import { useUserStats } from "./useUserStats";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api/user", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/user")>(
    "@/lib/api/user",
  );

  return {
    ...actual,
    fetchDashboardData: vi.fn(),
  };
});

const mockUseAuth = vi.mocked(useAuth);
const mockFetchDashboardData = vi.mocked(fetchDashboardData);

const mockUser = {
  stellarAddress:
    "GD5DJ3D6KQW3YVQHDYRJZKYPQDQJ3J6JQ3J6JQ3J6JQ3J6JQ3J6JQ",
  role: "USER" as const,
};

const mockDashboardData = {
  stats: { totalXp: 100, level: 2, questsCompleted: 5 },
  activeQuests: [],
  recentSubmissions: [],
  earningsHistory: [],
  badges: [],
};

describe("useUserStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips dashboard fetching when there is no authenticated wallet", async () => {
    mockUseAuth.mockReturnValue({ user: null } as never);

    const { result } = renderHook(() => useUserStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchDashboardData).not.toHaveBeenCalled();
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("fetches dashboard data with the authenticated stellar address", async () => {
    mockUseAuth.mockReturnValue({ user: mockUser } as never);
    mockFetchDashboardData.mockResolvedValue(mockDashboardData as never);

    const { result } = renderHook(() => useUserStats());

    await waitFor(() => {
      expect(mockFetchDashboardData).toHaveBeenCalledWith(mockUser.stellarAddress);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockDashboardData.stats);
    expect(result.current.activeQuests).toEqual(mockDashboardData.activeQuests);
    expect(result.current.recentSubmissions).toEqual(
      mockDashboardData.recentSubmissions,
    );
  });

  it("surfaces API failures without leaving the hook loading forever", async () => {
    mockUseAuth.mockReturnValue({ user: mockUser } as never);
    mockFetchDashboardData.mockRejectedValue(
      new Error("Failed to fetch dashboard data"),
    );

    const { result } = renderHook(() => useUserStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch dashboard data");
    expect(result.current.stats).toBeNull();
  });

  it("refetches dashboard data on demand", async () => {
    mockUseAuth.mockReturnValue({ user: mockUser } as never);
    mockFetchDashboardData.mockResolvedValue(mockDashboardData as never);

    const { result } = renderHook(() => useUserStats());

    await waitFor(() => {
      expect(mockFetchDashboardData).toHaveBeenCalledTimes(1);
    });

    mockFetchDashboardData.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockFetchDashboardData).toHaveBeenCalledTimes(1);
    expect(mockFetchDashboardData).toHaveBeenCalledWith(mockUser.stellarAddress);
  });
});
