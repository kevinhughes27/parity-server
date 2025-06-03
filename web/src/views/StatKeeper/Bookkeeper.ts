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
      if (lastPoint.offensePlayers.includes(scorer)) { 
        if (this.gameData.homeRoster.includes(lastPoint.offensePlayers[0])) { 
            return false; 
        } else { 
            return true; 
        }
      } else { 
          if (this.gameData.homeRoster.includes(scorer)) { 
              return true; 
          } else { 
              return false; 
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
        return GameState.Start;
    }
    
    if (firstEventOfPoint && !this.firstActor) {
        if (isFirstPointOfHalf) return GameState.Start; 
        return GameState.WhoPickedUpDisc; 
    }
    
    if (isFirstPointOfHalf && firstEventOfPoint && this.firstActor) { 
        return GameState.Pull; 
    }

    if (lastEventInActivePoint) {
      switch (lastEventInActivePoint.type) {
        case EventType.PULL: 
          return GameState.WhoPickedUpDisc;
        case EventType.THROWAWAY:
        case EventType.DROP: 
          return GameState.WhoPickedUpDisc;
        case EventType.DEFENSE: 
          return this.firstActor ? GameState.SecondD : GameState.WhoPickedUpDisc;
        case EventType.PICK_UP: 
            return GameState.FirstThrowQuebecVariant; 
        case EventType.PASS: 
            return GameState.Normal;
        default: 
          return GameState.Normal;
      }
    } else { 
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

    const lastEvent = this.activePoint.getLastEvent();
    if (
        (lastEvent && (lastEvent.type === EventType.PULL || lastEvent.type === EventType.THROWAWAY || lastEvent.type === EventType.DROP)) ||
        (lastEvent && lastEvent.type === EventType.DEFENSE && this.firstActor === null) || 
        (this.activePoint.getEventCount() === 0 && this.gameData.points.length !== this.pointsAtHalfRecorded) 
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

  // Defender (firstActor) gets a block. Disc is loose.
  public async recordD(): Promise<void> { 
    if (!this.firstActor || !this.activePoint) return; 
    this.pushMemento();
    // The firstActor is the defender. No secondActor for this event.
    this.activePoint.addEvent(new EventModel(EventType.DEFENSE, this.firstActor, null));
    this.homePossession = !this.homePossession; 
    this.firstActor = null; // Disc is loose, waiting for pickup by D-ing team
    await this.saveGameData();
  }

  // Defender (firstActor) gets a block and catches it.
  public async recordCatchD(): Promise<void> { 
    if (!this.firstActor || !this.activePoint) return;
    this.pushMemento();
    // The firstActor is the defender. No secondActor.
    this.activePoint.addEvent(new EventModel(EventType.DEFENSE, this.firstActor, null)); 
    this.homePossession = !this.homePossession; 
    // this.firstActor (the defender) remains the firstActor because they have the disc.
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
