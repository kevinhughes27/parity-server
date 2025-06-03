import {
    EventType, GameState, League, Team, Event, PointModel, GameModel,
    SerializedMemento, MementoType, BookkeeperVolatileState, SerializedGameData
} from './models';

interface InternalMemento {
    type: MementoType;
    data: any;
    apply: () => void;
}

export class Bookkeeper {
    public league: League;
    public homeTeam: Team;
    public awayTeam: Team;
    public week: number;

    private activeGame: GameModel;
    private mementos: InternalMemento[];

    // Volatile state - needs to be serialized/deserialized
    public activePoint: PointModel | null = null;
    public firstActor: string | null = null;
    public homePossession: boolean = true;
    public homeScore: number = 0;
    public awayScore: number = 0;
    private pointsAtHalf: number = 0;
    public homePlayers: string[] | null = null;
    public awayPlayers: string[] | null = null;
    private homeParticipants: Set<string>;
    private awayParticipants: Set<string>;


    constructor(league: League, week: number, homeTeam: Team, awayTeam: Team, initialData?: SerializedGameData | GameModel) {
        this.league = league;
        this.week = week;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;

        this.mementos = [];
        this.homeParticipants = new Set<string>();
        this.awayParticipants = new Set<string>();

        if (initialData && 'bookkeeperState' in initialData) { // Check if it's SerializedGameData
            this.hydrate(initialData);
        } else if (initialData instanceof GameModel) {
            this.activeGame = initialData;
            // Initialize fresh for a GameModel passed in (e.g. new game)
            this.homeScore = 0;
            this.awayScore = 0;
            this.pointsAtHalf = 0;
            this.homePossession = true; // Default for a new game
        } else {
            this.activeGame = new GameModel();
            // Default fresh initialization
            this.homeScore = 0;
            this.awayScore = 0;
            this.pointsAtHalf = 0;
            this.homePossession = true;
        }
    }

    private hydrate(data: SerializedGameData): void {
        this.activeGame = GameModel.fromJSON(data.game);

        const state = data.bookkeeperState;
        this.activePoint = state.activePoint ? PointModel.fromJSON(state.activePoint) : null;
        this.firstActor = state.firstActor;
        this.homePossession = state.homePossession;
        this.pointsAtHalf = state.pointsAtHalf;
        this.homePlayers = state.homePlayers ? [...state.homePlayers] : null;
        this.awayPlayers = state.awayPlayers ? [...state.awayPlayers] : null;
        this.homeScore = state.homeScore;
        this.awayScore = state.awayScore;
        this.homeParticipants = new Set(state.homeParticipants);
        this.awayParticipants = new Set(state.awayParticipants);

        // Reconstruct mementos with their apply functions
        this.mementos = data.mementos.map(sm => {
            const mData = sm.data;
            let applyFn: () => void;

            switch (sm.type) {
                case MementoType.RecordFirstActor:
                    applyFn = () => {
                        this.firstActor = mData.savedFirstActor;
                        if (mData.pointJustCreated && this.activePoint && this.activePoint.getEventCount() === 0) {
                            this.activePoint = null;
                            this.changePossession();
                        }
                    };
                    break;
                case MementoType.RecordPull:
                    applyFn = () => {
                        this.activePoint!.swapOffenseAndDefense();
                        this.changePossession();
                        this.activePoint!.removeLastEvent();
                        this.firstActor = mData.savedFirstActor;
                    };
                    break;
                case MementoType.RecordPass: // Or GenericUndoLastEvent
                case MementoType.GenericUndoLastEvent:
                     applyFn = () => {
                        this.activePoint!.removeLastEvent();
                        this.firstActor = mData.savedFirstActor;
                    };
                    break;
                case MementoType.RecordDrop: // Or UndoTurnover
                case MementoType.RecordThrowAway: // Or UndoTurnover
                case MementoType.UndoTurnover:
                    applyFn = () => {
                        this.activePoint!.removeLastEvent();
                        this.firstActor = mData.savedFirstActor;
                        this.changePossession();
                    };
                    break;
                case MementoType.RecordD:
                     applyFn = () => { // Same as GenericUndoLastEvent
                        this.activePoint!.removeLastEvent();
                        this.firstActor = mData.savedFirstActor;
                    };
                    break;
                case MementoType.RecordCatchD:
                    applyFn = () => {
                        this.activePoint!.removeLastEvent();
                        // firstActor is not restored from mData as it wasn't changed by forward action
                        // but if it was part of mData, it would be: this.firstActor = mData.savedFirstActor;
                    };
                    break;
                case MementoType.RecordPoint:
                    applyFn = () => {
                        if (mData.wasHomePossession) {
                            this.homeScore--;
                        } else {
                            this.awayScore--;
                        }
                        const undonePoint = this.activeGame.popPoint();
                        if (undonePoint) {
                            this.activePoint = undonePoint;
                            this.activePoint.removeLastEvent();
                        }
                        this.homePlayers = mData.savedHomePlayers ? [...mData.savedHomePlayers] : null;
                        this.awayPlayers = mData.savedAwayPlayers ? [...mData.savedAwayPlayers] : null;
                        this.firstActor = mData.savedFirstActor;
                        this.homePossession = mData.wasHomePossession;
                        // Note: Participant undo is complex and usually not fully implemented in simple mementos
                        // For this, we'd need to track exact additions per point.
                        // Current Java version also doesn't undo participant list changes.
                    };
                    break;
                case MementoType.RecordHalf:
                    applyFn = () => {
                        this.pointsAtHalf = mData.previousPointsAtHalf;
                    };
                    break;
                default:
                    console.warn("Unknown memento type during hydration:", sm.type);
                    applyFn = () => {}; // No-op for unknown types
            }
            return { type: sm.type, data: mData, apply: applyFn };
        });
    }

