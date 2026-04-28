import { Injectable, Logger, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private horizonServer: StellarSdk.Horizon.Server;
  private networkPassphrase: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeStellarComponents();
  }

  private initializeStellarComponents() {
    const horizonUrl = this.configService.get<string>('STELLAR_HORIZON_URL') || 'https://horizon-testnet.stellar.org';
    const network = this.configService.get<string>('STELLAR_NETWORK');

    this.horizonServer = new StellarSdk.Horizon.Server(horizonUrl);
    this.networkPassphrase = network === 'PUBLIC' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET;
    
    this.logger.log(`Stellar Service initialized on ${network}`);
  }

  async signAndSubmit(transaction: StellarSdk.Transaction): Promise<any> {
    const secretKey = this.configService.get<string>('STELLAR_ADMIN_SECRET');

    if (!secretKey) {
      throw new InternalServerErrorException('Stellar admin secret is not configured in .env');
    }

    try {
      const signer = StellarSdk.Keypair.fromSecret(secretKey);
      transaction.sign(signer);
      
      return await this.horizonServer.submitTransaction(transaction);
    } catch (error) {
      this.logger.error(`Signing or submission failed: ${error.message}`);
      throw new InternalServerErrorException('Transaction signing security failure');
    }
  }

  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }
}