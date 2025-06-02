import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';
import { leagues } from '../../api';
import { Bookkeeper } from './Bookkeeper';
import { GameState } from './models/GameState';
import { EventType } from './models/EventModel';

const getLeagueName = (leagueId: string): string => {
  const league = leagues.find(l => l.id === leagueId);
  return league ? league.name : `Unknown League (${leagueId})`;
};

const LOADING_SENTINEL = Symbol("loading_game_data");
const MAX_PLAYERS_ON_LINE = 7;

type UiMode = 'line-selection' | 'stat-taking';

function LocalGame() {
  const { localGameId } = useParams<{ localGameId: string }>();
  const numericLocalGameId = localGameId ? parseInt(localGameId, 10) : undefined;

  const [bookkeeper, setBookkeeper] = useState<Bookkeeper | null>(null);
  const [uiMode, setUiMode] = useState<UiMode>('line-selection');
  const [currentHomeLine, setCurrentHomeLine] = useState<string[]>([]);
  const [currentAwayLine, setCurrentAwayLine] = useState<string[]>([]);
  const [currentGameState, setCurrentGameState] = useState<GameState>(GameState.Start);
  const [pointEventHistory, setPointEventHistory] = useState<string[]>([]);
  const [actionCounter, setActionCounter] = useState(0); // Used to trigger UI refresh after bookkeeper actions

  const storedGame = useLiveQuery<StoredGame | undefined | typeof LOADING_SENTINEL>(
    async () => {
      if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
        return undefined;
      }
      return db.games.get(numericLocalGameId);
    },
    [numericLocalGameId],
    LOADING_SENTINEL
  );

  // Initialize Bookkeeper when game data is loaded
  useEffect(() => {
    if (storedGame && storedGame !== LOADING_SENTINEL && numericLocalGameId !== undefined) {
      const bk = new Bookkeeper(numericLocalGameId, db);
      bk.loadGame().then(loaded => {
        if (loaded) {
          setBookkeeper(bk);
          // If game was in progress, UI might need to switch to 'stat-taking'
          // and potentially load active lines if they were persisted.
          // For now, default to line-selection.
          setUiMode('line-selection');
          setCurrentHomeLine([]); // Reset lines on game load
          setCurrentAwayLine([]);
        } else {
          // Handle game not loaded error
        }
      });
    }
  }, [storedGame, numericLocalGameId]);

  // Update UI relevant state from bookkeeper after any action
  useEffect(() => {
    if (bookkeeper) {
      setCurrentGameState(bookkeeper.getGameState());
      setPointEventHistory(bookkeeper.getUndoHistory());
      // Scores and other game data are directly read from bookkeeper.gameData in render
    }
  }, [bookkeeper, actionCounter]);

  const triggerRefresh = useCallback(() => {
    setActionCounter(c => c + 1);
  }, []);

  const handlePlayerToggleLine = (player: string, isHomeTeam: boolean) => {
    if (uiMode !== 'line-selection') return;

    const currentLine = isHomeTeam ? currentHomeLine : currentAwayLine;
    const setCurrentLine = isHomeTeam ? setCurrentHomeLine : setCurrentAwayLine;

    if (currentLine.includes(player)) {
      setCurrentLine(currentLine.filter(p => p !== player));
    } else {
      if (currentLine.length < MAX_PLAYERS_ON_LINE) {
        setCurrentLine([...currentLine, player]);
      } else {
        alert(`Maximum ${MAX_PLAYERS_ON_LINE} players allowed on the line.`);
      }
    }
  };

  const handlePlayerTapStatTaking = async (player: string, isPlayerFromHomeTeamList: boolean) => {
    if (!bookkeeper || uiMode !== 'stat-taking') return;

    if (bookkeeper.firstActor) { // A player already has the disc or initiated an action
      // Check if the tapped player is on the team with possession
      const tappedPlayerTeamHasPossession = bookkeeper.homePossession === isPlayerFromHomeTeamList;
      if (tappedPlayerTeamHasPossession) {
        await bookkeeper.recordPass(player);
      } else {
        // Tapped player is on defense, potential D
        // UI needs to be more specific: was it a D or CatchD?
        // For now, let's assume a generic D if a defender is tapped.
        // This part needs more refined UI controls (separate D / CatchD buttons are better)
        console.warn("Tapped defender; D/CatchD logic needs specific buttons.");
        // bookkeeper.firstActor = player; // Set defender as actor
        // await bookkeeper.recordD(); // or recordCatchD
      }
    } else { // No firstActor, usually means disc is loose or waiting for puller/receiver
      bookkeeper.recordFirstActor(player, isPlayerFromHomeTeamList);
    }
    triggerRefresh();
  };

  const handleModeSwitch = () => {
    if (!bookkeeper) return;

    if (uiMode === 'line-selection') {
      if (currentHomeLine.length === 0 || currentAwayLine.length === 0) {
        alert('Please select players for both lines.');
        return;
      }
      bookkeeper.setCurrentLine(currentHomeLine, currentAwayLine);
      // If it's the start of a point (GameState.Start), and a puller needs to be selected,
      // the UI should guide that. For now, assume lines are set, and first action will be puller selection.
      setUiMode('stat-taking');
      // If GameState.Start, next action is typically selecting puller via recordFirstActor
    } else {
      // Potentially pause point, or just switch to line selection for next point
      setUiMode('line-selection');
      // Consider if activePoint should be cleared or saved if point is "paused"
    }
    triggerRefresh();
  };
  
  const handleBookkeeperAction = async (action: () => Promise<void>) => {
    if (!bookkeeper) return;
    await action();
    triggerRefresh();
  };


  // --- Render Helper for Player Buttons ---
  const renderPlayerButton = (player: string, isHomeTeamPlayerList: boolean, onField: boolean) => {
    const isPlayerSelectedForLine = (isHomeTeamPlayerList ? currentHomeLine : currentAwayLine).includes(player);
    let isDisabled = false;
    let buttonText = player;
    let buttonStyle: React.CSSProperties = { margin: '5px', padding: '10px', cursor: 'pointer', minWidth: '120px', textAlign: 'center' };

    if (uiMode === 'line-selection') {
      if (isPlayerSelectedForLine) {
        buttonStyle.backgroundColor = '#a0e0a0'; // Greenish for selected
      }
    } else if (uiMode === 'stat-taking' && bookkeeper) {
        // Logic from Stats.java updateUI
        const playerIsFirstActor = bookkeeper.isFirstActor(player);
        const playerTeamHasPossession = bookkeeper.teamHasPossession(isHomeTeamPlayerList);

        if (currentGameState === GameState.Start || currentGameState === GameState.Pull) {
            isDisabled = currentGameState === GameState.Pull && !playerIsFirstActor; // Only puller active in Pull state
        } else if (currentGameState === GameState.WhoPickedUpDisc) {
            isDisabled = !playerTeamHasPossession; // Only team with possession can pick up
        } else { // Normal, FirstD, SecondD, FirstThrowQuebecVariant
            if (playerTeamHasPossession) {
                isDisabled = playerIsFirstActor; // Can't pass to self
            } else { // Player is on defense
                // Enable if firstActor is set (offense has disc) - defender can make a D
                // Or if disc is loose and defender can pick up (covered by WhoPickedUpDisc)
                isDisabled = !bookkeeper.firstActor; 
            }
        }
        if (!onField) isDisabled = true; // Not on the field, disabled for stat-taking actions

        if (playerIsFirstActor) buttonStyle.border = '2px solid blue';
        if (isDisabled) buttonStyle.opacity = 0.5;
    }


    return (
      <button
        key={player}
        onClick={() => uiMode === 'line-selection' ? handlePlayerToggleLine(player, isHomeTeamPlayerList) : (onField ? handlePlayerTapStatTaking(player, isHomeTeamPlayerList) : {})}
        disabled={uiMode === 'stat-taking' && (isDisabled || !onField)}
        style={buttonStyle}
      >
        {buttonText}
      </button>
    );
  };

  // --- Action Button Configuration ---
  const actionButtonsConfig = [
    { label: 'Pull', action: () => bookkeeper?.recordPull(), states: [GameState.Pull] },
    { label: 'Point', action: () => bookkeeper?.recordPoint(), states: [GameState.Normal, GameState.SecondD] },
    { label: 'Drop', action: () => bookkeeper?.recordDrop(), states: [GameState.Normal] },
    { label: 'D', action: () => bookkeeper?.recordD(), states: [GameState.FirstD] }, // D implies defender is firstActor
    { label: 'Catch D', action: () => bookkeeper?.recordCatchD(), states: [GameState.FirstD] }, // CatchD implies defender is firstActor
    { label: 'Throw Away', action: () => bookkeeper?.recordThrowAway(), states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.SecondD] },
  ];


  if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
    return <div style={{ padding: '20px' }}><p>Invalid game ID.</p><Link to="/stat_keeper">Back to StatKeeper Home</Link></div>;
  }
  if (storedGame === LOADING_SENTINEL || !bookkeeper || !bookkeeper.gameData) {
    return <p style={{ padding: '20px' }}>Loading game data and bookkeeper...</p>;
  }
  if (!storedGame) { // Should be caught by LOADING_SENTINEL or bookkeeper init
    return <div style={{ padding: '20px' }}><p>Game with ID {localGameId} not found.</p><Link to="/stat_keeper">Back to StatKeeper Home</Link></div>;
  }
  
  const game = bookkeeper.gameData; // Use gameData from bookkeeper as source of truth after init

  return (
    <div style={{ padding: '20px' }}>
      {/* Header and Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <Link to="/stat_keeper">&larr; StatKeeper Home</Link>
        <button onClick={handleModeSwitch} style={{ padding: '10px 15px' }}>
          {uiMode === 'line-selection' ? (currentHomeLine.length > 0 || currentAwayLine.length > 0 ? 'Confirm Line & Start Point' : 'Select Lines') : 'Change Line / Pause Point'}
        </button>
        <Link to={`/stat_keeper/edit_game/${game.localId}`}>
          <button>Edit Game Details</button>
        </Link>
      </div>

      {/* Score and Game Info */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1>{game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}</h1>
        <p>Week: {game.week} | League: {getLeagueName(game.league_id)} | Status: {game.status}</p>
        <p>Possession: {bookkeeper.homePossession ? game.homeTeam : game.awayTeam}</p>
        <p>Current Game State: {GameState[currentGameState]} ({currentGameState})</p>
        {bookkeeper.firstActor && <p>Player with Disc: {bookkeeper.firstActor}</p>}
      </div>

      {/* Player Lists */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        {/* Home Team Players */}
        <div style={{ width: '45%' }}>
          <h3>{game.homeTeam} {uiMode === 'line-selection' ? `(${currentHomeLine.length}/${MAX_PLAYERS_ON_LINE})` : '(On Field)'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {(uiMode === 'line-selection' ? game.homeRoster : currentHomeLine).map(player =>
              renderPlayerButton(player, true, currentHomeLine.includes(player))
            )}
          </div>
        </div>

        {/* Away Team Players */}
        <div style={{ width: '45%' }}>
          <h3>{game.awayTeam} {uiMode === 'line-selection' ? `(${currentAwayLine.length}/${MAX_PLAYERS_ON_LINE})` : '(On Field)'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {(uiMode === 'line-selection' ? game.awayRoster : currentAwayLine).map(player =>
              renderPlayerButton(player, false, currentAwayLine.includes(player))
            )}
          </div>
        </div>
      </div>
      
      {/* Action Buttons - only visible in stat-taking mode */}
      {uiMode === 'stat-taking' && (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          {actionButtonsConfig.map(btn => (
            <button
              key={btn.label}
              onClick={() => btn.action && handleBookkeeperAction(btn.action)}
              disabled={!btn.states.includes(currentGameState) || !bookkeeper.firstActor && !['Pull'].includes(btn.label) } // Pull can be done by selected puller (firstActor)
              style={{padding: '10px 15px'}}
            >
              {btn.label}
            </button>
          ))}
          <button onClick={() => handleBookkeeperAction(bookkeeper.undo)} style={{padding: '10px 15px', backgroundColor: 'orange'}}>Undo</button>
          <button onClick={() => handleBookkeeperAction(bookkeeper.recordHalf)} style={{padding: '10px 15px'}}>Record Half</button>
        </div>
      )}

      {/* Event History */}
      {uiMode === 'stat-taking' && pointEventHistory.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <h4>Current Point Events:</h4>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {pointEventHistory.map((eventStr, index) => (
              <li key={index}>{eventStr}</li>
            ))}
          </ul>
        </div>
      )}
       {/* Display all game points for review */}
       <details style={{marginTop: '20px'}}>
            <summary>View All Game Points ({game.points.length})</summary>
            {game.points.map((p, pointIndex) => (
                <div key={pointIndex} style={{border: '1px solid #ddd', margin: '5px', padding: '5px'}}>
                    <h5>Point {pointIndex + 1} (O: {p.offensePlayers.join(', ') || 'N/A'}, D: {p.defensePlayers.join(', ') || 'N/A'})</h5>
                    <ul>
                        {p.events.map((e, eventIndex) => (
                            <li key={eventIndex}>{e.type}: {e.firstActor} {e.secondActor ? `to ${e.secondActor}` : ''}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </details>
    </div>
  );
}

export default LocalGame;
