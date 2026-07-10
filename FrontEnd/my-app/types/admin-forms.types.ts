import { ChangeEvent, FormEvent } from 'react';

/**
 * Structural model tracking configuration settings in administrative modules.
 */
export interface AdminConfigPayload {
  networkTarget: 'mainnet' | 'testnet';
  maintenanceMode: boolean;
  maxDailyClaimLimit: number;
}

/**
 * Strict handler signature for administrative input mutations.
 */
export type FormInputChangeHandler = (
  event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
) => void;

/**
 * Explicit callback contract executed upon successful form validation and submission.
 */
export type AdminFormSubmitCallback = (
  values: AdminConfigPayload
) => Promise<void>;

/**
 * Form component configuration parameter bindings.
 */
export interface AdminConfigFormProps {
  initialData: AdminConfigPayload;
  onSubmit: AdminFormSubmitCallback;
}
