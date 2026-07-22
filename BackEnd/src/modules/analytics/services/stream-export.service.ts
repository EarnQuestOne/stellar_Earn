import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * Service for handling streaming exports of large datasets
 * Supports CSV and JSON streaming formats for optimal memory usage
 */
@Injectable()
export class StreamExportService {
  /**
   * Stream data as CSV format
   * @param response Express response object
   * @param data Array or Iterable/AsyncIterable of objects to export
   * @param filename Name of the file to download
   * @param columns Array of column definitions
   */
  async streamAsCSV(
    response: Response,
    data: any[] | AsyncIterable<any> | Iterable<any>,
    filename: string,
    columns: { key: string; header: string }[],
  ): Promise<void> {
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.csv"`,
    );

    // Write BOM for proper UTF-8 encoding in Excel
    response.write('\uFEFF');

    // Write CSV header
    const headers = columns.map((col) => this.escapeCsvField(col.header));
    response.write(headers.join(',') + '\n');

    // Stream data rows
    for await (const row of data) {
      const values = columns.map((col) =>
        this.escapeCsvField(String(row[col.key] ?? '')),
      );
      response.write(values.join(',') + '\n');
    }

    response.end();
  }

  /**
   * Stream data as JSON Lines format (one JSON object per line)
   * More memory efficient than single JSON array for large datasets
   * @param response Express response object
   * @param data Array or Iterable/AsyncIterable of objects to export
   * @param filename Name of the file to download
   */
  async streamAsJSONLines(
    response: Response,
    data: any[] | AsyncIterable<any> | Iterable<any>,
    filename: string,
  ): Promise<void> {
    response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.jsonl"`,
    );

    for await (const item of data) {
      response.write(JSON.stringify(item) + '\n');
    }

    response.end();
  }

  /**
   * Stream data as formatted JSON
   * @param response Express response object
   * @param data Object or array or Iterable/AsyncIterable to export
   * @param filename Name of the file to download
   */
  async streamAsJSON(
    response: Response,
    data: any,
    filename: string,
  ): Promise<void> {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.json"`,
    );

    if (
      data &&
      (typeof data[Symbol.asyncIterator] === 'function' ||
        typeof data[Symbol.iterator] === 'function') &&
      !Array.isArray(data)
    ) {
      response.write('[\n');
      let first = true;
      for await (const item of data) {
        if (!first) {
          response.write(',\n');
        }
        response.write(JSON.stringify(item, null, 2));
        first = false;
      }
      response.write('\n]');
    } else {
      response.write(JSON.stringify(data, null, 2));
    }
    response.end();
  }

  /**
   * Stream data with custom transform function
   * Allows for memory-efficient processing of large datasets
   * @param response Express response object
   * @param data Array of objects
   * @param transformFn Function to transform each row
   * @param filename Name of the file to download
   * @param contentType Content type for the response
   */
  streamWithTransform(
    response: Response,
    data: any[],
    transformFn: (item: any) => string,
    filename: string,
    contentType: string,
  ): void {
    response.setHeader('Content-Type', `${contentType}; charset=utf-8`);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    for (const item of data) {
      response.write(transformFn(item));
    }

    response.end();
  }

  /**
   * Escape CSV field to handle quotes, commas, and newlines
   * @param field Field value to escape
   * @returns Escaped field
   */
  private escapeCsvField(field: string): string {
    if (
      field.includes(',') ||
      field.includes('"') ||
      field.includes('\n') ||
      field.includes('\r')
    ) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Transform large array into paginated chunks for streaming
   * Useful for processing data in batches
   * @param data Array of items
   * @param chunkSize Size of each chunk
   */
  *chunkedIterator(data: any[], chunkSize: number = 1000) {
    for (let i = 0; i < data.length; i += chunkSize) {
      yield data.slice(i, i + chunkSize);
    }
  }

  /**
   * Get pagination info for export
   * @param total Total number of items
   * @param pageSize Page size
   * @returns Pagination metadata
   */
  getPaginationInfo(total: number, pageSize: number) {
    return {
      total,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Memory-efficient async generator that yields items in paginated chunks.
   * Prevents large tables from overwhelming system memory.
   */
  async *getQueryIterator<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    chunkSize: number = 1000,
  ): AsyncGenerator<T, void, unknown> {
    let offset = 0;
    while (true) {
      const chunk = await queryBuilder.skip(offset).take(chunkSize).getMany();

      if (chunk.length === 0) {
        break;
      }

      for (const item of chunk) {
        yield item;
      }

      if (chunk.length < chunkSize) {
        break;
      }

      offset += chunkSize;
    }
  }
}
