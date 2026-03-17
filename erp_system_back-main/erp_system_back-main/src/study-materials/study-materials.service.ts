import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import { UpdateStudyMaterialDto } from './dto/update-study-material.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { QueryStudyMaterialsDto } from './dto/query-study-materials.dto';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';

@Injectable()
export class StudyMaterialsService {
  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء أداة دراسية جديدة
   */
  async create(createDto: CreateStudyMaterialDto, userId: string) {
    // التحقق من وجود البرنامج التدريبي
    const program = await this.prisma.trainingProgram.findUnique({
      where: { id: createDto.programId },
    });

    if (!program) {
      throw new NotFoundException('البرنامج التدريبي غير موجود');
    }

    const { responsibleUserIds, ...materialData } = createDto;

    return this.prisma.$transaction(async (tx) => {
      // إنشاء الأداة الدراسية
      const material = await tx.studyMaterial.create({
        data: {
          ...materialData,
          createdBy: userId,
        },
        include: {
          program: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
            },
          },
          linkedFee: {
            select: {
              id: true,
              name: true,
              amount: true,
            },
          },
        },
      });

      // إضافة المسؤولين إذا تم تحديدهم
      if (responsibleUserIds && responsibleUserIds.length > 0) {
        await tx.studyMaterialResponsible.createMany({
          data: responsibleUserIds.map(responsibleUserId => ({
            studyMaterialId: material.id,
            userId: responsibleUserId,
            assignedBy: userId,
          })),
        });
      }

      return material;
    });
  }

  /**
   * جلب جميع الأدوات الدراسية مع الفلترة والبحث
   */
  async findAll(query: QueryStudyMaterialsDto) {
    const { programId, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (programId) {
      whereConditions.programId = programId;
    }

    if (typeof isActive === 'boolean') {
      whereConditions.isActive = isActive;
    }

    if (search) {
      whereConditions.OR = [
        { name: { contains: search } },
        { nameEn: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [materials, total] = await Promise.all([
      this.prisma.studyMaterial.findMany({
        where: whereConditions,
        include: {
          program: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
            },
          },
          linkedFee: {
            select: {
              id: true,
              name: true,
              amount: true,
            },
          },
          responsibleUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              deliveries: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.studyMaterial.count({
        where: whereConditions,
      }),
    ]);

    return {
      materials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * جلب أداة دراسية محددة
   */
  async findOne(id: string) {
    const material = await this.prisma.studyMaterial.findUnique({
      where: { id },
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
        linkedFee: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
        responsibleUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        deliveries: {
          include: {
            trainee: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
                nationalId: true,
                phone: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundException('الأداة الدراسية غير موجودة');
    }

    return material;
  }

  /**
   * تحديث أداة دراسية
   */
  async update(id: string, updateDto: UpdateStudyMaterialDto, userId: string) {
    const material = await this.prisma.studyMaterial.findUnique({
      where: { id },
    });

    if (!material) {
      throw new NotFoundException('الأداة الدراسية غير موجودة');
    }

    // إذا تم تغيير البرنامج، التحقق من وجوده
    if (updateDto.programId && updateDto.programId !== material.programId) {
      const program = await this.prisma.trainingProgram.findUnique({
        where: { id: updateDto.programId },
      });

      if (!program) {
        throw new NotFoundException('البرنامج التدريبي غير موجود');
      }
    }

    const { responsibleUserIds, ...materialData } = updateDto;

    return this.prisma.$transaction(async (tx) => {
      // تحديث الأداة الدراسية
      const updatedMaterial = await tx.studyMaterial.update({
        where: { id },
        data: materialData,
        include: {
          program: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
            },
          },
          linkedFee: {
            select: {
              id: true,
              name: true,
              amount: true,
            },
          },
        },
      });

      // تحديث المسؤولين إذا تم تحديدهم
      if (responsibleUserIds !== undefined) {
        // حذف المسؤولين الحاليين
        await tx.studyMaterialResponsible.deleteMany({
          where: { studyMaterialId: id },
        });

        // إضافة المسؤولين الجدد
        if (responsibleUserIds.length > 0) {
          await tx.studyMaterialResponsible.createMany({
            data: responsibleUserIds.map(responsibleUserId => ({
              studyMaterialId: id,
              userId: responsibleUserId,
              assignedBy: userId,
            })),
          });
        }
      }

      return updatedMaterial;
    });
  }

  /**
   * حذف أداة دراسية
   */
  async remove(id: string) {
    const material = await this.prisma.studyMaterial.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundException('الأداة الدراسية غير موجودة');
    }

    if (material._count.deliveries > 0) {
      throw new BadRequestException(
        'لا يمكن حذف أداة دراسية تحتوي على سجلات تسليم. يمكنك تعطيلها بدلاً من ذلك.',
      );
    }

    await this.prisma.studyMaterial.delete({
      where: { id },
    });

    return { message: 'تم حذف الأداة الدراسية بنجاح' };
  }

  /**
   * إنشاء سجل تسليم جديد
   */
  async createDelivery(createDto: CreateDeliveryDto, userId: string) {
    // التحقق من وجود الأداة الدراسية
    const material = await this.prisma.studyMaterial.findUnique({
      where: { id: createDto.studyMaterialId },
      include: {
        linkedFee: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundException('الأداة الدراسية غير موجودة');
    }

    // التحقق من توفر الكمية
    const quantity = createDto.quantity || 1;
    if (material.quantity < quantity) {
      throw new BadRequestException('الكمية المتاحة غير كافية');
    }

    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: createDto.traineeId },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من أن المتدرب في نفس البرنامج
    if (trainee.programId !== material.programId) {
      throw new BadRequestException(
        'المتدرب لا ينتمي لنفس البرنامج التدريبي الخاص بالأداة الدراسية',
      );
    }

    // ✅ التحقق من سداد الرسم المرتبط (إذا كان موجوداً)
    if (material.linkedFeeId) {
      // جلب حالة سداد المتدرب للرسم المرتبط
      const traineePayment = await this.prisma.traineePayment.findFirst({
        where: {
          traineeId: createDto.traineeId,
          feeId: material.linkedFeeId,
        },
      });

      // التحقق من وجود الرسم وأن المبلغ المدفوع يساوي المبلغ المطلوب
      if (!traineePayment) {
        throw new BadRequestException(
          `لا يمكن التسليم: يجب سداد رسم "${material.linkedFee?.name}" (${material.linkedFee?.amount} جنيه مصري) بالكامل أولاً`,
        );
      }

      if (traineePayment.paidAmount < material.linkedFee.amount) {
        const remainingAmount = material.linkedFee.amount - traineePayment.paidAmount;
        throw new BadRequestException(
          `لا يمكن التسليم: المتدرب لم يسدد رسم "${material.linkedFee?.name}" بالكامل. المبلغ المتبقي: ${remainingAmount} جنيه مصري`,
        );
      }
    }

    // التحقق من عدم وجود تسليم مسبق نشط
    const existingDelivery = await this.prisma.studyMaterialDelivery.findUnique({
      where: {
        studyMaterialId_traineeId: {
          studyMaterialId: createDto.studyMaterialId,
          traineeId: createDto.traineeId,
        },
      },
    });

    // السماح بالتسليم فقط إذا لم يكن هناك تسليم مسبق أو كان مسلم مسبقاً وتم إرجاعه
    if (existingDelivery && existingDelivery.status !== 'RETURNED') {
      const statusMessages = {
        'PENDING': 'تم تسجيل طلب تسليم هذه الأداة للمتدرب مسبقاً ولم يتم تسليمها بعد',
        'DELIVERED': 'تم تسليم هذه الأداة للمتدرب مسبقاً ولم يتم إرجاعها بعد',
        'LOST': 'تم تسجيل فقدان هذه الأداة للمتدرب مسبقاً'
      };
      
      throw new ConflictException(statusMessages[existingDelivery.status] || 'تم تسليم هذه الأداة للمتدرب مسبقاً ولم يتم إرجاعها بعد');
    }

    // استخدام transaction للتأكد من تناسق البيانات
    const delivery = await this.prisma.$transaction(async (tx) => {
      // تقليل الكمية
      await tx.studyMaterial.update({
        where: { id: createDto.studyMaterialId },
        data: { quantity: { decrement: quantity } },
      });

      // إنشاء سجل التسليم
      if (existingDelivery) {
        // تحديث السجل الموجود
        return tx.studyMaterialDelivery.update({
          where: { id: existingDelivery.id },
          data: {
            quantity,
            notes: createDto.notes,
            deliveredBy: userId,
            deliveryDate: new Date(),
            status: 'DELIVERED',
            returnDate: null,
            returnedBy: null,
            returnNotes: null,
          },
          include: {
            studyMaterial: {
              select: {
                id: true,
                name: true,
                nameEn: true,
              },
            },
            trainee: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
                nationalId: true,
                phone: true,
              },
            },
          },
        });
      } else {
        // إنشاء سجل جديد
        return tx.studyMaterialDelivery.create({
          data: {
            studyMaterialId: createDto.studyMaterialId,
            traineeId: createDto.traineeId,
            quantity,
            notes: createDto.notes,
            deliveredBy: userId,
            deliveryDate: new Date(),
            status: 'DELIVERED',
          },
          include: {
            studyMaterial: {
              select: {
                id: true,
                name: true,
                nameEn: true,
              },
            },
            trainee: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
                nationalId: true,
                phone: true,
              },
            },
          },
        });
      }
    });

    return delivery;
  }

  /**
   * جلب جميع سجلات التسليم مع الفلترة
   */
  async findAllDeliveries(query: QueryDeliveriesDto) {
    const {
      studyMaterialId,
      traineeId,
      programId,
      status,
      search,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (studyMaterialId) {
      whereConditions.studyMaterialId = studyMaterialId;
    }

    if (traineeId) {
      whereConditions.traineeId = traineeId;
    }

    if (status) {
      whereConditions.status = status;
    }

    if (programId) {
      whereConditions.studyMaterial = {
        programId: programId,
      };
    }

    if (search) {
      whereConditions.trainee = {
        OR: [
          { nameAr: { contains: search } },
          { nameEn: { contains: search } },
          { nationalId: { contains: search } },
        ],
      };
    }

    const [deliveries, total] = await Promise.all([
      this.prisma.studyMaterialDelivery.findMany({
        where: whereConditions,
        include: {
          studyMaterial: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              program: {
                select: {
                  id: true,
                  nameAr: true,
                  nameEn: true,
                },
              },
            },
          },
          trainee: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              nationalId: true,
              phone: true,
              photoUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.studyMaterialDelivery.count({
        where: whereConditions,
      }),
    ]);

    return {
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * جلب سجل تسليم محدد
   */
  async findOneDelivery(id: string) {
    const delivery = await this.prisma.studyMaterialDelivery.findUnique({
      where: { id },
      include: {
        studyMaterial: {
          include: {
            program: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
              },
            },
          },
        },
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
            phone: true,
            email: true,
            photoUrl: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException('سجل التسليم غير موجود');
    }

    return delivery;
  }

  /**
   * تحديث سجل تسليم
   */
  async updateDelivery(id: string, updateDto: UpdateDeliveryDto, userId: string) {
    const delivery = await this.prisma.studyMaterialDelivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new NotFoundException('سجل التسليم غير موجود');
    }

    const updateData: any = { ...updateDto };
    const oldStatus = delivery.status;
    const newStatus = updateDto.status;

    // إذا تم تحديث الحالة إلى RETURNED، تسجيل معلومات الإرجاع
    if (newStatus === 'RETURNED' && oldStatus !== 'RETURNED') {
      updateData.returnedBy = userId;
      if (!updateDto.returnDate) {
        updateData.returnDate = new Date();
      }
    }

    // إذا تم تحديث الحالة إلى DELIVERED، تسجيل معلومات التسليم
    if (newStatus === 'DELIVERED' && oldStatus !== 'DELIVERED') {
      updateData.deliveredBy = userId;
      if (!updateDto.deliveryDate) {
        updateData.deliveryDate = new Date();
      }
    }

    // استخدام transaction لتحديث الكمية عند الإرجاع
    return this.prisma.$transaction(async (tx) => {
      // إذا تم تغيير الحالة من DELIVERED إلى RETURNED، زيادة الكمية
      if (oldStatus === 'DELIVERED' && newStatus === 'RETURNED') {
        await tx.studyMaterial.update({
          where: { id: delivery.studyMaterialId },
          data: { quantity: { increment: delivery.quantity } },
        });
      }

      // إذا تم تغيير الحالة من RETURNED إلى DELIVERED، تقليل الكمية
      if (oldStatus === 'RETURNED' && newStatus === 'DELIVERED') {
        const material = await tx.studyMaterial.findUnique({
          where: { id: delivery.studyMaterialId },
        });

        if (!material || material.quantity < delivery.quantity) {
          throw new BadRequestException('الكمية المتاحة غير كافية');
        }

        await tx.studyMaterial.update({
          where: { id: delivery.studyMaterialId },
          data: { quantity: { decrement: delivery.quantity } },
        });
      }

      // تحديث سجل التسليم
      return tx.studyMaterialDelivery.update({
        where: { id },
        data: updateData,
        include: {
          studyMaterial: {
            select: {
              id: true,
              name: true,
              nameEn: true,
            },
          },
          trainee: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              nationalId: true,
              phone: true,
            },
          },
        },
      });
    });
  }

  /**
   * حذف سجل تسليم
   */
  async removeDelivery(id: string) {
    const delivery = await this.prisma.studyMaterialDelivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new NotFoundException('سجل التسليم غير موجود');
    }

    // استخدام transaction لإرجاع الكمية إذا كان التسليم نشطاً
    await this.prisma.$transaction(async (tx) => {
      // إذا كان التسليم في حالة DELIVERED، إرجاع الكمية
      if (delivery.status === 'DELIVERED') {
        await tx.studyMaterial.update({
          where: { id: delivery.studyMaterialId },
          data: { quantity: { increment: delivery.quantity } },
        });
      }

      // حذف سجل التسليم
      await tx.studyMaterialDelivery.delete({
        where: { id },
      });
    });

    return { message: 'تم حذف سجل التسليم بنجاح' };
  }

  /**
   * الحصول على إحصائيات الأدوات الدراسية
   */
  async getStats(programId?: number) {
    const whereConditions: any = {};
    if (programId) {
      whereConditions.programId = programId;
    }

    const [
      totalMaterials,
      activeMaterials,
      totalDeliveries,
      pendingDeliveries,
      deliveredCount,
      returnedCount,
    ] = await Promise.all([
      this.prisma.studyMaterial.count({ where: whereConditions }),
      this.prisma.studyMaterial.count({
        where: { ...whereConditions, isActive: true },
      }),
      this.prisma.studyMaterialDelivery.count({
        where: programId
          ? { studyMaterial: { programId } }
          : undefined,
      }),
      this.prisma.studyMaterialDelivery.count({
        where: {
          status: 'PENDING',
          ...(programId ? { studyMaterial: { programId } } : {}),
        },
      }),
      this.prisma.studyMaterialDelivery.count({
        where: {
          status: 'DELIVERED',
          ...(programId ? { studyMaterial: { programId } } : {}),
        },
      }),
      this.prisma.studyMaterialDelivery.count({
        where: {
          status: 'RETURNED',
          ...(programId ? { studyMaterial: { programId } } : {}),
        },
      }),
    ]);

    return {
      totalMaterials,
      activeMaterials,
      inactiveMaterials: totalMaterials - activeMaterials,
      totalDeliveries,
      pendingDeliveries,
      deliveredCount,
      returnedCount,
      lostCount: totalDeliveries - pendingDeliveries - deliveredCount - returnedCount,
    };
  }
}

