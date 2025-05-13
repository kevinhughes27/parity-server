import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import GamesList from "./views/GamesList";
import Game from "./views/Game";
import GameEdit from "./views/Game/Edit";

import StatsPage from "./views/StatsPage";
import Leaderboards from "./views/Leaderboards";
import ComparePlayers from "./views/ComparePlayers";

import SalaryPage from "./views/SalaryPage";
import StatsTable from "./views/StatsTable";
import TeamDashboard from "./views/TeamDashboard";
import { LeaderboardsContextProvider } from "./views/Leaderboards/LeaderboardsContext";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StatsPage component={StatsTable} />} />
        <Route path="/games" element={<GamesList />} />
        <Route path="/:leagueId/games/:gameId" element={<Game />} />
        <Route path="/:leagueId/games/:gameId/edit" element={<GameEdit />} />
        <Route
          path="/leaderboards"
          element={
            <LeaderboardsContextProvider>
              <StatsPage component={Leaderboards} />
            </LeaderboardsContextProvider>
          }
        />
        <Route
          path="/compare_players"
          element={<StatsPage component={ComparePlayers} />}
        />
        <Route
          path="/team_dashboard"
          element={<SalaryPage component={TeamDashboard} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
