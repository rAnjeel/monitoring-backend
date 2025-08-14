/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Put, Body, BadRequestException, NotFoundException, Post, Req } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { CredentialDTO } from '../credentials/credentialsDTO';
import { Request } from 'express';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialService: CredentialsService) {}

  @Get()
  async getAll() {
    return this.credentialService.findAll();
  }

  @Get('list-connection')
  async getAllWithLastError() {
    return this.credentialService.getCredentialsWithLastErrorDate();
  }

  @Get('sync')
  async syncCredentials() {
    return this.credentialService.compareCredentials();
  }

  @Get('sync/to-verify')
  async syncSitesToVerify() {
    return this.credentialService.compareToVerifySitesCredentials();
  }

  @Get('/:id')
  async getById(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(`L'ID '${id}' n'est pas un nombre valide`);
    }

    const credential = await this.credentialService.findOne(numericId);
    if (!credential) {
      throw new NotFoundException(
        `Aucun credential trouvé pour l'ID ${numericId}`,
      );
    }

    return credential;
  }

  @Post('check')
  async checkCredential(@Body() dto: CredentialDTO, @Req() req: Request) {
    const ip = this.getClientIp(req);
    
    // Appel à la nouvelle méthode avec les paramètres du DTO
    const verification = await this.credentialService.verifySiteCredentials(
        dto.Ip,
        dto.siteUsername,
        dto.sitePassword,
        dto.sitePort
    );

    return {
        userIp: ip,
        siteIp: dto.Ip,
        status: verification.match ? 'success' : 'failed',
        siteUsername: dto.siteUsername,
        details: {
            usernameMatch: verification.details.usernameMatch,
            passwordMatch: verification.details.passwordMatch,
            portMatch: verification.details.portMatch
        },
        error: verification.error || undefined
    };
  }

  private getClientIp(req: Request): string {
      // 1. Vérification typée de clientIp (si tu as étendu l'interface Request)
      if (req['clientIp']) return req['clientIp'] as string;
      
      // 2. Fallback sur les headers standard
      const xForwardedFor = req.headers['x-forwarded-for'];
      if (Array.isArray(xForwardedFor)) {
          return xForwardedFor[0];
      } else if (typeof xForwardedFor === 'string') {
          return xForwardedFor.split(',')[0].trim();
      }
      
      // 3. Dernier recours
      return req.socket?.remoteAddress || 'unknown-ip';
  }

  @Put('solve/:id')
  async solve(
    @Param('id') id: string,
    @Body() updateDto: Partial<CredentialDTO>,
  ) {
    return this.credentialService.solveCredentials(Number(id), updateDto);
  }
}
