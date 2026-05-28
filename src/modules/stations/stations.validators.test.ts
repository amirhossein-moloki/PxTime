import { createStationSchema } from './stations.validators';
import { GameStationType } from '@prisma/client';

describe('GameStation Validators', () => {
  describe('createStationSchema', () => {
    const validData = {
      body: {
        name: 'Test GameStation',
        stationType: GameStationType.PC,
        hourlyPrice: 50000,
        minRentHours: 1,
        maxRentHours: 8,
        defaultDurationHours: 1,
        incrementMinutes: 30,
        isActive: true,
      },
    };

    it('should pass with valid data', () => {
      const result = createStationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should fail if name is empty', () => {
      const invalidData = { ...validData, body: { ...validData.body, name: '' } };
      const result = createStationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should fail if hourlyPrice is negative', () => {
      const invalidData = { ...validData, body: { ...validData.body, hourlyPrice: -100 } };
      const result = createStationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should pass if optional fields are not provided', () => {
      const minimalData = {
        body: {
          name: 'Test GameStation',
          hourlyPrice: 50000,
        },
      };
      const result = createStationSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });
  });
});
