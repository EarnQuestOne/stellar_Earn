import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuestSocket } from './useQuestSocket';
import { io } from 'socket.io-client';

// Mock dependency imports
vi.mock('@/lib/config/env', () => ({
  env: {
    apiBaseUrl: vi.fn(() => 'http://localhost:3000'),
  },
}));

// Create a mock socket object
const mockSocket = {
  connect: vi.fn().mockReturnThis(),
  disconnect: vi.fn().mockReturnThis(),
  emit: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  connected: false,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('useQuestSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('establishes a connection with withCredentials (cookie-based auth)', () => {
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

  it('subscribes to channels on connect', () => {
    mockSocket.connected = true;

    renderHook(() =>
      useQuestSocket({
        questId: 'quest-123',
      })
    );

    // Should emit subscribe for quest:updated and submission:status
    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      channel: 'quest:updated',
      resourceId: 'quest-123',
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      channel: 'submission:status',
      resourceId: 'quest-123',
    });
  });

  it('unsubscribes and cleans up on unmount', () => {
    mockSocket.connected = true;

    const { unmount } = renderHook(() =>
      useQuestSocket({
        questId: 'quest-123',
      })
    );

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe', {
      channel: 'quest:updated',
      resourceId: 'quest-123',
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe', {
      channel: 'submission:status',
      resourceId: 'quest-123',
    });
    expect(mockSocket.off).toHaveBeenCalled();
  });

  it('does not connect or subscribe if questId is undefined', () => {
    renderHook(() =>
      useQuestSocket({
        questId: undefined,
      })
    );

    expect(mockSocket.connect).not.toHaveBeenCalled();
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });
});
