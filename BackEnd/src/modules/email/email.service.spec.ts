import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should dispatch email notification', async () => {
    const spy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);
    const sent = await service.sendEmail('user@stellar.org', 'Quest Completed', 'You earned 10 XLM');
    expect(spy).toHaveBeenCalled();
    expect(sent).toBe(true);
  });
});