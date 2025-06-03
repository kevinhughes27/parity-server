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
  firstActor, // Note: firstActor prop might be slightly delayed vs bookkeeper.firstActor
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

    const playerIsCurrentlyFirstActor = bookkeeper.isFirstActor(player); // Use bookkeeper directly for most up-to-date
    const playerTeamIsCurrentlyOffense = bookkeeper.homePossession === isPlayerFromHomeTeamList;

    if (!bookkeeper.activePoint) { 
        isDisabled = true; 
    } else if (currentGameState === GameState.Start) {
        // Point started, no events, waiting to select PULLER.
        // Puller must be from the team currently on DEFENSE.
        // Player is on DEFENSE if their team is NOT on offense.
        isDisabled = playerTeamIsCurrentlyOffense; // Disable if player is on Offense, enable if on Defense.
    } else if (currentGameState === GameState.Pull) {
        // Puller selected, "Pull" button is active, player buttons generally disabled.
        isDisabled = true; 
    } else if (currentGameState === GameState.WhoPickedUpDisc) {
        // Disc is loose (after pull, turnover, non-catch D).
        // Player who picks up must be on the team that now has possession (is on Offense).
        isDisabled = !playerTeamIsCurrentlyOffense; // Disable if player's team does NOT have possession.
    } else { // Normal, FirstD, SecondD, FirstThrowQuebecVariant
        if (bookkeeper.firstActor) { 
            if (playerTeamIsCurrentlyOffense) { // Player's team has disc (is on Offense)
                isDisabled = playerIsCurrentlyFirstActor; // Cannot pass to self
            } else { // Player is on Defense, can be selected as firstActor for a D/CatchD
                isDisabled = false; 
            }
        } else { 
            // No firstActor in these active play states.
            // This means we might be waiting to select a defender for a D, or a player to pick up a disc
            // if the state transition was complex (e.g. after a D where firstActor was cleared).
            // If player is on D, they can be tapped to become firstActor (for a D).
            // If player is on O, and no one has disc, they can't do much (can't receive from no one).
            isDisabled = playerTeamIsCurrentlyOffense; // Disable if on O and no one has disc. Enable if on D.
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
    { label: 'Point', actionKey: 'recordPoint', states: [GameState.Normal, GameState.SecondD, GameState.FirstD, GameState.FirstThrowQuebecVariant] },
    { label: 'Drop', actionKey: 'recordDrop', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.SecondD] },
    { label: 'D', actionKey: 'recordD', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.SecondD, GameState.FirstD] }, 
    { label: 'Catch D', actionKey: 'recordCatchD', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.SecondD, GameState.FirstD] }, 
    { label: 'Throw Away', actionKey: 'recordThrowAway', states: [GameState.Normal, GameState.FirstThrowQuebecVariant, GameState.SecondD] },
  ];

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
              // Pull button enabled only if in Pull state AND puller (firstActor) is selected.
              isDisabled = !(currentGameState === GameState.Pull && !!bookkeeper.firstActor);
          } else if (btn.actionKey === 'recordPoint') {
            // Point can be scored if firstActor is set (scorer) or if it's a Callahan scenario.
            // Bookkeeper logic handles validity. Enable if in a state where point is possible.
            // If firstActor is null, it's likely not a direct scoring action by a player holding disc.
            // For UI, enable if in a scorable state AND firstActor is set (unless it's a state like FirstD where firstActor is the defender).
            // Simplification: if in a scorable state, button is generally enabled if firstActor is set.
            if (btn.states.includes(currentGameState) && !bookkeeper.firstActor && 
                ![GameState.FirstD, GameState.SecondD].includes(currentGameState) /* Callahan might not need firstActor if implicit */ ) {
                // isDisabled = true; // Re-evaluating this, bookkeeper should handle if firstActor is needed
            }
          } else if (!['Undo', 'Record Half'].includes(btn.label)) { 
              // For D, Catch D, Drop, Throw Away, firstActor must be set.
              isDisabled = isDisabled || !bookkeeper.firstActor;
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
