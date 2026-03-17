# نظام الإجراءات العقابية للمتدربين - دليل التنفيذ الكامل

## ✅ ما تم إنجازه

### 1. الصلاحية الجديدة ✅
تم إضافتها في [`backend/prisma/seed.ts`](backend/prisma/seed.ts:165):
```typescript
{
  resource: 'dashboard.trainees.disciplinary-actions',
  action: 'manage',
  displayName: 'إدارة الإجراءات العقابية',
  description: 'اتخاذ إجراءات عقابية ضد المتدربين (فصل مؤقت، فصل نهائي، لفت نظر، استدعاء ولي أمر، حفظ محضر)',
  category: 'إدارة المتدربين',
  isSystem: false,
}
```

**تُمنح تلقائياً لـ**:
- ✅ super_admin
- ✅ admin

### 2. Database Schema ✅
تم إضافته في [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma:2251):

```prisma
enum DisciplinaryActionType {
  WARNING                // لفت نظر
  GUARDIAN_SUMMON        // استدعاء ولي الأمر
  REPORT_FILING          // حفظ محضر
  TEMPORARY_SUSPENSION   // فصل مؤقت
  PERMANENT_EXPULSION    // فصل نهائي
}

enum DisciplinaryActionStatus {
  ACTIVE      // نشط
  COMPLETED   // مكتمل
  CANCELLED   // ملغي
}

model DisciplinaryAction {
  id                String                  @id @default(cuid())
  traineeId         Int
  trainee           Trainee                 @relation(...)
  actionType        DisciplinaryActionType
  reason            String                  @db.Text
  startDate         DateTime?               // للفصل المؤقت
  endDate           DateTime?               // للفصل المؤقت
  status            DisciplinaryActionStatus @default(ACTIVE)
  notes             String?                 @db.Text
  reportFile        String?                 // ملف المحضر
  guardianNotified  Boolean                 @default(false)
  guardianNotificationDate DateTime?
  createdBy         String
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt
  ...
}
```

---

## 📋 الخطوات المتبقية

### الخطوة 1: تطبيق Schema على قاعدة البيانات ⚠️ **مطلوب الآن**

```bash
cd backend

# 1. توليد Prisma Client
npx prisma generate

# 2. تطبيق التغييرات
npx prisma db push

# أو إنشاء migration
npx prisma migrate dev --name add_disciplinary_actions

# 3. تشغيل seed لإضافة الصلاحية
npm run prisma:seed

# 4. إعادة تشغيل Backend
npm run start:dev
```

---

### الخطوة 2: إنشاء Backend Module كامل

#### الملفات المطلوبة (6 ملفات):

**1. `backend/src/disciplinary-actions/dto/create-disciplinary-action.dto.ts`** ✅ (تم إنشاؤه)

**2. `backend/src/disciplinary-actions/dto/update-disciplinary-action.dto.ts`**:
```typescript
import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DisciplinaryActionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export class UpdateDisciplinaryActionDto {
  @ApiPropertyOptional({ description: 'حالة الإجراء', enum: DisciplinaryActionStatus })
  @IsOptional()
  @IsEnum(DisciplinaryActionStatus)
  status?: DisciplinaryActionStatus;

  @ApiPropertyOptional({ description: 'ملاحظات إدارية' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'هل تم إبلاغ ولي الأمر' })
  @IsOptional()
  @IsBoolean()
  guardianNotified?: boolean;

  @ApiPropertyOptional({ description: 'تاريخ إبلاغ ولي الأمر' })
  @IsOptional()
  @IsDateString()
  guardianNotificationDate?: string;

  @ApiPropertyOptional({ description: 'سبب الإلغاء (إذا تم الإلغاء)' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
```

**3. `backend/src/disciplinary-actions/disciplinary-actions.service.ts`**:
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisciplinaryActionDto, DisciplinaryActionType } from './dto/create-disciplinary-action.dto';
import { UpdateDisciplinaryActionDto, DisciplinaryActionStatus } from './dto/update-disciplinary-action.dto';

