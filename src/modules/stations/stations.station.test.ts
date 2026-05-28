import { prisma } from '../../config/prisma';
import * as stationLogic from './stations.station';
import { User, GamingCenter, GameStationType } from '@prisma/client';
import { CreateServiceInput } from './stations.types';

describe('GameStation Logic Integration Tests', () => {
  let testGamingCenter: GamingCenter;
  let _testUser: User; // eslint-disable-line @typescript-eslint/no-unused-vars

  beforeAll(async () => {
    // Create a gamingCenter for the tests
    testGamingCenter = await prisma.gamingCenter.create({
      data: {
        name: 'Test GamingCenter for Stations',
        slug: `test-gamingCenter-stations-${Date.now()}`,
      },
    });
    // Create a user for the tests
    _testUser = await prisma.user.create({
      data: {
        fullName: 'Test User',
        phone: `+989120000000${Date.now()}`.slice(0, 14),
        role: 'MANAGER',
        gamingCenterId: testGamingCenter.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up all created data
    await prisma.gameStation.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.gamingCenter.deleteMany({});
    await prisma.$disconnect();
  });

  describe('createStation', () => {
    it('should create a new station and store it in the database', async () => {
      const stationData: CreateServiceInput = {
        name: 'PC Station 01',
        stationType: GameStationType.PC,
        hourlyPrice: 75000,
        minRentHours: 1,
        maxRentHours: 8,
        defaultDurationHours: 1,
        incrementMinutes: 30,
      };

      const createdStation = await stationLogic.createStation(testGamingCenter.id, stationData);

      expect(createdStation).toBeDefined();
      expect(createdStation.id).toBeDefined();
      expect(createdStation.name).toBe(stationData.name);
      expect(createdStation.hourlyPrice).toBe(stationData.hourlyPrice);
      expect(createdStation.gamingCenterId).toBe(testGamingCenter.id);

      // Verify it exists in the DB
      const dbStation = await prisma.gameStation.findUnique({
        where: { id: createdStation.id },
      });
      expect(dbStation).not.toBeNull();
      expect(dbStation?.name).toBe(stationData.name);
    });
  });
});
