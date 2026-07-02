import { Global, Module } from '@nestjs/common';
import { PooledHttpClientService } from './http-client.service';

@Global()
@Module({
  providers: [PooledHttpClientService],
  exports: [PooledHttpClientService],
})
export class HttpClientModule {}
