import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair, Operation, TransactionBuilder } from 'stellar-sdk';
import * as StellarSdk from 'stellar-sdk';
import { StellarService } from './stellar.service';

/**
 * Handles native XLM (or other asset) payment transfers via Stellar Horizon.
 *
 * Uses the configured admin keypair as the source account. Intended for
 * payout job execution where the platform wallet disburses funds to a
 * recipient.
 *
 * Dependencies on the Horizon server and network passphrase are provided
 * by the shared {@link StellarService} infrastructure service.
 */
@Injectable()
export class StellarPaymentService {
  private readonly logger = new Logger(StellarPaymentService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly stellar: StellarService,
  ) {}

  /**
   * Send a native XLM (or other asset) payment via Stellar Horizon.
   *
   * Uses the configured admin keypair (`SOROBAN_SECRET_KEY` /
   * `STELLAR_ADMIN_SECRET`) as the source account.  Intended for payout
   * job execution where the platform wallet disburses funds to a recipient.
   */
  async sendPayment(
    recipientAddress: string,
    amount: number,
    asset: string = 'XLM',
  ): Promise<{ transactionHash: string; ledger: number }> {
    const secretKey =
      this.configService.get<string>('SOROBAN_SECRET_KEY') ||
      this.configService.get<string>('STELLAR_ADMIN_SECRET');

    if (!secretKey) {
      throw new Error('No Stellar secret key configured for payments');
    }

    const sourceKeypair = Keypair.fromSecret(secretKey);
    const horizon = this.stellar.getHorizon();
    const sourceAccount = await horizon.loadAccount(sourceKeypair.publicKey());

    const paymentAsset =
      asset === 'XLM'
        ? StellarSdk.Asset.native()
        : new StellarSdk.Asset(asset, sourceKeypair.publicKey());

    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: this.stellar.getNetworkPassphrase(),
    })
      .addOperation(
        Operation.payment({
          destination: recipientAddress,
          asset: paymentAsset,
          amount: amount.toFixed(7),
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(sourceKeypair);

    const result = await horizon.submitTransaction(tx);

    return {
      transactionHash: result.hash,
      ledger: (result as any).ledger ?? 0,
    };
  }
}
