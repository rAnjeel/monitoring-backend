/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CredentialDTO } from '../credentials/credentialsDTO';
import { CredentialsService } from '../credentials/credentials.service';

@Injectable()
export class CsvImportService {
  constructor(private readonly credentialsService: CredentialsService) {}

  async importCredentials(credentials: CredentialDTO[]) {
    const results = await Promise.all(
      credentials.map(async (credential) => {
        try {
          // Vérifie si l'IP existe déjà
          const existing = await this.credentialsService.findOneByIp(credential.Ip);

          let saved;
          if (existing) {
            // Update si trouvé
            saved = await this.credentialsService.update(existing.id, credential);
            return {
              status: 'success',
              message: `Credential ${credential.Ip} updated`,
              data: saved,
            };
          } else {
            // Sinon Create
            saved = await this.credentialsService.create(credential);
            return {
              status: 'success',
              message: `Credential ${credential.Ip} created`,
              data: saved,
            };
          }
        } catch (e) {
          return {
            status: 'error',
            message: `Failed to import ${credential.Ip}: ${e.message}`,
            data: credential,
          };
        }
      }),
    );
    return results;
  }
}
