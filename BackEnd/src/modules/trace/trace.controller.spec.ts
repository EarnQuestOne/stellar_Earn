import { Test, TestingModule } from '@nestjs/testing';
import { TraceController } from './trace.controller';
import { TraceService } from './trace.service';

describe('TraceController', () => {
  let controller: TraceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TraceController],
      providers: [
        {
          provide: TraceService,
          useValue: {
            getTraceDetails: jest.fn().mockResolvedValue({ traceId: 'tr-999' }),
          },
        },
      ],
    }).compile();

    controller = module.get<TraceController>(TraceController);
  });

  it('should fetch trace details', async () => {
    const details = await controller.getTrace('tr-999');
    expect(details).toEqual({ traceId: 'tr-999' });
  });
});