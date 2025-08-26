/* eslint-disable prettier/prettier */
import { Controller, Post, Req, Body } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { ApiGateway } from './api.gateway';
import { CredentialDTO } from '../credentials/credentialsDTO';
import { Request } from 'express';

@Controller('connexion')
export class ApiController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly apiGateway: ApiGateway
  ) {}

  private getClientIp(req: Request): string {
    return req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown-ip';
  }

  @Post('test')
  async login(@Body() dto: CredentialDTO, @Req() req: Request) {
    const ip = this.getClientIp(req);
    const siteIp = dto.Ip;
    const communicationProtocol = 'API';

    // ⚡ Appel avec tableau
    const verification = await this.credentialsService.verifyCredentialsListBySSH([dto]);

    const isSuccess = verification.matches.length > 0;

    if (!isSuccess) {
      console.log(`❌ Connexion échoué depuis IP: ${ip}`);

      const mismatch = verification.mismatches[0]; 
      this.apiGateway.emitFailedLogin({
        ip,
        siteIp,
        communicationProtocol,
        ...mismatch,
      });

      return {
        status: 'failed',
        ip,
        siteIp,
        communicationProtocol,
        ...mismatch,
      };
    }

    return { status: 'success', ip, siteIp, communicationProtocol };
  }
}
