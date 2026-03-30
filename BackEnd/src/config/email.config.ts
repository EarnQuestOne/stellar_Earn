import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  provider: process.env.EMAIL_PROVIDER || 'sendgrid',
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    webhookVerificationKey: process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY,
  },
  from: {
    email: process.env.EMAIL_FROM_ADDRESS || 'noreply@stellarearn.com',
    name: process.env.EMAIL_FROM_NAME || 'Stellar Earn',
  },
  replyTo: process.env.EMAIL_REPLY_TO || 'support@stellarearn.com',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  unsubscribeUrl: process.env.UNSUBSCRIBE_URL || 'http://localhost:3000/unsubscribe',
  queue: {
    maxRetries: parseInt(process.env.EMAIL_QUEUE_MAX_RETRIES || '5', 10),
    retryDelay: parseInt(process.env.EMAIL_QUEUE_RETRY_DELAY || '5000', 10),
    rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT || '100', 10),
  },
}));
