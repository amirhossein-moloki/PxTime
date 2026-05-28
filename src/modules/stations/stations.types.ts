import { z } from 'zod';
import { createStationSchema, updateStationSchema } from './stations.validators';

// Type for the body of the create station request
export type CreateServiceInput = z.infer<typeof createStationSchema>['body'];

// Type for the body of the update station request
export type UpdateServiceInput = z.infer<typeof updateStationSchema>['body'];
