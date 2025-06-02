import { EventModel, EventType, EventModelData } from './EventModel';
import { Point as ApiPoint, PointEvent as ApiPointEvent } from '../../../api';

export class PointModel {
  public offensePlayers: string[];
  public defensePlayers: string[];
  private events: EventModel[];

  constructor(offensePlayers: string[], defensePlayers: string[]) {
    this.offensePlayers = [...offensePlayers]; // Ensure copies
    this.defensePlayers = [...defensePlayers]; // Ensure copies
    this.events = [];
  }

  public addEvent(event: EventModel): void {
    this.events.push(event);
  }

  public removeLastEvent(): EventModel | undefined {
    return this.events.pop();
  }

  public getLastEvent(): EventModel | undefined {
    return this.events.length > 0 ? this.events[this.events.length - 1] : undefined;
  }
  
  public getLastEventType(): EventType | null {
    const lastEvent = this.getLastEvent();
    return lastEvent ? lastEvent.type : null;
  }

  public getEventCount(): number {
    return this.events.length;
  }

  public getEvents(): ReadonlyArray<EventModel> {
    return this.events;
  }

  public swapOffenseAndDefense(): void {
    const temp = this.offensePlayers;
    this.offensePlayers = this.defensePlayers;
    this.defensePlayers = temp;
  }

  public prettyPrintEvents(): string[] {
    return this.events.map(event => event.prettyPrint());
  }

  public toApiPoint(): ApiPoint {
    return {
      offensePlayers: [...this.offensePlayers],
      defensePlayers: [...this.defensePlayers],
      events: this.events.map(e => e.toApiEvent() as ApiPointEvent), // Cast because ApiPointEvent has string type for 'type'
    };
  }

  public static fromApiPoint(apiPoint: ApiPoint): PointModel {
    const point = new PointModel(apiPoint.offensePlayers, apiPoint.defensePlayers);
    point.events = apiPoint.events.map(apiEventData => EventModel.fromApiEventData(apiEventData));
    return point;
  }
}
