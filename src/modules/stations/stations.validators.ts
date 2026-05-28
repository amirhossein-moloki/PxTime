import { z } from 'zod';
import { GameStationType } from '@prisma/client';
import { baseFilterSchema } from '../../common/validators/query.validators';

// Base schema for common fields
const serviceBaseSchema = {
  name: z.string().min(1, 'Name is required'),
  stationType: z.nativeEnum(GameStationType).default(GameStationType.PC),
  hourlyPrice: z.number().min(0, 'Hourly price cannot be negative'),
  minRentHours: z.number().int().positive().default(1),
  maxRentHours: z.number().int().positive().default(8),
  defaultDurationHours: z.number().int().positive().default(1),
  incrementMinutes: z.number().int().positive().default(30),
  isVip: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

// Schema for creating a new station
export const createStationSchema = z.object({
  body: z.object({
    ...serviceBaseSchema,
  }),
});

// Schema for updating an existing station
export const updateStationSchema = z.object({
  body: z.object({
    name: serviceBaseSchema.name.optional(),
    stationType: z.nativeEnum(GameStationType).optional(),
    hourlyPrice: serviceBaseSchema.hourlyPrice.optional(),
    minRentHours: serviceBaseSchema.minRentHours.optional(),
    maxRentHours: serviceBaseSchema.maxRentHours.optional(),
    defaultDurationHours: serviceBaseSchema.defaultDurationHours.optional(),
    incrementMinutes: serviceBaseSchema.incrementMinutes.optional(),
    isVip: serviceBaseSchema.isVip.optional(),
    isActive: serviceBaseSchema.isActive.optional(),
  }),
  params: z.object({
    stationId: z.string().cuid('Invalid station ID format'),
  }),
});

export const listServicesSchema = baseFilterSchema.extend({
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  stationType: z.nativeEnum(GameStationType).optional(),
  isVip: z.coerce.boolean().optional(),
  staffId: z.string().optional(),
});

export type ListServicesQuery = z.infer<typeof listServicesSchema>;

// Schema for URL parameters that include a stationId
export const serviceIdParamSchema = z.object({
  params: z.object({
    stationId: z.string().cuid('Invalid station ID format'),
  }),
});
