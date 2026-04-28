import { StateCreator } from 'zustand';

export interface UISlice {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  modal: string | null;

  toggleSidebar: () => void;
  setTheme: (theme: UISlice['theme']) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  theme: 'light',
  sidebarOpen: false,
  modal: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setTheme: (theme) => set({ theme }),

  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
});
