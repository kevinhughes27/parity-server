import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getLeagueName, Point as ApiPoint, uploadCompleteGame, UploadedGamePayload } from '../../api';
import { useLocalGame, useTeams } from './hooks';
import { db, StoredGame, mapApiPointEventToModelEvent, mapModelEventToApiPointEvent } from './db';
import {
  League as ModelLeague,
  Team as ModelTeam,
  SerializedGameData,
  PointModel,
  BookkeeperVolatileState,
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
        setIsResumingPointMode(false);
        setCurrentView('selectLines');
      } else {
        setIsResumingPointMode(true);
        setLastPlayedLine(null);
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


  const persistBookkeeperState = async (bk: Bookkeeper, newStatus?: StoredGame['status']) => {
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

    let statusToSave = newStatus || storedGame.status;
    if (statusToSave === 'new' && !newStatus) { // only transition from new if not explicitly setting status
        statusToSave = 'in-progress';
    }

    const updatedGameFields: Partial<StoredGame> = {
      homeScore: serializedData.bookkeeperState.homeScore,
      awayScore: serializedData.bookkeeperState.awayScore,
      points: pointsForStorage,
      bookkeeperState: bookkeeperStateForStorage,
      mementos: serializedData.mementos,
      homeRoster: serializedData.bookkeeperState.homeParticipants,
      awayRoster: serializedData.bookkeeperState.awayParticipants,
      lastModified: new Date(),
      status: statusToSave,
    };

    try {
      await db.games.update(numericGameId, updatedGameFields);
      console.log(`Game ${numericGameId} updated successfully with status ${statusToSave}.`);
      // // Manually update storedGame state if status changes to reflect immediately in UI
      // if (newStatus && storedGame.status !== newStatus) {
      //   // This is a bit of a hack; ideally, useLiveQuery would pick this up,
      //   // but for immediate feedback on status change (e.g., after submit), this helps.
      //   // Create a new object to ensure React detects the change.
      //   const updatedStoredGame = { ...storedGame, status: newStatus, lastModified: updatedGameFields.lastModified! };
      //   // The hook `useLocalGame` should ideally refetch or useLiveQuery should update.
      //   // For now, this direct update might be needed if useLiveQuery is not fast enough.
      //   // Consider if this manual update is truly necessary or if relying on useLiveQuery is sufficient.
      //   // For now, let's assume useLiveQuery will handle it.
      // }
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

    if (action.name === 'bound recordPoint' || action.toString().includes('bk.recordPoint()')) {
        setLastPlayedLine({
            home: [...(bookkeeperInstance.homePlayers || [])],
            away: [...(bookkeeperInstance.awayPlayers || [])],
        });
        setIsResumingPointMode(false);
    }

    action(bookkeeperInstance);

    const newBkInstance = Object.create(Object.getPrototypeOf(bookkeeperInstance));
    Object.assign(newBkInstance, bookkeeperInstance);
    setBookkeeperInstance(newBkInstance);

    if (!options.skipSave) {
        await persistBookkeeperState(newBkInstance);
    }

    if (options.skipViewChange) return;

    if (newBkInstance.activePoint === null && (newBkInstance.homePlayers === null || newBkInstance.awayPlayers === null)) {
      if (!action.toString().includes('bk.recordPoint()')) {
          setIsResumingPointMode(false);
          setLastPlayedLine(null);
      }
      setCurrentView('selectLines');
    } else if (newBkInstance.activePoint !== null || (newBkInstance.homePlayers !== null && newBkInstance.awayPlayers !== null)) {
      setCurrentView('recordStats');
    } else {
       setCurrentView('selectLines');
    }
  };

  const handleLinesSelected = async () => {
    if (bookkeeperInstance && bookkeeperInstance.homePlayers && bookkeeperInstance.awayPlayers) {
        if (bookkeeperInstance.activePoint === null && !bookkeeperInstance.firstPointOfGameOrHalf()) {
            await handlePerformBookkeeperAction(bk => {
                bk.prepareNewPointAfterScore();
            }, { skipViewChange: true, skipSave: false });
        }
        setCurrentView('recordStats');
    } else {
        console.warn("Lines selected but bookkeeper player lines are not set.");
        setIsResumingPointMode(false);
        setLastPlayedLine(null);
        setCurrentView('selectLines');
    }
  };

  const handleChangeLine = () => {
    setIsResumingPointMode(true);
    setLastPlayedLine(null);
    setCurrentView('selectLines');
  };

  const handlePointScored = () => {
    setCurrentView('selectLines');
  };

  const handleSubmitGame = async () => {
    if (!bookkeeperInstance || !storedGame || !numericGameId) {
      alert('Game data or bookkeeper not available for submission.');
      return;
    }

    // No longer prompting for password
    // const password = prompt('Enter the league password to submit the game:');
    // if (password === null) { // User cancelled prompt
    //   return;
    // }

    try {
      await persistBookkeeperState(bookkeeperInstance, 'submitted');
      // Refresh storedGame to get the 'submitted' status for the UI
      // This might not be strictly necessary if useLiveQuery updates quickly enough
      const updatedStoredGame = await db.games.get(numericGameId);
      if (updatedStoredGame) {
        // This is a local update to ensure UI reflects "submitted" state immediately
        // The hook `useLocalGame` should ideally handle this via useLiveQuery.
        // Forcing a re-render or relying on useLiveQuery is better.
        // Let's assume useLiveQuery will update the `storedGame` prop.
      }


      const bkState = bookkeeperInstance.serialize();
      const gameDataForApi: UploadedGamePayload = {
        league_id: bkState.league_id, // API spec shows number, sending string
        week: bkState.week,
        homeTeam: bkState.homeTeamName,
        homeScore: bkState.bookkeeperState.homeScore,
        homeRoster: bkState.bookkeeperState.homeParticipants,
        awayTeam: bkState.awayTeamName,
        awayScore: bkState.bookkeeperState.awayScore,
        awayRoster: bkState.bookkeeperState.awayParticipants,
        points: bkState.game.points.map(pJson => ({
          offensePlayers: pJson.offensePlayers,
          defensePlayers: pJson.defensePlayers,
          events: pJson.events.map(mapModelEventToApiPointEvent)
        })),
      };

      const response = await uploadCompleteGame(gameDataForApi);

      if (response.ok) {
        await persistBookkeeperState(bookkeeperInstance, 'uploaded');
        alert('Game submitted and uploaded successfully!');
      } else {
        const errorText = await response.text(); // Get raw text for more info
        let errorMessage = `Failed to submit game: ${response.status} ${response.statusText}`;
        try {
            const errorData = JSON.parse(errorText); // Try to parse as JSON
            errorMessage += ` - ${errorData.message || errorData.detail || 'Server error'}`;
        } catch {
            errorMessage += ` - ${errorText || 'Server error with no JSON body'}`;
        }
        await persistBookkeeperState(bookkeeperInstance, 'sync-error');
        alert(errorMessage);
      }
    } catch (error) {
      await persistBookkeeperState(bookkeeperInstance, 'sync-error');
      alert(`An error occurred during game submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Submission error:', error);
    }
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
      <p>
        <strong>Status:</strong> <span style={{fontWeight: 'bold'}}>{storedGame.status}</span>
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
          onSubmitGame={handleSubmitGame}
          gameStatus={storedGame.status}
        />
      )}

      {currentView === 'recordStats' && (
        <RecordStats
          bookkeeper={bookkeeperInstance}
          onPerformAction={handlePerformBookkeeperAction}
          onPointScored={handlePointScored}
          onChangeLine={handleChangeLine}
          onSubmitGame={handleSubmitGame}
          gameStatus={storedGame.status}
        />
      )}
    </div>
  );
}

export default LocalGame;
