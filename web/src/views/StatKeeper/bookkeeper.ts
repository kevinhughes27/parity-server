import {
  EventType,
  GameState,
  League,
  Team,
  PointModel,
  GameModel,
  SerializedMemento,
  MementoType,
  BookkeeperVolatileState,
  SerializedGameData,
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

  private activeGame: GameModel = new GameModel();
  private mementos: InternalMemento[];

  // Volatile state - needs to be serialized/deserialized
  public activePoint: PointModel | null = null;
  public firstActor: string | null = null;
  public homePossession: boolean = true;
  public homeScore: number = 0;
  public awayScore: number = 0;
  public pointsAtHalf: number = 0; // Changed from private to public
  public homePlayers: string[] | null = null;
  public awayPlayers: string[] | null = null;
  private homeParticipants: Set<string>;
  private awayParticipants: Set<string>;

  // I still think we need to streamline this constructor and persistence logic.
  // the responsibilities between this and the db.ts overlap in a new way in the typescript version
  // lets see how the UI integration changes things and revisit later.
  constructor(
    league: League,
    week: number,
    homeTeam: Team,
    awayTeam: Team,
    initialData: SerializedGameData
  ) {
    this.league = league;
    this.week = week;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;

    this.mementos = [];
    this.homeParticipants = new Set<string>();
    this.awayParticipants = new Set<string>();

    this.hydrate(initialData);
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

    this.mementos = data.mementos.map(sm => this.recreateInternalMemento(sm));
  }

  private recreateInternalMemento(sm: SerializedMemento): InternalMemento {
    const mData = sm.data;
    switch (sm.type) {
      case MementoType.RecordFirstActor:
        return this.createRecordFirstActorMemento(
          mData as { savedFirstActor: string | null; pointJustCreated: boolean }
        );
      case MementoType.RecordPull:
        return this.createRecordPullMemento(mData as { savedFirstActor: string | null });
      case MementoType.RecordPass:
      case MementoType.RecordD:
      case MementoType.GenericUndoLastEvent:
        return this.createUndoLastEventStyleMemento(
          sm.type,
          mData as { savedFirstActor: string | null }
        );
      case MementoType.RecordDrop:
      case MementoType.RecordThrowAway:
      case MementoType.UndoTurnover:
        return this.createTurnoverStyleMemento(
          sm.type,
          mData as { savedFirstActor: string | null }
        );
      case MementoType.RecordCatchD:
        return this.createRecordCatchDMemento(mData as { savedFirstActor: string | null });
      case MementoType.RecordPoint:
        return this.createRecordPointMemento(
          mData as {
            savedFirstActor: string | null;
            savedHomePlayers: string[] | null;
            savedAwayPlayers: string[] | null;
            wasHomePossession: boolean;
          }
        );
      case MementoType.RecordHalf:
        return this.createRecordHalfMemento(mData as { previousPointsAtHalf: number });
      default:
        console.warn('Unknown memento type during hydration:', sm.type);
        return { type: sm.type, data: mData, apply: () => {} };
    }
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
    } else if (
      this.activePoint.getLastEventType() === EventType.THROWAWAY &&
      this.firstActor !== null
    ) {
      return GameState.FirstD;
    } else if (
      this.activePoint.getLastEventType() === EventType.DEFENSE &&
      this.firstActor === null
    ) {
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
      pointJustCreated: this.activePoint === null,
    };
    this.mementos.push(this.createRecordFirstActorMemento(mementoData));

    if (this.activePoint === null) {
      this.startPoint(isHomeTeamPlayer);
    }
    this.firstActor = player;
  }

  private startPoint(isHomeTeamStartingWithDisc: boolean): void {
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
    this.activePoint = new PointModel(offensePlayers, defensePlayers);
  }

  public recordPull(): void {
    if (!this.activePoint || !this.firstActor) return;

    const mementoData = { savedFirstActor: this.firstActor };
    this.mementos.push(this.createRecordPullMemento(mementoData));

    this.activePoint.swapOffenseAndDefense();
    this.changePossession();
    this.activePoint.addEvent({
      type: EventType.PULL,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.firstActor = null;
  }

  public recordThrowAway(): void {
    if (!this.activePoint || !this.firstActor) return;

    const mementoData = { savedFirstActor: this.firstActor };
    this.mementos.push(this.createTurnoverStyleMemento(MementoType.RecordThrowAway, mementoData));

    this.changePossession();
    this.activePoint.addEvent({
      type: EventType.THROWAWAY,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.firstActor = null;
  }

  public recordPass(receiver: string): void {
    if (!this.activePoint || !this.firstActor) return;

    const mementoData = { savedFirstActor: this.firstActor };
    this.mementos.push(this.createUndoLastEventStyleMemento(MementoType.RecordPass, mementoData));

    this.activePoint.addEvent({
      type: EventType.PASS,
      firstActor: this.firstActor!,
      secondActor: receiver,
      timestamp: new Date().toISOString(),
    });
    this.firstActor = receiver;
  }

  public recordDrop(): void {
    if (!this.activePoint || !this.firstActor) return;

    const mementoData = { savedFirstActor: this.firstActor };
    this.mementos.push(this.createTurnoverStyleMemento(MementoType.RecordDrop, mementoData));

    this.changePossession();
    this.activePoint.addEvent({
      type: EventType.DROP,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.firstActor = null;
  }

  public recordD(): void {
    if (!this.activePoint || !this.firstActor) return;

    const mementoData = { savedFirstActor: this.firstActor };
    this.mementos.push(this.createUndoLastEventStyleMemento(MementoType.RecordD, mementoData));

    this.activePoint.addEvent({
      type: EventType.DEFENSE,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.firstActor = null;
  }

  public recordCatchD(): void {
    if (!this.activePoint || !this.firstActor) return;

    const mementoData = { savedFirstActor: this.firstActor };
    this.mementos.push(this.createRecordCatchDMemento(mementoData));

    this.activePoint.addEvent({
      type: EventType.DEFENSE,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
  }

  public recordPoint(): void {
    if (!this.activePoint || !this.firstActor) return;

    const mementoData = {
      savedFirstActor: this.firstActor,
      savedHomePlayers: this.homePlayers ? [...this.homePlayers] : null,
      savedAwayPlayers: this.awayPlayers ? [...this.awayPlayers] : null,
      wasHomePossession: this.homePossession,
    };
    this.mementos.push(this.createRecordPointMemento(mementoData));

    this.activePoint.addEvent({
      type: EventType.POINT,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
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
  }

  public recordHalf(): void {
    if (this.pointsAtHalf > 0) return; // Half already recorded

    const mementoData = { previousPointsAtHalf: this.pointsAtHalf };
    this.mementos.push(this.createRecordHalfMemento(mementoData));
    this.pointsAtHalf = this.activeGame.getPointCount();
  }

  public undo(): void {
    if (this.mementos.length > 0) {
      const lastMemento = this.mementos.pop();
      if (lastMemento) {
        lastMemento.apply();
      }
    }
  }

  public undoHistory(): string[] {
    if (this.activePoint !== null) {
      return this.activePoint.prettyPrint();
    } else {
      return [];
    }
  }

  // Memento Creation Helpers
  private createRecordFirstActorMemento(data: {
    savedFirstActor: string | null;
    pointJustCreated: boolean;
  }): InternalMemento {
    return {
      type: MementoType.RecordFirstActor,
      data: data,
      apply: () => {
        this.firstActor = data.savedFirstActor;
        if (
          data.pointJustCreated &&
          this.activePoint &&
          this.activePoint.getEventCount() === 0
        ) {
          this.activePoint = null;
          this.changePossession();
        }
      },
    };
  }

  private createRecordPullMemento(data: { savedFirstActor: string | null }): InternalMemento {
    return {
      type: MementoType.RecordPull,
      data: data,
      apply: () => {
        this.activePoint!.swapOffenseAndDefense();
        this.changePossession();
        this.activePoint!.removeLastEvent();
        this.firstActor = data.savedFirstActor;
      },
    };
  }

  private createUndoLastEventStyleMemento(
    type: MementoType,
    data: { savedFirstActor: string | null }
  ): InternalMemento {
    return {
      type: type,
      data: data,
      apply: () => {
        this.activePoint!.removeLastEvent();
        this.firstActor = data.savedFirstActor;
      },
    };
  }

  private createTurnoverStyleMemento(
    type: MementoType,
    data: { savedFirstActor: string | null }
  ): InternalMemento {
    return {
      type: type,
      data: data,
      apply: () => {
        this.activePoint!.removeLastEvent();
        this.firstActor = data.savedFirstActor;
        this.changePossession();
      },
    };
  }

  private createRecordCatchDMemento(data: { savedFirstActor: string | null }): InternalMemento {
    return {
      type: MementoType.RecordCatchD,
      data: data,
      apply: () => {
        this.activePoint!.removeLastEvent();
      },
    };
  }

  private createRecordPointMemento(data: {
    savedFirstActor: string | null;
    savedHomePlayers: string[] | null;
    savedAwayPlayers: string[] | null;
    wasHomePossession: boolean;
  }): InternalMemento {
    return {
      type: MementoType.RecordPoint,
      data: data,
      apply: () => {
        if (data.wasHomePossession) {
          this.homeScore--;
        } else {
          this.awayScore--;
        }
        const undonePoint = this.activeGame.popPoint();
        if (undonePoint) {
          this.activePoint = undonePoint;
          this.activePoint.removeLastEvent();
        }
        this.homePlayers = data.savedHomePlayers ? [...data.savedHomePlayers] : null;
        this.awayPlayers = data.savedAwayPlayers ? [...data.savedAwayPlayers] : null;
        this.firstActor = data.savedFirstActor;
        this.homePossession = data.wasHomePossession;
      },
    };
  }

  private createRecordHalfMemento(data: { previousPointsAtHalf: number }): InternalMemento {
    return {
      type: MementoType.RecordHalf,
      data: data,
      apply: () => {
        this.pointsAtHalf = data.previousPointsAtHalf;
      },
    };
  }

  // Getter for tests
  public getMementosCount(): number {
    return this.mementos.length;
  }
}
