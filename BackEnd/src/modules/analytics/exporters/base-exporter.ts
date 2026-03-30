import { Injectable } from '@nestjs/common';
import { AnalyticsReport, ReportFormat } from '../entities/analytics-report.entity';

export interface ExportOptions {
  format: ReportFormat;
  includeHeaders?: boolean;
  delimiter?: string;
  dateFormat?: string;
}

export interface ExportResult {
  data: string | Buffer;
  mimeType: string;
  fileName: string;
  size: number;
}

/**
 * Base Analytics Exporter
 * Provides common export functionality for different formats
 */
@Injectable()
export class BaseAnalyticsExporter {
  /**
   * Convert data to specified format
   */
  async export(data: any, options: ExportOptions): Promise<ExportResult> {
    switch (options.format) {
      case ReportFormat.JSON:
        return this.exportToJson(data, options);
      case ReportFormat.CSV:
        return this.exportToCsv(data, options);
      case ReportFormat.EXCEL:
        return this.exportToExcel(data, options);
      case ReportFormat.PDF:
        return this.exportToPdf(data, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export data to JSON format
   */
  private async exportToJson(data: any, options: ExportOptions): Promise<ExportResult> {
    const jsonData = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonData, 'utf-8');

    return {
      data: buffer,
      mimeType: 'application/json',
      fileName: `analytics-report-${Date.now()}.json`,
      size: buffer.length,
    };
  }

  /**
   * Export data to CSV format
   */
  private async exportToCsv(data: any, options: ExportOptions): Promise<ExportResult> {
    const delimiter = options.delimiter || ',';
    const includeHeaders = options.includeHeaders !== false;

    let csvContent = '';

    if (Array.isArray(data)) {
      // Handle array of objects
      if (data.length > 0 && includeHeaders) {
        const headers = Object.keys(data[0]);
        csvContent += headers.join(delimiter) + '\n';
      }

      for (const item of data) {
        const values = Object.values(item).map(value =>
          this.escapeCsvValue(value, delimiter)
        );
        csvContent += values.join(delimiter) + '\n';
      }
    } else if (typeof data === 'object') {
      // Handle single object - flatten it
      const flattened = this.flattenObject(data);

      if (includeHeaders) {
        const headers = Object.keys(flattened);
        csvContent += headers.join(delimiter) + '\n';
      }

      const values = Object.values(flattened).map(value =>
        this.escapeCsvValue(value, delimiter)
      );
      csvContent += values.join(delimiter) + '\n';
    }

    const buffer = Buffer.from(csvContent, 'utf-8');

    return {
      data: buffer,
      mimeType: 'text/csv',
      fileName: `analytics-report-${Date.now()}.csv`,
      size: buffer.length,
    };
  }

  /**
   * Export data to Excel format (simplified - returns CSV with Excel MIME type)
   */
  private async exportToExcel(data: any, options: ExportOptions): Promise<ExportResult> {
    // For now, export as CSV with Excel MIME type
    // In a real implementation, you'd use a library like exceljs
    const csvResult = await this.exportToCsv(data, options);

    return {
      ...csvResult,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: `analytics-report-${Date.now()}.xlsx`,
    };
  }

  /**
   * Export data to PDF format (placeholder)
   */
  private async exportToPdf(data: any, options: ExportOptions): Promise<ExportResult> {
    // In a real implementation, you'd use a library like puppeteer or pdfkit
    const htmlContent = this.generateHtmlReport(data);
    const buffer = Buffer.from(htmlContent, 'utf-8');

    return {
      data: buffer,
      mimeType: 'application/pdf',
      fileName: `analytics-report-${Date.now()}.pdf`,
      size: buffer.length,
    };
  }

  /**
   * Escape CSV values
   */
  private escapeCsvValue(value: any, delimiter: string): string {
    const stringValue = String(value || '');

    // If value contains delimiter, quotes, or newlines, wrap in quotes
    if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }

    return stringValue;
  }

  /**
   * Flatten nested object for CSV export
   */
  private flattenObject(obj: any, prefix: string = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Generate HTML report for PDF export
   */
  private generateHtmlReport(data: any): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>Analytics Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    `;

    if (Array.isArray(data)) {
      html += '<table>';
      if (data.length > 0) {
        html += '<tr>';
        Object.keys(data[0]).forEach(key => {
          html += `<th>${key}</th>`;
        });
        html += '</tr>';

        data.forEach(item => {
          html += '<tr>';
          Object.values(item).forEach(value => {
            html += `<td>${value}</td>`;
          });
          html += '</tr>';
        });
      }
      html += '</table>';
    } else if (typeof data === 'object') {
      html += '<table>';
      Object.entries(data).forEach(([key, value]) => {
        html += `<tr><th>${key}</th><td>${value}</td></tr>`;
      });
      html += '</table>';
    }

    html += '</body></html>';
    return html;
  }
}