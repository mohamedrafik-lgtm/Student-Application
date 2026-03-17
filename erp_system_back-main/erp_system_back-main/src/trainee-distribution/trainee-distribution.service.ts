import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionDto } from './dto/update-distribution.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class TraineeDistributionService {
  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء توزيع جديد للمتدربين على المجموعات
   */
  async create(createDistributionDto: CreateDistributionDto, userId: string) {
    // التحقق من وجود البرنامج التدريبي
    const program = await this.prisma.trainingProgram.findUnique({
      where: { id: createDistributionDto.programId },
    });

    if (!program) {
      throw new NotFoundException('البرنامج التدريبي غير موجود');
    }

    // التحقق من صحة الفصل الدراسي إن وجد
    if (createDistributionDto.classroomId) {
      const classroom = await this.prisma.classroom.findUnique({
        where: { id: createDistributionDto.classroomId },
      });
      if (!classroom) {
        throw new NotFoundException('الفصل الدراسي غير موجود');
      }
      if (classroom.programId !== createDistributionDto.programId) {
        throw new BadRequestException('الفصل الدراسي لا ينتمي لهذا البرنامج');
      }
    }

    // التحقق من عدم وجود توزيع مسبق لهذا البرنامج من نفس النوع ونفس الفصل
    const existingDistribution = await this.prisma.traineeDistribution.findFirst({
      where: {
        programId: createDistributionDto.programId,
        type: createDistributionDto.type,
        classroomId: createDistributionDto.classroomId || null,
      },
    });

    if (existingDistribution) {
      const typeLabel = createDistributionDto.type === 'THEORY' ? 'النظري' : 'العملي';
      const classroomLabel = createDistributionDto.classroomId ? ' لهذا الفصل الدراسي' : '';
      throw new ConflictException(`يوجد توزيع مسبق لمجموعات ${typeLabel}${classroomLabel} في هذا البرنامج. يمكنك تعديله أو حذفه أولاً`);
    }

    // جلب المتدربين المرتبطين بالبرنامج بترتيب أبجدي
    const trainees = await this.prisma.trainee.findMany({
      where: {
        programId: createDistributionDto.programId,
        traineeStatus: {
          in: ['NEW', 'CURRENT'], // المتدربين الجدد والمستمرين فقط
        },
      },
      orderBy: {
        nameAr: 'asc', // ترتيب أبجدي
      },
    });

    if (trainees.length === 0) {
      throw new BadRequestException('لا يوجد متدربين في هذا البرنامج');
    }

    // التحقق من السعات المخصصة
    let roomCapacities: number[] = [];
    
    if (createDistributionDto.roomCapacities && createDistributionDto.roomCapacities.length > 0) {
      // استخدام السعات المخصصة
      roomCapacities = createDistributionDto.roomCapacities;
      
      // التحقق من أن عدد السعات يطابق عدد المجموعات
      if (roomCapacities.length !== createDistributionDto.numberOfRooms) {
        throw new BadRequestException(
          `عدد السعات المحددة (${roomCapacities.length}) لا يطابق عدد المجموعات (${createDistributionDto.numberOfRooms})`
        );
      }
      
      // التحقق من أن مجموع السعات = عدد المتدربين
      const totalCapacity = roomCapacities.reduce((sum, cap) => sum + cap, 0);
      if (totalCapacity !== trainees.length) {
        throw new BadRequestException(
          `مجموع سعات المجموعات (${totalCapacity}) لا يساوي عدد المتدربين (${trainees.length})`
        );
      }
      
      // التحقق من أن كل سعة > 0
      if (roomCapacities.some(cap => cap <= 0)) {
        throw new BadRequestException('يجب أن تكون سعة كل مجموعة أكبر من صفر');
      }
    } else {
      // التوزيع التلقائي المتساوي
      const traineesPerRoom = Math.ceil(trainees.length / createDistributionDto.numberOfRooms);
      roomCapacities = Array(createDistributionDto.numberOfRooms).fill(traineesPerRoom);
      
      // تعديل المجموعة الأخيرة لتناسب العدد الفعلي
      const lastRoomIndex = roomCapacities.length - 1;
      const assignedSoFar = traineesPerRoom * (roomCapacities.length - 1);
      roomCapacities[lastRoomIndex] = trainees.length - assignedSoFar;
    }

    // الحصول على العام الدراسي الحالي تلقائياً
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}/${currentYear + 1}`;

    // إنشاء التوزيع الأساسي
    const distribution = await this.prisma.traineeDistribution.create({
      data: {
        programId: createDistributionDto.programId,
        type: createDistributionDto.type,
        numberOfRooms: createDistributionDto.numberOfRooms,
        academicYear,
        createdBy: userId,
        classroomId: createDistributionDto.classroomId || null,
      },
    });

    // إنشاء المجموعات وتوزيع المتدربين
    const typePrefix = createDistributionDto.type === 'THEORY' ? 'مجموعة النظري' : 'مجموعة العملي';
    
    let currentTraineeIndex = 0;
    
    for (let i = 0; i < createDistributionDto.numberOfRooms; i++) {
      // اسم المجموعة افتراضي حسب النوع
      const roomName = `${typePrefix} ${i + 1}`;
      const roomCapacity = roomCapacities[i];

      const room = await this.prisma.distributionRoom.create({
        data: {
          distributionId: distribution.id,
          roomName,
          roomNumber: i + 1,
          capacity: roomCapacity,
        },
      });

      // تحديد المتدربين المخصصين لهذه المجموعة
      const roomTrainees = trainees.slice(currentTraineeIndex, currentTraineeIndex + roomCapacity);

      // إنشاء التخصيصات
      for (let j = 0; j < roomTrainees.length; j++) {
        await this.prisma.distributionAssignment.create({
          data: {
            roomId: room.id,
            traineeId: roomTrainees[j].id,
            orderNumber: j + 1,
          },
        });
      }
      
      currentTraineeIndex += roomCapacity;
    }

    console.log(`✅ تم توزيع ${trainees.length} متدرب على ${createDistributionDto.numberOfRooms} مجموعة`);
    console.log(`📊 السعات: ${roomCapacities.join(', ')}`);

    return this.findOne(distribution.id);
  }

  /**
   * جلب جميع التوزيعات
   */
  async findAll(filters?: { programId?: number; type?: string; academicYear?: string; classroomId?: number }) {
    const where: any = {};

    if (filters?.programId) {
      where.programId = filters.programId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.academicYear) {
      where.academicYear = filters.academicYear;
    }

    if (filters?.classroomId !== undefined) {
      where.classroomId = filters.classroomId || null;
    }

    return this.prisma.traineeDistribution.findMany({
      where,
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            classNumber: true,
            startDate: true,
            endDate: true,
          },
        },
        rooms: {
          include: {
            assignments: {
              include: {
                trainee: {
                  select: {
                    id: true,
                    nameAr: true,
                    nameEn: true,
                    nationalId: true,
                    phone: true,
                    guardianPhone: true,
                    photoUrl: true,
                  },
                },
              },
              orderBy: {
                orderNumber: 'asc',
              },
            },
            _count: {
              select: {
                assignments: true,
              },
            },
          },
          orderBy: {
            roomNumber: 'asc',
          },
        },
        _count: {
          select: {
            rooms: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * جلب توزيع محدد
   */
  async findOne(id: string) {
        const distribution = await this.prisma.traineeDistribution.findUnique({
          where: { id: id },
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            classNumber: true,
            startDate: true,
            endDate: true,
          },
        },
        rooms: {
          include: {
            assignments: {
              include: {
                trainee: {
                  select: {
                    id: true,
                    nameAr: true,
                    nameEn: true,
                    nationalId: true,
                    phone: true,
                    guardianPhone: true,
                    email: true,
                    photoUrl: true,
                  },
                },
              },
              orderBy: {
                orderNumber: 'asc',
              },
            },
          },
          orderBy: {
            roomNumber: 'asc',
          },
        },
      },
    });

    if (!distribution) {
      throw new NotFoundException('التوزيع غير موجود');
    }

    return distribution;
  }

  /**
   * تحديث توزيع
   */
  async update(id: string, updateDistributionDto: UpdateDistributionDto, userId: string) {
        const distribution = await this.prisma.traineeDistribution.findUnique({
          where: { id: id },
    });

    if (!distribution) {
      throw new NotFoundException('التوزيع غير موجود');
    }

    // إذا تم تغيير عدد المجموعات، نحتاج لإعادة التوزيع
    if (updateDistributionDto.numberOfRooms && 
        updateDistributionDto.numberOfRooms !== distribution.numberOfRooms) {
      
      // حذف المجموعات والتخصيصات القديمة
        await this.prisma.distributionRoom.deleteMany({
          where: { distributionId: id },
      });

      // تحديث عدد المجموعات
      await this.prisma.traineeDistribution.update({
        where: { id: id },
        data: {
          numberOfRooms: updateDistributionDto.numberOfRooms,
        },
      });

      // إعادة التوزيع
      await this.redistribute(id);
    }

    return this.findOne(id);
  }

  /**
   * حذف توزيع
   */
  async remove(id: string) {
        const distribution = await this.prisma.traineeDistribution.findUnique({
          where: { id: id },
    });

    if (!distribution) {
      throw new NotFoundException('التوزيع غير موجود');
    }

      await this.prisma.traineeDistribution.delete({
        where: { id: id },
    });

    return { message: 'تم حذف التوزيع بنجاح' };
  }

  /**
   * إضافة متدرب إلى مجموعة لأول مرة
   */
  async createAssignment(createAssignmentDto: CreateAssignmentDto) {
    // التحقق من وجود المجموعة
    const room = await this.prisma.distributionRoom.findUnique({
      where: { id: createAssignmentDto.roomId },
      include: {
        distribution: {
          select: {
            programId: true,
            type: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('المجموعة غير موجودة');
    }

    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: createAssignmentDto.traineeId },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من أن المتدرب ينتمي لنفس البرنامج
    if (trainee.programId !== room.distribution.programId) {
      throw new BadRequestException('المتدرب لا ينتمي لنفس البرنامج');
    }

    // التحقق من عدم وجود المتدرب بالفعل في أي مجموعة من نفس النوع
    const existingAssignment = await this.prisma.distributionAssignment.findFirst({
      where: {
        traineeId: createAssignmentDto.traineeId,
        room: {
          distribution: {
            programId: room.distribution.programId,
            type: room.distribution.type,
          },
        },
      },
    });

    if (existingAssignment) {
      const typeLabel = room.distribution.type === 'THEORY' ? 'النظري' : 'العملي';
      throw new ConflictException(`المتدرب موجود بالفعل في مجموعة ${typeLabel}`);
    }

    // حساب رقم الترتيب الجديد
    const assignmentsCount = await this.prisma.distributionAssignment.count({
      where: { roomId: createAssignmentDto.roomId },
    });

    // إنشاء التخصيص
    return this.prisma.distributionAssignment.create({
      data: {
        roomId: createAssignmentDto.roomId,
        traineeId: createAssignmentDto.traineeId,
        orderNumber: assignmentsCount + 1,
        notes: createAssignmentDto.notes,
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
            phone: true,
            guardianPhone: true,
            email: true,
            photoUrl: true,
          },
        },
        room: {
          select: {
            id: true,
            roomName: true,
            roomNumber: true,
          },
        },
      },
    });
  }

  /**
   * تحديث تخصيص متدرب (نقله إلى مجموعة أخرى)
   */
  async updateAssignment(assignmentId: string, updateAssignmentDto: UpdateAssignmentDto) {
    const assignment = await this.prisma.distributionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        room: {
          include: {
            distribution: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('التخصيص غير موجود');
    }

    // التحقق من أن المجموعة الجديدة تنتمي لنفس التوزيع
    const newRoom = await this.prisma.distributionRoom.findUnique({
      where: { id: updateAssignmentDto.roomId },
    });

    if (!newRoom || newRoom.distributionId !== assignment.room.distributionId) {
      throw new BadRequestException('المجموعة المحددة غير صالحة');
    }

    // حساب رقم الترتيب الجديد في المجموعة الجديدة
    const assignmentsInNewRoom = await this.prisma.distributionAssignment.count({
      where: { roomId: updateAssignmentDto.roomId },
    });

    return this.prisma.distributionAssignment.update({
      where: { id: assignmentId },
      data: {
        roomId: updateAssignmentDto.roomId,
        orderNumber: assignmentsInNewRoom + 1,
        notes: updateAssignmentDto.notes,
      },
      include: {
        trainee: true,
        room: true,
      },
    });
  }

  /**
   * إعادة توزيع المتدربين بشكل تلقائي
   */
  async redistribute(id: string) {
    // جلب التوزيع مع المجموعات
        const distribution = await this.prisma.traineeDistribution.findUnique({
          where: { id: id },
      include: {
        rooms: {
          orderBy: {
            roomNumber: 'asc',
          },
        },
      },
    });

    if (!distribution) {
      throw new NotFoundException('التوزيع غير موجود');
    }

    // حذف جميع التخصيصات الحالية
        await this.prisma.distributionAssignment.deleteMany({
          where: {
            room: {
              distributionId: id,
            },
          },
        });

    // جلب المتدربين بترتيب أبجدي
    const trainees = await this.prisma.trainee.findMany({
      where: {
        programId: distribution.programId,
        traineeStatus: {
          in: ['NEW', 'CURRENT'],
        },
      },
      orderBy: {
        nameAr: 'asc',
      },
    });

    const traineesPerRoom = Math.ceil(trainees.length / (distribution as any).rooms.length);

    // إعادة التوزيع
    for (let i = 0; i < (distribution as any).rooms.length; i++) {
      const room = (distribution as any).rooms[i];
      const startIndex = i * traineesPerRoom;
      const endIndex = Math.min(startIndex + traineesPerRoom, trainees.length);
      const roomTrainees = trainees.slice(startIndex, endIndex);

      for (let j = 0; j < roomTrainees.length; j++) {
        await this.prisma.distributionAssignment.create({
          data: {
            roomId: room.id,
            traineeId: roomTrainees[j].id,
            orderNumber: j + 1,
          },
        });
      }
    }

    return this.findOne(id);
  }

  /**
   * تحديث اسم مجموعة
   */
  async updateRoomName(roomId: string, roomName: string) {
    const room = await this.prisma.distributionRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('المجموعة غير موجودة');
    }

    return this.prisma.distributionRoom.update({
      where: { id: roomId },
      data: { roomName },
    });
  }

  /**
   * جلب المتدربين الغير موزعين
   */
  async getUndistributedTrainees(filters: {
    programId?: number;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // بناء شروط البحث
    const whereConditions: any = {};

    if (filters.programId) {
      whereConditions.programId = filters.programId;
    }

    if (filters.search) {
      whereConditions.OR = [
        { nameAr: { contains: filters.search } },
        { nameEn: { contains: filters.search } },
        { nationalId: { contains: filters.search } },
      ];
    }

    // جلب جميع المتدربين حسب الشروط
    const allTrainees = await this.prisma.trainee.findMany({
      where: whereConditions,
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    });

    // جلب جميع التوزيعات
    const distributionFilters: any = {};
    if (filters.programId) {
      distributionFilters.programId = filters.programId;
    }
    if (filters.type) {
      distributionFilters.type = filters.type;
    }

    const distributions = await this.prisma.traineeDistribution.findMany({
      where: distributionFilters,
      include: {
        rooms: {
          include: {
            assignments: {
              select: {
                traineeId: true,
              },
            },
          },
        },
      },
    });

    // جمع IDs المتدربين الموزعين
    const distributedTraineeIds = new Set<number>();
    distributions.forEach((dist) => {
      dist.rooms.forEach((room) => {
        room.assignments.forEach((assignment) => {
          distributedTraineeIds.add(assignment.traineeId);
        });
      });
    });

    // فلترة المتدربين الغير موزعين
    const undistributedTrainees = allTrainees.filter(
      (trainee) => !distributedTraineeIds.has(trainee.id),
    );

    // تطبيق pagination
    const total = undistributedTrainees.length;
    const paginatedTrainees = undistributedTrainees.slice(skip, skip + limit);

    return {
      trainees: paginatedTrainees,
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
   * جلب التوزيعات المفعلة (النشطة) حسب تاريخ الفصل الدراسي
   * يرجع التوزيعات التي ينتمي فصلها الدراسي للتاريخ الحالي
   * إذا لم توجد توزيعة للفصل الحالي، يرجع آخر توزيعة متاحة
   */
  async getActiveDistributions(programId: number) {
    const now = new Date();

    // جلب جميع الفصول الدراسية للبرنامج مع تواريخها
    const classrooms = await this.prisma.classroom.findMany({
      where: { programId },
      orderBy: { classNumber: 'asc' },
    });

    // البحث عن الفصل الدراسي الحالي (التاريخ الحالي بين startDate و endDate)
    let activeClassroom = classrooms.find(c => {
      if (!c.startDate || !c.endDate) return false;
      return now >= c.startDate && now <= c.endDate;
    });

    // إذا لم يوجد فصل حالي، نبحث عن آخر فصل انتهى
    if (!activeClassroom) {
      const pastClassrooms = classrooms
        .filter(c => c.endDate && now > c.endDate)
        .sort((a, b) => (b.endDate!.getTime() - a.endDate!.getTime()));
      
      if (pastClassrooms.length > 0) {
        activeClassroom = pastClassrooms[0];
      }
    }

    // إذا لم يوجد أي فصل بتواريخ، نرجع التوزيعات بدون فصل (القديمة)
    if (!activeClassroom) {
      return this.findAll({ programId, classroomId: 0 }); // classroomId=0 means null
    }

    // جلب توزيعات الفصل الحالي
    const distributions = await this.prisma.traineeDistribution.findMany({
      where: {
        programId,
        classroomId: activeClassroom.id,
      },
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            classNumber: true,
            startDate: true,
            endDate: true,
          },
        },
        rooms: {
          include: {
            assignments: {
              include: {
                trainee: {
                  select: {
                    id: true,
                    nameAr: true,
                    nameEn: true,
                    nationalId: true,
                    phone: true,
                    guardianPhone: true,
                    photoUrl: true,
                  },
                },
              },
              orderBy: {
                orderNumber: 'asc',
              },
            },
            _count: {
              select: {
                assignments: true,
              },
            },
          },
          orderBy: {
            roomNumber: 'asc',
          },
        },
        _count: {
          select: {
            rooms: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // إذا لم توجد توزيعات للفصل الحالي، نبحث في الفصول السابقة
    if (distributions.length === 0) {
      // البحث في الفصول السابقة بترتيب تنازلي
      for (const classroom of classrooms.sort((a, b) => b.classNumber - a.classNumber)) {
        if (classroom.id === activeClassroom.id) continue;
        
        const fallbackDistributions = await this.prisma.traineeDistribution.findMany({
          where: {
            programId,
            classroomId: classroom.id,
          },
          include: {
            program: { select: { id: true, nameAr: true, nameEn: true } },
            classroom: { select: { id: true, name: true, classNumber: true, startDate: true, endDate: true } },
            rooms: {
              include: {
                assignments: {
                  include: {
                    trainee: { select: { id: true, nameAr: true, nameEn: true, nationalId: true, phone: true, guardianPhone: true, photoUrl: true } },
                  },
                  orderBy: { orderNumber: 'asc' },
                },
                _count: { select: { assignments: true } },
              },
              orderBy: { roomNumber: 'asc' },
            },
            _count: { select: { rooms: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (fallbackDistributions.length > 0) {
          return fallbackDistributions;
        }
      }

      // آخر محاولة: التوزيعات بدون فصل (القديمة)
      return this.prisma.traineeDistribution.findMany({
        where: {
          programId,
          classroomId: null,
        },
        include: {
          program: { select: { id: true, nameAr: true, nameEn: true } },
          classroom: { select: { id: true, name: true, classNumber: true, startDate: true, endDate: true } },
          rooms: {
            include: {
              assignments: {
                include: {
                  trainee: { select: { id: true, nameAr: true, nameEn: true, nationalId: true, phone: true, guardianPhone: true, photoUrl: true } },
                },
                orderBy: { orderNumber: 'asc' },
              },
              _count: { select: { assignments: true } },
            },
            orderBy: { roomNumber: 'asc' },
          },
          _count: { select: { rooms: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return distributions;
  }

  /**
   * نسخ توزيعة قديمة إلى فصل دراسي جديد
   * ينسخ نفس المجموعات ونفس ترتيب الطلاب
   */
  async copyDistribution(sourceId: string, targetClassroomId: number, userId: string) {
    // جلب التوزيعة المصدر مع كل التفاصيل
    const source = await this.prisma.traineeDistribution.findUnique({
      where: { id: sourceId },
      include: {
        rooms: {
          include: {
            assignments: {
              orderBy: { orderNumber: 'asc' },
            },
          },
          orderBy: { roomNumber: 'asc' },
        },
      },
    });

    if (!source) {
      throw new NotFoundException('التوزيعة المصدر غير موجودة');
    }

    // التحقق من وجود الفصل الدراسي المستهدف
    const targetClassroom = await this.prisma.classroom.findUnique({
      where: { id: targetClassroomId },
    });

    if (!targetClassroom) {
      throw new NotFoundException('الفصل الدراسي المستهدف غير موجود');
    }

    if (targetClassroom.programId !== source.programId) {
      throw new BadRequestException('الفصل الدراسي المستهدف لا ينتمي لنفس البرنامج');
    }

    // التحقق من عدم وجود توزيعة مسبقة بنفس النوع في الفصل المستهدف
    const existing = await this.prisma.traineeDistribution.findFirst({
      where: {
        programId: source.programId,
        type: source.type,
        classroomId: targetClassroomId,
      },
    });

    if (existing) {
      const typeLabel = source.type === 'THEORY' ? 'النظري' : 'العملي';
      throw new ConflictException(`يوجد توزيعة مسبقة لمجموعات ${typeLabel} في هذا الفصل الدراسي. قم بحذفها أولاً`);
    }

    // الحصول على العام الدراسي
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}/${currentYear + 1}`;

    // إنشاء التوزيعة الجديدة
    const newDistribution = await this.prisma.traineeDistribution.create({
      data: {
        programId: source.programId,
        type: source.type,
        numberOfRooms: source.numberOfRooms,
        academicYear,
        createdBy: userId,
        classroomId: targetClassroomId,
      },
    });

    // نسخ المجموعات والتخصيصات
    for (const room of source.rooms) {
      const newRoom = await this.prisma.distributionRoom.create({
        data: {
          distributionId: newDistribution.id,
          roomName: room.roomName,
          roomNumber: room.roomNumber,
          capacity: room.capacity,
        },
      });

      // نسخ تخصيصات الطلاب بنفس الترتيب
      for (const assignment of room.assignments) {
        // التحقق من أن المتدرب لا يزال موجوداً ومفعلاً
        const trainee = await this.prisma.trainee.findFirst({
          where: {
            id: assignment.traineeId,
            traineeStatus: { in: ['NEW', 'CURRENT'] },
          },
        });

        if (trainee) {
          await this.prisma.distributionAssignment.create({
            data: {
              roomId: newRoom.id,
              traineeId: assignment.traineeId,
              orderNumber: assignment.orderNumber,
              notes: assignment.notes,
            },
          });
        }
      }
    }

    console.log(`✅ تم نسخ التوزيعة "${sourceId}" إلى الفصل الدراسي ${targetClassroomId}`);

    return this.findOne(newDistribution.id);
  }
}
