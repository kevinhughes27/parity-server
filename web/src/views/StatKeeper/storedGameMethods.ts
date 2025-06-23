import { StoredGame, UndoCommand } from './db';
import { PointModel, EventType, mapApiEventToEvent, mapEventToApiEvent } from './models';

// GameState enum - moved from bookkeeper
export enum GameState {
  Normal = 1,
  FirstD = 2,
  Start = 3,
  Pull = 4,
  WhoPickedUpDisc = 5,
  FirstThrowQuebecVariant = 6,
  SecondD = 7,
}

// Add methods to StoredGame instances
export function addStoredGameMethods(game: StoredGame): StoredGame & StoredGameMethods {
  const enhancedGame = game as StoredGame & StoredGameMethods;

  // Helper method to get active point as PointModel
  const getActivePointModel = (): PointModel | null => {
    if (!enhancedGame.activePoint) return null;
    return PointModel.fromJSON({
      offensePlayers: [...enhancedGame.activePoint.offensePlayers],
      defensePlayers: [...enhancedGame.activePoint.defensePlayers],
      events: enhancedGame.activePoint.events.map(mapApiEventToEvent),
    });
  };

  // Helper method to set active point from PointModel
  const setActivePointModel = (point: PointModel | null): void => {
    if (point === null) {
      enhancedGame.activePoint = null;
    } else {
      enhancedGame.activePoint = {
        offensePlayers: [...point.offensePlayers],
        defensePlayers: [...point.defensePlayers],
        events: point.events.map(mapEventToApiEvent),
      };
    }
  };

  // Helper method to get points as PointModel array
  const getPointsModels = (): PointModel[] => {
    return enhancedGame.points.map(apiPoint => {
      return PointModel.fromJSON({
        offensePlayers: [...apiPoint.offensePlayers],
        defensePlayers: [...apiPoint.defensePlayers],
        events: apiPoint.events.map(mapApiEventToEvent),
      });
    });
  };

  enhancedGame.gameState = function(): GameState {
    const activePoint = getActivePointModel();
    
    if (activePoint === null) {
      return GameState.Start;
    }

    const eventCount = activePoint.getEventCount();
    const lastEventType = activePoint.getLastEventType();

    if (eventCount === 0) {
      // New point, no events yet
      if (this.firstActor === null) {
        // Waiting for player to initiate
        if (this.firstPointOfGameOrHalf()) {
          return GameState.Start; // Select puller (both teams enabled after halftime)
        } else {
          return GameState.WhoPickedUpDisc; // Receiving team picks up
        }
      } else {
        // Player selected, ready for first action
        if (this.firstPointOfGameOrHalf()) {
          return GameState.Pull; // Puller selected, ready to pull
        } else {
          return GameState.FirstThrowQuebecVariant; // Player picked up, ready for first throw
        }
      }
    }

    // Point has events from here

    if (lastEventType === EventType.PULL) {
      if (this.firstActor === null) return GameState.WhoPickedUpDisc; // Pull in air/landed
      // If firstActor is set after a PULL, it means they picked up the pull.
      return GameState.FirstThrowQuebecVariant;
    }

    // Logic for states when firstActor is set vs. null, after the initial events (pull/pickup)
    if (this.firstActor === null) {
      // Disc is loose or action just completed that made it loose
      if (
        lastEventType === EventType.THROWAWAY ||
        lastEventType === EventType.DROP ||
        lastEventType === EventType.DEFENSE
      ) {
        // After a turnover (Throwaway, Drop) or a D (where disc is loose, not a catch D),
        // the new offense needs to pick up the disc.
        return GameState.WhoPickedUpDisc;
      }
      // Fallback for other cases where firstActor might be null with events.
      // This could happen if an undo operation leads to an unexpected state.
      console.warn(
        'GameState: firstActor is null with events, but not a standard turnover/D/pull state. Defaulting to WhoPickedUpDisc.'
      );
      return GameState.WhoPickedUpDisc;
    } else {
      // firstActor is set (player has the disc)

      // Case 1: Disc was turned over (Throwaway/Drop by OTHER team), and THIS player (firstActor) picked it up.
      // This is the "First D" opportunity. Player can throw, or make an immediate D.
      if (lastEventType === EventType.THROWAWAY || lastEventType === EventType.DROP) {
        return GameState.FirstD;
      }

      // Case 2: A D just occurred (last event was DEFENSE), and THIS player (firstActor) now has the disc.
      // This could be because they made a catch D, or picked up after a block by self/teammate.
      // This is the "Second D" opportunity. Player can throw, or make another D.
      if (lastEventType === EventType.DEFENSE) {
        return GameState.SecondD;
      }

      // Case 3: Player has the disc after a pass.
      // (Picking up a pull is handled by eventCount=0 or lastEvent=PULL logic above).
      // This is normal ongoing play.
      if (lastEventType === EventType.PASS) {
        return GameState.Normal;
      }

      // Fallback for any other combination where firstActor is set and point has events.
      // This might include scenarios like the very first throw of a point if not covered by FirstThrowQuebecVariant,
      // or if an undo leads to an unusual state.
      console.warn(
        `GameState: Unhandled state with firstActor=${this.firstActor}, lastEvent=${lastEventType}. Defaulting to Normal.`
      );
      return GameState.Normal;
    }
  };

  enhancedGame.shouldRecordNewPass = function(): boolean {
    return this.firstActor !== null;
  };

  enhancedGame.firstPointOfGameOrHalf = function(): boolean {
    return this.points.length === this.pointsAtHalf;
  };

  enhancedGame.changePossession = function(): void {
    this.homePossession = !this.homePossession;
  };

  enhancedGame.recordFirstActor = function(player: string, isHomeTeamPlayer: boolean): void {
    this.undoStack.push({
      type: 'recordFirstActor',
      timestamp: new Date().toISOString()
    });

    if (this.activePoint === null) {
      // This implies the point is starting from scratch (e.g. first point of game/half)
      // Possession is determined by the team of the player clicked.
      this.startPointAndSetPossession(isHomeTeamPlayer);
    }
    this.firstActor = player;
  };

  enhancedGame.startPointAndSetPossession = function(isHomeTeamStartingWithDisc: boolean): void {
    this.homePossession = isHomeTeamStartingWithDisc;

    let offensePlayers: string[];
    let defensePlayers: string[];

    if (this.homePossession) {
      offensePlayers = this.homePlayers || [];
      defensePlayers = this.awayPlayers || [];
    } else {
      offensePlayers = this.awayPlayers || [];
      defensePlayers = this.homePlayers || [];
    }
    
    const newPoint = new PointModel(offensePlayers, defensePlayers);
    setActivePointModel(newPoint);
  };

  enhancedGame.recordPull = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint || !this.firstActor) return;

    this.undoStack.push({
      type: 'recordPull',
      timestamp: new Date().toISOString()
    });

    activePoint.swapOffenseAndDefense();
    this.changePossession();
    activePoint.addEvent({
      type: EventType.PULL,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.firstActor = null;
    setActivePointModel(activePoint);
  };

  enhancedGame.recordPass = function(receiver: string): void {
    const activePoint = getActivePointModel();
    if (!activePoint || !this.firstActor) return;

    this.undoStack.push({
      type: 'recordPass',
      timestamp: new Date().toISOString()
    });

    activePoint.addEvent({
      type: EventType.PASS,
      firstActor: this.firstActor!,
      secondActor: receiver,
      timestamp: new Date().toISOString(),
    });
    this.firstActor = receiver;
    setActivePointModel(activePoint);
  };

  enhancedGame.recordDrop = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint || !this.firstActor) return;

    this.undoStack.push({
      type: 'recordDrop',
      timestamp: new Date().toISOString()
    });

    this.changePossession();
    activePoint.addEvent({
      type: EventType.DROP,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.firstActor = null;
    setActivePointModel(activePoint);
  };

  enhancedGame.recordThrowAway = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint || !this.firstActor) return;

    this.undoStack.push({
      type: 'recordThrowAway',
      timestamp: new Date().toISOString()
    });

    this.changePossession();
    activePoint.addEvent({
      type: EventType.THROWAWAY,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.firstActor = null;
    setActivePointModel(activePoint);
  };

  enhancedGame.recordD = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint || !this.firstActor) return;

    this.undoStack.push({
      type: 'recordD',
      timestamp: new Date().toISOString()
    });

    activePoint.addEvent({
      type: EventType.DEFENSE,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.firstActor = null; // After a D, the disc is loose, so no specific player has it.
    setActivePointModel(activePoint);
  };

  enhancedGame.recordCatchD = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint || !this.firstActor) return;

    this.undoStack.push({
      type: 'recordCatchD',
      timestamp: new Date().toISOString()
    });

    activePoint.addEvent({
      type: EventType.DEFENSE, // Still a DEFENSE event type
      firstActor: this.firstActor!, // Player who got the D
      secondActor: null, // No second actor for a D itself
      timestamp: new Date().toISOString(),
    });
    // For a Catch D, the player who made the D (firstActor) now has possession.
    // Possession does not change here, as it's assumed their team was already on D.
    // firstActor remains the player who got the catch D.
    setActivePointModel(activePoint);
  };

  enhancedGame.recordPoint = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint || !this.firstActor) return;

    // Store the last played line before clearing it
    if (this.homePlayers && this.awayPlayers) {
      this.lastPlayedLine = {
        home: [...this.homePlayers],
        away: [...this.awayPlayers]
      };
    }

    // Store the possession state for this point before flipping it
    this.undoStack.push({
      type: 'recordPoint',
      timestamp: new Date().toISOString(),
      data: {
        wasHomePossession: this.homePossession
      }
    });

    activePoint.addEvent({
      type: EventType.POINT,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    
    // Convert PointModel to API format and add to game.points
    this.points.push({
      offensePlayers: [...activePoint.offensePlayers],
      defensePlayers: [...activePoint.defensePlayers],
      events: activePoint.events.map(mapEventToApiEvent),
    });

    if (this.homePossession) {
      this.homeScore++;
    } else {
      this.awayScore++;
    }

    // Clear game state for next point
    this.activePoint = null;
    this.homePlayers = null;
    this.awayPlayers = null;
    this.firstActor = null;

    this.changePossession(); // Flip possession for the next point
    
    // Explicitly transition to line selection for next point
    this.currentView = 'selectLines';
  };

  enhancedGame.recordHalf = function(): void {
    if (this.pointsAtHalf > 0) return; // Half already recorded

    this.undoStack.push({
      type: 'recordHalf',
      timestamp: new Date().toISOString()
    });

    this.pointsAtHalf = this.points.length;

    // Reset line selection and UI state for second half
    this.homePlayers = null;
    this.awayPlayers = null;
    this.lastPlayedLine = null;
    
    // Explicitly transition to line selection for second half
    this.currentView = 'selectLines';
  };

  enhancedGame.recordActivePlayers = function(activeHomePlayers: string[], activeAwayPlayers: string[]): void {
    this.homePlayers = [...activeHomePlayers];
    this.awayPlayers = [...activeAwayPlayers];
    
    // If we have players selected and no active point, we might need to prepare for the next point
    if (this.activePoint === null && !this.firstPointOfGameOrHalf()) {
      // This is after a point was scored, prepare the new point
      this.prepareNewPointAfterScore();
    }
    
    // Transition to record stats view since we now have players selected
    this.currentView = 'recordStats';
  };

  enhancedGame.recordSubstitution = function(newHomePlayers: string[], newAwayPlayers: string[]): void {
    const activePoint = getActivePointModel();
    if (!activePoint) return;

    // Store undo data for substitution
    this.undoStack.push({
      type: 'recordSubstitution',
      timestamp: new Date().toISOString(),
      data: {
        savedHomePlayers: this.homePlayers ? [...this.homePlayers] : null,
        savedAwayPlayers: this.awayPlayers ? [...this.awayPlayers] : null,
        savedOffensePlayers: [...activePoint.offensePlayers],
        savedDefensePlayers: [...activePoint.defensePlayers],
      }
    });

    // Update current line
    this.homePlayers = [...newHomePlayers];
    this.awayPlayers = [...newAwayPlayers];

    // Determine which team's players to update in the point
    let newOffensePlayers: string[];
    let newDefensePlayers: string[];

    if (this.homePossession) {
      newOffensePlayers = [...newHomePlayers];
      newDefensePlayers = [...newAwayPlayers];
    } else {
      newOffensePlayers = [...newAwayPlayers];
      newDefensePlayers = [...newHomePlayers];
    }

    // Update the active point with new players
    activePoint.updateCurrentPlayers(newOffensePlayers, newDefensePlayers);
    setActivePointModel(activePoint);
  };

  enhancedGame.prepareNewPointAfterScore = function(): void {
    if (this.activePoint !== null || this.homePlayers === null || this.awayPlayers === null) {
      // Only proceed if point is null (just scored) and lines are set for the new point.
      return;
    }
    // homePossession should have been flipped by recordPoint already.
    // This method sets up activePoint for the receiving team.
    let offensePlayers: string[];
    let defensePlayers: string[];

    if (this.homePossession) {
      // This is the team receiving
      offensePlayers = this.homePlayers;
      defensePlayers = this.awayPlayers;
    } else {
      offensePlayers = this.awayPlayers;
      defensePlayers = this.homePlayers;
    }
    
    const newPoint = new PointModel(offensePlayers, defensePlayers);
    setActivePointModel(newPoint);
    // DO NOT set firstActor here.
    // NO MEMENTO for this automatic setup step, as it's an intermediate state.
  };

  enhancedGame.resumePoint = function(): void {
    return;
  };

  enhancedGame.updateViewAfterAction = function(): void {
    // Determine the correct view based on current game state
    const newView = this.determineCorrectView();
    
    // Only update if the view actually needs to change
    if (this.currentView !== newView) {
      this.currentView = newView;
    }
  };

  enhancedGame.determineCorrectView = function(): GameView {
    // Error state takes precedence
    if (this.localError !== null) {
      return 'error_state';
    }

    // If no players are selected, we need to select lines
    if (this.homePlayers === null || this.awayPlayers === null) {
      return 'selectLines';
    }

    // If players are selected but no active point, we're between points
    if (this.activePoint === null) {
      // After a point is scored, we stay in selectLines until new lines are chosen
      return 'selectLines';
    }

    // If we have an active point and players selected, we're recording stats
    return 'recordStats';
  };

  enhancedGame.undo = function(): void {
    if (this.undoStack.length === 0) return;

    const command = this.undoStack.pop()!;

    switch (command.type) {
      case 'recordFirstActor':
        this.undoRecordFirstActor();
        break;
      case 'recordPull':
        this.undoRecordPull();
        break;
      case 'recordPass':
        this.undoRecordPass();
        break;
      case 'recordDrop':
      case 'recordThrowAway':
        this.undoRecordTurnover();
        break;
      case 'recordD':
        this.undoRecordD();
        break;
      case 'recordCatchD':
        this.undoRecordCatchD();
        break;
      case 'recordPoint':
        this.undoRecordPoint(command);
        break;
      case 'recordHalf':
        this.undoRecordHalf();
        break;
      case 'recordSubstitution':
        this.undoRecordSubstitution(command);
        break;
    }

    this.updateViewAfterAction();
  };

  // Undo helper methods
  enhancedGame.undoRecordFirstActor = function(): void {
    const activePoint = getActivePointModel();
    // Can infer if point was created by checking if it has no events
    const pointWasCreated = activePoint && activePoint.getEventCount() === 0;

    this.firstActor = null; // Reset firstActor

    if (pointWasCreated) {
      this.activePoint = null;
    }
  };

  enhancedGame.undoRecordPull = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint) return;

    const pullEvent = activePoint.removeLastEvent(); // Remove PULL event
    this.changePossession(); // Revert possession flip from pull
    activePoint.swapOffenseAndDefense(); // Revert player swap
    this.firstActor = pullEvent?.firstActor || null; // Restore the puller as firstActor
    setActivePointModel(activePoint);
  };

  enhancedGame.undoRecordPass = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint) return;

    const passEvent = activePoint.removeLastEvent(); // Remove PASS event
    this.firstActor = passEvent?.firstActor || null; // Restore passer as firstActor
    setActivePointModel(activePoint);
  };

  enhancedGame.undoRecordTurnover = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint) return;

    const turnoverEvent = activePoint.removeLastEvent(); // Remove DROP/THROWAWAY event
    this.firstActor = turnoverEvent?.firstActor || null; // Restore player who had disc
    this.changePossession(); // Revert possession flip from turnover
    setActivePointModel(activePoint);
  };

  enhancedGame.undoRecordD = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint) return;

    const dEvent = activePoint.removeLastEvent(); // Remove DEFENSE event
    this.firstActor = dEvent?.firstActor || null; // Restore player who got the D
    setActivePointModel(activePoint);
  };

  enhancedGame.undoRecordCatchD = function(): void {
    const activePoint = getActivePointModel();
    if (!activePoint) return;

    const catchDEvent = activePoint.removeLastEvent(); // Remove DEFENSE event
    this.firstActor = catchDEvent?.firstActor || null; // Restore player who got the catch D
    setActivePointModel(activePoint);
  };

  enhancedGame.undoRecordPoint = function(command: UndoCommand): void {
    const data = command.data;

    // Restore activePoint from completed points
    const lastPoint = this.points.pop();
    if (!lastPoint) return;

    this.activePoint = lastPoint;
    const activePoint = getActivePointModel();
    if (!activePoint) return;
    
    activePoint.removeLastEvent(); // Remove the POINT event

    // Decrement the correct team's score using stored possession data
    if (data.wasHomePossession) {
      this.homeScore--;
    } else {
      this.awayScore--;
    }

    // Restore possession to what it was during the point
    this.homePossession = data.wasHomePossession;

    // Restore firstActor from the last event
    const lastEvent = activePoint.getLastEvent();
    if (lastEvent?.type === EventType.PASS) {
      this.firstActor = lastEvent.secondActor; // The receiver who scored
    } else {
      this.firstActor = lastEvent?.firstActor || null;
    }

    // Restore line selection from the lastPlayedLine (which was set when the point was scored)
    if (this.lastPlayedLine) {
      this.homePlayers = [...this.lastPlayedLine.home];
      this.awayPlayers = [...this.lastPlayedLine.away];
    }

    // Set UI state to resume the point
    this.currentView = 'recordStats';
    setActivePointModel(activePoint);
  };

  enhancedGame.undoRecordHalf = function(): void {
    this.pointsAtHalf = 0; // Reset to "no half recorded"

    // Restore line state from the last completed point
    if (this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1];

      // Determine which team had possession for that point
      const lastPointWasHomePossession = this.determinePointPossession(lastPoint);

      if (lastPointWasHomePossession) {
        this.homePlayers = [...lastPoint.offensePlayers];
        this.awayPlayers = [...lastPoint.defensePlayers];
      } else {
        this.homePlayers = [...lastPoint.defensePlayers];
        this.awayPlayers = [...lastPoint.offensePlayers];
      }

      // Restore lastPlayedLine
      this.lastPlayedLine = {
        home: [...this.homePlayers],
        away: [...this.awayPlayers]
      };
    } else {
      // No points played yet, clear everything
      this.homePlayers = null;
      this.awayPlayers = null;
      this.lastPlayedLine = null;
    }
  };

  enhancedGame.undoRecordSubstitution = function(command: UndoCommand): void {
    const data = command.data;

    this.homePlayers = data.savedHomePlayers ? [...data.savedHomePlayers] : null;
    this.awayPlayers = data.savedAwayPlayers ? [...data.savedAwayPlayers] : null;

    const activePoint = getActivePointModel();
    if (activePoint) {
      activePoint.offensePlayers = [...data.savedOffensePlayers];
      activePoint.defensePlayers = [...data.savedDefensePlayers];
      setActivePointModel(activePoint);
    }
  };

  enhancedGame.determinePointPossession = function(point: any): boolean {
    // Simple heuristic: if home team players are in offense, it was home possession
    // This is a simplified version - in practice you might need more sophisticated logic
    const homeRoster = new Set(this.homeRoster);
    const offensePlayersFromHome = point.offensePlayers.filter((p: string) => homeRoster.has(p));
    return offensePlayersFromHome.length > 0;
  };

  enhancedGame.setError = function(error: string | null): void {
    this.localError = error;
    if (error !== null) {
      this.currentView = 'error_state';
    } else {
      // Clear error and determine correct view
      this.currentView = this.determineCorrectView();
    }
  };

  enhancedGame.clearError = function(): void {
    this.setError(null);
  };

  return enhancedGame;
}

