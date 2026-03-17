import { Controller, Post, UseGuards, Request, Get, HttpStatus, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Return JWT access token and user data with roles',
    schema: {
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  displayName: { type: 'string' },
                  color: { type: 'string' },
                  icon: { type: 'string' },
                  priority: { type: 'number' }
                }
              }
            },
            primaryRole: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                displayName: { type: 'string' },
                color: { type: 'string' },
                icon: { type: 'string' },
                priority: { type: 'number' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Invalid credentials' 
  })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Return user profile information'
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized' 
  })
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @Post('request-password-reset')
  @ApiOperation({ summary: 'Request password reset code via WhatsApp' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Password reset code sent successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم إرسال كود إعادة تعيين كلمة المرور إلى WhatsApp' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid phone number or request failed' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'No account associated with this phone number' 
  })
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestPasswordResetDto.phoneNumber);
  }

  @Post('verify-reset-code')
  @ApiOperation({ summary: 'Verify password reset code' })
  @ApiBody({ type: VerifyResetCodeDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Reset code verified successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'كود التحقق صحيح' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid or expired reset code' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'No account associated with this phone number' 
  })
  async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(
      verifyResetCodeDto.phoneNumber, 
      verifyResetCodeDto.resetCode
    );
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with verified code' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Password reset successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم تغيير كلمة المرور بنجاح' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid or expired reset code' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'No account associated with this phone number' 
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.phoneNumber,
      resetPasswordDto.resetCode,
      resetPasswordDto.newPassword
    );
  }
}