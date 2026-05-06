import { BaseEvent } from './base.event';

export class DataExportFailedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly exportId: string,
    public readonly error: string,
  ) {
    super();
  }
}
