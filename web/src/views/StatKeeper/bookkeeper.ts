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
import { StoredGameMethods, GameState, type IStoredGameMethods } from './storedGameMethods';

// Export GameState for components
export { GameState };

interface ActionOptions {
  skipViewChange?: boolean;
  skipSave?: boolean;
  newStatus?: 'in-progress' | 'submitted' | 'sync-error' | 'uploaded';
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
  // Game methods - separate from data
  private gameMethods: StoredGameMethods;

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
    this.gameMethods = new StoredGameMethods(game);
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

  // Read-only getters for game state (components should not directly modify these)
  get firstActor(): string | null { return this.game.firstActor; }
  get homePossession(): boolean { return this.game.homePossession; }
  get homeScore(): number { return this.game.homeScore; }
  get awayScore(): number { return this.game.awayScore; }
  get pointsAtHalf(): number { return this.game.pointsAtHalf; }
  get homePlayers(): string[] | null { return this.game.homePlayers; }
  get awayPlayers(): string[] | null { return this.game.awayPlayers; }
  get localError(): string | null { return this.game.localError; }
  get week(): number { return this.game.week; }

  // View state management (components can modify these)
  get currentView(): GameView { return this.game.currentView; }
  set currentView(value: GameView) {
    this.game.currentView = value;
    this.notifyListeners();
  }

  get lastPlayedLine(): { home: string[]; away: string[] } | null { return this.game.lastPlayedLine; }
  set lastPlayedLine(value: { home: string[]; away: string[] } | null) {
    this.game.lastPlayedLine = value;
  }

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

    const bookkeeper = new Bookkeeper(
      gameWithDefaults,
      leagueForBk,
      homeTeamForBk,
      awayTeamForBk,
      gameId
    );

    // Initialize view state if needed
    if (gameWithDefaults.currentView === 'loading') {
      bookkeeper.determineInitialView();
    }

    return bookkeeper;
  }


  // Delegate common game state queries directly to the game
  public gameState(): GameState {
    return this.gameMethods.gameState();
  }

  public shouldRecordNewPass(): boolean {
    return this.gameMethods.shouldRecordNewPass();
  }

  public firstPointOfGameOrHalf(): boolean {
    return this.gameMethods.firstPointOfGameOrHalf();
  }


  // Simplified action method that handles persistence and notifications
  private async performAction(
    action: () => void,
    options: ActionOptions = {}
  ): Promise<void> {
    // Track state for view transitions (for point scoring)
    const wasRecordingPoint = this.homePlayers !== null && this.awayPlayers !== null;

    // Execute the action
    action();

    // Track last played line if a point was just scored
    if (wasRecordingPoint && this.homePlayers === null && this.awayPlayers === null) {
      // Point was scored, preserve the line that was playing
      // This will be handled by the recordPoint method in StoredGame
    }

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

  // Simplified action methods that handle persistence and notifications
  public async recordActivePlayers(activeHomePlayers: string[], activeAwayPlayers: string[]): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordActivePlayers(activeHomePlayers, activeAwayPlayers);
    });
  }

  public async recordSubstitution(newHomePlayers: string[], newAwayPlayers: string[]): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordSubstitution(newHomePlayers, newAwayPlayers);
    });
  }

  public async recordFirstActor(player: string, isHomeTeamPlayer: boolean): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordFirstActor(player, isHomeTeamPlayer);
    });
  }

  public async recordPull(): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordPull();
    });
  }

  public async recordPass(receiver: string): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordPass(receiver);
    });
  }

  public async recordDrop(): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordDrop();
    });
  }

  public async recordThrowAway(): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordThrowAway();
    });
  }

  public async recordD(): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordD();
    });
  }

  public async recordCatchD(): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordCatchD();
    });
  }

  public async recordPoint(): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordPoint();
    });
  }

  public async recordHalf(): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordHalf();
    });
  }

  public async undo(): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.undo();
    });
  }

  // Utility methods that don't need persistence
  public prepareNewPointAfterScore(): void {
    this.gameMethods.prepareNewPointAfterScore();
  }

  public resumePoint(): void {
    this.gameMethods.resumePoint();
  }

  // Point display methods
  public getCurrentPointPrettyPrint(): string[] {
    return this.activePoint?.prettyPrint() || [];
  }

  public getLastCompletedPointPrettyPrint(): string[] {
    const lastPoint = this.points[this.points.length - 1];
    return lastPoint?.prettyPrint() || [];
  }



  private determineInitialView(): void {
    // Set initial view based on game state
    this.currentView = this.gameMethods.determineCorrectView();
  }

  private updateViewState(): void {
    this.gameMethods.updateViewAfterAction();
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
      this.gameMethods.setError(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.notifyListeners();
      throw error;
    }
  }

  // Public method for external saves (like roster updates)
  public async saveChanges(): Promise<void> {
    await this.saveToDatabase();
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
      this.gameMethods.setError(`Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Convenience methods for React components
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
    return this.game.status;
  }

  getMementosCount(): number {
    return this.game.undoStack.length;
  }

  clearError(): void {
    this.gameMethods.clearError();
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
      status: 'in-progress',
      lastModified: new Date(),
    };

    const id = await db.games.add(newGame);
    return id;
  }

}
