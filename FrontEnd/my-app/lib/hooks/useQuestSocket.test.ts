import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { io } from 'socket.io-client';

// Mock dependency imports
vi.mock('@/lib/config/env', () => ({
  env: {
    apiBaseUrl: vi.fn(() => 'http://localhost:3000'),
  },
}));

const eventHandlers = new Map<string, (...args: unknown[]) => void>();

// Create a mock socket object
const mockSocket = {
  connect: vi.fn().mockReturnThis(),
  disconnect: vi.fn().mockReturnThis(),
  emit: vi.fn().mockReturnThis(),
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    eventHandlers.set(event, handler);
    return mockSocket;
  }),
  off: vi.fn().mockReturnThis(),
  connected: false,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('useQuestSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers.clear();
    mockSocket.connected = false;
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      }
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function loadHookModule() {
    return import('./useQuestSocket');
  }

  it('establishes a connection with withCredentials (cookie-based auth)', async () => {
    const { useQuestSocket } = await loadHookModule();
    renderHook(() =>
      useQuestSocket({
        questId: 'quest-123',
      })
    );

    expect(io).toHaveBeenCalledWith(
      'http://localhost:3000',
      expect.objectContaining({
        withCredentials: true,
        transports: ['websocket', 'polling'],
      })
    );
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('subscribes only to channels required by callbacks', async () => {
    mockSocket.connected = true;
    const { useQuestSocket } = await loadHookModule();

    renderHook(() =>
      useQuestSocket({
        questId: 'quest-123',
        onQuestUpdated: vi.fn(),
      })
    );

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      channel: 'quest:updated',
      resourceId: 'quest-123',
    });
    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'subscribe',
      expect.objectContaining({ channel: 'submission:status' })
    );
  });

  it('subscribes to submission channel when submission handler is provided', async () => {
    mockSocket.connected = true;
    const { useQuestSocket } = await loadHookModule();

    renderHook(() =>
      useQuestSocket({
        questId: 'quest-123',
        onSubmissionUpdated: vi.fn(),
      })
    );

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      channel: 'submission:status',
      resourceId: 'quest-123',
    });
    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'subscribe',
      expect.objectContaining({ channel: 'quest:updated' })
    );
  });

  it('unsubscribes and cleans up on unmount', async () => {
    mockSocket.connected = true;
    const { useQuestSocket } = await loadHookModule();

    const { unmount } = renderHook(() =>
      useQuestSocket({
        questId: 'quest-123',
        onQuestUpdated: vi.fn(),
      })
    );

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe', {
      channel: 'quest:updated',
      resourceId: 'quest-123',
    });
    expect(mockSocket.off).toHaveBeenCalled();
  });

  it('does not connect or subscribe if questId is undefined', async () => {
    const { useQuestSocket } = await loadHookModule();
    renderHook(() =>
      useQuestSocket({
        questId: undefined,
      })
    );

    expect(mockSocket.connect).not.toHaveBeenCalled();
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('coalesces rapid quest:updated events into one callback per frame', async () => {
    mockSocket.connected = true;
    const { useQuestSocket } = await loadHookModule();
    const onQuestUpdated = vi.fn();

    renderHook(() =>
      useQuestSocket({
        questId: 'quest-123',
        onQuestUpdated,
      })
    );

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    const questHandler = eventHandlers.get('quest:updated');
    expect(questHandler).toBeDefined();

    act(() => {
      questHandler?.({ data: { questId: 'quest-123' } });
      questHandler?.({ data: { questId: 'quest-123' } });
      questHandler?.({ data: { questId: 'quest-123' } });
    });

    expect(onQuestUpdated).not.toHaveBeenCalled();

    act(() => {
      rafCallbacks.forEach((cb) => cb(0));
    });

    expect(onQuestUpdated).toHaveBeenCalledTimes(1);
    expect(onQuestUpdated).toHaveBeenCalledWith({ questId: 'quest-123' });
  });
});

describe('useQuestSocket channel helpers', () => {
  it('channelsForSocketOptions returns only active listener channels', async () => {
    const { channelsForSocketOptions } = await import('./useQuestSocket');
    expect(
      channelsForSocketOptions({
        onQuestUpdated: vi.fn(),
      })
    ).toEqual(['quest:updated']);
    expect(
      channelsForSocketOptions({
        onSubmissionUpdated: vi.fn(),
      })
    ).toEqual(['submission:status']);
    expect(channelsForSocketOptions({})).toEqual([]);
  });
});
