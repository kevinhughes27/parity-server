import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import GamesList from './views/GamesList';
import Game from './views/Game';
import GameEdit from './views/Game/Edit';

import StatsPage from './views/StatsPage';
import Leaderboards from './views/Leaderboards';
import ComparePlayers from './views/ComparePlayers';

import SalaryPage from './views/SalaryPage';
import StatsTable from './views/StatsTable';
import TeamDashboard from './views/TeamDashboard';
import StatKeeper from './views/StatKeeper';
import LocalGame from './views/StatKeeper/LocalGame';
import NewGameSetup from './views/StatKeeper/NewGameSetup'; 
import EditGameRosters from './views/StatKeeper/EditGameRosters'; // New Import

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StatsPage component={StatsTable} />} />
        <Route path="/games" element={<GamesList />} />
        <Route path="/:leagueId/games/:gameId" element={<Game />} />
        <Route path="/:leagueId/games/:gameId/edit" element={<GameEdit />} />
        <Route path="/leaderboards" element={<StatsPage component={Leaderboards} />} />
        <Route path="/compare_players" element={<StatsPage component={ComparePlayers} />} />
        <Route path="/team_dashboard" element={<SalaryPage component={TeamDashboard} />} />
        
        {/* StatKeeper Routes */}
        <Route path="/stat_keeper" element={<StatKeeper />} />
        <Route path="/stat_keeper/game/:localGameId" element={<LocalGame />} />
        <Route path="/stat_keeper/new_game" element={<NewGameSetup />} />
        {/* Route for editing existing game rosters, uses the new EditGameRosters component */}
        <Route path="/stat_keeper/edit_game_setup/:localGameId" element={<EditGameRosters />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;
