'use client';

import { useEffect, useRef, useState } from 'react';
import { LevelBadge } from '@/components/reputation/LevelBadge';
import { FocusTrap } from '@/components/a11y/FocusTrap';

/**
 * Props for the level-up celebration modal.
 */
interface LevelUpModalProps {
  isOpen: boolean;
  newLevel: number;
  onClose: () => void;
}

// Confetti particle component
function ConfettiParticle({
  delay,
  duration,
  left,
}: {
  delay: number;
  duration: number;
  left: string;
}) {
  const colors = [
    '#089ec3',
    '#0ab8d4',
    '#fbbf24',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <div
      className="absolute w-2 h-2 rounded-full"
      style={{
        left,
        backgroundColor: color,
        animation: `confetti-fall ${duration}s ease-out ${delay}s forwards`,
      }}
    />
  );
}

/**
 * Shows a celebratory level-up modal with confetti animation.
 */
export function LevelUpModal({ isOpen, newLevel, onClose }: LevelUpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [confettiParticles] = useState(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      left: `${Math.random() * 100}%`,
    }));
  });

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current =
        document.activeElement as HTMLElement | null;

      // Focus the modal
      modalRef.current?.focus();

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      // Restore focus when modal closes
      previousActiveElement.current?.focus();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Confetti Container */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {confettiParticles.map((particle) => (
          <ConfettiParticle
            key={particle.id}
            delay={particle.delay}
            duration={particle.duration}
            left={particle.left}
          />
        ))}
      </div>

      {/* Modal Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
      >
        <FocusTrap active={isOpen}>
          <div
            ref={modalRef}
            className="relative w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-zinc-900 animate-modal-entrance"
            tabIndex={-1}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#089ec3] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              aria-label="Close modal"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Content */}
            <div className="px-8 py-12 text-center">
              {/* Level Up Text */}
              <div className="mb-6 animate-bounce">
                <h2
                  id="level-up-title"
                  className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2"
                  style={{ color: '#089ec3' }}
                >
                  Level Up!
                </h2>
              </div>

              {/* Level Badge */}
              <div className="flex justify-center mb-6">
                <LevelBadge level={newLevel} size="lg" showGlow={true} />
              </div>

              {/* Level Number */}
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                You've reached Level {newLevel}!
              </p>

              {/* Benefits */}
              <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Keep completing quests to unlock more rewards and achievements.
                </p>
              </div>
            </div>
          </div>
        </FocusTrap>
      </div>
    </>
  );
}
