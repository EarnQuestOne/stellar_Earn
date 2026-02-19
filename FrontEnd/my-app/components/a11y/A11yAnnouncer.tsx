'use client';

import { useEffect, useState, ReactNode } from 'react';
import { createContext, useContext } from 'react';

interface A11yAnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const A11yAnnouncerContext = createContext<A11yAnnouncerContextType | null>(
  null
);

/**
 * Hook to use the A11yAnnouncer context
 */
export function useA11yAnnouncer() {
  const context = useContext(A11yAnnouncerContext);
  if (!context) {
    throw new Error(
      'useA11yAnnouncer must be used within an A11yAnnouncerProvider'
    );
  }
  return context;
}

interface A11yAnnouncerProviderProps {
  children: ReactNode;
}

/**
 * A11yAnnouncerProvider component
 * 
 * Provides a context for announcing messages to screen readers.
 * Use the useA11yAnnouncer hook to announce dynamic content changes.
 */
export function A11yAnnouncerProvider({
  children,
}: A11yAnnouncerProviderProps) {
  const [announcements, setAnnouncements] = useState<
    Array<{ id: number; message: string; priority: 'polite' | 'assertive' }>
  >([]);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const id = Date.now();
    setAnnouncements((prev) => [...prev, { id, message, priority }]);

    // Remove announcement after it's been read (screen readers typically take 1-2 seconds)
    setTimeout(() => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }, 3000);
  };

  return (
    <A11yAnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {announcements
          .filter((a) => a.priority === 'polite')
          .map((a) => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {announcements
          .filter((a) => a.priority === 'assertive')
          .map((a) => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
    </A11yAnnouncerContext.Provider>
  );
}

/**
 * A11yAnnouncer component (standalone version)
 * 
 * Standalone component for announcing messages without context.
 * Prefer using A11yAnnouncerProvider + useA11yAnnouncer hook for better integration.
 */
export function A11yAnnouncer({
  message,
  priority = 'polite',
}: {
  message: string;
  priority?: 'polite' | 'assertive';
}) {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
    >
      {message}
    </div>
  );
}