    public serialize(): SerializedGameData {
        const bookkeeperState: BookkeeperVolatileState = {
            activePoint: this.activePoint ? this.activePoint.toJSON() : null,
            firstActor: this.firstActor,
            homePossession: this.homePossession,
            pointsAtHalf: this.pointsAtHalf,
            homePlayers: this.homePlayers ? [...this.homePlayers] : null,
            awayPlayers: this.awayPlayers ? [...this.awayPlayers] : null,
            homeScore: this.homeScore,
            awayScore: this.awayScore,
            homeParticipants: Array.from(this.homeParticipants),
            awayParticipants: Array.from(this.awayParticipants),
        };

        const serializedMementos: SerializedMemento[] = this.mementos.map(m => ({
            type: m.type,
            data: m.data,
        }));

        return {
            league_id: this.league.id,
            week: this.week,
            homeTeamName: this.homeTeam.name,
            awayTeamName: this.awayTeam.name,
            homeTeamId: this.homeTeam.id,
            awayTeamId: this.awayTeam.id,
            game: this.activeGame.toJSON(),
            bookkeeperState: bookkeeperState,
            mementos: serializedMementos,
        };
    }


    public gameState(): GameState {
        const firstPoint = this.activeGame.getPointCount() === this.pointsAtHalf;
        const firstEvent = this.activePoint === null || this.activePoint.getEventCount() === 0;

        if (this.activePoint === null) {
            return GameState.Start;
        } else if (firstPoint && firstEvent && this.firstActor === null) {
            return GameState.Start;
        } else if (firstPoint && firstEvent) {
            return GameState.Pull;
        } else if (this.activePoint.getLastEventType() === EventType.PULL && this.firstActor === null) {
            return GameState.WhoPickedUpDisc;
        } else if (this.activePoint.getLastEventType() === EventType.PULL) {
            return GameState.FirstThrowQuebecVariant;
        } else if (firstEvent && this.firstActor === null) {
            return GameState.WhoPickedUpDisc;
        } else if (firstEvent) {
            return GameState.FirstThrowQuebecVariant;
        } else if (this.activePoint.getLastEventType() === EventType.THROWAWAY && this.firstActor !== null) {
            return GameState.FirstD;
        } else if (this.activePoint.getLastEventType() === EventType.DEFENSE && this.firstActor === null) {
            return GameState.WhoPickedUpDisc;
        } else if (this.activePoint.getLastEventType() === EventType.DEFENSE) {
            return GameState.SecondD;
        } else if (this.activePoint.getLastEventType() === EventType.THROWAWAY) {
            return GameState.WhoPickedUpDisc;
        } else if (this.activePoint.getLastEventType() === EventType.DROP && this.firstActor === null) {
            return GameState.WhoPickedUpDisc;
        } else if (this.activePoint.getLastEventType() === EventType.DROP) {
            return GameState.SecondD;
        } else {
            return GameState.Normal;
        }
    }

