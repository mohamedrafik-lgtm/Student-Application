import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// التأكد من وجود مجلد الرفع
const uploadDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// التأكد من وجود المجلدات الفرعية
const subDirs = ['trainees', 'news', 'logos', 'lectures', 'avatars'];
for (const dir of subDirs) {
  const path = join(uploadDir, dir);
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

@Module({
  imports: [
    MulterModule.register({
      dest: uploadDir,
    }),
    CloudinaryModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}