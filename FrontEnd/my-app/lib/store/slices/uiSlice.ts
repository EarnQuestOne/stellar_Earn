import { StateCreator } from 'zustand';

export interface UISlice {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  modal: string | null;
  isOnline: boolean;
  /** Whether the backend API base URL is currently reachable. */
  isApiReachable: boolean;
  hasRetryableError: boolean;
  retryFunction: (() => Promise<void>) | null;

  toggleSidebar: () => void;
  setTheme: (theme: UISlice['theme']) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setApiReachable: (reachable: boolean) => void;
  setRetryableError: (hasError: boolean, retryFn?: () => Promise<void>) => void;
  clearRetryableError: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  theme: 'light',
  sidebarOpen: false,
  modal: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isApiReachable: true,
  hasRetryableError: false,
  retryFunction: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setTheme: (theme) => set({ theme }),

  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),

  setOnlineStatus: (isOnline) => set({ isOnline }),

  setApiReachable: (isApiReachable) => set({ isApiReachable }),

  setRetryableError: (hasError, retryFn) =>
    set({
      hasRetryableError: hasError,
      retryFunction: retryFn || null,
    }),

  clearRetryableError: () =>
    set({
      hasRetryableError: false,
      retryFunction: null,
    }),
});
