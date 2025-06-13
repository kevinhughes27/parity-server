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
  GameView,
  ActionOptions,
} from './models';
import { db, StoredGame, mapApiPointEventToModelEvent, mapModelEventToApiPointEvent } from './db';
import { getLeagueName, uploadCompleteGame, UploadedGamePayload } from '../../api';

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

  public activeGame: GameModel = new GameModel(); // Made public for easier access in LocalGame
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

  // New: UI state management
  private gameId: number | null = null;
  private currentView: GameView = 'loading';
  private localError: string | null = null;
  private isResumingPointMode: boolean = false;
  private lastPlayedLine: { home: string[]; away: string[] } | null = null;

  // New: Observer pattern for React integration
  private listeners: Set<() => void> = new Set();

  // I still think we need to streamline this constructor and persistence logic.
  // the responsibilities between this and the db.ts overlap in a new way in the typescript version
  // lets see how the UI integration changes things and revisit later.
  constructor(
    league: League,
    week: number,
    homeTeam: Team,
    awayTeam: Team,
    initialData: SerializedGameData,
    gameId?: number
  ) {
    this.league = league;
    this.week = week;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.gameId = gameId || null;

    this.mementos = [];
    this.homeParticipants = new Set<string>();
    this.awayParticipants = new Set<string>();

    this.hydrate(initialData);
    this.determineInitialView();
  }

  // New: Static factory method to replace the complex initialization logic
  static async loadFromDatabase(gameId: number): Promise<Bookkeeper> {
    const storedGame = await db.games.get(gameId);
    if (!storedGame) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (!storedGame.homeTeamId || !storedGame.awayTeamId) {
      throw new Error('Game data is missing team IDs. Cannot initialize Bookkeeper.');
    }

    // Import leagues dynamically to avoid circular dependencies
    const { leagues: apiLeagues } = await import('../../api');
    const apiLeague = apiLeagues.find(l => l.id === storedGame.league_id.toString());

    if (!apiLeague) {
      throw new Error(`League configuration for ID ${storedGame.league_id} not found.`);
    }

    const leagueForBk: League = {
      id: storedGame.league_id,
      name: getLeagueName(storedGame.league_id) || 'Unknown League',
      lineSize: apiLeague.lineSize,
    };

    const homeTeamForBk: Team = { id: storedGame.homeTeamId, name: storedGame.homeTeam };
    const awayTeamForBk: Team = { id: storedGame.awayTeamId, name: storedGame.awayTeam };

    const transformedGamePoints = storedGame.points.map(apiPoint => {
      return PointModel.fromJSON({
        offensePlayers: [...apiPoint.offensePlayers],
        defensePlayers: [...apiPoint.defensePlayers],
        events: apiPoint.events.map(mapApiPointEventToModelEvent),
      });
    });

    let activePointForHydration: PointModel | null = null;
    if (storedGame.bookkeeperState?.activePoint) {
      activePointForHydration = PointModel.fromJSON(storedGame.bookkeeperState.activePoint);
    }

    const bookkeeperStateForHydration: BookkeeperVolatileState = {
      ...(storedGame.bookkeeperState || {
        activePoint: null,
        firstActor: null,
        homePossession: true,
        pointsAtHalf: 0,
        homePlayers: null,
        awayPlayers: null,
        homeScore: 0,
        awayScore: 0,
        homeParticipants: storedGame.homeRoster
          ? [...storedGame.homeRoster].sort((a, b) => a.localeCompare(b))
          : [],
        awayParticipants: storedGame.awayRoster
          ? [...storedGame.awayRoster].sort((a, b) => a.localeCompare(b))
          : [],
      }),
      activePoint: activePointForHydration ? activePointForHydration.toJSON() : null,
      homeParticipants: storedGame.bookkeeperState?.homeParticipants
        ? [...storedGame.bookkeeperState.homeParticipants].sort((a, b) => a.localeCompare(b))
        : [...storedGame.homeRoster].sort((a, b) => a.localeCompare(b)),
      awayParticipants: storedGame.bookkeeperState?.awayParticipants
        ? [...storedGame.bookkeeperState.awayParticipants].sort((a, b) => a.localeCompare(b))
        : [...storedGame.awayRoster].sort((a, b) => a.localeCompare(b)),
    };

    const initialSerializedData: SerializedGameData = {
      league_id: storedGame.league_id,
      week: storedGame.week,
      homeTeamName: storedGame.homeTeam,
      awayTeamName: storedGame.awayTeam,
      homeTeamId: storedGame.homeTeamId,
      awayTeamId: storedGame.awayTeamId,
      game: { points: transformedGamePoints.map(p => p.toJSON()) },
      bookkeeperState: bookkeeperStateForHydration,
      mementos: storedGame.mementos || [],
    };

    return new Bookkeeper(
      leagueForBk,
      storedGame.week,
      homeTeamForBk,
      awayTeamForBk,
      initialSerializedData,
      gameId
    );
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
    if (this.activePoint === null) {
      return GameState.Start;
    }

    const eventCount = this.activePoint.getEventCount();
    const lastEventType = this.activePoint.getLastEventType();

    if (eventCount === 0) {
      // New point, no events yet
      if (this.firstActor === null) {
        // Waiting for player to initiate
        if (this.firstPointOfGameOrHalf()) {
          return GameState.Start; // Select puller
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
  }

  public shouldRecordNewPass(): boolean {
    return this.firstActor !== null;
  }

  public firstPointOfGameOrHalf(): boolean {
    return this.activeGame.getPointCount() === this.pointsAtHalf;
  }

  private changePossession(): void {
    this.homePossession = !this.homePossession;
  }

  public recordActivePlayers(activeHomePlayers: string[], activeAwayPlayers: string[]): void {
    this.homePlayers = [...activeHomePlayers];
    this.awayPlayers = [...activeAwayPlayers];
  }

  public updateParticipants(homeParticipants: string[], awayParticipants: string[]): void {
    this.homeParticipants = new Set(homeParticipants);
    this.awayParticipants = new Set(awayParticipants);
  }

  // New: Unified action method that handles persistence
  async performAction(action: (bk: Bookkeeper) => void, options: ActionOptions = {}): Promise<void> {
    const actionName = action.name || action.toString();

    // Track state for view transitions
    if (actionName.includes('recordPoint')) {
      this.lastPlayedLine = {
        home: [...(this.homePlayers || [])],
        away: [...(this.awayPlayers || [])]
      };
      this.isResumingPointMode = false;
    }

    // Execute the action
    action(this);

    // Auto-save unless explicitly skipped
    if (!options.skipSave) {
      await this.saveToDatabase(options.newStatus);
    }

    // Update view state
    if (!options.skipViewChange) {
      this.updateViewState();
    }

    // Notify React components
    this.notifyListeners();
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

    if (this.homePossession) {
      // This is the team receiving
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

  public getCurrentPointPrettyPrint(): string[] {
    if (this.activePoint !== null) {
      return this.activePoint.prettyPrint();
    } else {
      return [];
    }
  }

  public getLastCompletedPointPrettyPrint(): string[] {
    if (this.activeGame.getPointCount() > 0) {
      const lastPoint = this.activeGame.points[this.activeGame.getPointCount() - 1];
      return lastPoint.prettyPrint();
    }
    return [];
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
          this.activePoint = null;
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
  ): InternalMemento {
    // For Pass, D (non-turnover D)
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
    return {
      type: MementoType.RecordCatchD,
      data: data,
      apply: () => {
        this.activePoint!.removeLastEvent();
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

  // New: Automatic view state management
  private determineInitialView(): void {
    if (this.activePoint === null && (this.homePlayers === null || this.awayPlayers === null)) {
      this.isResumingPointMode = false;
      this.currentView = 'selectLines';
    } else {
      this.isResumingPointMode = true;
      this.lastPlayedLine = null;
      this.currentView = 'recordStats';
    }
  }

  private updateViewState(): void {
    if (this.activePoint === null && (this.homePlayers === null || this.awayPlayers === null)) {
      this.currentView = 'selectLines';
    } else {
      this.currentView = 'recordStats';
    }
  }

  // New: Persistence built into bookkeeper
  private async saveToDatabase(newStatus?: StoredGame['status']): Promise<void> {
    if (!this.gameId) {
      throw new Error('Cannot save: no game ID');
    }

    const serializedData = this.serialize();
    const dbData = this.transformForDatabase(serializedData, newStatus);

    try {
      await db.games.update(this.gameId, dbData);
    } catch (error) {
      this.localError = `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.notifyListeners();
      throw error;
    }
  }

  private transformForDatabase(serializedData: SerializedGameData, newStatus?: StoredGame['status']): Partial<StoredGame> {
    const pointsForStorage = serializedData.game.points.map(modelPointJson => ({
      offensePlayers: [...modelPointJson.offensePlayers],
      defensePlayers: [...modelPointJson.defensePlayers],
      events: modelPointJson.events.map(mapModelEventToApiPointEvent),
    }));

    const bookkeeperStateForStorage: BookkeeperVolatileState = {
      ...serializedData.bookkeeperState,
      homeParticipants: [...serializedData.bookkeeperState.homeParticipants].sort((a, b) =>
        a.localeCompare(b)
      ),
      awayParticipants: [...serializedData.bookkeeperState.awayParticipants].sort((a, b) =>
        a.localeCompare(b)
      ),
    };

    return {
      homeScore: serializedData.bookkeeperState.homeScore,
      awayScore: serializedData.bookkeeperState.awayScore,
      points: pointsForStorage,
      bookkeeperState: bookkeeperStateForStorage,
      mementos: serializedData.mementos,
      homeRoster: [...serializedData.bookkeeperState.homeParticipants].sort((a, b) =>
        a.localeCompare(b)
      ),
      awayRoster: [...serializedData.bookkeeperState.awayParticipants].sort((a, b) =>
        a.localeCompare(b)
      ),
      lastModified: new Date(),
      status: newStatus || 'in-progress',
    };
  }

  // New: Game submission
  async submitGame(): Promise<void> {
    if (!this.gameId) {
      throw new Error('Cannot submit: no game ID');
    }

    try {
      await this.saveToDatabase('submitted');
      const apiPayload = this.transformForAPI();
      const response = await uploadCompleteGame(apiPayload);

      if (response.ok) {
        await this.saveToDatabase('uploaded');
      } else {
        await this.saveToDatabase('sync-error');
        const errorText = await response.text();
        let errorMessage = `Failed to submit game: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage += ` - ${errorData.message || errorData.detail || 'Server error'}`;
        } catch {
          errorMessage += ` - ${errorText || 'Server error with no JSON body'}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.localError = `Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.notifyListeners();
      throw error;
    }
  }

  private transformForAPI(): UploadedGamePayload {
    const bkState = this.serialize();
    return {
      league_id: bkState.league_id,
      week: bkState.week,
      homeTeam: bkState.homeTeamName,
      homeScore: bkState.bookkeeperState.homeScore,
      homeRoster: [...bkState.bookkeeperState.homeParticipants].sort((a, b) =>
        a.localeCompare(b)
      ),
      awayTeam: bkState.awayTeamName,
      awayScore: bkState.bookkeeperState.awayScore,
      awayRoster: [...bkState.bookkeeperState.awayParticipants].sort((a, b) =>
        a.localeCompare(b)
      ),
      points: bkState.game.points.map(pJson => ({
        offensePlayers: pJson.offensePlayers,
        defensePlayers: pJson.defensePlayers,
        events: pJson.events.map(mapModelEventToApiPointEvent),
      })),
    };
  }

  // New: React integration
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // New: State getters for React
  getCurrentView(): GameView { return this.currentView; }
  getError(): string | null { return this.localError; }
  getIsResumingPointMode(): boolean { return this.isResumingPointMode; }
  getLastPlayedLine(): { home: string[]; away: string[] } | null { return this.lastPlayedLine; }
  getHomeParticipants(): string[] { return Array.from(this.homeParticipants).sort((a, b) => a.localeCompare(b)); }
  getAwayParticipants(): string[] { return Array.from(this.awayParticipants).sort((a, b) => a.localeCompare(b)); }
  getGameStatus(): StoredGame['status'] { return 'in-progress'; } // TODO: Track actual status
  setIsResumingPointMode(value: boolean): void {
    this.isResumingPointMode = value;
    this.notifyListeners();
  }
  setLastPlayedLine(value: { home: string[]; away: string[] } | null): void {
    this.lastPlayedLine = value;
    this.notifyListeners();
  }

  // Getter for tests
  public getMementosCount(): number {
    return this.mementos.length;
  }
}
