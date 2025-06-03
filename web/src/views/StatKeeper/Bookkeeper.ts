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
  public pointsAtHalfRecorded: number = 0; 

  private mementos: MementoState[] = [];

  constructor(private localGameId: number, dexieDbInstance: DexieDB) {
    this.db = dexieDbInstance;
  }

  public async loadGame(): Promise<boolean> {
    const game = await this.db.games.get(this.localGameId);
    if (game) {
      this.gameData = game;
      this.homePossession = this.determineInitialPossession();
      return true;
    }
    console.error(`Bookkeeper: Game with localId ${this.localGameId} not found.`);
    this.gameData = { 
        localId: this.localGameId, 
        league_id: '', week: 0, homeTeam: 'Error', awayTeam: 'Error', 
        homeScore:0, awayScore:0, homeRoster:[], awayRoster:[], points:[], 
        status:'sync-error', lastModified: new Date()
    };
    return false;
  }

  private determineInitialPossession(): boolean {
    if (!this.gameData || this.gameData.points.length === 0) {
      return true; 
    }
    const lastPoint = this.gameData.points[this.gameData.points.length - 1];
    if (!lastPoint.events || lastPoint.events.length === 0) return true;

    const lastEventOfLastPoint = lastPoint.events[lastPoint.events.length - 1];

    if (lastEventOfLastPoint.type === EventType.POINT.toString()) {
      const scorer = lastEventOfLastPoint.firstActor;
      // This logic assumes that if the scorer is in the homeRoster, the home team scored.
      // This might need refinement if rosters are very dynamic or subs are common.
      // A more robust way would be to check if the scorer was part of the `lastPoint.offensePlayers`.
      if (lastPoint.offensePlayers.includes(scorer)) { // Scorer was on offense for that point
        // Was that offense the home team or away team?
        // Check if the first player of that point's offense is in the game's home roster
        if (this.gameData.homeRoster.includes(lastPoint.offensePlayers[0])) { // Home team scored
            return false; // Away team's possession
        } else { // Away team scored
            return true; // Home team's possession
        }
      } else { // Scorer was on defense (Callahan) - this case needs careful thought for possession
          // If Callahan, the scoring team (defense) keeps possession for the next point (pulls)
          if (this.gameData.homeRoster.includes(scorer)) { // Home player scored Callahan
              return true; // Home team pulls
          } else { // Away player scored Callahan
              return false; // Away team pulls
          }
      }
    }
    return true; 
  }

  private async saveGameData(): Promise<void> {
    if (!this.gameData || this.gameData.localId === undefined) {
        console.error("Bookkeeper: Attempted to save with undefined gameData or localId.");
        return;
    }
    this.gameData.lastModified = new Date();
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
    const isFirstPointOfHalf = (this.gameData.points.length === this.pointsAtHalfRecorded);

    if (!this.activePoint) { 
        return GameState.Start; // Ready to select players for point / select puller
    }
    
    // If point just started (e.g. after score, lines set), and no first actor selected yet
    if (firstEventOfPoint && !this.firstActor) {
        if (isFirstPointOfHalf) return GameState.Start; // Select puller
        return GameState.WhoPickedUpDisc; // Select player to pick up disc
    }
    
    if (isFirstPointOfHalf && firstEventOfPoint && this.firstActor) { 
        return GameState.Pull; 
    }

    if (lastEventInActivePoint) {
      switch (lastEventInActivePoint.type) {
        case EventType.PULL: // After pull, waiting for pickup
          return GameState.WhoPickedUpDisc;
        case EventType.THROWAWAY:
        case EventType.DROP: // After turnover, waiting for pickup
          return GameState.WhoPickedUpDisc;
        case EventType.DEFENSE: // After a D
          // If firstActor is set, it means it was a CatchD, player has disc
          // If firstActor is null, it was a block, waiting for pickup
          return this.firstActor ? GameState.SecondD : GameState.WhoPickedUpDisc;
        case EventType.PICK_UP: // After a pick up, ready for first throw
            return GameState.FirstThrowQuebecVariant; 
        case EventType.PASS: // Normal play
            return GameState.Normal;
        default: 
          return GameState.Normal;
      }
    } else { // Active point exists but has no events (should be handled by logic above)
        if (isFirstPointOfHalf) return this.firstActor ? GameState.Pull : GameState.Start; 
        return GameState.WhoPickedUpDisc; 
    }
  }

  public setCurrentLine(homePlayers: string[], awayPlayers: string[]): void {
    this.currentLineHome = [...homePlayers];
    this.currentLineAway = [...awayPlayers];
  }

  public recordFirstActor(player: string, isPlayerFromHomeTeam: boolean): void {
    this.pushMemento();
    if (!this.activePoint) { 
      this.homePossession = isPlayerFromHomeTeam; 
      const offense = this.homePossession ? this.currentLineHome : this.currentLineAway;
      const defense = this.homePossession ? this.currentLineAway : this.currentLineHome;
      
      if (offense.length === 0 && this.gameData) {
        this.activePoint = new PointModel(
            this.homePossession ? this.gameData.homeRoster : this.gameData.awayRoster,
            this.homePossession ? this.gameData.awayRoster : this.gameData.homeRoster
        );
      } else if (offense.length > 0) {
         this.activePoint = new PointModel(offense, defense);
      } else {
        console.error("Cannot start point: lines not set and gameData unavailable for fallback.");
        this.mementos.pop(); 
        return;
      }
    }

    // Check if this action is a "pick up"
    const lastEvent = this.activePoint.getLastEvent();
    if (
        (lastEvent && (lastEvent.type === EventType.PULL || lastEvent.type === EventType.THROWAWAY || lastEvent.type === EventType.DROP)) ||
        (lastEvent && lastEvent.type === EventType.DEFENSE && this.firstActor === null) || // After a non-catch D
        (this.activePoint.getEventCount() === 0 && this.gameData.points.length !== this.pointsAtHalfRecorded) // Start of a new point (not first of half)
    ) {
        this.activePoint.addEvent(new EventModel(EventType.PICK_UP, player));
    }
    
    this.firstActor = player;
  }

  public async recordPull(): Promise<void> {
    if (!this.firstActor || !this.activePoint) return;
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.PULL, this.firstActor));
    this.activePoint.swapOffenseAndDefense(); 
    this.homePossession = !this.homePossession; 
    this.firstActor = null; // Disc is now loose, waiting for pick up
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

  public async recordD(defender: string, offensivePlayerBlocked: string): Promise<void> { 
    if (!this.activePoint) return; 
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.DEFENSE, defender, offensivePlayerBlocked));
    this.homePossession = !this.homePossession; 
    this.firstActor = null; // Disc is loose, waiting for pickup by D-ing team
    await this.saveGameData();
  }

  public async recordCatchD(defender: string): Promise<void> { 
    if (!this.activePoint) return;
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.DEFENSE, defender)); 
    this.homePossession = !this.homePossession; 
    this.firstActor = defender; // Defender now has the disc
    await this.saveGameData();
  }

  public async recordPoint(): Promise<void> {
    if (!this.firstActor || !this.activePoint || !this.gameData) return;
    this.pushMemento();

    this.activePoint.addEvent(new EventModel(EventType.POINT, this.firstActor));
    this.gameData.points.push(this.activePoint.toApiPoint());

    if (this.homePossession) { 
      this.gameData.homeScore++;
    } else {
      this.gameData.awayScore++;
    }
    
    this.activePoint = null;
    this.firstActor = null;
    this.homePossession = !this.homePossession; 
    this.currentLineHome = []; 
    this.currentLineAway = [];

    await this.saveGameData();
  }

  public async recordHalf(): Promise<void> {
    if (!this.gameData) return;
    if (this.pointsAtHalfRecorded === 0 || this.pointsAtHalfRecorded !== this.gameData.points.length) {
        this.pushMemento();
        this.pointsAtHalfRecorded = this.gameData.points.length;
        console.log(`Half recorded at ${this.pointsAtHalfRecorded} points.`);
    }
  }
  
  public getUndoHistory(): string[] {
    return this.activePoint ? this.activePoint.prettyPrintEvents() : [];
  }

  public isFirstActor(player: string): boolean {
    return this.firstActor === player;
  }

  public teamHasPossession(isPlayerFromHomeTeamList: boolean): boolean {
      return this.homePossession === isPlayerFromHomeTeamList;
  }
}
