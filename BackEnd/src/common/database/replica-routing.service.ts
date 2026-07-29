import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

export interface ReplicaDataSourceConfig {
  host?: string;
  port?: number;
  name?: string;
  user?: string;
  password?: string;
}

export function isReadQuery(query: string): boolean {
  return /^\s*SELECT\b/i.test(query.trim());
}

@Injectable()
export class ReplicaRoutingService implements OnModuleDestroy {
  private readonly logger = new Logger(ReplicaRoutingService.name);
  private replicaDataSource: DataSource | null = null;
  private initialized = false;

  constructor(private readonly primaryDataSource: DataSource) {}

  async initialize(config?: ReplicaDataSourceConfig): Promise<void> {
    if (this.initialized) return;

    const host = config?.host || process.env.DB_REPLICA_HOST;
    const port =
      config?.port || parseInt(process.env.DB_REPLICA_PORT || '5432', 10);
    const name = config?.name || process.env.DB_REPLICA_NAME;
    const user = config?.user || process.env.DB_REPLICA_USER;
    const password = config?.password || process.env.DB_REPLICA_PASSWORD;

    if (!host || !name || !user || !password) {
      this.logger.log(
        'No read replica configured — all queries will use primary',
      );
      this.initialized = true;
      return;
    }

    try {
      this.replicaDataSource = new DataSource({
        type: 'postgres',
        host,
        port,
        database: name,
        username: user,
        password,
        entities: this.primaryDataSource.entityMetadatas.map(
          (meta) => meta.target,
        ),
        synchronize: false,
        logging:
          process.env.NODE_ENV === 'development' ||
          process.env.DB_QUERY_LOGGING === 'true',
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      });

      await this.replicaDataSource.initialize();
      this.logger.log(`Read replica connected: ${host}:${port}/${name}`);
    } catch (error) {
      this.logger.error(
        'Failed to connect to read replica — falling back to primary',
        error instanceof Error ? error.stack : String(error),
      );
      this.replicaDataSource = null;
    }

    this.initialized = true;
  }

  isReplicaAvailable(): boolean {
    return (
      this.replicaDataSource !== null && this.replicaDataSource.isInitialized
    );
  }

  getReplicaRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Repository<T> {
    if (!this.isReplicaAvailable()) {
      return this.primaryDataSource.getRepository(entity);
    }
    return this.replicaDataSource!.getRepository(entity);
  }

  getPrimaryRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Repository<T> {
    return this.primaryDataSource.getRepository(entity);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.replicaDataSource?.isInitialized) {
      await this.replicaDataSource.destroy();
      this.logger.log('Read replica connection closed');
    }
  }
}
