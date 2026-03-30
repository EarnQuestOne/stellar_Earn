import { IsString, IsNumber, IsOptional, Min, Max, IsEnum } from 'class-validator';
import { SignerRole } from '../entities/multisig-signer.entity';

export class CreateMultiSigWalletDto {
  @IsString()
  organizationId: string;

  @IsString()
  walletAddress: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  threshold: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  totalSigners: number;
}

export class AddSignerDto {
  @IsString()
  multiSigWalletId: string;

  @IsString()
  signerAddress: string;

  @IsString()
  @IsOptional()
  signerName?: string;

  @IsEnum(SignerRole)
  @IsOptional()
  role?: SignerRole;
}

export class UpdateThresholdDto {
  @IsString()
  multiSigWalletId: string;

  @IsNumber()
  @Min(1)
  threshold: number;
}

export class CreateMultiSigTransactionDto {
  @IsString()
  multiSigWalletId: string;

  @IsString()
  destinationAddress: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  asset?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  transactionPayload?: string;
}

export class ApproveTransactionDto {
  @IsString()
  multiSigTransactionId: string;

  @IsString()
  signerAddress: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class RejectTransactionDto {
  @IsString()
  multiSigTransactionId: string;

  @IsString()
  signerAddress: string;

  @IsString()
  rejectionReason: string;
}
