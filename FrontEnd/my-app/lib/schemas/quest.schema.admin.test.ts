import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUEST_DIFFICULTY,
  DEFAULT_QUEST_MAX_PARTICIPANTS,
  defaultQuestWizardData,
  questWizardDataToFormData,
  sanitizeWizardData,
  validateStep,
  type QuestWizardData,
} from './quest.schema';

function buildWizardData(
  overrides: Partial<QuestWizardData> = {}
): QuestWizardData {
  return {
    ...defaultQuestWizardData,
    ...overrides,
    basics: { ...defaultQuestWizardData.basics, ...overrides.basics },
    requirements: {
      ...defaultQuestWizardData.requirements,
      ...overrides.requirements,
    },
    reward: { ...defaultQuestWizardData.reward, ...overrides.reward },
    timeline: { ...defaultQuestWizardData.timeline, ...overrides.timeline },
    verification: {
      ...defaultQuestWizardData.verification,
      ...overrides.verification,
    },
    advanced: { ...defaultQuestWizardData.advanced, ...overrides.advanced },
  };
}

describe('advanced wizard settings', () => {
  it('defaults to the values the wizard previously hard-coded', () => {
    expect(defaultQuestWizardData.advanced.difficulty).toBe(
      DEFAULT_QUEST_DIFFICULTY
    );
    expect(defaultQuestWizardData.advanced.maxParticipants).toBe(
      DEFAULT_QUEST_MAX_PARTICIPANTS
    );
    expect(defaultQuestWizardData.advanced.tags).toEqual([]);
  });

  it('rejects a participant cap below one', () => {
    const errors = validateStep(
      2,
      buildWizardData({
        advanced: {
          ...defaultQuestWizardData.advanced,
          maxParticipants: 0,
        },
      })
    );

    expect(errors.map((error) => error.field)).toContain(
      'advanced.maxParticipants'
    );
  });

  it('accepts a valid participant cap', () => {
    const errors = validateStep(2, buildWizardData());
    expect(errors.map((error) => error.field)).not.toContain(
      'advanced.maxParticipants'
    );
  });

  it('normalises and de-duplicates tags when sanitizing', () => {
    const sanitized = sanitizeWizardData(
      buildWizardData({
        advanced: {
          ...defaultQuestWizardData.advanced,
          tags: ['  Solidity ', 'solidity', 'RUST', '', '   '],
        },
      })
    );

    expect(sanitized.advanced.tags).toEqual(['solidity', 'rust']);
  });

  it('coerces a numeric-string participant cap', () => {
    const sanitized = sanitizeWizardData(
      buildWizardData({
        advanced: {
          ...defaultQuestWizardData.advanced,
          maxParticipants: '25' as unknown as number,
        },
      })
    );

    expect(sanitized.advanced.maxParticipants).toBe(25);
  });
});

describe('questWizardDataToFormData', () => {
  it('maps wizard data onto the admin form payload', () => {
    const formData = questWizardDataToFormData(
      buildWizardData({
        basics: {
          title: 'Build a Soroban indexer',
          shortDescription: 'Index contract events',
          description: 'Full description',
          category: 'Blockchain',
        },
        reward: { amount: 500, assetType: 'USDC', xpReward: 250 },
        advanced: {
          difficulty: 'advanced',
          maxParticipants: 25,
          tags: ['soroban'],
        },
      })
    );

    expect(formData).toMatchObject({
      title: 'Build a Soroban indexer',
      shortDescription: 'Index contract events',
      description: 'Full description',
      category: 'Blockchain',
      difficulty: 'advanced',
      reward: 500,
      xpReward: 250,
      maxParticipants: 25,
      tags: ['soroban'],
    });
  });

  it('flattens skills and deliverables into requirement strings', () => {
    const formData = questWizardDataToFormData(
      buildWizardData({
        requirements: {
          skills: ['Rust'],
          deliverables: [
            {
              id: 'deliverable-1',
              title: 'Open a PR',
              details: 'against main',
              required: true,
            },
            {
              id: 'deliverable-2',
              title: 'Write docs',
              details: '',
              required: false,
            },
          ],
        },
      })
    );

    expect(formData.requirements).toEqual([
      'Skill: Rust',
      'Deliverable: Open a PR (against main) [required]',
      'Deliverable: Write docs',
    ]);
  });

  it('returns an empty deadline when none is set', () => {
    const formData = questWizardDataToFormData(buildWizardData());
    expect(formData.deadline).toBe('');
  });

  it('converts a set deadline into an ISO string', () => {
    const formData = questWizardDataToFormData(
      buildWizardData({
        timeline: {
          ...defaultQuestWizardData.timeline,
          deadline: '2030-01-01T12:00',
          timezone: 'UTC',
        },
      })
    );

    expect(formData.deadline).not.toBe('');
    expect(() => new Date(formData.deadline).toISOString()).not.toThrow();
  });
});
