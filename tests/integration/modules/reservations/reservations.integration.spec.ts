import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { reservationsService } from '../../../../src/modules/reservations/reservations.station';
import { ReservationsRepo } from '../../../../src/modules/reservations/reservations.repo';
import { ReservationStatus, ReservationSource } from '@prisma/client';
import { eventEmitter, AppEvents } from '../../../../src/common/events/event-emitter';
import { commissionsService } from '../../../../src/modules/commissions/commissions.station';

jest.mock('../../../../src/modules/reservations/reservations.repo');
jest.mock('../../../../src/common/events/event-emitter');
jest.mock('../../../../src/modules/audit/audit.station');
jest.mock('../../../../src/modules/wallet/wallet.station');
jest.mock('../../../../src/modules/commissions/commissions.station');

const MockedReservationsRepo = ReservationsRepo as jest.Mocked<typeof ReservationsRepo>;
const MockedEventEmitter = eventEmitter as jest.Mocked<typeof eventEmitter>;

describe('Reservation Creation Integration (Mocked Repo)', () => {
  const gamingCenterId = 'gc-1';
  const salonSlug = 'test-center';
  const staffId = 'staff-1';
  const stationId = 'station-1';

  beforeEach(() => {
    jest.clearAllMocks();
    // Simulate transaction by just calling the callback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MockedReservationsRepo.transaction.mockImplementation(async (cb: any) => {
      return cb({});
    });
  });

  describe('createBooking (Internal/Staff)', () => {
    it('should successfully create a reservation and emit event', async () => {
      const input = {
        gamingCenterId,
        stationId,
        staffId,
        customer: { fullName: 'John Doe', phone: '09123456789' },
        startTime: new Date(Date.now() + 3600000).toISOString(),
        createdByUserId: 'admin-1',
      };

      const station = { id: stationId, name: 'PC-1', hourlyPrice: 100, defaultDurationHours: 1, stationType: 'PC', isActive: true };
      const staff = { id: staffId };
      const customerAccount = { id: 'cust-1' };
      const customerProfile = { id: 'prof-1' };
      const gamingCenter = { id: gamingCenterId, settings: { timeZone: 'UTC' } };
      const reservation = { id: 'res-1', ...input, status: ReservationStatus.CONFIRMED };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStation.mockResolvedValue(station as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStaff.mockResolvedValue(staff as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findCustomerAccountByPhone.mockResolvedValue(customerAccount as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findCustomerProfile.mockResolvedValue(customerProfile as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findGamingCenterWithSettings.mockResolvedValue(gamingCenter as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.createReservation.mockResolvedValue(reservation as any);

      const result = await reservationsService.createBooking(input);

      expect(result).toEqual(reservation);
      expect(MockedReservationsRepo.createReservation).toHaveBeenCalledWith(expect.objectContaining({
        totalHours: station.defaultDurationHours,
        totalPrice: station.defaultDurationHours * station.hourlyPrice,
        stationSnapshot: {
          name: station.name,
          hourlyPrice: station.hourlyPrice,
          stationType: station.stationType,
        }
      }), expect.anything());
      expect(MockedEventEmitter.emit).toHaveBeenCalledWith(AppEvents.BOOKING_CREATED, expect.objectContaining({
        reservation,
        gamingCenter,
        customerAccount,
      }));
    });
  });

  describe('createPublicBooking', () => {
    it('should successfully create an online reservation', async () => {
      const input = {
        stationId,
        staffId,
        startTime: new Date(Date.now() + 3600000).toISOString(),
        customer: { fullName: 'Jane Doe', phone: '09998887766' },
      };

      const gamingCenter = {
        id: gamingCenterId,
        slug: salonSlug,
        settings: {
          allowOnlineBooking: true,
          onlineBookingAutoConfirm: true,
          timeZone: 'UTC',
        },
      };

      const station = { id: stationId, name: 'PS5-1', hourlyPrice: 200, defaultDurationHours: 1, stationType: 'PLAYSTATION', isActive: true };
      const staff = { id: staffId };
      const staffShift = { id: 'shift-1', startTime: '08:00', endTime: '22:00' };
      const customerAccount = { id: 'cust-2' };
      const customerProfile = { id: 'prof-2' };
      const reservation = { id: 'res-2', status: ReservationStatus.CONFIRMED, source: ReservationSource.ONLINE };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findGamingCenterBySlugWithSettings.mockResolvedValue(gamingCenter as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStation.mockResolvedValue(station as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStaff.mockResolvedValue(staff as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStaffShift.mockResolvedValue(staffShift as any);
      MockedReservationsRepo.findOverlappingReservation.mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findCustomerAccountByPhone.mockResolvedValue(customerAccount as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findCustomerProfile.mockResolvedValue(customerProfile as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.createReservation.mockResolvedValue(reservation as any);

      const result = await reservationsService.createPublicBooking(salonSlug, input);

      expect(result).toEqual(reservation);
      expect(MockedReservationsRepo.createReservation).toHaveBeenCalledWith(expect.objectContaining({
        source: ReservationSource.ONLINE,
        status: ReservationStatus.CONFIRMED,
      }), expect.anything());
    });

    it('should fail if online booking is disabled', async () => {
      const gamingCenter = {
        id: gamingCenterId,
        settings: { allowOnlineBooking: false },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findGamingCenterBySlugWithSettings.mockResolvedValue(gamingCenter as any);

      await expect(reservationsService.createPublicBooking(salonSlug, {
        startTime: new Date(Date.now() + 3600000).toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)).rejects.toThrow('Online reservation is disabled.');
    });

    it('should fail if there is an overlapping reservation', async () => {
      const input = {
        stationId,
        staffId,
        startTime: new Date(Date.now() + 3600000).toISOString(),
        customer: { fullName: 'Jane Doe', phone: '09998887766' },
      };

      const gamingCenter = {
        id: gamingCenterId,
        settings: { allowOnlineBooking: true, timeZone: 'UTC' },
      };
      const station = { id: stationId, defaultDurationHours: 1, isActive: true };
      const staff = { id: staffId };
      const staffShift = { id: 'shift-1', startTime: '00:00', endTime: '23:59' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findGamingCenterBySlugWithSettings.mockResolvedValue(gamingCenter as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStation.mockResolvedValue(station as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStaff.mockResolvedValue(staff as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStaffShift.mockResolvedValue(staffShift as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findOverlappingReservation.mockResolvedValue({ id: 'existing-res' } as any);

      await expect(reservationsService.createPublicBooking(salonSlug, input))
        .rejects.toThrow('Selected time is not available.');
    });
  });

  describe('updateBooking', () => {
    it('should update booking and emit event', async () => {
      const reservation = {
        id: 'res-1',
        gamingCenterId,
        stationId: 'old-station',
        staffId: 'old-staff',
        startTime: new Date(),
        status: ReservationStatus.CONFIRMED,
        totalHours: 1,
        stationSnapshot: { hourlyPrice: 100 }
      };

      const updateData = { note: 'new note' };
      const updatedReservation = { ...reservation, ...updateData };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findReservationById.mockResolvedValue(reservation as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.updateReservation.mockResolvedValue(updatedReservation as any);

      const result = await reservationsService.updateBooking('res-1', gamingCenterId, updateData, { id: 'admin-1', actorType: 'USER' });

      expect(result).toEqual(updatedReservation);
      expect(MockedEventEmitter.emit).toHaveBeenCalledWith(AppEvents.BOOKING_UPDATED, expect.objectContaining({
        updatedBooking: updatedReservation,
        oldBooking: reservation
      }));
    });

    it('should fail if booking is in terminal state', async () => {
      const reservation = { id: 'res-1', status: ReservationStatus.COMPLETED };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findReservationById.mockResolvedValue(reservation as any);

      await expect(reservationsService.updateBooking('res-1', gamingCenterId, { note: 'test' }, { id: 'admin-1', actorType: 'USER' }))
        .rejects.toThrow('Reservation is in a terminal state');
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking and trigger refund', async () => {
      const reservation = { id: 'res-1', status: ReservationStatus.CONFIRMED, gamingCenterId };
      const updatedReservation = { ...reservation, status: ReservationStatus.CANCELED };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findReservationById.mockResolvedValue(reservation as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.updateReservationWithInclude.mockResolvedValue(updatedReservation as any);

      const result = await reservationsService.cancelBooking('res-1', gamingCenterId, { id: 'admin-1', role: 'MANAGER', actorType: 'USER' }, { reason: 'User requested' });

      expect(result.status).toBe(ReservationStatus.CANCELED);
      expect(MockedEventEmitter.emit).toHaveBeenCalledWith(AppEvents.BOOKING_CANCELED, expect.anything());
    });
  });

  describe('completeBooking', () => {
    it('should complete booking', async () => {
      const reservation = { id: 'res-1', status: ReservationStatus.CONFIRMED, gamingCenterId };
      const updatedReservation = { ...reservation, status: ReservationStatus.COMPLETED };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findReservationById.mockResolvedValue(reservation as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.updateReservation.mockResolvedValue(updatedReservation as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (commissionsService.calculateCommission as any).mockResolvedValue(Promise.resolve());

      const result = await reservationsService.completeBooking('res-1', gamingCenterId, { id: 'admin-1', role: 'MANAGER', actorType: 'USER' });

      expect(result.status).toBe(ReservationStatus.COMPLETED);
      expect(MockedEventEmitter.emit).toHaveBeenCalledWith(AppEvents.BOOKING_COMPLETED, expect.anything());
    });
  });

  describe('markAsNoShow', () => {
    it('should mark as no-show', async () => {
      const reservation = { id: 'res-1', status: ReservationStatus.CONFIRMED, gamingCenterId };
      const updatedReservation = { ...reservation, status: ReservationStatus.NO_SHOW };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findReservationById.mockResolvedValue(reservation as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.updateReservation.mockResolvedValue(updatedReservation as any);

      const result = await reservationsService.markAsNoShow('res-1', gamingCenterId, { id: 'admin-1', role: 'MANAGER', actorType: 'USER' });

      expect(result.status).toBe(ReservationStatus.NO_SHOW);
      expect(MockedEventEmitter.emit).toHaveBeenCalledWith(AppEvents.BOOKING_NOSHOW, expect.anything());
    });
  });

  describe('getBookings', () => {
    it('should list bookings with meta', async () => {
      const reservations = [{ id: 'res-1' }];
      const totalItems = 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findManyReservations.mockResolvedValue(reservations as any);
      MockedReservationsRepo.countReservations.mockResolvedValue(totalItems);

      const result = await reservationsService.getBookings(gamingCenterId, { page: 1, pageSize: 10 }, { id: 'admin-1', role: 'MANAGER' });

      expect(result.data).toEqual(reservations);
      expect(result.meta.totalItems).toBe(totalItems);
    });
  });

  describe('confirmBooking', () => {
    it('should confirm a pending booking', async () => {
      const reservation = { id: 'res-1', status: ReservationStatus.PENDING, gamingCenterId };
      const updatedReservation = { ...reservation, status: ReservationStatus.CONFIRMED, gamingCenter: {}, customerAccount: {} };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findReservationById.mockResolvedValue(reservation as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.updateReservationWithInclude.mockResolvedValue(updatedReservation as any);

      const result = await reservationsService.confirmBooking('res-1', gamingCenterId, { id: 'admin-1', role: 'MANAGER' });

      expect(result.status).toBe(ReservationStatus.CONFIRMED);
      expect(MockedEventEmitter.emit).toHaveBeenCalledWith(AppEvents.BOOKING_CONFIRMED, expect.anything());
    });

    it('should fail if staff tries to confirm', async () => {
      await expect(reservationsService.confirmBooking('res-1', gamingCenterId, { id: 'staff-1', role: 'STAFF' }))
        .rejects.toThrow('Forbidden');
    });
  });

  describe('updateBooking (Time Change)', () => {
    it('should update booking when time changes and check shifts/overlaps', async () => {
      const reservation = {
        id: 'res-1',
        gamingCenterId,
        stationId: 's-1',
        staffId: 'st-1',
        startTime: new Date(),
        status: ReservationStatus.CONFIRMED,
        totalHours: 1,
        stationSnapshot: { hourlyPrice: 100 }
      };

      const newStartTime = new Date(Date.now() + 86400000); // tomorrow
      const updateData = { startTime: newStartTime.toISOString() };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findReservationById.mockResolvedValue(reservation as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findSettings.mockResolvedValue({ timeZone: 'UTC' } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStation.mockResolvedValue({ id: 's-1', defaultDurationHours: 1 } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStaffShift.mockResolvedValue({ startTime: '00:00', endTime: '23:59' } as any);
      MockedReservationsRepo.findOverlappingReservation.mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.updateReservation.mockResolvedValue({ ...reservation, startTime: newStartTime } as any);

      const result = await reservationsService.updateBooking('res-1', gamingCenterId, updateData, { id: 'admin-1', actorType: 'USER' });

      expect(result.startTime).toEqual(newStartTime);
      expect(MockedReservationsRepo.findOverlappingReservation).toHaveBeenCalled();
    });

    it('should recalculate price and hours when station changes', async () => {
      const reservation = {
        id: 'res-1',
        gamingCenterId,
        stationId: 'old-s',
        staffId: 'st-1',
        startTime: new Date(),
        status: ReservationStatus.CONFIRMED,
        totalHours: 1,
        totalPrice: 100,
        stationSnapshot: { hourlyPrice: 100 }
      };

      const newStation = { id: 'new-s', name: 'New PC', hourlyPrice: 150, defaultDurationHours: 2, stationType: 'PC', isActive: true };
      const updateData = { stationId: 'new-s' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findReservationById.mockResolvedValue(reservation as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStation.mockResolvedValue(newStation as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStaff.mockResolvedValue({ id: 'old-st' } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findSettings.mockResolvedValue({ timeZone: 'UTC' } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.findStaffShift.mockResolvedValue({ startTime: '00:00', endTime: '23:59' } as any);
      MockedReservationsRepo.findOverlappingReservation.mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MockedReservationsRepo.updateReservation.mockResolvedValue({ ...reservation, ...updateData, totalHours: 2, totalPrice: 300 } as any);

      const result = await reservationsService.updateBooking('res-1', gamingCenterId, updateData, { id: 'admin-1', actorType: 'USER' });

      expect(MockedReservationsRepo.updateReservation).toHaveBeenCalledWith(
        'res-1',
        gamingCenterId,
        expect.objectContaining({
          totalHours: 2,
          totalPrice: 300,
          stationSnapshot: expect.objectContaining({ hourlyPrice: 150 })
        }),
        expect.anything()
      );
      expect(result.totalPrice).toBe(300);
    });
  });
});
