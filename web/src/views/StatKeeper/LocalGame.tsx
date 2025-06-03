import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, StoredGame } from './db';
import { leagues } from '../../api'; 
import { Bookkeeper } from './Bookkeeper';
import { GameState } from './models/GameState';
import LineSelectionComponent from './LineSelectionComponent';
import StatTakingComponent from './StatTakingComponent';
import { EventModel } from './models/EventModel';

const getLeagueName = (leagueId: string): string => {
  const league = leagues.find(l => l.id.toString() === leagueId); 
  return league ? league.name : `Unknown League (${leagueId})`;
};

const LOADING_SENTINEL = Symbol("loading_game_data");

function LocalGame() {
  const { localGameId } = useParams<{ localGameId: string }>();
  const navigate = useNavigate();
  const numericLocalGameId = localGameId ? parseInt(localGameId, 10) : undefined;

  const [bookkeeper, setBookkeeper] = useState<Bookkeeper | null>(null);
  const [selectedHomeLineForNextPoint, setSelectedHomeLineForNextPoint] = useState<string[]>([]);
  const [selectedAwayLineForNextPoint, setSelectedAwayLineForNextPoint] = useState<string[]>([]);
  const [isHomePullingNext, setIsHomePullingNext] = useState<boolean>(true);
  
  const [currentPointInitialHomeLine, setCurrentPointInitialHomeLine] = useState<string[]>([]);
  const [currentPointInitialAwayLine, setCurrentPointInitialAwayLine] = useState<string[]>([]);

  const [currentGameState, setCurrentGameState] = useState<GameState>(GameState.Start);
  const [pointEventHistory, setPointEventHistory] = useState<string[]>([]);
  const [actionCounter, setActionCounter] = useState(0); 
  const [leagueLineSize, setLeagueLineSize] = useState<number>(7);

  // This useLiveQuery hook is primarily for the loading state and initial data check.
  // Bookkeeper manages its own game data instance after loading.
  const storedGameFromDb = useLiveQuery<StoredGame | undefined | typeof LOADING_SENTINEL>(
    async () => {
      if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
        return undefined;
      }
      const game = await db.games.get(numericLocalGameId);
      if (game && game.points) {
        game.points = game.points.map(p => ({
          ...p,
          events: p.events.map(e => e instanceof EventModel ? e : EventModel.fromApiEventData(e as any))
        }));
      }
      return game;
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

  const triggerRefresh = useCallback(() => {
    setActionCounter(c => c + 1);
  }, []);

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
    
    const homeRoster = game.homeRoster || [];
    const awayRoster = game.awayRoster || [];

    let nextHomeLine: string[], nextAwayLine: string[];

    if (lastPointPlayers.size === 0) { 
      nextHomeLine = homeRoster.slice(0, currentLineSize);
      nextAwayLine = awayRoster.slice(0, currentLineSize);
    } else {
      const autoSelectedHome = homeRoster.filter(p => !lastPointPlayers.has(p)).slice(0, currentLineSize);
      const autoSelectedAway = awayRoster.filter(p => !lastPointPlayers.has(p)).slice(0, currentLineSize);
      nextHomeLine = autoSelectedHome.length > 0 ? autoSelectedHome : homeRoster.slice(0, currentLineSize);
      nextAwayLine = autoSelectedAway.length > 0 ? autoSelectedAway : awayRoster.slice(0, currentLineSize);
    }
    setSelectedHomeLineForNextPoint(nextHomeLine);
    setSelectedAwayLineForNextPoint(nextAwayLine);

  }, [bookkeeper, leagueLineSize]); // Relies on stable setters from useState

  // Effect for initializing or changing the bookkeeper instance
  useEffect(() => {
    if (numericLocalGameId !== undefined && !isNaN(numericLocalGameId)) {
      const bk = new Bookkeeper(numericLocalGameId, db);
      bk.loadGame().then(loaded => {
        if (loaded) {
          setBookkeeper(bk);
        } else {
          setBookkeeper(null); 
        }
      });
    } else {
      setBookkeeper(null);
    }
    return () => {
      // Cleanup if bookkeeper instance held resources, e.g., save pending changes.
      // For now, just resetting state.
      setBookkeeper(null); 
    };
  }, [numericLocalGameId]);

  // Effect to trigger a UI refresh when the bookkeeper instance is newly set or changed.
  useEffect(() => {
    if (bookkeeper) {
      triggerRefresh();
    }
  }, [bookkeeper, triggerRefresh]); // triggerRefresh is stable

  // Effect for syncing UI state from bookkeeper and handling conditional auto-selection of lines.
  useEffect(() => {
    if (bookkeeper) {
      setCurrentGameState(bookkeeper.getGameState());
      setPointEventHistory(bookkeeper.getUndoHistory());

      if (bookkeeper.activePoint === null && 
          (selectedHomeLineForNextPoint.length === 0 || selectedAwayLineForNextPoint.length === 0)) {
        // If no point is active (e.g., game start, or after a point scored)
        // AND lines are currently empty, try to auto-select them.
        // This check prevents re-selecting if lines were manually adjusted or already populated.
        autoSelectNextLines();
      }
    }
  }, [bookkeeper, actionCounter, selectedHomeLineForNextPoint, selectedAwayLineForNextPoint, autoSelectNextLines]);
  // autoSelectNextLines is included here because its definition changes with bookkeeper or leagueLineSize,
  // and this effect's logic depends on having the correct version of it.
  // The loop is broken if autoSelectNextLines populates the lines, making the condition false on the next run.


  const handlePlayerToggleLineForSelection = (player: string, isHomeTeam: boolean) => {
    const currentLine = isHomeTeam ? selectedHomeLineForNextPoint : selectedAwayLineForNextPoint;
    const setCurrentLine = isHomeTeam ? setSelectedHomeLineForNextPoint : setSelectedAwayLineForNextPoint;

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

  const handleStartPoint = async () => {
    if (!bookkeeper) return;

    if (selectedHomeLineForNextPoint.length === 0 || selectedAwayLineForNextPoint.length === 0) {
      alert('Please select players for both lines.');
      return;
    }
    if (selectedHomeLineForNextPoint.length !== leagueLineSize || selectedAwayLineForNextPoint.length !== leagueLineSize) {
      if (!window.confirm(`Lines are not full (${leagueLineSize} players per team). Continue anyway?`)) {
          return;
      }
    }
    
    setCurrentPointInitialHomeLine([...selectedHomeLineForNextPoint]);
    setCurrentPointInitialAwayLine([...selectedAwayLineForNextPoint]);
    
    await bookkeeper.setCurrentLine(selectedHomeLineForNextPoint, selectedAwayLineForNextPoint);
    await bookkeeper.startPoint(isHomePullingNext);
    triggerRefresh();
  };
  
  const handlePlayerTapStatTaking = async (player: string, isPlayerFromHomeTeamList: boolean) => {
    if (!bookkeeper || !bookkeeper.activePoint) return;

    if (bookkeeper.firstActor) { 
      const tappedPlayerTeamHasPossession = bookkeeper.homePossession === isPlayerFromHomeTeamList;
      if (tappedPlayerTeamHasPossession) {
        if (bookkeeper.firstActor !== player) { 
            await bookkeeper.recordPass(player);
        } else {
            return; 
        }
      } else { 
        await bookkeeper.recordFirstActor(player, isPlayerFromHomeTeamList); 
      }
    } else { 
      await bookkeeper.recordFirstActor(player, isPlayerFromHomeTeamList);
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
      if ((actionKey === 'recordD' || actionKey === 'recordCatchD') && !bookkeeper.firstActor) {
          alert("Select the player who made the D/Catch D first by tapping them.");
          return;
      }
      const method = bookkeeper[actionKey as keyof Bookkeeper];
      if (typeof method === 'function') {
        actionFnToExecute = method.bind(bookkeeper);
      }
    }

    if (!actionFnToExecute) {
      console.error("Invalid action key or setup for bookkeeper action:", actionKey);
      return;
    }
    
    await actionFnToExecute(); 
    
    if (actionKey === 'recordPoint' && bookkeeper.activePoint === null) {
      // If a point was just scored, activePoint becomes null.
      // We need to select lines for the next point.
      autoSelectNextLines(); 
    }
    triggerRefresh(); 
  };

  const handleEditRosters = () => {
    if (bookkeeper?.gameData?.localId) {
      navigate(`/stat_keeper/edit_game/${bookkeeper.gameData.localId}`);
    }
  };

  if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
    return <div style={{ padding: '20px' }}><p>Invalid game ID.</p><Link to="/stat_keeper">Back to StatKeeper Home</Link></div>;
  }
  // Check against bookkeeper and its gameData for readiness, as storedGameFromDb is more of a loading signal.
  if (storedGameFromDb === LOADING_SENTINEL || !bookkeeper || !bookkeeper.gameData) {
    return <p style={{ padding: '20px' }}>Loading game data and bookkeeper...</p>;
  }
  
  const game = bookkeeper.gameData; 

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <Link to="/stat_keeper">&larr; StatKeeper Home</Link>
        <button onClick={handleEditRosters}>Edit Rosters</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1>{game.homeTeam} {game.homeScore} - {game.awayScore} {game.awayTeam}</h1>
        <p>Week: {game.week} | League: {getLeagueName(game.league_id)} | Line Size: {leagueLineSize}</p>
        {bookkeeper.activePoint && (
          <>
            <p>Possession: {bookkeeper.homePossession ? game.homeTeam : game.awayTeam}</p>
            <p>Current Game State: {GameState[currentGameState]} ({currentGameState})</p>
            {bookkeeper.firstActor && <p>Player with Disc/Action: {bookkeeper.firstActor}</p>}
          </>
        )}
         {!bookkeeper.activePoint && <p>Please select lines and pulling team to start the next point.</p>}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', marginBottom: '20px' }}>
        {!bookkeeper.activePoint ? (
          <LineSelectionComponent
            gameData={game}
            selectedHomeLine={selectedHomeLineForNextPoint}
            selectedAwayLine={selectedAwayLineForNextPoint}
            leagueLineSize={leagueLineSize}
            isHomePullingNext={isHomePullingNext}
            onPlayerToggleLine={handlePlayerToggleLineForSelection}
            onSetIsHomePullingNext={setIsHomePullingNext}
            onStartPoint={handleStartPoint}
            homeTeamName={game.homeTeam}
            awayTeamName={game.awayTeam}
          />
        ) : (
          <StatTakingComponent
            bookkeeper={bookkeeper}
            gameData={game}
            currentPointInitialHomeLine={currentPointInitialHomeLine}
            currentPointInitialAwayLine={currentPointInitialAwayLine}
            currentGameState={currentGameState}
            onBookkeeperAction={handleBookkeeperAction}
            onPlayerTap={handlePlayerTapStatTaking}
            firstActor={bookkeeper.firstActor}
            homeTeamName={game.homeTeam}
            awayTeamName={game.awayTeam}
            pointEventHistory={pointEventHistory}
          />
        )}
      </div>
      
       <details style={{marginTop: '20px'}}>
            <summary>View All Game Points ({game.points.length})</summary>
            {game.points.map((p, pointIndex) => (
                <div key={pointIndex} style={{border: '1px solid #ddd', margin: '5px', padding: '5px'}}>
                    <h5>Point {pointIndex + 1} (O: {p.offensePlayers.join(', ') || 'N/A'}, D: {p.defensePlayers.join(', ') || 'N/A'})</h5>
                    <ul style={{listStyleType: 'decimal', paddingLeft: '20px'}}>
                        {p.events.map((e, eventIndex) => {
                            const eventInstance = e instanceof EventModel ? e : EventModel.fromApiEventData(e as any);
                            return <li key={eventIndex}>{eventInstance.prettyPrint()}</li>
                        })}
                    </ul>
                </div>
            ))}
        </details>
    </div>
  );
}

export default LocalGame;
