import { Injectable, Logger } from '@nestjs/common';

export type TriageLabel = 'flaky' | 'infra' | 'logic' | 'timeout' | 'unknown';

export interface TriageResult {
  label: TriageLabel;
  owner: string;
  reason: string;
}

const OWNERSHIP_MAP: Record<TriageLabel, string> = {
  flaky: '@team-qa',
  infra: '@team-devops',
  logic: '@team-backend',
  timeout: '@team-backend',
  unknown: '@team-backend',
};

@Injectable()
export class CiTriageService {
  private readonly logger = new Logger(CiTriageService.name);

  /**
   * Classifies a test failure message into a triage label and assigns ownership.
   */
  triage(failureMessage: string): TriageResult {
    const msg = failureMessage.toLowerCase();

    let label: TriageLabel = 'unknown';
    if (msg.includes('timeout') || msg.includes('timed out')) label = 'timeout';
    else if (
      msg.includes('econnrefused') ||
      msg.includes('docker') ||
      msg.includes('database')
    )
      label = 'infra';
    else if (
      msg.includes('flaky') ||
      msg.includes('intermittent') ||
      msg.includes('retry')
    )
      label = 'flaky';
    else if (
      msg.includes('assertionerror') ||
      msg.includes('expected') ||
      msg.includes('typeerror')
    )
      label = 'logic';

    const result: TriageResult = {
      label,
      owner: OWNERSHIP_MAP[label],
      reason: `Matched pattern for label "${label}"`,
    };

    this.logger.log(`Triage: ${label} -> ${result.owner}`);
    return result;
  }
}
