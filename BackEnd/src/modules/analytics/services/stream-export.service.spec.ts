import { Test, TestingModule } from '@nestjs/testing';
import { StreamExportService } from './stream-export.service';
import { Response } from 'express';

describe('StreamExportService', () => {
  let service: StreamExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamExportService],
    }).compile();

    service = module.get<StreamExportService>(StreamExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('escapeCsvField', () => {
    it('should escape fields with commas, quotes, and newlines', () => {
      // Accessing private method for testing using bracket notation
      const escapeFn = (service as any).escapeCsvField.bind(service);
      expect(escapeFn('hello')).toBe('hello');
      expect(escapeFn('hello, world')).toBe('"hello, world"');
      expect(escapeFn('hello "world"')).toBe('"hello ""world"""');
      expect(escapeFn('hello\nworld')).toBe('"hello\nworld"');
    });
  });

  describe('streamAsCSV', () => {
    it('should set headers and stream CSV data', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      const mockData = [
        { id: '1', title: 'Quest 1' },
        { id: '2', title: 'Quest 2, Special' },
      ];

      const columns = [
        { key: 'id', header: 'ID' },
        { key: 'title', header: 'Title' },
      ];

      await service.streamAsCSV(mockResponse, mockData, 'quests', columns);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="quests.csv"',
      );
      expect(mockResponse.write).toHaveBeenCalledWith('\uFEFF'); // BOM
      expect(mockResponse.write).toHaveBeenCalledWith('ID,Title\n');
      expect(mockResponse.write).toHaveBeenCalledWith('1,Quest 1\n');
      expect(mockResponse.write).toHaveBeenCalledWith('2,"Quest 2, Special"\n');
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('streamAsJSONLines', () => {
    it('should set headers and stream NDJSON/JSONL data', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      const mockData = [
        { id: '1', title: 'Quest 1' },
        { id: '2', title: 'Quest 2' },
      ];

      await service.streamAsJSONLines(mockResponse, mockData, 'quests');

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/x-ndjson; charset=utf-8',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="quests.jsonl"',
      );
      expect(mockResponse.write).toHaveBeenCalledWith(
        '{"id":"1","title":"Quest 1"}\n',
      );
      expect(mockResponse.write).toHaveBeenCalledWith(
        '{"id":"2","title":"Quest 2"}\n',
      );
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('streamAsJSON', () => {
    it('should stream standard arrays', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      const mockData = [{ id: '1' }];

      await service.streamAsJSON(mockResponse, mockData, 'quests');

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json; charset=utf-8',
      );
      expect(mockResponse.write).toHaveBeenCalledWith(
        JSON.stringify(mockData, null, 2),
      );
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should stream AsyncIterables as JSON array', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      async function* mockGenerator() {
        yield { id: '1' };
        yield { id: '2' };
      }

      await service.streamAsJSON(mockResponse, mockGenerator(), 'quests');

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json; charset=utf-8',
      );
      expect(mockResponse.write).toHaveBeenCalledWith('[\n');
      expect(mockResponse.write).toHaveBeenCalledWith(
        JSON.stringify({ id: '1' }, null, 2),
      );
      expect(mockResponse.write).toHaveBeenCalledWith(',\n');
      expect(mockResponse.write).toHaveBeenCalledWith(
        JSON.stringify({ id: '2' }, null, 2),
      );
      expect(mockResponse.write).toHaveBeenCalledWith('\n]');
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
