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
  const [actionCounter, setActionCounter] = useState(0); 

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

  const autoSelectNextLines = useCallback(() => {
    if (!bookkeeper || !bookkeeper.gameData) return;

    const game = bookkeeper.gameData;
    let lastPointPlayers = new Set<string>();

    if (game.points.length > 0) {
      const lastPoint = game.points[game.points.length - 1];
      lastPoint.offensePlayers.forEach(p => lastPointPlayers.add(p));
      lastPoint.defensePlayers.forEach(p => lastPointPlayers.add(p));
    }

    if (lastPointPlayers.size === 0) { // First point of the game or no players in last point
      setCurrentHomeLine(game.homeRoster.slice(0, MAX_PLAYERS_ON_LINE));
      setCurrentAwayLine(game.awayRoster.slice(0, MAX_PLAYERS_ON_LINE));
    } else {
      const nextHomeLine = game.homeRoster.filter(p => !lastPointPlayers.has(p)).slice(0, MAX_PLAYERS_ON_LINE);
      const nextAwayLine = game.awayRoster.filter(p => !lastPointPlayers.has(p)).slice(0, MAX_PLAYERS_ON_LINE);
      setCurrentHomeLine(nextHomeLine);
      setCurrentAwayLine(nextAwayLine);
    }
  }, [bookkeeper]);

  useEffect(() => {
    if (numericLocalGameId !== undefined) {
      const bk = new Bookkeeper(numericLocalGameId, db);
      bk.loadGame().then(loaded => {
        if (loaded) {
          setBookkeeper(bk);
          if (bk.gameData) { 
            autoSelectNextLines(); 
          }
          setUiMode('line-selection'); 
          setActionCounter(c => c + 1); 
        } else {
          setBookkeeper(null); 
        }
      });
    }
    return () => {
      setBookkeeper(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [numericLocalGameId]); 

  useEffect(() => {
    if (bookkeeper) {
      setCurrentGameState(bookkeeper.getGameState());
      setPointEventHistory(bookkeeper.getUndoHistory());
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
        if (bookkeeper.firstActor !== player) {
            await bookkeeper.recordPass(player);
        } else {
            return; 
        }
      } else {
        bookkeeper.recordFirstActor(player, isPlayerFromHomeTeamList); 
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
        // Allow starting with fewer than MAX_PLAYERS_ON_LINE if necessary, but not empty.
        alert('Please select players for both lines.');
        return;
      }
      bookkeeper.setCurrentLine(currentHomeLine, currentAwayLine);
      setUiMode('stat-taking');
    } else { // Switching from 'stat-taking' to 'line-selection'
      setUiMode('line-selection');
      autoSelectNextLines(); 
    }
    triggerRefresh();
  };
  
  const handleBookkeeperAction = async (actionKey: keyof Bookkeeper | 'undo' | 'recordHalf') => {
    if (!bookkeeper) return;

    let actionFnToExecute: (() => Promise<void> | void) | undefined;

    if (actionKey === 'undo') {
      actionFnToExecute = bookkeeper.undo.bind(bookkeeper);
    } else if (actionKey === 'recordHalf') {
      actionFnToExecute = bookkeeper.recordHalf.bind(bookkeeper);
    } else {
      const method = bookkeeper[actionKey as keyof Bookkeeper];
      if (typeof method === 'function') {
        actionFnToExecute = method.bind(bookkeeper);
      }
    }

    if (!actionFnToExecute) {
      console.error("Invalid action key for bookkeeper action:", actionKey);
      return;
    }
    
    await actionFnToExecute(); 
    triggerRefresh(); 

    // After a point is scored, switch to line selection and auto-select.
    if (actionKey === 'recordPoint' && bookkeeper.activePoint === null) {
      setUiMode('line-selection');
      autoSelectNextLines(); 
    }
  };

  const renderPlayerButton = (player: string, isHomeTeamPlayerList: boolean, onField: boolean) => {
    const isPlayerSelectedForLine = (isHomeTeamPlayerList ? currentHomeLine : currentAwayLine).includes(player);
    let isDisabled = false;
    let buttonStyle: React.CSSProperties = { margin: '5px', padding: '10px', cursor: 'pointer', minWidth: '120px', textAlign: 'center', borderRadius: '4px' };

    if (uiMode === 'line-selection') {
      if (isPlayerSelectedForLine) {
        buttonStyle.backgroundColor = '#d4edda'; 
        buttonStyle.borderColor = '#c3e6cb';
      } else {
        buttonStyle.backgroundColor = '#f8f9fa'; 
      }
    } else if (uiMode === 'stat-taking' && bookkeeper) {
        const playerIsFirstActor = bookkeeper.isFirstActor(player);
        const playerListTeamHasPossession = bookkeeper.homePossession === isHomeTeamPlayerList;

        if (!onField) { 
            isDisabled = true;
            buttonStyle.opacity = 0.3;
        } else {
            if (currentGameState === GameState.Start) { 
                isDisabled = false; 
            } else if (currentGameState === GameState.Pull) {
                isDisabled = true; 
            } else if (currentGameState === GameState.WhoPickedUpDisc) {
                isDisabled = !playerListTeamHasPossession; 
            } else { 
                if (bookkeeper.firstActor) { 
                    if (playerListTeamHasPossession) { 
                        isDisabled = playerIsFirstActor; 
                    } else { 
                        isDisabled = false; 
                    }
                } else { 
                    isDisabled = true; 
                }
            }
        }
        if (playerIsFirstActor) {
            buttonStyle.border = '3px solid #007bff'; 
            buttonStyle.fontWeight = 'bold';
        }
        if (isDisabled && onField) { 
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

  const actionButtonsConfig = [
    { label: 'Pull', actionKey: 'recordPull', states: [GameState.Pull] },
    { label: 'Point', actionKey: 'recordPoint', states: [GameState.Normal, GameState.SecondD, GameState.FirstD, GameState.FirstThrowQuebecVariant] },
    { label: 'Drop', actionKey: 'recordDrop', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.SecondD] },
    { label: 'D', actionKey: 'recordD', states: [GameState.FirstD, GameState.SecondD, GameState.Normal] },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <Link to="/stat_keeper">&larr; StatKeeper Home</Link>
        <button onClick={handleModeSwitch} style={{ padding: '10px 15px' }}>
          {uiMode === 'line-selection' ? (currentHomeLine.length >= MAX_PLAYERS_ON_LINE && currentAwayLine.length >= MAX_PLAYERS_ON_LINE ? 'Confirm Lines & Start Point' : `Select Lines (${MAX_PLAYERS_ON_LINE} per team)`) : 'Change Line / Pause Point'}
        </button>
        <Link to={`/stat_keeper/edit_game/${game.localId}`}>
          <button>Edit Game Details</button>
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1>{game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}</h1>
        <p>Week: {game.week} | League: {getLeagueName(game.league_id)} | Status: {game.status}</p>
        <p>Possession: {bookkeeper.activePoint ? (bookkeeper.homePossession ? game.homeTeam : game.awayTeam) : "N/A (Point not started)"}</p>
        <p>Current Game State: {GameState[currentGameState]} ({currentGameState})</p>
        {bookkeeper.firstActor && <p>Player with Disc/Action: {bookkeeper.firstActor}</p>}
      </div>

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
            } else if (btn.label !== 'Undo' && btn.label !== 'Record Half') { 
                isDisabled = isDisabled || !bookkeeper.firstActor;
            }

            return (
                <button
                key={btn.label}
                onClick={() => handleBookkeeperAction(btn.actionKey as keyof Bookkeeper | 'undo' | 'recordHalf')}
                disabled={isDisabled}
                style={{padding: '10px 15px'}}
                >
                {btn.label}
                </button>
            );
        })}
          <button onClick={() => handleBookkeeperAction('undo')} style={{padding: '10px 15px', backgroundColor: '#ffc107'}}>Undo</button>
          <button onClick={() => handleBookkeeperAction('recordHalf')} style={{padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white'}}>Record Half</button>
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
