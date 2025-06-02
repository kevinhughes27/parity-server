// Corresponds to Event.java (org.ocua.parity.model.Event)
// Aligns with api.ts PointEvent for storage structure

export enum EventType {
  PULL = 'PULL',
  PASS = 'PASS',
  POINT = 'POINT',
  DEFENSE = 'DEFENSE', // "D" or "Block"
  THROWAWAY = 'THROWAWAY',
  DROP = 'DROP',
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
    this.secondActor = secondActor;
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
      // This case should ideally not happen if data is clean.
      // Consider throwing an error or using a default with a warning.
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
        return `${this.firstActor} got a block`;
      case EventType.THROWAWAY:
        return `${this.firstActor} threw it away`;
      case EventType.DROP:
        return `${this.firstActor} dropped the disc`;
      default:
        // This should be unreachable if all EventType cases are handled
        const exhaustiveCheck: never = this.type;
        return `Unknown event: ${exhaustiveCheck}`;
    }
  }
}
