import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { User, GamingCenter, GameStationType } from '@prisma/client';
import { generateToken } from '../../common/utils/test-utils';

describe('Stations API E2E Tests', () => {
  let testGamingCenter: GamingCenter;
  let testManager: User;
  let managerToken: string;

  beforeAll(async () => {
    // Create a gamingCenter for the tests
    testGamingCenter = await prisma.gamingCenter.create({
      data: {
        name: 'Test GamingCenter for E2E Stations',
        slug: `test-gamingCenter-e2e-stations-${Date.now()}`,
      },
    });

    // Create a manager user for the tests
    testManager = await prisma.user.create({
      data: {
        fullName: 'Test Manager',
        phone: `+989121111111${Date.now()}`.slice(0, 14),
        role: 'MANAGER',
        gamingCenterId: testGamingCenter.id,
      },
    });

    managerToken = generateToken({
        actorId: testManager.id,
        actorType: 'USER',
    });
  });

  afterAll(async () => {
    // Clean up all created data
    await prisma.gameStation.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.gamingCenter.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/v1/gamingCenters/:gamingCenterId/stations', () => {
    it('should create a new station when authenticated as a MANAGER', async () => {
      const stationData = {
        name: 'E2E Test GameStation',
        stationType: GameStationType.PC,
        hourlyPrice: 120000,
        minRentHours: 1,
        maxRentHours: 8,
        defaultDurationHours: 1,
        incrementMinutes: 30,
      };

      const response = await request(app)
        .post(`/api/v1/gamingCenters/${testGamingCenter.id}/stations`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(stationData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(stationData.name);
    });

    it('should return 401 if no token is provided', async () => {
      const stationData = { name: 'No Auth GameStation', hourlyPrice: 10 };
      const response = await request(app)
        .post(`/api/v1/gamingCenters/${testGamingCenter.id}/stations`)
        .send(stationData);

      expect(response.status).toBe(401);
    });
  });
});
