import {
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
import { type GameView } from './db';
import { StoredGameMethods, GameState } from './storedGameMethods';

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

export { GameState };

export class Bookkeeper {
  public league: League;
  public homeTeam: Team;
  public awayTeam: Team;

  private gameId: number | null = null;
  private game: StoredGame;
  private gameMethods: StoredGameMethods;

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

  // Create a new game and save it to IndexedDb
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
    return id as number;
  }

  // Save to IndexedDb
  private async saveToDatabase(newStatus?: StoredGame['status']): Promise<void> {
    if (!this.gameId) {
      throw new Error('Cannot save: no game ID');
    }

    try {
      this.game.lastModified = new Date();
      if (newStatus) {
        this.game.status = newStatus;
      }

      // update rosters from team objects
      this.game.homeRoster = [...this.homeTeam.players.map(p => p.name)].sort((a, b) => a.localeCompare(b));
      this.game.awayRoster = [...this.awayTeam.players.map(p => p.name)].sort((a, b) => a.localeCompare(b));

      // save
      await db.games.update(this.gameId, { ...this.game });
    } catch (error) {
      this.gameMethods.setError(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.notifyListeners();
      throw error;
    }
  }

  // Load from IndexedDb
  static async loadFromDatabase(gameId: number): Promise<Bookkeeper> {
    const storedGame = await db.games.get(gameId);
    if (!storedGame) {
      throw new Error(`Game ${gameId} not found`);
    }

    const apiLeague = apiLeagues.find(l => l.id === storedGame.league_id.toString());
    if (!apiLeague) {
      throw new Error(`League configuration for ID ${storedGame.league_id} not found.`);
    }

    const league: League = {
      id: storedGame.league_id,
      name: getLeagueName(storedGame.league_id) || 'Unknown League',
      lineSize: apiLeague.lineSize,
    };

    const homeTeam: Team = {
      id: storedGame.homeTeamId,
      name: storedGame.homeTeam,
      players: storedGame.homeRoster.map(name => ({
        name,
        team: storedGame.homeTeam,
        is_male: true // Default, will be updated when proper team data is loaded
      }))
    };

    const awayTeam: Team = {
      id: storedGame.awayTeamId,
      name: storedGame.awayTeam,
      players: storedGame.awayRoster.map(name => ({
        name,
        team: storedGame.awayTeam,
        is_male: true // Default, will be updated when proper team data is loaded
      }))
    };

    return new Bookkeeper(
      storedGame,
      league,
      homeTeam,
      awayTeam,
      gameId
    );
  }

  // Upload Game
  async submitGame(): Promise<void> {
    const payload = this.transformForAPI();

    try {
      await this.saveToDatabase('submitted');

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
        const errorText = await response.text();
        await this.saveToDatabase('sync-error');
        throw new Error(`Server error (${response.status}): ${errorText || 'Unknown server error'}`);
      }
    } catch (error) {
      // Ensure we always save as sync-error if something went wrong
      await this.saveToDatabase('sync-error');

      // Re-throw the error
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Submission failed: ${String(error)}`);
      }
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

  // React listeners
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // get points(): PointModel[] {
  //   return this.game.points.map(apiPoint => {
  //     return PointModel.fromJSON({
  //       offensePlayers: [...apiPoint.offensePlayers],
  //       defensePlayers: [...apiPoint.defensePlayers],
  //       events: apiPoint.events.map(mapApiEventToEvent),
  //     });
  //   });
  // }

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

  // Delegate common game state queries directly to the game
  public gameState(): GameState {
    return this.gameMethods.gameState();
  }

  public shouldRecordNewPass(): boolean {
    return this.gameMethods.shouldRecordNewPass();
  }

  public firstPoint(): boolean {
    return this.game.points.length === 0;
  }

  public firstPointAfterHalf(): boolean {
    const hasPoints = this.game.points.length >= 0
    return hasPoints && this.gameMethods.firstPointOfGameOrHalf();
  }

  public firstPointOfGameOrHalf(): boolean {
    return this.gameMethods.firstPointOfGameOrHalf();
  }

  private async performAction(action: () => void): Promise<void> {
    // Action
    action();

    // Save to IndexedDb
    await this.saveToDatabase();

    // Update view state
    this.gameMethods.updateViewAfterAction();

    // Notify React components
    this.notifyListeners();
  }

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

  public async updateRosters(homeRoster: string[], awayRoster: string[]): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.updateRosters(homeRoster, awayRoster);
    });
  }

  // Point display methods
  public getCurrentPointPrettyPrint(): string[] {
    return this.activePoint?.prettyPrint() || [];
  }

  public getLastCompletedPointPrettyPrint(): string[] {
    const numPoints = this.game.points.length;
    const lastPoint = this.game.points[numPoints - 1];

    if (lastPoint) {
      const model = PointModel.fromJSON({
        offensePlayers: [...lastPoint.offensePlayers],
        defensePlayers: [...lastPoint.defensePlayers],
        events: lastPoint.events.map(mapApiEventToEvent),
      });
      return model.prettyPrint()
    } else {
      return []
    }
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

  getUndoCount(): number {
    return this.game.undoStack.length;
  }
}
