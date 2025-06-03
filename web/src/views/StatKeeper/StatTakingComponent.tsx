import React from 'react';
import { StoredGame } from './db';
import { Bookkeeper } from './Bookkeeper';
import { GameState } from './models/GameState';

interface StatTakingProps {
  bookkeeper: Bookkeeper;
  gameData: StoredGame;
  currentPointInitialHomeLine: string[];
  currentPointInitialAwayLine: string[];
  currentGameState: GameState;
  onBookkeeperAction: (actionKey: keyof Bookkeeper | 'undo' | 'recordHalf') => Promise<void>;
  onPlayerTap: (player: string, isPlayerFromHomeTeamList: boolean) => Promise<void>;
  firstActor: string | null;
  homeTeamName: string;
  awayTeamName: string;
  pointEventHistory: string[];
}

const StatTakingComponent: React.FC<StatTakingProps> = ({
  bookkeeper,
  gameData,
  currentPointInitialHomeLine,
  currentPointInitialAwayLine,
  currentGameState,
  onBookkeeperAction,
  onPlayerTap,
  firstActor, 
  homeTeamName,
  awayTeamName,
  pointEventHistory,
}) => {

  const renderPlayerButton = (player: string, isPlayerFromHomeTeamList: boolean) => {
    let isDisabled = false;
    let buttonStyle: React.CSSProperties = { 
        margin: '5px', padding: '10px', cursor: 'pointer', 
        width: 'calc(100% - 10px)', 
        textAlign: 'center', borderRadius: '4px',
        boxSizing: 'border-box'
    };

    const playerIsCurrentlyFirstActor = bookkeeper.isFirstActor(player);
    
    if (!bookkeeper.activePoint) { 
        isDisabled = true; 
    } else if (currentGameState === GameState.Start && bookkeeper.isPullPoint()) {
        // Waiting to select PULLER. Puller must be from the team currently on DEFENSE.
        // bookkeeper.homePossession is true if Home is on Offense.
        // So, if player is home team (isPlayerFromHomeTeamList=true) AND home is on Offense (bk.homePossession=true), player is on O, so disable.
        // If player is home team (isPlayerFromHomeTeamList=true) AND home is on Defense (bk.homePossession=false), player is on D, so enable.
        isDisabled = isPlayerFromHomeTeamList === bookkeeper.homePossession; 
    } else if (currentGameState === GameState.Pull) { 
        isDisabled = true; 
    } else if (currentGameState === GameState.WhoPickedUpDisc) { 
        // Player picking up must be on the team that now has possession (is on Offense).
        isDisabled = isPlayerFromHomeTeamList !== bookkeeper.homePossession;
    } else if (currentGameState === GameState.SelectDefenderForD) {
        // Waiting to select the DEFENDER. Defender must be on the team that was on DEFENSE
        // when D/CatchD was pressed. At this stage, bookkeeper.homePossession still reflects
        // the *original* offensive team. So, enable players on the team that is NOT bookkeeper.homePossession.
        isDisabled = isPlayerFromHomeTeamList === bookkeeper.homePossession; 
    } else { // Normal, FirstThrowQuebecVariant (player has disc or ready for D selection)
        if (bookkeeper.firstActor) { 
            // Player's team has disc if (isPlayerFromHomeTeamList === bookkeeper.homePossession)
            const playerTeamHasPossession = isPlayerFromHomeTeamList === bookkeeper.homePossession;
            if (playerTeamHasPossession) { // Player's team has disc (is on Offense)
                isDisabled = playerIsCurrentlyFirstActor; // Cannot pass to self
            } else { // Player is on Defense. Can be selected as firstActor for a D/CatchD (but buttons should handle this)
                // This path for tapping a defender when someone else has the disc is less common.
                // D/CatchD buttons are primary. If a defender is tapped, it might set them as firstActor.
                isDisabled = false; // Allow tapping a defender to select them (e.g. if firstActor was cleared)
            }
        } else { 
            // No firstActor in active play states like Normal. This implies disc is loose or needs pickup.
            // Should typically be WhoPickedUpDisc state. If somehow in Normal with no firstActor, disable all.
            isDisabled = true; 
        }
    }
    
    if (playerIsCurrentlyFirstActor) { 
        buttonStyle.border = '3px solid #007bff'; 
        buttonStyle.fontWeight = 'bold';
    }
    if (isDisabled) { 
         buttonStyle.opacity = 0.6;
         buttonStyle.cursor = 'not-allowed';
    }

    return (
      <button
        key={player}
        onClick={() => onPlayerTap(player, isPlayerFromHomeTeamList)}
        disabled={isDisabled}
        style={buttonStyle}
      >
        {player}
      </button>
    );
  };

  const actionButtonsConfig = [
    { label: 'Pull', actionKey: 'recordPull', states: [GameState.Pull] },
    { label: 'Point', actionKey: 'recordPoint', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.FirstD, GameState.SecondD] },
    { label: 'Drop', actionKey: 'recordDrop', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.FirstD, GameState.SecondD] },
    { label: 'D', actionKey: 'recordD', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.FirstD, GameState.SecondD] }, 
    { label: 'Catch D', actionKey: 'recordCatchD', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.FirstD, GameState.SecondD] }, 
    { label: 'Throw Away', actionKey: 'recordThrowAway', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.FirstD, GameState.SecondD] },
  ];

  // Determine if the current firstActor is on the offensive team
  let firstActorIsOffensive = false;
  if (bookkeeper.firstActor && bookkeeper.activePoint) {
      const firstActorIsHome = currentPointInitialHomeLine.includes(bookkeeper.firstActor) || currentPointInitialAwayLine.includes(bookkeeper.firstActor) && !currentPointInitialHomeLine.includes(bookkeeper.firstActor); // Simplified check
      // More robust: check against activePoint.offensePlayers/defensePlayers if available and reliable
      if (bookkeeper.activePoint.offensePlayers.includes(bookkeeper.firstActor)) {
          firstActorIsOffensive = true;
      } else if (bookkeeper.activePoint.defensePlayers.includes(bookkeeper.firstActor) && !bookkeeper.homePossession === firstActorIsHome) {
          // This case is tricky: if firstActor is on D line but their team now has possession (e.g. after CatchD)
          // For D/CatchD buttons, we care if firstActor is on the team that *started* the possession.
          // Simpler: if bookkeeper.firstActor is set, and their team (based on homePossession) has the disc.
          if ((currentPointInitialHomeLine.includes(bookkeeper.firstActor) && bookkeeper.homePossession) ||
              (currentPointInitialAwayLine.includes(bookkeeper.firstActor) && !bookkeeper.homePossession)) {
              firstActorIsOffensive = true;
          }
      }
  }


  return (
    <>
      <div style={{ width: '35%', textAlign: 'left' }}> 
        <h3>{homeTeamName} (Line: {currentPointInitialHomeLine.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '5px' }}>
          {currentPointInitialHomeLine.map(player =>
            renderPlayerButton(player, true)
          )}
        </div>
      </div>

      <div style={{ width: '25%', borderLeft: '1px solid #eee', borderRight: '1px solid #eee', padding: '0 10px', maxHeight: '400px', overflowY: 'auto' }}> 
        <h4>Current Point Events:</h4>
        {pointEventHistory.length > 0 ? (
          <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: 0 }}>
            {pointEventHistory.map((eventStr, index) => (
              <li key={index} style={{fontSize: '0.9em'}}>{eventStr}</li>
            ))}
          </ul>
        ) : (
          <p style={{fontSize: '0.9em', color: '#777'}}>(No events yet for this point)</p>
        )}
         {currentGameState === GameState.SelectDefenderForD && <p style={{color: 'blue', fontWeight: 'bold'}}>Select the player who made the D.</p>}
         {currentGameState === GameState.Start && bookkeeper.isPullPoint() && <p style={{color: 'blue', fontWeight: 'bold'}}>Select the Puller.</p>}
         {currentGameState === GameState.WhoPickedUpDisc && <p style={{color: 'blue', fontWeight: 'bold'}}>Select player who picked up the disc.</p>}
      </div>

      <div style={{ width: '35%', textAlign: 'right' }}> 
        <h3>{awayTeamName} (Line: {currentPointInitialAwayLine.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '5px' }}>
          {currentPointInitialAwayLine.map(player =>
            renderPlayerButton(player, false)
          )}
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
        {actionButtonsConfig.map(btn => {
          let isDisabled = !btn.states.includes(currentGameState);
          if (btn.label === 'Pull') {
              isDisabled = !(currentGameState === GameState.Pull && !!bookkeeper.firstActor);
          } else if (['D', 'Catch D'].includes(btn.label)) {
              // D/CatchD enabled if in a normal play state AND firstActor (offensive player) is set.
              // Disabled if already selecting a defender.
              isDisabled = isDisabled || !bookkeeper.firstActor || !firstActorIsOffensive || currentGameState === GameState.SelectDefenderForD;
          } else if (['Drop', 'Throw Away', 'Point'].includes(btn.label)) {
              // These actions require a firstActor who is on offense.
              isDisabled = isDisabled || !bookkeeper.firstActor || !firstActorIsOffensive;
          }
          
          return (
              <button
              key={btn.label}
              onClick={() => onBookkeeperAction(btn.actionKey as keyof Bookkeeper | 'undo' | 'recordHalf')}
              disabled={isDisabled}
              style={{padding: '10px 15px'}}
              >
              {btn.label}
              </button>
          );
      })}
        <button onClick={() => onBookkeeperAction('undo')} style={{padding: '10px 15px', backgroundColor: '#ffc107'}}>Undo</button>
        <button onClick={() => onBookkeeperAction('recordHalf')} style={{padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white'}}>Record Half</button>
      </div>
    </>
  );
};

export default StatTakingComponent;
