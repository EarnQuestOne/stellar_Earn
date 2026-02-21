export const ONBOARDING_STORAGE_KEY = "stellar_earn_onboarding_state_v1";

export type TourTooltipPlacement = "top" | "bottom" | "left" | "right";

export interface OnboardingStepConfig {
  id: string;
  title: string;
  description: string;
  route?: string;
  targetSelector?: string;
  placement?: TourTooltipPlacement;
}

export interface OnboardingState {
  completed: boolean;
  skipped: boolean;
  hasStarted: boolean;
  currentStepIndex: number;
  completedStepIds: string[];
  tutorialMode: boolean;
}

export const defaultOnboardingState: OnboardingState = {
  completed: false,
  skipped: false,
  hasStarted: false,
  currentStepIndex: 0,
  completedStepIds: [],
  tutorialMode: true,
};

export const onboardingSteps: OnboardingStepConfig[] = [
  {
    id: "dashboard",
    title: "Dashboard Overview",
    description:
      "This is your command center. Track progress, activity, and rewards at a glance.",
    route: "/dashboard",
    targetSelector: '[data-onboarding="dashboard-header"]',
    placement: "bottom",
  },
  {
    id: "stats",
    title: "Performance Stats",
    description:
      "Monitor completed quests, XP, earnings, and streaks from this section.",
    route: "/dashboard",
    targetSelector: '[data-onboarding="dashboard-stats"]',
    placement: "bottom",
  },
  {
    id: "dashboard-active-quests",
    title: "Active Quest Feed",
    description:
      "Use this section to see the quests that need your attention right now.",
    route: "/dashboard",
    targetSelector: '[data-onboarding="dashboard-active-quests"]',
    placement: "top",
  },
  {
    id: "quests-header",
    title: "Quest Board",
    description:
      "Explore open quests and filter by category, status, and difficulty to find work quickly.",
    route: "/quests",
    targetSelector: '[data-onboarding="quest-board-header"]',
    placement: "bottom",
  },
  {
    id: "quests-filters",
    title: "Search and Filters",
    description:
      "Narrow down quests by keyword, status, difficulty, and category.",
    route: "/quests",
    targetSelector: '[data-onboarding="quest-board-filters"]',
    placement: "bottom",
  },
  {
    id: "quests-list",
    title: "Quest Results",
    description:
      "This list updates with your filters and lets you open full quest details.",
    route: "/quests",
    targetSelector: '[data-onboarding="quest-board-list"]',
    placement: "top",
  },
  {
    id: "submissions-header",
    title: "Submissions",
    description:
      "Track review status and manage proof submissions from this page.",
    route: "/submissions",
    targetSelector: '[data-onboarding="submissions-header"]',
    placement: "bottom",
  },
  {
    id: "submissions-summary",
    title: "Submission Metrics",
    description:
      "Get a quick snapshot of approvals, pending reviews, and overall activity.",
    route: "/submissions",
    targetSelector: '[data-onboarding="submissions-summary"]',
    placement: "bottom",
  },
  {
    id: "submissions-filters",
    title: "Submission Filters",
    description:
      "Search and filter submissions to quickly find a specific proof or status.",
    route: "/submissions",
    targetSelector: '[data-onboarding="submissions-filters"]',
    placement: "bottom",
  },
  {
    id: "submissions-table",
    title: "Submission List",
    description:
      "Review individual submissions, then open details for timeline and evidence.",
    route: "/submissions",
    targetSelector: '[data-onboarding="submissions-table"]',
    placement: "top",
  },
  {
    id: "settings-overview",
    title: "Settings Overview",
    description:
      "Manage preferences and restart onboarding any time from this page.",
    route: "/settings",
    targetSelector: '[data-onboarding="settings-overview"]',
    placement: "bottom",
  },
  {
    id: "notifications-header",
    title: "Notification Preferences",
    description:
      "Control alerts and communication settings based on what matters to you.",
    route: "/settings/notifications",
    targetSelector: '[data-onboarding="notification-settings-header"]',
    placement: "bottom",
  },
  {
    id: "wallet",
    title: "Wallet Connection",
    description:
      "Connect your Stellar wallet to claim rewards and complete on-chain actions.",
    route: "/quests",
    targetSelector: '[data-onboarding="wallet-connect"]',
    placement: "left",
  },
];

export function getOnboardingState(): OnboardingState {
  if (typeof window === "undefined") {
    return defaultOnboardingState;
  }

  try {
    const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!stored) {
      return defaultOnboardingState;
    }

    const parsed = JSON.parse(stored) as Partial<OnboardingState>;

    return {
      ...defaultOnboardingState,
      ...parsed,
      completedStepIds: Array.isArray(parsed.completedStepIds)
        ? parsed.completedStepIds
        : [],
    };
  } catch {
    return defaultOnboardingState;
  }
}

export function setOnboardingState(state: OnboardingState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
}
