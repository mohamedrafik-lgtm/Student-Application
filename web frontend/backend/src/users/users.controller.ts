import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { UserProgramAccessService } from './user-program-access.service';
import { UserDistributionAccessService } from './user-distribution-access.service';
import { UploadService } from '../upload/upload.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userProgramAccessService: UserProgramAccessService,
    private readonly userDistributionAccessService: UserDistributionAccessService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'The user has been successfully created.' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input data.' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Forbidden resource. Admin role required.' 
  })
  @ApiBody({ type: CreateUserDto })
  create(@Body() createUserDto: CreateUserDto, @Request() req) {
    console.log('=== USER CREATION CONTROLLER ===');
    console.log('Request user:', req.user);
    console.log('CreateUserDto:', createUserDto);
    console.log('================================');
    return this.usersService.create(createUserDto, req.user.userId || req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Return all users.' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Forbidden resource. Admin role required.' 
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me/allowed-programs')
  @ApiOperation({ summary: 'الحصول على البرامج المسموح للمستخدم الحالي بالوصول إليها' })
  getMyAllowedPrograms(@Request() req) {
    return this.userProgramAccessService.getAllowedProgramsWithDetails(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Return the user.' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'User not found.' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Forbidden resource. Admin role required.' 
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'The user has been successfully updated.' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input data.' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'User not found.' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Forbidden resource. Admin role required.' 
  })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    return this.usersService.update(id, updateUserDto, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'The user has been successfully deleted.' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'User not found.' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Forbidden resource. Admin role required.' 
  })
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user.userId);
  }

  @Post(':id/change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Password changed successfully.' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid current password or input data.' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Cannot change password for other users.' 
  })
  changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: { currentPassword: string; newPassword: string },
    @Request() req,
  ) {
    return this.usersService.changePassword(id, changePasswordDto, req.user.userId);
  }

  @Post(':id/security-pin')
  @ApiOperation({ summary: 'Set the current user security PIN' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ schema: { type: 'object', required: ['pin'], properties: { pin: { type: 'string', pattern: '^\\d{4}$' } } } })
  setSecurityPin(
    @Param('id') id: string,
    @Body() body: { pin: string },
    @Request() req,
  ) {
    return this.usersService.setSecurityPin(id, body.pin, req.user.userId);
  }

  @Patch(':id/security-pin')
  @ApiOperation({ summary: 'Change the current user security PIN' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ schema: { type: 'object', required: ['pin', 'currentPassword'], properties: { pin: { type: 'string', pattern: '^\\d{4}$' }, currentPassword: { type: 'string' } } } })
  changeSecurityPin(
    @Param('id') id: string,
    @Body() body: { pin: string; currentPassword: string },
    @Request() req,
  ) {
    return this.usersService.changeSecurityPin(id, body.pin, body.currentPassword, req.user.userId);
  }

  @Post(':id/security-pin/verify')
  @ApiOperation({ summary: 'Verify the current user security PIN' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ schema: { type: 'object', required: ['pin'], properties: { pin: { type: 'string', pattern: '^\\d{4}$' } } } })
  verifySecurityPin(
    @Param('id') id: string,
    @Body() body: { pin: string },
    @Request() req,
  ) {
    return this.usersService.verifySecurityPin(id, body.pin, req.user.userId);
  }

  @Get(':id/allowed-programs')
  @ApiOperation({ summary: 'الحصول على البرامج المسموح للمستخدم بالوصول إليها' })
  @ApiParam({ name: 'id', description: 'User ID' })
  getAllowedPrograms(@Param('id') id: string) {
    return this.userProgramAccessService.getAllowedProgramsWithDetails(id);
  }

  @Patch(':id/allowed-programs')
  @ApiOperation({ summary: 'تعيين البرامج المسموح للمستخدم بالوصول إليها' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ schema: { type: 'object', properties: { programIds: { type: 'array', items: { type: 'number' } } } } })
  async setAllowedPrograms(
    @Param('id') id: string,
    @Body() body: { programIds: number[] },
  ) {
    await this.userProgramAccessService.setAllowedPrograms(id, body.programIds || []);
    return { message: 'تم تحديث البرامج المسموحة بنجاح', programIds: body.programIds };
  }

  @Get(':id/allowed-distributions')
  @ApiOperation({ summary: 'الحصول على التوزيعات المسموح للمستخدم بالوصول إليها' })
  @ApiParam({ name: 'id', description: 'User ID' })
  getAllowedDistributions(@Param('id') id: string) {
    return this.userDistributionAccessService.getAllowedDistributionsWithDetails(id);
  }

  @Patch(':id/allowed-distributions')
  @ApiOperation({ summary: 'تعيين التوزيعات المسموح للمستخدم بالوصول إليها' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ schema: { type: 'object', properties: { distributionIds: { type: 'array', items: { type: 'string' } } } } })
  async setAllowedDistributions(
    @Param('id') id: string,
    @Body() body: { distributionIds: string[] },
  ) {
    await this.userDistributionAccessService.setAllowedDistributions(id, body.distributionIds || []);
    return { message: 'تم تحديث التوزيعات المسموحة بنجاح', distributionIds: body.distributionIds };
  }

  @Patch(':id/profile-photo')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'تحديث الصورة الشخصية للمستخدم' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'User ID' })
  async updateProfilePhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    // التحقق من أن المستخدم يحدث صورته الخاصة
    const currentUserId = req.user.userId || req.user.id;
    if (currentUserId !== id) {
      // يمكن السماح للأدمن بتحديث صور الآخرين لاحقاً
    }

    if (!file) {
      throw new Error('لم يتم توفير ملف الصورة');
    }

    // رفع الصورة عبر خدمة الرفع
    const uploadResult = await this.uploadService.uploadFile(file, 'avatars');
    const photoUrl = uploadResult.url || uploadResult.secure_url || uploadResult.filePath;

    // تحديث رابط الصورة في قاعدة البيانات
    return this.usersService.updateProfilePhoto(id, photoUrl);
  }

  @Delete(':id/profile-photo')
  @ApiOperation({ summary: 'حذف الصورة الشخصية للمستخدم' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async removeProfilePhoto(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.usersService.removeProfilePhoto(id);
  }
}
