// Enums
export enum EventType {
    PULL = "PULL",
    PASS = "PASS",
    POINT = "POINT",
    DEFENSE = "DEFENSE",
    THROWAWAY = "THROWAWAY",
    DROP = "DROP",
}

export enum GameState {
    Normal = 1,
    FirstD = 2,
    Start = 3,
    Pull = 4,
    WhoPickedUpDisc = 5,
    FirstThrowQuebecVariant = 6,
    SecondD = 7,
}

export enum MementoType {
    GenericUndoLastEvent,
    UndoTurnover,
    RecordFirstActor,
    RecordPull,
    RecordPass,
    RecordDrop,
    RecordThrowAway, // Added this missing type
    RecordD,
    RecordCatchD,
    RecordPoint,
    RecordHalf,
}

// Interfaces
export interface League {
    id: string;
    name: string;
}

export interface Team {
    id: number;
    name: string;
}

export interface Event {
    type: EventType;
    firstActor: string;
    secondActor?: string | null;
    timestamp: string; // ISO 8601 format
}

export interface SerializedMemento {
    type: MementoType;
    data: any; // Specific data captured by the memento
}

// Model Classes
export class PointModel {
    offensePlayers: string[];
    defensePlayers: string[];
    events: Event[];

    constructor(offensePlayers: string[], defensePlayers: string[], events: Event[] = []) {
        this.offensePlayers = [...offensePlayers];
        this.defensePlayers = [...defensePlayers];
        this.events = events.map(e => ({ ...e })); // Deep copy events
    }

    getEventCount(): number {
        return this.events.length;
    }

    getLastEventType(): EventType | null {
        if (this.events.length === 0) {
            return null;
        }
        return this.events[this.events.length - 1].type;
    }

    removeLastEvent(): Event | undefined {
        return this.events.pop();
    }

    addEvent(event: Event): void {
        this.events.push(event);
    }

    swapOffenseAndDefense(): void {
        [this.offensePlayers, this.defensePlayers] = [this.defensePlayers, this.offensePlayers];
    }

    prettyPrint(): string[] {
        return this.events.map(event => {
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
                    const _exhaustiveCheck: never = event.type; // Ensures all cases are handled
                    return "Unknown event";
                }
            }
        });
    }

    toJSON(): { offensePlayers: string[]; defensePlayers: string[]; events: Event[] } {
        return {
            offensePlayers: [...this.offensePlayers],
            defensePlayers: [...this.defensePlayers],
            events: this.events.map(e => ({ ...e })),
        };
    }

    static fromJSON(json: { offensePlayers: string[]; defensePlayers: string[]; events: Event[] }): PointModel {
        return new PointModel(json.offensePlayers, json.defensePlayers, json.events);
    }
}

export class GameModel {
    points: PointModel[];

    constructor(points: PointModel[] = []) {
        this.points = points;
    }

    getPointCount(): number {
        return this.points.length;
    }

    addPoint(point: PointModel): void {
        this.points.push(point);
    }

    popPoint(): PointModel | undefined {
        return this.points.pop();
    }

    toJSON(): { points: Array<{ offensePlayers: string[]; defensePlayers: string[]; events: Event[] }> } {
        return {
            points: this.points.map(p => p.toJSON()),
        };
    }

    static fromJSON(json: { points: Array<{ offensePlayers: string[]; defensePlayers: string[]; events: Event[] }> }): GameModel {
        return new GameModel(json.points.map(pJson => PointModel.fromJSON(pJson)));
    }
}


// For Bookkeeper state serialization
export interface BookkeeperVolatileState {
    activePoint: { offensePlayers: string[]; defensePlayers: string[]; events: Event[] } | null;
    firstActor: string | null;
    homePossession: boolean;
    pointsAtHalf: number;
    homePlayers: string[] | null;
    awayPlayers: string[] | null;
    homeScore: number;
    awayScore: number;
    homeParticipants: string[];
    awayParticipants: string[];
}

export interface SerializedGameData {
    // Game metadata from original Bookkeeper.serialize
    league_id: string;
    week: number;
    homeTeamName: string; // Renamed from homeTeam to avoid conflict with Team object
    awayTeamName: string; // Renamed from awayTeam to avoid conflict with Team object
    homeTeamId: number;
    awayTeamId: number;

    // Core game data (points)
    game: { points: Array<{ offensePlayers: string[]; defensePlayers: string[]; events: Event[] }> };

    // Bookkeeper's volatile operational state
    bookkeeperState: BookkeeperVolatileState;

    // Mementos for undo stack
    mementos: SerializedMemento[];
}
