import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getLeagueName, Point as ApiPoint } from '../../api';
import { useLocalGame, useTeams } from './hooks';
import { db, StoredGame, mapApiPointEventToModelEvent, mapModelEventToApiPointEvent } from './db';
import {
  Bookkeeper,
  League as ModelLeague,
  Team as ModelTeam,
  SerializedGameData,
  PointModel,
  // Event as ModelEvent, // Not directly used here, but through PointModel
  BookkeeperVolatileState,
  // SerializedMemento, // Not directly used here
} from './models';

import SelectLines from './SelectLines';
import RecordStats from './RecordStats';

type GameView = 'loading' | 'selectLines' | 'recordStats' | 'error_state' | 'initializing';

function LocalGame() {
  const { game: storedGame, isLoading: isLoadingGameHook, error: gameErrorHook, numericGameId } = useLocalGame();
  const { apiLeague, loadingTeams: isLoadingApiLeague } = useTeams(storedGame?.league_id);


  const [bookkeeperInstance, setBookkeeperInstance] = useState<Bookkeeper | null>(null);
  const [currentView, setCurrentView] = useState<GameView>('loading');
  const [localError, setLocalError] = useState<string | null>(null);

  const initializeBookkeeper = useCallback((gameData: StoredGame) => {
    if (!gameData.homeTeamId || !gameData.awayTeamId) {
      setLocalError('Game data is missing team IDs. Cannot initialize Bookkeeper.');
      setCurrentView('error_state');
      return;
    }

    if (!apiLeague) {
      setLocalError(`League configuration for ID ${gameData.league_id} not found or still loading.`);
      // If apiLeague is loading, we should wait. setCurrentView to 'initializing' or similar.
      setCurrentView('initializing');
      return;
    }

    const leagueForBk: ModelLeague = {
      id: gameData.league_id,
      name: getLeagueName(gameData.league_id) || 'Unknown League',
      lineSize: apiLeague.lineSize,
    };

    const homeTeamForBk: ModelTeam = { id: gameData.homeTeamId, name: gameData.homeTeam };
    const awayTeamForBk: ModelTeam = { id: gameData.awayTeamId, name: gameData.awayTeam };

    const transformedGamePoints = gameData.points.map(apiPoint => {
      return PointModel.fromJSON({ // Pass structure expected by PointModel.fromJSON
        offensePlayers: [...apiPoint.offensePlayers],
        defensePlayers: [...apiPoint.defensePlayers],
        events: apiPoint.events.map(mapApiPointEventToModelEvent),
      });
    });
    
    // Transform activePoint from bookkeeperState if it exists
    let activePointForHydration: PointModel | null = null;
    if (gameData.bookkeeperState?.activePoint) {
        // Assuming gameData.bookkeeperState.activePoint stores events as ModelEvent (with enum type)
        // which is consistent if BookkeeperVolatileState is saved directly.
        // If it were stored as ApiPointEvent (string type), mapping would be needed here.
        activePointForHydration = PointModel.fromJSON(gameData.bookkeeperState.activePoint);
    }

    const bookkeeperStateForHydration: BookkeeperVolatileState = {
        ...(gameData.bookkeeperState || { // Default if not present
            activePoint: null, firstActor: null, homePossession: true, pointsAtHalf: 0,
            homePlayers: null, awayPlayers: null, homeScore: 0, awayScore: 0,
            homeParticipants: gameData.homeRoster || [], awayParticipants: gameData.awayRoster || [],
        }),
        activePoint: activePointForHydration ? activePointForHydration.toJSON() : null, // Ensure it's in JSON format for SerializedGameData
    };


    const initialSerializedData: SerializedGameData = {
      league_id: gameData.league_id,
      week: gameData.week,
      homeTeamName: gameData.homeTeam,
      awayTeamName: gameData.awayTeam,
      homeTeamId: gameData.homeTeamId,
      awayTeamId: gameData.awayTeamId,
      game: { points: transformedGamePoints.map(p => p.toJSON()) }, // GameModel expects JSON points
      bookkeeperState: bookkeeperStateForHydration,
      mementos: gameData.mementos || [],
    };

    try {
      const bk = new Bookkeeper(leagueForBk, gameData.week, homeTeamForBk, awayTeamForBk, initialSerializedData);
      setBookkeeperInstance(bk);
      if (bk.activePoint === null && (bk.homePlayers === null || bk.awayPlayers === null)) {
        setCurrentView('selectLines');
      } else {
        setCurrentView('recordStats');
      }
    } catch (e) {
      console.error("Error initializing Bookkeeper:", e);
      setLocalError(`Failed to initialize game logic: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setCurrentView('error_state');
    }
  }, [apiLeague]);


  useEffect(() => {
    if (isLoadingGameHook || isLoadingApiLeague) {
      setCurrentView('loading');
      setBookkeeperInstance(null);
      return;
    }
    if (gameErrorHook) {
      setLocalError(gameErrorHook);
      setCurrentView('error_state');
      setBookkeeperInstance(null);
      return;
    }
    if (storedGame) {
      setLocalError(null);
      if (apiLeague) { // Ensure apiLeague is loaded before initializing
        initializeBookkeeper(storedGame);
      } else if (!isLoadingApiLeague) { // apiLeague not found and not loading
        setLocalError(`League details for league ID ${storedGame.league_id} could not be loaded.`);
        setCurrentView('error_state');
      } else {
        setCurrentView('initializing'); // Waiting for apiLeague
      }
    } else if (!isLoadingGameHook && numericGameId !== undefined) {
      setLocalError(`Game with ID ${numericGameId} not found.`);
      setCurrentView('error_state');
      setBookkeeperInstance(null);
    }
  }, [storedGame, isLoadingGameHook, gameErrorHook, numericGameId, initializeBookkeeper, apiLeague, isLoadingApiLeague]);


  const persistBookkeeperState = async (bk: Bookkeeper) => {
    if (!numericGameId || !storedGame) {
      console.error('Cannot persist state: game ID or storedGame is missing.');
      setLocalError('Failed to save game: critical data missing.');
      // setCurrentView('error_state'); // Avoid abrupt view change if possible
      return Promise.reject(new Error('Critical data missing for save.'));
    }

    const serializedData = bk.serialize();

    const pointsForStorage: ApiPoint[] = serializedData.game.points.map(modelPointJson => ({
      offensePlayers: [...modelPointJson.offensePlayers],
      defensePlayers: [...modelPointJson.defensePlayers],
      events: modelPointJson.events.map(mapModelEventToApiPointEvent), // modelPointJson.events are ModelEvent[]
    }));
    
    const bookkeeperStateForStorage: BookkeeperVolatileState = {
        ...serializedData.bookkeeperState,
        // activePoint in serializedData.bookkeeperState is already in JSON format with enum EventTypes
        // This is fine for storing directly in StoredGame.bookkeeperState
    };

    const updatedGameFields: Partial<StoredGame> = {
      homeScore: serializedData.bookkeeperState.homeScore,
      awayScore: serializedData.bookkeeperState.awayScore,
      points: pointsForStorage,
      bookkeeperState: bookkeeperStateForStorage,
      mementos: serializedData.mementos,
      homeRoster: serializedData.bookkeeperState.homeParticipants,
      awayRoster: serializedData.bookkeeperState.awayParticipants,
      lastModified: new Date(),
      status: (bk.activePoint === null && bk.homePlayers === null && bk.getMementosCount() > 0) ? 'completed' : 'in-progress',
    };

    try {
      await db.games.update(numericGameId, updatedGameFields);
      console.log(`Game ${numericGameId} updated successfully.`);
    } catch (error) {
      console.error('Failed to update game in DB:', error);
      setLocalError(`Failed to save game progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return Promise.reject(error);
    }
  };

  const handlePerformBookkeeperAction = async (
    action: (bk: Bookkeeper) => void,
    options: { skipViewChange?: boolean; skipSave?: boolean } = {}
  ) => {
    if (!bookkeeperInstance) return;

    action(bookkeeperInstance);

    const newBkInstance = Object.create(Object.getPrototypeOf(bookkeeperInstance));
    Object.assign(newBkInstance, bookkeeperInstance);
    setBookkeeperInstance(newBkInstance); // Trigger re-render

    if (!options.skipSave) {
      try {
        await persistBookkeeperState(newBkInstance);
      } catch (saveError) {
        // Error already logged and set by persistBookkeeperState
        // Potentially revert UI or show more prominent error
        return;
      }
    }

    if (options.skipViewChange) return;

    if (newBkInstance.activePoint === null && (newBkInstance.homePlayers === null || newBkInstance.awayPlayers === null)) {
      setCurrentView('selectLines');
    } else if (newBkInstance.activePoint !== null || (newBkInstance.homePlayers !== null && newBkInstance.awayPlayers !== null)) {
      setCurrentView('recordStats');
    } else {
       setCurrentView('selectLines');
    }
  };
  
  const handleLinesSelected = () => {
    if (bookkeeperInstance && bookkeeperInstance.homePlayers && bookkeeperInstance.awayPlayers) {
        setCurrentView('recordStats');
    } else {
        console.warn("Lines selected but bookkeeper player lines are not set.");
        setCurrentView('selectLines');
    }
  };

  const handlePointScored = () => {
    setCurrentView('selectLines');
  };


  if (currentView === 'loading' || currentView === 'initializing') {
    return <p style={{ padding: '20px' }}>{currentView === 'loading' ? 'Loading game data...' : 'Initializing game logic...'}</p>;
  }

  if (currentView === 'error_state' || localError) {
    return (
      <div style={{ padding: '20px' }}>
        <p style={{color: 'red'}}>Error: {localError || 'An unexpected error occurred.'}</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  if (!bookkeeperInstance || !storedGame) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Game logic or data not available. Please try again.</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }


  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <Link to="/stat_keeper" style={{ display: 'inline-block' }}>
          &larr; Back to StatKeeper Home
        </Link>
        <Link to={`/stat_keeper/edit_game/${numericGameId}`}>
          <button style={{ padding: '8px 12px', cursor: 'pointer' }}>Edit Game Details</button>
        </Link>
      </div>
      <h1>
        Game: {storedGame.homeTeam} vs {storedGame.awayTeam}
      </h1>
      <p>
        <strong>Score:</strong> {bookkeeperInstance.homeScore} - {bookkeeperInstance.awayScore}
      </p>
      <hr style={{margin: "20px 0"}}/>

      {currentView === 'selectLines' && (
        <SelectLines
          bookkeeper={bookkeeperInstance}
          homeRoster={storedGame.homeRoster} // These are full team rosters
          awayRoster={storedGame.awayRoster} // These are full team rosters
          onPerformAction={handlePerformBookkeeperAction}
          onLinesSelected={handleLinesSelected}
        />
      )}

      {currentView === 'recordStats' && (
        <RecordStats
          bookkeeper={bookkeeperInstance}
          onPerformAction={handlePerformBookkeeperAction}
          onPointScored={handlePointScored}
          onChangeLine={() => setCurrentView('selectLines')}
        />
      )}
    </div>
  );
}

export default LocalGame;
