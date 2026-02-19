import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.dataSource.query('SELECT 1');
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }
}