@Injectable()
export class DisciplinaryActionsService {
  constructor(private prisma: PrismaService) {}

  // إنشاء إجراء عقابي جديد
  async create(createDto: CreateDisciplinaryActionDto, createdBy: string) {
    const { traineeId, actionType, reason, startDate, endDate, notes, guardianNotified, guardianNotificationDate } = createDto;

    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: { program: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من التواريخ للفصل المؤقت
    if (actionType === DisciplinaryActionType.TEMPORARY_SUSPENSION) {
      if (!startDate || !endDate) {
        throw new BadRequestException('يجب تحديد تاريخ البداية والنهاية للفصل المؤقت');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end <= start) {
        throw new BadRequestException('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      }

      if (start < new Date()) {
        throw new BadRequestException('تاريخ البداية يجب أن يكون في المستقبل أو اليوم');
      }
    }

    // إنشاء الإجراء
    const action = await this.prisma.disciplinaryAction.create({
      data: {
        traineeId,
        actionType,
        reason,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes,
        guardianNotified: guardianNotified || false,
        guardianNotificationDate: guardianNotificationDate ? new Date(guardianNotificationDate) : null,
        createdBy,
        status: 'ACTIVE',
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            phone: true,
            guardianPhone: true,
            guardianName: true,
          }
        }
      }
    });

    return {
      success: true,
      message: 'تم اتخاذ الإجراء العقابي بنجاح',
      action,
    };
  }

  // جلب جميع الإجراءات العقابية لمتدرب
  async getTraineeActions(traineeId: number) {
    return this.prisma.disciplinaryAction.findMany({
      where: { traineeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // جلب الإجراءات النشطة لمتدرب
  async getActiveActions(traineeId: number) {
    return this.prisma.disciplinaryAction.findMany({
      where: {
        traineeId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // فحص إذا كان المتدرب مفصول حالياً
  async isTraineeSuspended(traineeId: number): Promise<{
    isSuspended: boolean;
    suspensionType?: 'TEMPORARY' | 'PERMANENT';
    suspensionEnds?: Date;
    reason?: string;
  }> {
    const now = new Date();

    // فحص الفصل النهائي
    const permanentExpulsion = await this.prisma.disciplinaryAction.findFirst({
      where: {
        traineeId,
        actionType: 'PERMANENT_EXPULSION',
        status: 'ACTIVE',
      },
    });

    if (permanentExpulsion) {
      return {
        isSuspended: true,
        suspensionType: 'PERMANENT',
        reason: permanentExpulsion.reason,
      };
    }

    // فحص الفصل المؤقت
    const temporarySuspension = await this.prisma.disciplinaryAction.findFirst({
      where: {
        traineeId,
        actionType: 'TEMPORARY_SUSPENSION',
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (temporarySuspension) {
      return {
        isSuspended: true,
        suspensionType: 'TEMPORARY',
        suspensionEnds: temporarySuspension.endDate!,
        reason: temporarySuspension.reason,
      };
    }

    return { isSuspended: false };
  }

  // تحديث حالة الإجراء
  async update(id: string, updateDto: UpdateDisciplinaryActionDto, updatedBy: string) {
    const action = await this.prisma.disciplinaryAction.findUnique({
      where: { id },
    });

    if (!action) {
      throw new NotFoundException('الإجراء العقابي غير موجود');
    }

    // إذا كان الإلغاء، إضافة معلومات الإلغاء
    const updateData: any = { ...updateDto };
    
    if (updateDto.status === DisciplinaryActionStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = updatedBy;
    }

    if (updateDto.status === DisciplinaryActionStatus.COMPLETED) {
      updateData.completedAt = new Date();
      updateData.completedBy = updatedBy;
    }

    return this.prisma.disciplinaryAction.update({
      where: { id },
      data: updateData,
    });
  }

  // حذف إجراء عقابي
  async delete(id: string) {
    const action = await this.prisma.disciplinaryAction.findUnique({
      where: { id },
    });

    if (!action) {
      throw new NotFoundException('الإجراء العقابي غير موجود');
    }

    await this.prisma.disciplinaryAction.delete({
      where: { id },
    });

    return { success: true, message: 'تم حذف الإجراء العقابي' };
  }

  // جلب جميع الإجراءات العقابية (مع فلترة)
  async getAll(filters?: {
    traineeId?: number;
    actionType?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: any = {};

    if (filters?.traineeId) where.traineeId = filters.traineeId;
    if (filters?.actionType) where.actionType = filters.actionType;
    if (filters?.status) where.status = filters.status;
    if (filters?.fromDate) where.createdAt = { gte: new Date(filters.fromDate) };
    if (filters?.toDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(filters.toDate),
      };
    }

    return this.prisma.disciplinaryAction.findMany({
      where,
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            phone: true,
            program: { select: { nameAr: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // إحصائيات الإجراءات العقابية
  async getStats() {
    const [total, active, byType, byStatus] = await Promise.all([
      this.prisma.disciplinaryAction.count(),
      this.prisma.disciplinaryAction.count({ where: { status: 'ACTIVE' } }),
      this.prisma.disciplinaryAction.groupBy({
        by: ['actionType'],
        _count: true,
      }),
      this.prisma.disciplinaryAction.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      byType,
      byStatus,
    };
  }
}
```

**4. `backend/src/disciplinary-actions/disciplinary-actions.controller.ts`**:
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { DisciplinaryActionsService } from './disciplinary-actions.service';
import { CreateDisciplinaryActionDto } from './dto/create-disciplinary-action.dto';
import { UpdateDisciplinaryActionDto } from './dto/update-disciplinary-action.dto';

@ApiTags('Disciplinary Actions')
@ApiBearerAuth()
@Controller('disciplinary-actions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DisciplinaryActionsController {
  constructor(private readonly disciplinaryActionsService: DisciplinaryActionsService) {}

  @Post()
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'اتخاذ إجراء عقابي جديد' })
  async create(@Body() createDto: CreateDisciplinaryActionDto, @Request() req) {
    return this.disciplinaryActionsService.create(createDto, req.user.userId);
  }

  @Get('trainee/:traineeId')
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'جلب الإجراءات العقابية لمتدرب' })
  async getTraineeActions(@Param('traineeId') traineeId: string) {
    return this.disciplinaryActionsService.getTraineeActions(parseInt(traineeId));
  }

  @Get('trainee/:traineeId/active')
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'جلب الإجراءات النشطة لمتدرب' })
  async getActiveActions(@Param('traineeId') traineeId: string) {
    return this.disciplinaryActionsService.getActiveActions(parseInt(traineeId));
  }

  @Get('trainee/:traineeId/check-suspension')
  @ApiOperation({ summary: 'فحص حالة فصل المتدرب' })
  async checkSuspension(@Param('traineeId') traineeId: string) {
    return this.disciplinaryActionsService.isTraineeSuspended(parseInt(traineeId));
  }

  @Get('stats')
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'إحصائيات الإجراءات العقابية' })
  async getStats() {
    return this.disciplinaryActionsService.getStats();
  }

  @Get()
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'جلب جميع الإجراءات مع فلترة' })
  @ApiQuery({ name: 'traineeId', required: false })
  @ApiQuery({ name: 'actionType', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getAll(@Query() query: any) {
    return this.disciplinaryActionsService.getAll(query);
  }

  @Put(':id')
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'تحديث إجراء عقابي' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDisciplinaryActionDto,
    @Request() req
  ) {
    return this.disciplinaryActionsService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'حذف إجراء عقابي' })
  async delete(@Param('id') id: string) {
    return this.disciplinaryActionsService.delete(id);
  }
}
```

**5. `backend/src/disciplinary-actions/disciplinary-actions.module.ts`**:
```typescript
import { Module } from '@nestjs/common';
import { DisciplinaryActionsController } from './disciplinary-actions.controller';
import { DisciplinaryActionsService } from './disciplinary-actions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [DisciplinaryActionsController],
  providers: [DisciplinaryActionsService],
  exports: [DisciplinaryActionsService], // للاستخدام في modules أخرى
})
export class DisciplinaryActionsModule {}
```

**6. تحديث `backend/src/app.module.ts`**:
```typescript
// إضافة في الـ imports
import { DisciplinaryActionsModule } from './disciplinary-actions/disciplinary-actions.module';

@Module({
  imports: [
    // ... باقي الـ modules
    DisciplinaryActionsModule, // <-- إضافة هنا
  ],
})
export class AppModule {}
```

---

### الخطوة 3: التكامل مع نظام الحضور

#### تحديث `backend/src/attendance/attendance.service.ts`:

```typescript
import { DisciplinaryActionsService } from '../disciplinary-actions/disciplinary-actions.service';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private permissionsService: PermissionsService,
    private paymentStatusService: TraineePaymentStatusService,
    private disciplinaryActionsService: DisciplinaryActionsService, // <-- إضافة
  ) {}

  async recordAttendance(dto: RecordAttendanceDto, userId: string) {
    // ... الكود الموجود

    // ✅ فحص الفصل قبل تسجيل الحضور
    const suspensionCheck = await this.disciplinaryActionsService.isTraineeSuspended(dto.traineeId);
    
    if (suspensionCheck.isSuspended) {
      if (suspensionCheck.suspensionType === 'PERMANENT') {
        throw new BadRequestException('لا يمكن تسجيل الحضور - المتدرب مفصول نهائياً');
      }
      
      if (suspensionCheck.suspensionType === 'TEMPORARY') {
        throw new BadRequestException(
          `لا يمكن تسجيل الحضور - المتدرب مفصول مؤقتاً حتى ${suspensionCheck.suspensionEnds}`
        );
      }
    }

    // ... متابعة تسجيل الحضور
  }
}
```

#### تحديث `backend/src/attendance/attendance.module.ts`:
```typescript
import { DisciplinaryActionsModule } from '../disciplinary-actions/disciplinary-actions.module';

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    TraineePlatformModule,
    DisciplinaryActionsModule, // <-- إضافة
  ],
  // ...
})
```

---

### الخطوة 4: التكامل مع منصة المتدربين

#### تحديث `backend/src/trainee-platform/trainee-payment-status.service.ts`:

```typescript
import { DisciplinaryActionsService } from '../disciplinary-actions/disciplinary-actions.service';

@Injectable()
export class TraineePaymentStatusService {
  constructor(
    private prisma: PrismaService,
    private disciplinaryActionsService: DisciplinaryActionsService, // <-- إضافة
  ) {}

  async checkTraineeAccess(traineeId: number) {
    // 1. فحص الفصل أولاً (أعلى أولوية)
    const suspensionCheck = await this.disciplinaryActionsService.isTraineeSuspended(traineeId);
    
    if (suspensionCheck.isSuspended) {
      return {
        canAccess: false,
        blockReason: suspensionCheck.suspensionType === 'PERMANENT' 
          ? 'PERMANENT_EXPULSION' 
          : 'TEMPORARY_SUSPENSION',
        blockInfo: {
          reason: suspensionCheck.reason,
          suspensionEnds: suspensionCheck.suspensionEnds,
        },
      };
    }

    // 2. فحص مواعيد السداد (كما هو حالياً)
    // ... الكود الموجود
  }
}
```

#### تحديث `backend/src/trainee-platform/trainee-platform.module.ts`:
```typescript
import { DisciplinaryActionsModule } from '../disciplinary-actions/disciplinary-actions.module';

@Module({
  imports: [
    PrismaModule,
    TraineeAuthModule,
    PermissionsModule,
    DisciplinaryActionsModule, // <-- إضافة
  ],
  // ...
})
```

---

### الخطوة 5: Frontend - إضافة في صفحة المتدربين

#### في `src/app/dashboard/trainees/page.tsx`:

**1. إضافة الصلاحية**:
```typescript
const canManageDisciplinaryActions = userPermissions?.hasPermission(
  'dashboard.trainees.disciplinary-actions', 
  'manage'
) || false;
```

**2. إضافة State**:
```typescript
const [showDisciplinaryModal, setShowDisciplinaryModal] = useState(false);
const [selectedTraineeForDisciplinary, setSelectedTraineeForDisciplinary] = useState<Trainee | null>(null);
const [disciplinaryFormData, setDisciplinaryFormData] = useState({
  actionType: '',
  reason: '',
  startDate: '',
  endDate: '',
  notes: '',
  guardianNotified: false,
  guardianNotificationDate: '',
});
```

**3. إضافة في ActionMenu** (بعد السطر 3324):
```typescript
{canManageDisciplinaryActions && (
  <>
    <hr className="my-1 border-gray-200" />
    <button
      onClick={() => {
        setIsOpen(false);
        setSelectedTraineeForDisciplinary(trainee);
        setShowDisciplinaryModal(true);
      }}
      className="flex items-center px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-red-50 w-full text-right transition-colors duration-150 active:bg-red-100"
      role="menuitem"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="ml-3 sm:ml-2 h-5 w-5 sm:h-4 sm:w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span className="font-medium text-red-600">إجراءات عقابية</span>
    </button>
  </>
)}
```

**4. إضافة Modal الإجراءات العقابية** (قبل closing tag):
```typescript
{/* Modal الإجراءات العقابية */}
{showDisciplinaryModal && selectedTraineeForDisciplinary && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">إجراءات عقابية</h3>
            <p className="text-sm text-gray-600 mt-1">اتخاذ إجراء تأديبي ضد المتدرب</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowDisciplinaryModal(false);
            setSelectedTraineeForDisciplinary(null);
            setDisciplinaryFormData({
              actionType: '',
              reason: '',
              startDate: '',
              endDate: '',
              notes: '',
              guardianNotified: false,
              guardianNotificationDate: '',
            });
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* معلومات المتدرب */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 mb-6 border border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <AcademicCapIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{selectedTraineeForDisciplinary.nameAr}</p>
              <p className="text-sm text-gray-600">
                {selectedTraineeForDisciplinary.nationalId} • {selectedTraineeForDisciplinary.program?.nameAr}
              </p>
            </div>
          </div>
        </div>

        {/* النموذج */}
        <div className="space-y-5">
          {/* نوع الإجراء */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الإجراء العقابي <span className="text-red-500">*</span>
            </label>
            <select
              value={disciplinaryFormData.actionType}
              onChange={(e) => setDisciplinaryFormData({ ...disciplinaryFormData, actionType: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            >
              <option value="">اختر نوع الإجراء</option>
              <option value="WARNING">⚠️ لفت نظر</option>
              <option value="GUARDIAN_SUMMON">👨‍👩‍👦 استدعاء ولي الأمر</option>
              <option value="REPORT_FILING">📋 حفظ محضر</option>
              <option value="TEMPORARY_SUSPENSION">🚫 فصل مؤقت</option>
              <option value="PERMANENT_EXPULSION">❌ فصل نهائي</option>
            </select>
          </div>

          {/* التواريخ (للفصل المؤقت فقط) */}
          {disciplinaryFormData.actionType === 'TEMPORARY_SUSPENSION' && (
            <div className="grid grid-cols-2 gap-4 bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ البداية <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={disciplinaryFormData.startDate}
                  onChange={(e) => setDisciplinaryFormData({ ...disciplinaryFormData, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ النهاية <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={disciplinaryFormData.endDate}
                  onChange={(e) => setDisciplinaryFormData({ ...disciplinaryFormData, endDate: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>
          )}

          {/* السبب */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سبب الإجراء العقابي <span className="text-red-500">*</span>
            </label>
            <textarea
              value={disciplinaryFormData.reason}
              onChange={(e) => setDisciplinaryFormData({ ...disciplinaryFormData, reason: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={4}
              placeholder="اذكر السبب التفصيلي لاتخاذ الإجراء..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              يجب ذكر سبب واضح ومحدد لاتخاذ الإجراء العقابي (على الأقل 10 أحرف)
            </p>
          </div>

          {/* الملاحظات */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات إدارية إضافية
            </label>
            <textarea
              value={disciplinaryFormData.notes}
              onChange={(e) => setDisciplinaryFormData({ ...disciplinaryFormData, notes: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              rows={2}
              placeholder="ملاحظات أو تفاصيل إضافية..."
            />
          </div>

          {/* إبلاغ ولي الأمر */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={disciplinaryFormData.guardianNotified}
                onChange={(e) => setDisciplinaryFormData({ 
                  ...disciplinaryFormData, 
                  guardianNotified: e.target.checked,
                  guardianNotificationDate: e.target.checked ? new Date().toISOString().split('T')[0] : ''
                })}
                className="mt-1 h-4 w-4 text-blue-600 rounded"
              />
              <div className="flex-1">
                <label className="text-sm font-medium text-blue-900">
                  تم إبلاغ ولي الأمر
                </label>
                <p className="text-xs text-blue-700 mt-1">
                  رقم ولي الأمر: {selectedTraineeForDisciplinary.guardianPhone}
                </p>
              </div>
            </div>
          </div>

          {/* تحذير */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <p className="font-medium mb-1">⚠️ تحذير هام:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>الفصل النهائي سيمنع المتدرب من الوصول للمنصة نهائياً</li>
                  <li>الفصل المؤقت سيمنع المتدرب من الحضور والمنصة خلال الفترة المحددة</li>
                  <li>جميع الإجراءات سيتم تسجيلها وأرشفتها</li>
                  <li>يمكن مراجعة جميع الإجراءات من سجلات التدقيق</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
        <Button
          variant="outline"
          onClick={() => {
            setShowDisciplinaryModal(false);
            setSelectedTraineeForDisciplinary(null);
            setDisciplinaryFormData({
              actionType: '',
              reason: '',
              startDate: '',
              endDate: '',
              notes: '',
              guardianNotified: false,
              guardianNotificationDate: '',
            });
          }}
          className="px-6"
        >
          إلغاء
        </Button>
        <Button
          onClick={async () => {
            // التحقق من البيانات
            if (!disciplinaryFormData.actionType) {
              toast.error('يجب اختيار نوع الإجراء');
              return;
            }

            if (!disciplinaryFormData.reason.trim() || disciplinaryFormData.reason.length < 10) {
              toast.error('يجب إدخال سبب الإجراء (10 أحرف على الأقل)');
              return;
            }

            if (disciplinaryFormData.actionType === 'TEMPORARY_SUSPENSION') {
              if (!disciplinaryFormData.startDate || !disciplinaryFormData.endDate) {
                toast.error('يجب تحديد تاريخ البداية والنهاية للفصل المؤقت');
                return;
              }
            }

            try {
              const response = await fetchAPI(`/disciplinary-actions`, {
                method: 'POST',
                body: JSON.stringify({
                  traineeId: selectedTraineeForDisciplinary.id,
                  actionType: disciplinaryFormData.actionType,
                  reason: disciplinaryFormData.reason,
                  startDate: disciplinaryFormData.startDate || null,
                  endDate: disciplinaryFormData.endDate || null,
                  notes: disciplinaryFormData.notes || null,
                  guardianNotified: disciplinaryFormData.guardianNotified,
                  guardianNotificationDate: disciplinaryFormData.guardianNotificationDate || null,
                }),
              });

              if (response.success) {
                toast.success('✅ تم اتخاذ الإجراء العقابي بنجاح');
                setShowDisciplinaryModal(false);
                setSelectedTraineeForDisciplinary(null);
                setDisciplinaryFormData({
                  actionType: '',
                  reason: '',
                  startDate: '',
                  endDate: '',
                  notes: '',
                  guardianNotified: false,
                  guardianNotificationDate: '',
                });
              } else {
                throw new Error(response.message || 'فشل في اتخاذ الإجراء');
              }
            } catch (error: any) {
              console.error('Error creating disciplinary action:', error);
              toast.error(error.message || 'حدث خطأ في اتخاذ الإجراء العقابي');
            }
          }}
          className="px-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          تنفيذ الإجراء
        </Button>
      </div>
    </div>
  </div>
)}
```

---

### الخطوة 6: صفحة حجب للمتدربين المفصولين

#### إنشاء `src/app/trainee-dashboard/suspended/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TraineeSuspendedPage() {
  const router = useRouter();
  const [suspensionInfo, setSuspensionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuspension = async () => {
      try {
        const token = localStorage.getItem('trainee_token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/trainee-platform/access-check`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        const data = await response.json();
        
        if (data.blockReason === 'PERMANENT_EXPULSION' || data.blockReason === 'TEMPORARY_SUSPENSION') {
          setSuspensionInfo(data.blockInfo);
        }
      } catch (error) {
        console.error('Error checking suspension:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSuspension();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  const isPermanent = suspensionInfo?.suspensionType === 'PERMANENT';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white bg-opacity-20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isPermanent ? 'فصل نهائي' : 'فصل مؤقت'}
          </h1>
          <p className="text-red-100">
            {isPermanent 
              ? 'تم فصلك نهائياً من البرنامج التدريبي'
              : 'تم فصلك مؤقتاً من البرنامج التدريبي'
            }
          </p>
        </div>

        {/* Body */}
        <div className="p-8">
          {/* السبب */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-red-900 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              سبب الفصل:
            </h3>
            <p className="text-red-800 leading-relaxed">{suspensionInfo?.reason || 'لم يتم تحديد السبب'}</p>
          </div>

          {/* المدة (للفصل المؤقت) */}
          {!isPermanent && suspensionInfo?.suspensionEnds && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-orange-900 mb-3">مدة الفصل:</h3>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-orange-800 font-semibold">
                  حتى: {new Date(suspensionInfo.suspensionEnds).toLocaleDateString('ar-EG', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}

          {/* معلومات التواصل */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">للاستفسار:</h3>
            <div className="space-y-2 text-blue-800">
              <p className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                اتصل بإدارة المركز
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 للتشغيل

```bash
# 1. تطبيق Schema
cd backend
npx prisma generate
npx prisma db push

# 2. تطبيق الصلاحيات
npm run prisma:seed

# 3. إنشاء الملفات المتبقية يدوياً (أعلاه)

# 4. إعادة تشغيل
npm run start:dev
```

---

## 📊 API Endpoints

```
POST   /disciplinary-actions                     - اتخاذ إجراء عقابي
GET    /disciplinary-actions/trainee/:id         - إجراءات متدرب
GET    /disciplinary-actions/trainee/:id/active  - الإجراءات النشطة
GET    /disciplinary-actions/trainee/:id/check-suspension - فحص الفصل
GET    /disciplinary-actions/stats                - إحصائيات
GET    /disciplinary-actions                      - جميع الإجراءات (مع فلترة)
PUT    /disciplinary-actions/:id                  - تحديث إجراء
DELETE /disciplinary-actions/:id                  - حذف إجراء
```

---

## 🎯 الميزات

✅ **5 أنواع إجراءات عقابية**:
1. لفت نظر
2. استدعاء ولي الأمر
3. حفظ محضر
4. فصل مؤقت (من تاريخ → إلى تاريخ)
5. فصل نهائي

✅ **حجب تلقائي**:
- منع الحضور في المحاضرات
- منع الوصول للمنصة
- رسائل واضحة للمتدرب

✅ **تكامل كامل** مع:
- نظام الحضور
- منصة المتدربين
- نظام مواعيد السداد

---

**جاهز للتنفيذ!** 🚀