import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MultiSigWallet } from './entities/multisig-wallet.entity';
import { MultiSigSigner } from './entities/multisig-signer.entity';
import { MultiSigTransaction } from './entities/multisig-transaction.entity';
import { MultiSigSignature } from './entities/multisig-signature.entity';
import { MultiSigWalletService } from './services/multisig-wallet.service';
import { MultiSigPayoutService } from './services/multisig-payout.service';
import { Payout } from '../payouts/entities/payout.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MultiSigWallet,
      MultiSigSigner,
      MultiSigTransaction,
      MultiSigSignature,
      Payout,
    ]),
  ],
  providers: [MultiSigWalletService, MultiSigPayoutService],
  exports: [MultiSigWalletService, MultiSigPayoutService],
})
export class MultiSigModule {}
