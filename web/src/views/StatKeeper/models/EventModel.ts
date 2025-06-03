// Corresponds to Event.java (org.ocua.parity.model.Event)
// Aligns with api.ts PointEvent for storage structure

export enum EventType {
  PULL = 'PULL',
  PASS = 'PASS',
  POINT = 'POINT',
  DEFENSE = 'DEFENSE', // "D" or "Block"
  THROWAWAY = 'THROWAWAY',
  DROP = 'DROP',
  PICK_UP = 'PICK_UP', // New event type
}

export interface EventModelData {
  type: EventType;
  firstActor: string;
  secondActor?: string | null;
  timestamp: string;
}

export class EventModel implements EventModelData {
  public type: EventType;
  public firstActor: string;
  public secondActor: string | null;
  public timestamp: string;

  constructor(type: EventType, firstActor: string, secondActor: string | null = null) {
    this.type = type;
    this.firstActor = firstActor;
    this.secondActor = secondActor; // Will be null for D events as per new requirement
    this.timestamp = new Date().toISOString();
  }

  public toApiEvent(): { type: string; firstActor: string; secondActor: string | null; timestamp: string } {
    return {
      type: this.type.toString(), // EventType enum to string
      firstActor: this.firstActor,
      secondActor: this.secondActor,
      timestamp: this.timestamp,
    };
  }

  public static fromApiEventData(data: { type: string; firstActor: string; secondActor?: string | null; timestamp: string }): EventModel {
    const eventTypeKey = data.type.toUpperCase() as keyof typeof EventType;
    const eventType = EventType[eventTypeKey];
    if (!eventType) {
      console.warn(`Unknown event type "${data.type}" during EventModel.fromApiEventData. Defaulting to THROWAWAY.`);
    }
    const model = new EventModel(eventType || EventType.THROWAWAY, data.firstActor, data.secondActor);
    model.timestamp = data.timestamp;
    return model;
  }

  public prettyPrint(): string {
    switch (this.type) {
      case EventType.PULL:
        return `${this.firstActor} pulled`;
      case EventType.PASS:
        return `${this.secondActor ? `${this.firstActor} passed to ${this.secondActor}` : `${this.firstActor} pass attempt`}`;
      case EventType.POINT:
        return `${this.firstActor} scored!`;
      case EventType.DEFENSE:
        // Simplified: firstActor is always the defender.
        // If secondActor was null (as it will be for recordD, or for recordCatchD), it's a general D.
        // The distinction for "Catch D" can be made by the game state if needed, or if we want a different message for CatchD.
        // For now, aligning with "got a D" or "got a block".
        // If it was a Catch D, the Bookkeeper logic ensures firstActor is the one with the disc.
        // If it was a regular D, Bookkeeper sets firstActor to null (disc loose).
        // The Java version's Event.prettyPrint for DEFENSE is: firstActor + " got a block";
        return `${this.firstActor} got a D`; 
      case EventType.THROWAWAY:
        return `${this.firstActor} threw it away`;
      case EventType.DROP:
        return `${this.firstActor} dropped the disc`;
      case EventType.PICK_UP:
        return `${this.firstActor} picked up the disc`;
      default:
        const exhaustiveCheck: never = this.type;
        return `Unknown event: ${exhaustiveCheck}`;
    }
  }
}
