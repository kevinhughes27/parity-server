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

  // useLiveQuery still useful to get initial game data or reflect external changes
  // but Bookkeeper instance will be the primary source of truth for active game play.
  const storedGameFromDb = useLiveQuery<StoredGame | undefined | typeof LOADING_SENTINEL>(
    async () => {
      if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
        return undefined;
      }
      return db.games.get(numericLocalGameId);
    },
    [numericLocalGameId],
    LOADING_SENTINEL
  );

  // Initialize Bookkeeper instance ONCE when component mounts for a specific game ID, or when game ID changes.
  useEffect(() => {
    if (numericLocalGameId !== undefined) {
      console.log("LocalGame: Initializing Bookkeeper for game ID:", numericLocalGameId);
      const bk = new Bookkeeper(numericLocalGameId, db);
      bk.loadGame().then(loaded => {
        if (loaded) {
          setBookkeeper(bk);
          // Set initial UI mode. If bk.activePoint exists, game might have been in progress.
          // For simplicity on component load, always start with line selection.
          // More advanced logic could inspect bk.activePoint or a persisted UI state.
          setUiMode('line-selection');
          setCurrentHomeLine([]);
          setCurrentAwayLine([]);
          setActionCounter(c => c + 1); // Trigger refresh for initial state
        } else {
          console.error("Bookkeeper failed to load game:", numericLocalGameId);
          setBookkeeper(null); 
        }
      });
    }

    // Cleanup: Clear bookkeeper when the component unmounts or gameId changes
    return () => {
      console.log("LocalGame: Cleaning up Bookkeeper for game ID:", numericLocalGameId);
      setBookkeeper(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [numericLocalGameId]); // Rerun ONLY if numericLocalGameId changes.

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

    if (bookkeeper.firstActor) { 
      const tappedPlayerTeamHasPossession = bookkeeper.homePossession === isPlayerFromHomeTeamList;
      if (tappedPlayerTeamHasPossession) {
        if (bookkeeper.firstActor !== player) { // Cannot pass to self
            await bookkeeper.recordPass(player);
        } else {
            console.log("Cannot pass to self."); // Or provide user feedback
            return; // Do nothing if tapping self
        }
      } else {
        // Tapped player is on defense. This action should ideally be through a "D" or "Catch D" button
        // where 'player' would be set as bookkeeper.firstActor before calling recordD/recordCatchD.
        // Direct tap on defender might imply selecting them as the actor for a D.
        bookkeeper.recordFirstActor(player, isPlayerFromHomeTeamList); // Selects the defender
        // UI should then enable D/CatchD buttons.
        console.log(`${player} selected on defense. Press D or Catch D.`);
      }
    } else { 
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
      setUiMode('stat-taking');
    } else {
      setUiMode('line-selection');
    }
    triggerRefresh();
  };
  
  const handleBookkeeperAction = async (actionFn: () => Promise<void> | void) => {
    if (!bookkeeper) return;
    // Ensure firstActor is set for actions that require it, if not set by player tap
    // This is particularly for action buttons like D, CatchD, Drop, ThrowAway, Point
    if (!bookkeeper.firstActor && 
        (currentGameState === GameState.Normal || 
         currentGameState === GameState.FirstD || 
         currentGameState === GameState.SecondD ||
         currentGameState === GameState.FirstThrowQuebecVariant)) {
        // These states imply someone should have the disc or just made a play
        // Exception: Pull button is enabled when firstActor is set in GameState.Pull
        alert("Please select the player who made the action first.");
        return;
    }
    await actionFn();
    triggerRefresh();
  };


  // --- Render Helper for Player Buttons ---
  const renderPlayerButton = (player: string, isHomeTeamPlayerList: boolean, onField: boolean) => {
    const isPlayerSelectedForLine = (isHomeTeamPlayerList ? currentHomeLine : currentAwayLine).includes(player);
    let isDisabled = false;
    let buttonStyle: React.CSSProperties = { margin: '5px', padding: '10px', cursor: 'pointer', minWidth: '120px', textAlign: 'center', borderRadius: '4px' };

    if (uiMode === 'line-selection') {
      if (isPlayerSelectedForLine) {
        buttonStyle.backgroundColor = '#d4edda'; // Light green for selected
        buttonStyle.borderColor = '#c3e6cb';
      } else {
        buttonStyle.backgroundColor = '#f8f9fa'; // Default light grey
      }
    } else if (uiMode === 'stat-taking' && bookkeeper) {
        const playerIsFirstActor = bookkeeper.isFirstActor(player);
        const playerTeamHasPossession = bookkeeper.teamHasPossession(isHomeTeamPlayerList); // Team of the list this player belongs to

        if (!onField) { // Player not on the current line
            isDisabled = true;
            buttonStyle.opacity = 0.3;
        } else {
            // Player is on the field
            if (currentGameState === GameState.Start) { // Selecting puller or first receiver
                // Any player on the field can be selected as first actor
                isDisabled = false; 
            } else if (currentGameState === GameState.Pull) {
                // Only the designated puller (firstActor) should be "active", others disabled for player actions
                // But all player buttons are for selection, not action. Pull button is separate.
                // So, no player should be "disabled" from being tapped to become firstActor if needed.
                // This state means puller is selected, waiting for PULL button.
                isDisabled = true; // Disable tapping players once puller is set and waiting for pull button
            } else if (currentGameState === GameState.WhoPickedUpDisc) {
                isDisabled = !playerTeamHasPossession; // Only players on the team that gained possession can be tapped
            } else { // Normal, FirstD, SecondD, FirstThrowQuebecVariant
                if (bookkeeper.firstActor) { // Someone has the disc
                    if (playerTeamHasPossession) { // Player is on offense
                        isDisabled = playerIsFirstActor; // Can't pass to self
                    } else { // Player is on defense
                        isDisabled = false; // Defender can be tapped to select them for a D action
                    }
                } else { // Disc is loose (e.g. after D, waiting for pickup) - should be WhoPickedUpDisc
                    isDisabled = true; // Should not happen if state logic is correct
                }
            }
        }
        if (playerIsFirstActor) {
            buttonStyle.border = '3px solid #007bff'; // Blue border for firstActor
            buttonStyle.fontWeight = 'bold';
        }
        if (isDisabled && onField) { // Dim if disabled but on field
             buttonStyle.opacity = 0.6;
        }
    }


    return (
      <button
        key={player}
        onClick={() => uiMode === 'line-selection' ? handlePlayerToggleLine(player, isHomeTeamPlayerList) : (onField ? handlePlayerTapStatTaking(player, isHomeTeamPlayerList) : {})}
        disabled={uiMode === 'stat-taking' && isDisabled}
        style={buttonStyle}
      >
        {player}
      </button>
    );
  };

  // --- Action Button Configuration ---
  const actionButtonsConfig = [
    { label: 'Pull', actionKey: 'recordPull', states: [GameState.Pull] },
    { label: 'Point', actionKey: 'recordPoint', states: [GameState.Normal, GameState.SecondD, GameState.FirstD, GameState.FirstThrowQuebecVariant] }, // Can score from various states if player has disc
    { label: 'Drop', actionKey: 'recordDrop', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.SecondD] }, // Can drop if has disc
    { label: 'D', actionKey: 'recordD', states: [GameState.FirstD, GameState.SecondD, GameState.Normal] }, // Can D if opponent has disc (Normal) or if selected after turnover (FirstD, SecondD)
    { label: 'Catch D', actionKey: 'recordCatchD', states: [GameState.FirstD, GameState.SecondD, GameState.Normal] },
    { label: 'Throw Away', actionKey: 'recordThrowAway', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.SecondD] },
  ];


  if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
    return <div style={{ padding: '20px' }}><p>Invalid game ID.</p><Link to="/stat_keeper">Back to StatKeeper Home</Link></div>;
  }
  if (storedGameFromDb === LOADING_SENTINEL || !bookkeeper || !bookkeeper.gameData) {
    return <p style={{ padding: '20px' }}>Loading game data and bookkeeper...</p>;
  }
  
  const game = bookkeeper.gameData; 

  return (
    <div style={{ padding: '20px' }}>
      {/* Header and Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <Link to="/stat_keeper">&larr; StatKeeper Home</Link>
        <button onClick={handleModeSwitch} style={{ padding: '10px 15px' }}>
          {uiMode === 'line-selection' ? (currentHomeLine.length >= MAX_PLAYERS_ON_LINE && currentAwayLine.length >= MAX_PLAYERS_ON_LINE ? 'Confirm Lines & Start Point' : `Select Lines (${MAX_PLAYERS_ON_LINE} per team)`) : 'Change Line / Pause Point'}
        </button>
        <Link to={`/stat_keeper/edit_game/${game.localId}`}>
          <button>Edit Game Details</button>
        </Link>
      </div>

      {/* Score and Game Info */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1>{game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}</h1>
        <p>Week: {game.week} | League: {getLeagueName(game.league_id)} | Status: {game.status}</p>
        <p>Possession: {bookkeeper.activePoint ? (bookkeeper.homePossession ? game.homeTeam : game.awayTeam) : "N/A (Point not started)"}</p>
        <p>Current Game State: {GameState[currentGameState]} ({currentGameState})</p>
        {bookkeeper.firstActor && <p>Player with Disc/Action: {bookkeeper.firstActor}</p>}
      </div>

      {/* Player Lists */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ width: '48%' }}>
          <h3>{game.homeTeam} {uiMode === 'line-selection' ? `(${currentHomeLine.length}/${MAX_PLAYERS_ON_LINE})` : `(Line: ${currentHomeLine.length})`}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            {(uiMode === 'line-selection' ? game.homeRoster : currentHomeLine).map(player =>
              renderPlayerButton(player, true, currentHomeLine.includes(player))
            )}
          </div>
        </div>

        <div style={{ width: '48%' }}>
          <h3>{game.awayTeam} {uiMode === 'line-selection' ? `(${currentAwayLine.length}/${MAX_PLAYERS_ON_LINE})` : `(Line: ${currentAwayLine.length})`}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            {(uiMode === 'line-selection' ? game.awayRoster : currentAwayLine).map(player =>
              renderPlayerButton(player, false, currentAwayLine.includes(player))
            )}
          </div>
        </div>
      </div>
      
      {uiMode === 'stat-taking' && (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          {actionButtonsConfig.map(btn => {
            let isDisabled = !btn.states.includes(currentGameState);
            if (btn.label === 'Pull') {
                isDisabled = currentGameState !== GameState.Pull || !bookkeeper.firstActor;
            } else if (btn.label !== 'Undo' && btn.label !== 'Record Half') { // Most actions require a firstActor
                isDisabled = isDisabled || !bookkeeper.firstActor;
            }

            return (
                <button
                key={btn.label}
                onClick={() => {
                    const actionMethod = bookkeeper?.[btn.actionKey as keyof Bookkeeper];
                    if (typeof actionMethod === 'function') {
                        handleBookkeeperAction(actionMethod.bind(bookkeeper));
                    }
                }}
                disabled={isDisabled}
                style={{padding: '10px 15px'}}
                >
                {btn.label}
                </button>
            );
        })}
          <button onClick={() => handleBookkeeperAction(bookkeeper.undo)} style={{padding: '10px 15px', backgroundColor: '#ffc107'}}>Undo</button>
          <button onClick={() => handleBookkeeperAction(bookkeeper.recordHalf)} style={{padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white'}}>Record Half</button>
        </div>
      )}

      {uiMode === 'stat-taking' && pointEventHistory.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <h4>Current Point Events:</h4>
          <ul style={{ listStyleType: 'decimal', paddingLeft: '20px' }}>
            {pointEventHistory.map((eventStr, index) => (
              <li key={index}>{eventStr}</li>
            ))}
          </ul>
        </div>
      )}
       <details style={{marginTop: '20px'}}>
            <summary>View All Game Points ({game.points.length})</summary>
            {game.points.map((p, pointIndex) => (
                <div key={pointIndex} style={{border: '1px solid #ddd', margin: '5px', padding: '5px'}}>
                    <h5>Point {pointIndex + 1} (O: {p.offensePlayers.join(', ') || 'N/A'}, D: {p.defensePlayers.join(', ') || 'N/A'})</h5>
                    <ul style={{listStyleType: 'decimal', paddingLeft: '20px'}}>
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
