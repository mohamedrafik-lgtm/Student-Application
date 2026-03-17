import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { GoogleVisionModule } from './google-vision/google-vision.module';
import { OpenAIVisionModule } from './openai-vision/openai-vision.module';
import { PdfQuestionsModule } from './pdf-questions/pdf-questions.module';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TraineeAuthModule } from './trainee-auth/trainee-auth.module';
import { TraineesModule } from './trainees/trainees.module';
import { ProgramsModule } from './programs/programs.module';
import { UsersModule } from './users/users.module';
import { NewsModule } from './news/news.module';
import { JobsModule } from './jobs/jobs.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { UploadModule } from './upload/upload.module';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { TrainingContentModule } from './training-content/training-content.module';
import { QuestionsModule } from './questions/questions.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LecturesModule } from './lectures/lectures.module';
import { IdCardsModule } from './id-cards/id-cards.module';
import { IdCardDesignsModule } from './id-card-designs/id-card-designs.module';
import { TrainingProgramsModule } from './training-programs/training-programs.module';

import { FinancesModule } from './finances/finances.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PermissionsModule } from './permissions/permissions.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { PdfModule } from './pdf/pdf.module';
import { MarketingModule } from './marketing/marketing.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { RedisModule } from './redis/redis.module';
import { CommissionsModule } from './commissions/commissions.module';
import { TraineePlatformModule } from './trainee-platform/trainee-platform.module';
import { TraineeDistributionModule } from './trainee-distribution/trainee-distribution.module';
import { ScheduleModule } from './schedule/schedule.module';
import { GradesModule } from './grades/grades.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { StudyMaterialsModule } from './study-materials/study-materials.module';
import { PaymentSchedulesModule } from './payment-schedules/payment-schedules.module';
import { DeferralRequestsModule } from './deferral-requests/deferral-requests.module';
import { PaymentRemindersModule } from './payment-reminders/payment-reminders.module';
import { DisciplinaryActionsModule } from './disciplinary-actions/disciplinary-actions.module';
import { LocationsModule } from './locations/locations.module';
import { TraineeRequestsModule } from './trainee-requests/trainee-requests.module';
import { PaperExamsModule } from './paper-exams/paper-exams.module';
import { DeveloperSettingsModule } from './developer-settings/developer-settings.module';
import { GradeReleaseModule } from './grade-release/grade-release.module';
import { HealthModule } from './health/health.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { SurveysModule } from './surveys/surveys.module';
import { GradeAppealsModule } from './grade-appeals/grade-appeals.module';
import { BackupModule } from './backup/backup.module';
import { SecondRoundFeesModule } from './second-round-fees/second-round-fees.module';
import { StaffAttendanceModule } from './staff-attendance/staff-attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // 🛡️ Rate Limiting - حماية سخية للاستخدام العادي
    // الحدود عالية لعدم إزعاج الطلاب والموظفين
    ThrottlerModule.forRoot([
      {
        name: 'short',      // حماية من الـ burst السريع جداً
        ttl: 1000,          // 1 ثانية
        limit: 100,         // 100 طلب/ثانية (سخي جداً للتطوير)
      },
      {
        name: 'medium',     // الاستخدام العادي
        ttl: 60000,         // 1 دقيقة
        limit: 2000,        // 2000 طلب/دقيقة
      },
      {
        name: 'long',       // حماية طويلة المدى
        ttl: 3600000,       // 1 ساعة
        limit: 50000,       // 50,000 طلب/ساعة
      },
    ]),
    
    OpenAIVisionModule,
    GoogleVisionModule,
    PdfQuestionsModule,
    RedisModule,

    MulterModule.register({
      dest: './uploads',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        maxAge: '1d',
      },
    }),
    PrismaModule,
    AuthModule,
    TraineeAuthModule,
    TraineesModule,
    ProgramsModule,
    UsersModule,
    NewsModule,
    JobsModule,
    RegistrationsModule,
    UploadModule,
    AuditModule,
    SettingsModule,
    TrainingContentModule,
    QuestionsModule,
    AttendanceModule,
    LecturesModule,
    IdCardsModule,
    IdCardDesignsModule,
    TrainingProgramsModule,
    FinancesModule,
    DashboardModule,
    PermissionsModule,
    WhatsAppModule,
    PdfModule,
    MarketingModule,
    CloudinaryModule,
    CommissionsModule,
    TraineePlatformModule,
    TraineeDistributionModule,
    ScheduleModule,
    AttendanceModule,
    GradesModule,
    QuizzesModule,
    StudyMaterialsModule,
    PaymentSchedulesModule,
    DeferralRequestsModule,
    PaymentRemindersModule,
    DisciplinaryActionsModule,
    LocationsModule,
    TraineeRequestsModule,
    PaperExamsModule,
    DeveloperSettingsModule,
    GradeReleaseModule,
    HealthModule,
    ComplaintsModule,
    SurveysModule,
    GradeAppealsModule,
    BackupModule,
    SecondRoundFeesModule,
    StaffAttendanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // تفعيل Rate Limiting على كل الـ endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
