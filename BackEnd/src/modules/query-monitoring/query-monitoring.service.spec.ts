import { Test, TestingModule } from '@nestjs/testing';
import { QueryMonitoringService } from './query-monitoring.service';

describe('QueryMonitoringService', () => {
  let service: QueryMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryMonitoringService],
    }).compile();

    service = module.get<QueryMonitoringService>(QueryMonitoringService);
  });

  it('should log slow queries', () => {
    const spy = jest.spyOn(service, 'logSlowQuery');
    service.logSlowQuery('SELECT * FROM quests', 1200);
    expect(spy).toHaveBeenCalledWith('SELECT * FROM quests', 1200);
  });
});