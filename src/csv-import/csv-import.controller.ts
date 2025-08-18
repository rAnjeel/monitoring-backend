/* eslint-disable prettier/prettier */
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CsvImportService } from './csv-import.service';
import { CredentialDTO } from '../credentials/credentialsDTO';

@ApiTags('CSV Import')
@Controller('import-csv')
export class CsvImportController {
  constructor(private readonly csvImportService: CsvImportService) { }

  @Post()
  @ApiOperation({ summary: 'Importer des credentials via un CSV' })
  @ApiBody({ type: [CredentialDTO] })
  async importCredentials(@Body() credentials: CredentialDTO[]) {
    return this.csvImportService.importCredentials(credentials);
  }
}
