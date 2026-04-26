import 'reflect-metadata';
import { DataSource, DataSourceOptions, Logger } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AppLoggerService } from '../common/logger/logger.service';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

class TypeORMQueryLogger implements Logger {
  private readonly logger = new AppLoggerService();
  private readonly slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'); // ms
  private readonly enableQueryLogging = process.env.NODE_ENV === 'development' || process.env.DB_QUERY_LOGGING === 'true';

  logQuery(query: string, parameters?: any[]): void {
    if (!this.enableQueryLogging) return;
    
    this.logger.debug('Database Query', 'Database', {
      query: query.trim(),
      parameters,
      type: 'query'
    });
  }

  logQueryError(error: string, query: string, parameters?: any[]): void {
    this.logger.error('Database Query Error', error, 'Database', {
      query: query.trim(),
      parameters,
      type: 'query_error'
    });
  }

  logQuerySlow(time: number, query: string, parameters?: any[]): void {
    this.logger.warn('Slow Query Detected', 'Database', {
      query: query.trim(),
      parameters,
      executionTime: time,
      threshold: this.slowQueryThreshold,
      type: 'slow_query'
    });
  }

  logSchemaBuild(message: string): void {
    this.logger.debug(message, 'Database', { type: 'schema_build' });
  }

  logMigration(message: string): void {
    this.logger.info(message, 'Database', { type: 'migration' });
  }

  log(level: 'log' | 'info' | 'warn', message: string): void {
    switch (level) {
      case 'log':
        this.logger.debug(message, 'Database');
        break;
      case 'info':
        this.logger.info(message, 'Database');
        break;
      case 'warn':
        this.logger.warn(message, 'Database');
        break;
    }
  }
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, '..', '**', 'entities', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' || process.env.DB_QUERY_LOGGING === 'true',
  logger: new TypeORMQueryLogger(),
  maxQueryExecutionTime: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
