import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface AxeSmokeOptions {
  page: Page;
  url?: string;
  skipFailures?: string[];
  impactLevel?: 'critical' | 'serious' | 'moderate' | 'minor';
  disableRules?: string[];
}

const DEFAULT_DISABLED_RULES = [
  'color-contrast',
  'region',
  'landmark-one-main',
  'svg-img-alt',
  'aria-valid-attr-value',
  'html-has-lang',
];

export async function runAxeSmoke(options: AxeSmokeOptions) {
  const {
    page,
    url,
    impactLevel = 'critical',
    disableRules = DEFAULT_DISABLED_RULES,
  } = options;

  if (url) {
    await page.goto(url, { waitUntil: 'networkidle' });
  }

  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .disableRules(disableRules)
    .analyze();

  const violationsOfConcern = results.violations.filter(
    (v) =>
      v.impact === impactLevel ||
      impactLevel === 'critical' ||
      impactLevel === 'serious'
  );

  return {
    passes: results.passes,
    violations: results.violations,
    violationsOfConcern,
    incomplete: results.incomplete,
  };
}

export async function expectAxeToPass(options: AxeSmokeOptions) {
  const { violations, violationsOfConcern } = await runAxeSmoke(options);

  const allToCheck =
    violationsOfConcern.length > 0 ? violationsOfConcern : violations;

  if (allToCheck.length > 0) {
    const summary = allToCheck
      .map(
        (v) => `- ${v.id}: ${v.help} (${v.impact}) [${v.nodes.length} nodes]`
      )
      .join('\n');

    expect(allToCheck).toEqual([]);
  }
}
