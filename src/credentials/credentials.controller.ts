/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Put, Body } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { CredentialDTO } from '../credentials/credentialsDTO';


@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialService: CredentialsService) {}

  @Get()
  async getAll() {
    return this.credentialService.findAll();
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CredentialDTO>,
  ) {
    return this.credentialService.update(Number(id), updateDto);
  }

  @Get('sync')
  async syncCredentials() {
    return this.credentialService.compareCredentials();
  }
}
