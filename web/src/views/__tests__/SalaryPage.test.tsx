import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SalaryPage from '../SalaryPage';
import * as leagueHooks from '../../hooks/league';
import { FunctionComponent } from 'react';

vi.mock('../../hooks/league', () => ({
  useLeague: vi.fn(),
}));

vi.mock('../../api', () => ({
  fetchPlayers: vi.fn().mockResolvedValue([]),
  fetchWeeks: vi.fn().mockResolvedValue([1, 2, 3]),
  leagues: [
    { id: 22, name: 'Test League' },
    { id: 23, name: 'Other League' },
  ],
}));

const MockSalaryComponent: FunctionComponent = () => <div>Mock Salary</div>;

describe('SalaryPage', () => {
  beforeEach(() => {
    (leagueHooks.useLeague as unknown as ReturnType<typeof vi.fn>).mockReturnValue(['22', vi.fn()]);
  });

  it('shows loading state then loaded state', async () => {
    render(
      <MemoryRouter>
        <SalaryPage component={MockSalaryComponent} />
      </MemoryRouter>
    );

    // Initially shows loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });
});
