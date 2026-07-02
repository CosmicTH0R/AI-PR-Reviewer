import crypto from 'crypto';
import { WebhookVerificationError } from '../types';

/**
 * Verifies the GitHub webhook signature using HMAC-SHA256.
 *
 * GitHub signs every webhook payload with the secret you configure and
 * sends the signature in the `x-hub-signature-256` header.
 * We must verify this before processing ANY payload.
 *
 * @param rawBody - The raw request body Buffer (must not be parsed before verification)
 * @param signatureHeader - The value of the `x-hub-signature-256` header
 * @param secret - The webhook secret configured in your GitHub App settings
 * @throws {WebhookVerificationError} if signature is missing, malformed, or doesn't match
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): void {
  if (!signatureHeader) {
    throw new WebhookVerificationError('Missing x-hub-signature-256 header');
  }

  if (!signatureHeader.startsWith('sha256=')) {
    throw new WebhookVerificationError(
      'Invalid signature format: must start with sha256=',
    );
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  // Use timingSafeEqual to prevent timing attacks
  const sigBuffer = Buffer.from(signatureHeader, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length) {
    throw new WebhookVerificationError('Webhook signature mismatch');
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new WebhookVerificationError('Webhook signature mismatch');
  }
}
