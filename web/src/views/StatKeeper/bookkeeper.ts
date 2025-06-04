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
  public pointsAtHalf: number = 0;
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
    const firstPointOfGameOrHalf = this.activeGame.getPointCount() === this.pointsAtHalf;

    if (this.activePoint === null) {
      // If activePoint is null, it means we are either at the very start of a game (before lines),
      // or a point just ended and we are in SelectLines view, or we are waiting for lines to be set.
      // If homePlayers are set, it implies lines have been selected.
      // The logic in LocalGame.tsx (handleLinesSelected) aims to create activePoint via prepareNewPointAfterScore
      // before RecordStats is shown, for non-first points.
      // So, if activePoint is null here, it's typically GameState.Start (e.g. very beginning, or first point of half).
      return GameState.Start;
    }

    // ActivePoint exists from here
    const eventCount = this.activePoint.getEventCount();
    const lastEventType = this.activePoint.getLastEventType();

    if (eventCount === 0) { // New point, no events yet in activePoint
      if (this.firstActor === null) {
        // activePoint exists, 0 events, firstActor is null.
        // This means lines are set, possession is determined, waiting for player to initiate action.
        // This is the state after prepareNewPointAfterScore() or if undo leads here.
        if (firstPointOfGameOrHalf) {
          // This should ideally be a state like "SelectPuller" if we want to be very specific.
          // However, GameState.Start is used by Java to enable all players to select the puller.
          // If recordFirstActor then sets firstActor, next state is Pull.
          return GameState.Start; // Allows selection of puller from either team.
        } else {
          // Not the first point of game/half. Receiving team needs to pick up.
          return GameState.WhoPickedUpDisc;
        }
      } else {
        // firstActor is set, 0 events. Player has disc, ready for first throw or pull.
        if (firstPointOfGameOrHalf) { // Player selected is the puller
          return GameState.Pull;
        } else { // Player selected picked up the disc
          return GameState.FirstThrowQuebecVariant;
        }
      }
    }

    // Point has events
    if (lastEventType === EventType.PULL) {
      if (this.firstActor === null) return GameState.WhoPickedUpDisc; // Disc is in the air or landed, waiting for pickup
      return GameState.FirstThrowQuebecVariant; // Quebec: puller can be the first thrower if they pick up
    }

    // Standard game flow states based on last event and firstActor
    // These states assume firstActor is relevant for the *next* action
    if (this.firstActor === null) { // Disc is loose or action needed by current possession team
      if (lastEventType === EventType.THROWAWAY || lastEventType === EventType.DROP || lastEventType === EventType.DEFENSE) {
        // After a turnover, the new offense needs to pick up the disc.
        return GameState.WhoPickedUpDisc;
      }
      // If firstActor is null for other reasons (e.g. after pull), already handled.
      // This path might be hit if an undo operation results in firstActor being null with existing events.
      // Consider if other specific states are needed here.
    } else { // firstActor is set (player has the disc)
      // These states describe what the player with the disc *can* do, or what just happened to them.
      // The original Java logic for FirstD/SecondD seems to be about the *type* of throw available
      // or if a D just happened.
      if (lastEventType === EventType.THROWAWAY) {
        // This state seems to imply that firstActor is now on defense, which is counter-intuitive
        // as recordThrowAway sets firstActor to null.
        // This might be intended for *after* the other team picks up and firstActor is set for them.
        // For now, let's assume if firstActor is set, it's normal play unless a D just occurred.
        // The original conditions for FirstD/SecondD were:
        // GameState.FirstD: THROW AWAY and firstActor != null (Java) -> this means firstActor is on D
        // GameState.SecondD: DEFENSE and firstActor != null (Java) -> firstActor is on O after D
        // GameState.SecondD: DROP and firstActor != null (Java) -> firstActor is on O after drop by other team
        // This part of the logic might need review based on how FirstD/SecondD are used in UI.
        // For simplicity, if firstActor has the disc, it's generally Normal.
        // Specific states like FirstD/SecondD might be better determined by event history + firstActor.
        // Let's stick to a simpler model for now if it covers UI needs.
        // If a D just happened (last event) AND this firstActor (who has disc) was the one who got the D:
        if (this.activePoint.getLastEvent()?.firstActor === this.firstActor &&
            (lastEventType === EventType.DEFENSE /*|| lastEventType === EventType.CALLAHAN_TODO */) ) {
             return GameState.SecondD; // Player who got D now has disc (e.g. Callahan or quick pickup)
        }
        return GameState.Normal;
      }
      // If last event was a D, and firstActor is now set (meaning player picked up after D):
      if (lastEventType === EventType.DEFENSE) return GameState.SecondD; // Or FirstThrowQuebecVariant if it's their first throw
      // If last event was a Drop (by other team), and firstActor is now set:
      if (lastEventType === EventType.DROP) return GameState.SecondD; // Similar to after a D

      return GameState.Normal;
    }
    // Fallback, should ideally be covered by above logic
    return GameState.Normal;
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
      // This implies the point is starting from scratch (e.g. first point of game/half)
      // Possession is determined by the team of the player clicked.
      this.startPointAndSetPossession(isHomeTeamPlayer);
    }
    this.firstActor = player;
  }

  private startPointAndSetPossession(isHomeTeamStartingWithDisc: boolean): void {
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

  public prepareNewPointAfterScore(): void {
    if (this.activePoint !== null || this.homePlayers === null || this.awayPlayers === null) {
        // Only proceed if point is null (just scored) and lines are set for the new point.
        return;
    }
    // homePossession should have been flipped by recordPoint already.
    // This method sets up activePoint for the receiving team.
    let offensePlayers: string[];
    let defensePlayers: string[];

    if (this.homePossession) { // This is the team receiving
        offensePlayers = this.homePlayers;
        defensePlayers = this.awayPlayers;
    } else {
        offensePlayers = this.awayPlayers;
        defensePlayers = this.homePlayers;
    }
    this.activePoint = new PointModel(offensePlayers, defensePlayers);
    // DO NOT set firstActor here.
    // NO MEMENTO for this automatic setup step, as it's an intermediate state.
    // Undoing the subsequent recordFirstActor will handle reverting firstActor,
    // and if further undos occur, they will revert actions before this point.
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
    this.firstActor = null; // After a D, the disc is loose, so no specific player has it.
  }

  public recordCatchD(): void {
    if (!this.activePoint || !this.firstActor) return;

    const mementoData = { savedFirstActor: this.firstActor };
    this.mementos.push(this.createRecordCatchDMemento(mementoData));

    this.activePoint.addEvent({
      type: EventType.DEFENSE, // Still a DEFENSE event type
      firstActor: this.firstActor!, // Player who got the D
      secondActor: null, // No second actor for a D itself
      timestamp: new Date().toISOString(),
    });
    // For a Catch D, the player who made the D (firstActor) now has possession.
    // Possession does not change here, as it's assumed their team was already on D.
    // firstActor remains the player who got the catch D.
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

    this.changePossession(); // Flip possession for the next point
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
          data.pointJustCreated && // True if activePoint was null when recordFirstActor was called
          this.activePoint && // activePoint was created by startPointAndSetPossession
          this.activePoint.getEventCount() === 0 // No events added yet by recordFirstActor itself
        ) {
          // This implies we are undoing the very first action that created this activePoint.
          // We also need to revert possession if startPointAndSetPossession changed it.
          // However, memento doesn't store previous possession.
          // This part of memento might need to be smarter or rely on subsequent undos.
          // For now, just nullify activePoint. Possession will be reset by next recordFirstActor.
          this.activePoint = null;
          // Reverting possession change by startPointAndSetPossession is tricky here.
          // The original Java code's memento for firstActor also didn't explicitly revert possession.
          // It relied on the fact that if activePoint becomes null, the next call to recordFirstActor
          // would call startPoint again, re-evaluating possession.
        }
      },
    };
  }

  private createRecordPullMemento(data: { savedFirstActor: string | null }): InternalMemento {
    return {
      type: MementoType.RecordPull,
      data: data,
      apply: () => {
        this.activePoint!.removeLastEvent(); // Remove PULL event
        this.changePossession(); // Revert possession flip from pull
        this.activePoint!.swapOffenseAndDefense(); // Revert player swap
        this.firstActor = data.savedFirstActor;
      },
    };
  }

  private createUndoLastEventStyleMemento(
    type: MementoType,
    data: { savedFirstActor: string | null }
  ): InternalMemento { // For Pass, D (non-turnover D)
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
    type: MementoType, // For ThrowAway, Drop
    data: { savedFirstActor: string | null }
  ): InternalMemento {
    return {
      type: type,
      data: data,
      apply: () => {
        this.activePoint!.removeLastEvent();
        this.firstActor = data.savedFirstActor;
        this.changePossession(); // Revert possession flip from turnover
      },
    };
  }

  private createRecordCatchDMemento(data: { savedFirstActor: string | null }): InternalMemento {
    // Undoing a Catch D means the player (firstActor) no longer has the disc from that D.
    // The event is removed. firstActor reverts to who it was before this Catch D action.
    // If this firstActor was null before (e.g. disc was loose), it becomes null.
    // If this firstActor *was* the one who got the D, they remain firstActor but the D event is gone.
    // The original Java code for undoing CatchD just removed the event.
    // It implies firstActor was already set to the D-getter before CatchD was called.
    // Let's assume recordCatchD is called when firstActor is already the D-getter.
    return {
      type: MementoType.RecordCatchD,
      data: data,
      apply: () => {
        this.activePoint!.removeLastEvent();
        // firstActor remains who it was (the D-getter), but the D event is gone.
        // If the intent was that firstActor becomes null (disc loose again), this needs change.
        // Sticking to minimal change: firstActor was data.savedFirstActor *before* this action.
        this.firstActor = data.savedFirstActor;
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
        // Revert score
        if (data.wasHomePossession) {
          this.homeScore--;
        } else {
          this.awayScore--;
        }
        // Revert possession for the *next* point (which was flipped by recordPoint)
        this.changePossession();

        // Restore activePoint from game history
        const undonePoint = this.activeGame.popPoint();
        if (undonePoint) {
          this.activePoint = undonePoint;
          this.activePoint.removeLastEvent(); // Remove the POINT event itself
        }
        // Restore players on line and firstActor for the point that was just undone
        this.homePlayers = data.savedHomePlayers ? [...data.savedHomePlayers] : null;
        this.awayPlayers = data.savedAwayPlayers ? [...data.savedAwayPlayers] : null;
        this.firstActor = data.savedFirstActor;
        // Possession for the *current undone point* is restored
        this.homePossession = data.wasHomePossession;

        // TODO: Revert participant list? More complex, usually not undone.
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
