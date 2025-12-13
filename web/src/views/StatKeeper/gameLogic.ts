import { StoredGame, StoredPlayer, UndoCommand } from './db';
import { type PointEvent as ApiPointEvent, type Point as ApiPoint } from '../../api';

export enum EventType {
  PULL = 'PULL',
  PASS = 'PASS',
  POINT = 'POINT',
  DEFENSE = 'DEFENSE',
  THROWAWAY = 'THROWAWAY',
  DROP = 'DROP',
}

export enum GameState {
  Start,
  Pull,
  PickUp,
  FirstThrow,
  Normal,
  AfterTurnover,
  AfterDrop,
  AfterPull,
}

export interface Event {
  type: EventType;
  firstActor: string;
  secondActor: string | null;
  timestamp: string; // ISO 8601 format
}

export function mapApiEventToEvent(apiEvent: ApiPointEvent): Event {
  const eventTypeString = apiEvent.type.toUpperCase();
  const eventType = EventType[eventTypeString as keyof typeof EventType];

  if (!eventType) {
    throw new Error(`Unknown API event type string encountered: ${apiEvent.type}`);
  }

  return {
    type: eventType,
    firstActor: apiEvent.firstActor,
    secondActor: apiEvent.secondActor,
    timestamp: apiEvent.timestamp,
  };
}

export function mapEventToApiEvent(event: Event): ApiPointEvent {
  return {
    type: event.type.toString(), // Converts enum to string e.g. EventType.PASS -> "PASS"
    firstActor: event.firstActor,
    secondActor: event.secondActor,
    timestamp: event.timestamp,
  };
}

// PointMethods class - operates on Point data without modifying it
export class PointMethods {
  constructor(private point: ApiPoint) {}

  getEventCount(): number {
    return this.point.events.length;
  }

  getLastEvent(): Event | null {
    if (this.point.events.length === 0) {
      return null;
    }
    const lastApiEvent = this.point.events[this.point.events.length - 1];
    return mapApiEventToEvent(lastApiEvent);
  }

  getSecondToLastEvent(): Event | null {
    if (this.point.events.length < 2) {
      return null;
    }
    const secondToLastApiEvent = this.point.events[this.point.events.length - 2];
    return mapApiEventToEvent(secondToLastApiEvent);
  }

  getLastEventType(): EventType | null {
    const lastEvent = this.getLastEvent();
    return lastEvent ? lastEvent.type : null;
  }

  getEvents(): Event[] {
    return this.point.events.map(mapApiEventToEvent);
  }

  removeLastEvent(): Event | undefined {
    const removedApiEvent = this.point.events.pop();
    return removedApiEvent ? mapApiEventToEvent(removedApiEvent) : undefined;
  }

  addEvent(event: Event): void {
    this.point.events.push(mapEventToApiEvent(event));
  }

  swapOffenseAndDefense(): void {
    [this.point.offensePlayers, this.point.defensePlayers] = [
      this.point.defensePlayers,
      this.point.offensePlayers,
    ];
  }

  updateCurrentPlayers(newOffensePlayers: string[], newDefensePlayers: string[]): void {
    this.point.offensePlayers = [...newOffensePlayers];
    this.point.defensePlayers = [...newDefensePlayers];
  }

  prettyPrint(): string[] {
    return this.point.events.map(apiEvent => {
      const event = mapApiEventToEvent(apiEvent);
      switch (event.type) {
        case EventType.PULL:
          return `${event.firstActor} pulled`;
        case EventType.PASS:
          return `${event.firstActor} passed to ${event.secondActor}`;
        case EventType.POINT:
          return `${event.firstActor} scored!`;
        case EventType.DEFENSE:
          return `${event.firstActor} got a block`;
        case EventType.THROWAWAY:
          return `${event.firstActor} threw it away`;
        case EventType.DROP:
          return `${event.firstActor} dropped it`;
        default: {
          // This exhaustive check helps ensure all event types are handled.
          // If a new EventType is added without a case here, TypeScript will error.
          const _exhaustiveCheck: never = event.type;
          console.warn('Unknown event type in prettyPrint:', event.type);
          return `Unknown event: ${event.type}`;
        }
      }
    });
  }

