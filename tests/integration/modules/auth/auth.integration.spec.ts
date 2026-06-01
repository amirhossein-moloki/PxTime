import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AuthService } from '../../../../src/modules/auth/auth.station';
import { AuthRepository } from '../../../../src/modules/auth/auth.repository';
import { UserFactory, SessionFactory } from '../../../../tests/factories/user.factory';
import { User, PhoneOtp } from '@prisma/client';
import AppError from '../../../../src/common/errors/AppError';
import httpStatus from 'http-status';

jest.mock('../../../../src/modules/auth/auth.repository');

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn().mockImplementation((val) => Promise.resolve(`h_${val}`)),
  verify: jest.fn().mockImplementation((hash, val) => Promise.resolve(hash === `h_${val}`)),
}));

const MockedAuthRepository = AuthRepository as jest.Mocked<typeof AuthRepository>;

describe('Auth Service Integration (Mocked Repo)', () => {
  const phone = '09123456789';
  const password = 'password123';
  const gamingCenterId = 'gc-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginUser', () => {
    it('should login successfully and return tokens', async () => {
      const user = UserFactory.create({ passwordHash: `h_${password}` }) as User;
      const session = SessionFactory.create({ actorId: user.id });

      MockedAuthRepository.findUserByPhone.mockResolvedValue(user);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedAuthRepository.createSession.mockResolvedValue(session as any);

      const result = await AuthService.loginUser(phone, password, gamingCenterId);

      expect(result.user).toEqual(user);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(MockedAuthRepository.createSession).toHaveBeenCalledWith(user.id, 'USER', expect.any(String), expect.any(Date));
    });

    it('should throw UNAUTHORIZED for invalid password', async () => {
      const user = UserFactory.create({ passwordHash: 'h_correct_password' }) as User;
      MockedAuthRepository.findUserByPhone.mockResolvedValue(user);

      await expect(AuthService.loginUser(phone, 'wrong_password', gamingCenterId))
        .rejects.toThrow(new AppError('Invalid credentials', httpStatus.UNAUTHORIZED));
    });
  });

  describe('OTP Flow', () => {
    it('should request and verify OTP', async () => {
      const users = [{ id: 'u-1', gamingCenter: { id: 'gc-1', name: 'GC 1' } }];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedAuthRepository.findUsersWithSalons.mockResolvedValue(users as any);
      MockedAuthRepository.createOtp.mockResolvedValue({} as PhoneOtp);

      const requestResult = await AuthService.requestUserOtp(phone);
      expect(requestResult.message).toContain('OTP sent');
      expect(MockedAuthRepository.createOtp).toHaveBeenCalledWith(expect.objectContaining({
        codeHash: expect.stringMatching(/^h_/),
      }));

      const otp = { id: 'otp-1', codeHash: 'h_123456' } as PhoneOtp;
      MockedAuthRepository.findRecentOtp.mockResolvedValue(otp);
      MockedAuthRepository.consumeOtp.mockResolvedValue({} as PhoneOtp);

      const verifyResult = await AuthService.verifyUserOtp(phone, '123456');
      expect(verifyResult.gamingCenters).toEqual([{ id: 'gc-1', name: 'GC 1' }]);
    });
  });

  describe('refreshAuthToken', () => {
    it('should refresh token successfully', async () => {
      const session = SessionFactory.create({ expiresAt: new Date(Date.now() + 10000) });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedAuthRepository.findSessionByToken.mockResolvedValue(session as any);

      const result = await AuthService.refreshAuthToken('valid_refresh_token');

      expect(result).toHaveProperty('accessToken');
    });

    it('should revoke expired session', async () => {
      const session = SessionFactory.create({ id: 's-1', expiresAt: new Date(Date.now() - 10000) });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedAuthRepository.findSessionByToken.mockResolvedValue(session as any);

      await expect(AuthService.refreshAuthToken('expired_token'))
        .rejects.toThrow('Refresh token has expired');

      expect(MockedAuthRepository.revokeSession).toHaveBeenCalledWith('s-1');
    });
  });

  describe('loginUserWithOtp', () => {
    it('should login user with verified OTP', async () => {
      const user = UserFactory.create({ phone }) as User;
      const session = SessionFactory.create({ actorId: user.id });

      MockedAuthRepository.findRecentConsumedOtp.mockResolvedValue({} as PhoneOtp);
      MockedAuthRepository.findUserByPhone.mockResolvedValue(user);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedAuthRepository.createSession.mockResolvedValue(session as any);

      const result = await AuthService.loginUserWithOtp(phone, gamingCenterId);

      expect(result.user).toEqual(user);
      expect(result.tokens).toHaveProperty('accessToken');
    });
  });

  describe('logout', () => {
    it('should revoke session', async () => {
      await AuthService.logout('session-1');
      expect(MockedAuthRepository.revokeSession).toHaveBeenCalledWith('session-1');
    });
  });

  describe('verifyUserOtp', () => {
    it('should fail if OTP not found', async () => {
      MockedAuthRepository.findRecentOtp.mockResolvedValue(null);
      await expect(AuthService.verifyUserOtp(phone, '123456'))
        .rejects.toThrow('Invalid or expired OTP.');
    });
  });
});
