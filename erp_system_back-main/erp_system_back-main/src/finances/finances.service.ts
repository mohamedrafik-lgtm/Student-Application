import { BadRequestException, Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialAuditService, AuditContext } from './financial-audit.service';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';
import { WhatsAppQueueService } from '../whatsapp/whatsapp-queue.service';
import { CreateSafeDto } from './dto/create-safe.dto';
import { UpdateSafeDto } from './dto/update-safe.dto';
import { CreateTransactionDto, TransactionType } from './dto/create-transaction.dto';
import { CreateTraineeFeeDto, FeeType } from './dto/create-trainee-fee.dto';
import { UpdateTraineeFeeDto } from './dto/update-trainee-fee.dto';
import { ApplyTraineeFeeDto } from './dto/apply-trainee-fee.dto';
import { CreateTraineePaymentDto } from './dto/create-trainee-payment.dto';

@Injectable()
export class FinancesService {
  constructor(
    private prisma: PrismaService,
    private auditService: FinancialAuditService,
    @Inject(forwardRef(() => UnifiedWhatsAppService))
    private whatsappService: UnifiedWhatsAppService,
    @Inject(forwardRef(() => WhatsAppQueueService))
    private whatsappQueueService: WhatsAppQueueService,
  ) {}

  /**
   * إنشاء سياق التدقيق من معلومات الطلب
   */
  private async createAuditContext(userId: string, req?: any): Promise<AuditContext> {
    let userName = req?.user?.name;
    let userRole = req?.user?.accountType || req?.user?.role;

    // إذا لم يتوفر الاسم من الطلب، اجلبه من قاعدة البيانات
    if (!userName && userId) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, accountType: true }
        });
        if (user) {
          userName = user.name;
          if (!userRole) userRole = user.accountType;
        }
      } catch (e) {
        // تجاهل الخطأ لعدم تعطيل العملية الأساسية
      }
    }

    return {
      userId,
      userName: userName || 'مستخدم غير معروف',
      userRole,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get?.('User-Agent'),
      sessionId: req?.sessionID,
    };
  }

  // ======== الخزائن ========

  async createSafe(createSafeDto: CreateSafeDto, userId?: string, req?: any) {
    try {
      console.log('📝 البيانات المستلمة لإنشاء الخزينة:', createSafeDto);
      
      // إضافة العملة الافتراضية إذا لم تكن موجودة
      const safeData = {
        ...createSafeDto,
        currency: createSafeDto.currency || 'EGP'
      };
      
      const safe = await this.prisma.safe.create({
        data: safeData,
      });

      console.log('✅ تم إنشاء الخزينة بنجاح:', safe);

      // تسجيل العملية في سجل التدقيق
      if (userId) {
        try {
          const context = await this.createAuditContext(userId, req);
          await this.auditService.logSafeCreation(safe, context);
        } catch (auditError) {
          console.error('خطأ في تسجيل التدقيق:', auditError);
        }
      }

      return safe;
    } catch (error) {
      console.error('❌ خطأ في إنشاء الخزينة:', error);
      console.error('📋 البيانات التي تسببت في الخطأ:', createSafeDto);
      
      if (error.code === 'P2002') {
        throw new BadRequestException('الخزينة موجودة بالفعل');
      }
      throw error;
    }
  }

  async findAllSafes() {
    try {
      const safes = await this.prisma.safe.findMany({
        include: {
          sourceTransactions: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          targetTransactions: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // فحص وجود معاملات بطريقة دقيقة لكل خزينة
      const safesWithTransactionInfo = await Promise.all(
        safes.map(async (safe) => {
          const transactionCount = await this.prisma.transaction.count({
            where: {
              OR: [
                { sourceId: safe.id },
                { targetId: safe.id }
              ]
            }
          });

          return {
            ...safe,
            hasTransactions: transactionCount > 0
          };
        })
      );

      console.log(`✅ تم جلب ${safesWithTransactionInfo.length} خزينة بنجاح`);
      return safesWithTransactionInfo;
    } catch (error) {
      console.error('❌ خطأ في جلب الخزائن:', error);
      throw error;
    }
  }

  async findSafeById(id: string) {
    const safe = await this.prisma.safe.findUnique({
      where: { id },
      include: {
        sourceTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        targetTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!safe) {
      throw new NotFoundException('الخزينة غير موجودة');
    }

    return safe;
  }

  async updateSafe(id: string, updateSafeDto: UpdateSafeDto, userId?: string, req?: any) {
    try {
      // التحقق من وجود الخزينة والحصول على البيانات القديمة
      const oldSafe = await this.findSafeById(id);

      // تحديث الخزينة
      const updatedSafe = await this.prisma.safe.update({
        where: { id },
        data: updateSafeDto,
      });

      // تسجيل العملية في سجل التدقيق
      if (userId) {
        try {
          const context = await this.createAuditContext(userId, req);
          await this.auditService.logSafeUpdate(id, oldSafe, updatedSafe, context);
        } catch (error) {
          console.error('فشل في تسجيل تدقيق تحديث الخزينة:', error);
        }
      }

      return updatedSafe;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('الاسم مستخدم بالفعل');
      }
      throw error;
    }
  }

  async deleteSafe(id: string, userId?: string, req?: any) {
    // التحقق من وجود الخزينة
    const existingSafe = await this.findSafeById(id);

    // التحقق من أن الخزينة فارغة (الرصيد = 0)
    if (existingSafe.balance !== 0) {
      throw new BadRequestException(
        `لا يمكن حذف الخزينة لأن رصيدها ${existingSafe.balance} ${existingSafe.currency}. يجب أن يكون الرصيد صفر لحذف الخزينة.`
      );
    }

    // التحقق من عدم وجود معاملات مرتبطة
    const relatedTransactions = await this.prisma.transaction.count({
      where: {
        OR: [
          { sourceId: id },
          { targetId: id }
        ]
      }
    });

    if (relatedTransactions > 0) {
      throw new BadRequestException(
        'لا يمكن حذف الخزينة لأنها تحتوي على معاملات مالية. يرجى إزالة المعاملات أولاً.'
      );
    }

    // التحقق من عدم وجود رسوم مرتبطة
    const relatedFees = await this.prisma.traineeFee.count({
      where: { safeId: id }
    });

    if (relatedFees > 0) {
      throw new BadRequestException(
        'لا يمكن حذف الخزينة لأنها مرتبطة برسوم متدربين. يرجى نقل الرسوم لخزينة أخرى أولاً.'
      );
    }

    // التحقق من عدم وجود مدفوعات مرتبطة
    const relatedPayments = await this.prisma.traineePayment.count({
      where: { safeId: id }
    });

    if (relatedPayments > 0) {
      throw new BadRequestException(
        'لا يمكن حذف الخزينة لأنها مرتبطة بمدفوعات متدربين.'
      );
    }

    // حذف الخزينة
    await this.prisma.safe.delete({
      where: { id }
    });

    // تسجيل العملية في سجل التدقيق
    if (userId) {
      try {
        const context = await this.createAuditContext(userId, req);
        await this.auditService.logSafeDelete(id, existingSafe, context);
      } catch (error) {
        console.error('فشل في تسجيل تدقيق حذف الخزينة:', error);
      }
    }

    return { message: 'تم حذف الخزينة بنجاح' };
  }

  // ======== المعاملات المالية ========

  async createTransaction(createTransactionDto: CreateTransactionDto, userId?: string, req?: any) {
    const { type, amount, sourceId, targetId } = createTransactionDto;

    // التحقق من صحة المعاملة حسب نوعها
    switch (type) {
      case TransactionType.DEPOSIT:
        if (!targetId) {
          throw new BadRequestException('يجب تحديد الخزينة الهدف للإيداع');
        }
        break;
      case TransactionType.WITHDRAW:
        if (!sourceId) {
          throw new BadRequestException('يجب تحديد الخزينة المصدر للسحب');
        }
        break;
      case TransactionType.TRANSFER:
        if (!sourceId || !targetId) {
          throw new BadRequestException('يجب تحديد الخزينة المصدر والهدف للتحويل');
        }
        if (sourceId === targetId) {
          throw new BadRequestException('لا يمكن التحويل إلى نفس الخزينة');
        }
        break;
    }

    // التحقق من وجود الخزائن المعنية
    let sourceSafe = null;
    let targetSafe = null;

    if (sourceId) {
      sourceSafe = await this.prisma.safe.findUnique({
        where: { id: sourceId },
      });

      if (!sourceSafe) {
        throw new NotFoundException('الخزينة المصدر غير موجودة');
      }

      // التحقق من وجود رصيد كافي للسحب أو التحويل
      if ((type === TransactionType.WITHDRAW || type === TransactionType.TRANSFER) && sourceSafe.balance < amount) {
        throw new BadRequestException('رصيد الخزينة المصدر غير كافٍ');
      }
    }

    if (targetId) {
      targetSafe = await this.prisma.safe.findUnique({
        where: { id: targetId },
      });

      if (!targetSafe) {
        throw new NotFoundException('الخزينة الهدف غير موجودة');
      }
    }

    // بدء معاملة قاعدة البيانات
    return this.prisma.$transaction(async (prisma) => {
      // تحسين وصف المعاملة حسب نوعها
      let enhancedDescription = createTransactionDto.description;
      if (type === TransactionType.TRANSFER && sourceSafe && targetSafe) {
        enhancedDescription = `تحويل من "${sourceSafe.name}" إلى "${targetSafe.name}" - مبلغ ${amount.toLocaleString()} جنيه${createTransactionDto.description ? ` - ${createTransactionDto.description}` : ''}`;
      } else if (type === TransactionType.DEPOSIT && targetSafe) {
        enhancedDescription = `إيداع في "${targetSafe.name}" - مبلغ ${amount.toLocaleString()} جنيه${createTransactionDto.description ? ` - ${createTransactionDto.description}` : ''}`;
      } else if (type === TransactionType.WITHDRAW && sourceSafe) {
        enhancedDescription = `سحب من "${sourceSafe.name}" - مبلغ ${amount.toLocaleString()} جنيه${createTransactionDto.description ? ` - ${createTransactionDto.description}` : ''}`;
      }

      // إنشاء المعاملة المالية
      const transaction = await prisma.transaction.create({
        data: {
          ...createTransactionDto,
          description: enhancedDescription,
          createdById: userId,
        },
      });

      // تحديث أرصدة الخزائن المعنية
      if (sourceId && (type === TransactionType.WITHDRAW || type === TransactionType.TRANSFER)) {
        await prisma.safe.update({
          where: { id: sourceId },
          data: { balance: { decrement: amount } },
        });
      }

      if (targetId && (type === TransactionType.DEPOSIT || type === TransactionType.TRANSFER)) {
        await prisma.safe.update({
          where: { id: targetId },
          data: { balance: { increment: amount } },
        });
      }

      return transaction;
    }).then(async (transaction) => {
      // تسجيل العملية في سجل التدقيق
      if (userId) {
        try {
          const context = await this.createAuditContext(userId, req);
          await this.auditService.logTransactionCreation(
            {
              id: transaction.id,
              type,
              amount,
              description: transaction.description,
              sourceId,
              targetId,
              sourceSafeName: sourceSafe?.name,
              targetSafeName: targetSafe?.name,
            },
            context,
          );
        } catch (error) {
          console.error('فشل في تسجيل تدقيق المعاملة المالية:', error);
        }
      }
      return transaction;
    });
  }

  async findTransactionsBySafe(
    safeId: string,
    limit = 1000,
    dateFrom?: string,
    dateTo?: string
  ) {
    console.log('📊 جلب معاملات الخزينة:', { safeId, limit, dateFrom, dateTo });

    // التحقق من وجود الخزينة
    await this.findSafeById(safeId);

    // بناء شروط الفلترة
    const where: any = {
      OR: [
        { sourceId: safeId },
        { targetId: safeId },
      ],
    };

    // إضافة فلترة التاريخ إذا تم تحديدها
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    try {
      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          include: {
            sourceSafe: {
              select: {
                id: true,
                name: true,
                balance: true,
                type: true,
                category: true,
                description: true,
              }
            },
            targetSafe: {
              select: {
                id: true,
                name: true,
                balance: true,
                type: true,
                category: true,
                description: true,
              }
            },
            createdBy: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.transaction.count({
          where
        })
      ]);

      console.log(`✅ تم جلب ${transactions.length} معاملة من أصل ${total} للخزينة ${safeId}`);

      return {
        success: true,
        data: transactions,
        total,
      };
    } catch (error) {
      console.error('❌ خطأ في جلب معاملات الخزينة:', error);
      throw error;
    }
  }

  // ======== رسوم المتدربين ========

  async createTraineeFee(createTraineeFeeDto: CreateTraineeFeeDto, userId?: string, req?: any) {
    const { programId, safeId } = createTraineeFeeDto;

    // التحقق من وجود البرنامج التدريبي
    const program = await this.prisma.trainingProgram.findUnique({
      where: { id: programId },
    });

    if (!program) {
      throw new NotFoundException('البرنامج التدريبي غير موجود');
    }

    // التحقق من وجود الخزينة
    const safe = await this.prisma.safe.findUnique({
      where: { id: safeId },
    });

    if (!safe) {
      throw new NotFoundException('الخزينة غير موجودة');
    }

    // إنشاء رسوم المتدربين
    const fee = await this.prisma.traineeFee.create({
      data: createTraineeFeeDto,
    });

    // تسجيل العملية في سجل التدقيق
    if (userId) {
      try {
        const context = await this.createAuditContext(userId, req);
        await this.auditService.logFeeCreation(fee, context);
      } catch (auditError) {
        console.error('خطأ في تسجيل التدقيق:', auditError);
      }
    }

    return fee;
  }

  async findAllTraineeFees(programId?: number) {
    const where: any = {};
    if (programId) {
      where.programId = programId;
    }
    
    return this.prisma.traineeFee.findMany({
      where,
      include: {
        program: true,
        safe: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTraineeFeesById(id: number) {
    const traineeFee = await this.prisma.traineeFee.findUnique({
      where: { id },
      include: {
        program: true,
        safe: true,
        traineePayments: {
          include: {
            trainee: true,
          },
        },
      },
    });

    if (!traineeFee) {
      throw new NotFoundException('رسوم المتدربين غير موجودة');
    }

    return traineeFee;
  }

  async findTraineeFeeReport(feeId: number, reportType?: string) {
    // الحصول على بيانات الرسم الأساسية
    const fee = await this.prisma.traineeFee.findUnique({
      where: { id: feeId },
      include: {
        program: true,
        safe: true,
      },
    });

    if (!fee) {
      throw new NotFoundException('رسوم المتدربين غير موجودة');
    }

    let traineePayments = [];

    // تحديد البيانات بناءً على نوع التقرير
    switch (reportType) {
      case 'paid':
        // المسددين للرسم فقط (PAID)
        traineePayments = await this.prisma.traineePayment.findMany({
          where: {
            feeId: feeId,
            status: 'PAID',
          },
          include: {
            trainee: {
              include: {
                traineeNotes: {
                  orderBy: { createdAt: 'desc' },
                  include: {
                    user: {
                      select: {
                        name: true,
                        id: true,
                      }
                    }
                  }
                }
              }
            },
            fee: true,
          },
        });
        break;

      case 'unpaid':
        // الغير مسددين للرسم (PENDING أو PARTIALLY_PAID)
        traineePayments = await this.prisma.traineePayment.findMany({
          where: {
            feeId: feeId,
            status: {
              in: ['PENDING', 'PARTIALLY_PAID'],
            },
          },
          include: {
            trainee: {
              include: {
                traineeNotes: {
                  orderBy: { createdAt: 'desc' },
                  include: {
                    user: {
                      select: {
                        name: true,
                        id: true,
                      }
                    }
                  }
                }
              }
            },
            fee: true,
          },
        });
        break;

      case 'paid-all-previous':
        // المسددين للرسم الحالي وكل الرسوم السابقة (الأقدم في createdAt)
        // يعرض متدرب واحد مع جميع رسومه المدفوعة مجمّعة (مثل تقرير الغير مسددين)
        
        // الخطوة 1: الحصول على جميع الرسوم في نفس البرنامج التي تم إنشاؤها قبل أو مع هذا الرسم
        const previousAndCurrentFees = await this.prisma.traineeFee.findMany({
          where: {
            programId: fee.programId,
            createdAt: {
              lte: fee.createdAt, // الرسوم الأقدم أو المساوية في التاريخ
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        const feeIds = previousAndCurrentFees.map(f => f.id);

        // الخطوة 2: الحصول على المتدربين الذين دفعوا جميع هذه الرسوم
        const allPaymentsForFees = await this.prisma.traineePayment.findMany({
          where: {
            feeId: {
              in: feeIds,
            },
          },
          include: {
            trainee: {
              include: {
                traineeNotes: {
                  orderBy: { createdAt: 'desc' },
                  include: {
                    user: {
                      select: {
                        name: true,
                        id: true,
                      }
                    }
                  }
                }
              }
            },
            fee: {
              select: {
                id: true,
                name: true,
                amount: true,
                createdAt: true,
              },
            },
          },
        });

        // تجميع المتدربين وحساب عدد الرسوم المدفوعة بالكامل لكل متدرب
        const traineePaymentMap = new Map();
        allPaymentsForFees.forEach(payment => {
          if (!traineePaymentMap.has(payment.traineeId)) {
            traineePaymentMap.set(payment.traineeId, {
              trainee: payment.trainee,
              payments: [],
              paidFees: [], // قائمة الرسوم المدفوعة
              paidCount: 0,
              totalFeesApplied: 0, // عدد الرسوم المطبقة فعلياً على هذا المتدرب
              totalPaid: 0,
              totalAmount: 0,
            });
          }
          const data = traineePaymentMap.get(payment.traineeId);
          data.payments.push(payment);
          data.totalFeesApplied++; // زيادة عدد الرسوم المطبقة
          data.totalAmount += payment.amount;
          data.totalPaid += payment.paidAmount;
          
          // يُحسب كـ "مدفوع بالكامل" فقط إذا كانت الحالة PAID
          if (payment.status === 'PAID') {
            data.paidCount++;
            data.paidFees.push({
              feeId: payment.feeId,
              feeName: payment.fee?.name || 'غير محدد',
              amount: payment.amount,
              paidAmount: payment.paidAmount,
              remainingAmount: 0, // مدفوع بالكامل
              status: payment.status,
              createdAt: payment.fee?.createdAt,
            });
          }
        });

        // فلترة المتدربين الذين دفعوا جميع الرسوم المطبقة عليهم بالكامل
        traineePayments = [];
        traineePaymentMap.forEach((data, traineeId) => {
          // المتدرب مؤهل فقط إذا:
          // 1. دفع جميع الرسوم المطبقة عليه فعلياً
          // 2. لديه نفس عدد الرسوم المطبقة = عدد جميع الرسوم في البرنامج
          if (data.paidCount === data.totalFeesApplied && data.totalFeesApplied === feeIds.length) {
            // إضافة سجل واحد للمتدرب مع جميع رسومه المدفوعة
            traineePayments.push({
              id: `trainee-${traineeId}`, // معرف فريد
              traineeId: traineeId,
              trainee: data.trainee,
              amount: data.totalAmount, // إجمالي المبالغ
              paidAmount: data.totalPaid, // إجمالي المدفوعات
              remainingAmount: 0, // لا يوجد متبقي
              status: 'PAID',
              paidFees: data.paidFees, // قائمة الرسوم المدفوعة
              paidFeesCount: data.paidFees.length,
              totalPaid: data.totalPaid,
              fee: fee, // الرسم الحالي للمرجعية
            });
          }
        });
        break;

      case 'unpaid-any-previous':
        // الغير مسددين للرسم الحالي بالكامل أو أي رسم سابق بالكامل
        // يعرض متدرب واحد مع جميع رسومه الغير مسددة مجمّعة
        
        // الخطوة 1: الحصول على جميع الرسوم السابقة والحالية
        const allPreviousAndCurrentFees = await this.prisma.traineeFee.findMany({
          where: {
            programId: fee.programId,
            createdAt: {
              lte: fee.createdAt,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        const allFeeIds = allPreviousAndCurrentFees.map(f => f.id);

        // الخطوة 2: الحصول على جميع المدفوعات لهذه الرسوم
        const allPayments = await this.prisma.traineePayment.findMany({
          where: {
            feeId: {
              in: allFeeIds,
            },
          },
          include: {
            trainee: {
              include: {
                traineeNotes: {
                  orderBy: { createdAt: 'desc' },
                  include: {
                    user: {
                      select: {
                        name: true,
                        id: true,
                      }
                    }
                  }
                }
              }
            },
            fee: {
              select: {
                id: true,
                name: true,
                amount: true,
                createdAt: true,
              },
            },
          },
        });

        // تجميع المتدربين وحساب إجمالي مديونياتهم من جميع الرسوم
        const traineeUnpaidMap = new Map();
        allPayments.forEach(payment => {
          if (!traineeUnpaidMap.has(payment.traineeId)) {
            traineeUnpaidMap.set(payment.traineeId, {
              trainee: payment.trainee,
              unpaidFees: [], // قائمة الرسوم الغير مدفوعة
              totalDebt: 0,
              totalPaid: 0,
              totalAmount: 0,
            });
          }
          const traineeData = traineeUnpaidMap.get(payment.traineeId);
          
          // إذا كان الدفع غير مسدد بالكامل
          if (payment.status === 'PENDING' || payment.status === 'PARTIALLY_PAID') {
            const remainingAmount = payment.amount - payment.paidAmount;
            traineeData.unpaidFees.push({
              feeId: payment.feeId,
              feeName: payment.fee?.name || 'غير محدد',
              amount: payment.amount,
              paidAmount: payment.paidAmount,
              remainingAmount: remainingAmount,
              status: payment.status,
              createdAt: payment.fee?.createdAt,
            });
            traineeData.totalDebt += remainingAmount;
            traineeData.totalPaid += payment.paidAmount;
            traineeData.totalAmount += payment.amount;
          }
        });

        // تحويل البيانات إلى تنسيق صالح للعرض
        // نُرجع متدرب واحد فقط مع كل رسومه الغير مدفوعة
        traineePayments = [];
        traineeUnpaidMap.forEach((data, traineeId) => {
          if (data.unpaidFees.length > 0) {
            // إضافة سجل واحد للمتدرب مع جميع رسومه الغير مدفوعة
            traineePayments.push({
              id: `trainee-${traineeId}`, // معرف فريد
              traineeId: traineeId,
              trainee: data.trainee,
              amount: data.totalAmount, // إجمالي المبالغ المطلوبة
              paidAmount: data.totalPaid, // إجمالي المدفوعات
              remainingAmount: data.totalDebt, // إجمالي المديونيات
              status: 'PARTIALLY_PAID',
              unpaidFees: data.unpaidFees, // قائمة الرسوم الغير مدفوعة
              unpaidFeesCount: data.unpaidFees.length,
              totalDebt: data.totalDebt,
              fee: fee, // الرسم الحالي للمرجعية
            });
          }
        });
        break;

      default:
        // افتراضي: جميع المتدربين المطبق عليهم الرسم
        traineePayments = await this.prisma.traineePayment.findMany({
          where: {
            feeId: feeId,
          },
          include: {
            trainee: {
              include: {
                traineeNotes: {
                  orderBy: { createdAt: 'desc' },
                  include: {
                    user: {
                      select: {
                        name: true,
                        id: true,
                      }
                    }
                  }
                }
              }
            },
            fee: true,
          },
        });
        break;
    }

    return {
      ...fee,
      traineePayments,
      reportType: reportType || 'all',
    };
  }

  async updateTraineeFee(id: number, updateTraineeFeeDto: UpdateTraineeFeeDto, userId?: string, req?: any) {
    // التحقق من وجود الرسوم
    const existingFee = await this.prisma.traineeFee.findUnique({
      where: { id },
    });

    if (!existingFee) {
      throw new NotFoundException('رسوم المتدربين غير موجودة');
    }

    // التحقق من أن الرسوم غير مطبقة
    if (existingFee.isApplied) {
      throw new BadRequestException('لا يمكن تعديل الرسوم المطبقة');
    }

    // التحقق من البرنامج التدريبي إذا تم تمريره
    if (updateTraineeFeeDto.programId) {
      const program = await this.prisma.trainingProgram.findUnique({
        where: { id: updateTraineeFeeDto.programId },
      });
      if (!program) {
        throw new BadRequestException('البرنامج التدريبي غير موجود');
      }
    }

    // التحقق من الخزينة إذا تم تمريرها
    if (updateTraineeFeeDto.safeId) {
      const safe = await this.findSafeById(updateTraineeFeeDto.safeId);
      if (!safe) {
        throw new BadRequestException('الخزينة غير موجودة');
      }
    }

    // تحديث الرسوم
    const updatedFee = await this.prisma.traineeFee.update({
      where: { id },
      data: updateTraineeFeeDto,
      include: {
        program: true,
        safe: true,
      },
    });

    // تسجيل العملية في سجل التدقيق
    if (userId) {
      try {
        const context = await this.createAuditContext(userId, req);
        await this.auditService.logFeeUpdate(
          id,
          existingFee,
          updatedFee,
          context
        );
      } catch (error) {
        console.error('فشل في تسجيل تدقيق تحديث الرسوم:', error);
      }
    }

    return updatedFee;
  }

  async deleteTraineeFee(id: number, userId?: string, req?: any) {
    // التحقق من وجود الرسوم
    const existingFee = await this.prisma.traineeFee.findUnique({
      where: { id },
      include: {
        program: true,
        safe: true,
      },
    });

    if (!existingFee) {
      throw new NotFoundException('رسوم المتدربين غير موجودة');
    }

    // التحقق من أن الرسوم غير مطبقة
    if (existingFee.isApplied) {
      throw new BadRequestException('لا يمكن حذف الرسوم المطبقة');
    }

    // التحقق من عدم وجود مدفوعات مرتبطة
    const relatedPayments = await this.prisma.traineePayment.count({
      where: { feeId: id },
    });

    if (relatedPayments > 0) {
      throw new BadRequestException('لا يمكن حذف الرسوم التي لديها مدفوعات مرتبطة');
    }

    // حذف الرسوم
    await this.prisma.traineeFee.delete({
      where: { id },
    });

    // تسجيل العملية في سجل التدقيق
    if (userId) {
      try {
        const context = await this.createAuditContext(userId, req);
        await this.auditService.logFeeDelete(
          id,
          existingFee,
          context
        );
      } catch (error) {
        console.error('فشل في تسجيل تدقيق حذف الرسوم:', error);
      }
    }

    return { message: 'تم حذف الرسوم بنجاح' };
  }

  async applyTraineeFee(id: number, applyTraineeFeeDto: ApplyTraineeFeeDto, userId?: string, req?: any) {
    // التحقق من وجود الرسوم
    const traineeFee = await this.prisma.traineeFee.findUnique({
      where: { id },
      include: {
        program: true,
        safe: true,
      },
    });

    if (!traineeFee) {
      throw new NotFoundException('رسوم المتدربين غير موجودة');
    }

    // التحقق مما إذا كانت الرسوم مطبقة بالفعل
    if (traineeFee.isApplied && !traineeFee.allowMultipleApply) {
      throw new BadRequestException('تم تطبيق الرسوم بالفعل ولا يمكن تطبيقها مرة أخرى');
    }

    // الحصول على المتدربين المراد تطبيق الرسوم عليهم
    let trainees;
    if (applyTraineeFeeDto.traineeIds && applyTraineeFeeDto.traineeIds.length > 0) {
      // استخدام المتدربين المحددين
      trainees = await this.prisma.trainee.findMany({
        where: {
          id: { in: applyTraineeFeeDto.traineeIds },
          programId: traineeFee.programId,
        },
      });

      if (trainees.length === 0) {
        throw new BadRequestException('لم يتم العثور على متدربين مطابقين');
      }
    } else {
      // استخدام جميع متدربي البرنامج
      trainees = await this.prisma.trainee.findMany({
        where: {
          programId: traineeFee.programId,
        },
      });

      if (trainees.length === 0) {
        throw new BadRequestException('لا يوجد متدربين في هذا البرنامج');
      }
    }

    // حساب إجمالي المبلغ
    const totalAmount = traineeFee.amount * trainees.length;

    // بدء معاملة قاعدة البيانات
    return this.prisma.$transaction(async (prisma) => {
      // إنشاء معاملة مالية للرسوم (خصم من الخزينة)
      const transaction = await prisma.transaction.create({
        data: {
          amount: totalAmount,
          type: TransactionType.FEE,
          description: `تطبيق رسوم: ${traineeFee.name} على ${trainees.length} متدرب - إجمالي ${totalAmount.toLocaleString()} جنيه${applyTraineeFeeDto.description ? ` - ${applyTraineeFeeDto.description}` : ''}`,
          sourceId: traineeFee.safeId,
          traineeFeeId: traineeFee.id,
          createdById: userId,
        },
      });

      // خصم المبلغ من الخزينة
      await prisma.safe.update({
        where: { id: traineeFee.safeId },
        data: { balance: { decrement: totalAmount } },
      });

      // إنشاء سجلات مدفوعات للمتدربين
      const traineePayments = await Promise.all(
        trainees.map((trainee) =>
          prisma.traineePayment.create({
            data: {
              amount: traineeFee.amount,
              feeId: traineeFee.id,
              traineeId: trainee.id,
              safeId: traineeFee.safeId,
              status: 'PENDING',
            },
          })
        )
      );

      // تحديث حالة الرسوم
      const updatedTraineeFee = await prisma.traineeFee.update({
        where: { id },
        data: {
          isApplied: true,
          appliedAt: new Date(),
          appliedById: userId,
        },
      });

      return {
        traineeFee: updatedTraineeFee,
        transaction,
        traineePayments,
        traineesCount: trainees.length,
        totalAmount,
      };
    }).then(async (result) => {
      // تسجيل العملية في سجل التدقيق خارج المعاملة
      if (userId) {
        try {
          const context = await this.createAuditContext(userId, req);
          const traineeIds = trainees.map(t => t.id);
          
          await this.auditService.logFeeApplication(
            traineeFee.id,
            traineeFee.name,
            traineeIds,
            traineeFee.amount,
            context
          );
        } catch (auditError) {
          console.error('خطأ في تسجيل التدقيق:', auditError);
        }
      }

      return result;
    });
  }

  // ======== مدفوعات المتدربين ========

  async createTraineePayment(createTraineePaymentDto: CreateTraineePaymentDto, userId?: string, req?: any) {
    const { feeId, traineeId, safeId, amount } = createTraineePaymentDto;

    // التحقق من أن المبلغ هو رقم موجب
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('المبلغ المدفوع يجب أن يكون رقمًا أكبر من صفر');
    }

    // التحقق من وجود الرسوم
    const traineeFee = await this.prisma.traineeFee.findUnique({
      where: { id: feeId },
      include: {
        safe: true, // لجلب بيانات الخزينة الأصلية للرسوم
      },
    });

    if (!traineeFee) {
      throw new NotFoundException('رسوم المتدربين غير موجودة');
    }

    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من وجود الخزينة
    const targetSafe = await this.prisma.safe.findUnique({
      where: { id: safeId },
    });

    if (!targetSafe) {
      throw new NotFoundException('الخزينة غير موجودة');
    }

    // التحقق من وجود مدفوعات سابقة للمتدرب لهذه الرسوم
    const existingPayment = await this.prisma.traineePayment.findFirst({
      where: {
        feeId,
        traineeId,
      },
    });

    if (!existingPayment) {
      throw new BadRequestException('لا توجد رسوم مطبقة على هذا المتدرب');
    }

    // التحقق من أن المبلغ المدفوع لا يتجاوز المبلغ المطلوب
    const remainingAmount = traineeFee.amount - existingPayment.paidAmount;
    if (amount > remainingAmount) {
      throw new BadRequestException(`المبلغ المدفوع يتجاوز المبلغ المطلوب. المبلغ المتبقي: ${remainingAmount}`);
    }

    // بدء معاملة قاعدة البيانات
    return this.prisma.$transaction(async (prisma) => {
      // تحديث سجل المدفوعات
      const updatedPayment = await prisma.traineePayment.update({
        where: { id: existingPayment.id },
        data: {
          paidAmount: { increment: amount },
          paidAt: new Date(),
          paidById: userId,
          status: amount + existingPayment.paidAmount >= traineeFee.amount ? 'PAID' : 'PARTIALLY_PAID',
          notes: createTraineePaymentDto.notes,
        },
      });

      let transactions = [];

      // إضافة المبلغ إلى الخزينة المستلمة
      await prisma.safe.update({
        where: { id: safeId },
        data: { balance: { increment: amount } },
      });

      // إنشاء معاملة مالية للدفع (إضافة للخزينة المستقبلة)
      const paymentDescription = safeId === traineeFee.safeId 
        ? `دفع مباشر: رسوم ${traineeFee.name} للمتدرب ${trainee.nameAr} - مبلغ ${amount.toLocaleString()} جنيه - تسوية مباشرة في نفس الخزينة`
        : `دفع وتسوية: رسوم ${traineeFee.name} للمتدرب ${trainee.nameAr} - دفع في "${targetSafe.name}" وتسوية الدين في خزينة الرسوم - مبلغ ${amount.toLocaleString()} جنيه`;
      
      const paymentTransaction = await prisma.transaction.create({
        data: {
          amount,
          type: TransactionType.PAYMENT,
          description: paymentDescription,
          targetId: safeId, // الخزينة المستقبلة للدفع
          traineePaymentId: updatedPayment.id,
          createdById: userId,
        },
      });
      transactions.push(paymentTransaction);

      // إذا كانت الخزينة المستقبلة مختلفة عن خزينة الرسوم الأصلية
      if (safeId !== traineeFee.safeId) {
        // تسوية الدين في خزينة الرسوم الأصلية (بدون تأثير على الخزينة المستقبلة)
        await prisma.safe.update({
          where: { id: traineeFee.safeId },
          data: { balance: { increment: amount } },
        });

        // تم تسوية الدين من خلال تحديث أرصدة الخزائن
        // لا نحتاج لمعاملة إضافية - المعاملة الأساسية كافية
      }

      return {
        payment: updatedPayment,
        transactions,
        transaction: paymentTransaction, // للتوافق مع الكود القديم
      };
    }).then(async (result) => {
      // تسجيل العمليات في سجل التدقيق خارج المعاملة
      if (userId) {
        try {
          const context = await this.createAuditContext(userId, req);
          
          // تسجيل إنشاء الدفعة - مع المبلغ الفعلي المدفوع
          await this.auditService.logPaymentCreation(
            {
              ...result.payment,
              _actualPaidAmount: amount,  // المبلغ الفعلي المدفوع في هذه العملية
              _safeName: targetSafe.name,  // اسم الخزينة المستقبلة
              _feeSafeName: traineeFee.safe?.name,  // اسم خزينة الرسوم
            },
            trainee, 
            traineeFee, 
            context
          );
          
          // تسجيل إنشاء المعاملة (مع أسماء الخزائن)
          await this.auditService.logTransactionCreation(
            {
              ...result.transaction,
              targetSafeName: targetSafe.name,
              sourceSafeName: traineeFee.safe?.name,
            },
            context
          );
          
          // تسجيل تحديث رصيد الخزينة المستلمة
          const safe = await this.prisma.safe.findUnique({
            where: { id: safeId }
          });
          
          if (safe) {
            await this.auditService.logSafeBalanceUpdate(
              safeId,
              safe.balance - amount,
              safe.balance,
              safe.name,
              safe.currency || 'EGP',
              `دفع رسوم ${traineeFee.name} للمتدرب ${trainee.nameAr}`,
              context
            );
          }
          
        } catch (auditError) {
          console.error('خطأ في تسجيل التدقيق:', auditError);
        }
      }

      // إرسال رسالة واتساب + PDF في الخلفية (بدون انتظار)
      if (result.payment && trainee?.phone && result.payment.paidAmount > 0) {
        // fire-and-forget: لا ننتظر الرد حتى لا تتأخر الصفحة
        this.sendPaymentWhatsAppInBackground(result.payment.id, trainee.nameAr, trainee.phone, userId);
      }

      return result;
    });
  }

  async findUnpaidTraineePayments() {
    return this.prisma.traineePayment.findMany({
      where: {
        status: {
          in: ['PENDING', 'PARTIALLY_PAID'],
        },
      },
      include: {
        trainee: true,
        fee: true,
        safe: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllTraineePayments(filters?: {
    page?: number;
    limit?: number;
    traineeId?: number;
    status?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50; // زيادة الافتراضي لتحسين الأداء
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (filters?.traineeId) {
      where.traineeId = filters.traineeId;
    }
    
    if (filters?.status) {
      where.status = filters.status;
    }

    const totalCount = await this.prisma.traineePayment.count({ where });

    const payments = await this.prisma.traineePayment.findMany({
      where,
      include: {
        trainee: true,
        fee: true,
        safe: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    };
  }

  // إبقاء الدالة القديمة للتوافق مع الأكواد الحالية
  async findAllTraineePaymentsLegacy() {
    return this.prisma.traineePayment.findMany({
      include: {
        trainee: true,
        fee: true,
        safe: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // دالة لحساب البيانات المالية للمتدربين مع pagination
  async getTraineesWithFinancialData(filters?: {
    page?: number;
    limit?: number;
    programId?: number;
    status?: string;
    search?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20; // تطابق مع الفرونت إند
    const skip = (page - 1) * limit;

    // بناء شرط البحث للمتدربين
    const where: any = {};
    
    if (filters?.programId) {
      where.programId = filters.programId;
    }
    
    if (filters?.status) {
      where.status = filters.status;
    }
    
    if (filters?.search) {
      where.OR = [
        { nameAr: { contains: filters.search } },
        { nameEn: { contains: filters.search } },
        { nationalId: { contains: filters.search } },
        { phone: { contains: filters.search } },
      ];
    }

    const totalCount = await this.prisma.trainee.count({ where });

    // جلب المتدربين مع البيانات المالية المحسوبة
    const trainees = await this.prisma.trainee.findMany({
      where,
      include: {
        program: true,
        _count: {
          select: {
            traineePayments: true
          }
        },
        traineePayments: {
          select: {
            amount: true,
            paidAmount: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // حساب البيانات المالية لكل متدرب
    const traineesWithFinancialData = trainees.map(trainee => {
      const totalAmount = trainee.traineePayments.reduce((sum, p) => sum + p.amount, 0);
      const paidAmount = trainee.traineePayments.reduce((sum, p) => sum + p.paidAmount, 0);
      const remainingAmount = totalAmount - paidAmount;

      let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (remainingAmount === 0 && totalAmount > 0) paymentStatus = 'paid';
      else if (paidAmount > 0 && remainingAmount > 0) paymentStatus = 'partial';

      return {
        ...trainee,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus,
        paymentsCount: trainee.traineePayments.length
      };
    });

    return {
      data: traineesWithFinancialData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    };
  }

  async findTraineePaymentsByTraineeId(traineeId: number) {
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // جلب المدفوعات مع الرسوم وجدول المواعيد
    return this.prisma.traineePayment.findMany({
      where: { traineeId },
      include: {
        fee: {
          include: {
            paymentSchedule: true, // جلب جدول المواعيد من خلال الرسم
          }
        },
        safe: true,
        transactions: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ======== تطبيق الرسوم التلقائي على متدرب جديد ========
  // يطبق رسوم دراسية (TUITION) فقط المرتبطة بالبرنامج على المتدرب الجديد
  // تم تحسين النظام لضمان تطبيق جميع الرسوم أو لا شيء (Atomic Operation)

  async autoApplyFeesToNewTrainee(traineeId: number, programId: number, userId?: string) {
    console.log(`🚀 [AutoApplyFees] بدء تطبيق الرسوم للمتدرب ${traineeId} في البرنامج ${programId}`);
    
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من أن المتدرب مرتبط بالبرنامج الصحيح
    if (trainee.programId !== programId) {
      throw new BadRequestException('المتدرب غير مرتبط بالبرنامج المحدد');
    }

    // البحث عن رسوم دراسية فقط المرتبطة بهذا البرنامج
    const programFees = await this.prisma.traineeFee.findMany({
      where: {
        programId: programId,
        type: 'TUITION', // تطبيق رسوم دراسية فقط
      },
      include: {
        safe: true,
        program: true,
      },
      orderBy: { id: 'asc' }, // ترتيب ثابت لضمان الاتساق
    });

    console.log(`📋 [AutoApplyFees] وُجد ${programFees.length} رسوم دراسية للبرنامج`);

    if (programFees.length === 0) {
      // لا توجد رسوم دراسية لهذا البرنامج
      return {
        message: 'لا توجد رسوم دراسية لهذا البرنامج',
        appliedFeesCount: 0,
        totalAppliedAmount: 0,
        results: [],
      };
    }

    // التحقق من الرسوم المطبقة مسبقاً
    const existingPayments = await this.prisma.traineePayment.findMany({
      where: {
        traineeId: traineeId,
        feeId: { in: programFees.map(fee => fee.id) },
      },
    });

    const existingFeeIds = new Set(existingPayments.map(payment => payment.feeId));
    const feesToApply = programFees.filter(fee => !existingFeeIds.has(fee.id));

    console.log(`✅ [AutoApplyFees] ${existingPayments.length} رسوم مطبقة مسبقاً، ${feesToApply.length} رسوم جديدة للتطبيق`);

    if (feesToApply.length === 0) {
      // جميع الرسوم مطبقة بالفعل
      return {
        message: 'جميع الرسوم الدراسية مطبقة بالفعل على هذا المتدرب',
        appliedFeesCount: 0,
        totalAppliedAmount: 0,
        results: programFees.map(fee => ({
          feeId: fee.id,
          feeName: fee.name,
          status: 'already_applied',
          message: 'الرسوم مطبقة بالفعل على هذا المتدرب',
        })),
      };
    }

    // تطبيق جميع الرسوم في معاملة واحدة ذرية (All or Nothing)
    let totalAppliedAmount = 0;
    const results = [];

    try {
      console.log(`🔄 [AutoApplyFees] بدء معاملة ذرية لتطبيق ${feesToApply.length} رسوم`);
      
      const atomicResult = await this.prisma.$transaction(async (prisma) => {
        const transactionResults = [];
        const paymentResults = [];
        const feesToMarkApplied = [];

        // تطبيق جميع الرسوم في نفس المعاملة
        for (const fee of feesToApply) {
          console.log(`💰 [AutoApplyFees] تطبيق رسوم "${fee.name}" - مبلغ ${fee.amount} جنيه`);

          // التحقق النهائي من عدم وجود مدفوعات (داخل المعاملة)
          const doubleCheckPayment = await prisma.traineePayment.findFirst({
            where: {
              feeId: fee.id,
              traineeId: traineeId,
            },
          });

          if (doubleCheckPayment) {
            console.log(`⚠️ [AutoApplyFees] تم العثور على دفعة موجودة للرسوم ${fee.name} - تخطي التطبيق`);
            continue;
          }

          // إنشاء معاملة مالية للرسوم (خصم من الخزينة)
          const transaction = await prisma.transaction.create({
            data: {
              amount: fee.amount,
              type: TransactionType.FEE,
              description: `تطبيق تلقائي ذري - رسوم ${fee.name} للمتدرب الجديد ${trainee.nameAr}`,
              sourceId: fee.safeId,
              traineeFeeId: fee.id,
              createdById: userId,
            },
          });

          // خصم المبلغ من الخزينة
          await prisma.safe.update({
            where: { id: fee.safeId },
            data: { balance: { decrement: fee.amount } },
          });

          // إنشاء سجل مدفوعات للمتدرب الجديد
          const traineePayment = await prisma.traineePayment.create({
            data: {
              amount: fee.amount,
              feeId: fee.id,
              traineeId: traineeId,
              safeId: fee.safeId,
              status: 'PENDING',
            },
          });

          transactionResults.push(transaction);
          paymentResults.push(traineePayment);

          // تجميع الرسوم التي تحتاج لتحديث حالة التطبيق
          if (!fee.isApplied) {
            feesToMarkApplied.push(fee.id);
          }

          totalAppliedAmount += fee.amount;
          console.log(`✅ [AutoApplyFees] تم تطبيق رسوم "${fee.name}" بنجاح`);
        }

        // تحديث حالة الرسوم إلى مطبقة (إذا لم تكن كذلك)
        if (feesToMarkApplied.length > 0) {
          await prisma.traineeFee.updateMany({
            where: { id: { in: feesToMarkApplied } },
            data: {
              isApplied: true,
              appliedAt: new Date(),
              appliedById: userId,
            },
          });
          console.log(`📋 [AutoApplyFees] تم تحديث حالة ${feesToMarkApplied.length} رسوم إلى مطبقة`);
        }

        return {
          transactions: transactionResults,
          payments: paymentResults,
          appliedFeesCount: paymentResults.length,
        };
      }, {
        maxWait: 10000, // انتظار أقصى 10 ثوانٍ للحصول على المعاملة
        timeout: 30000, // انتهاء صلاحية المعاملة بعد 30 ثانية
        isolationLevel: 'Serializable' // أعلى مستوى عزل لتجنب Race Conditions
      });

      console.log(`🎉 [AutoApplyFees] تم تطبيق ${atomicResult.appliedFeesCount} رسوم بنجاح في معاملة ذرية واحدة`);

      // إنشاء تقرير النتائج
      for (let i = 0; i < feesToApply.length; i++) {
        const fee = feesToApply[i];
        if (i < atomicResult.appliedFeesCount) {
          results.push({
            feeId: fee.id,
            feeName: fee.name,
            amount: fee.amount,
            status: 'applied',
            wasAlreadyApplied: false,
            traineePayment: atomicResult.payments[i],
            transaction: atomicResult.transactions[i],
          });
        }
      }

      // إضافة الرسوم المطبقة مسبقاً
      for (const fee of programFees) {
        if (existingFeeIds.has(fee.id)) {
          results.push({
            feeId: fee.id,
            feeName: fee.name,
            status: 'already_applied',
            message: 'الرسوم مطبقة بالفعل على هذا المتدرب',
          });
        }
      }

    } catch (error) {
      console.error(`❌ [AutoApplyFees] فشل في تطبيق الرسوم:`, error);
      
      // في حالة الفشل، إرجاع تفاصيل الخطأ
      throw new BadRequestException({
        message: 'فشل في تطبيق الرسوم على المتدرب',
        error: error.message,
        traineeId,
        programId,
        feesToApplyCount: feesToApply.length,
        details: 'تم التراجع عن جميع التغييرات. لا توجد رسوم مطبقة جزئياً.'
      });
    }

    const successfullyApplied = results.filter(r => r.status === 'applied');
    const alreadyApplied = results.filter(r => r.status === 'already_applied');

    console.log(`📊 [AutoApplyFees] ملخص النتائج: ${successfullyApplied.length} جديدة، ${alreadyApplied.length} مطبقة مسبقاً، ${totalAppliedAmount} جنيه إجمالي`);

    // تسجيل في سجل التدقيق المالي
    if (userId && successfullyApplied.length > 0) {
      try {
        const context = await this.createAuditContext(userId);
        await this.auditService.logFeeLoadingOnTrainee(
          traineeId,
          trainee.nameAr,
          programFees[0]?.program?.nameAr || '',
          successfullyApplied.map((r: any) => ({ feeName: r.feeName, amount: r.amount, type: 'TUITION' })),
          totalAppliedAmount,
          false, // رسوم أساسية
          context,
        );
      } catch (auditError) {
        console.error('❌ خطأ في تسجيل التدقيق المالي (autoApply):', auditError);
      }
    }

    return {
      message: `تم تطبيق ${successfullyApplied.length} رسوم جديدة على المتدرب (إجمالي ${successfullyApplied.length + alreadyApplied.length} رسوم)`,
      traineeId: traineeId,
      traineeName: trainee.nameAr,
      programId: programId,
      totalFeesCount: programFees.length,
      appliedFeesCount: successfullyApplied.length,
      newlyAppliedCount: successfullyApplied.length,
      alreadyAppliedCount: alreadyApplied.length,
      totalAppliedAmount,
      results,
      success: true,
      atomicOperation: true, // علامة تدل على أن العملية كانت ذرية
    };
  }

  // ======== الدفع التلقائي للرسوم ========
  // يوزع المبلغ المدفوع على الرسوم المستحقة بترتيب الأقدم إلى الأحدث

  async processAutoPayment(traineeId: number, totalAmount: number, safeId: string, notes?: string, userId?: string, req?: any) {
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من وجود الخزينة
    const targetSafe = await this.prisma.safe.findUnique({
      where: { id: safeId },
    });

    if (!targetSafe) {
      throw new NotFoundException('الخزينة غير موجودة');
    }

    // الحصول على جميع المدفوعات المستحقة للمتدرب مرتبة من الأقدم إلى الأحدث
    const pendingPayments = await this.prisma.traineePayment.findMany({
      where: {
        traineeId: traineeId,
        status: {
          in: ['PENDING', 'PARTIALLY_PAID'],
        },
      },
      include: {
        fee: true,
      },
      orderBy: { createdAt: 'asc' }, // من الأقدم إلى الأحدث
    });

    if (pendingPayments.length === 0) {
      throw new BadRequestException('لا توجد رسوم مستحقة للمتدرب');
    }

    // حساب إجمالي المبلغ المتبقي
    const totalRemaining = pendingPayments.reduce((sum, payment) => {
      return sum + (payment.amount - payment.paidAmount);
    }, 0);

    if (totalAmount > totalRemaining) {
      throw new BadRequestException(`المبلغ المدفوع يتجاوز المبلغ المتبقي. المبلغ المتبقي: ${totalRemaining}`);
    }

    // توزيع المبلغ على الرسوم
    let remainingAmount = totalAmount;
    const paymentResults = [];
    const transactions = [];

    // بدء معاملة قاعدة البيانات
    return this.prisma.$transaction(async (prisma) => {
      for (const payment of pendingPayments) {
        if (remainingAmount <= 0) break;

        const paymentRemaining = payment.amount - payment.paidAmount;
        const amountToApply = Math.min(remainingAmount, paymentRemaining);

        if (amountToApply > 0) {
          // تحديث سجل المدفوعات
          const updatedPayment = await prisma.traineePayment.update({
            where: { id: payment.id },
            data: {
              paidAmount: { increment: amountToApply },
              paidAt: new Date(),
              paidById: userId,
              status: payment.paidAmount + amountToApply >= payment.amount ? 'PAID' : 'PARTIALLY_PAID',
              notes: notes ? `${payment.notes || ''}\n${notes}`.trim() : payment.notes,
            },
          });

          // إنشاء معاملة مالية للدفع
          const transaction = await prisma.transaction.create({
            data: {
              amount: amountToApply,
              type: TransactionType.PAYMENT,
              description: `دفع ذكي وتسوية: رسوم ${payment.fee?.name} للمتدرب ${trainee.nameAr} - دفع في "${targetSafe.name}" مع تسوية الدين - مبلغ ${amountToApply.toLocaleString()} جنيه (من إجمالي ${totalAmount.toLocaleString()} جنيه)`,
              targetId: safeId,
              traineePaymentId: updatedPayment.id,
              createdById: userId,
            },
          });

          transactions.push(transaction);

          paymentResults.push({
            paymentId: payment.id,
            feeName: payment.fee?.name,
            feeAmount: payment.amount,
            previousPaidAmount: payment.paidAmount,
            appliedAmount: amountToApply,
            newPaidAmount: payment.paidAmount + amountToApply,
            newStatus: payment.paidAmount + amountToApply >= payment.amount ? 'PAID' : 'PARTIALLY_PAID',
            isFullyPaid: payment.paidAmount + amountToApply >= payment.amount,
          });

          remainingAmount -= amountToApply;
        }
      }

      // إضافة المبلغ الإجمالي إلى الخزينة المستلمة
      await prisma.safe.update({
        where: { id: safeId },
        data: { balance: { increment: totalAmount } },
      });

      // تسوية الديون في خزائن الرسوم المختلفة (بدون تحويل داخلي)
      const processedFeeSafes = new Map(); // استخدام Map لتجميع المبالغ لكل خزينة
      
      for (const result of paymentResults) {
        const payment = pendingPayments.find(p => p.id === result.paymentId);
        if (payment?.fee?.safeId && payment.fee.safeId !== safeId) {
          // تجميع المبالغ لكل خزينة رسوم
          const currentAmount = processedFeeSafes.get(payment.fee.safeId) || 0;
          processedFeeSafes.set(payment.fee.safeId, currentAmount + result.appliedAmount);
        }
      }

      // تسوية الديون في خزائن الرسوم (بدون تأثير على الخزينة المستقبلة)
      for (const [feeSafeId, totalAmountForSafe] of processedFeeSafes) {
        // تسوية الدين في خزينة الرسوم
        await prisma.safe.update({
          where: { id: feeSafeId },
          data: { balance: { increment: totalAmountForSafe } },
        });

        // تم تسوية الديون من خلال تحديث أرصدة الخزائن
        // لا نحتاج لمعاملات إضافية - المعاملات الأساسية كافية
      }

      const appliedAmount = totalAmount - remainingAmount;
      const fullyPaidCount = paymentResults.filter(r => r.isFullyPaid).length;
      const partiallyPaidCount = paymentResults.filter(r => !r.isFullyPaid).length;

      return {
        message: `تم توزيع ${appliedAmount} على ${paymentResults.length} رسوم (${fullyPaidCount} مدفوعة كاملة، ${partiallyPaidCount} مدفوعة جزئياً)`,
        traineeId: traineeId,
        traineeName: trainee.nameAr,
        totalAmountPaid: appliedAmount,
        remainingAmount: remainingAmount,
        processedPayments: paymentResults.length,
        fullyPaidCount,
        partiallyPaidCount,
        transactions: transactions.length,
        paymentDetails: paymentResults,
      };
    }).then(async (result) => {
      // تسجيل العملية في سجل التدقيق المالي (دفع ذكي)
      if (userId) {
        try {
          const context = await this.createAuditContext(userId, req);
          await this.auditService.logSmartPayment(
            traineeId,
            trainee.nameAr,
            totalAmount,
            targetSafe.name,
            result.paymentDetails.map((p: any) => ({
              feeName: p.feeName,
              appliedAmount: p.appliedAmount,
              newStatus: p.newStatus,
              isFullyPaid: p.isFullyPaid,
            })),
            context,
          );
        } catch (error) {
          console.error('فشل في تسجيل تدقيق الدفع الذكي:', error);
        }
      }

      // إرسال رسالة واتساب + PDF في الخلفية (بدون انتظار)
      if (trainee?.phone && result.paymentDetails.length > 0) {
        this.sendSmartPaymentWhatsAppInBackground(trainee, result, userId);
      }

      return result;
    });
  }

  // ======== إرسال واتساب في الخلفية (fire-and-forget) ========

  /**
   * إرسال تأكيد دفع عادي (رسم محدد) في الخلفية
   * لا ينتظر الرد - يعمل بعد عودة الاستجابة للمستخدم
   */
  private sendPaymentWhatsAppInBackground(paymentId: number, traineeName: string, phone: string, userId?: string) {
    // استخدام setImmediate لضمان عدم حجب event loop
    setImmediate(async () => {
      try {
        const isWhatsAppReady = await this.whatsappService.isClientReallyReady();
        if (!isWhatsAppReady) {
          console.log(`[BG WhatsApp] ⚠️ WhatsApp not ready, skipping for ${traineeName}`);
          return;
        }
        const success = await this.whatsappService.sendPaymentConfirmation(paymentId, userId);
        console.log(`[BG WhatsApp] ${success ? '✅' : '❌'} Payment confirmation ${success ? 'sent' : 'failed'} for ${traineeName}`);
      } catch (error) {
        console.error(`[BG WhatsApp] Error for ${traineeName}:`, error.message);
      }
    });
  }

  /**
   * إرسال تأكيد دفع ذكي في الخلفية
   * لا ينتظر الرد - يعمل بعد عودة الاستجابة للمستخدم
   */
  private sendSmartPaymentWhatsAppInBackground(trainee: any, result: any, userId?: string) {
    setImmediate(async () => {
      try {
        // التحقق من توفر Redis/Queue أولاً
        const isQueueAvailable = this.whatsappQueueService && await this.whatsappQueueService.isRedisAvailable();
        
        if (isQueueAvailable) {
          try {
            await (this.whatsappQueueService as any).addSmartPaymentConfirmationToQueue(
              result.paymentDetails[0].paymentId, userId, result.totalAmountPaid, result, 1
            );
            console.log(`[BG WhatsApp Queue] ✅ Added to queue for ${trainee.nameAr}`);
            return;
          } catch (queueError) {
            console.error(`[BG WhatsApp Queue] ❌ Queue failed, sending directly:`, queueError.message);
          }
        }

        // إرسال مباشر
        await this.sendComprehensivePaymentMessage(trainee, result, userId);
      } catch (error) {
        console.error(`[BG WhatsApp] Error for ${trainee.nameAr}:`, error.message);
      }
    });
  }

  // ======== دالة مساعدة لإرسال رسالة دفع شاملة ========
  private async sendComprehensivePaymentMessage(trainee: any, result: any, userId?: string) {
    try {
      console.log(`[WhatsApp Direct Auto] Sending comprehensive payment message for ${trainee.nameAr}`);

      const isWhatsAppReady = await this.whatsappService.isClientReallyReady();
      if (!isWhatsAppReady) {
        console.warn(`[WhatsApp Direct Auto] WhatsApp client not ready, skipping confirmation for ${trainee.nameAr}`);
        return;
      }

      // إرسال رسالة شاملة واحدة باستخدام الخدمة الجديدة
      const success = await (this.whatsappService as any).sendSmartPaymentConfirmation(
        result.paymentDetails[0].paymentId,
        userId,
        result.totalAmountPaid,
        result
      );

      if (success) {
        console.log(`[WhatsApp Direct Auto] ✅ Comprehensive payment confirmation sent to ${trainee.nameAr}`);
      } else {
        console.error(`[WhatsApp Direct Auto] ❌ Failed to send comprehensive confirmation to ${trainee.nameAr}`);
      }
    } catch (error) {
      console.error(`[WhatsApp Direct Auto] Error sending comprehensive message:`, error);
    }
  }

  // ======== التقارير المالية ========

  async getFinancialDashboard(filters: {
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // فلاتر التاريخ
      const whereDate: any = {};
      if (filters.dateFrom || filters.dateTo) {
        whereDate.createdAt = {};
        if (filters.dateFrom) {
          whereDate.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          whereDate.createdAt.lte = filters.dateTo;
        }
      } else {
        // اليوم فقط إذا لم يتم تحديد تاريخ
        whereDate.createdAt = {
          gte: today,
          lt: tomorrow,
        };
      }

      // الحصول على إحصائيات شاملة
      const [
        totalIncome,
        allTransfers,
        transactionsToday,
        safesData,
        incomeByType,
        totalTransfers,
        recentTransactions,
      ] = await Promise.all([
        // إجمالي الدخل (دفع رسوم + إيداعات)
        this.prisma.transaction.aggregate({
          where: {
            ...whereDate,
            type: { in: ['PAYMENT', 'DEPOSIT'] },
          },
          _sum: { amount: true },
          _count: true,
        }),

        // جلب جميع التحويلات لفلترتها
        this.prisma.transaction.findMany({
          where: {
            ...whereDate,
            type: 'TRANSFER',
          },
          include: {
            sourceSafe: {
              select: { category: true }
            },
            targetSafe: {
              select: { category: true }
            }
          }
        }),

        // معاملات اليوم
        this.prisma.transaction.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),

        // بيانات الخزائن
        this.prisma.safe.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            balance: true,
            currency: true,
            _count: {
              select: {
                sourceTransactions: {
                  where: whereDate,
                },
                targetTransactions: {
                  where: whereDate,
                },
              },
            },
          },
        }),

        // الدخل حسب النوع (دفع رسوم + إيداعات)
        this.prisma.transaction.groupBy({
          by: ['type'],
          where: {
            ...whereDate,
            type: { in: ['PAYMENT', 'DEPOSIT'] },
          },
          _sum: { amount: true },
          _count: true,
        }),

        // إجمالي التحويلات
        this.prisma.transaction.aggregate({
          where: {
            ...whereDate,
            type: 'TRANSFER',
          },
          _sum: { amount: true },
          _count: true,
        }),

        // أحدث المعاملات (بدون معاملات تطبيق الرسوم)
        this.prisma.transaction.findMany({
          where: {
            ...whereDate,
            type: { not: 'FEE' },
          },
          include: {
            targetSafe: { select: { name: true } },
            sourceSafe: { select: { name: true } },
            traineePayment: {
              include: {
                trainee: { select: { nameAr: true } },
                fee: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      // حساب المصروفات: تحويلات من خزائن الدخل إلى خزائن المصروفات
      const expenseTransfers = allTransfers.filter(t => 
        t.sourceSafe?.category === 'INCOME' && 
        t.targetSafe?.category === 'EXPENSE'
      );
      
      const totalExpenses = {
        _sum: {
          amount: expenseTransfers.reduce((sum, t) => sum + t.amount, 0)
        },
        _count: expenseTransfers.length
      };

      // حساب الأرصدة الإجمالية
      const totalBalance = safesData.reduce((sum, safe) => sum + safe.balance, 0);

      // تحليل الدخل حسب الخزائن (دفع رسوم + إيداعات)
      const incomeByTarget = await this.prisma.transaction.groupBy({
        by: ['targetId'],
        where: {
          ...whereDate,
          type: { in: ['PAYMENT', 'DEPOSIT'] },
          targetId: { not: null },
        },
        _sum: { amount: true },
        _count: true,
      });

      const safeIncomeData = await Promise.all(
        incomeByTarget.map(async (item) => {
          const safe = await this.prisma.safe.findUnique({
            where: { id: item.targetId },
            select: { name: true },
          });
          return {
            safeName: safe?.name || 'غير معروف',
            safeId: item.targetId,
            income: item._sum.amount || 0,
            transactionsCount: item._count,
          };
        })
      );

      return {
        summary: {
          totalIncome: totalIncome._sum.amount || 0,
          totalExpenses: totalExpenses._sum.amount || 0,
          totalTransfers: totalTransfers._sum.amount || 0,
          netIncome: (totalIncome._sum.amount || 0) - (totalExpenses._sum.amount || 0),
          totalBalance,
          transactionsToday,
          incomeTransactions: totalIncome._count,
          expenseTransactions: totalExpenses._count,
        },
        safes: safesData.map(safe => ({
          id: safe.id,
          name: safe.name,
          balance: safe.balance,
          currency: safe.currency,
          transactionsCount: safe._count.sourceTransactions + safe._count.targetTransactions,
        })),
        incomeByType: incomeByType.map(item => ({
          type: item.type,
          amount: item._sum.amount || 0,
          count: item._count,
          percentage: totalIncome._sum.amount ? 
            ((item._sum.amount || 0) / totalIncome._sum.amount * 100).toFixed(1) : 0,
        })),
        incomeByTarget: safeIncomeData.sort((a, b) => b.income - a.income),
        recentTransactions: recentTransactions.map(transaction => ({
          id: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
          description: transaction.description,
          sourceSafe: transaction.sourceSafe?.name,
          targetSafe: transaction.targetSafe?.name,
          traineeName: transaction.traineePayment?.trainee?.nameAr,
          feeName: transaction.traineePayment?.fee?.name,
          createdAt: transaction.createdAt,
        })),
      };
    } catch (error) {
      console.error('❌ خطأ في استرجاع التقرير المالي:', error);
      throw new Error('فشل في استرجاع التقرير المالي');
    }
  }

  async getIncomeAnalysis(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    safeId?: string;
  }) {
    try {
      const whereConditions: any = {
        type: { in: ['DEPOSIT', 'PAYMENT'] },
      };

      if (filters.dateFrom || filters.dateTo) {
        whereConditions.createdAt = {};
        if (filters.dateFrom) {
          whereConditions.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          whereConditions.createdAt.lte = filters.dateTo;
        }
      }

      if (filters.safeId) {
        whereConditions.targetId = filters.safeId;
      }

      // تحليل يومي للدخل
      const dailyIncome = await this.prisma.$queryRaw`
        SELECT 
          DATE(createdAt) as date,
          SUM(amount) as totalAmount,
          COUNT(*) as transactionsCount,
          type
        FROM Transaction 
        WHERE type IN ('DEPOSIT', 'PAYMENT')
        ${filters.dateFrom ? `AND createdAt >= ${filters.dateFrom}` : ''}
        ${filters.dateTo ? `AND createdAt <= ${filters.dateTo}` : ''}
        ${filters.safeId ? `AND targetId = ${filters.safeId}` : ''}
        GROUP BY DATE(createdAt), type
        ORDER BY date DESC
        LIMIT 30
      `;

      // تحليل حسب الخزائن
      const incomeByTarget = await this.prisma.transaction.groupBy({
        by: ['targetId'],
        where: whereConditions,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      });

      const safeAnalysis = await Promise.all(
        incomeByTarget.map(async (item) => {
          const safe = await this.prisma.safe.findUnique({
            where: { id: item.targetId },
            select: { name: true, balance: true },
          });
          return {
            safeId: item.targetId,
            safeName: safe?.name || 'غير معروف',
            currentBalance: safe?.balance || 0,
            totalIncome: item._sum.amount || 0,
            transactionsCount: item._count,
            averageTransaction: item._avg.amount || 0,
          };
        })
      );

      return {
        dailyIncome,
        safeAnalysis: safeAnalysis.sort((a, b) => b.totalIncome - a.totalIncome),
        summary: {
          totalIncome: incomeByTarget.reduce((sum, item) => sum + (item._sum.amount || 0), 0),
          totalTransactions: incomeByTarget.reduce((sum, item) => sum + item._count, 0),
          averagePerTransaction: incomeByTarget.length > 0 ? 
            incomeByTarget.reduce((sum, item) => sum + (item._avg.amount || 0), 0) / incomeByTarget.length : 0,
        },
      };
    } catch (error) {
      console.error('❌ خطأ في تحليل الدخل:', error);
      throw new Error('فشل في تحليل الدخل');
    }
  }

  async getTransactionsSummary(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    type?: string;
  }) {
    try {
      const whereConditions: any = {};

      if (filters.dateFrom || filters.dateTo) {
        whereConditions.createdAt = {};
        if (filters.dateFrom) {
          whereConditions.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          whereConditions.createdAt.lte = filters.dateTo;
        }
      }

      if (filters.type) {
        whereConditions.type = filters.type;
      }

      // ملخص عام
      const summary = await this.prisma.transaction.aggregate({
        where: whereConditions,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
        _min: { amount: true },
        _max: { amount: true },
      });

      // تجميع حسب النوع
      const byType = await this.prisma.transaction.groupBy({
        by: ['type'],
        where: whereConditions,
        _sum: { amount: true },
        _count: true,
      });

      // تجميع حسب الشهر
      const monthlyData = await this.prisma.$queryRaw`
        SELECT 
          YEAR(createdAt) as year,
          MONTH(createdAt) as month,
          SUM(amount) as totalAmount,
          COUNT(*) as transactionsCount,
          type
        FROM Transaction 
        WHERE 1=1
        ${filters.dateFrom ? `AND createdAt >= ${filters.dateFrom}` : ''}
        ${filters.dateTo ? `AND createdAt <= ${filters.dateTo}` : ''}
        ${filters.type ? `AND type = '${filters.type}'` : ''}
        GROUP BY YEAR(createdAt), MONTH(createdAt), type
        ORDER BY year DESC, month DESC
        LIMIT 12
      `;

      return {
        summary: {
          totalAmount: summary._sum.amount || 0,
          totalTransactions: summary._count,
          averageTransaction: summary._avg.amount || 0,
          minTransaction: summary._min.amount || 0,
          maxTransaction: summary._max.amount || 0,
        },
        byType: byType.map(item => ({
          type: item.type,
          amount: item._sum.amount || 0,
          count: item._count,
          percentage: summary._sum.amount ? 
            ((item._sum.amount || 0) / summary._sum.amount * 100).toFixed(1) : 0,
        })),
        monthlyData,
      };
    } catch (error) {
      console.error('❌ خطأ في ملخص المعاملات:', error);
      throw new Error('فشل في استرجاع ملخص المعاملات');
    }
  }

  // ======== القيود المالية والتحويلات ========

  /**
   * تحويل مبلغ بين الخزائن
   */
  async transferBetweenSafes(
    fromSafeId: string,
    toSafeId: string,
    amount: number,
    description: string,
    userId: string,
    req?: any
  ) {
    console.log('🔄 بدء عملية التحويل بين الخزائن:', {
      fromSafeId,
      toSafeId,
      amount,
      userId
    });

    // التحقق من صحة البيانات
    if (!fromSafeId || !toSafeId || !amount || amount <= 0) {
      throw new Error('بيانات التحويل غير صحيحة');
    }

    if (fromSafeId === toSafeId) {
      throw new Error('لا يمكن التحويل من خزينة إلى نفسها');
    }

    try {
      // استخدام transaction لضمان تنفيذ العملية بشكل ذري
      const result = await this.prisma.$transaction(async (tx) => {
        // التحقق من وجود الخزائن
        const fromSafe = await tx.safe.findUnique({
          where: { id: fromSafeId }
        });

        const toSafe = await tx.safe.findUnique({
          where: { id: toSafeId }
        });

        if (!fromSafe || !toSafe) {
          throw new Error('إحدى الخزائن غير موجودة');
        }

        // التحقق من الرصيد المتاح في الخزينة المصدر
        if (fromSafe.balance < amount) {
          throw new Error(`الرصيد غير كافي. الرصيد المتاح: ${fromSafe.balance} جنيه`);
        }

        // خصم المبلغ من الخزينة المصدر
        await tx.safe.update({
          where: { id: fromSafeId },
          data: {
            balance: {
              decrement: amount
            }
          }
        });

        // إضافة المبلغ إلى الخزينة الهدف
        await tx.safe.update({
          where: { id: toSafeId },
          data: {
            balance: {
              increment: amount
            }
          }
        });

        // إنشاء معاملة التحويل
        const transferTransaction = await tx.transaction.create({
          data: {
            amount: amount,
            description: `تحويل من ${fromSafe.name} إلى ${toSafe.name}: ${description}`,
            type: 'TRANSFER',
            sourceId: fromSafe.id,
            targetId: toSafe.id,
            createdById: userId,
          }
        });

        // إرجاع بيانات التحويل
        return {
          id: transferTransaction.id,
          amount,
          description,
          fromSafe,
          toSafe,
          fromSafeId,
          toSafeId,
          type: 'TRANSFER',
          createdAt: new Date(),
          createdBy: {
            id: userId,
            name: 'المستخدم الحالي' // يمكن تحسين هذا لاحقاً
          }
        };
      });

      console.log('✅ تم التحويل بنجاح:', result);

      // تسجيل العملية في سجل التدقيق
      if (userId) {
        try {
          const context = await this.createAuditContext(userId, req);
          await this.auditService.logTransactionCreation(
            {
              id: result.id,
              type: 'TRANSFER',
              amount,
              description: `تحويل بين الخزائن: من ${result.fromSafe?.name} إلى ${result.toSafe?.name} - ${description}`,
              sourceId: fromSafeId,
              targetId: toSafeId,
              sourceSafeName: result.fromSafe?.name,
              targetSafeName: result.toSafe?.name,
            },
            context,
          );
        } catch (auditError) {
          console.error('فشل في تسجيل تدقيق التحويل بين الخزائن:', auditError);
        }
      }

      return {
        success: true,
        message: `تم تحويل ${amount.toLocaleString()} جنيه بنجاح`,
        data: result
      };

    } catch (error) {
      console.error('❌ خطأ في التحويل:', error);
      throw new Error(error.message || 'فشل في عملية التحويل');
    }
  }

  /**
   * الحصول على سجل القيود المالية (التحويلات)
   */
  async getFinancialEntries(
    page = 1, 
    limit = 50, 
    dateFrom?: string, 
    dateTo?: string,
    search?: string
  ) {
    console.log('📊 جلب القيود المالية:', { page, limit, dateFrom, dateTo, search });

    try {
      const skip = (page - 1) * limit;

      // بناء شروط الفلترة
      const where: any = {
        type: 'TRANSFER'
      };

      // إضافة فلترة التاريخ إذا تم تحديدها
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      // إضافة البحث النصي
      if (search && search.trim()) {
        const searchTerm = search.trim();
        where.OR = [
          { description: { contains: searchTerm } },
          { sourceSafe: { name: { contains: searchTerm } } },
          { targetSafe: { name: { contains: searchTerm } } },
          { createdBy: { name: { contains: searchTerm } } },
        ];
        // البحث بالرقم إذا كان المدخل رقماً
        const numericSearch = parseFloat(searchTerm);
        if (!isNaN(numericSearch)) {
          where.OR.push({ amount: numericSearch });
        }
      }

      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          include: {
            sourceSafe: {
              select: {
                id: true,
                name: true,
                balance: true,
                type: true,
                category: true,
                description: true,
              }
            },
            targetSafe: {
              select: {
                id: true,
                name: true,
                balance: true,
                type: true,
                category: true,
                description: true,
              }
            },
            createdBy: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit,
        }),
        this.prisma.transaction.count({
          where
        })
      ]);

      console.log(`✅ تم جلب ${transactions.length} قيد مالي من أصل ${total}`);

      // تحويل البيانات إلى التنسيق المطلوب
      const entries = (transactions as any[])
        .filter((t: any) => t.sourceSafe && t.targetSafe)
        .map((transaction: any, index: number) => {
          // إنشاء ID رقمي فريد من التاريخ + الفهرس
          const numericId = parseInt(transaction.id.replace(/\D/g, '').slice(0, 8)) || (Date.now() + index);
          
          return {
            id: numericId,
            amount: Math.abs(transaction.amount), // القيمة المطلقة
            description: transaction.description || '',
            type: 'TRANSFER' as const,
            fromSafeId: transaction.sourceId || '',
            toSafeId: transaction.targetId || '',
            fromSafe: transaction.sourceSafe || { id: '', name: 'غير معروف', balance: 0 },
            toSafe: transaction.targetSafe || { id: '', name: 'غير معروف', balance: 0 },
            createdAt: transaction.createdAt,
            createdBy: {
              id: transaction.createdById || 'unknown',
              name: transaction.createdBy?.name || 'مستخدم غير معروف'
            }
          };
        });

      return {
        success: true,
        data: entries,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1,
          startItem: total === 0 ? 0 : skip + 1,
          endItem: Math.min(skip + limit, total),
        }
      };

    } catch (error) {
      console.error('❌ خطأ في جلب القيود المالية:', error);
      console.error('تفاصيل الخطأ:', error.stack);
      throw new Error('فشل في جلب القيود المالية');
    }
  }
} 