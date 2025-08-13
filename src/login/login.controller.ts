/* eslint-disable prettier/prettier */
import { Controller, Post, Req, Body } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { LoginGateway } from './login.gateway';
import { CredentialDTO } from '../credentials/credentialsDTO';
import { Request } from 'express';

@Controller('auth')
export class LoginController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly loginGateway: LoginGateway
  ) {}

  private getClientIp(req: Request): string {
    return req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown-ip';
  }

  @Post('login')
  async login(@Body() dto: CredentialDTO, @Req() req: Request) {
    const ip = this.getClientIp(req);

    const result = await this.credentialsService.verifySiteCredentials(
      dto.Ip,
      dto.siteUsername,
      dto.sitePassword,
      dto.sitePort
    );

    if (!result.match) {
      console.log(`❌ Login échoué depuis IP: ${ip}`);
      this.loginGateway.emitFailedLogin({ ip, ...result.details });
      return { status: 'failed', ip, ...result.details };
    }

    return { status: 'success', ip };
  }
}
