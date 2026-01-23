import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StellarService } from './stellar.service';

@Module({
  imports: [ConfigModule],
  providers: [StellarService],
  exports: [StellarService],
})
export class StellarModule {}
