/* eslint-disable prettier/prettier */
import { Controller, Post, Body } from '@nestjs/common';
import { CsvImportService } from './csv-import.service';
import { CredentialDTO } from '../credentials/credentialsDTO';

@Controller('import-csv')
export class CsvImportController {
  constructor(private readonly csvImportService: CsvImportService) {}

  @Post()
  async importCredentials(@Body() credentials: CredentialDTO[]) {
    return this.csvImportService.importCredentials(credentials);
  }
}
