import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('WebhookSignature');

export interface SignatureVerificationResult {
  valid: boolean;
  reason?: string;
}

export const WEBHOOK_MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

export function verifyWebhookSignatureWithTimestamp(
  payload: string | object,
  signature: string,
  secret: string,
  provider: string,
  timestampHeader?: string,
): SignatureVerificationResult {
  if (!timestampHeader) {
    return { valid: false, reason: 'Missing webhook timestamp' };
  }

  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    return { valid: false, reason: 'Invalid timestamp format' };
  }

  const age = Date.now() - timestamp * 1000;
  if (Math.abs(age) > WEBHOOK_MAX_TIMESTAMP_AGE_MS) {
    return { valid: false, reason: 'Webhook timestamp expired or invalid' };
  }

  const isValid = verifyWebhookSignature(payload, signature, secret, provider);
  if (!isValid) {
    return { valid: false, reason: 'Invalid webhook signature' };
  }

  return { valid: true };
}

export function verifyWebhookSignature(
  payload: string | object,
  signature: string,
  secret: string,
  provider: string,
): boolean {
  try {
    const payloadString =
      typeof payload === 'string' ? payload : JSON.stringify(payload);

    switch (provider.toLowerCase()) {
      case 'github':
        return verifyGithubSignature(payloadString, signature, secret);
      case 'api':
        return verifyApiSignature(payloadString, signature, secret);
      default: {
        logger.warn(
          `Unsupported webhook provider: ${provider}, attempting generic HMAC verification`,
        );
        return verifyGenericSignature(payloadString, signature, secret);
      }
    }
  } catch (error) {
    logger.error(`Error verifying webhook signature: ${error.message}`);
    return false;
  }
}

/**
 * Verifies GitHub webhook signatures using HMAC SHA256
 * GitHub sends signature as: sha256=hash
 */
function verifyGithubSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    // GitHub signature format: sha256=actual_hash
    if (!signature.startsWith('sha256=')) {
      logger.warn('Invalid GitHub signature format');
      return false;
    }

    const expectedSignature = signature.substring(7); // Remove 'sha256=' prefix
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const calculatedSignature = hmac.digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );

    if (!isValid) {
      logger.warn('GitHub webhook signature verification failed');
    }

    return isValid;
  } catch (error) {
    logger.error(`Error in GitHub signature verification: ${error.message}`);
    return false;
  }
}

/**
 * Verifies API webhook signatures using HMAC SHA256
 * Custom API format: hmac-sha256=hash
 */
function verifyApiSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    // Custom API signature format: hmac-sha256=actual_hash
    if (!signature.startsWith('hmac-sha256=')) {
      logger.warn('Invalid API signature format');
      return false;
    }

    const expectedSignature = signature.substring(12); // Remove 'hmac-sha256=' prefix
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const calculatedSignature = hmac.digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );

    if (!isValid) {
      logger.warn('API webhook signature verification failed');
    }

    return isValid;
  } catch (error) {
    logger.error(`Error in API signature verification: ${error.message}`);
    return false;
  }
}

function verifyGenericSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    let expectedSignature = signature;
    if (signature.startsWith('sha256=')) {
      expectedSignature = signature.substring(7);
    } else if (signature.startsWith('hmac-sha256=')) {
      expectedSignature = signature.substring(12);
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const calculatedSignature = hmac.digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );

    if (!isValid) {
      logger.warn('Generic webhook signature verification failed');
    }

    return isValid;
  } catch (error) {
    logger.error(`Error in generic signature verification: ${error.message}`);
    return false;
  }
}

/**
 * Generates a webhook signature for testing purposes
 */
export function generateWebhookSignature(
  payload: string | object,
  secret: string,
  provider: string = 'github',
): string {
  const payloadString =
    typeof payload === 'string' ? payload : JSON.stringify(payload);

  switch (provider.toLowerCase()) {
    case 'github': {
      const githubHmac = crypto.createHmac('sha256', secret);
      githubHmac.update(payloadString, 'utf8');
      return `sha256=${githubHmac.digest('hex')}`;
    }

    case 'api': {
      const apiHmac = crypto.createHmac('sha256', secret);
      apiHmac.update(payloadString, 'utf8');
      return `hmac-sha256=${apiHmac.digest('hex')}`;
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Validates webhook secret format
 */
export function validateWebhookSecret(secret: string): boolean {
  return typeof secret === 'string' && secret.length >= 16;
}
