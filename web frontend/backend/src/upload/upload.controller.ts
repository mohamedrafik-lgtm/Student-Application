import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  UseGuards, 
  BadRequestException,
  HttpStatus,
  Query,
  Logger
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import { ApiTags, ApiConsumes, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);
  
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // استخدام memory storage لـ Cloudinary
      fileFilter: (req, file, callback) => {
        // Get the folder parameter from the query
        const folder = req.query.folder as string || '';
        const logger = new Logger(UploadController.name);
        logger.log(`Uploading file: ${file.originalname}, mimetype: ${file.mimetype}, to folder: ${folder}`);

        const isImageFile = file.mimetype.startsWith('image/');
        const isPdfOrWordMime = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ].includes(file.mimetype);
        const isPdfOrWordByExtension = /\.(pdf|doc|docx)$/i.test(file.originalname);

        // Check file type based on folder
        if (folder === 'lectures') {
          // For lectures, allow only PDF files
          if (file.mimetype === 'application/pdf') {
            callback(null, true);
          } else {
            logger.error(`Invalid file type for lectures: ${file.mimetype}`);
            callback(new BadRequestException('Only PDF files are allowed for lectures'), false);
          }
        } else if (folder === 'ministry-declarations') {
          // For ministry declarations, allow images + PDF + Word
          if (isImageFile || isPdfOrWordMime || isPdfOrWordByExtension) {
            callback(null, true);
          } else {
            logger.error(`Invalid file type for ministry declarations: ${file.originalname} (${file.mimetype})`);
            callback(
              new BadRequestException('Allowed types for ministry declarations are: images, PDF, DOC, DOCX'),
              false,
            );
          }
        } else {
          // For other folders, allow only images
          if (!isImageFile && !file.originalname.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
            logger.error(`Invalid file type: ${file.originalname}`);
            return callback(new BadRequestException('Only image files are allowed'), false);
          }
          callback(null, true);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiQuery({ name: 'folder', required: false, description: 'Folder to upload to: logos, trainees, lectures, idcards, ministry-declarations' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم رفع الملف بنجاح وإرجاع عنوان URL للصورة' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'لم يتم توفير ملف أو نوع الملف غير مدعوم' 
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string,
  ) {
    this.logger.log(`Received file: ${file?.originalname || 'undefined'}`);
    
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    // استدعاء خدمة رفع الملفات مع تحديد المجلد
    const result = await this.uploadService.uploadFile(file, folder);
    this.logger.log(`File uploaded successfully: ${result.url}`);
    return result;
  }
}