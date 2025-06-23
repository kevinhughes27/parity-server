import { StoredGame, UndoCommand, type GameView } from './db';
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

// StoredGame methods implementation - operates on a StoredGame object without modifying it
export class StoredGameMethods {
  constructor(private game: StoredGame) {}

  // Helper method to get active point as PointModel
  private getActivePointModel(): PointModel | null {
    if (!this.game.activePoint) return null;
    return PointModel.fromJSON({
      offensePlayers: [...this.game.activePoint.offensePlayers],
      defensePlayers: [...this.game.activePoint.defensePlayers],
      events: this.game.activePoint.events.map(mapApiEventToEvent),
    });
  }

  // Helper method to set active point from PointModel
  private setActivePointModel(point: PointModel | null): void {
    if (point === null) {
      this.game.activePoint = null;
    } else {
      this.game.activePoint = {
        offensePlayers: [...point.offensePlayers],
        defensePlayers: [...point.defensePlayers],
        events: point.events.map(mapEventToApiEvent),
      };
    }
  }

  // Helper method to get points as PointModel array
  private getPointsModels(): PointModel[] {
    return this.game.points.map(apiPoint => {
      return PointModel.fromJSON({
        offensePlayers: [...apiPoint.offensePlayers],
        defensePlayers: [...apiPoint.defensePlayers],
        events: apiPoint.events.map(mapApiEventToEvent),
      });
    });
  }

  gameState(): GameState {
    const activePoint = this.getActivePointModel();
    
    if (activePoint === null) {
      return GameState.Start;
    }

    const eventCount = activePoint.getEventCount();
    const lastEventType = activePoint.getLastEventType();

    if (eventCount === 0) {
      // New point, no events yet
      if (this.game.firstActor === null) {
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
      if (this.game.firstActor === null) return GameState.WhoPickedUpDisc; // Pull in air/landed
      // If firstActor is set after a PULL, it means they picked up the pull.
      return GameState.FirstThrowQuebecVariant;
    }

    // Logic for states when firstActor is set vs. null, after the initial events (pull/pickup)
    if (this.game.firstActor === null) {
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
        `GameState: Unhandled state with firstActor=${this.game.firstActor}, lastEvent=${lastEventType}. Defaulting to Normal.`
      );
      return GameState.Normal;
    }
  }

  shouldRecordNewPass(): boolean {
    return this.game.firstActor !== null;
  }

  firstPointOfGameOrHalf(): boolean {
    return this.game.points.length === this.game.pointsAtHalf;
  }

  changePossession(): void {
    this.game.homePossession = !this.game.homePossession;
  }

  recordFirstActor(player: string, isHomeTeamPlayer: boolean): void {
    this.game.undoStack.push({
      type: 'recordFirstActor',
      timestamp: new Date().toISOString()
    });

    if (this.game.activePoint === null) {
      // This implies the point is starting from scratch (e.g. first point of game/half)
      // Possession is determined by the team of the player clicked.
      this.startPointAndSetPossession(isHomeTeamPlayer);
    }
    this.game.firstActor = player;
  }

  startPointAndSetPossession(isHomeTeamStartingWithDisc: boolean): void {
    this.game.homePossession = isHomeTeamStartingWithDisc;

    let offensePlayers: string[];
    let defensePlayers: string[];

    if (this.game.homePossession) {
      offensePlayers = this.game.homePlayers || [];
      defensePlayers = this.game.awayPlayers || [];
    } else {
      offensePlayers = this.game.awayPlayers || [];
      defensePlayers = this.game.homePlayers || [];
    }
    
    const newPoint = new PointModel(offensePlayers, defensePlayers);
    this.setActivePointModel(newPoint);
  }

