'use client';

import React, { useEffect, useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils/cn';

/**
 * OptimizedImage
 * ─────────────────────────────────────────────────────────────────────────────
 * Standardised Next.js `Image` wrapper used across the application. Always
 * prefer this component over a raw `<img>` element or a direct `next/image`
 * import so every image gets lazy loading (except when marked `priority`),
 * a blurred-up placeholder, sensible load animations, a graceful fallback,
 * and consistent layout behaviour.
 *
 * Why a wrapper?
 *  • Forces `alt`, `width`, and `height` so Cumulative Layout Shift (CLS)
 *    is zero.
 *  • Flips `loading` to `"eager"` when `priority` is set. **Use `priority`
 *    for above-the-fold images** — logo, hero banner, featured quest cover,
 *    profile header avatar — to opt them out of lazy loading and pre-load
 *    them so they become the LCP element immediately.
 *  • Adds `placeholder="blur"` plus a tiny default `blurDataURL` so the
 *    image paints a low-res blur instantly, improving perceived performance
 *    and reducing layout shift.
 *  • Provides a `fallbackSrc` (defaults to `/placeholder-image.png`) for
 *    when the original source fails to load.
 *
 * ESLint enforcement
 *  The `jsx-a11y/no-img-element` rule is configured at the project level to
 *  ban raw `<img>` tags in TSX. Use this component everywhere instead.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `sizes` prop guidance
 * ─────────────────────────────────────────────────────────────────────────────
 * The `sizes` prop is forwarded to the underlying `next/image` and tells the
 * browser which image variant to download for the current viewport. Always
 * provide it so we don't ship the largest variant to phones.
 *
 * Pick the descriptor that matches the rendered width at each breakpoint:
 *   • Full-width banner / hero          → `"100vw"`
 *   • 2-up grid (≥md becomes full)      → `"(max-width: 768px) 100vw, 50vw"`
 *   • 3-up grid (≥lg becomes full)      → `"(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"`
 *   • 4-up grid                         → `"(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"`
 *   • Fixed sidebar / card row          → `"200px"`
 *   • Small avatar (header, list item)  → `"40px"`
 *
 * Tip: the descriptor is the *rendered width*, not the breakpoint width.
 * Goal — match the rendered fraction of the viewport at each breakpoint:
 * over-promising wastes bytes, under-promising causes blurry up-scaling.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Performance checklist
 * ─────────────────────────────────────────────────────────────────────────────
 *   ✓ Set `priority` on above-the-fold images only (one or two per page).
 *   ✓ Always set `alt`. Pass `alt=""` only for purely decorative graphics.
 *   ✓ Provide both `width` and `height`, or use `fill` with a sized parent
 *     container.
 *   ✓ Always set `sizes` so mobile users download a smaller variant.
 *   ✓ Let `placeholder="blur"` stay enabled — it prevents empty boxes
 *     during load and removes residual layout shift.
 *
 * Usage:
 * ```tsx
 * <OptimizedImage
 *   src={quest.creator.avatarUrl}
 *   alt={`${quest.creator.name} avatar`}
 *   width={64}
 *   height={64}
 *   sizes="64px"
 * />
 * ```
 */
interface OptimizedImageProps extends Omit<ImageProps, 'onLoadingComplete'> {
  /**
   * Optional explicit aspect ratio to reserve layout space when the source
   * dimensions are not known ahead of time (for example, a preview generated
   * client-side). When width/height are provided, the wrapper derives the
   * ratio automatically.
   */
  aspectRatio?: string;
  /**
   * Extra classes applied to the wrapper element surrounding `<Image>`.
   * Useful for aspect-ratio containers or hover effects.
   */
  containerClassName?: string;
  /**
   * Image shown when `src` fails to download. Defaults to
   * `/placeholder-image.png`. Pass an empty string to render an empty box
   * on error.
   */
  fallbackSrc?: string;
  /**
   * Disable the default `placeholder="blur"` behaviour (for example when
   * `src` is an animated SVG or a remote asset you do not control).
   */
  disableBlurPlaceholder?: boolean;
}

// Tiny, generic 1×1 grey PNG. Shared across the site so we don't bloat the
// bundle with bespoke base64 strings per image.
const DEFAULT_BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  containerClassName,
  aspectRatio,
  fallbackSrc = '/placeholder-image.png',
  disableBlurPlaceholder = false,
  placeholder,
  blurDataURL,
  ...props
}) => {
  const [isLoading, setLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(src);

  // Reset local state when the parent passes a new `src` (e.g. avatar
  // edit, quest thumbnail change). Without this, swapping the prop after
  // mount leaves the loading animation and any prior fallback stuck.
  useEffect(() => {
    setImgSrc(src);
    setLoading(true);
  }, [src]);

  // Default to a blur placeholder unless the caller supplies their own
  // `placeholder` or opts out via `disableBlurPlaceholder`. Above-the-fold
  // images get the same treatment so they still paint a low-res blur while
  // the high-res asset decodes, eliminating residual CLS.
  const resolvedPlaceholder =
    placeholder ?? (disableBlurPlaceholder ? 'empty' : 'blur');
  const resolvedBlurDataURL =
    blurDataURL ??
    (resolvedPlaceholder === 'blur' ? DEFAULT_BLUR_DATA_URL : undefined);

  const normalizedWidth = typeof width === 'number' ? width : Number(width);
  const normalizedHeight = typeof height === 'number' ? height : Number(height);
  const resolvedAspectRatio =
    aspectRatio ??
    (props.fill ||
    Number.isNaN(normalizedWidth) ||
    Number.isNaN(normalizedHeight)
      ? undefined
      : `${normalizedWidth} / ${normalizedHeight}`);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-100 dark:bg-gray-800',
        isLoading ? 'animate-pulse' : '',
        containerClassName
      )}
      style={
        resolvedAspectRatio ? { aspectRatio: resolvedAspectRatio } : undefined
      }
    >
      <Image
        {...props}
        src={imgSrc}
        alt={alt}
        // `next/image` warns in dev when `fill` is set alongside explicit
        // `width`/`height`. Drop them so the wrapper supports both modes
        // without emitting a console warning.
        width={props.fill ? undefined : width}
        height={props.fill ? undefined : height}
        placeholder={resolvedPlaceholder}
        blurDataURL={resolvedBlurDataURL}
        className={cn(
          'duration-700 ease-in-out',
          isLoading
            ? 'scale-110 blur-2xl grayscale'
            : 'scale-100 blur-0 grayscale-0',
          className
        )}
        onLoad={() => setLoading(false)}
        onError={() => setImgSrc(fallbackSrc)}
        loading={props.priority ? 'eager' : 'lazy'}
      />
    </div>
  );
};

export default OptimizedImage;
