import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GameEdit from '../Game/Edit';
import { fetchGame } from '../../api';

vi.mock('../../api', () => ({
  fetchGame: vi.fn().mockResolvedValue({
    id: 'game1',
    leagueId: 'league1',
  }),
}));

describe('GameEdit', () => {
  it('renders the Editor component after loading', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/league1/game1']}>
        <Routes>
          <Route path="/:leagueId/:gameId" element={<GameEdit />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for fetchGame to resolve
    await vi.waitFor(() => {
      expect(fetchGame).toHaveBeenCalledWith('game1', 'league1');
    });

    // Wait for CodeMirror editor to appear
    await waitFor(() => {
      expect(container.querySelector('.cm-editor')).toBeInTheDocument();
    });
  });
});
