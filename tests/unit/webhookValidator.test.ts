import crypto from 'crypto';
import { verifyWebhookSignature } from '../../src/validators/webhookValidator';
import { WebhookVerificationError } from '../../src/types';

const SECRET = 'test-webhook-secret';

function makeSignature(body: Buffer, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('verifyWebhookSignature', () => {
  const body = Buffer.from(JSON.stringify({ action: 'opened' }));
  const validSig = makeSignature(body, SECRET);

  it('should pass with a valid signature', () => {
    expect(() => verifyWebhookSignature(body, validSig, SECRET)).not.toThrow();
  });

  it('should throw WebhookVerificationError when signature header is missing', () => {
    expect(() => verifyWebhookSignature(body, undefined, SECRET)).toThrow(
      WebhookVerificationError,
    );
    expect(() => verifyWebhookSignature(body, undefined, SECRET)).toThrow(
      'Missing x-hub-signature-256 header',
    );
  });

  it('should throw WebhookVerificationError when signature has wrong prefix', () => {
    const badSig = validSig.replace('sha256=', 'sha1=');
    expect(() => verifyWebhookSignature(body, badSig, SECRET)).toThrow(
      WebhookVerificationError,
    );
    expect(() => verifyWebhookSignature(body, badSig, SECRET)).toThrow(
      'Invalid signature format',
    );
  });

  it('should throw WebhookVerificationError when body has been tampered with', () => {
    const tamperedBody = Buffer.from(JSON.stringify({ action: 'closed' })); // different body
    expect(() => verifyWebhookSignature(tamperedBody, validSig, SECRET)).toThrow(
      WebhookVerificationError,
    );
    expect(() => verifyWebhookSignature(tamperedBody, validSig, SECRET)).toThrow(
      'Webhook signature mismatch',
    );
  });

  it('should throw WebhookVerificationError when secret is wrong', () => {
    const wrongSecretSig = makeSignature(body, 'wrong-secret');
    expect(() => verifyWebhookSignature(body, wrongSecretSig, SECRET)).toThrow(
      WebhookVerificationError,
    );
  });

  it('should throw WebhookVerificationError when signature is an empty string', () => {
    expect(() => verifyWebhookSignature(body, '', SECRET)).toThrow(
      WebhookVerificationError,
    );
  });

  it('should handle different length signatures (timing-safe comparison)', () => {
    // Ensures we don't get an error from timingSafeEqual when lengths differ
    const shortSig = 'sha256=abc';
    expect(() => verifyWebhookSignature(body, shortSig, SECRET)).toThrow(
      WebhookVerificationError,
    );
  });
});
