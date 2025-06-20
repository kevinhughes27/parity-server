import {
  EventType,
  PointModel,
  mapApiEventToEvent,
  mapEventToApiEvent,
} from './models';
import { db, StoredGame } from './db';
import {
  getLeagueName,
  type Point as ApiPoint,
  type LeagueFromJson as League,
  type Team,
  leagues as apiLeagues
} from '../../api';

// Private types for Bookkeeper internal use
interface UndoCommand {
  type: 'recordFirstActor' | 'recordPull' | 'recordPass' | 'recordDrop' | 'recordThrowAway' | 
        'recordD' | 'recordCatchD' | 'recordPoint' | 'recordHalf' | 'recordSubstitution';
  timestamp: string;
  data?: any; // Minimal data only when we can't infer
}

type GameView = 'loading' | 'selectLines' | 'recordStats' | 'error_state' | 'initializing';

export enum GameState {
  Normal = 1,
  FirstD = 2,
  Start = 3,
  Pull = 4,
  WhoPickedUpDisc = 5,
  FirstThrowQuebecVariant = 6,
  SecondD = 7,
}

interface ActionOptions {
  skipViewChange?: boolean;
  skipSave?: boolean;
  newStatus?: 'new' | 'in-progress' | 'submitted' | 'sync-error' | 'uploaded';
}


interface BookkeeperState {
  activePoint: { offensePlayers: string[]; defensePlayers: string[]; events: any[] } | null;
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

interface SerializedGameData {
  league_id: string;
  week: number;
  homeTeamName: string;
  homeTeamId: number;
  awayTeamName: string;
  awayTeamId: number;
  game: { points: Array<{ offensePlayers: string[]; defensePlayers: string[]; events: any[] }> };
  bookkeeperState: BookkeeperState;
  undoStack: UndoCommand[];
}

interface UploadedGamePayload {
  league_id: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeRoster: string[];
  awayRoster: string[];
  points: ApiPoint[];
  homeScore: number;
  awayScore: number;
}

export class Bookkeeper {
  public league: League;
  public homeTeam: Team;
  public awayTeam: Team;
  public week: number;

  public points: PointModel[] = [];
  private undoStack: UndoCommand[] = [];

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
  private isResumingPointMode: boolean = false;
  private lastPlayedLine: { home: string[]; away: string[] } | null = null;

  // New: Observer pattern for React integration
  private listeners: Set<() => void> = new Set();
  private localError: string | null = null;

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

    this.undoStack = [];
    this.homeParticipants = new Set<string>();
    this.awayParticipants = new Set<string>();

    this.hydrate(initialData);
    this.determineInitialView();
  }

