/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CredentialDTO } from '../credentials/credentialsDTO';
import { CredentialsService } from '../credentials/credentials.service';

@Injectable()
export class CsvImportService {
  constructor(private readonly credentialsService: CredentialsService) {}

  async importCredentials(credentials: CredentialDTO[]) {
    return await Promise.all(
      credentials.map((credential) =>
        this.credentialsService.create(credential),
      ),
    );
  }
}
