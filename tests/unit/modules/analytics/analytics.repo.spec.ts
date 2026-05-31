import { describe, it, expect, jest } from '@jest/globals';
import { prismaMock } from '../../../mocks/prisma';
import { AnalyticsRepo } from '../../../../src/modules/analytics/analytics.repo';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('AnalyticsRepo', () => {
  const gamingCenterId = 'gc-1';
  const startDate = new Date('2023-01-01');
  const endDate = new Date('2023-01-31');

  const gcAnalyticsMock = prismaMock.gamingCenterAnalytics as any;
  const staffAnalyticsMock = prismaMock.staffAnalytics as any;
  const stationAnalyticsMock = prismaMock.stationAnalytics as any;
  const settingsMock = prismaMock.settings as any;
  const resMock = prismaMock.reservation as any;
  const paymentMock = prismaMock.payment as any;
  const userMock = prismaMock.user as any;
  const stationModelMock = prismaMock.gameStation as any;
  const profileMock = prismaMock.customerProfile as any;
  const ratingMock = prismaMock.rating as any;

  describe('getSummaryStats', () => {
    it('should return aggregated sum of stats', async () => {
      const mockSum = {
        totalReservations: 10,
        completedReservations: 8,
        canceledReservations: 2,
        revenue: 1000,
        realizedCash: 900,
      };
      gcAnalyticsMock.aggregate.mockResolvedValue({ _sum: mockSum });

      const result = await AnalyticsRepo.getSummaryStats(gamingCenterId, startDate, endDate);
      expect(result).toEqual(mockSum);
      expect(gcAnalyticsMock.aggregate).toHaveBeenCalledWith(expect.objectContaining({
        where: { gamingCenterId, date: { gte: startDate, lte: endDate } }
      }));
    });
  });

  describe('getStaffPerformanceStats', () => {
    it('should return grouped staff stats', async () => {
      const mockStats = [{ staffId: 'u-1', _sum: { completedReservations: 5 } }];
      staffAnalyticsMock.groupBy.mockResolvedValue(mockStats);

      const result = await AnalyticsRepo.getStaffPerformanceStats(gamingCenterId, startDate, endDate);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getServicePerformanceStats', () => {
    it('should return grouped station stats', async () => {
      const mockStats = [{ stationId: 's-1', _sum: { revenue: 500 } }];
      stationAnalyticsMock.groupBy.mockResolvedValue(mockStats);
      const result = await AnalyticsRepo.getServicePerformanceStats(gamingCenterId, startDate, endDate);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getDailyRevenue', () => {
    it('should return daily revenue data', async () => {
      const mockData = [{ date: new Date(), revenue: 100 }];
      gcAnalyticsMock.findMany.mockResolvedValue(mockData);

      const result = await AnalyticsRepo.getDailyRevenue(gamingCenterId, startDate, endDate);
      expect(result).toEqual(mockData);
    });
  });

  describe('getNewCustomersCount', () => {
    it('should return count of new customers', async () => {
      profileMock.count.mockResolvedValue(5);
      const result = await AnalyticsRepo.getNewCustomersCount(gamingCenterId, startDate, endDate);
      expect(result).toBe(5);
    });
  });

  describe('getStaffDetails', () => {
    it('should return staff users', async () => {
      userMock.findMany.mockResolvedValue([{ id: 'u-1', fullName: 'Staff 1' }]);
      const result = await AnalyticsRepo.getStaffDetails(gamingCenterId);
      expect(result).toHaveLength(1);
    });
  });

  describe('getServiceDetails', () => {
    it('should return stations', async () => {
      stationModelMock.findMany.mockResolvedValue([{ id: 's-1', name: 'PC 1' }]);
      const result = await AnalyticsRepo.getServiceDetails(gamingCenterId);
      expect(result).toHaveLength(1);
    });
  });

  describe('getBookingsWithReviews', () => {
    it('should return reservations with ratings', async () => {
      resMock.findMany.mockResolvedValue([]);
      await AnalyticsRepo.getBookingsWithReviews(gamingCenterId, startDate, endDate);
      expect(resMock.findMany).toHaveBeenCalled();
    });
  });

  describe('syncSalonStats', () => {
    it('should sync and upsert salon stats', async () => {
      settingsMock.findUnique.mockResolvedValue({ timeZone: 'UTC' });
      resMock.groupBy.mockResolvedValue([]);
      paymentMock.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      gcAnalyticsMock.upsert.mockResolvedValue({});

      await AnalyticsRepo.syncSalonStats(gamingCenterId, new Date());
      expect(gcAnalyticsMock.upsert).toHaveBeenCalled();
    });
  });

  describe('syncStaffStats', () => {
    it('should sync and upsert staff stats', async () => {
      settingsMock.findUnique.mockResolvedValue({ timeZone: 'UTC' });
      resMock.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { totalPrice: 0 } });
      ratingMock.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { rating: 0 } });
      staffAnalyticsMock.upsert.mockResolvedValue({});

      await AnalyticsRepo.syncStaffStats(gamingCenterId, 'u-1', new Date());
      expect(staffAnalyticsMock.upsert).toHaveBeenCalled();
    });
  });

  describe('syncServiceStats', () => {
    it('should sync and upsert station stats', async () => {
      settingsMock.findUnique.mockResolvedValue({ timeZone: 'UTC' });
      resMock.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { totalPrice: 0 } });
      stationAnalyticsMock.upsert.mockResolvedValue({});

      await AnalyticsRepo.syncServiceStats(gamingCenterId, 's-1', new Date());
      expect(stationAnalyticsMock.upsert).toHaveBeenCalled();
    });
  });

  describe('syncAllStatsForBooking', () => {
    it('should sync all stats for a booking', async () => {
      resMock.findUnique.mockResolvedValue({ id: 'res-1', gamingCenterId, startTime: new Date(), staffId: 'u-1', stationId: 's-1' });
      jest.spyOn(AnalyticsRepo, 'syncSalonStats').mockResolvedValue(undefined as any);
      jest.spyOn(AnalyticsRepo, 'syncStaffStats').mockResolvedValue(undefined as any);
      jest.spyOn(AnalyticsRepo, 'syncServiceStats').mockResolvedValue(undefined as any);

      await AnalyticsRepo.syncAllStatsForBooking('res-1');
      expect(AnalyticsRepo.syncSalonStats).toHaveBeenCalled();
    });
  });

  describe('syncAllStatsForPayment', () => {
    it('should sync stats after payment', async () => {
      paymentMock.findUnique.mockResolvedValue({ id: 'pay-1', status: 'PAID', paidAt: new Date(), gamingCenterId, reservationId: 'res-1' });
      jest.spyOn(AnalyticsRepo, 'syncSalonStats').mockResolvedValue(undefined as any);
      jest.spyOn(AnalyticsRepo, 'syncAllStatsForBooking').mockResolvedValue(undefined as any);

      await AnalyticsRepo.syncAllStatsForPayment('pay-1');
      expect(AnalyticsRepo.syncSalonStats).toHaveBeenCalled();
      expect(AnalyticsRepo.syncAllStatsForBooking).toHaveBeenCalledWith('res-1');
    });
  });

  describe('syncAllStatsForReview', () => {
    it('should sync staff stats after review', async () => {
      ratingMock.findUnique.mockResolvedValue({ id: 'r-1', gamingCenterId, reservation: { staffId: 'u-1', startTime: new Date() } });
      jest.spyOn(AnalyticsRepo, 'syncStaffStats').mockResolvedValue(undefined as any);

      await AnalyticsRepo.syncAllStatsForReview('r-1');
      expect(AnalyticsRepo.syncStaffStats).toHaveBeenCalled();
    });
  });
});
