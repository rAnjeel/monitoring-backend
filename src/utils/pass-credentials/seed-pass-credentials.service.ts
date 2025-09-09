/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { PassCredentialsService } from './pass-credentials.service';
import { PassCredentialsDTO } from './pass-credentialsDTO';

@Injectable()
export class SeedPassCredentialsService {
  private readonly logger = new Logger(SeedPassCredentialsService.name);

  constructor(private readonly passCredentialsService: PassCredentialsService) {}

  async run() {
    const arrayPassword: PassCredentialsDTO[] = [
      { sitePort: '22', password: 'anltlm2bsc7-GLX@', siteSSHVersion: 'usual-shell' },
      { sitePort: '22', password: 'anltlm2bsc7-GLX@', siteSSHVersion: 'ose-shell' },
      { sitePort: '22', password: 'rbs', siteSSHVersion: 'usual-shell' },
      { sitePort: '22', password: 'rbs', siteSSHVersion: 'ose-shell' },
      { sitePort: '22', password: 'Ericssonrbs1@', siteSSHVersion: 'usual-shell' },
      { sitePort: '22', password: 'Ericssonrbs1@', siteSSHVersion: 'ose-shell' },
      { sitePort: '2023', password: 'anltlm2bsc7-GLX@', siteSSHVersion: 'usual-shell' },
      { sitePort: '2023', password: 'anltlm2bsc7-GLX@', siteSSHVersion: 'ose-shell' },
      { sitePort: '2023', password: 'rbs', siteSSHVersion: 'usual-shell' },
      { sitePort: '2023', password: 'rbs', siteSSHVersion: 'ose-shell' },
      { sitePort: '2023', password: 'Ericssonrbs1@', siteSSHVersion: 'usual-shell' },
      { sitePort: '2023', password: 'Ericssonrbs1@', siteSSHVersion: 'ose-shell' },
    ];

    for (const dto of arrayPassword) {
      try {
        // Vérifier si le credential existe déjà pour éviter doublon
        const exists = await this.passCredentialsService.findAll();
        const alreadyExists = exists.some(
          (c) => c.sitePort === dto.sitePort && c.password === dto.password && c.siteSSHVersion === dto.siteSSHVersion
        );
        if (!alreadyExists) {
          await this.passCredentialsService.create(dto);
          this.logger.log(`Inserted credential: sitePort=${dto.sitePort}, siteSSHversion=${dto.siteSSHVersion}`);
        }
      } catch (err) {
        this.logger.error(`Failed to insert credential ${dto.password}`, err);
      }
    }

    this.logger.log('Seeding pass credentials completed');
  }
}
