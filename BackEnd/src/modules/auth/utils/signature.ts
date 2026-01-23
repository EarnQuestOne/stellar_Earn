import { Keypair } from 'stellar-sdk';
import { UnauthorizedException } from '@nestjs/common';

/**
 * Generate a challenge message for wallet signature verification
 * @param stellarAddress The user's Stellar public key
 * @param timestamp Unix timestamp in milliseconds
 * @returns Challenge message to be signed
 */
export function generateChallengeMessage(
  stellarAddress: string,
  timestamp: number,
): string {
  return `StellarEarn Authentication\n\nSign this message to authenticate with your Stellar wallet.\n\nAddress: ${stellarAddress}\nTimestamp: ${timestamp}\n\nThis signature will not trigger any blockchain transaction or cost any fees.`;
}

/**
 * Verify a Stellar signature against a message
 * @param stellarAddress The signer's public key
 * @param signature Base64-encoded signature
 * @param message The original message that was signed
 * @returns true if signature is valid
 * @throws UnauthorizedException if signature is invalid
 */
export function verifyStellarSignature(
  stellarAddress: string,
  signature: string,
  message: string,
): boolean {
  try {
    const messageBuffer = Buffer.from(message, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'base64');
    const keypair = Keypair.fromPublicKey(stellarAddress);
    const isValid = keypair.verify(messageBuffer, signatureBuffer);

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    throw new UnauthorizedException('Signature verification failed');
  }
}

/**
 * Check if a challenge timestamp has expired
 * @param timestamp Unix timestamp in milliseconds
 * @param expirationMinutes Number of minutes until expiration
 * @returns true if challenge has expired
 */
export function isChallengeExpired(
  timestamp: number,
  expirationMinutes: number,
): boolean {
  const now = Date.now();
  const expirationTime = timestamp + expirationMinutes * 60 * 1000;
  return now > expirationTime;
}

/**
 * Parse timestamp from challenge message
 * @param challenge The challenge message
 * @returns Unix timestamp in milliseconds
 */
export function extractTimestampFromChallenge(challenge: string): number {
  const match = challenge.match(/Timestamp: (\d+)/);
  if (!match) {
    throw new UnauthorizedException('Invalid challenge format');
  }
  return parseInt(match[1], 10);
}
