import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { createUserSlice, UserSlice } from './slices/userSlice';
import { createQuestSlice, QuestSlice } from './slices/questSlice';
import {
  createSubmissionSlice,
  SubmissionSlice,
} from './slices/submissionSlice';
import {
  createNotificationSlice,
  NotificationSlice,
} from './slices/notificationSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createWalletSlice, WalletSlice } from './slices/walletSlice';
import { storage } from './middlewear/persistence';

export type StoreState = UserSlice &
  QuestSlice &
  SubmissionSlice &
  NotificationSlice &
  UISlice &
  WalletSlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createUserSlice(...a),
        ...createQuestSlice(...a),
        ...createSubmissionSlice(...a),
        ...createNotificationSlice(...a),
        ...createUISlice(...a),
        ...createWalletSlice(...a),
      }),
      {
        name: 'stellar-earn-store',
        storage,
        partialize: (state) => ({
          // only persist what needs to survive page reload
          theme: state.theme,
          address: state.address,
          isConnected: state.isConnected,
          selectedWalletId: state.selectedWalletId,
          notifications: state.notifications,
          notificationSettings: state.notificationSettings,
          unreadCount: state.unreadCount,
        }),
      }
    ),
    { name: 'StellarEarnStore' }
  )
);

// ─── Typed selectors ────────────────────────────────────────────────
export const selectUser = (s: StoreState) => s.profile;
export const selectWallet = (s: StoreState) => ({
  address: s.address,
  isConnected: s.isConnected,
  isConnecting: s.isConnecting,
  selectedWalletId: s.selectedWalletId,
});
export const selectQuests = (s: StoreState) => s.quests;
export const selectQuestFilters = (s: StoreState) => s.filters;
export const selectSubmissions = (s: StoreState) => s.submissions;
export const selectNotifications = (s: StoreState) => s.notifications;
export const selectUnreadCount = (s: StoreState) => s.unreadCount;
export const selectTheme = (s: StoreState) => s.theme;
export const selectModal = (s: StoreState) => s.modal;
