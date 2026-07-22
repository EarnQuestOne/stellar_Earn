import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { JobsService } from './jobs.service';
import { QUEUES } from './jobs.constants';

export function createBullBoardRouter(jobsService: JobsService) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const adapters: any[] = [];
  for (const q of Object.values(QUEUES)) {
    const queue = jobsService.getQueue(q);
    if (queue) adapters.push(new BullMQAdapter(queue as any));
  }

  createBullBoard({ queues: adapters as any, serverAdapter });

  // return the underlying express router
  return (serverAdapter as any).getRouter();
}
