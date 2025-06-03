import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';
import { leagues, ClientLeague } from '../../api'; 
import { Bookkeeper } from './Bookkeeper';
import { GameState } from './models/GameState';
import { EventType } from './models/EventModel';

const getLeagueName = (leagueId: string): string => {
  const league = leagues.find(l => l.id.toString() === leagueId); 
  return league ? league.name : `Unknown League (${leagueId})`;
};

const LOADING_SENTINEL = Symbol("loading_game_data");

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
  const [leagueLineSize, setLeagueLineSize] = useState<number>(7);
  const [selectingDTargetFor, setSelectingDTargetFor] = useState<string | null>(null); 

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
  
  useEffect(() => {
    if (bookkeeper?.gameData?.league_id) {
      const currentLeague = leagues.find(l => l.id.toString() === bookkeeper.gameData.league_id);
      if (currentLeague && typeof currentLeague.lineSize === 'number') {
        setLeagueLineSize(currentLeague.lineSize);
      } else {
        setLeagueLineSize(7); 
      }
    }
  }, [bookkeeper?.gameData?.league_id]);


  const autoSelectNextLines = useCallback(() => {
    if (!bookkeeper || !bookkeeper.gameData) return;

    const game = bookkeeper.gameData;
    const currentLineSize = leagueLineSize; 
    let lastPointPlayers = new Set<string>();

    if (game.points.length > 0) {
      const lastPoint = game.points[game.points.length - 1];
      lastPoint.offensePlayers.forEach(p => lastPointPlayers.add(p));
      lastPoint.defensePlayers.forEach(p => lastPointPlayers.add(p));
    }

    if (lastPointPlayers.size === 0) { 
      setCurrentHomeLine(game.homeRoster.slice(0, currentLineSize));
      setCurrentAwayLine(game.awayRoster.slice(0, currentLineSize));
    } else {
      const nextHomeLine = game.homeRoster.filter(p => !lastPointPlayers.has(p)).slice(0, currentLineSize);
      const nextAwayLine = game.awayRoster.filter(p => !lastPointPlayers.has(p)).slice(0, currentLineSize);
      setCurrentHomeLine(nextHomeLine);
      setCurrentAwayLine(nextAwayLine);
    }
  }, [bookkeeper, leagueLineSize]);

  useEffect(() => {
    if (numericLocalGameId !== undefined) {
      const bk = new Bookkeeper(numericLocalGameId, db);
      bk.loadGame().then(loaded => {
        if (loaded) {
          setBookkeeper(bk);
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
  }, [numericLocalGameId]); 

  useEffect(() => {
    if (bookkeeper && bookkeeper.gameData && leagueLineSize > 0) { 
        autoSelectNextLines();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookkeeper?.gameData, leagueLineSize]);


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
      if (currentLine.length < leagueLineSize) { 
        setCurrentLine([...currentLine, player]);
      } else {
        alert(`Maximum ${leagueLineSize} players allowed on the line.`);
      }
    }
  };

  const handlePlayerTapStatTaking = async (player: string, isPlayerFromHomeTeamList: boolean) => {
    if (!bookkeeper || uiMode !== 'stat-taking') return;

    if (selectingDTargetFor) { 
        const defenderIsHome = bookkeeper.gameData.homeRoster.includes(selectingDTargetFor);
        if (defenderIsHome === isPlayerFromHomeTeamList) {
            alert("Select a player from the opposing team (who was on offense).");
            return;
        }
        await bookkeeper.recordD(selectingDTargetFor, player);
        setSelectingDTargetFor(null);
    } else if (bookkeeper.firstActor) { 
      const tappedPlayerTeamHasPossession = bookkeeper.homePossession === isPlayerFromHomeTeamList;
      if (tappedPlayerTeamHasPossession) {
        if (bookkeeper.firstActor !== player) { // Can't pass to self
            await bookkeeper.recordPass(player);
        } else {
            return; 
        }
      } else { // Tapped player is on defense - select them as the active defender
        bookkeeper.recordFirstActor(player, isPlayerFromHomeTeamList); 
      }
    } else { // No firstActor yet for the current action sequence
      bookkeeper.recordFirstActor(player, isPlayerFromHomeTeamList);
    }
    triggerRefresh();
  };

  const handleModeSwitch = () => {
    if (!bookkeeper) return;
    setSelectingDTargetFor(null); 

    if (uiMode === 'line-selection') {
      if (currentHomeLine.length === 0 || currentAwayLine.length === 0) {
        alert('Please select players for both lines.');
        return;
      }
      if (currentHomeLine.length !== leagueLineSize || currentAwayLine.length !== leagueLineSize) {
        if (!window.confirm(`Lines are not full (${leagueLineSize} players per team). Continue anyway?`)) {
            return;
        }
      }
      bookkeeper.setCurrentLine(currentHomeLine, currentAwayLine);
      setUiMode('stat-taking');
    } else { 
      setUiMode('line-selection');
      autoSelectNextLines(); 
    }
    triggerRefresh();
  };
  
  const handleBookkeeperAction = async (actionKey: keyof Bookkeeper | 'undo' | 'recordHalf' | 'D_initiate' | 'CatchD_initiate') => {
    if (!bookkeeper) return;
    
    let actionFnToExecute: (() => Promise<void> | void) | undefined;

    if (actionKey === 'undo') {
      actionFnToExecute = bookkeeper.undo.bind(bookkeeper);
      setSelectingDTargetFor(null); // Clear D target selection on undo
    } else if (actionKey === 'recordHalf') {
      actionFnToExecute = bookkeeper.recordHalf.bind(bookkeeper);
      setSelectingDTargetFor(null);
    } else if (actionKey === 'D_initiate') {
        if (bookkeeper.firstActor) {
            setSelectingDTargetFor(bookkeeper.firstActor); 
            triggerRefresh(); 
            return; 
        } else {
            alert("Select the player who made the D first by tapping them.");
            return;
        }
    } else if (actionKey === 'CatchD_initiate') {
        if (bookkeeper.firstActor) {
            actionFnToExecute = () => bookkeeper.recordCatchD(bookkeeper.firstActor!);
            setSelectingDTargetFor(null);
        } else {
            alert("Select the player who made the Catch D first by tapping them.");
            return;
        }
    } else {
      const method = bookkeeper[actionKey as keyof Bookkeeper];
      if (typeof method === 'function') {
        actionFnToExecute = method.bind(bookkeeper);
        setSelectingDTargetFor(null);
      }
    }

    if (!actionFnToExecute) {
      console.error("Invalid action key or setup for bookkeeper action:", actionKey);
      return;
    }
    
    await actionFnToExecute(); 
    triggerRefresh(); 

    if (actionKey === 'recordPoint' && bookkeeper.activePoint === null) {
      setUiMode('line-selection');
      autoSelectNextLines(); 
    }
  };

  const renderPlayerButton = (player: string, isHomeTeamPlayerList: boolean, onField: boolean) => {
    const isPlayerSelectedForLine = (isHomeTeamPlayerList ? currentHomeLine : currentAwayLine).includes(player);
    let isDisabled = false;
    let buttonStyle: React.CSSProperties = { 
        margin: '5px', padding: '10px', cursor: 'pointer', 
        width: 'calc(100% - 10px)', 
        textAlign: 'center', borderRadius: '4px',
        boxSizing: 'border-box'
    };

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

        if (selectingDTargetFor) { 
            const defenderIsHome = bookkeeper.gameData.homeRoster.includes(selectingDTargetFor);
            isDisabled = (defenderIsHome === isHomeTeamPlayerList) || !onField;
        } else if (!onField) { 
            isDisabled = true;
            buttonStyle.opacity = 0.3;
        } else { 
            if (currentGameState === GameState.Start) { 
                isDisabled = !playerListTeamHasPossession;
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
        if (playerIsFirstActor && !selectingDTargetFor) { 
            buttonStyle.border = '3px solid #007bff'; 
            buttonStyle.fontWeight = 'bold';
        }
        if (selectingDTargetFor && player === selectingDTargetFor) { 
            buttonStyle.border = '3px solid #dc3545'; 
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
    { label: 'D', actionKey: 'D_initiate', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.SecondD, GameState.FirstD] }, 
    { label: 'Catch D', actionKey: 'CatchD_initiate', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.SecondD, GameState.FirstD] }, 
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
          {uiMode === 'line-selection' ? (currentHomeLine.length >= leagueLineSize && currentAwayLine.length >= leagueLineSize ? `Confirm Lines & Start Point (${leagueLineSize})` : `Select Lines (${leagueLineSize} per team)`) : 'Change Line / Pause Point'}
        </button>
        <Link to={`/stat_keeper/edit_game/${game.localId}`}>
          <button>Edit Rosters</button>
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1>{game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}</h1>
        <p>Week: {game.week} | League: {getLeagueName(game.league_id)} | Line Size: {leagueLineSize}</p>
        <p>Possession: {bookkeeper.activePoint || currentGameState === GameState.Start ? (bookkeeper.homePossession ? game.homeTeam : game.awayTeam) : "N/A"}</p>
        <p>Current Game State: {GameState[currentGameState]} ({currentGameState}) {selectingDTargetFor ? `(Selecting player D'd by ${selectingDTargetFor})`: ""}</p>
        {bookkeeper.firstActor && !selectingDTargetFor && <p>Player with Disc/Action: {bookkeeper.firstActor}</p>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ width: '35%', textAlign: 'left' }}> 
          <h3>{game.homeTeam} {uiMode === 'line-selection' ? `(${currentHomeLine.length}/${leagueLineSize})` : `(Line: ${currentHomeLine.length})`}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {(uiMode === 'line-selection' ? game.homeRoster : currentHomeLine).map(player =>
              renderPlayerButton(player, true, currentHomeLine.includes(player))
            )}
          </div>
        </div>

        <div style={{ width: '25%', borderLeft: '1px solid #eee', borderRight: '1px solid #eee', padding: '0 10px', maxHeight: '400px', overflowY: 'auto' }}> 
          <h4>Current Point:</h4>
          {pointEventHistory.length > 0 ? (
            <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: 0 }}>
              {pointEventHistory.map((eventStr, index) => (
                <li key={index} style={{fontSize: '0.9em'}}>{eventStr}</li>
              ))}
            </ul>
          ) : (
            <p style={{fontSize: '0.9em', color: '#777'}}>{uiMode === 'stat-taking' ? (selectingDTargetFor ? `Select player D'd by ${selectingDTargetFor}` : '(No events yet for this point)') : '(Select lines to start point)'}</p>
          )}
        </div>

        <div style={{ width: '35%', textAlign: 'right' }}> 
          <h3>{game.awayTeam} {uiMode === 'line-selection' ? `(${currentAwayLine.length}/${leagueLineSize})` : `(Line: ${currentAwayLine.length})`}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {(uiMode === 'line-selection' ? game.awayRoster : currentAwayLine).map(player =>
              renderPlayerButton(player, false, currentAwayLine.includes(player))
            )}
          </div>
        </div>
      </div>
      
      {uiMode === 'stat-taking' && !selectingDTargetFor && ( 
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          {actionButtonsConfig.map(btn => {
            let isDisabled = !btn.states.includes(currentGameState);
            if (btn.label === 'Pull') {
                isDisabled = currentGameState !== GameState.Pull || !bookkeeper.firstActor;
            } else if (!['Undo', 'Record Half', 'D', 'Catch D'].includes(btn.label)) { 
                isDisabled = isDisabled || !bookkeeper.firstActor;
            } else if (['D', 'Catch D'].includes(btn.label)) {
                isDisabled = isDisabled || !bookkeeper.firstActor;
            }

            return (
                <button
                key={btn.label}
                onClick={() => handleBookkeeperAction(btn.actionKey as keyof Bookkeeper | 'undo' | 'recordHalf' | 'D_initiate' | 'CatchD_initiate')}
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
