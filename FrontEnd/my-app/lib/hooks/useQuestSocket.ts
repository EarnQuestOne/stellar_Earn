'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { env } from '@/lib/config/env';

export interface QuestUpdatedEvent {
  questId: string;
}

export interface SubmissionStatusEvent {
  submissionId: string;
  questId?: string;
  userId?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Under Review';
  rejectionReason?: string;
  verifierId?: string;
}

export interface UseQuestSocketOptions {
  questId: string | undefined;
  onQuestUpdated?: (payload: QuestUpdatedEvent) => void;
  onSubmissionUpdated?: (payload: SubmissionStatusEvent) => void;
}

type QuestChannel = 'quest:updated' | 'submission:status';

// Shared, singleton Socket.IO instance
let sharedSocket: Socket | null = null;
let activeHooksCount = 0;

// Centralized registries for callbacks to avoid maxListeners warnings and duplicate events
const questCallbackRegistry = new Map<string, Set<UseQuestSocketOptions>>();
const globalCallbackRegistry = new Set<UseQuestSocketOptions>();
const hookChannelInterest = new WeakMap<
  UseQuestSocketOptions,
  Set<QuestChannel>
>();

/** Per-quest listener counts so we subscribe only to channels in use. */
const questChannelCounts = new Map<string, Map<QuestChannel, number>>();

const pendingQuestUpdates = new Set<string>();
const pendingSubmissionById = new Map<string, SubmissionStatusEvent>();
const pendingGlobalSubmissionById = new Map<string, SubmissionStatusEvent>();
let coalesceFrameId: number | null = null;

export function channelsForSocketOptions(
  options: Pick<
    UseQuestSocketOptions,
    'onQuestUpdated' | 'onSubmissionUpdated'
  >
): QuestChannel[] {
  const channels: QuestChannel[] = [];
  if (options.onQuestUpdated) {
    channels.push('quest:updated');
  }
  if (options.onSubmissionUpdated) {
    channels.push('submission:status');
  }
  return channels;
}

function getChannelCounts(questId: string): Map<QuestChannel, number> {
  let counts = questChannelCounts.get(questId);
  if (!counts) {
    counts = new Map();
    questChannelCounts.set(questId, counts);
  }
  return counts;
}

function adjustChannelSubscription(
  socket: Socket,
  questId: string,
  channel: QuestChannel,
  delta: number
): void {
  const counts = getChannelCounts(questId);
  const prev = counts.get(channel) ?? 0;
  const next = Math.max(0, prev + delta);
  if (next === 0) {
    counts.delete(channel);
  } else {
    counts.set(channel, next);
  }
  if (counts.size === 0) {
    questChannelCounts.delete(questId);
  }

  if (!socket.connected) {
    return;
  }
  if (prev === 0 && next > 0) {
    socket.emit('subscribe', { channel, resourceId: questId });
  } else if (prev > 0 && next === 0) {
    socket.emit('unsubscribe', { channel, resourceId: questId });
  }
}

export function applyChannelSetChange(
  socket: Socket,
  questId: string,
  previous: Set<QuestChannel>,
  next: Set<QuestChannel>
): void {
  for (const channel of previous) {
    if (!next.has(channel)) {
      adjustChannelSubscription(socket, questId, channel, -1);
    }
  }
  for (const channel of next) {
    if (!previous.has(channel)) {
      adjustChannelSubscription(socket, questId, channel, 1);
    }
  }
}

function resubscribeAllChannels(socket: Socket): void {
  for (const [questId, counts] of questChannelCounts) {
    for (const [channel, count] of counts) {
      if (count > 0) {
        socket.emit('subscribe', { channel, resourceId: questId });
      }
    }
  }
}

export function flushCoalescedSocketUpdates(): void {
  coalesceFrameId = null;

  for (const questId of pendingQuestUpdates) {
    const registries = questCallbackRegistry.get(questId);
    if (registries) {
      registries.forEach((options) => {
        if (hookChannelInterest.get(options)?.has('quest:updated')) {
          options.onQuestUpdated?.({ questId });
        }
      });
    }
  }
  pendingQuestUpdates.clear();

  for (const event of pendingSubmissionById.values()) {
    const questId = event.questId;
    if (questId) {
      const registries = questCallbackRegistry.get(questId);
      if (registries) {
        registries.forEach((options) => {
          if (hookChannelInterest.get(options)?.has('submission:status')) {
            options.onSubmissionUpdated?.(event);
          }
        });
      }
    }
  }
  pendingSubmissionById.clear();

  for (const event of pendingGlobalSubmissionById.values()) {
    globalCallbackRegistry.forEach((options) => {
      if (hookChannelInterest.get(options)?.has('submission:status')) {
        options.onSubmissionUpdated?.(event);
      }
    });
  }
  pendingGlobalSubmissionById.clear();
}

function scheduleCoalescedFlush(): void {
  if (coalesceFrameId !== null) {
    return;
  }
  coalesceFrameId = requestAnimationFrame(flushCoalescedSocketUpdates);
}

function enqueueQuestUpdate(questId: string): void {
  pendingQuestUpdates.add(questId);
  scheduleCoalescedFlush();
}

function enqueueQuestSubmissionUpdate(event: SubmissionStatusEvent): void {
  pendingSubmissionById.set(event.submissionId, event);
  scheduleCoalescedFlush();
}

