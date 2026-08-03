import { Test, TestingModule } from '@nestjs/testing';
import { QueryMonitoringController } from './query-monitoring.controller';
import { QueryMonitoringService } from './query-monitoring.service';

describe('QueryMonitoringController', () => {
  let controller: QueryMonitoringController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueryMonitoringController],
      providers: [
        {
          provide: QueryMonitoringService,
          useValue: {
            getMetrics: jest.fn().mockResolvedValue({ slowQueriesCount: 2 }),
          },
        },
      ],
    }).compile();

    controller = module.get<QueryMonitoringController>(QueryMonitoringController);
  });

  it('should return query performance metrics', async () => {
    const metrics = await controller.getMetrics();
    expect(metrics).toEqual({ slowQueriesCount: 2 });
  });
});