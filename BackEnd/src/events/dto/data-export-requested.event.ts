import { BaseEvent } from './base.event';

export class DataExportRequestedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly exportId: string,
    public readonly exportType: string,
    public readonly format: string,
  ) {
    super();
  }
}
