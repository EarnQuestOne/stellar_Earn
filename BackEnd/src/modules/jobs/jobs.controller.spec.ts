import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

describe('JobsController', () => {
  let controller: JobsController;
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: {
            executeJob: jest.fn().mockResolvedValue({ success: true, jobId: 'job-123' }),
          },
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
  });

  it('should trigger job execution via controller', async () => {
    const dto = { jobId: 'job-123', type: 'PAYOUT_PROCESSING' };
    const res = await controller.triggerJob(dto);
    expect(service.executeJob).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ success: true, jobId: 'job-123' });
  });
});