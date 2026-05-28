import request from 'supertest';
import cuid from 'cuid';
import app from '../../app';
import { createTestSalon, createTestService, createTestReservation, createTestUser, generateToken } from '../../common/utils/test-utils';
import { ReservationPaymentState, UserRole, SessionActorType } from '@prisma/client';
import { prisma } from '../../config/prisma';

describe('Payments E2E', () => {
  let gamingCenterId: string;
  let reservationId: string;
  let token: string;

  beforeEach(async () => {
    // Reset DB
    await prisma.gamingSession.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.reservation.deleteMany({});
    await prisma.staffStationSkill.deleteMany({});
    await prisma.gameStation.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.customerProfile.deleteMany({});
    await prisma.customerAccount.deleteMany({});
    await prisma.gamingCenter.deleteMany({});

    const gamingCenter = await createTestSalon();
    const user = await createTestUser({ gamingCenterId: gamingCenter.id, role: UserRole.MANAGER });
    gamingCenterId = gamingCenter.id;
    const station = await createTestService({ gamingCenterId });

    const customerAccount = await prisma.customerAccount.create({ data: { phone: '09120000001' } });
    const customerProfile = await prisma.customerProfile.create({ data: { gamingCenterId, customerAccountId: customerAccount.id } });

    const reservation = await createTestReservation(gamingCenterId, customerAccount.id, customerProfile.id, station.id, user.id);
    reservationId = reservation.id;
    token = generateToken({ actorId: user.id, actorType: SessionActorType.USER });
  });

  describe('POST /api/v1/gamingCenters/:gamingCenterId/reservations/:reservationId/payments/init', () => {
    it('should initiate a payment for a valid reservation', async () => {
      const res = await request(app)
        .post(`/api/v1/gamingCenters/${gamingCenterId}/reservations/${reservationId}/payments/init`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', cuid())
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('paymentId');
      expect(res.body.data).toHaveProperty('checkoutUrl');
    });

    it('should return 409 if the reservation is already paid', async () => {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { paymentState: ReservationPaymentState.PAID },
      });

      await request(app)
        .post(`/api/v1/gamingCenters/${gamingCenterId}/reservations/${reservationId}/payments/init`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', cuid())
        .expect(409);
    });

    it('should return 404 if a user from another gamingCenter tries to initiate a payment', async () => {
      // Create a second gamingCenter and a reservation within it
      const salonB = await createTestSalon({ name: 'GamingCenter B', slug: 'gamingCenter-b' });
      const userB = await createTestUser({ gamingCenterId: salonB.id, phone: '9876543210' });
      const serviceB = await createTestService({ gamingCenterId: salonB.id });

      const customerAccountB = await prisma.customerAccount.create({ data: { phone: '09120000002' } });
      const customerProfileB = await prisma.customerProfile.create({ data: { gamingCenterId: salonB.id, customerAccountId: customerAccountB.id } });

      const bookingB = await createTestReservation(salonB.id, customerAccountB.id, customerProfileB.id, serviceB.id, userB.id);

      // The token belongs to a user from the first gamingCenter (gamingCenterId)
      await request(app)
        .post(`/api/v1/gamingCenters/${salonB.id}/reservations/${bookingB.id}/payments/init`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', cuid())
        .expect(404);
    });

    it('should allow a user with the STAFF role to initiate a payment', async () => {
      // Create a user with the STAFF role
      const staffUser = await createTestUser({
        gamingCenterId,
        role: UserRole.STAFF,
        phone: '1112223333', // a different phone number
      });
      const staffToken = generateToken({ actorId: staffUser.id, actorType: SessionActorType.USER });

      const res = await request(app)
        .post(`/api/v1/gamingCenters/${gamingCenterId}/reservations/${reservationId}/payments/init`)
        .set('Authorization', `Bearer ${staffToken}`)
        .set('Idempotency-Key', cuid())
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('paymentId');
      expect(res.body.data).toHaveProperty('checkoutUrl');
    });
  });
});
