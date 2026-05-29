import crypto from 'crypto';

/**
 * Generates a secure random numeric OTP of the specified length.
 * Uses crypto.randomInt for cryptographic security.
 */
export const generateSecureOtp = (length: number): string => {
  if (length <= 0) return '';

  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;

  return crypto.randomInt(min, max + 1).toString();
};

/**
 * Generates a secure random token of the specified byte length.
 */
export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hashes a token using SHA-256.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
