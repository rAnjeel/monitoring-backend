/* eslint-disable prettier/prettier */
import {
  Controller, Get, Param, Put, Body, BadRequestException,
  NotFoundException, Post, Delete
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PassCredentialsService } from './pass-credentials.service';
import { PassCredentialsDTO } from './pass-credentialsDTO';

@ApiTags('Pass Credentials')
@Controller('pass-credentials')
export class PassCredentialsController {
  constructor(private readonly passCredentialService: PassCredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les pass credentials' })
  @ApiResponse({ status: 200, description: 'Liste de tous les pass credentials' })
  async getAll() {
    return this.passCredentialService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Créer un pass credential' })
  @ApiBody({ type: PassCredentialsDTO })
  @ApiResponse({ status: 201, description: 'Pass credential créé avec succès' })
  async create(@Body() dto: PassCredentialsDTO) {
    return this.passCredentialService.create(dto);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Récupérer un pass credential par ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Pass credential trouvé' })
  @ApiResponse({ status: 404, description: 'Pass credential introuvable' })
  async getById(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(`L'ID '${id}' n'est pas un nombre valide`);
    }

    const passCredential = await this.passCredentialService.findOne(numericId);
    if (!passCredential) {
      throw new NotFoundException(`Aucun pass credential trouvé pour l'ID ${numericId}`);
    }

    return passCredential;
  }

  @Put('update/:id')
  @ApiOperation({ summary: 'Mettre à jour un pass credential' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: PassCredentialsDTO })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<PassCredentialsDTO>
  ) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(`L'ID '${id}' n'est pas un nombre valide`);
    }
    return this.passCredentialService.update(numericId, updateDto);
  }

  @Delete('remove/:id')
  @ApiOperation({ summary: 'Supprimer un pass credential' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(`L'ID '${id}' n'est pas un nombre valide`);
    }
    return this.passCredentialService.remove(numericId);
  }
}
