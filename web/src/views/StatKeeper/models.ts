import { type PointEvent as ApiPointEvent } from '../../api';

// Enums
export enum EventType {
  PULL = 'PULL',
  PASS = 'PASS',
  POINT = 'POINT',
  DEFENSE = 'DEFENSE',
  THROWAWAY = 'THROWAWAY',
  DROP = 'DROP',
}

// Event interface for internal use
export interface Event {
  type: EventType;
  firstActor: string;
  secondActor: string | null;
  timestamp: string; // ISO 8601 format
}

export function mapApiEventToEvent(apiEvent: ApiPointEvent): Event {
  const eventTypeString = apiEvent.type.toUpperCase();
  const eventType = EventType[eventTypeString as keyof typeof EventType];

  if (!eventType) {
    throw new Error(`Unknown API event type string encountered: ${apiEvent.type}`);
  }

  return {
    type: eventType,
    firstActor: apiEvent.firstActor,
    secondActor: apiEvent.secondActor,
    timestamp: apiEvent.timestamp,
  };
}

export function mapEventToApiEvent(event: Event): ApiPointEvent {
  return {
    type: event.type.toString(), // Converts enum to string e.g. EventType.PASS -> "PASS"
    firstActor: event.firstActor,
    secondActor: event.secondActor,
    timestamp: event.timestamp,
  };
}

// Model Classes - keep these as they're used by React components
export class PointModel {
  offensePlayers: string[];
  defensePlayers: string[];
  events: Event[];

  constructor(offensePlayers: string[], defensePlayers: string[], events: Event[] = []) {
    this.offensePlayers = [...offensePlayers];
    this.defensePlayers = [...defensePlayers];
    this.events = events.map(e => ({ ...e })); // Deep copy events
  }

  getEventCount(): number {
    return this.events.length;
  }

  getLastEvent(): Event | null {
    if (this.events.length === 0) {
      return null;
    }
    return this.events[this.events.length - 1];
  }

  getLastEventType(): EventType | null {
    const lastEvent = this.getLastEvent();
    return lastEvent ? lastEvent.type : null;
  }

  removeLastEvent(): Event | undefined {
    return this.events.pop();
  }

  addEvent(event: Event): void {
    this.events.push(event);
  }

  swapOffenseAndDefense(): void {
    [this.offensePlayers, this.defensePlayers] = [this.defensePlayers, this.offensePlayers];
    // No need to swap anything in allPlayers since it contains both offense and defense
  }

  updateCurrentPlayers(newOffensePlayers: string[], newDefensePlayers: string[]): void {
    this.offensePlayers = [...newOffensePlayers];
    this.defensePlayers = [...newDefensePlayers];
  }

  prettyPrint(): string[] {
    return this.events.map(event => {
      switch (event.type) {
        case EventType.PULL:
          return `${event.firstActor} pulled`;
        case EventType.PASS:
          return `${event.firstActor} passed to ${event.secondActor}`;
        case EventType.POINT:
          return `${event.firstActor} scored!`;
        case EventType.DEFENSE:
          return `${event.firstActor} got a block`;
        case EventType.THROWAWAY:
          return `${event.firstActor} threw it away`;
        case EventType.DROP:
          return `${event.firstActor} dropped it`;
        default: {
          // This exhaustive check helps ensure all event types are handled.
          // If a new EventType is added without a case here, TypeScript will error.
          const _exhaustiveCheck: never = event.type;
          console.warn('Unknown event type in prettyPrint:', event.type);
          return `Unknown event: ${event.type}`;
        }
      }
    });
  }

  toJSON(): {
    offensePlayers: string[];
    defensePlayers: string[];
    events: Event[];
  } {
    return {
      offensePlayers: [...this.offensePlayers],
      defensePlayers: [...this.defensePlayers],
      events: this.events.map(e => ({ ...e })),
    };
  }

  static fromJSON(json: {
    offensePlayers: string[];
    defensePlayers: string[];
    events: Event[];
  }): PointModel {
    const point = new PointModel(json.offensePlayers, json.defensePlayers, json.events);
    return point;
  }
}

