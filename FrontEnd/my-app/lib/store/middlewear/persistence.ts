import { createJSONStorage, StateStorage } from 'zustand/middleware';

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const storage = createJSONStorage(() =>
  typeof window !== 'undefined' ? localStorage : (noopStorage as Storage)
);
