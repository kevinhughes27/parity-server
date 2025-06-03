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
  pendingDTypeSnapshot: 'D' | 'CatchD' | null;
  playerWhoThrewTurnoverForDSnapshot: string | null;
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

  // For two-step D/CatchD
  private pendingDType: 'D' | 'CatchD' | null = null;
  private playerWhoThrewTurnoverForD: string | null = null;


  constructor(private localGameId: number, dexieDbInstance: DexieDB) {
    this.db = dexieDbInstance;
  }

  public async loadGame(): Promise<boolean> {
    const game = await this.db.games.get(this.localGameId);
    if (game) {
      this.gameData = game;
      this.homePossession = this.determineInitialPossession();
      this.pointsAtHalfRecorded = game.pointsAtHalfRecorded || 0; 
      return true;
    }
    console.error(`Bookkeeper: Game with localId ${this.localGameId} not found.`);
    this.gameData = { 
        localId: this.localGameId, 
        league_id: '', week: 0, homeTeam: 'Error', awayTeam: 'Error', 
        homeScore:0, awayScore:0, homeRoster:[], awayRoster:[], points:[], 
        status:'sync-error', lastModified: new Date(), pointsAtHalfRecorded: 0
    };
    return false;
  }

  private determineInitialPossession(): boolean {
    if (!this.gameData || this.gameData.points.length === 0) {
      return true; 
    }
    const lastPoint = this.gameData.points[this.gameData.points.length - 1];
    if (!lastPoint.events || lastPoint.events.length === 0) {
        return true; 
    }

    const lastEventOfLastPoint = lastPoint.events[lastPoint.events.length - 1];

    if (lastEventOfLastPoint.type === EventType.POINT.toString()) {
      const scorer = lastEventOfLastPoint.firstActor;
      const homeRosterSet = new Set(this.gameData.homeRoster);
      const awayRosterSet = new Set(this.gameData.awayRoster);

      let scorerWasHomeTeam: boolean;
      if (homeRosterSet.has(scorer)) {
          scorerWasHomeTeam = true;
      } else if (awayRosterSet.has(scorer)) {
          scorerWasHomeTeam = false;
      } else {
          console.warn("Scorer not found in home or away roster. Defaulting possession.");
          return true; 
      }
      return !scorerWasHomeTeam;
    }
    return true; 
  }

  private async saveGameData(): Promise<void> {
    if (!this.gameData || this.gameData.localId === undefined) {
        console.error("Bookkeeper: Attempted to save with undefined gameData or localId.");
        return;
    }
    this.gameData.lastModified = new Date();
    this.gameData.pointsAtHalfRecorded = this.pointsAtHalfRecorded;

    const gameDataToSave = JSON.parse(JSON.stringify({
        ...this.gameData,
        points: this.gameData.points.map(p => ({
            ...p,
            events: p.events.map(e => e instanceof EventModel ? e.toApiEventData() : e)
        }))
    }));
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
      pendingDTypeSnapshot: this.pendingDType,
      playerWhoThrewTurnoverForDSnapshot: this.playerWhoThrewTurnoverForD,
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
      this.pendingDType = memento.pendingDTypeSnapshot;
      this.playerWhoThrewTurnoverForD = memento.playerWhoThrewTurnoverForDSnapshot;
    }
  }

  public isPullPoint(): boolean {
    if (!this.gameData) return false;
    const numPointsPlayed = this.gameData.points.length;
    return numPointsPlayed === 0 || (this.pointsAtHalfRecorded > 0 && numPointsPlayed === this.pointsAtHalfRecorded);
  }

  public getGameState(): GameState {
    if (this.pendingDType) { // Highest priority: if we are selecting a defender
        return GameState.SelectDefenderForD;
    }
    if (!this.activePoint) { 
        return GameState.Start; // Line selection mode
    }
    
    const eventCount = this.activePoint.getEventCount();
    
    if (eventCount === 0) { // Point just started, no events yet
        if (this.isPullPoint()) {
            // On a pull point, if firstActor (puller) is selected, state is Pull. Otherwise, Start (to select puller).
            return this.firstActor ? GameState.Pull : GameState.Start; 
        } else {
            // Not a pull point, offense starts with disc. Needs to select who picks up.
            // firstActor will be null here.
            return GameState.WhoPickedUpDisc;
        }
    }

    const lastEventInActivePoint = this.activePoint.getLastEvent();
    if (lastEventInActivePoint) {
      switch (lastEventInActivePoint.type) {
        case EventType.PULL: 
          return GameState.WhoPickedUpDisc;
        case EventType.THROWAWAY: // This now also covers the first part of a D/CatchD
        case EventType.DROP: 
          return GameState.WhoPickedUpDisc;
        case EventType.DEFENSE: // This is after the defender has been selected for D/CatchD
          return this.firstActor ? GameState.FirstThrowQuebecVariant : GameState.WhoPickedUpDisc;
        case EventType.PICK_UP: 
            return GameState.FirstThrowQuebecVariant; 
        case EventType.PASS: 
            return GameState.Normal;
        default: 
          return GameState.Normal;
      }
    }
    return GameState.Normal; 
  }

  public setCurrentLine(homePlayers: string[], awayPlayers: string[]): void {
    this.currentLineHome = [...homePlayers];
    this.currentLineAway = [...awayPlayers];
  }

  public async startPoint(): Promise<void> {
    if (!this.gameData) return;
    if (this.currentLineHome.length === 0 || this.currentLineAway.length === 0) return;

    this.pushMemento();

    const offenseLine = this.homePossession ? this.currentLineHome : this.currentLineAway;
    const defenseLine = this.homePossession ? this.currentLineAway : this.currentLineHome;

    this.activePoint = new PointModel(offenseLine, defenseLine);
    this.firstActor = null; 
    this.pendingDType = null; // Ensure this is reset at start of new point
    this.playerWhoThrewTurnoverForD = null;
    await this.saveGameData();
  }

  public async recordFirstActor(player: string, isPlayerFromHomeTeamList: boolean): Promise<void> {
    this.pushMemento();

    if (!this.activePoint) {
        console.error("Bookkeeper: recordFirstActor called but activePoint is null.");
        this.mementos.pop(); return;
    }

    const currentGameState = this.getGameState(); 
    let stateChanged = false;

    if (this.pendingDType && this.playerWhoThrewTurnoverForD) { // currentGameState will be SelectDefenderForD
        // Step 2 of D/CatchD: Selecting the defender
        const originalOffensiveTeamWasHome = this.gameData.homeRoster.includes(this.playerWhoThrewTurnoverForD) || this.currentLineHome.includes(this.playerWhoThrewTurnoverForD);
        
        // The defender must be on the team that was NOT originally on offense.
        const defenderIsOnCorrectTeam = isPlayerFromHomeTeamList !== originalOffensiveTeamWasHome;

        if (!defenderIsOnCorrectTeam) {
            alert("Defender selected from the same team as the thrower. Please select a player from the defensive team.");
            console.error("Bookkeeper: Defender selected from the same team as the thrower.");
            this.mementos.pop(); return;
        }

        this.activePoint.addEvent(new EventModel(EventType.DEFENSE, player)); 
        this.homePossession = !this.homePossession; 

        if (this.pendingDType === 'CatchD') {
            this.firstActor = player; 
        } else { 
            this.firstActor = null; 
        }
        this.pendingDType = null;
        this.playerWhoThrewTurnoverForD = null;
        stateChanged = true;

    } else if (currentGameState === GameState.Start && this.isPullPoint() && this.firstActor === null) {
        // Selecting a puller (only on pull points, before puller is set)
        const playerIsOnExpectedDefensiveTeam = isPlayerFromHomeTeamList !== this.homePossession;
        if (!playerIsOnExpectedDefensiveTeam) {
            alert("Puller should be selected from the team on defense.");
            console.warn("Bookkeeper: Puller selected from team designated as offense.");
            this.mementos.pop(); return;
        }
        this.firstActor = player; 
        stateChanged = true;
    } 
    else if (currentGameState === GameState.WhoPickedUpDisc) {
        // Picking up the disc (after pull, turnover, non-catch D, or start of non-pull point)
        const playerIsOnPossessingTeam = isPlayerFromHomeTeamList === this.homePossession;
        if (!playerIsOnPossessingTeam) {
            alert("Player selected to pick up disc is not on the team with possession.");
            console.error("Bookkeeper: Player selected to pick up disc is not on the team with possession.");
            this.mementos.pop(); return;
        }
        this.activePoint.addEvent(new EventModel(EventType.PICK_UP, player));
        this.firstActor = player;
        stateChanged = true;
    } 
    else if ((currentGameState === GameState.Normal || currentGameState === GameState.FirstThrowQuebecVariant) && !this.firstActor) {
        // This case handles if firstActor was somehow cleared in Normal play, and an offensive player is tapped.
        const playerIsOnOffensiveTeam = isPlayerFromHomeTeamList === this.homePossession;
        if (playerIsOnOffensiveTeam) {
            this.activePoint.addEvent(new EventModel(EventType.PICK_UP, player));
            this.firstActor = player; 
            stateChanged = true;
        } else {
            // Tapping a defensive player when no one has the disc in Normal play.
            // This should ideally be initiated by D/CatchD buttons.
            // For now, let's assume this sets them up for a D.
            this.firstActor = player; // Sets defender as first actor, D/CatchD buttons become active
            stateChanged = true;
        }
    } else {
        console.warn(`Bookkeeper: recordFirstActor called in unhandled game state: ${GameState[currentGameState]} or condition. FirstActor: ${this.firstActor}, PendingD: ${this.pendingDType}`);
        this.mementos.pop(); return;
    }

    if (stateChanged) {
        await this.saveGameData();
    } else {
        this.mementos.pop(); 
    }
  }
  
  public async recordPull(): Promise<void> {
    if (!this.firstActor || !this.activePoint || !this.isPullPoint() || this.getGameState() !== GameState.Pull) {
        console.error("Bookkeeper: Cannot record pull. Conditions not met.");
        return;
    }
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.PULL, this.firstActor));
    // After pull, disc is in air, receiver will pick up. Possession is with receiving team.
    // this.homePossession was already set for the receiving team.
    this.firstActor = null; 
    await this.saveGameData();
  }

  public async recordPass(receiver: string): Promise<void> {
    if (!this.firstActor || !this.activePoint) return;
    
    const firstActorIsHome = this.currentLineHome.includes(this.firstActor);
    const receiverIsHome = this.currentLineHome.includes(receiver);

    if (firstActorIsHome !== receiverIsHome) {
        alert("Pass recorded to a player on the opposing team. This is likely a D or misclick. Use D/CatchD buttons for blocks.");
        console.error("Bookkeeper: Pass recorded to a player on the opposing team.");
        return;
    }
    if (this.firstActor === receiver) {
        alert("Cannot pass to self.");
        return;
    }

    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.PASS, this.firstActor, receiver));
    this.firstActor = receiver;
    await this.saveGameData();
  }

  private async handleDirectTurnover(type: EventType.THROWAWAY | EventType.DROP): Promise<void> {
    if (!this.firstActor || !this.activePoint) return;
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(type, this.firstActor));
    this.homePossession = !this.homePossession; 
    this.firstActor = null; 
    await this.saveGameData();
  }

  public async recordThrowAway(): Promise<void> { 
    await this.handleDirectTurnover(EventType.THROWAWAY);
  }

  public async recordDrop(): Promise<void> {
    await this.handleDirectTurnover(EventType.DROP);
  }

  private async initiateDSequence(dType: 'D' | 'CatchD'): Promise<void> {
    if (!this.firstActor || !this.activePoint) {
        alert(`Cannot initiate ${dType}. Player with disc (firstActor) not set.`);
        console.error(`Bookkeeper: Cannot initiate ${dType}. firstActor or activePoint not set.`);
        return;
    }
    // Ensure firstActor is on the current offensive team
    const firstActorIsHome = this.currentLineHome.includes(this.firstActor);
    if (firstActorIsHome !== this.homePossession) {
        alert("D/Catch D can only be initiated by the player currently with the disc on offense.");
        console.error("Bookkeeper: D/Catch D initiated by player not on offense.");
        return;
    }

    this.pushMemento(); 

    this.playerWhoThrewTurnoverForD = this.firstActor;
    this.activePoint.addEvent(new EventModel(EventType.THROWAWAY, this.playerWhoThrewTurnoverForD));
    
    this.pendingDType = dType;
    this.firstActor = null; 
    // game state becomes SelectDefenderForD via getGameState()
    await this.saveGameData();
  }

  public async recordD(): Promise<void> { 
    await this.initiateDSequence('D');
  }

  public async recordCatchD(): Promise<void> { 
    await this.initiateDSequence('CatchD');
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
    this.pendingDType = null;
    this.playerWhoThrewTurnoverForD = null;

    await this.saveGameData();
  }

  public async recordHalf(): Promise<void> {
    if (!this.gameData) return;
    if (this.pointsAtHalfRecorded === 0 || this.pointsAtHalfRecorded !== this.gameData.points.length) {
        this.pushMemento();
        this.pointsAtHalfRecorded = this.gameData.points.length;
        await this.saveGameData(); 
    }
  }
  
  public getUndoHistory(): string[] {
    return this.activePoint ? this.activePoint.prettyPrintEvents() : [];
  }

  public isFirstActor(player: string): boolean {
    return this.firstActor === player;
  }
}
