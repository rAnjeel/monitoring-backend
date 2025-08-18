import {
  Controller,
  Get,
  Param,
  Put,
  Body,
  BadRequestException,
  NotFoundException,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CredentialsService } from '../credentials/credentials.service';
import { CredentialDTO } from '../credentials/credentialsDTO';
import { Request } from 'express';

@ApiTags('Credentials') // Regroupe dans Swagger
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialService: CredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les credentials' })
  @ApiResponse({ status: 200, description: 'Liste de tous les credentials' })
  async getAll() {
    return this.credentialService.findAll();
  }

  @Get('list-connection')
  @ApiOperation({ summary: 'Récupérer tous les credentials avec leur dernière erreur' })
  async getAllWithLastError() {
    return this.credentialService.getCredentialsWithLastErrorDate();
  }

  @Get('sync')
  @ApiOperation({ summary: 'Synchroniser tous les credentials' })
  async syncCredentials() {
    return this.credentialService.compareCredentials();
  }

  @Get('sync/to-verify')
  @ApiOperation({ summary: 'Récupérer les sites à vérifier' })
  async syncSitesToVerify() {
    return this.credentialService.compareToVerifySitesCredentials();
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Récupérer un credential par son ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID du credential' })
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
  @ApiOperation({ summary: 'Vérifier les credentials d’un site' })
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
  @ApiOperation({ summary: 'Résoudre un problème de credentials' })
  @ApiParam({ name: 'id', type: String, description: 'ID du credential à résoudre' })
  @ApiBody({ type: CredentialDTO })
  async solve(@Param('id') id: string, @Body() updateDto: Partial<CredentialDTO>) {
    return this.credentialService.solveCredentials(Number(id), updateDto);
  }
}
