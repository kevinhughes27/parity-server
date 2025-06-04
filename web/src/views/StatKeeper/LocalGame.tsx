import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getLeagueName, Point as ApiPoint } from '../../api';
import { useLocalGame, useTeams } from './hooks';
import { db, StoredGame, mapApiPointEventToModelEvent, mapModelEventToApiPointEvent } from './db';
import {
  League as ModelLeague,
  Team as ModelTeam,
  SerializedGameData,
  PointModel,
  // Event as ModelEvent, // Not directly used here, but through PointModel
  BookkeeperVolatileState,
  // SerializedMemento, // Not directly used here
} from './models';
import { Bookkeeper } from './bookkeeper';
import SelectLines from './SelectLines';
import RecordStats from './RecordStats';

type GameView = 'loading' | 'selectLines' | 'recordStats' | 'error_state' | 'initializing';

function LocalGame() {
  const { game: storedGame, isLoading: isLoadingGameHook, error: gameErrorHook, numericGameId } = useLocalGame();
  const { apiLeague, loadingTeams: isLoadingApiLeague } = useTeams(storedGame?.league_id);


  const [bookkeeperInstance, setBookkeeperInstance] = useState<Bookkeeper | null>(null);
  const [currentView, setCurrentView] = useState<GameView>('loading');
  const [localError, setLocalError] = useState<string | null>(null);

  // State for SelectLines pre-selection logic
  const [lastPlayedLine, setLastPlayedLine] = useState<{ home: string[]; away: string[] } | null>(null);
  const [isResumingPointMode, setIsResumingPointMode] = useState<boolean>(false);


  const initializeBookkeeper = useCallback((gameData: StoredGame) => {
    if (!gameData.homeTeamId || !gameData.awayTeamId) {
      setLocalError('Game data is missing team IDs. Cannot initialize Bookkeeper.');
      setCurrentView('error_state');
      return;
    }

    if (!apiLeague) {
      setLocalError(`League configuration for ID ${gameData.league_id} not found or still loading.`);
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
      return PointModel.fromJSON({ 
        offensePlayers: [...apiPoint.offensePlayers],
        defensePlayers: [...apiPoint.defensePlayers],
        events: apiPoint.events.map(mapApiPointEventToModelEvent),
      });
    });
    
    let activePointForHydration: PointModel | null = null;
    if (gameData.bookkeeperState?.activePoint) {
        activePointForHydration = PointModel.fromJSON(gameData.bookkeeperState.activePoint);
    }

    const bookkeeperStateForHydration: BookkeeperVolatileState = {
        ...(gameData.bookkeeperState || { 
            activePoint: null, firstActor: null, homePossession: true, pointsAtHalf: 0,
            homePlayers: null, awayPlayers: null, homeScore: 0, awayScore: 0,
            homeParticipants: gameData.homeRoster || [], awayParticipants: gameData.awayRoster || [],
        }),
        activePoint: activePointForHydration ? activePointForHydration.toJSON() : null, 
    };


    const initialSerializedData: SerializedGameData = {
      league_id: gameData.league_id,
      week: gameData.week,
      homeTeamName: gameData.homeTeam,
      awayTeamName: gameData.awayTeam,
      homeTeamId: gameData.homeTeamId,
      awayTeamId: gameData.awayTeamId,
      game: { points: transformedGamePoints.map(p => p.toJSON()) }, 
      bookkeeperState: bookkeeperStateForHydration,
      mementos: gameData.mementos || [],
    };

    try {
      const bk = new Bookkeeper(leagueForBk, gameData.week, homeTeamForBk, awayTeamForBk, initialSerializedData);
      setBookkeeperInstance(bk);
      if (bk.activePoint === null && (bk.homePlayers === null || bk.awayPlayers === null)) {
        // If it's the start of a game or after a point, reset pre-selection flags
        setIsResumingPointMode(false);
        // lastPlayedLine would be set by handlePointScored if a point just ended
        setCurrentView('selectLines');
      } else {
        // If loading into an active point, it's like resuming.
        setIsResumingPointMode(true); 
        setLastPlayedLine(null); // Not flipping players
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
      if (apiLeague) { 
        initializeBookkeeper(storedGame);
      } else if (!isLoadingApiLeague) { 
        setLocalError(`League details for league ID ${storedGame.league_id} could not be loaded.`);
        setCurrentView('error_state');
      } else {
        setCurrentView('initializing'); 
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
      return Promise.reject(new Error('Critical data missing for save.'));
    }

    const serializedData = bk.serialize();

    const pointsForStorage: ApiPoint[] = serializedData.game.points.map(modelPointJson => ({
      offensePlayers: [...modelPointJson.offensePlayers],
      defensePlayers: [...modelPointJson.defensePlayers],
      events: modelPointJson.events.map(mapModelEventToApiPointEvent), 
    }));
    
    const bookkeeperStateForStorage: BookkeeperVolatileState = {
        ...serializedData.bookkeeperState,
    };

    let newStatus = storedGame.status;
    if (newStatus === 'new') {
        newStatus = 'in-progress';
    }
    // Game status will not be automatically set to 'completed' here.
    // It remains 'in-progress' or its current state until explicitly changed by other actions (e.g., submitting game).

    const updatedGameFields: Partial<StoredGame> = {
      homeScore: serializedData.bookkeeperState.homeScore,
      awayScore: serializedData.bookkeeperState.awayScore,
      points: pointsForStorage,
      bookkeeperState: bookkeeperStateForStorage,
      mementos: serializedData.mementos,
      homeRoster: serializedData.bookkeeperState.homeParticipants,
      awayRoster: serializedData.bookkeeperState.awayParticipants,
      lastModified: new Date(),
      status: newStatus, 
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

    // Special handling for recordPoint to capture players before state changes
    if (action.toString().includes('bk.recordPoint()')) { // A bit hacky, better to pass an identifier
        setLastPlayedLine({
            home: [...(bookkeeperInstance.homePlayers || [])],
            away: [...(bookkeeperInstance.awayPlayers || [])],
        });
        setIsResumingPointMode(false); // After a point, it's a new line selection, not resuming
    }


    action(bookkeeperInstance);

    const newBkInstance = Object.create(Object.getPrototypeOf(bookkeeperInstance));
    Object.assign(newBkInstance, bookkeeperInstance);
    setBookkeeperInstance(newBkInstance); 

    if (!options.skipSave) {
      try {
        await persistBookkeeperState(newBkInstance);
      } catch (saveError) {
        return;
      }
    }

    if (options.skipViewChange) return;

    // Determine next view
    if (newBkInstance.activePoint === null && (newBkInstance.homePlayers === null || newBkInstance.awayPlayers === null)) {
      // This means a point was just scored, or game just started and lines not set, or undone to this state.
      // If not already set by recordPoint specific logic, ensure isResumingPointMode is false.
      if (!action.toString().includes('bk.recordPoint()')) {
          setIsResumingPointMode(false); // Default to not resuming if we land here from other actions (like undo)
          setLastPlayedLine(null); // Clear last played line if not coming from a score
      }
      setCurrentView('selectLines');
    } else if (newBkInstance.activePoint !== null || (newBkInstance.homePlayers !== null && newBkInstance.awayPlayers !== null)) {
      // Active point exists, or lines are set but point hasn't started (e.g. after selecting lines)
      // This is a scenario for RecordStats. If we came from SelectLines, isResumingPointMode should be true.
      setCurrentView('recordStats');
    } else {
       setCurrentView('selectLines'); 
    }
  };
  
  const handleLinesSelected = () => { // Called from SelectLines
    if (bookkeeperInstance && bookkeeperInstance.homePlayers && bookkeeperInstance.awayPlayers) {
        // isResumingPointMode should have been set correctly before this by how we entered SelectLines
        setCurrentView('recordStats');
    } else {
        console.warn("Lines selected but bookkeeper player lines are not set.");
        setIsResumingPointMode(false); // Fallback
        setLastPlayedLine(null);
        setCurrentView('selectLines');
    }
  };

  const handleChangeLine = () => { // Called from RecordStats "Change Line"
    setIsResumingPointMode(true);
    setLastPlayedLine(null); // Not flipping players, just re-selecting current
    setCurrentView('selectLines');
  };

  const handlePointScored = () => { // Called from RecordStats after point is recorded by handlePerformBookkeeperAction
    // lastPlayedLine and isResumingPointMode are set within handlePerformBookkeeperAction for recordPoint
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
          homeRoster={storedGame.homeRoster} 
          awayRoster={storedGame.awayRoster} 
          onPerformAction={handlePerformBookkeeperAction}
          onLinesSelected={handleLinesSelected}
          isResumingPointMode={isResumingPointMode}
          lastPlayedLine={lastPlayedLine}
        />
      )}

      {currentView === 'recordStats' && (
        <RecordStats
          bookkeeper={bookkeeperInstance}
          onPerformAction={handlePerformBookkeeperAction}
          onPointScored={handlePointScored}
          onChangeLine={handleChangeLine} // Use the new handler
        />
      )}
    </div>
  );
}

export default LocalGame;