// Type definition for the enhanced StoredGame
export interface StoredGameMethods {
  // State query methods
  gameState(): GameState;
  shouldRecordNewPass(): boolean;
  firstPointOfGameOrHalf(): boolean;
  
  // Action methods
  recordFirstActor(player: string, isHomeTeamPlayer: boolean): void;
  recordPull(): void;
  recordPass(receiver: string): void;
  recordDrop(): void;
  recordThrowAway(): void;
  recordD(): void;
  recordCatchD(): void;
  recordPoint(): void;
  recordHalf(): void;
  recordActivePlayers(activeHomePlayers: string[], activeAwayPlayers: string[]): void;
  recordSubstitution(newHomePlayers: string[], newAwayPlayers: string[]): void;
  
  // Undo methods
  undo(): void;
  
  // View management
  updateViewAfterAction(): void;
  determineCorrectView(): GameView;
  
  // Utility methods
  changePossession(): void;
  prepareNewPointAfterScore(): void;
  resumePoint(): void;
  startPointAndSetPossession(isHomeTeamStartingWithDisc: boolean): void;
  
  // Undo helper methods
  undoRecordFirstActor(): void;
  undoRecordPull(): void;
  undoRecordPass(): void;
  undoRecordTurnover(): void;
  undoRecordD(): void;
  undoRecordCatchD(): void;
  undoRecordPoint(command: UndoCommand): void;
  undoRecordHalf(): void;
  undoRecordSubstitution(command: UndoCommand): void;
  determinePointPossession(point: any): boolean;
  setError(error: string | null): void;
  clearError(): void;
}
