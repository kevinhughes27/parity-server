import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SalaryPage from '../SalaryPage';
import * as leagueHooks from '../../hooks/league';
import { FunctionComponent } from 'react';

// Mock the hooks
vi.mock('../../hooks/league', () => ({
  useLeague: vi.fn()
}));

// Mock the API calls
vi.mock('../../api', () => ({
  fetchPlayers: vi.fn().mockResolvedValue([]),
  fetchWeeks: vi.fn().mockResolvedValue([1, 2, 3]),
  leagues: [
    { id: 22, name: 'Test League' },
    { id: 23, name: 'Other League' }
  ]
}));

// Mock useMediaQuery from MUI
vi.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: vi.fn()
}));
import useMediaQuery from '@mui/material/useMediaQuery';

// Mock component for SalaryPage
const MockSalaryComponent: FunctionComponent = () => <div>Mock Salary</div>;

describe('SalaryPage', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock useLeague hook to return a tuple [leagueId, setLeague]
    (leagueHooks.useLeague as unknown as ReturnType<typeof vi.fn>).mockReturnValue(['22', vi.fn()]);

    // Mock useMediaQuery hook
    (useMediaQuery as ReturnType<typeof vi.fn>).mockReturnValue(false);
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
