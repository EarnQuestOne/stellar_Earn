'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { tokenManager } from '@/lib/api/client';
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

// Shared, singleton Socket.IO instance
let sharedSocket: Socket | null = null;
let activeHooksCount = 0;

// Centralized registries for callbacks to avoid maxListeners warnings and duplicate events
const questCallbackRegistry = new Map<string, Set<UseQuestSocketOptions>>();
const globalCallbackRegistry = new Set<UseQuestSocketOptions>();

function getSharedSocket(): Socket {
  if (!sharedSocket) {
    const apiBaseUrl = env.apiBaseUrl();
    const token = tokenManager.getAccessToken();

    sharedSocket = io(apiBaseUrl, {
      auth: {
        token: token ? `Bearer ${token}` : undefined,
      },
      transports: ['websocket', 'polling'],
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
  // Automatically subscribe to active rooms on reconnect
  socket.on('connect', () => {
    for (const questId of questCallbackRegistry.keys()) {
      socket.emit('subscribe', {
        channel: 'quest:updated',
        resourceId: questId,
      });
      socket.emit('subscribe', {
        channel: 'submission:status',
        resourceId: questId,
      });
    }
  });

  socket.on('quest:updated', (payload: unknown) => {
    const data = (payload as { data?: { questId?: string } })?.data;
    const questId = data?.questId;
    if (questId) {
      const registries = questCallbackRegistry.get(questId);
      if (registries) {
        registries.forEach((options) => {
          options.onQuestUpdated?.({ questId });
        });
      }
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
      const registries = questCallbackRegistry.get(questId);
      if (registries) {
        registries.forEach((options) => {
          options.onSubmissionUpdated?.({
            submissionId: data.submissionId,
            questId: data.questId,
            userId: data.userId,
            status: 'Pending',
          });
        });
      }
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
      const registries = questCallbackRegistry.get(questId);
      if (registries) {
        registries.forEach((options) => {
          options.onSubmissionUpdated?.({
            submissionId: data.submissionId,
            questId: data.questId,
            verifierId: data.verifierId,
            status: 'Approved',
          });
        });
      }
    }
  });

  socket.on('submission:rejected', (payload: unknown) => {
    const data = (
      payload as { data?: { submissionId: string; reason?: string } }
    )?.data;
    if (data?.submissionId) {
      const submissionEvent: SubmissionStatusEvent = {
        submissionId: data.submissionId,
        status: 'Rejected',
        rejectionReason: data.reason,
      };

      globalCallbackRegistry.forEach((options) => {
        options.onSubmissionUpdated?.(submissionEvent);
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

  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

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

    let callbacksSet = questCallbackRegistry.get(questId);
    if (!callbacksSet) {
      callbacksSet = new Set();
      questCallbackRegistry.set(questId, callbacksSet);
    }
    callbacksSet.add(proxyOptions);
    globalCallbackRegistry.add(proxyOptions);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit('subscribe', {
        channel: 'quest:updated',
        resourceId: questId,
      });
      socket.emit('subscribe', {
        channel: 'submission:status',
        resourceId: questId,
      });
    } else {
      const token = tokenManager.getAccessToken();
      socket.auth = {
        token: token ? `Bearer ${token}` : undefined,
      };
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

      const callbacks = questCallbackRegistry.get(questId);
      if (callbacks) {
        callbacks.delete(proxyOptions);
        if (callbacks.size === 0) {
          questCallbackRegistry.delete(questId);
          if (socket.connected) {
            socket.emit('unsubscribe', {
              channel: 'quest:updated',
              resourceId: questId,
            });
            socket.emit('unsubscribe', {
              channel: 'submission:status',
              resourceId: questId,
            });
          }
        }
      }
      globalCallbackRegistry.delete(proxyOptions);

      socket.off('connect', handleLocalConnect);
      socket.off('disconnect', handleLocalDisconnect);
      socket.off('connect_error', handleLocalError);
      socket.off('error', handleLocalError);

      if (activeHooksCount === 0) {
        socket.disconnect();
        sharedSocket = null;
      }
    };
  }, [questId]);

  return { isConnected, error };
}
