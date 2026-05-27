import AppError from '../../common/errors/AppError';
import httpStatus from 'http-status';
import { gamingCenterRepository } from './gamingCenter.repository';
import { CreateSalonInput, UpdateSalonInput } from './gamingCenter.types';
import { ListSalonsQuery } from './gamingCenter.validation';

export const salonService = {
  async createSalon(data: CreateSalonInput) {
    const existingSalon = await gamingCenterRepository.findBySlug(data.slug);
    if (existingSalon) {
      throw new AppError('A gamingCenter with this slug already exists', httpStatus.CONFLICT);
    }
    return gamingCenterRepository.create(data);
  },

  async getSalonById(id: string) {
    const gamingCenter = await gamingCenterRepository.findById(id);
    if (!gamingCenter) {
      throw new AppError('GamingCenter not found', httpStatus.NOT_FOUND);
    }
    return gamingCenter;
  },

  async getAllSalons(query: ListSalonsQuery) {
    return gamingCenterRepository.findAll(query);
  },

  async updateSalon(id: string, data: UpdateSalonInput) {
    const gamingCenter = await gamingCenterRepository.findById(id);
    if (!gamingCenter) {
      throw new AppError('GamingCenter not found', httpStatus.NOT_FOUND);
    }

    if (data.slug && data.slug !== gamingCenter.slug) {
      const existingSalon = await gamingCenterRepository.findBySlug(data.slug);
      if (existingSalon) {
        throw new AppError('A gamingCenter with this slug already exists', httpStatus.CONFLICT);
      }
    }

    return gamingCenterRepository.update(id, data);
  },

  async deleteSalon(id: string) {
    const gamingCenter = await gamingCenterRepository.findById(id);
    if (!gamingCenter) {
      throw new AppError('GamingCenter not found', httpStatus.NOT_FOUND);
    }
    return gamingCenterRepository.softDelete(id);
  },
};
