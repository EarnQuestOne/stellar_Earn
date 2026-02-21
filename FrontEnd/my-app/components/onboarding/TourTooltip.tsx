"use client";

import { useEffect, useMemo, useState } from "react";
import type { TourTooltipPlacement } from "@/lib/utils/onboarding";

interface TourTooltipProps {
  targetSelector: string;
  title: string;
  description: string;
  placement?: TourTooltipPlacement;
}

interface TooltipPosition {
  top: number;
  left: number;
  spotlight: { top: number; left: number; width: number; height: number };
}

const OFFSET = 12;
const SPOTLIGHT_PADDING = 8;
const TOOLTIP_WIDTH = 320;

export function TourTooltip({
  targetSelector,
  title,
  description,
  placement = "bottom",
}: TourTooltipProps) {
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  useEffect(() => {
    const calculatePosition = () => {
      const targetElement = document.querySelector(targetSelector);

      if (!targetElement) {
        setPosition(null);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      const spotlight = {
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      };

      let top = rect.bottom + OFFSET;
      let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;

      if (placement === "top") {
        top = rect.top - OFFSET;
      } else if (placement === "left") {
        top = rect.top + rect.height / 2;
        left = rect.left - TOOLTIP_WIDTH - OFFSET;
      } else if (placement === "right") {
        top = rect.top + rect.height / 2;
        left = rect.right + OFFSET;
      }

      left = Math.max(16, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 16));
      top = Math.max(16, Math.min(top, window.innerHeight - 120));

      setPosition({ top, left, spotlight });
    };

    calculatePosition();
    window.addEventListener("resize", calculatePosition);
    window.addEventListener("scroll", calculatePosition, true);

    return () => {
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("scroll", calculatePosition, true);
    };
  }, [placement, targetSelector]);

  const transform = useMemo(() => {
    if (placement === "top") {
      return "translateY(-100%)";
    }
    if (placement === "left" || placement === "right") {
      return "translateY(-50%)";
    }
    return "translateY(0)";
  }, [placement]);

  if (!position) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40 bg-black/45" />
      <div
        className="pointer-events-none fixed z-50 rounded-lg border-2 border-[#089ec3] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-all duration-200"
        style={{
          top: position.spotlight.top,
          left: position.spotlight.left,
          width: position.spotlight.width,
          height: position.spotlight.height,
        }}
      />
      <div
        className="pointer-events-none fixed z-50 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        style={{
          top: position.top,
          left: position.left,
          transform,
        }}
      >
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {description}
        </p>
      </div>
    </>
  );
}
