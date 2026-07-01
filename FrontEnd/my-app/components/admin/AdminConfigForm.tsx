import React, { useState, FC, FormEvent } from 'react';
import {
  AdminConfigFormProps,
  AdminConfigPayload,
  FormInputChangeHandler,
} from '../../types/admin-forms.types';

export const AdminConfigForm: FC<AdminConfigFormProps> = ({
  initialData,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<AdminConfigPayload>(initialData);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Explicit typing on the input change event handler callback parameter
  const handleInputChange: FormInputChangeHandler = (event) => {
    const { name, value, type } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (event.target as HTMLInputElement).checked
          : value,
    }));
  };

  // Explicit typing on the form submission event wrapper parameter
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="admin-config-form">
      <div>
        <label htmlFor="networkTarget">Network Target</label>
        <select
          id="networkTarget"
          name="networkTarget"
          value={formData.networkTarget}
          onChange={handleInputChange}
          data-testid="select-network"
        >
          <option value="testnet">Testnet</option>
          <option value="mainnet">Mainnet</option>
        </select>
      </div>

      <div>
        <label htmlFor="maxDailyClaimLimit">Max Daily Claim Limit</label>
        <input
          id="maxDailyClaimLimit"
          type="number"
          name="maxDailyClaimLimit"
          value={formData.maxDailyClaimLimit}
          onChange={handleInputChange}
          data-testid="input-claim-limit"
        />
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving Configurations...' : 'Save Settings'}
      </button>
    </form>
  );
};