  static async loadFromDatabase(gameId: number): Promise<Bookkeeper> {
    const storedGame = await db.games.get(gameId);
    if (!storedGame) {
      throw new Error(`Game ${gameId} not found`);
    }

    // I don't think we should need all of this league state here,
    // this should all be basic data that lives right in bookeeper
    // and gets serialized / deserialized
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
        events: apiPoint.events.map(mapApiEventToEvent),
      });
    });

    let activePointForHydration: PointModel | null = null;
    if (storedGame.bookkeeperState?.activePoint) {
      activePointForHydration = PointModel.fromJSON(storedGame.bookkeeperState.activePoint);
    }

    const bookkeeperStateForHydration: BookkeeperState = {
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
      undoStack: storedGame.undoStack || [],
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
    this.points = data.game.points.map(pJson => PointModel.fromJSON(pJson));

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

    this.undoStack = data.undoStack || [];
  }


  public serialize(): SerializedGameData {
    const bookkeeperState: BookkeeperState = {
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

    return {
      league_id: this.league.id,
      week: this.week,
      homeTeamName: this.homeTeam.name,
      awayTeamName: this.awayTeam.name,
      homeTeamId: this.homeTeam.id,
      awayTeamId: this.awayTeam.id,
      game: { points: this.points.map(p => p.toJSON()) },
      bookkeeperState: bookkeeperState,
      undoStack: this.undoStack,
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
  }

  public shouldRecordNewPass(): boolean {
    return this.firstActor !== null;
  }

  public firstPointOfGameOrHalf(): boolean {
    return this.points.length === this.pointsAtHalf;
  }

  private changePossession(): void {
    this.homePossession = !this.homePossession;
  }

  public recordActivePlayers(activeHomePlayers: string[], activeAwayPlayers: string[]): void {
    this.homePlayers = [...activeHomePlayers];
    this.awayPlayers = [...activeAwayPlayers];
  }

  public recordSubstitution(
    newHomePlayers: string[],
    newAwayPlayers: string[],
    substitutedOutPlayers: string[],
    substitutedInPlayers: string[]
  ): void {
    if (!this.activePoint) return;

    // Store undo data for substitution
    this.undoStack.push({
      type: 'recordSubstitution',
      timestamp: new Date().toISOString(),
      data: {
        savedHomePlayers: this.homePlayers ? [...this.homePlayers] : null,
        savedAwayPlayers: this.awayPlayers ? [...this.awayPlayers] : null,
        savedOffensePlayers: [...this.activePoint.offensePlayers],
        savedDefensePlayers: [...this.activePoint.defensePlayers],
        savedAllOffensePlayers: new Set(this.activePoint.allOffensePlayers),
        savedAllDefensePlayers: new Set(this.activePoint.allDefensePlayers),
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
    this.activePoint.updateCurrentPlayers(newOffensePlayers, newDefensePlayers);

    // Record substitution events
    for (let i = 0; i < substitutedOutPlayers.length && i < substitutedInPlayers.length; i++) {
      this.activePoint.addEvent({
        type: EventType.SUBSTITUTION,
        firstActor: substitutedInPlayers[i], // Player coming in
        secondActor: substitutedOutPlayers[i], // Player going out
        timestamp: new Date().toISOString(),
      });
    }
  }

  public updateParticipants(homeParticipants: string[], awayParticipants: string[]): void {
    this.homeParticipants = new Set(homeParticipants);
    this.awayParticipants = new Set(awayParticipants);
  }

  // New: Unified action method that handles persistence
  async performAction(
    action: (bk: Bookkeeper) => void,
    options: ActionOptions = {}
  ): Promise<void> {
    const actionName = action.name || action.toString();

    // Track state for view transitions
    if (actionName.includes('recordPoint')) {
      this.lastPlayedLine = {
        home: [...(this.homePlayers || [])],
        away: [...(this.awayPlayers || [])],
      };
      this.isResumingPointMode = false;
    }

    // Execute the action
    action(this);

    // Auto-save unless explicitly skipped or no game ID (for tests)
    if (!options.skipSave && this.gameId !== null) {
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

  public resumePoint(): void {
    return;
  }

  public recordPull(): void {
    if (!this.activePoint || !this.firstActor) return;

    this.undoStack.push({
      type: 'recordPull',
      timestamp: new Date().toISOString()
    });

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

    this.undoStack.push({
      type: 'recordThrowAway',
      timestamp: new Date().toISOString()
    });

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

    this.undoStack.push({
      type: 'recordPass',
      timestamp: new Date().toISOString()
    });

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

    this.undoStack.push({
      type: 'recordDrop',
      timestamp: new Date().toISOString()
    });

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

    this.undoStack.push({
      type: 'recordD',
      timestamp: new Date().toISOString()
    });

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

    this.undoStack.push({
      type: 'recordCatchD',
      timestamp: new Date().toISOString()
    });

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

    this.undoStack.push({
      type: 'recordPoint',
      timestamp: new Date().toISOString()
    });

    this.activePoint.addEvent({
      type: EventType.POINT,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    this.points.push(this.activePoint);

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

    this.undoStack.push({
      type: 'recordHalf',
      timestamp: new Date().toISOString()
    });

    this.pointsAtHalf = this.points.length;

    // Reset line selection and UI state for second half
    this.homePlayers = null;
    this.awayPlayers = null;
    this.lastPlayedLine = null;
    this.isResumingPointMode = false;
  }

  public undo(): void {
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
        this.undoRecordPoint();
        break;
      case 'recordHalf':
        this.undoRecordHalf();
        break;
      case 'recordSubstitution':
        this.undoRecordSubstitution(command);
        break;
    }
    
    // Update view state and notify React components
    this.updateViewState();
    this.notifyListeners();
  }

  public getCurrentPointPrettyPrint(): string[] {
    if (this.activePoint !== null) {
      return this.activePoint.prettyPrint();
    } else {
      return [];
    }
  }

  public getLastCompletedPointPrettyPrint(): string[] {
    if (this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1];
      return lastPoint.prettyPrint();
    }
    return [];
  }

  // Undo Implementation Methods
  private undoRecordFirstActor(): void {
    // Can infer if point was created by checking if it has no events
    const pointWasCreated = this.activePoint && this.activePoint.getEventCount() === 0;
    
    this.firstActor = null; // Reset firstActor
    
    if (pointWasCreated) {
      this.activePoint = null;
    }
  }

  private undoRecordPull(): void {
    if (!this.activePoint) return;
    
    const pullEvent = this.activePoint.removeLastEvent(); // Remove PULL event
    this.changePossession(); // Revert possession flip from pull
    this.activePoint.swapOffenseAndDefense(); // Revert player swap
    this.firstActor = pullEvent?.firstActor || null; // Restore the puller as firstActor
  }

  private undoRecordPass(): void {
    if (!this.activePoint) return;
    
    const passEvent = this.activePoint.removeLastEvent(); // Remove PASS event
    this.firstActor = passEvent?.firstActor || null; // Restore passer as firstActor
  }

  private undoRecordTurnover(): void {
    if (!this.activePoint) return;
    
    const turnoverEvent = this.activePoint.removeLastEvent(); // Remove DROP/THROWAWAY event
    this.firstActor = turnoverEvent?.firstActor || null; // Restore player who had disc
    this.changePossession(); // Revert possession flip from turnover
  }

  private undoRecordD(): void {
    if (!this.activePoint) return;
    
    const dEvent = this.activePoint.removeLastEvent(); // Remove DEFENSE event
    this.firstActor = dEvent?.firstActor || null; // Restore player who got the D
  }

  private undoRecordCatchD(): void {
    if (!this.activePoint) return;
    
    const catchDEvent = this.activePoint.removeLastEvent(); // Remove DEFENSE event
    this.firstActor = catchDEvent?.firstActor || null; // Restore player who got the catch D
  }

  private undoRecordPoint(): void {
    // Infer who scored from current possession
    if (this.homePossession) {
      this.homeScore--;
    } else {
      this.awayScore--;
    }
    
    // Flip possession back (recordPoint flipped it for next point)
    this.changePossession();
    
    // Restore activePoint from completed points
    const lastPoint = this.points.pop();
    if (lastPoint) {
      this.activePoint = lastPoint;
      this.activePoint.removeLastEvent(); // Remove the POINT event
      
      // Restore firstActor from the last event
      const lastEvent = this.activePoint.getLastEvent();
      if (lastEvent?.type === EventType.PASS) {
        this.firstActor = lastEvent.secondActor; // The receiver who scored
      } else {
        this.firstActor = lastEvent?.firstActor || null;
      }
    }
    
    // Restore line selection from the lastPlayedLine (which was set when the point was scored)
    if (this.lastPlayedLine) {
      this.homePlayers = [...this.lastPlayedLine.home];
      this.awayPlayers = [...this.lastPlayedLine.away];
    }
    
    // Set UI state to resume the point
    this.isResumingPointMode = true;
    this.currentView = 'recordStats';
  }

  private undoRecordHalf(): void {
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
    
    this.isResumingPointMode = false; // Always false when undoing half
  }

  private undoRecordSubstitution(command: UndoCommand): void {
    const data = command.data;
    
    // Restore line players
    this.homePlayers = data.savedHomePlayers ? [...data.savedHomePlayers] : null;
    this.awayPlayers = data.savedAwayPlayers ? [...data.savedAwayPlayers] : null;

    if (this.activePoint) {
      // Restore point players
      this.activePoint.offensePlayers = [...data.savedOffensePlayers];
      this.activePoint.defensePlayers = [...data.savedDefensePlayers];
      this.activePoint.allOffensePlayers = new Set(data.savedAllOffensePlayers);
      this.activePoint.allDefensePlayers = new Set(data.savedAllDefensePlayers);

      // Remove substitution events that were added
      while (
        this.activePoint.events.length > 0 &&
        this.activePoint.getLastEvent()?.type === EventType.SUBSTITUTION
      ) {
        this.activePoint.removeLastEvent();
      }
    }
  }

  private determinePointPossession(point: PointModel): boolean {
    // Look at the first event to determine who started with possession
    const firstEvent = point.events[0];
    
    if (firstEvent?.type === EventType.PULL) {
      // If it starts with a pull, the puller's team was on offense initially
      const puller = firstEvent.firstActor;
      return this.homeParticipants.has(puller);
    }
    
    // For other cases, we can infer from the offense/defense player lists
    // Check if the first offensive player is on the home team
    const firstOffensePlayer = point.offensePlayers[0];
    return this.homeParticipants.has(firstOffensePlayer);
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
    // Transition to selectLines if we need to select players
    // This happens when:
    // 1. No active point AND no players selected (start of game/after point)
    // 2. Players have been cleared (mid-point line change)
    if (this.homePlayers === null || this.awayPlayers === null) {
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

  private transformForDatabase(
    serializedData: SerializedGameData,
    newStatus?: StoredGame['status']
  ): Partial<StoredGame> {
    const pointsForStorage = serializedData.game.points.map(modelPointJson => ({
      // Use allOffensePlayers and allDefensePlayers if available (for substitution tracking)
      // Fall back to regular players for legacy data
      offensePlayers:
        modelPointJson.allOffensePlayers && modelPointJson.allOffensePlayers.length > 0
          ? [...modelPointJson.allOffensePlayers].sort()
          : [...modelPointJson.offensePlayers].sort(),
      defensePlayers:
        modelPointJson.allDefensePlayers && modelPointJson.allDefensePlayers.length > 0
          ? [...modelPointJson.allDefensePlayers].sort()
          : [...modelPointJson.defensePlayers].sort(),
      events: modelPointJson.events.map(mapEventToApiEvent),
    }));

    const bookkeeperStateForStorage: BookkeeperState = {
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
      undoStack: serializedData.undoStack,
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

  async submitGame(): Promise<void> {
    if (!this.gameId) {
      throw new Error('Cannot submit: no game ID');
    }

    try {
      await this.saveToDatabase('submitted');
      const payload = this.transformForAPI();
      const response = await fetch(`/submit_game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

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

  public transformForAPI(): UploadedGamePayload {
    const bkState = this.serialize();
    return {
      league_id: bkState.league_id,
      week: bkState.week,
      homeTeam: bkState.homeTeamName,
      homeScore: bkState.bookkeeperState.homeScore,
      homeRoster: [...bkState.bookkeeperState.homeParticipants].sort((a, b) => a.localeCompare(b)),
      awayTeam: bkState.awayTeamName,
      awayScore: bkState.bookkeeperState.awayScore,
      awayRoster: [...bkState.bookkeeperState.awayParticipants].sort((a, b) => a.localeCompare(b)),
      points: bkState.game.points.map(pJson => ({
        // Use allOffensePlayers and allDefensePlayers if available (for substitution tracking)
        // Fall back to regular players for legacy data
        offensePlayers:
          pJson.allOffensePlayers && pJson.allOffensePlayers.length > 0
            ? [...pJson.allOffensePlayers].sort()
            : [...pJson.offensePlayers].sort(),
        defensePlayers:
          pJson.allDefensePlayers && pJson.allDefensePlayers.length > 0
            ? [...pJson.allDefensePlayers].sort()
            : [...pJson.defensePlayers].sort(),
        events: pJson.events.map(mapEventToApiEvent),
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
  getCurrentView(): GameView {
    return this.currentView;
  }
  getIsResumingPointMode(): boolean {
    return this.isResumingPointMode;
  }
  getLastPlayedLine(): { home: string[]; away: string[] } | null {
    return this.lastPlayedLine;
  }
  getHomeParticipants(): string[] {
    return Array.from(this.homeParticipants).sort((a, b) => a.localeCompare(b));
  }
  getAwayParticipants(): string[] {
    return Array.from(this.awayParticipants).sort((a, b) => a.localeCompare(b));
  }
  getGameStatus(): StoredGame['status'] {
    return 'in-progress';
  } // TODO: Track actual status
  setIsResumingPointMode(value: boolean): void {
    this.isResumingPointMode = value;
    this.notifyListeners();
  }
  setLastPlayedLine(value: { home: string[]; away: string[] } | null): void {
    this.lastPlayedLine = value;
    this.notifyListeners();
  }

  // Static method to create a new game and save it to the database
  public static async newGame(
    currentLeague: { league: { id: string; name: string; lineSize: number } },
    week: number,
    homeTeam: { id: number; name: string },
    awayTeam: { id: number; name: string },
    homeRoster: string[],
    awayRoster: string[]
  ): Promise<number> {
    const sortedHomeRoster = [...homeRoster].sort((a, b) => a.localeCompare(b));
    const sortedAwayRoster = [...awayRoster].sort((a, b) => a.localeCompare(b));

    const initialBookkeeperState: BookkeeperState = {
      activePoint: null,
      firstActor: null,
      homePossession: true,
      pointsAtHalf: 0,
      homePlayers: null,
      awayPlayers: null,
      homeScore: 0,
      awayScore: 0,
      homeParticipants: sortedHomeRoster,
      awayParticipants: sortedAwayRoster,
    };

    const gameData: SerializedGameData = {
      league_id: currentLeague.league.id,
      week: week,
      homeTeamName: homeTeam.name,
      homeTeamId: homeTeam.id,
      awayTeamName: awayTeam.name,
      awayTeamId: awayTeam.id,
      game: { points: [] },
      bookkeeperState: initialBookkeeperState,
      undoStack: [],
    };

    // Create the StoredGame object and save it to the database
    const id = await db.games.add({
      league_id: gameData.league_id,
      week: gameData.week,
      homeTeam: gameData.homeTeamName,
      homeTeamId: gameData.homeTeamId,
      homeScore: 0,
      homeRoster: [...gameData.bookkeeperState.homeParticipants],
      awayTeam: gameData.awayTeamName,
      awayTeamId: gameData.awayTeamId,
      awayScore: 0,
      awayRoster: [...gameData.bookkeeperState.awayParticipants],
      points: [],
      status: 'new',
      lastModified: new Date(),
      bookkeeperState: gameData.bookkeeperState,
      undoStack: gameData.undoStack,
    } as StoredGame);

    return id;
  }

  // Getter for tests
  public getMementosCount(): number {
    return this.undoStack.length;
  }
}
