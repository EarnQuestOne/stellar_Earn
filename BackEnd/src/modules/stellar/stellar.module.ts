import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StellarService } from './stellar.service';
import { MultiSigModule } from './multisig/multisig.module';
import stellarConfig from '../../config/stellar.config';

@Module({
  imports: [ConfigModule.forFeature(stellarConfig), MultiSigModule],
  providers: [StellarService],
  exports: [StellarService, MultiSigModule],
})
export class StellarModule {}