  recordPull(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordPull',
      timestamp: new Date().toISOString()
    });

    activePoint.swapOffenseAndDefense();
    this.changePossession();
    activePoint.addEvent({
      type: EventType.PULL,
      firstActor: this.game.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.game.firstActor = null;
    this.setActivePointModel(activePoint);
  }

  recordPass(receiver: string): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordPass',
      timestamp: new Date().toISOString()
    });

    activePoint.addEvent({
      type: EventType.PASS,
      firstActor: this.game.firstActor!,
      secondActor: receiver,
      timestamp: new Date().toISOString(),
    });
    this.game.firstActor = receiver;
    this.setActivePointModel(activePoint);
  }

  recordDrop(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordDrop',
      timestamp: new Date().toISOString()
    });

    this.changePossession();
    activePoint.addEvent({
      type: EventType.DROP,
      firstActor: this.game.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.game.firstActor = null;
    this.setActivePointModel(activePoint);
  }

  recordThrowAway(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordThrowAway',
      timestamp: new Date().toISOString()
    });

    this.changePossession();
    activePoint.addEvent({
      type: EventType.THROWAWAY,
      firstActor: this.game.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.game.firstActor = null;
    this.setActivePointModel(activePoint);
  }

  recordD(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordD',
      timestamp: new Date().toISOString()
    });

    activePoint.addEvent({
      type: EventType.DEFENSE,
      firstActor: this.game.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.game.firstActor = null; // After a D, the disc is loose, so no specific player has it.
    this.setActivePointModel(activePoint);
  }

  recordCatchD(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordCatchD',
      timestamp: new Date().toISOString()
    });

    activePoint.addEvent({
      type: EventType.DEFENSE, // Still a DEFENSE event type
      firstActor: this.game.firstActor!, // Player who got the D
      secondActor: null, // No second actor for a D itself
      timestamp: new Date().toISOString(),
    });
    // For a Catch D, the player who made the D (firstActor) now has possession.
    // Possession does not change here, as it's assumed their team was already on D.
    // firstActor remains the player who got the catch D.
    this.setActivePointModel(activePoint);
  }

  recordPoint(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint || !this.game.firstActor) return;

    // Store the last played line before clearing it
    if (this.game.homePlayers && this.game.awayPlayers) {
      this.game.lastPlayedLine = {
        home: [...this.game.homePlayers],
        away: [...this.game.awayPlayers]
      };
    }

    // Store the possession state for this point before flipping it
    this.game.undoStack.push({
      type: 'recordPoint',
      timestamp: new Date().toISOString(),
      data: {
        wasHomePossession: this.game.homePossession
      }
    });

    activePoint.addEvent({
      type: EventType.POINT,
      firstActor: this.game.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    
    // Convert PointModel to API format and add to game.points
    this.game.points.push({
      offensePlayers: [...activePoint.offensePlayers],
      defensePlayers: [...activePoint.defensePlayers],
      events: activePoint.events.map(mapEventToApiEvent),
    });

    if (this.game.homePossession) {
      this.game.homeScore++;
    } else {
      this.game.awayScore++;
    }

    // Clear game state for next point
    this.game.activePoint = null;
    this.game.homePlayers = null;
    this.game.awayPlayers = null;
    this.game.firstActor = null;

    this.changePossession(); // Flip possession for the next point
    
    // Explicitly transition to line selection for next point
    this.game.currentView = 'selectLines';
  }

  recordHalf(): void {
    if (this.game.pointsAtHalf > 0) return; // Half already recorded

    this.game.undoStack.push({
      type: 'recordHalf',
      timestamp: new Date().toISOString()
    });

    this.game.pointsAtHalf = this.game.points.length;

    // Reset line selection and UI state for second half
    this.game.homePlayers = null;
    this.game.awayPlayers = null;
    this.game.lastPlayedLine = null;
    
    // Explicitly transition to line selection for second half
    this.game.currentView = 'selectLines';
  }

  recordActivePlayers(activeHomePlayers: string[], activeAwayPlayers: string[]): void {
    this.game.homePlayers = [...activeHomePlayers];
    this.game.awayPlayers = [...activeAwayPlayers];
    
    // Transition to record stats view since we now have players selected
    this.game.currentView = 'recordStats';
  }

  recordSubstitution(newHomePlayers: string[], newAwayPlayers: string[]): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint) return;

    // Store undo data for substitution
    this.game.undoStack.push({
      type: 'recordSubstitution',
      timestamp: new Date().toISOString(),
      data: {
        savedHomePlayers: this.game.homePlayers ? [...this.game.homePlayers] : null,
        savedAwayPlayers: this.game.awayPlayers ? [...this.game.awayPlayers] : null,
        savedOffensePlayers: [...activePoint.offensePlayers],
        savedDefensePlayers: [...activePoint.defensePlayers],
      }
    });

    // Update current line
    this.game.homePlayers = [...newHomePlayers];
    this.game.awayPlayers = [...newAwayPlayers];

    // Determine which team's players to update in the point
    let newOffensePlayers: string[];
    let newDefensePlayers: string[];

    if (this.game.homePossession) {
      newOffensePlayers = [...newHomePlayers];
      newDefensePlayers = [...newAwayPlayers];
    } else {
      newOffensePlayers = [...newAwayPlayers];
      newDefensePlayers = [...newHomePlayers];
    }

    // Update the active point with new players
    activePoint.updateCurrentPlayers(newOffensePlayers, newDefensePlayers);
    this.setActivePointModel(activePoint);
  }

  prepareNewPointAfterScore(): void {
    if (this.game.activePoint !== null || this.game.homePlayers === null || this.game.awayPlayers === null) {
      // Only proceed if point is null (just scored) and lines are set for the new point.
      return;
    }
    // homePossession should have been flipped by recordPoint already.
    // This method sets up activePoint for the receiving team.
    let offensePlayers: string[];
    let defensePlayers: string[];

    if (this.game.homePossession) {
      // This is the team receiving
      offensePlayers = this.game.homePlayers;
      defensePlayers = this.game.awayPlayers;
    } else {
      offensePlayers = this.game.awayPlayers;
      defensePlayers = this.game.homePlayers;
    }
    
    const newPoint = new PointModel(offensePlayers, defensePlayers);
    this.setActivePointModel(newPoint);
    // DO NOT set firstActor here.
    // NO MEMENTO for this automatic setup step, as it's an intermediate state.
  }

  resumePoint(): void {
    return;
  }

  updateViewAfterAction(): void {
    // Determine the correct view based on current game state
    const newView = this.determineCorrectView();
    
    // Only update if the view actually needs to change
    if (this.game.currentView !== newView) {
      this.game.currentView = newView;
    }
  }

  determineCorrectView(): GameView {
    // Error state takes precedence
    if (this.game.localError !== null) {
      return 'error_state';
    }

    // If no players are selected, we need to select lines
    if (this.game.homePlayers === null || this.game.awayPlayers === null) {
      return 'selectLines';
    }

    // If we have players selected, we can record stats (even without an active point)
    // The active point will be created when the first action is taken
    return 'recordStats';
  }

  undo(): void {
    if (this.game.undoStack.length === 0) return;

    const command = this.game.undoStack.pop()!;

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
  }

  // Undo helper methods
  undoRecordFirstActor(): void {
    const activePoint = this.getActivePointModel();
    // Can infer if point was created by checking if it has no events
    const pointWasCreated = activePoint && activePoint.getEventCount() === 0;

    this.game.firstActor = null; // Reset firstActor

    if (pointWasCreated) {
      this.game.activePoint = null;
    }
  }

  undoRecordPull(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint) return;

    const pullEvent = activePoint.removeLastEvent(); // Remove PULL event
    this.changePossession(); // Revert possession flip from pull
    activePoint.swapOffenseAndDefense(); // Revert player swap
    this.game.firstActor = pullEvent?.firstActor || null; // Restore the puller as firstActor
    this.setActivePointModel(activePoint);
  }

  undoRecordPass(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint) return;

    const passEvent = activePoint.removeLastEvent(); // Remove PASS event
    this.game.firstActor = passEvent?.firstActor || null; // Restore passer as firstActor
    this.setActivePointModel(activePoint);
  }

  undoRecordTurnover(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint) return;

    const turnoverEvent = activePoint.removeLastEvent(); // Remove DROP/THROWAWAY event
    this.game.firstActor = turnoverEvent?.firstActor || null; // Restore player who had disc
    this.changePossession(); // Revert possession flip from turnover
    this.setActivePointModel(activePoint);
  }

  undoRecordD(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint) return;

    const dEvent = activePoint.removeLastEvent(); // Remove DEFENSE event
    this.game.firstActor = dEvent?.firstActor || null; // Restore player who got the D
    this.setActivePointModel(activePoint);
  }

  undoRecordCatchD(): void {
    const activePoint = this.getActivePointModel();
    if (!activePoint) return;

    const catchDEvent = activePoint.removeLastEvent(); // Remove DEFENSE event
    this.game.firstActor = catchDEvent?.firstActor || null; // Restore player who got the catch D
    this.setActivePointModel(activePoint);
  }

  undoRecordPoint(command: UndoCommand): void {
    const data = command.data;

    // Restore activePoint from completed points
    const lastPoint = this.game.points.pop();
    if (!lastPoint) return;

    this.game.activePoint = lastPoint;
    const activePoint = this.getActivePointModel();
    if (!activePoint) return;
    
    activePoint.removeLastEvent(); // Remove the POINT event

    // Decrement the correct team's score using stored possession data
    if (data.wasHomePossession) {
      this.game.homeScore--;
    } else {
      this.game.awayScore--;
    }

    // Restore possession to what it was during the point
    this.game.homePossession = data.wasHomePossession;

    // Restore firstActor from the last event
    const lastEvent = activePoint.getLastEvent();
    if (lastEvent?.type === EventType.PASS) {
      this.game.firstActor = lastEvent.secondActor; // The receiver who scored
    } else {
      this.game.firstActor = lastEvent?.firstActor || null;
    }

    // Restore line selection from the lastPlayedLine (which was set when the point was scored)
    if (this.game.lastPlayedLine) {
      this.game.homePlayers = [...this.game.lastPlayedLine.home];
      this.game.awayPlayers = [...this.game.lastPlayedLine.away];
    }

    // Set UI state to resume the point
    this.game.currentView = 'recordStats';
    this.setActivePointModel(activePoint);
  }

  undoRecordHalf(): void {
    this.game.pointsAtHalf = 0; // Reset to "no half recorded"

    // Restore line state from the last completed point
    if (this.game.points.length > 0) {
      const lastPoint = this.game.points[this.game.points.length - 1];

      // Determine which team had possession for that point
      const lastPointWasHomePossession = this.determinePointPossession(lastPoint);

      if (lastPointWasHomePossession) {
        this.game.homePlayers = [...lastPoint.offensePlayers];
        this.game.awayPlayers = [...lastPoint.defensePlayers];
      } else {
        this.game.homePlayers = [...lastPoint.defensePlayers];
        this.game.awayPlayers = [...lastPoint.offensePlayers];
      }

      // Restore lastPlayedLine
      this.game.lastPlayedLine = {
        home: [...this.game.homePlayers],
        away: [...this.game.awayPlayers]
      };
    } else {
      // No points played yet, clear everything
      this.game.homePlayers = null;
      this.game.awayPlayers = null;
      this.game.lastPlayedLine = null;
    }
  }

  undoRecordSubstitution(command: UndoCommand): void {
    const data = command.data;

    this.game.homePlayers = data.savedHomePlayers ? [...data.savedHomePlayers] : null;
    this.game.awayPlayers = data.savedAwayPlayers ? [...data.savedAwayPlayers] : null;

    const activePoint = this.getActivePointModel();
    if (activePoint) {
      activePoint.offensePlayers = [...data.savedOffensePlayers];
      activePoint.defensePlayers = [...data.savedDefensePlayers];
      this.setActivePointModel(activePoint);
    }
  }

  determinePointPossession(point: any): boolean {
    // Simple heuristic: if home team players are in offense, it was home possession
    // This is a simplified version - in practice you might need more sophisticated logic
    const homeRoster = new Set(this.game.homeRoster);
    const offensePlayersFromHome = point.offensePlayers.filter((p: string) => homeRoster.has(p));
    return offensePlayersFromHome.length > 0;
  }

  setError(error: string | null): void {
    this.game.localError = error;
    if (error !== null) {
      this.game.currentView = 'error_state';
    } else {
      // Clear error and determine correct view
      this.game.currentView = this.determineCorrectView();
    }
  }

  clearError(): void {
    this.setError(null);
  }
}

// Type definition for the StoredGame methods interface
export interface IStoredGameMethods {
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
