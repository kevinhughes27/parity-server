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

  const storedGameFromDb = useLiveQuery<StoredGame | undefined | typeof LOADING_SENTINEL>(
    async () => {
      if (numericLocalGameId === undefined || isNaN(numericLocalGameId)) {
        return undefined;
      }
      const game = await db.games.get(numericLocalGameId);
      // Ensure points and events are loaded as EventModel instances
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
      // Ensure lastPoint players are from the actual stored lines if possible,
      // or use offense/defense players as a fallback.
      // For simplicity, using offense/defense from the last recorded point.
      lastPoint.offensePlayers.forEach(p => lastPointPlayers.add(p));
      lastPoint.defensePlayers.forEach(p => lastPointPlayers.add(p));
    }
    
    const homeRoster = game.homeRoster || [];
    const awayRoster = game.awayRoster || [];

    if (lastPointPlayers.size === 0) { 
      setSelectedHomeLineForNextPoint(homeRoster.slice(0, currentLineSize));
      setSelectedAwayLineForNextPoint(awayRoster.slice(0, currentLineSize));
    } else {
      const nextHomeLine = homeRoster.filter(p => !lastPointPlayers.has(p)).slice(0, currentLineSize);
      const nextAwayLine = awayRoster.filter(p => !lastPointPlayers.has(p)).slice(0, currentLineSize);
      setSelectedHomeLineForNextPoint(nextHomeLine.length > 0 ? nextHomeLine : homeRoster.slice(0, currentLineSize));
      setSelectedAwayLineForNextPoint(nextAwayLine.length > 0 ? nextAwayLine : awayRoster.slice(0, currentLineSize));
    }
  }, [bookkeeper, leagueLineSize]);

  useEffect(() => {
    if (numericLocalGameId !== undefined && !isNaN(numericLocalGameId)) {
      const bk = new Bookkeeper(numericLocalGameId, db);
      bk.loadGame().then(loaded => {
        if (loaded) {
          setBookkeeper(bk);
          if (!bk.activePoint) { // Only auto-select if not resuming a point
            autoSelectNextLines();
          }
          triggerRefresh();
        } else {
          setBookkeeper(null); 
        }
      });
    } else {
      setBookkeeper(null);
    }
    return () => {
      // Consider if bookkeeper needs explicit cleanup, e.g., saving pending changes
      setBookkeeper(null); // Reset bookkeeper on component unmount or ID change
    };
  }, [numericLocalGameId, autoSelectNextLines, triggerRefresh]); // autoSelectNextLines and triggerRefresh are stable

  useEffect(() => {
    if (bookkeeper) {
      setCurrentGameState(bookkeeper.getGameState());
      setPointEventHistory(bookkeeper.getUndoHistory());
      if (bookkeeper.activePoint === null && (selectedHomeLineForNextPoint.length === 0 || selectedAwayLineForNextPoint.length === 0)) {
        autoSelectNextLines();
      }
    }
  }, [bookkeeper, actionCounter, autoSelectNextLines, selectedHomeLineForNextPoint.length, selectedAwayLineForNextPoint.length]);


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
  if (storedGameFromDb === LOADING_SENTINEL || !bookkeeper || !bookkeeper.gameData) {
    return <p style={{ padding: '20px' }}>Loading game data and bookkeeper...</p>;
  }
  
  const game = bookkeeper.gameData; 

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <Link to="/stat_keeper">&larr; StatKeeper Home</Link>
        {/* Button for mode switch is now part of child components or implicit */}
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
      
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
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
