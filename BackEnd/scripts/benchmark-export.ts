import { StreamExportService } from '../src/modules/analytics/services/stream-export.service';
import { Response } from 'express';

async function benchmark() {
  console.log('--- Benchmarking StreamExportService ---');
  const service = new StreamExportService();

  // Create a large dataset (e.g. 500,000 items)
  const ITEM_COUNT = 500_000;
  
  async function* generateData() {
    for (let i = 0; i < ITEM_COUNT; i++) {
      yield {
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        score: Math.random() * 100,
        createdAt: new Date().toISOString(),
      };
    }
  }

  // Mock response that simulates network backpressure
  let writtenBytes = 0;
  const mockResponse = {
    setHeader: () => {},
    write: (chunk: any) => {
      writtenBytes += chunk.length;
      // Simulate that the buffer occasionally fills up
      if (Math.random() < 0.05) {
        return false;
      }
      return true;
    },
    once: (event: string, callback: () => void) => {
      if (event === 'drain') {
        // Simulate drain event firing after a short delay
        setImmediate(callback);
      }
    },
    end: () => {},
  } as unknown as Response;

  const initialMemory = process.memoryUsage().heapUsed;
  const startTime = Date.now();

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'score', header: 'Score' },
    { key: 'createdAt', header: 'Created At' },
  ];

  await service.streamAsCSV(mockResponse, generateData(), 'benchmark', columns);

  const endTime = Date.now();
  const finalMemory = process.memoryUsage().heapUsed;

  console.log(`Exported ${ITEM_COUNT.toLocaleString()} rows.`);
  console.log(`Total time: ${(endTime - startTime) / 1000}s`);
  console.log(`Bytes written: ${(writtenBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Initial Memory (Heap Used): ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Final Memory (Heap Used): ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Memory Difference: ${((finalMemory - initialMemory) / 1024 / 1024).toFixed(2)} MB`);
  console.log('--- Benchmark Complete ---');
}

benchmark().catch(console.error);
