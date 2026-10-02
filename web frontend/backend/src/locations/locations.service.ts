import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CreateGovernorateDto } from './dto/create-governorate.dto';
import { UpdateGovernorateDto } from './dto/update-governorate.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  // ==================== Countries ====================
  
  async createCountry(createDto: CreateCountryDto) {
    // التحقق من عدم تكرار الكود
    const existing = await this.prisma.country.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException(`دولة بكود "${createDto.code}" موجودة بالفعل`);
    }

    return this.prisma.country.create({
      data: createDto,
    });
  }

  async getAllCountries() {
    return this.prisma.country.findMany({
      include: {
        governorates: {
          where: { isActive: true },
          include: {
            cities: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getCountryById(id: string) {
    const country = await this.prisma.country.findUnique({
      where: { id },
      include: {
        governorates: {
          include: {
            cities: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!country) {
      throw new NotFoundException('الدولة غير موجودة');
    }

    return country;
  }

  async updateCountry(id: string, updateDto: UpdateCountryDto) {
    await this.getCountryById(id);

    // إذا تم تعديل الكود، التحقق من عدم التكرار
    if (updateDto.code) {
      const existing = await this.prisma.country.findFirst({
        where: {
          code: updateDto.code,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`دولة بكود "${updateDto.code}" موجودة بالفعل`);
      }
    }

    return this.prisma.country.update({
      where: { id },
      data: updateDto,
    });
  }

  async deleteCountry(id: string) {
    await this.getCountryById(id);

    // التحقق من عدم وجود بيانات مرتبطة (المحافظات)
    const governoratesCount = await this.prisma.governorate.count({
      where: { countryId: id },
    });

    if (governoratesCount > 0) {
      throw new ConflictException(
        `لا يمكن حذف الدولة لأنها مرتبطة بـ ${governoratesCount} محافظة/منطقة. يرجى حذف المحافظات أولاً.`
      );
    }

    await this.prisma.country.delete({
      where: { id },
    });

    return { success: true, message: 'تم حذف الدولة بنجاح' };
  }

  // ==================== Governorates ====================
  
  async createGovernorate(createDto: CreateGovernorateDto) {
    // التحقق من وجود الدولة
    await this.getCountryById(createDto.countryId);

    // التحقق من عدم تكرار الكود في نفس الدولة
    const existing = await this.prisma.governorate.findFirst({
      where: {
        countryId: createDto.countryId,
        code: createDto.code,
      },
    });

    if (existing) {
      throw new ConflictException(`محافظة بكود "${createDto.code}" موجودة بالفعل في هذه الدولة`);
    }

    return this.prisma.governorate.create({
      data: createDto,
      include: { country: true },
    });
  }

  async getGovernoratesByCountry(countryId: string) {
    await this.getCountryById(countryId);

    return this.prisma.governorate.findMany({
      where: { countryId },
      include: {
        cities: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getGovernorateById(id: string) {
    const governorate = await this.prisma.governorate.findUnique({
      where: { id },
      include: {
        country: true,
        cities: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!governorate) {
      throw new NotFoundException('المحافظة غير موجودة');
    }

    return governorate;
  }

  async updateGovernorate(id: string, updateDto: UpdateGovernorateDto) {
    const governorate = await this.getGovernorateById(id);

    // إذا تم تعديل الكود، التحقق من عدم التكرار
    if (updateDto.code) {
      const existing = await this.prisma.governorate.findFirst({
        where: {
          countryId: governorate.countryId,
          code: updateDto.code,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`محافظة بكود "${updateDto.code}" موجودة بالفعل في هذه الدولة`);
      }
    }

    return this.prisma.governorate.update({
      where: { id },
      data: updateDto,
    });
  }

  async deleteGovernorate(id: string) {
    await this.getGovernorateById(id);

    // التحقق من عدم وجود بيانات مرتبطة (المدن)
    const citiesCount = await this.prisma.city.count({
      where: { governorateId: id },
    });

    if (citiesCount > 0) {
      throw new ConflictException(
        `لا يمكن حذف المحافظة لأنها مرتبطة بـ ${citiesCount} مدينة. يرجى حذف المدن أولاً.`
      );
    }

    await this.prisma.governorate.delete({
      where: { id },
    });

    return { success: true, message: 'تم حذف المحافظة بنجاح' };
  }

  // ==================== Cities ====================
  
  async createCity(createDto: CreateCityDto) {
    // التحقق من وجود المحافظة
    await this.getGovernorateById(createDto.governorateId);

    // التحقق من عدم تكرار الكود في نفس المحافظة
    const existing = await this.prisma.city.findFirst({
      where: {
        governorateId: createDto.governorateId,
        code: createDto.code,
      },
    });

    if (existing) {
      throw new ConflictException(`مدينة بكود "${createDto.code}" موجودة بالفعل في هذه المحافظة`);
    }

    return this.prisma.city.create({
      data: createDto,
      include: { governorate: true },
    });
  }

  async getCitiesByGovernorate(governorateId: string) {
    await this.getGovernorateById(governorateId);

    return this.prisma.city.findMany({
      where: { governorateId },
      orderBy: { order: 'asc' },
    });
  }

  async getCityById(id: string) {
    const city = await this.prisma.city.findUnique({
      where: { id },
      include: {
        governorate: {
          include: { country: true },
        },
      },
    });

    if (!city) {
      throw new NotFoundException('المدينة غير موجودة');
    }

    return city;
  }

  async updateCity(id: string, updateDto: UpdateCityDto) {
    const city = await this.getCityById(id);

    // إذا تم تعديل الكود، التحقق من عدم التكرار
    if (updateDto.code) {
      const existing = await this.prisma.city.findFirst({
        where: {
          governorateId: city.governorateId,
          code: updateDto.code,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`مدينة بكود "${updateDto.code}" موجودة بالفعل في هذه المحافظة`);
      }
    }

    return this.prisma.city.update({
      where: { id },
      data: updateDto,
    });
  }

  async deleteCity(id: string) {
    await this.getCityById(id);

    await this.prisma.city.delete({
      where: { id },
    });

    return { success: true, message: 'تم حذف المدينة بنجاح' };
  }

  // ==================== Utility Methods ====================
  
  /**
   * جلب البنية الكاملة للمواقع (Cascade Tree)
   */
  async getLocationsTree() {
    return this.getAllCountries();
  }

  /**
   * البحث في المواقع
   */
  async searchLocations(query: string) {
    const [countries, governorates, cities] = await Promise.all([
      this.prisma.country.findMany({
        where: {
          OR: [
            { nameAr: { contains: query } },
            { nameEn: { contains: query } },
            { code: { contains: query } },
          ],
        },
        take: 10,
      }),
      this.prisma.governorate.findMany({
        where: {
          OR: [
            { nameAr: { contains: query } },
            { nameEn: { contains: query } },
            { code: { contains: query } },
          ],
        },
        include: { country: true },
        take: 10,
      }),
      this.prisma.city.findMany({
        where: {
          OR: [
            { nameAr: { contains: query } },
            { nameEn: { contains: query } },
            { code: { contains: query } },
          ],
        },
        include: {
          governorate: {
            include: { country: true },
          },
        },
        take: 10,
      }),
    ]);

    return {
      countries,
      governorates,
      cities,
    };
  }
}