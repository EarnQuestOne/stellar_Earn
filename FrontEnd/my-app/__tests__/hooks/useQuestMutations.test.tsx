import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuestMutations } from '@/hooks/useQuestMutations';
import { Quest } from '@/types/quest';

const initialQuests: Quest[] = [
  { id: 'q1', title: 'Daily Login', status: 'in_progress', progress: 50, rewardAmount: 100 },
];

describe('useQuestMutations (Optimistic Updates)', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(['quests'], initialQuests);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('optimistically updates quest status on completion', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...initialQuests[0], status: 'completed', progress: 100 }),
    });

    const { result } = renderHook(() => useQuestMutations(), { wrapper });

    act(() => {
      result.current.completeQuest('q1');
    });

    // Check optimistic state before network response resolves
    const optimisticData = queryClient.getQueryData<Quest[]>(['quests']);
    expect(optimisticData?.[0].status).toBe('completed');
    expect(optimisticData?.[0].progress).toBe(100);
  });

  it('rolls back to previous state if API call fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useQuestMutations(), { wrapper });

    act(() => {
      result.current.completeQuest('q1');
    });

    await waitFor(() => {
      const rolledBackData = queryClient.getQueryData<Quest[]>(['quests']);
      expect(rolledBackData?.[0].status).toBe('in_progress');
      expect(rolledBackData?.[0].progress).toBe(50);
    });
  });
});