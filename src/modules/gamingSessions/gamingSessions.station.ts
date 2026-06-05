import { GamingSession, GamingSessionStatus, Prisma } from '@prisma/client';
import { GamingSessionsRepo } from './gamingSessions.repo';
import AppError from '../../common/errors/AppError';
import httpStatus from 'http-status';

export const GamingSessionsService = {
  async startSession(reservationId: string, stationId: string, tx?: Prisma.TransactionClient): Promise<GamingSession> {
    // Ensure no other active session for this reservation
    const existing = await GamingSessionsRepo.findActiveSessionByReservationId(reservationId, tx);
    if (existing) {
      throw new AppError('An active session already exists for this reservation.', httpStatus.CONFLICT);
    }

    return GamingSessionsRepo.createSession({
      reservationId,
      stationId,
      startTime: new Date(),
      status: GamingSessionStatus.ACTIVE,
    }, tx);
  },

  async endSession(reservationId: string, tx?: Prisma.TransactionClient): Promise<GamingSession> {
    const session = await GamingSessionsRepo.findActiveSessionByReservationId(reservationId, tx);
    if (!session) {
      throw new AppError('No active session found for this reservation.', httpStatus.NOT_FOUND);
    }

    const endTime = new Date();
    const actualHours = (endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);

    return GamingSessionsRepo.updateSession(session.id, {
      endTime,
      actualHours,
      status: GamingSessionStatus.COMPLETED,
    }, tx);
  }
};
