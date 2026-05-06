import { BaseEvent } from './base.event';

export class DataExportCompletedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly exportId: string,
    public readonly downloadUrl: string,
    public readonly fileName: string,
    public readonly recordCount: number,
  ) {
    super();
  }
}
