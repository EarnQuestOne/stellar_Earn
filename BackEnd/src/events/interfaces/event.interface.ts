export interface IEvent {
  eventName: string;
  timestamp: Date;
  payload: any;
  metadata?: Record<string, any>;
}