    public shouldRecordNewPass(): boolean {
        return this.firstActor !== null;
    }

    private changePossession(): void {
        this.homePossession = !this.homePossession;
    }

    public recordActivePlayers(activeHomePlayers: string[], activeAwayPlayers: string[]): void {
        this.homePlayers = [...activeHomePlayers];
        this.awayPlayers = [...activeAwayPlayers];
    }

    public recordFirstActor(player: string, isHomeTeamPlayer: boolean): void {
        const mementoData = {
            savedFirstActor: this.firstActor,
            pointJustCreated: this.activePoint === null
        };

        this.mementos.push({
            type: MementoType.RecordFirstActor,
            data: mementoData,
            apply: () => {
                this.firstActor = mementoData.savedFirstActor;
                if (mementoData.pointJustCreated && this.activePoint && this.activePoint.getEventCount() === 0) {
                    this.activePoint = null;
                    this.changePossession(); // Revert possession change from startPoint
                }
            }
        });

        if (this.activePoint === null) {
            this.startPoint(isHomeTeamPlayer);
        }
        this.firstActor = player;
    }

    private startPoint(isHomeTeamPullingOrReceiving: boolean): void {
        // Possession is for the team that will be on OFfense.
        // If home team is pulling, away team has possession.
        // If home team is receiving (e.g. away pulled), home team has possession.
        // The parameter `isHomeTeamPullingOrReceiving` should reflect who is starting with the disc on O.
        this.homePossession = isHomeTeamPullingOrReceiving;

        let offensePlayers: string[];
        let defensePlayers: string[];

        if (this.homePossession) {
            offensePlayers = this.homePlayers || [];
            defensePlayers = this.awayPlayers || [];
        } else {
            offensePlayers = this.awayPlayers || [];
            defensePlayers = this.homePlayers || [];
        }
        this.activePoint = new PointModel(offensePlayers, defensePlayers);
    }

    public recordPull(): void {
        if (!this.activePoint || !this.firstActor) return;

        const mementoData = { savedFirstActor: this.firstActor };
        this.mementos.push({
            type: MementoType.RecordPull,
            data: mementoData,
            apply: () => {
                this.activePoint!.swapOffenseAndDefense();
                this.changePossession();
                this.activePoint!.removeLastEvent();
                this.firstActor = mementoData.savedFirstActor;
            }
        });

        this.activePoint.swapOffenseAndDefense();
        this.changePossession();
        this.activePoint.addEvent({ type: EventType.PULL, firstActor: this.firstActor!, secondActor: null, timestamp: new Date().toISOString() });
        this.firstActor = null;
    }

    public recordThrowAway(): void {
        if (!this.activePoint || !this.firstActor) return;

        this.mementos.push(this.createUndoTurnoverMemento(MementoType.RecordThrowAway));
        this.changePossession();
        this.activePoint.addEvent({ type: EventType.THROWAWAY, firstActor: this.firstActor!, secondActor: null, timestamp: new Date().toISOString() });
        this.firstActor = null;
    }

    public recordPass(receiver: string): void {
        if (!this.activePoint || !this.firstActor) return;

        this.mementos.push(this.createGenericUndoLastEventMemento(MementoType.RecordPass));
        this.activePoint.addEvent({ type: EventType.PASS, firstActor: this.firstActor!, secondActor: receiver, timestamp: new Date().toISOString() });
        this.firstActor = receiver;
    }

    public recordDrop(): void {
        if (!this.activePoint || !this.firstActor) return;

        this.mementos.push(this.createUndoTurnoverMemento(MementoType.RecordDrop));
        this.changePossession();
        this.activePoint.addEvent({ type: EventType.DROP, firstActor: this.firstActor!, secondActor: null, timestamp: new Date().toISOString() });
        this.firstActor = null;
    }

