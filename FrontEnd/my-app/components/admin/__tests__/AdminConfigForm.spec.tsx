import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest'; // <-- Use explicit Vitest mocking instead of Jest
import { AdminConfigForm } from '../AdminConfigForm';
import { AdminConfigPayload } from '../../../types/admin-forms.types';
import '@testing-library/jest-dom';

describe('Issue #804 [FE-015]: AdminConfigForm Type Enforcement Suite', () => {
  const mockInitialData: AdminConfigPayload = {
    networkTarget: 'testnet',
    maintenanceMode: false,
    maxDailyClaimLimit: 1000,
  };

  it('should cleanly accept explicit parameters and fire submit callbacks accurately', async () => {
    const mockSubmitHandler = vi.fn().mockResolvedValue(undefined); // <-- Swap jest.fn() to vi.fn()

    render(
      <AdminConfigForm
        initialData={mockInitialData}
        onSubmit={mockSubmitHandler}
      />
    );

    const limitInput = screen.getByTestId('input-claim-limit');
    fireEvent.change(limitInput, {
      target: { name: 'maxDailyClaimLimit', value: '2500' },
    });

    const form = screen.getByTestId('admin-config-form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSubmitHandler).toHaveBeenCalledTimes(1);
      expect(mockSubmitHandler).toHaveBeenCalledWith({
        networkTarget: 'testnet',
        maintenanceMode: false,
        maxDailyClaimLimit: '2500',
      });
    });
  });
});