  toJSON(): {
    offensePlayers: string[];
    defensePlayers: string[];
    events: ApiPointEvent[];
  } {
    return {
      offensePlayers: [...this.point.offensePlayers],
      defensePlayers: [...this.point.defensePlayers],
      events: this.point.events.map(e => ({ ...e })),
    };
  }

  static fromJSON(json: {
    offensePlayers: string[];
    defensePlayers: string[];
    events: ApiPointEvent[];
  }): PointMethods {
    const point: ApiPoint = {
      offensePlayers: [...json.offensePlayers],
      defensePlayers: [...json.defensePlayers],
      events: json.events.map(e => ({ ...e })),
    };
    return new PointMethods(point);
  }
}

// GameMethods class - operates on a StoredGame object without modifying it
export class GameMethods {
  constructor(private game: StoredGame) {}

  private getActivePointMethods(): PointMethods | null {
    if (!this.game.activePoint) return null;
    return new PointMethods(this.game.activePoint);
  }

  gameState(): GameState {
    const activePointMethods = this.getActivePointMethods();

    if (activePointMethods === null) {
      return GameState.Start;
    }

    const eventCount = activePointMethods.getEventCount();
    const lastEventType = activePointMethods.getLastEventType();

    if (eventCount === 0) {
      if (this.game.firstActor === null) {
        return this.firstPointOfGameOrHalf() ? GameState.Start : GameState.PickUp;
      } else {
        return this.firstPointOfGameOrHalf() ? GameState.Pull : GameState.FirstThrow;
      }
    }

    // Point has events from here

    if (this.game.firstActor === null) {
      // Disc is loose after pull, turnover, or block
      return GameState.PickUp;
    }

    // Player has possession
    if (lastEventType === EventType.THROWAWAY) {
      return GameState.AfterTurnover;
    }

    if (lastEventType === EventType.DROP) {
      return GameState.AfterDrop;
    }

    if (lastEventType === EventType.PULL) {
      return GameState.AfterPull;
    }

    if (lastEventType === EventType.PASS || lastEventType === EventType.DEFENSE) {
      return GameState.Normal;
    }

    // Fallback
    console.warn(
      `GameState: Unhandled state with firstActor=${this.game.firstActor}, lastEvent=${lastEventType}. Defaulting to Normal.`
    );
    return GameState.Normal;
  }

  timestamp(): string {
    return new Date().toLocaleString('en-US');
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
      timestamp: this.timestamp(),
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

    this.game.activePoint = {
      offensePlayers: [...offensePlayers],
      defensePlayers: [...defensePlayers],
      events: [],
    };
  }

