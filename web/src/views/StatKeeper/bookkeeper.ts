import { db, StoredGame, StoredPlayer } from './db';
import {
  getLeagueName,
  type Point as ApiPoint,
  type LeagueFromJson as League,
  type Team,
  leagues as apiLeagues,
} from '../../api';
import { type GameView } from './db';
import { EventType, GameMethods, GameState, PointMethods } from './gameLogic';

// Helper function to sort players by gender (open first) then alphabetically
export function sortRosters(players: StoredPlayer[]): StoredPlayer[] {
  return [...players].sort((a, b) => {
    // First sort by gender (open first)
    if (a.is_open !== b.is_open) {
      return a.is_open ? -1 : 1;
    }
    // Then sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

interface UploadedGamePayload {
  league_id: number;
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

  private gameId: number | null = null;
  private game: StoredGame;
  private gameMethods: GameMethods;

  private listeners: Set<() => void> = new Set();

  constructor(game: StoredGame, league: League, gameId?: number) {
    this.game = game;
    this.gameMethods = new GameMethods(game);
    this.league = league;
    this.gameId = gameId || null;
  }

  // Create a new game and save it to IndexedDb
  public static async newGame(
    currentLeague: { league: { id: number; name: string; lineSize: number } },
    week: number,
    homeTeam: Team,
    awayTeam: Team
  ): Promise<number> {
    // Convert team players to StoredPlayer format and sort them
    const homeRoster: StoredPlayer[] = homeTeam.players.map(p => ({
      name: p.name,
      is_open: p.is_open,
    }));
    const awayRoster: StoredPlayer[] = awayTeam.players.map(p => ({
      name: p.name,
      is_open: p.is_open,
    }));

    // Sort
    const sortedHomeRoster = [...homeRoster].sort((a, b) => a.name.localeCompare(b.name));
    const sortedAwayRoster = [...awayRoster].sort((a, b) => a.name.localeCompare(b.name));

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
      localError: null,
      isEditingLines: false,
      isEditingRosters: true,

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

      // save
      await db.games.update(this.gameId, { ...this.game });
    } catch (error) {
      this.gameMethods.setError(
        `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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

    const apiLeague = apiLeagues.find(l => l.id === storedGame.league_id);
    if (!apiLeague) {
      throw new Error(`League configuration for ID ${storedGame.league_id} not found.`);
    }

    const league: League = {
      id: storedGame.league_id,
      name: getLeagueName(storedGame.league_id) || 'Unknown League',
      lineSize: apiLeague.lineSize,
    };

    return new Bookkeeper(storedGame, league, gameId);
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
        throw new Error(
          `Server error (${response.status}): ${errorText || 'Unknown server error'}`
        );
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

  private transformForAPI(): UploadedGamePayload {
    // When we deprecate the Android App we can start changing this payload atomically to further refactor
    return {
      league_id: this.game.league_id,
      week: this.game.week,
      homeTeam: this.game.homeTeam,
      homeScore: this.game.homeScore,
      homeRoster: [...this.game.homeRoster.map(p => p.name)].sort((a, b) => a.localeCompare(b)),
      awayTeam: this.game.awayTeam,
      awayScore: this.game.awayScore,
      awayRoster: [...this.game.awayRoster.map(p => p.name)].sort((a, b) => a.localeCompare(b)),
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

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  get activePoint(): PointMethods | null {
    if (!this.game.activePoint) return null;
    return new PointMethods(this.game.activePoint);
  }

  // Read-only getters for game state (components should not directly modify these)
  get firstActor(): string | null {
    return this.game.firstActor;
  }
  get homePossession(): boolean {
    return this.game.homePossession;
  }
  get homeScore(): number {
    return this.game.homeScore;
  }
  get awayScore(): number {
    return this.game.awayScore;
  }
  get pointsAtHalf(): number {
    return this.game.pointsAtHalf;
  }
  get pointsCount(): number {
    return this.game.points.length;
  }
  get homePlayers(): string[] | null {
    return this.game.homePlayers;
  }
  get awayPlayers(): string[] | null {
    return this.game.awayPlayers;
  }
  get localError(): string | null {
    return this.game.localError;
  }
  get week(): number {
    return this.game.week;
  }

  // View state management
  getCurrentView(): GameView {
    return this.gameMethods.determineCorrectView();
  }

  get lastPlayedLine(): { home: string[]; away: string[] } | null {
    return this.game.lastPlayedLine;
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
    const hasPoints = this.game.points.length >= 0;
    return hasPoints && this.gameMethods.firstPointOfGameOrHalf();
  }

  public firstPointOfGameOrHalf(): boolean {
    return this.gameMethods.firstPointOfGameOrHalf();
  }

  public isEditingRosters(): boolean {
    return this.game.isEditingRosters;
  }

  private async performAction(action: () => void): Promise<void> {
    // Action
    action();

    // Save to IndexedDb
    await this.saveToDatabase();

    // Notify React components
    this.notifyListeners();
  }

  public async recordActivePlayers(
    activeHomePlayers: string[],
    activeAwayPlayers: string[]
  ): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.recordActivePlayers(activeHomePlayers, activeAwayPlayers);
    });
  }

  public async recordSubstitution(
    newHomePlayers: string[],
    newAwayPlayers: string[]
  ): Promise<void> {
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

  public async updateRosters(
    homeRoster: StoredPlayer[],
    awayRoster: StoredPlayer[]
  ): Promise<void> {
    await this.performAction(() => {
      this.gameMethods.updateRosters(homeRoster, awayRoster);
    });
  }

  public setError(error: string | null): void {
    this.gameMethods.setError(error);
    this.notifyListeners();
  }

  public startEditingLines(): void {
    this.gameMethods.startEditingLines();
    this.notifyListeners();
  }

  public cancelEditingLines(): void {
    this.gameMethods.cancelEditingLines();
    this.notifyListeners();
  }

  public startEditingRosters(): void {
    this.gameMethods.startEditingRosters();
    this.notifyListeners();
  }

  public cancelEditingRosters(): void {
    this.gameMethods.cancelEditingRosters();
    this.notifyListeners();
  }

  private _isFirstPass(): boolean {
    const activePoint = this.activePoint;
    if (!activePoint) {
      return false;
    }

    const eventCount = activePoint.getEventCount();
    const lastEvent = activePoint.getLastEvent();

    if (lastEvent?.type !== EventType.PASS) {
      return false;
    }

    // Case 1: Point doesn't start with a pull. First event is a pass.
    if (eventCount === 1 && !this.firstPointOfGameOrHalf()) {
      return true;
    }

    // Case 2: Point starts with a pull. The event before the pass is a pull.
    const secondToLastEvent = activePoint.getSecondToLastEvent();
    if (secondToLastEvent?.type === EventType.PULL) {
      return true;
    }

    return false;
  }

  // UI State methods
  public getPlayerButtonState(
    playerName: string,
    isHomeTeam: boolean
  ): {
    enabled: boolean;
    variant: 'active' | 'enabled' | 'disabled-no-possession' | 'not-on-line';
    reason?: string;
  } {
    const isTeamInPossession = isHomeTeam === this.homePossession;
    const homePlayersOnActiveLine = this.homePlayers || [];
    const awayPlayersOnActiveLine = this.awayPlayers || [];
    const isPlayerOnActiveLine = isHomeTeam
      ? homePlayersOnActiveLine.includes(playerName)
      : awayPlayersOnActiveLine.includes(playerName);

    // Bench
    if (!isPlayerOnActiveLine) {
      return {
        enabled: false,
        variant: 'not-on-line',
        reason: 'Player not on active line',
      };
    }

    const currentGameState = this.gameState();
    const isActivePlayer = this.firstActor === playerName;
    const isFirstPoint = this.firstPoint();
    const isFirstPointAfterHalftime = this.firstPointAfterHalf();

    // why does variant not imply a style...?
    // also not sure we need reason although it is kind of interesting

    // Special case: first point of game or after halftime, both teams can select who pulls
    if (currentGameState === GameState.Start && (isFirstPoint || isFirstPointAfterHalftime)) {
      return {
        enabled: true,
        variant: 'enabled',
        reason: 'Select puller',
      };
    }

    // Pull state.
    // It is a bit weird, because only the pull button is enabled but if you think
    // about it, it sort of sets up the proper workflow for stat keeping
    if (currentGameState === GameState.Pull) {
      return {
        enabled: false,
        variant: isActivePlayer ? 'active' : 'disabled-no-possession',
        reason: 'Must click Pull or undo',
      };
    }

    if (currentGameState === GameState.PickUp) {
      if (!isTeamInPossession) {
        return {
          enabled: false,
          variant: 'disabled-no-possession',
          reason: 'Other team picks up disc',
        };
      }
      return {
        enabled: true,
        variant: isActivePlayer ? 'active' : 'enabled',
        reason: 'Select player who picked up disc',
      };
    }

    // When someone has the disc
    if (this.firstActor !== null) {
      if (isTeamInPossession) {
        if (isActivePlayer && this.shouldRecordNewPass()) {
          return {
            enabled: false,
            variant: 'active',
            reason: 'Player has disc - use action buttons',
          };
        } else {
          return {
            enabled: true,
            variant: isActivePlayer ? 'active' : 'enabled',
            reason: isActivePlayer ? 'Player has disc' : 'Select pass target',
          };
        }
        // team not in possession
      } else {
        return {
          enabled: false,
          variant: 'disabled-no-possession',
          reason: 'Other team has possession',
        };
      }
    }

    // this doesn't seem like the best way to represent.
    // I think I need to pull the D state up explicitly
    // Handle the team not in possesion simply

    // Default case
    if (!isTeamInPossession) {
      return {
        enabled: false,
        variant: 'disabled-no-possession',
        reason: 'Other team has possession',
      };
    }

    return {
      enabled: true,
      variant: 'enabled',
      reason: 'Available for selection',
    };
  }

  public getActionButtonState(
    action: 'pull' | 'point' | 'drop' | 'throwaway' | 'd' | 'catchD' | 'undo'
  ): {
    enabled: boolean;
    reason?: string;
  } {
    const currentGameState = this.gameState();
    const hasFirstActor = this.firstActor !== null;

    // States where player has possession
    const hasPossession =
      currentGameState === GameState.Normal ||
      currentGameState === GameState.AfterTurnover ||
      currentGameState === GameState.AfterDrop ||
      currentGameState === GameState.AfterPull ||
      currentGameState === GameState.FirstThrow;

    const isFirstPass = this._isFirstPass();

    // Action-specific enabled states
    const pullEnabled = currentGameState === GameState.Pull && hasFirstActor;
    const pointEnabled = currentGameState === GameState.Normal && hasFirstActor && !isFirstPass;
    const dropEnabled = hasPossession && hasFirstActor && currentGameState !== GameState.FirstThrow;
    const throwawayEnabled = hasPossession && hasFirstActor;
    const dEnabled = currentGameState === GameState.AfterTurnover && hasFirstActor;
    const catchDEnabled = currentGameState === GameState.AfterTurnover && hasFirstActor;
    const undoEnabled = this.getUndoCount() > 0;

    switch (action) {
      case 'pull':
        return {
          enabled: pullEnabled,
          reason:
            currentGameState !== GameState.Pull
              ? 'Not in pull state'
              : !hasFirstActor
                ? 'No puller selected'
                : undefined,
        };

      case 'point':
        return {
          enabled: pointEnabled,
          reason: !hasFirstActor
            ? 'No player selected'
            : currentGameState !== GameState.Normal
              ? 'Cannot score in current state'
              : isFirstPass
                ? 'Cannot score on first pass'
                : undefined,
        };

      case 'drop':
        return {
          enabled: dropEnabled,
          reason: !hasFirstActor
            ? 'No player selected'
            : !dropEnabled
              ? 'Cannot drop in current state'
              : undefined,
        };

      case 'throwaway':
        return {
          enabled: throwawayEnabled,
          reason: !hasFirstActor
            ? 'No player selected'
            : !throwawayEnabled
              ? 'Cannot throw away in current state'
              : undefined,
        };

      case 'd':
        return {
          enabled: dEnabled,
          reason: !hasFirstActor
            ? 'No player selected'
            : currentGameState !== GameState.AfterTurnover
              ? 'Can only get D after turnover'
              : undefined,
        };

      case 'catchD':
        return {
          enabled: catchDEnabled,
          reason: !hasFirstActor
            ? 'No player selected'
            : currentGameState !== GameState.AfterTurnover
              ? 'Can only get catch D after turnover'
              : undefined,
        };

      case 'undo':
        return {
          enabled: undoEnabled,
          reason: !undoEnabled ? 'No actions to undo' : undefined,
        };

      default:
        return { enabled: false, reason: 'Unknown action' };
    }
  }

  public getAPIPayload(): UploadedGamePayload {
    return this.transformForAPI();
  }

  // Point display methods
  public getCurrentPointPrettyPrint(): string[] {
    return this.activePoint?.prettyPrint() || [];
  }

  public getLastCompletedPointPrettyPrint(): string[] {
    const numPoints = this.game.points.length;
    const lastPoint = this.game.points[numPoints - 1];

    if (lastPoint) {
      const pointMethods = new PointMethods(lastPoint);
      return pointMethods.prettyPrint();
    } else {
      return [];
    }
  }

  // Convenience methods for React components
  getLeagueRatio() {
    return { open: 4, women: 2 };
  }

  getHomeRoster(): StoredPlayer[] {
    return sortRosters(this.game.homeRoster);
  }

  getAwayRoster(): StoredPlayer[] {
    return sortRosters(this.game.awayRoster);
  }

  // Team information accessors
  getHomeTeamName(): string {
    return this.game.homeTeam;
  }

  getAwayTeamName(): string {
    return this.game.awayTeam;
  }

  getHomeTeamId(): number {
    return this.game.homeTeamId;
  }

  getAwayTeamId(): number {
    return this.game.awayTeamId;
  }

  getGameStatus(): StoredGame['status'] {
    return this.game.status;
  }

  getUndoEvent(): string {
    const undoStackSize = this.game.undoStack.length;
    if (undoStackSize > 0) {
      return this.game.undoStack[undoStackSize - 1].type;
    } else {
      return '';
    }
  }

  getUndoCount(): number {
    return this.game.undoStack.length;
  }
}
