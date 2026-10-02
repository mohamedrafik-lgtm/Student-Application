import { Module } from '@nestjs/common';
import { PdfGeneratorService } from './pdf-generator.service';
import { PuppeteerPdfService } from './puppeteer-pdf.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [PdfGeneratorService, PuppeteerPdfService],
  exports: [PdfGeneratorService, PuppeteerPdfService],
})
export class PdfModule {}