/* eslint-disable prettier/prettier */
import {
  Controller, Get, Param, Put, Body, BadRequestException,
  NotFoundException, Post, Req
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CredentialsService } from '../credentials/credentials.service';
import { CredentialDTO } from '../credentials/credentialsDTO';
import { Request } from 'express';

@ApiTags('Credentials')
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialService: CredentialsService) { }

  @Get()
  @ApiOperation({ summary: 'Lister tous les credentials' })
  @ApiResponse({ status: 200, description: 'Liste de tous les credentials' })
  async getAll() {
    return this.credentialService.findAll();
  }

  @Get('list-connection')
  @ApiOperation({ summary: 'Lister avec la dernière erreur' })
  async getAllWithLastError() {
    return this.credentialService.getCredentialsWithLastErrorDate();
  }

  @Get('sync')
  @ApiOperation({ summary: 'Comparer les credentials' })
  async syncCredentials() {
    return this.credentialService.compareCredentialsBySSH();
  }

  @Get('sync/to-verify')
  @ApiOperation({ summary: 'Lister les sites à vérifier' })
  async syncSitesToVerify() {
    return this.credentialService.compareToVerifySitesCredentialsBySSH();
  }

  @Post('sync/list')
  @ApiOperation({ summary: 'Vérifier une liste de credentials' })
  @ApiBody({ type: [CredentialDTO] })
  async checkCredentialsList(@Body() credentialsList: CredentialDTO[]) {
    return await this.credentialService.verifyCredentialsListBySSH(credentialsList);
  }


  @Get('/:id')
  @ApiOperation({ summary: 'Récupérer un credential par ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Credential trouvé' })
  @ApiResponse({ status: 404, description: 'Credential introuvable' })
  async getById(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(`L'ID '${id}' n'est pas un nombre valide`);
    }

    const credential = await this.credentialService.findOne(numericId);
    if (!credential) {
      throw new NotFoundException(`Aucun credential trouvé pour l'ID ${numericId}`);
    }

    return credential;
  }

  @Post('check')
  @ApiOperation({ summary: 'Vérifier un credential' })
  @ApiBody({ type: CredentialDTO })
  async checkCredential(@Body() dto: CredentialDTO, @Req() req: Request) {
    const ip = this.getClientIp(req);

    const verification = await this.credentialService.verifySiteCredentials(
      dto.Ip,
      dto.siteUsername,
      dto.sitePassword,
      dto.sitePort,
    );

    return {
      userIp: ip,
      siteIp: dto.Ip,
      status: verification.match ? 'success' : 'failed',
      siteUsername: dto.siteUsername,
      details: {
        usernameMatch: verification.details.usernameMatch,
        passwordMatch: verification.details.passwordMatch,
        portMatch: verification.details.portMatch,
      },
      error: verification.error || undefined,
    };
  }

  private getClientIp(req: Request): string {
    if (req['clientIp']) return req['clientIp'] as string;
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (Array.isArray(xForwardedFor)) {
      return xForwardedFor[0];
    } else if (typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown-ip';
  }

  @Put('solve/:id')
  @ApiOperation({ summary: 'Résoudre une erreur de credentials' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: CredentialDTO })
  async solve(@Param('id') id: string, @Body() updateDto: Partial<CredentialDTO>) {
    return this.credentialService.solveCredentials(Number(id), updateDto);
  }
}
