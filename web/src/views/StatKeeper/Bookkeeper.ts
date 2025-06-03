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
  public homePossession: boolean = true; // True if home team has possession or is on offense

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
      // homePossession determines who is on O for the *next* point or at game start.
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
      return true; // Default: Home team starts on offense (Away team pulls first)
    }
    const lastPoint = this.gameData.points[this.gameData.points.length - 1];
    if (!lastPoint.events || lastPoint.events.length === 0) {
        // Should not happen if a point is recorded, but as a fallback:
        return true; // Default to home on O
    }

    const lastEventOfLastPoint = lastPoint.events[lastPoint.events.length - 1];

    if (lastEventOfLastPoint.type === EventType.POINT.toString()) {
      const scorer = lastEventOfLastPoint.firstActor;
      // Was the scoring team the one listed as offense for that point?
      if (lastPoint.offensePlayers.includes(scorer)) { 
        // Scorer was on the O-line. Which team was that?
        // A simple check: if the first player on that O-line is in homeRoster, it was home team.
        // This assumes rosters are somewhat stable and representative.
        if (this.gameData.homeRoster.includes(lastPoint.offensePlayers[0])) { 
            // Home team scored. Away team on O next.
            return false; 
        } else { 
            // Away team scored. Home team on O next.
            return true; 
        }
      } else { // Callahan: scorer was on the D-line.
          // Which team was the scorer on?
          if (this.gameData.homeRoster.includes(scorer)) { 
              // Home player (on D) scored Callahan. Home team scored. Away on O next.
              return false; 
          } else { 
              // Away player (on D) scored Callahan. Away team scored. Home on O next.
              return true; 
          }
      }
    }
    // If last point didn't end in a score (e.g. game abandoned), this logic might need adjustment.
    // For now, assume points end with scores.
    return true; // Default fallback
  }

  private async saveGameData(): Promise<void> {
    if (!this.gameData || this.gameData.localId === undefined) {
        console.error("Bookkeeper: Attempted to save with undefined gameData or localId.");
        return;
    }
    this.gameData.lastModified = new Date();
    // Deep clone for saving to avoid Dexie specific "DataCloneError" with class instances
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
      gameDataSnapshot: JSON.parse(JSON.stringify(this.gameData)), // Deep clone
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
      // No save here, as undo is reverting to a previously saved state.
      // However, the UI will need to refresh, which happens via LocalGame's triggerRefresh.
    }
  }

  public getGameState(): GameState {
    if (!this.activePoint) { 
        return GameState.Start; // Line selection mode
    }
    
    const eventCount = this.activePoint.getEventCount();
    
    if (eventCount === 0) {
        // Point has been started, no events yet.
        if (this.firstActor) {
            // Puller has been selected.
            return GameState.Pull;
        } else {
            // Waiting for puller to be selected from the defensive team.
            // UI should guide this. GameState.Start implies pre-action for the point.
            return GameState.Start; 
        }
    }

    const lastEventInActivePoint = this.activePoint.getLastEvent();
    if (lastEventInActivePoint) {
      switch (lastEventInActivePoint.type) {
        case EventType.PULL: 
          return GameState.WhoPickedUpDisc;
        case EventType.THROWAWAY:
        case EventType.DROP: 
          return GameState.WhoPickedUpDisc;
        case EventType.DEFENSE: 
          // After DEFENSE event:
          // If firstActor is set, it was a CatchD (defender has disc).
          // If firstActor is null, it was a D (disc loose).
          return this.firstActor ? GameState.FirstThrowQuebecVariant : GameState.WhoPickedUpDisc;
        case EventType.PICK_UP: 
            return GameState.FirstThrowQuebecVariant; 
        case EventType.PASS: 
            return GameState.Normal;
        default: // Should not happen if events are well-defined
          return GameState.Normal;
      }
    }
    // Fallback if activePoint exists but somehow no last event (should be covered by eventCount === 0)
    return GameState.Normal; 
  }

  public setCurrentLine(homePlayers: string[], awayPlayers: string[]): void {
    // This is synchronous, called before startPoint.
    this.currentLineHome = [...homePlayers];
    this.currentLineAway = [...awayPlayers];
  }

  public async startPoint(): Promise<void> {
    if (!this.gameData) {
        console.error("Bookkeeper: Game data not loaded, cannot start point.");
        return;
    }
    if (this.currentLineHome.length === 0 || this.currentLineAway.length === 0) {
        console.error("Bookkeeper: Lines not set, cannot start point.");
        return;
    }

    this.pushMemento();

    // this.homePossession is already set (by loadGame or recordPoint)
    // to indicate which team is on Offense for this new point.
    const offenseLine = this.homePossession ? this.currentLineHome : this.currentLineAway;
    const defenseLine = this.homePossession ? this.currentLineAway : this.currentLineHome;

    this.activePoint = new PointModel(offenseLine, defenseLine);
    this.firstActor = null; // Puller needs to be selected from the defenseLine

    await this.saveGameData();
  }

  public async recordFirstActor(player: string, isPlayerFromHomeTeamList: boolean): Promise<void> {
    this.pushMemento();

    if (!this.activePoint) {
        console.error("Bookkeeper: recordFirstActor called but activePoint is null. Point should be started first.");
        this.mementos.pop();
        return;
    }

    const currentGameState = this.getGameState(); // Get state *before* potential changes
    let stateChanged = false;

    // Scenario 1: Selecting a puller
    // (activePoint exists, 0 events, current firstActor is null, GameState is Start)
    if (this.activePoint.getEventCount() === 0 && this.firstActor === null && currentGameState === GameState.Start) {
        const playerIsOnExpectedDefensiveTeam = isPlayerFromHomeTeamList !== this.homePossession;
        if (!playerIsOnExpectedDefensiveTeam) {
            console.warn("Bookkeeper: Puller selected from the team currently designated as offense. This might be a misclick or lines were swapped mentally.");
            // Allow for now, but UI should guide selection from the D line.
        }
        this.firstActor = player; // This player is now the designated puller
        stateChanged = true;
    } 
    // Scenario 2: Picking up the disc
    else if (currentGameState === GameState.WhoPickedUpDisc || (currentGameState === GameState.FirstThrowQuebecVariant && !this.firstActor && lastEventWasDefenseAndDiscLoose())) {
        // lastEventWasDefenseAndDiscLoose is a helper to ensure we are picking up after a non-catch D
        const playerIsOnPossessingTeam = isPlayerFromHomeTeamList === this.homePossession;
        if (!playerIsOnPossessingTeam) {
            console.error("Bookkeeper: Player selected to pick up disc is not on the team with possession.");
            this.mementos.pop();
            return;
        }
        this.activePoint.addEvent(new EventModel(EventType.PICK_UP, player));
        this.firstActor = player;
        stateChanged = true;
    } 
    // Scenario 3: Selecting a defender for a D action, or (less commonly) selecting an offensive player if firstActor was cleared
    else if (currentGameState === GameState.Normal || currentGameState === GameState.FirstThrowQuebecVariant || currentGameState === GameState.FirstD || currentGameState === GameState.SecondD) {
        const playerIsOnDefensiveTeam = isPlayerFromHomeTeamList !== this.homePossession;
        if (playerIsOnDefensiveTeam) { // Selecting a defender
            this.firstActor = player;
            stateChanged = true;
        } else { // Player is on offensive team
            if (!this.firstActor) { // If no one had the disc, and offensive player tapped
                this.firstActor = player; // They now have it (e.g., after a confusing state)
                // Consider adding a PICK_UP event here if appropriate for the flow
                this.activePoint.addEvent(new EventModel(EventType.PICK_UP, player));
                stateChanged = true;
            } else {
                // firstActor is already set and is offensive, tapping another offensive player should be a pass.
                // This function (recordFirstActor) shouldn't be called for a pass.
                console.warn("Bookkeeper: recordFirstActor called for offensive player when firstActor (offensive) already set. This should be a pass.");
                this.mementos.pop(); 
                return;
            }
        }
    } else {
        console.warn(`Bookkeeper: recordFirstActor called in unhandled game state: ${GameState[currentGameState]} or unexpected condition.`);
        this.mementos.pop();
        return;
    }

    if (stateChanged) {
        await this.saveGameData();
    } else {
        this.mementos.pop(); // No change, pop memento
    }
  }
  
  // Helper for recordFirstActor logic
  private lastEventWasDefenseAndDiscLoose(): boolean {
    if (!this.activePoint || this.activePoint.getEventCount() === 0) return false;
    const lastEvent = this.activePoint.getLastEvent();
    return lastEvent?.type === EventType.DEFENSE && this.firstActor === null;
  }


  public async recordPull(): Promise<void> {
    if (!this.firstActor || !this.activePoint) {
        console.error("Bookkeeper: Cannot record pull. Puller (firstActor) or activePoint not set.");
        return;
    }
    // Basic check: puller should be on the team that is currently on defense.
    // this.homePossession is true if Home is on O, so Away is on D.
    // Puller's team (isHomeTeam) should be !this.homePossession.
    const pullerIsHomeTeam = this.gameData.homeRoster.includes(this.firstActor); // General check
    // A more precise check would be against currentLineHome/Away, but roster check is broader.
    if (pullerIsHomeTeam === this.homePossession) {
        console.warn(`Bookkeeper: Puller (${this.firstActor}) seems to be from the offensive team. Possession: ${this.homePossession ? 'Home' : 'Away'}. Puller isHome: ${pullerIsHomeTeam}. Proceeding.`);
    }

    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.PULL, this.firstActor));
    this.firstActor = null; // Disc is in the air, no one possesses it.
    // homePossession remains as is (reflecting the receiving team).
    // activePoint O/D lines remain as is.
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
    this.homePossession = !this.homePossession; // Possession flips
    this.firstActor = null; // Disc is loose or turned over
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
    this.activePoint.addEvent(new EventModel(EventType.DEFENSE, this.firstActor, null));
    this.homePossession = !this.homePossession; // Possession flips to the D-ing team
    this.firstActor = null; // Disc is loose, D-ing team needs to pick up.
    await this.saveGameData();
  }

  public async recordCatchD(): Promise<void> { 
    if (!this.firstActor || !this.activePoint) return;
    this.pushMemento();
    this.activePoint.addEvent(new EventModel(EventType.DEFENSE, this.firstActor, null)); 
    this.homePossession = !this.homePossession; // Possession flips to the D-ing team
    // this.firstActor (the defender) remains firstActor because they caught the D.
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
    // Possession flips for the *next* point: team that was scored on receives.
    this.homePossession = !this.homePossession; 
    this.currentLineHome = []; 
    this.currentLineAway = [];

    await this.saveGameData();
  }

  public async recordHalf(): Promise<void> {
    if (!this.gameData) return;
    // Only record half if it hasn't been recorded or if it's a different number of points
    if (this.pointsAtHalfRecorded === 0 || this.pointsAtHalfRecorded !== this.gameData.points.length) {
        this.pushMemento();
        this.pointsAtHalfRecorded = this.gameData.points.length;
        console.log(`Half recorded at ${this.pointsAtHalfRecorded} points.`);
        // Consider if saving game data is needed here if only pointsAtHalfRecorded changed for memento
        // For now, assume other actions will trigger save if necessary.
        // Or, explicitly save if this is a standalone action that needs persisting.
        await this.saveGameData(); 
    } else {
        console.log("Half already recorded at this point count or not applicable.");
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