function enqueueGlobalSubmissionUpdate(event: SubmissionStatusEvent): void {
  pendingGlobalSubmissionById.set(event.submissionId, event);
  scheduleCoalescedFlush();
}

function getSharedSocket(): Socket {
  if (!sharedSocket) {
    const apiBaseUrl = env.apiBaseUrl();

    // Auth is handled via httpOnly cookies sent automatically with the handshake
    sharedSocket = io(apiBaseUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    setupSharedSocketListeners(sharedSocket);
  }
  return sharedSocket;
}

function setupSharedSocketListeners(socket: Socket) {
  socket.on('connect', () => {
    resubscribeAllChannels(socket);
  });

  socket.on('quest:updated', (payload: unknown) => {
    const data = (payload as { data?: { questId?: string } })?.data;
    const questId = data?.questId;
    if (questId) {
      enqueueQuestUpdate(questId);
    }
  });

  socket.on('submission:received', (payload: unknown) => {
    const data = (
      payload as {
        data?: { submissionId: string; questId: string; userId: string };
      }
    )?.data;
    const questId = data?.questId;
    if (questId && data) {
      enqueueQuestSubmissionUpdate({
        submissionId: data.submissionId,
        questId: data.questId,
        userId: data.userId,
        status: 'Pending',
      });
    }
  });

  socket.on('submission:approved', (payload: unknown) => {
    const data = (
      payload as {
        data?: { submissionId: string; questId: string; verifierId: string };
      }
    )?.data;
    const questId = data?.questId;
    if (questId && data) {
      enqueueQuestSubmissionUpdate({
        submissionId: data.submissionId,
        questId: data.questId,
        verifierId: data.verifierId,
        status: 'Approved',
      });
    }
  });

  socket.on('submission:rejected', (payload: unknown) => {
    const data = (
      payload as { data?: { submissionId: string; reason?: string } }
    )?.data;
    if (data?.submissionId) {
      enqueueGlobalSubmissionUpdate({
        submissionId: data.submissionId,
        status: 'Rejected',
        rejectionReason: data.reason,
      });
    }
  });
}

export function useQuestSocket(options: UseQuestSocketOptions): {
  isConnected: boolean;
  error: Error | null;
} {
  const { questId } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const callbacksRef = useRef<UseQuestSocketOptions>(options);
  const activeChannelsRef = useRef<Set<QuestChannel>>(new Set());
  const proxyRef = useRef<UseQuestSocketOptions | null>(null);

  const syncRegistration = (nextOptions: UseQuestSocketOptions) => {
    callbacksRef.current = nextOptions;
    const proxy = proxyRef.current;
    if (!proxy || !questId) {
      return;
    }
    const socket = getSharedSocket();
    const next = new Set(channelsForSocketOptions(nextOptions));
    hookChannelInterest.set(proxy, next);
    applyChannelSetChange(socket, questId, activeChannelsRef.current, next);
    activeChannelsRef.current = next;
    if (nextOptions.onSubmissionUpdated) {
      globalCallbackRegistry.add(proxy);
    } else {
      globalCallbackRegistry.delete(proxy);
    }
  };

  useEffect(() => {
    syncRegistration(options);
  }, [options, questId]);

  useEffect(() => {
    if (!questId) {
      return;
    }

    const socket = getSharedSocket();
    activeHooksCount++;

    const proxyOptions: UseQuestSocketOptions = {
      questId,
      onQuestUpdated: (data) => callbacksRef.current.onQuestUpdated?.(data),
      onSubmissionUpdated: (data) =>
        callbacksRef.current.onSubmissionUpdated?.(data),
    };
    proxyRef.current = proxyOptions;

    let callbacksSet = questCallbackRegistry.get(questId);
    if (!callbacksSet) {
      callbacksSet = new Set();
      questCallbackRegistry.set(questId, callbacksSet);
    }
    callbacksSet.add(proxyOptions);
    syncRegistration(options);

    if (!socket.connected) {
      socket.connect();
    }

    const handleLocalConnect = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleLocalDisconnect = () => {
      setIsConnected(false);
    };

    const handleLocalError = (err: unknown) => {
      setError(err instanceof Error ? err : new Error(String(err)));
    };

    socket.on('connect', handleLocalConnect);
    socket.on('disconnect', handleLocalDisconnect);
    socket.on('connect_error', handleLocalError);
    socket.on('error', handleLocalError);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      activeHooksCount--;

      applyChannelSetChange(
        socket,
        questId,
        activeChannelsRef.current,
        new Set()
      );
      activeChannelsRef.current = new Set();

      const callbacks = questCallbackRegistry.get(questId);
      if (callbacks) {
        callbacks.delete(proxyOptions);
        if (callbacks.size === 0) {
          questCallbackRegistry.delete(questId);
        }
      }
      globalCallbackRegistry.delete(proxyOptions);
      proxyRef.current = null;

      socket.off('connect', handleLocalConnect);
      socket.off('disconnect', handleLocalDisconnect);
      socket.off('connect_error', handleLocalError);
      socket.off('error', handleLocalError);

      if (activeHooksCount === 0) {
        socket.disconnect();
        sharedSocket = null;
        questChannelCounts.clear();
        pendingQuestUpdates.clear();
        pendingSubmissionById.clear();
        pendingGlobalSubmissionById.clear();
        if (coalesceFrameId !== null) {
          cancelAnimationFrame(coalesceFrameId);
          coalesceFrameId = null;
        }
      }
    };
  }, [questId]);

  return { isConnected, error };
}
