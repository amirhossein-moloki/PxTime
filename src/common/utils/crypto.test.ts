import { generateSecureOtp, generateSecureToken, hashToken } from './crypto';

describe('Crypto Utils', () => {
  describe('generateSecureOtp', () => {
    it('should generate a numeric string of the specified length', () => {
      const length = 6;
      const otp = generateSecureOtp(length);
      expect(otp).toHaveLength(length);
      expect(/^\d+$/.test(otp)).toBe(true);
    });

    it('should generate different OTPs on subsequent calls', () => {
      const otp1 = generateSecureOtp(6);
      const otp2 = generateSecureOtp(6);
      expect(otp1).not.toBe(otp2);
    });

    it('should return empty string for length <= 0', () => {
      expect(generateSecureOtp(0)).toBe('');
      expect(generateSecureOtp(-1)).toBe('');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a hex string of expected length', () => {
      const bytes = 32;
      const token = generateSecureToken(bytes);
      // hex string is 2 chars per byte
      expect(token).toHaveLength(bytes * 2);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe('hashToken', () => {
    it('should return a consistent SHA-256 hash', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });
  });
});
