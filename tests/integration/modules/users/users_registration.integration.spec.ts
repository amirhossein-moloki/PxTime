import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createStaffMember } from '../../../../src/modules/users/users.station';
import * as userRepo from '../../../../src/modules/users/users.repo';
import { auditService } from '../../../../src/modules/audit/audit.station';
import { SessionActorType, UserRole } from '@prisma/client';
import { UserFactory } from '../../../../tests/factories/user.factory';

jest.mock('../../../../src/modules/users/users.repo');
jest.mock('../../../../src/modules/audit/audit.station');

const MockedUserRepo = userRepo as jest.Mocked<typeof userRepo>;
const MockedAuditService = auditService as jest.Mocked<typeof auditService>;

describe('User Registration Integration (Mocked Repo)', () => {
  const gamingCenterId = 'gc-123';
  const actor = { id: 'admin-1', actorType: SessionActorType.USER };
  const context = { ip: '127.0.0.1', userAgent: 'test-agent' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully create a staff member and record audit log', async () => {
    const input = {
      fullName: 'John Doe',
      phone: '09123456789',
      role: UserRole.STAFF,
    };

    const createdUser = UserFactory.create({ ...input, gamingCenterId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MockedUserRepo.createUser.mockResolvedValue(createdUser as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createStaffMember(gamingCenterId, input as any, actor, context);

    expect(result).toEqual(createdUser);
    expect(MockedUserRepo.createUser).toHaveBeenCalledWith(gamingCenterId, input);
    expect(MockedAuditService.recordLog).toHaveBeenCalledWith({
      gamingCenterId,
      userId: actor.id,
      actorType: actor.actorType,
      action: 'USER_CREATE',
      entity: 'User',
      entityId: createdUser.id,
      newData: createdUser,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });
  });

  it('should fail if repository throws an error (e.g. duplicate)', async () => {
    const input = {
      fullName: 'Duplicate User',
      phone: '09123456789',
      role: UserRole.STAFF,
    };

    const error = new Error('Unique constraint failed');
    MockedUserRepo.createUser.mockRejectedValue(error);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(createStaffMember(gamingCenterId, input as any, actor, context))
      .rejects.toThrow('Unique constraint failed');

    expect(MockedAuditService.recordLog).not.toHaveBeenCalled();
  });

  it('should reject invalid input (validation error simulated)', async () => {
    // In real scenario, 'validate' middleware handles this, but here we test the station's resilience if it had its own checks
    // Currently users.station.ts doesn't have explicit validation, it relies on Zod middleware
    // But we can simulate if repo fails due to validation
    const error = new Error('Validation failed');
    MockedUserRepo.createUser.mockRejectedValue(error);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(createStaffMember(gamingCenterId, {} as any, actor))
      .rejects.toThrow('Validation failed');
  });

  describe('updateStaffMember', () => {
    it('should update staff member and record audit log', async () => {
      const userId = 'user-123';
      const existingUser = UserFactory.create({ id: userId, fullName: 'Old Name' });
      const updateData = { fullName: 'New Name' };
      const updatedUser = { ...existingUser, ...updateData };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedUserRepo.findUserById.mockResolvedValueOnce(existingUser as any).mockResolvedValueOnce(updatedUser as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedUserRepo.updateUser.mockResolvedValue({ count: 1 } as any);

      const result = await userRepo.updateUser(gamingCenterId, userId, updateData);

      expect(result).toEqual({ count: 1 });
      // To test the station method which includes audit log:
      const { updateStaffMember: updateStaffStation } = await import('../../../../src/modules/users/users.station');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stationResult = await updateStaffStation(gamingCenterId, userId, updateData as any, actor, context);

      expect(stationResult).toEqual(updatedUser);
      expect(MockedAuditService.recordLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'USER_UPDATE',
        oldData: existingUser,
        newData: updatedUser,
      }));
    });
  });

  describe('deleteStaffMember', () => {
    it('should delete staff member and record audit log', async () => {
      const userId = 'user-456';
      const existingUser = UserFactory.create({ id: userId });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedUserRepo.findUserById.mockResolvedValue(existingUser as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedUserRepo.softDeleteUser.mockResolvedValue({ count: 1 } as any);

      const { deleteStaffMember: deleteStaffStation } = await import('../../../../src/modules/users/users.station');
      await deleteStaffStation(gamingCenterId, userId, actor, context);

      expect(MockedUserRepo.softDeleteUser).toHaveBeenCalledWith(gamingCenterId, userId);
      expect(MockedAuditService.recordLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'USER_DELETE',
        entityId: userId,
      }));
    });
  });
});
