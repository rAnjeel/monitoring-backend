/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PassCredentials } from './pass-credentials.entity';
import { PassCredentialsDTO } from './pass-credentialsDTO';
import { EncryptionService } from '../sha/encryption.service';

@Injectable()
export class PassCredentialsService {
  constructor(
    @InjectRepository(PassCredentials)
    private readonly repo: Repository<PassCredentials>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(dto: PassCredentialsDTO): Promise<PassCredentials> {
    const encryptedPassword = this.encryptionService.encrypt(dto.password);
    const pass = this.repo.create({ ...dto, password: encryptedPassword });
    return this.repo.save(pass);
  }

  async findAll(): Promise<PassCredentials[]> {
    const passes = await this.repo.find();
    return passes.map((p) => ({
      ...p,
        password: this.encryptionService.decrypt(p.password),
        siteSSHVersion: p.siteSSHVersion,
    }));
  }

  async findOne(id: number): Promise<PassCredentials> {
    const pass = await this.repo.findOne({ where: { id } });
    if (!pass) throw new NotFoundException(`PassCredentials #${id} not found`);
    return {
      ...pass,
        password: this.encryptionService.decrypt(pass.password),
        siteSSHVersion: pass.siteSSHVersion,
    };
  }

  async update(id: number, dto: Partial<PassCredentialsDTO>): Promise<PassCredentials> {
    if (dto.password) {
      dto.password = this.encryptionService.encrypt(dto.password);
    }
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const pass = await this.findOne(id);
    await this.repo.remove(pass);
  }
}
