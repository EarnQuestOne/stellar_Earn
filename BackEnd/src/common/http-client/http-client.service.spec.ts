import { Test, TestingModule } from '@nestjs/testing';
import { PooledHttpClientService, TIMEOUT_BUDGETS } from './http-client.service';
import * as http from 'http';
import * as https from 'https';

describe('PooledHttpClientService', () => {
  let service: PooledHttpClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PooledHttpClientService],
    }).compile();

    service = module.get<PooledHttpClientService>(PooledHttpClientService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('returns an axios instance for the short budget', () => {
      const client = service.create('short');
      expect(client).toBeDefined();
      expect(client.defaults.timeout).toBe(TIMEOUT_BUDGETS.short);
    });

    it('returns an axios instance for the medium budget', () => {
      const client = service.create('medium');
      expect(client).toBeDefined();
      expect(client.defaults.timeout).toBe(TIMEOUT_BUDGETS.medium);
    });

    it('returns an axios instance for the long budget', () => {
      const client = service.create('long');
      expect(client).toBeDefined();
      expect(client.defaults.timeout).toBe(TIMEOUT_BUDGETS.long);
    });

    it('returns the same instance on repeated calls for the same budget', () => {
      expect(service.create('short')).toBe(service.create('short'));
      expect(service.create('medium')).toBe(service.create('medium'));
      expect(service.create('long')).toBe(service.create('long'));
    });

    it('returns distinct instances for different budgets', () => {
      expect(service.create('short')).not.toBe(service.create('medium'));
      expect(service.create('medium')).not.toBe(service.create('long'));
    });

    it('uses a keep-alive http agent', () => {
      const client = service.create('short');
      expect(client.defaults.httpAgent).toBeInstanceOf(http.Agent);
      expect((client.defaults.httpAgent as http.Agent).keepAlive).toBe(true);
    });

    it('uses a keep-alive https agent', () => {
      const client = service.create('short');
      expect(client.defaults.httpsAgent).toBeInstanceOf(https.Agent);
      expect((client.defaults.httpsAgent as https.Agent).keepAlive).toBe(true);
    });

    it('shares the same agents across all budget instances', () => {
      const short = service.create('short');
      const medium = service.create('medium');
      const long = service.create('long');

      expect(short.defaults.httpAgent).toBe(medium.defaults.httpAgent);
      expect(medium.defaults.httpAgent).toBe(long.defaults.httpAgent);
      expect(short.defaults.httpsAgent).toBe(medium.defaults.httpsAgent);
    });
  });

  describe('TIMEOUT_BUDGETS', () => {
    it('short is less than medium', () => {
      expect(TIMEOUT_BUDGETS.short).toBeLessThan(TIMEOUT_BUDGETS.medium);
    });

    it('medium is less than long', () => {
      expect(TIMEOUT_BUDGETS.medium).toBeLessThan(TIMEOUT_BUDGETS.long);
    });
  });

  describe('onModuleDestroy', () => {
    it('destroys the underlying agents', () => {
      const short = service.create('short');
      const httpAgent = short.defaults.httpAgent as http.Agent;
      const httpsAgent = short.defaults.httpsAgent as https.Agent;

      const destroyHttp = jest.spyOn(httpAgent, 'destroy');
      const destroyHttps = jest.spyOn(httpsAgent, 'destroy');

      service.onModuleDestroy();

      expect(destroyHttp).toHaveBeenCalledTimes(1);
      expect(destroyHttps).toHaveBeenCalledTimes(1);
    });
  });
});
