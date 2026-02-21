"use client";

import { useThemeContext } from "@/app/providers/ThemeProvider";

export function useTheme() {
  return useThemeContext();
}
