'use client';

import HeroSection from '@/components/homepage/HeroSection';
import { ComponentErrorBoundary } from '@/components/error/ErrorBoundary';
import {
  WithAPIBootstrapErrorBoundary,
  BootstrapErrorFallback,
} from '@/components/error';
import LazyLoad from '@/components/ui/LazyLoad';
import {
  DynamicHowItWorks,
  DynamicFeaturedQuests,
  DynamicFAQAccordion,
  DynamicCTASection,
} from '@/lib/dynamic-imports';

/**
 * Homepage composition.
 *
 * Widgets are wrapped on a per-section basis so that a single failure does
 * not blank the entire page. Two kinds of boundary are used:
 *
 * - `WithAPIBootstrapErrorBoundary` for widgets whose initial render
 *   depends on API bootstrap (FeaturedQuests fetches from the API at mount).
 *   In addition to catching render errors, this boundary listens for
 *   offline / online / network-unreachable events and shows the resilient
 *   `BootstrapErrorFallback` UI (retry, Go Home, network diagnostics,
 *   retry counter, automatic reset on reconnect).
 *
 * - `ComponentErrorBoundary` for widgets that are static (no API call) but
 *   are loaded through `next/dynamic`, where they could still fail to
 *   bootstrap if their JS chunk fails to load. We intentionally do not use
 *   the API-bootstrap-aware boundary for these widgets: their offline
 *   fallback UI would mislead the user (they have no network dependency)
 *   and would stack across every section if the user ever went offline.
 *
 * `FeaturedQuests` is also wrapped internally (see the component file)
 * with a specialized `APIBootstrapErrorBoundary` that renders a
 * timeout-specific UI for slow requests. The two boundaries are not
 * redundant: the outer one catches chunk-load and dynamic-import failures
 * that the inner one cannot see; the inner one catches API-call failures
 * during mount and provides the specialized timeout UX.
 */
export default function Home() {
  return (
    <main id="main-content" className="flex flex-col">
      {/* HeroSection - Above the fold, eagerly loaded, no API calls. */}
      <ComponentErrorBoundary componentName="HeroSection">
        <HeroSection />
      </ComponentErrorBoundary>

      {/* HowItWorks - Dynamic chunk, no API. Catches render and chunk-load errors. */}
      <ComponentErrorBoundary componentName="HowItWorks">
        <LazyLoad
          placeholder={
            <div className="min-h-[500px] w-full animate-pulse bg-slate-800/20" />
          }
        >
          <DynamicHowItWorks />
        </LazyLoad>
      </ComponentErrorBoundary>

      {/* FeaturedQuests - Dynamic chunk AND API bootstrap. Outer boundary
          catches chunk-load errors; the inner boundary handles API-specific
          failures with the timeout-specialized UI. */}
      <WithAPIBootstrapErrorBoundary
        componentName="Featured Quests — Page Loader"
        fallback={BootstrapErrorFallback}
      >
        <LazyLoad
          placeholder={
            <div className="min-h-[600px] w-full animate-pulse bg-slate-800/20" />
          }
          rootMargin="100px"
        >
          <DynamicFeaturedQuests />
        </LazyLoad>
      </WithAPIBootstrapErrorBoundary>

      {/* CTASection - Dynamic chunk, no API. */}
      <ComponentErrorBoundary componentName="CTASection">
        <LazyLoad
          placeholder={
            <div className="min-h-[300px] w-full animate-pulse bg-slate-800/20" />
          }
        >
          <DynamicCTASection />
        </LazyLoad>
      </ComponentErrorBoundary>

      {/* FAQAccordion - Dynamic chunk, no API. */}
      <ComponentErrorBoundary componentName="FAQAccordion">
        <LazyLoad
          placeholder={
            <div className="min-h-[400px] w-full animate-pulse bg-slate-800/20" />
          }
        >
          <DynamicFAQAccordion />
        </LazyLoad>
      </ComponentErrorBoundary>
    </main>
  );
}
