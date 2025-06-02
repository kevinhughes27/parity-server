import { StoredGame, db as statKeeperDb } from './db';
import { GameState } from './models/GameState';
import { EventModel, EventType } from './models/EventModel';
import { PointModel } from './models/PointModel';
import { Point as ApiPoint } from '../../api';

type DexieDB = typeof statKeeperDb;

interface MementoState {
  gameDataSnapshot: StoredGame;
  activePointSnapshot?: ApiPoint | null;
  firstActorSnapshot: string | null;
  homePossessionSnapshot: boolean;
  currentLineHomeSnapshot: string[];
  currentLineAwaySnapshot: string[];
  pointsAtHalfRecordedSnapshot: number;
}

export class Bookkeeper {
  private db: DexieDB;
  public gameData!: StoredGame; 

  public activePoint: PointModel | null = null;
  public firstActor: string | null = null;
  public homePossession: boolean = true;

  private currentLineHome: string[] = [];
  private currentLineAway: string[] = [];
  private pointsAtHalfRecorded: number = 0; // Equivalent to Java's pointsAtHalf

  private mementos: MementoState[] = [];

  constructor(private localGameId: number, dexieDbInstance: DexieDB) {
    this.db = dexieDbInstance;
  }

  public async loadGame(): Promise<boolean> {
    const game = await this.db.games.get(this.localGameId);
    if (game) {
      this.gameData = game;
      // Attempt to find if half was recorded previously, if StoredGame is extended to save this.
      // For now, assuming it's not persisted across sessions unless explicitly saved in StoredGame.
      // If StoredGame had a field like 'halfTimePointCount', we'd load it here:
      // this.pointsAtHalfRecorded = game.halfTimePointCount || 0;
      this.homePossession = this.determineInitialPossession();
      return true;
    }
    console.error(`Bookkeeper: Game with localId ${this.localGameId} not found.`);
    return false;
  }

  private determineInitialPossession(): boolean {
    if (this.gameData.points.length === 0) {
      return true; 
    }
    const lastPoint = this.gameData.points[this.gameData.points.length - 1];
    const lastEventOfLastPoint = lastPoint.events[lastPoint.events.length - 1];

    if (lastEventOfLastPoint.type === EventType.POINT.toString()) {
      const scorer = lastEventOfLastPoint.firstActor;
      // This logic assumes that if the scorer is in the homeRoster, the home team scored.
      // This might need refinement if rosters are very dynamic or subs are common.
      if (this.gameData.homeRoster.includes(scorer)) { 
        return false; // Away team's possession (to receive pull)
      } else { 
        return true; // Home team's possession (to receive pull)
      }
    }
    return true; // Default if last point wasn't a score (shouldn't happen for completed points)
  }

  private async saveGameData(): Promise<void> {
    this.gameData.lastModified = new Date();
    // If pointsAtHalfRecorded needs to be persisted across sessions, add it to StoredGame interface
    // and save it here: (this.gameData as any).halfTimePointCount = this.pointsAtHalfRecorded;
    const gameDataToSave = JSON.parse(JSON.stringify(this.gameData));
    await this.db.games.update(this.localGameId, gameDataToSave);
  }

  private pushMemento(): void {
    this.mementos.push({
      gameDataSnapshot: JSON.parse(JSON.stringify(this.gameData)),
      activePointSnapshot: this.activePoint ? this.activePoint.toApiPoint() : null,
      firstActorSnapshot: this.firstActor,
      homePossessionSnapshot: this.homePossession,
      currentLineHomeSnapshot: [...this.currentLineHome],
      currentLineAwaySnapshot: [...this.currentLineAway],
      pointsAtHalfRecordedSnapshot: this.pointsAtHalfRecorded,
    });
  }

  public async undo(): Promise<void> {
    const memento = this.mementos.pop();
    if (memento) {
      this.gameData = memento.gameDataSnapshot;
      this.activePoint = memento.activePointSnapshot
        ? PointModel.fromApiPoint(memento.activePointSnapshot)
        : null;
      this.firstActor = memento.firstActorSnapshot;
      this.homePossession = memento.homePossessionSnapshot;
      this.currentLineHome = memento.currentLineHomeSnapshot;
      this.currentLineAway = memento.currentLineAwaySnapshot;
      this.pointsAtHalfRecorded = memento.pointsAtHalfRecordedSnapshot;
      await this.saveGameData();
    }
  }

  public getGameState(): GameState {
    const lastEventInActivePoint = this.activePoint?.getLastEvent();
    const firstEventOfPoint = !this.activePoint || this.activePoint.getEventCount() === 0;
    
    // Check if it's the first point of the game or the first point of the second half
    const isFirstPointOfHalf = (this.gameData.points.length === this.pointsAtHalfRecorded);

    if (!this.activePoint) { // No active point, ready to start a new one
        return GameState.Start;
    }
    
    if (isFirstPointOfHalf && firstEventOfPoint) { // At the very start of a half
        return this.firstActor ? GameState.Pull : GameState.Start; // If puller selected, ready for pull
    }

    if (lastEventInActivePoint) {
      switch (lastEventInActivePoint.type) {
        case EventType.PULL:
          return this.firstActor ? GameState.FirstThrowQuebecVariant : GameState.WhoPickedUpDisc;
        case EventType.THROWAWAY:
        case EventType.DROP:
          // After a turnover, if a player from the new offense is selected, it's FirstD (ready for their first action)
          // If no one is selected yet, it's WhoPickedUpDisc
          return this.firstActor ? GameState.FirstD : GameState.WhoPickedUpDisc;
        case EventType.DEFENSE:
          // After a D, if the D-player (or teammate) is selected, it's SecondD (ready for action after D)
          // If no one selected, it's WhoPickedUpDisc
          return this.firstActor ? GameState.SecondD : GameState.WhoPickedUpDisc;
        default: // Includes PASS, POINT (though POINT would clear activePoint)
          // If it's the first event of any point (not first of half) and firstActor is set
          if (firstEventOfPoint && this.firstActor) return GameState.FirstThrowQuebecVariant;
          // If it's the first event of any point and no actor, waiting for pickup
          if (firstEventOfPoint && !this.firstActor) return GameState.WhoPickedUpDisc;
          return GameState.Normal;
      }
    } else { // Active point exists but has no events (e.g., players selected, ready for first action)
        if (isFirstPointOfHalf) return this.firstActor ? GameState.Pull : GameState.Start; // Should be covered above
        return this.firstActor ? GameState.FirstThrowQuebecVariant : GameState.WhoPickedUpDisc;
    }
  }