    public recordD(): void {
        if (!this.activePoint || !this.firstActor) return;

        this.mementos.push(this.createGenericUndoLastEventMemento(MementoType.RecordD));
        this.activePoint.addEvent({ type: EventType.DEFENSE, firstActor: this.firstActor!, secondActor: null, timestamp: new Date().toISOString() });
        this.firstActor = null;
    }

    public recordCatchD(): void {
        if (!this.activePoint || !this.firstActor) return;

        const mementoData = { savedFirstActor: this.firstActor }; // firstActor does not change
        this.mementos.push({
            type: MementoType.RecordCatchD,
            data: mementoData,
            apply: () => {
                this.activePoint!.removeLastEvent();
                // this.firstActor = mementoData.savedFirstActor; // Not strictly needed as it wasn't changed
            }
        });
        this.activePoint.addEvent({ type: EventType.DEFENSE, firstActor: this.firstActor!, secondActor: null, timestamp: new Date().toISOString() });
    }

    public recordPoint(): void {
        if (!this.activePoint || !this.firstActor) return;

        const mementoData = {
            savedFirstActor: this.firstActor,
            savedHomePlayers: this.homePlayers ? [...this.homePlayers] : null,
            savedAwayPlayers: this.awayPlayers ? [...this.awayPlayers] : null,
            wasHomePossession: this.homePossession
        };

        this.mementos.push({
            type: MementoType.RecordPoint,
            data: mementoData,
            apply: () => {
                if (mData.wasHomePossession) {
                    this.homeScore--;
                } else {
                    this.awayScore--;
                }
                const undonePoint = this.activeGame.popPoint();
                if (undonePoint) {
                    this.activePoint = undonePoint;
                    this.activePoint.removeLastEvent();
                }
                this.homePlayers = mData.savedHomePlayers;
                this.awayPlayers = mData.savedAwayPlayers;
                this.firstActor = mData.savedFirstActor;
                this.homePossession = mData.wasHomePossession;
                // Participant undo is not handled here, same as Java
            }
        });

        this.activePoint.addEvent({ type: EventType.POINT, firstActor: this.firstActor!, secondActor: null, timestamp: new Date().toISOString() });
        this.activeGame.addPoint(this.activePoint);

        if (this.homePossession) {
            this.homeScore++;
        } else {
            this.awayScore++;
        }

        if (this.homePlayers) this.homePlayers.forEach(p => this.homeParticipants.add(p));
        if (this.awayPlayers) this.awayPlayers.forEach(p => this.awayParticipants.add(p));

        this.activePoint = null;
        this.homePlayers = null;
        this.awayPlayers = null;
        this.firstActor = null;
        // homePossession for next point is determined by who starts with disc
    }

    public recordHalf(): void {
        if (this.pointsAtHalf > 0) return;

        const mementoData = { previousPointsAtHalf: this.pointsAtHalf };
        this.mementos.push({
            type: MementoType.RecordHalf,
            data: mementoData,
            apply: () => {
                this.pointsAtHalf = mementoData.previousPointsAtHalf;
            }
        });
        this.pointsAtHalf = this.activeGame.getPointCount();
    }

    public undo(): void {
        if (this.mementos.length > 0) {
            this.mementos.pop()!.apply();
        }
    }

    public undoHistory(): string[] {
        if (this.activePoint !== null) {
            return this.activePoint.prettyPrint();
        } else {
            return [];
        }
    }

    private createGenericUndoLastEventMemento(type: MementoType): InternalMemento {
        const mementoData = { savedFirstActor: this.firstActor };
        return {
            type: type, // More specific type
            data: mementoData,
            apply: () => {
                this.activePoint!.removeLastEvent();
                this.firstActor = mementoData.savedFirstActor;
            }
        };
    }

    private createUndoTurnoverMemento(type: MementoType): InternalMemento {
        const mementoData = { savedFirstActor: this.firstActor };
        return {
            type: type, // More specific type
            data: mementoData,
            apply: () => {
                this.activePoint!.removeLastEvent();
                this.firstActor = mementoData.savedFirstActor;
                this.changePossession();
            }
        };
    }

    // Getter for tests
    public getMementosCount(): number {
        return this.mementos.length;
    }
}
