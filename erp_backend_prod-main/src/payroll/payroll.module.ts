import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({ imports: [PrismaModule, PermissionsModule], controllers: [PayrollController], providers: [PayrollService], exports: [PayrollService] })
export class PayrollModule {}
