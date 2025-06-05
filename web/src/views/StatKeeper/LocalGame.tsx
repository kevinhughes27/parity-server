import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import {
  getLeagueName,
  Point as ApiPoint,
  uploadCompleteGame,
  UploadedGamePayload,
} from '../../api';
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
import GameActionsMenu from './GameActionsMenu'; // Import the new menu component

type GameView = 'loading' | 'selectLines' | 'recordStats' | 'error_state' | 'initializing';

function LocalGame() {
  const navigate = useNavigate(); // For "Edit Game" in menu
  const {
    game: storedGame,
    isLoading: isLoadingGameHook,
    error: gameErrorHook,
    numericGameId,
  } = useLocalGame();
  const { apiLeague, loadingTeams: isLoadingApiLeague } = useTeams(storedGame?.league_id);

  const [bookkeeperInstance, setBookkeeperInstance] = useState<Bookkeeper | null>(null);
  const [currentView, setCurrentView] = useState<GameView>('loading');
  const [localError, setLocalError] = useState<string | null>(null);

  const [lastPlayedLine, setLastPlayedLine] = useState<{ home: string[]; away: string[] } | null>(
    null
  );
  const [isResumingPointMode, setIsResumingPointMode] = useState<boolean>(false);
  // No longer need lastCompletedPointEvents state, will derive from bookkeeperInstance

  const initializeBookkeeper = useCallback(
    (gameData: StoredGame) => {
      if (!gameData.homeTeamId || !gameData.awayTeamId) {
        setLocalError('Game data is missing team IDs. Cannot initialize Bookkeeper.');
        setCurrentView('error_state');
        return;
      }

      if (!apiLeague) {
        setLocalError(
          `League configuration for ID ${gameData.league_id} not found or still loading.`
        );
        setCurrentView('initializing'); // Stay in initializing if apiLeague not ready
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
          activePoint: null,
          firstActor: null,
          homePossession: true,
          pointsAtHalf: 0,
          homePlayers: null,
          awayPlayers: null,
          homeScore: 0,
          awayScore: 0,
          homeParticipants: gameData.homeRoster || [],
          awayParticipants: gameData.awayRoster || [],
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
        const bk = new Bookkeeper(
          leagueForBk,
          gameData.week,
          homeTeamForBk,
          awayTeamForBk,
          initialSerializedData
        );
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
        console.error('Error initializing Bookkeeper:', e);
        setLocalError(
          `Failed to initialize game logic: ${e instanceof Error ? e.message : 'Unknown error'}`
        );
        setCurrentView('error_state');
      }
    },
    [apiLeague] // apiLeague is a dependency
  );

  useEffect(() => {
    if (isLoadingGameHook || isLoadingApiLeague) {
      setCurrentView('loading');
      setBookkeeperInstance(null); // Ensure bookkeeper is cleared while loading
      return;
    }
    if (gameErrorHook) {
      setLocalError(gameErrorHook);
      setCurrentView('error_state');
      setBookkeeperInstance(null);
      return;
    }
    if (storedGame) {
      setLocalError(null); // Clear previous errors
      if (apiLeague) { // Only initialize if apiLeague is also loaded
        initializeBookkeeper(storedGame);
      } else {
        // This case means storedGame is loaded, but apiLeague is not (and not loading anymore)
        // This could happen if fetchTeams failed or leagueId is bad.
        // useTeams hook should set an error in this case, which would be caught by errorTeams in useTeams.
        // For safety, we can set a local error or rely on the initializing state.
        setLocalError(`League details for league ID ${storedGame.league_id} could not be loaded.`);
        setCurrentView('error_state'); // Or 'initializing' if we expect apiLeague to eventually load
      }
    } else if (!isLoadingGameHook && numericGameId !== undefined) {
      // Game not found, and not loading
      setLocalError(`Game with ID ${numericGameId} not found.`);
      setCurrentView('error_state');
      setBookkeeperInstance(null);
    }
    // If storedGame is undefined and isLoadingGameHook is false, it means no game ID or invalid ID.
    // This case should be handled by gameErrorHook or numericGameId being undefined.
  }, [
    storedGame,
    isLoadingGameHook,
    gameErrorHook,
    numericGameId,
    initializeBookkeeper,
    apiLeague, // Add apiLeague as a dependency
    isLoadingApiLeague, // Add isLoadingApiLeague
  ]);


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
    if (statusToSave === 'new' && !newStatus) {
      statusToSave = 'in-progress';
    }

    const updatedGameFields: Partial<StoredGame> = {
      homeScore: serializedData.bookkeeperState.homeScore,
      awayScore: serializedData.bookkeeperState.awayScore,
      points: pointsForStorage,
      bookkeeperState: bookkeeperStateForStorage,
      mementos: serializedData.mementos,
      homeRoster: serializedData.bookkeeperState.homeParticipants, // Ensure rosters are updated
      awayRoster: serializedData.bookkeeperState.awayParticipants, // Ensure rosters are updated
      lastModified: new Date(),
      status: statusToSave,
    };

    try {
      await db.games.update(numericGameId, updatedGameFields);
      console.log(`Game ${numericGameId} updated successfully with status ${statusToSave}.`);
    } catch (error) {
      console.error('Failed to update game in DB:', error);
      setLocalError(
        `Failed to save game progress: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return Promise.reject(error);
    }
  };

  const handlePerformBookkeeperAction = async (
    action: (bk: Bookkeeper) => void,
    options: { skipViewChange?: boolean; skipSave?: boolean } = {}
  ) => {
    if (!bookkeeperInstance) return;

    const actionName = action.name || action.toString();
    if (actionName.includes('recordPoint')) {
      // No need to setLastCompletedPointEvents here, it will be derived
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

    if (
      newBkInstance.activePoint === null &&
      (newBkInstance.homePlayers === null || newBkInstance.awayPlayers === null)
    ) {
      if (!actionName.includes('recordPoint')) {
        setIsResumingPointMode(false);
        setLastPlayedLine(null);
      }
      setCurrentView('selectLines');
    } else if (
      newBkInstance.activePoint !== null ||
      (newBkInstance.homePlayers !== null && newBkInstance.awayPlayers !== null)
    ) {
      setCurrentView('recordStats');
    } else {
      setCurrentView('selectLines');
    }
  };

  const handleLinesSelected = async () => {
    if (bookkeeperInstance && bookkeeperInstance.homePlayers && bookkeeperInstance.awayPlayers) {
      if (bookkeeperInstance.activePoint === null && !bookkeeperInstance.firstPointOfGameOrHalf()) {
        await handlePerformBookkeeperAction(
          bk => {
            bk.prepareNewPointAfterScore();
          },
          { skipViewChange: true, skipSave: false } // skipSave was false, ensure it's correct
        );
      }
      setCurrentView('recordStats');
    } else {
      console.warn('Lines selected but bookkeeper player lines are not set.');
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
    // lastCompletedPointEvents will be derived from bookkeeperInstance.getLastCompletedPointPrettyPrint()
    setCurrentView('selectLines');
  };

  const handleRecordHalf = async () => {
    if (!bookkeeperInstance) return;
    if (bookkeeperInstance.pointsAtHalf > 0) {
      alert('Half has already been recorded.');
      return;
    }
    await handlePerformBookkeeperAction(bk => bk.recordHalf());
    alert('Half time recorded.');
  };

  const handleSubmitGame = async () => {
    if (!bookkeeperInstance || !storedGame || !numericGameId) {
      alert('Game data or bookkeeper not available for submission.');
      return;
    }

    try {
      // Persist current state with 'submitted' status first
      await persistBookkeeperState(bookkeeperInstance, 'submitted');
      // The useLiveQuery for storedGame should update the UI to reflect "submitted"

      const bkState = bookkeeperInstance.serialize();
      const gameDataForApi: UploadedGamePayload = {
        league_id: bkState.league_id,
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
          events: pJson.events.map(mapModelEventToApiPointEvent),
        })),
      };

      const response = await uploadCompleteGame(gameDataForApi);

      if (response.ok) {
        await persistBookkeeperState(bookkeeperInstance, 'uploaded');
        alert('Game submitted and uploaded successfully!');
      } else {
        const errorText = await response.text();
        let errorMessage = `Failed to submit game: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage += ` - ${errorData.message || errorData.detail || 'Server error'}`;
        } catch {
          errorMessage += ` - ${errorText || 'Server error with no JSON body'}`;
        }
        await persistBookkeeperState(bookkeeperInstance, 'sync-error');
        alert(errorMessage);
      }
    } catch (error) {
      // Ensure state is 'sync-error' if any part of submission fails
      if (bookkeeperInstance) { // Check if bookkeeperInstance is still valid
         await persistBookkeeperState(bookkeeperInstance, 'sync-error');
      }
      alert(
        `An error occurred during game submission: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Submission error:', error);
    }
  };


  if (currentView === 'loading' || (currentView === 'initializing' && !localError)) {
    return (
      <p style={{ padding: '20px' }}>
        {currentView === 'loading' ? 'Loading game data...' : 'Initializing game logic...'}
      </p>
    );
  }

  if (currentView === 'error_state' || localError) {
    return (
      <div style={{ padding: '20px' }}>
        <p style={{ color: 'red' }}>Error: {localError || 'An unexpected error occurred.'}</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  if (!bookkeeperInstance || !storedGame) {
    // This case should ideally be covered by loading/error states,
    // but as a fallback:
    return (
      <div style={{ padding: '20px' }}>
        <p>Game logic or data not available. Please try again or check console for errors.</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  const lastCompletedPointEvents = bookkeeperInstance.getLastCompletedPointPrettyPrint();
  const isHalfRecorded = bookkeeperInstance.pointsAtHalf > 0;

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #eee',
          paddingBottom: '10px',
        }}
      >
        <Link to="/stat_keeper" style={{ display: 'inline-block', fontSize: '1em' }}>
          &larr; StatKeeper Home
        </Link>
        <GameActionsMenu
          numericGameId={numericGameId}
          gameStatus={storedGame.status}
          isHalfRecorded={isHalfRecorded}
          onRecordHalf={handleRecordHalf}
          onSubmitGame={handleSubmitGame}
        />
      </div>
      <h1>
        {storedGame.homeTeam} vs {storedGame.awayTeam}
      </h1>
      <p>
        <strong>Score:</strong> {bookkeeperInstance.homeScore} - {bookkeeperInstance.awayScore}
      </p>
      <p>
        <strong>Status:</strong> <span style={{ fontWeight: 'bold' }}>{storedGame.status}</span>
      </p>
      <hr style={{ margin: '20px 0' }} />

      {currentView === 'selectLines' && (
        <SelectLines
          bookkeeper={bookkeeperInstance}
          homeRoster={storedGame.homeRoster}
          awayRoster={storedGame.awayRoster}
          onPerformAction={handlePerformBookkeeperAction}
          onLinesSelected={handleLinesSelected}
          isResumingPointMode={isResumingPointMode}
          lastPlayedLine={lastPlayedLine}
          lastCompletedPointEvents={lastCompletedPointEvents}
        />
      )}

      {currentView === 'recordStats' && (
        <RecordStats
          bookkeeper={bookkeeperInstance}
          fullHomeRoster={storedGame.homeRoster}
          fullAwayRoster={storedGame.awayRoster}
          onPerformAction={handlePerformBookkeeperAction}
          onPointScored={handlePointScored}
          onChangeLine={handleChangeLine}
        />
      )}
    </div>
  );
}

export default LocalGame;
