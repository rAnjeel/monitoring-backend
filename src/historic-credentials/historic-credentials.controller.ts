/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { HistoricCredentialsService } from './historic-credentials.service';
import { HistoricCredentialsDTO } from './historic-credentialsDTO';
import { HistoricCredentials } from './historic-credentials.entity';

@ApiTags('Historic Credentials')
@Controller('historic-credentials')
export class HistoricCredentialsController {
    constructor(private readonly historicCredentialsService: HistoricCredentialsService) { }

    @Get()
    @ApiOperation({ summary: 'Lister tout l’historique des credentials' })
    async findAll(): Promise<HistoricCredentials[]> {
        return this.historicCredentialsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Récupérer une entrée historique par ID' })
    @ApiParam({ name: 'id', type: Number })
    async findOne(@Param('id') id: string): Promise<HistoricCredentials | null> {
        return this.historicCredentialsService.findOne(Number(id));
    }

    @Post()
    @ApiOperation({ summary: 'Créer une entrée historique' })
    @ApiBody({ type: HistoricCredentialsDTO })
    async create(@Body() createDto: HistoricCredentialsDTO): Promise<HistoricCredentials> {
        return this.historicCredentialsService.create(createDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Mettre à jour une entrée historique' })
    @ApiParam({ name: 'id', type: Number })
    @ApiBody({ type: HistoricCredentialsDTO })
    async update(
        @Param('id') id: string,
        @Body() updateDto: HistoricCredentialsDTO,
    ): Promise<HistoricCredentials | null> {
        return this.historicCredentialsService.update(Number(id), updateDto);
    }
}
