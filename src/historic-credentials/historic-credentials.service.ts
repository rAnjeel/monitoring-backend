/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoricCredentials } from './historic-credentials.entity';
import { HistoricCredentialsDTO } from './historic-credentialsDTO';

@Injectable()
export class HistoricCredentialsService {
  constructor(
    @InjectRepository(HistoricCredentials)
    private readonly historicCredentialsRepository: Repository<HistoricCredentials>,
  ) {}

    async findAll(): Promise<HistoricCredentials[]> {
        return this.historicCredentialsRepository.find();
    }

    async findOne(id: number): Promise<HistoricCredentials | null> {
        return this.historicCredentialsRepository.findOneBy({ id });
    }

    async create(dto: HistoricCredentialsDTO): Promise<HistoricCredentials> {
        const entity = this.historicCredentialsRepository.create(dto);
        return this.historicCredentialsRepository.save(entity);
    }
    
    async update(
        id: number,
        updateDto: HistoricCredentialsDTO,
    ): Promise<HistoricCredentials | null> {
        await this.historicCredentialsRepository.update(id, updateDto);
        return this.findOne(id);
    }

  async getLatestUnresolvedBySiteId(siteId: number): Promise<HistoricCredentials | null> {
    return this.historicCredentialsRepository.findOne({
      where: {
        siteId,
        errorStatus: 'unresolved',
      },
      order: {
        connectionErrorDate: 'DESC',
      },
    });
  }
}