  public setCurrentLine(homePlayers: string[], awayPlayers: string[]): void {
    this.pushMemento();
    this.currentLineHome = [...homePlayers];
    this.currentLineAway = [...awayPlayers];
  }

  public recordFirstActor(player: string, isPlayerOnHomeTeamCurrently: boolean): void {
    this.pushMemento();
    if (!this.activePoint) { 
      this.homePossession = isPlayerOnHomeTeamCurrently; 
      const offense = this.homePossession ? this.currentLineHome : this.currentLineAway;
      const defense = this.homePossession ? this.currentLineAway : this.currentLineHome;
      if (offense.length === 0 || defense.length === 0) {
        console.warn("Attempting to start point with empty lines. Ensure setCurrentLine is called.");
        // Use full rosters as fallback if lines are not set, though UI should prevent this.
        const gameOffense = this.homePossession ? this.gameData.homeRoster : this.gameData.awayRoster;
        const gameDefense = this.homePossession ? this.gameData.awayRoster : this.gameData.homeRoster;
        this.activePoint = new PointModel(gameOffense, gameDefense);
      } else {
        this.activePoint = new PointModel(offense, defense);
      }
    }
    this.firstActor = player;
  }

  public async recordPull(): Promise<void> {
    if (!this.firstActor || !this.activePoint) return;
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.PULL, this.firstActor));
    this.activePoint.swapOffenseAndDefense(); 
    this.homePossession = !this.homePossession; 
    this.firstActor = null;
    await this.saveGameData();
  }

  public async recordPass(receiver: string): Promise<void> {
    if (!this.firstActor || !this.activePoint) return;
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.PASS, this.firstActor, receiver));
    this.firstActor = receiver;
    await this.saveGameData();
  }

  private async handleTurnover(type: EventType.THROWAWAY | EventType.DROP): Promise<void> {
    if (!this.firstActor || !this.activePoint) return;
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(type, this.firstActor));
    this.homePossession = !this.homePossession; 
    this.firstActor = null;
    await this.saveGameData();
  }

  public async recordThrowAway(): Promise<void> {
    await this.handleTurnover(EventType.THROWAWAY);
  }

  public async recordDrop(): Promise<void> {
    await this.handleTurnover(EventType.DROP);
  }

  public async recordD(): Promise<void> { 
    if (!this.firstActor || !this.activePoint) return;
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.DEFENSE, this.firstActor));
    this.homePossession = !this.homePossession; // Possession flips to the D-ing team
    this.firstActor = null; 
    await this.saveGameData();
  }

  public async recordCatchD(): Promise<void> { 
    if (!this.firstActor || !this.activePoint) return;
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.DEFENSE, this.firstActor));
    this.homePossession = !this.homePossession; 
    // this.firstActor (the one who got the catch D) remains the firstActor.
    await this.saveGameData();
  }

  public async recordPoint(): Promise<void> {
    if (!this.firstActor || !this.activePoint) return;
    this.pushMemento();

    this.activePoint.addEvent(new EventModel(EventType.POINT, this.firstActor));
    this.gameData.points.push(this.activePoint.toApiPoint());

    if (this.homePossession) { 
      this.gameData.homeScore++;
    } else {
      this.gameData.awayScore++;
    }
    
    // Update participant rosters if needed (Java version does this)
    // For now, assuming StoredGame.homeRoster/awayRoster are fixed at game setup.
    // If dynamic update is needed:
    // this.activePoint.offensePlayers.forEach(p => {
    //   if (this.homePossession && !this.gameData.homeRoster.includes(p)) this.gameData.homeRoster.push(p);
    //   if (!this.homePossession && !this.gameData.awayRoster.includes(p)) this.gameData.awayRoster.push(p);
    // });
    // this.activePoint.defensePlayers.forEach(p => { ... });


    this.activePoint = null;
    this.firstActor = null;
    this.homePossession = !this.homePossession; 
    this.currentLineHome = []; 
    this.currentLineAway = [];

    await this.saveGameData();
  }

  public async recordHalf(): Promise<void> {
    // Idempotent: only record half once if not already recorded at this point count
    if (this.pointsAtHalfRecorded === 0 || this.pointsAtHalfRecorded !== this.gameData.points.length) {
        this.pushMemento();
        this.pointsAtHalfRecorded = this.gameData.points.length;
        // Persist this.pointsAtHalfRecorded if StoredGame is extended
        // For now, it's an in-memory state for the current session of stat-taking.
        // If it needs to survive app closure, StoredGame needs a field for it.
        console.log(`Half recorded at ${this.pointsAtHalfRecorded} points.`);
        // No direct saveGameData here unless StoredGame is modified to hold this.
        // This is more of a transient state marker for the current session's gameState logic.
    }
  }
  
  public getUndoHistory(): string[] {
    return this.activePoint ? this.activePoint.prettyPrintEvents() : [];
  }
}
