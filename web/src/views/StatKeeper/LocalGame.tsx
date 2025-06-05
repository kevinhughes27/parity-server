import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

const ACTION_BAR_HEIGHT = '70px'; // Consistent height for the bottom action bar

function LocalGame() {
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

  useEffect(() => {
    const elem = document.documentElement;
    const requestFullScreen =
      elem.requestFullscreen ||
      (elem as any).mozRequestFullScreen ||
      (elem as any).webkitRequestFullscreen ||
      (elem as any).msRequestFullscreen;

    if (requestFullScreen) {
      requestFullScreen.call(elem).catch((err: Error) => {
        console.warn(`Fullscreen request failed: ${err.message} (${err.name})`);
        // Note: Fullscreen requests usually require a user gesture.
        // Automatic requests might be blocked by the browser.
      });
    }
  }, []); // Run once on mount

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
          activePoint: null,
          firstActor: null,
          homePossession: true,
          pointsAtHalf: 0,
          homePlayers: null,
          awayPlayers: null,
          homeScore: 0,
          awayScore: 0,
          homeParticipants: gameData.homeRoster ? [...gameData.homeRoster].sort((a,b) => a.localeCompare(b)) : [],
          awayParticipants: gameData.awayRoster ? [...gameData.awayRoster].sort((a,b) => a.localeCompare(b)) : [],
        }),
        activePoint: activePointForHydration ? activePointForHydration.toJSON() : null,
        // Ensure participants are sorted when hydrating
        homeParticipants: gameData.bookkeeperState?.homeParticipants ? [...gameData.bookkeeperState.homeParticipants].sort((a,b) => a.localeCompare(b)) : [...gameData.homeRoster].sort((a,b) => a.localeCompare(b)),
        awayParticipants: gameData.bookkeeperState?.awayParticipants ? [...gameData.bookkeeperState.awayParticipants].sort((a,b) => a.localeCompare(b)) : [...gameData.awayRoster].sort((a,b) => a.localeCompare(b)),
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
    [apiLeague]
  );

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
      } else {
        setLocalError(`League details for league ID ${storedGame.league_id} could not be loaded.`);
        setCurrentView('error_state');
      }
    } else if (!isLoadingGameHook && numericGameId !== undefined) {
      setLocalError(`Game with ID ${numericGameId} not found.`);
      setCurrentView('error_state');
      setBookkeeperInstance(null);
    }
  }, [
    storedGame,
    isLoadingGameHook,
    gameErrorHook,
    numericGameId,
    initializeBookkeeper,
    apiLeague,
    isLoadingApiLeague,
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
      // Ensure participants are sorted before saving to bookkeeperState in DB
      homeParticipants: [...serializedData.bookkeeperState.homeParticipants].sort((a,b) => a.localeCompare(b)),
      awayParticipants: [...serializedData.bookkeeperState.awayParticipants].sort((a,b) => a.localeCompare(b)),
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
      // Ensure StoredGame.homeRoster/awayRoster are also sorted
      homeRoster: [...serializedData.bookkeeperState.homeParticipants].sort((a,b) => a.localeCompare(b)),
      awayRoster: [...serializedData.bookkeeperState.awayParticipants].sort((a,b) => a.localeCompare(b)),
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
          { skipViewChange: true, skipSave: false }
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
      await persistBookkeeperState(bookkeeperInstance, 'submitted');
      const bkState = bookkeeperInstance.serialize();
      const gameDataForApi: UploadedGamePayload = {
        league_id: bkState.league_id,
        week: bkState.week,
        homeTeam: bkState.homeTeamName,
        homeScore: bkState.bookkeeperState.homeScore,
        homeRoster: [...bkState.bookkeeperState.homeParticipants].sort((a,b) => a.localeCompare(b)), // Ensure sorted for API
        awayTeam: bkState.awayTeamName,
        awayScore: bkState.bookkeeperState.awayScore,
        awayRoster: [...bkState.bookkeeperState.awayParticipants].sort((a,b) => a.localeCompare(b)), // Ensure sorted for API
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
      if (bookkeeperInstance) {
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
      <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
        <p>
          {currentView === 'loading' ? 'Loading game data...' : 'Initializing game logic...'}
        </p>
      </div>
    );
  }

  if (currentView === 'error_state' || localError) {
    return (
      <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
        <p style={{ color: 'red' }}>Error: {localError || 'An unexpected error occurred.'}</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  if (!bookkeeperInstance || !storedGame) {
    return (
      <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box' }}>
        <p>Game logic or data not available. Please try again or check console for errors.</p>
        <Link to="/stat_keeper">&larr; Back to StatKeeper Home</Link>
      </div>
    );
  }

  const lastCompletedPointEvents = bookkeeperInstance.getLastCompletedPointPrettyPrint();
  const isHalfRecorded = bookkeeperInstance.pointsAtHalf > 0;

  // Sort rosters from storedGame before passing to children
  const sortedHomeRoster = [...storedGame.homeRoster].sort((a, b) => a.localeCompare(b));
  const sortedAwayRoster = [...storedGame.awayRoster].sort((a, b) => a.localeCompare(b));


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 15px', // Reduced padding
          borderBottom: '1px solid #eee',
          backgroundColor: '#f8f9fa', // Light background for top bar
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '5px', // Reduced margin
          }}
        >
          <Link to="/stat_keeper" style={{ fontSize: '0.9em' }}> {/* Slightly smaller link */}
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
        <h1 style={{ fontSize: '1.5em', margin: '0 0 5px 0', textAlign: 'center' }}> {/* Centered title */}
          {storedGame.homeTeam} vs {storedGame.awayTeam}
        </h1>
        <div style={{ textAlign: 'center', fontSize: '0.9em' }}> {/* Centered score/status */}
          <p style={{ margin: '0 0 2px 0' }}>
            <strong>Score:</strong> {bookkeeperInstance.homeScore} - {bookkeeperInstance.awayScore}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Status:</strong> <span style={{ fontWeight: 'bold' }}>{storedGame.status}</span>
          </p>
        </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          paddingBottom: ACTION_BAR_HEIGHT, // Space for the fixed bottom bar
          position: 'relative', // For potential absolutely positioned children if needed
        }}
      >
        {currentView === 'selectLines' && (
          <SelectLines
            bookkeeper={bookkeeperInstance}
            homeRoster={sortedHomeRoster}
            awayRoster={sortedAwayRoster}
            onPerformAction={handlePerformBookkeeperAction}
            onLinesSelected={handleLinesSelected}
            isResumingPointMode={isResumingPointMode}
            lastPlayedLine={lastPlayedLine}
            lastCompletedPointEvents={lastCompletedPointEvents}
            actionBarHeight={ACTION_BAR_HEIGHT}
          />
        )}

        {currentView === 'recordStats' && (
          <RecordStats
            bookkeeper={bookkeeperInstance}
            fullHomeRoster={sortedHomeRoster}
            fullAwayRoster={sortedAwayRoster}
            onPerformAction={handlePerformBookkeeperAction}
            onPointScored={handlePointScored}
            onChangeLine={handleChangeLine}
            actionBarHeight={ACTION_BAR_HEIGHT}
          />
        )}
      </div>
      {/* The fixed action bar is now rendered by SelectLines/RecordStats */}
    </div>
  );
}

export default LocalGame;
