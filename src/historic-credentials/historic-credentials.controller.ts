/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { HistoricCredentialsService } from './historic-credentials.service';
import { HistoricCredentialsDTO } from './historic-credentialsDTO';
import { HistoricCredentials } from './historic-credentials.entity';

@Controller('historic-credentials')
export class HistoricCredentialsController {
  constructor(private readonly historicCredentialsService: HistoricCredentialsService) {}

    @Get()
    async findAll(): Promise<HistoricCredentials[]> {
        return this.historicCredentialsService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<HistoricCredentials | null> {
        return this.historicCredentialsService.findOne(Number(id));
    }

    @Post()
    async create(@Body() createDto: HistoricCredentialsDTO): Promise<HistoricCredentials> {
        return this.historicCredentialsService.create(createDto);
    }
    
    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() updateDto: HistoricCredentialsDTO,
    ): Promise<HistoricCredentials | null> {
        return this.historicCredentialsService.update(Number(id), updateDto);
    }

    
}
