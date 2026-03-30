"use client";

import React from "react";
import { AuthProvider as AuthContextProvider } from "@/context/AuthContext";

/**
 * Application-level Auth Provider that wraps the entire app.
 * Separated from the context for cleaner structure in app/layout.tsx.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContextProvider>
      {children}
    </AuthContextProvider>
  );
}
