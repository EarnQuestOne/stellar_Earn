import { DynamicModule, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReplicaRoutingService } from './replica-routing.service';

@Module({})
export class ReplicaRoutingModule {
  static forRoot(): DynamicModule {
    return {
      module: ReplicaRoutingModule,
      providers: [
        {
          provide: ReplicaRoutingService,
          useFactory: async (dataSource: DataSource) => {
            const service = new ReplicaRoutingService(dataSource);
            await service.initialize();
            return service;
          },
          inject: [DataSource],
        },
      ],
      exports: [ReplicaRoutingService],
      global: true,
    };
  }
}