  recordPull(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordPull',
      timestamp: this.timestamp(),
    });

    activePointMethods.swapOffenseAndDefense();
    this.changePossession();
    activePointMethods.addEvent({
      type: EventType.PULL,
      firstActor: this.game.firstActor!,
      secondActor: null,
      timestamp: this.timestamp(),
    });
    this.game.firstActor = null;
  }

  recordPass(receiver: string): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordPass',
      timestamp: this.timestamp(),
    });

    activePointMethods.addEvent({
      type: EventType.PASS,
      firstActor: this.game.firstActor!,
      secondActor: receiver,
      timestamp: this.timestamp(),
    });
    this.game.firstActor = receiver;
  }

  recordDrop(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordDrop',
      timestamp: this.timestamp(),
    });

    this.changePossession();
    activePointMethods.addEvent({
      type: EventType.DROP,
      firstActor: this.game.firstActor!,
      secondActor: null,
      timestamp: this.timestamp(),
    });
    this.game.firstActor = null;
  }

  recordThrowAway(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordThrowAway',
      timestamp: this.timestamp(),
    });

    this.changePossession();
    activePointMethods.addEvent({
      type: EventType.THROWAWAY,
      firstActor: this.game.firstActor!,
      secondActor: null,
      timestamp: this.timestamp(),
    });
    this.game.firstActor = null;
  }

  recordD(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordD',
      timestamp: this.timestamp(),
    });

    activePointMethods.addEvent({
      type: EventType.DEFENSE,
      firstActor: this.game.firstActor!,
      secondActor: null,
      timestamp: this.timestamp(),
    });
    this.game.firstActor = null; // After a D, the disc is loose, so no specific player has it.
  }

  recordCatchD(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods || !this.game.firstActor) return;

    this.game.undoStack.push({
      type: 'recordCatchD',
      timestamp: this.timestamp(),
    });

    activePointMethods.addEvent({
      type: EventType.DEFENSE, // Still a DEFENSE event type
      firstActor: this.game.firstActor!, // Player who got the D
      secondActor: null, // No second actor for a D itself
      timestamp: this.timestamp(),
    });
    // For a Catch D, the player who made the D (firstActor) now has possession.
    // Possession does not change here, as it's assumed their team was already on D.
    // firstActor remains the player who got the catch D.
  }

  recordPoint(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods || !this.game.firstActor) return;

    // Store the last played line before clearing it
    if (this.game.homePlayers && this.game.awayPlayers) {
      this.game.lastPlayedLine = {
        home: [...this.game.homePlayers],
        away: [...this.game.awayPlayers],
      };
    }

    // Store the possession state for this point before flipping it
    this.game.undoStack.push({
      type: 'recordPoint',
      timestamp: this.timestamp(),
      data: {
        wasHomePossession: this.game.homePossession,
      },
    });

    activePointMethods.addEvent({
      type: EventType.POINT,
      firstActor: this.game.firstActor!,
      secondActor: null,
      timestamp: this.timestamp(),
    });

    // Add the completed point to the game
    this.game.points.push(activePointMethods.toJSON());

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
  }

  recordHalf(): void {
    if (this.game.pointsAtHalf > 0) return; // Half already recorded
    if (this.game.activePoint !== null) {
      throw new Error(
        'Cannot record half time during an active point. Finish the current point first.'
      );
    }

    this.game.undoStack.push({
      type: 'recordHalf',
      timestamp: this.timestamp(),
    });

    this.game.pointsAtHalf = this.game.points.length;
  }

  recordActivePlayers(activeHomePlayers: string[], activeAwayPlayers: string[]): void {
    this.game.homePlayers = [...activeHomePlayers];
    this.game.awayPlayers = [...activeAwayPlayers];
  }

  updateRosters(homeRoster: StoredPlayer[], awayRoster: StoredPlayer[]): void {
    this.game.homeRoster = [...homeRoster].sort((a, b) => a.name.localeCompare(b.name));
    this.game.awayRoster = [...awayRoster].sort((a, b) => a.name.localeCompare(b.name));

    // Automatically remove players from active line if they're no longer in roster
    const homeRosterNames = new Set(homeRoster.map(player => player.name));
    const awayRosterNames = new Set(awayRoster.map(player => player.name));

    let homePlayersChanged = false;
    let awayPlayersChanged = false;

    // Remove players from home line if they're no longer in home roster
    if (this.game.homePlayers) {
      const filteredHomePlayers = this.game.homePlayers.filter(playerName =>
        homeRosterNames.has(playerName)
      );
      if (filteredHomePlayers.length !== this.game.homePlayers.length) {
        this.game.homePlayers = filteredHomePlayers;
        homePlayersChanged = true;
      }
    }

    // Remove players from away line if they're no longer in away roster
    if (this.game.awayPlayers) {
      const filteredAwayPlayers = this.game.awayPlayers.filter(playerName =>
        awayRosterNames.has(playerName)
      );
      if (filteredAwayPlayers.length !== this.game.awayPlayers.length) {
        this.game.awayPlayers = filteredAwayPlayers;
        awayPlayersChanged = true;
      }
    }

    // If we have an active point and players were removed, update the active point as well
    if ((homePlayersChanged || awayPlayersChanged) && this.game.activePoint) {
      const activePointMethods = this.getActivePointMethods();
      if (activePointMethods && this.game.homePlayers && this.game.awayPlayers) {
        // Update the active point with the new filtered player lists
        let newOffensePlayers: string[];
        let newDefensePlayers: string[];

        if (this.game.homePossession) {
          newOffensePlayers = [...this.game.homePlayers];
          newDefensePlayers = [...this.game.awayPlayers];
        } else {
          newOffensePlayers = [...this.game.awayPlayers];
          newDefensePlayers = [...this.game.homePlayers];
        }

        activePointMethods.updateCurrentPlayers(newOffensePlayers, newDefensePlayers);
      }
    }
  }

  recordSubstitution(newHomePlayers: string[], newAwayPlayers: string[]): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods) return;

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
    activePointMethods.updateCurrentPlayers(newOffensePlayers, newDefensePlayers);
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
    }
  }

  // Undo helper methods
  undoRecordFirstActor(): void {
    const activePointMethods = this.getActivePointMethods();
    // Can infer if point was created by checking if it has no events
    const pointWasCreated = activePointMethods && activePointMethods.getEventCount() === 0;

    this.game.firstActor = null; // Reset firstActor

    if (pointWasCreated) {
      this.game.activePoint = null;
    }
  }

  undoRecordPull(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods) return;

    const pullEvent = activePointMethods.removeLastEvent(); // Remove PULL event
    this.changePossession(); // Revert possession flip from pull
    activePointMethods.swapOffenseAndDefense(); // Revert player swap
    this.game.firstActor = pullEvent?.firstActor || null; // Restore the puller as firstActor
  }

  undoRecordPass(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods) return;

    const passEvent = activePointMethods.removeLastEvent(); // Remove PASS event
    this.game.firstActor = passEvent?.firstActor || null; // Restore passer as firstActor
  }

  undoRecordTurnover(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods) return;

    const turnoverEvent = activePointMethods.removeLastEvent(); // Remove DROP/THROWAWAY event
    this.game.firstActor = turnoverEvent?.firstActor || null; // Restore player who had disc
    this.changePossession(); // Revert possession flip from turnover
  }

  undoRecordD(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods) return;

    const dEvent = activePointMethods.removeLastEvent(); // Remove DEFENSE event
    this.game.firstActor = dEvent?.firstActor || null; // Restore player who got the D
  }

  undoRecordCatchD(): void {
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods) return;

    const catchDEvent = activePointMethods.removeLastEvent(); // Remove DEFENSE event
    this.game.firstActor = catchDEvent?.firstActor || null; // Restore player who got the catch D
  }

  undoRecordPoint(command: UndoCommand): void {
    const data = command.data;

    // Restore activePoint from completed points
    const lastPoint = this.game.points.pop();
    if (!lastPoint) return;

    this.game.activePoint = lastPoint;
    const activePointMethods = this.getActivePointMethods();
    if (!activePointMethods) return;

    activePointMethods.removeLastEvent(); // Remove the POINT event

    // Decrement the correct team's score using stored possession data
    if (data.wasHomePossession) {
      this.game.homeScore--;
    } else {
      this.game.awayScore--;
    }

    // Restore possession to what it was during the point
    this.game.homePossession = data.wasHomePossession;

    // Point had events - restore firstActor from the last event
    const lastEvent = activePointMethods.getLastEvent();
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
  }

  undoRecordHalf(): void {
    this.game.pointsAtHalf = 0; // Reset to "no half recorded"
  }

  determinePointPossession(point: any): boolean {
    // Simple heuristic: if home team players are in offense, it was home possession
    // This is a simplified version - in practice you might need more sophisticated logic
    const homeRosterNames = new Set(this.game.homeRoster.map(p => p.name));
    const offensePlayersFromHome = point.offensePlayers.filter((p: string) =>
      homeRosterNames.has(p)
    );
    return offensePlayersFromHome.length > 0;
  }

  setError(error: string | null): void {
    this.game.localError = error;
  }
}
