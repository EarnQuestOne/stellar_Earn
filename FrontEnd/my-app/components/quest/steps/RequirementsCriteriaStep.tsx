'use client';

import { Plus } from 'lucide-react';
import type { QuestWizardData } from '@/lib/schemas/quest.schema';
import RequirementsBuilder from '@/components/quest/RequirementsBuilder';

interface RequirementsCriteriaStepProps {
  data: QuestWizardData;
  errors: Record<string, string>;
  onChange: (next: QuestWizardData['requirements']) => void;
}

const RequirementsCriteriaStep = ({
  data,
  errors,
  onChange,
}: RequirementsCriteriaStepProps) => {
  const hasSkillsError = Boolean(errors['requirements.skills']);
  const hasDeliverablesError = Boolean(errors['requirements.deliverables']);

  const updateSkill = (index: number, value: string) => {
    const nextSkills = data.requirements.skills.map((skill, idx) =>
      idx === index ? value : skill
    );
    onChange({ ...data.requirements, skills: nextSkills });
  };

  const addSkill = () => {
    onChange({
      ...data.requirements,
      skills: [...data.requirements.skills, ''],
    });
  };

  const removeSkill = (index: number) => {
    if (data.requirements.skills.length === 1) {
      return;
    }
    onChange({
      ...data.requirements,
      skills: data.requirements.skills.filter((_, idx) => idx !== index),
    });
  };

  return (
    <section className="space-y-7" data-testid="step-requirements">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Required Skills
          </h3>
          <button
            type="button"
            onClick={addSkill}
            className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-cyan-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Skill
          </button>
        </div>
        <div className="space-y-2">
          {data.requirements.skills.map((skill, index) => (
            <div key={`skill-${index}`} className="flex gap-2">
              <input
                value={skill}
                onChange={(event) => updateSkill(index, event.target.value)}
                placeholder={`Skill ${index + 1}`}
                className={`w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 ${
                  hasSkillsError
                    ? 'border-red-400 focus:border-red-500 dark:border-red-800'
                    : 'border-zinc-300 focus:border-cyan-500 dark:border-zinc-700'
                }`}
              />
              <button
                type="button"
                onClick={() => removeSkill(index)}
                className="rounded-xl border border-zinc-300 px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        {errors['requirements.skills'] && (
          <p className="mt-1 text-xs text-red-600">
            {errors['requirements.skills']}
          </p>
        )}
      </div>

      <div
        className={
          hasDeliverablesError
            ? 'rounded-2xl border border-red-300/70 p-3 dark:border-red-900/60'
            : ''
        }
      >
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Deliverables Builder (Drag and Drop)
        </h3>
        <RequirementsBuilder
          items={data.requirements.deliverables}
          onChange={(deliverables) =>
            onChange({ ...data.requirements, deliverables })
          }
        />
        {errors['requirements.deliverables'] && (
          <p className="mt-1 text-xs text-red-600">
            {errors['requirements.deliverables']}
          </p>
        )}
      </div>
    </section>
  );
};

export default RequirementsCriteriaStep;
