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
import { type UndoCommand, type GameView } from './db';

// Import types from db.ts instead of defining them here
import { type UndoCommand, type GameView } from './db';

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
  // Core game data - now stored in StoredGame
  private game: StoredGame;
  
  // Derived/computed data for convenience
  public league: League;
  public homeTeam: Team;
  public awayTeam: Team;

  // Infrastructure
  private gameId: number | null = null;
  private listeners: Set<() => void> = new Set();

  constructor(
    game: StoredGame,
    league: League,
    homeTeam: Team,
    awayTeam: Team,
    gameId?: number
  ) {
    this.game = game;
    this.league = league;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.gameId = gameId || null;
  }

  // Getters for state that's now in StoredGame
  get points(): PointModel[] {
    return this.game.points.map(apiPoint => {
      return PointModel.fromJSON({
        offensePlayers: [...apiPoint.offensePlayers],
        defensePlayers: [...apiPoint.defensePlayers],
        events: apiPoint.events.map(mapApiEventToEvent),
      });
    });
  }

  get activePoint(): PointModel | null {
    if (!this.game.activePoint) return null;
    return PointModel.fromJSON({
      offensePlayers: [...this.game.activePoint.offensePlayers],
      defensePlayers: [...this.game.activePoint.defensePlayers],
      events: this.game.activePoint.events.map(mapApiEventToEvent),
    });
  }

  set activePoint(point: PointModel | null) {
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

  get firstActor(): string | null { return this.game.firstActor; }
  set firstActor(value: string | null) { this.game.firstActor = value; }

  get homePossession(): boolean { return this.game.homePossession; }
  set homePossession(value: boolean) { this.game.homePossession = value; }

  get homeScore(): number { return this.game.homeScore; }
  set homeScore(value: number) { this.game.homeScore = value; }

  get awayScore(): number { return this.game.awayScore; }
  set awayScore(value: number) { this.game.awayScore = value; }

  get pointsAtHalf(): number { return this.game.pointsAtHalf; }
  set pointsAtHalf(value: number) { this.game.pointsAtHalf = value; }

  get homePlayers(): string[] | null { return this.game.homePlayers; }
  set homePlayers(value: string[] | null) { this.game.homePlayers = value; }

  get awayPlayers(): string[] | null { return this.game.awayPlayers; }
  set awayPlayers(value: string[] | null) { this.game.awayPlayers = value; }

  get currentView(): GameView { return this.game.currentView; }
  set currentView(value: GameView) { this.game.currentView = value; }

  get localError(): string | null { return this.game.localError; }
  set localError(value: string | null) { this.game.localError = value; }

  get lastPlayedLine(): { home: string[]; away: string[] } | null { return this.game.lastPlayedLine; }
  set lastPlayedLine(value: { home: string[]; away: string[] } | null) { this.game.lastPlayedLine = value; }

  get undoStack(): UndoCommand[] { return this.game.undoStack; }

  get week(): number { return this.game.week; }

  static async loadFromDatabase(gameId: number): Promise<Bookkeeper> {
    const storedGame = await db.games.get(gameId);
    if (!storedGame) {
      throw new Error(`Game ${gameId} not found`);
    }

    // Ensure all required fields have defaults if missing (for backward compatibility)
    const gameWithDefaults: StoredGame = {
      ...storedGame,
      activePoint: storedGame.activePoint || null,
      homePossession: storedGame.homePossession ?? true,
      firstActor: storedGame.firstActor || null,
      pointsAtHalf: storedGame.pointsAtHalf || 0,
      homePlayers: storedGame.homePlayers || null,
      awayPlayers: storedGame.awayPlayers || null,
      lastPlayedLine: storedGame.lastPlayedLine || null,
      currentView: storedGame.currentView || 'loading',
      localError: storedGame.localError || null,
      undoStack: storedGame.undoStack || [],
    };

    const apiLeague = apiLeagues.find(l => l.id === storedGame.league_id.toString());
    if (!apiLeague) {
      throw new Error(`League configuration for ID ${storedGame.league_id} not found.`);
    }
    
    const leagueForBk: League = {
      id: storedGame.league_id,
      name: getLeagueName(storedGame.league_id) || 'Unknown League',
      lineSize: apiLeague.lineSize,
    };

    // Initialize team objects with rosters
    const homeTeamForBk: Team = { 
      id: storedGame.homeTeamId, 
      name: storedGame.homeTeam,
      players: storedGame.homeRoster.map(name => ({
        name,
        team: storedGame.homeTeam,
        is_male: true // Default, will be updated when proper team data is loaded
      }))
    };

    const awayTeamForBk: Team = { 
      id: storedGame.awayTeamId, 
      name: storedGame.awayTeam,
      players: storedGame.awayRoster.map(name => ({
        name,
        team: storedGame.awayTeam,
        is_male: true // Default, will be updated when proper team data is loaded
      }))
    };

    return new Bookkeeper(
      gameWithDefaults,
      leagueForBk,
      homeTeamForBk,
      awayTeamForBk,
      gameId
    );
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
  ): void {
    if (!this.activePoint) return;

    // Store undo data for substitution
    // do we need undo here? we can just re-edit the lines if needed
    this.game.undoStack.push({
      type: 'recordSubstitution',
      timestamp: new Date().toISOString(),
      data: {
        savedHomePlayers: this.homePlayers ? [...this.homePlayers] : null,
        savedAwayPlayers: this.awayPlayers ? [...this.awayPlayers] : null,
        savedOffensePlayers: [...this.activePoint.offensePlayers],
        savedDefensePlayers: [...this.activePoint.defensePlayers],
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
  }

  public updateRosters(homeRoster: string[], awayRoster: string[]): void {
    // Update the team objects with new rosters
    this.homeTeam.players = homeRoster.map(name => ({
      name,
      team: this.homeTeam.name,
      is_male: true // Default, will be updated when proper team data is loaded
    }));

    this.awayTeam.players = awayRoster.map(name => ({
      name,
      team: this.awayTeam.name,
      is_male: true // Default, will be updated when proper team data is loaded
    }));

    // Update the roster sets
    this.homeRoster = new Set(homeRoster);
    this.awayRoster = new Set(awayRoster);
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
    this.game.undoStack.push({
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

    this.game.undoStack.push({
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

    this.game.undoStack.push({
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

    this.game.undoStack.push({
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

    this.game.undoStack.push({
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

    this.game.undoStack.push({
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

    this.game.undoStack.push({
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

    // Store the possession state for this point before flipping it
    this.game.undoStack.push({
      type: 'recordPoint',
      timestamp: new Date().toISOString(),
      data: {
        wasHomePossession: this.homePossession
      }
    });

    this.activePoint.addEvent({
      type: EventType.POINT,
      firstActor: this.firstActor!,
      secondActor: null,
      timestamp: new Date().toISOString(),
    });
    // Convert PointModel to API format and add to game.points
    this.game.points.push({
      offensePlayers: [...this.activePoint.offensePlayers],
      defensePlayers: [...this.activePoint.defensePlayers],
      events: this.activePoint.events.map(mapEventToApiEvent),
    });

    if (this.homePossession) {
      this.homeScore++;
    } else {
      this.awayScore++;
    }

    // No need to update homeRoster/awayRoster here as they're already set from Team objects

    this.activePoint = null;
    this.homePlayers = null;
    this.awayPlayers = null;
    this.firstActor = null;

    this.changePossession(); // Flip possession for the next point
  }

  public recordHalf(): void {
    if (this.pointsAtHalf > 0) return; // Half already recorded

    this.game.undoStack.push({
      type: 'recordHalf',
      timestamp: new Date().toISOString()
    });

    this.pointsAtHalf = this.points.length;

    // Reset line selection and UI state for second half
    this.homePlayers = null;
    this.awayPlayers = null;
    this.lastPlayedLine = null;
  }

  public undo(): void {
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

  private undoRecordPoint(command: UndoCommand): void {
    const data = command.data;

    // Restore activePoint from completed points
    const lastPoint = this.points.pop();
    if (!lastPoint) return;

    this.activePoint = lastPoint;
    this.activePoint.removeLastEvent(); // Remove the POINT event

    // Decrement the correct team's score using stored possession data
    if (data.wasHomePossession) {
      this.homeScore--;
    } else {
      this.awayScore--;
    }

    // Restore possession to what it was during the point
    this.homePossession = data.wasHomePossession;

    // Restore firstActor from the last event
    const lastEvent = this.activePoint.getLastEvent();
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

    // No need to set any additional state when undoing half
  }

  private undoRecordSubstitution(command: UndoCommand): void {
    const data = command.data;

    this.homePlayers = data.savedHomePlayers ? [...data.savedHomePlayers] : null;
    this.awayPlayers = data.savedAwayPlayers ? [...data.savedAwayPlayers] : null;

    if (this.activePoint) {
      this.activePoint.offensePlayers = [...data.savedOffensePlayers];
      this.activePoint.defensePlayers = [...data.savedDefensePlayers];
    }
  }


  private determineInitialView(): void {
    if (this.activePoint === null && (this.homePlayers === null || this.awayPlayers === null)) {
      this.currentView = 'selectLines';
    } else {
      this.lastPlayedLine = null;
      this.currentView = 'recordStats';
    }
  }

  private updateViewState(): void {
    // Don't override view if it was explicitly set (e.g., by undoRecordPoint)
    if (this.currentView === 'recordStats' && this.activePoint !== null) {
      return; // Keep the explicitly set view
    }

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

  private async saveToDatabase(newStatus?: StoredGame['status']): Promise<void> {
    if (!this.gameId) {
      throw new Error('Cannot save: no game ID');
    }

    try {
      // Update the game object directly
      this.game.lastModified = new Date();
      if (newStatus) {
        this.game.status = newStatus;
      }
      
      // Update rosters from team objects
      this.game.homeRoster = [...this.homeTeam.players.map(p => p.name)].sort((a, b) => a.localeCompare(b));
      this.game.awayRoster = [...this.awayTeam.players.map(p => p.name)].sort((a, b) => a.localeCompare(b));

      await db.games.update(this.gameId, this.game);
    } catch (error) {
      this.localError = `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.notifyListeners();
      throw error;
    }
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
    return {
      league_id: this.game.league_id,
      week: this.game.week,
      homeTeam: this.game.homeTeam,
      homeScore: this.game.homeScore,
      homeRoster: [...this.game.homeRoster].sort((a, b) => a.localeCompare(b)),
      awayTeam: this.game.awayTeam,
      awayScore: this.game.awayScore,
      awayRoster: [...this.game.awayRoster].sort((a, b) => a.localeCompare(b)),
      points: this.game.points.map(point => ({
        offensePlayers: [...point.offensePlayers].sort(),
        defensePlayers: [...point.defensePlayers].sort(),
        events: [...point.events],
      })),
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  getCurrentView(): GameView {
    return this.currentView;
  }

  getLastPlayedLine(): { home: string[]; away: string[] } | null {
    return this.lastPlayedLine;
  }

  getHomeRoster(): string[] {
    return this.homeTeam.players.map(p => p.name).sort((a, b) => a.localeCompare(b));
  }

  getAwayRoster(): string[] {
    return this.awayTeam.players.map(p => p.name).sort((a, b) => a.localeCompare(b));
  }

  getGameStatus(): StoredGame['status'] {
    return 'in-progress';
  } // TODO: Track actual status

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

    // Create the StoredGame object and save it to the database
    const newGame: StoredGame = {
      league_id: currentLeague.league.id,
      week: week,
      homeTeam: homeTeam.name,
      homeTeamId: homeTeam.id,
      awayTeam: awayTeam.name,
      awayTeamId: awayTeam.id,
      homeRoster: sortedHomeRoster,
      awayRoster: sortedAwayRoster,
      
      // Game state
      points: [],
      activePoint: null,
      homeScore: 0,
      awayScore: 0,
      homePossession: true,
      firstActor: null,
      pointsAtHalf: 0,
      
      // Line selection state
      homePlayers: null,
      awayPlayers: null,
      lastPlayedLine: null,
      
      // UI state
      currentView: 'selectLines',
      localError: null,
      
      // Undo system
      undoStack: [],
      
      // Persistence metadata
      status: 'new',
      lastModified: new Date(),
    };

    const id = await db.games.add(newGame);
    return id;
  }

  public getMementosCount(): number {
    return this.game.undoStack.length;
  }
}
