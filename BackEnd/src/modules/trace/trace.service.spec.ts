import { Test, TestingModule } from '@nestjs/testing';
import { TraceService } from './trace.service';

describe('TraceService', () => {
  let service: TraceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TraceService],
    }).compile();

    service = module.get<TraceService>(TraceService);
  });

  it('should generate or extract trace ID', () => {
    const traceId = service.getOrCreateTraceId('incoming-id');
    expect(traceId).toBe('incoming-id');
  });
});