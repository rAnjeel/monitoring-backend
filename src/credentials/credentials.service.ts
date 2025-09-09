/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { Credentials } from '../credentials/credentials.entity';
import { CredentialDTO } from '../credentials/credentialsDTO';
import { Credential } from './credentials.interface';
import { HistoricCredentialsService } from '../historic-credentials/historic-credentials.service';
import { Request, Response, NextFunction } from 'express';
import { SshService } from '../ssh/ssh.service';
import { EncryptionService } from '../utils/sha/encryption.service';

@Injectable()
export class CredentialsService implements NestMiddleware {
  constructor(
    @InjectRepository(Credentials)
    private credentialRepository: Repository<Credentials>,
    private readonly historicCredentialsService: HistoricCredentialsService,
    private readonly dataSource: DataSource,
    private readonly sshService: SshService,
    private readonly encryptionService: EncryptionService
  ) { }

  use(req: Request, res: Response, next: NextFunction) {
    req['clientIp'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    next();
  }

  // CREATE
  async create(credentialDTO: CredentialDTO) {
    return await this.credentialRepository.save({
      ...credentialDTO,
      sitePassword: this.encryptionService.encrypt(credentialDTO.sitePassword),
      sitePort: Number(credentialDTO.sitePort),
      lastDateChange: new Date(),
    });
  }

  // READ ALL
  async findAll(): Promise<Credentials[]> {
    return await this.credentialRepository.find();
  }


  // READ ONE
  async findOne(id: number): Promise<Credentials | null> {
    return await this.credentialRepository.findOneBy({ id });
  }

  async findOneByIp(Ip: string): Promise<Credentials | null> {
    return await this.credentialRepository.findOneBy({ Ip });
  }

  async update(
    id: number,
    updateDto: Partial<CredentialDTO>,
  ): Promise<Credentials> {
    const credential = await this.credentialRepository.findOneBy({ id });
    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    if (updateDto.sitePassword) {
      updateDto.sitePassword = this.encryptionService.encrypt(updateDto.sitePassword);
    }

    Object.assign(credential, updateDto);

    try {
      const  response = await this.credentialRepository.save({
        ...credential,
        sitePort: Number(credential.sitePort),
      });

      return response;
    } catch (error) {
      console.error('[Service Update] Erreur lors du save:', error);
      throw new Error('Failed to update credential');
    }
  }

  // UPDATE
  async solveCredentials(
    id: number,
    updateDto: Partial<CredentialDTO>,
  ): Promise<Credentials> {
    const credential = await this.credentialRepository.findOneBy({ id });
    if (!credential) {
      throw new NotFoundException(`Credential avec ID ${id} non trouvé`);
    }

    // Résoudre l'historique associé
    const latestHistoric = await this.historicCredentialsService.getLatestUnresolvedBySiteId(id);
    if (latestHistoric) {
      latestHistoric.errorResolutionDate = new Date();
      latestHistoric.errorStatus = 'resolved';
      await this.historicCredentialsService.update(latestHistoric.id, latestHistoric);
    }

    try {
      // Utiliser la fonction update pour bénéficier du cryptage et des autres logiques
      return await this.update(id, updateDto);
    } catch (error) {
      console.error('[Service solveCredentials] Erreur lors de la mise à jour via update():', error);
      throw new Error('Failed to update credential/historic-credential');
    }
  }


  // DELETE
  async remove(id: number) {
    return await this.credentialRepository.delete(id);
  }

  async getCredentialsWithLastErrorDate(): Promise<any[]> {
    try {
      const result: Credential[] = await this.dataSource.query(`
        SELECT 
          cs.id,
          cs.Ip,
          cs.CodeSite,
          cs.siteUsername,
          cs.sitePassword,
          cs.sitePort,
          cs.siteSShVersion,
          cs.lastDateChange,
          latest_historic.connectionErrorDate AS lastConnectionError,
          latest_historic.errorStatus
        FROM credentials_sites cs
        LEFT JOIN (
          SELECT h1.siteId, h1.connectionErrorDate, h1.errorStatus
          FROM credentials_sites_historic h1
          INNER JOIN (
            SELECT siteId, MAX(connectionErrorDate) AS maxDate
            FROM credentials_sites_historic
            GROUP BY siteId
          ) h2
          ON h1.siteId = h2.siteId AND h1.connectionErrorDate = h2.maxDate
        ) AS latest_historic
        ON cs.id = latest_historic.siteId
        WHERE latest_historic.errorStatus = 'unresolved' ORDER BY cs.id;
      `);

    return result;

    } catch (error) {
      console.error('[Service Update] Error lors du save:', error);
      throw new Error('Failed to get historic-credential');
    }
  }
  /**
   * Teste la connexion SSH pour tous les credentials
   * @returns Analyse des réussites et des erreurs détaillées
   */
  async compareCredentialsBySSH(): Promise<{
    matches: Credentials[];
    mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
      shellMatch: boolean;
      errorDescription: string;
    }>;
    stats: {
      total: number;
      successful: number;
      failed: number;
      usernameMatches: number;
      passwordMatches: number;
      portMatches: number;
      shellMatches: number;
    };
  }> {
    const allCredentials = await this.findAll();

    const matches: Credentials[] = [];
    const mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
      shellMatch: boolean;
      errorDescription: string;
    }> = [];

    let successful = 0;
    let failed = 0;
    let usernameMatches = 0;
    let passwordMatches = 0;
    let portMatches = 0;
    let shellMatches = 0;

    const updatePromises: Promise<unknown>[] = [];
    const createHistoricPromises: Promise<unknown>[] = [];

    for (const credential of allCredentials) {
      try {
        await this.sshService.testConnection({
          host: credential.Ip,
          port: credential.sitePort,
          username: credential.siteUsername,
          password: this.encryptionService.decrypt(credential.sitePassword),
          siteSShVersion: credential.siteSShVersion,
        });

        // Succès
        matches.push(credential);
        successful++;
        usernameMatches++;
        passwordMatches++;
        portMatches++;
        shellMatches++;

        updatePromises.push(
          this.update(credential.id, {
            lastDateChange: new Date(),
          }).catch(err => {
            console.error(`Erreur update lastDateChange siteId ${credential.id}`, err);
          }),
        );

      } catch (error) {
        let errorMessage = "SSH connection failed";
        let isUsernameMatch = false;
        let isPasswordMatch = false;
        let isPortMatch = false;
        let isShellMatch = false;

        if (error instanceof Error) {
          errorMessage = error.message;

          if (error.message.includes("Port invalide") || error.message.includes("ECONNREFUSED")) {
            errorMessage = "Not valid Port: please change value";
            isUsernameMatch = true;
            isPasswordMatch = true;
            isShellMatch = true;
          } else if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
            errorMessage = "Connection timed out (hôte non accessible)";
          } else if (error.message.includes("Username / Password invalides") || error.message.includes("Authentication failed")) {
            errorMessage = "Authentication failed (username ou password incorrect)";
            isPortMatch = true;
            isShellMatch = true;
          } else if (error.message.includes("Hôte introuvable") || error.message.includes("ENOTFOUND")) {
            errorMessage = "Host not found (DNS ou IP invalide)";
          } else if (error.message.includes('Erreur détectée: Shell')) {
            errorMessage = 'Not valid Shell: please change value';
            isUsernameMatch = true;
            isPasswordMatch = true;
            isPortMatch = true;
          } else if (error.message.includes('Erreur détectée: Hôte injoignable (timeout)')) {
            errorMessage = 'Error TIMEOUT: please check your network/connectivity ';
          }
        }

        mismatches.push({
          id: credential.id,
          Ip: credential.Ip,
          sitePort: credential.sitePort,
          siteUsername: credential.siteUsername,
          usernameMatch: isUsernameMatch,
          passwordMatch: isPasswordMatch,
          portMatch: isPortMatch,
          shellMatch: isShellMatch,
          errorDescription: errorMessage,
        });

        failed++;

        createHistoricPromises.push(
          this.historicCredentialsService
            .create({
              siteId: credential.id,
              connectionErrorDate: new Date(),
              errorDescription: errorMessage,
              errorStatus: "unresolved",
            })
            .catch(err => {
              console.error(`Erreur create historic siteId ${credential.id}`, err);
            }),
        );
      }
    }

    await Promise.allSettled(updatePromises);
    await Promise.allSettled(createHistoricPromises);

    return {
      matches,
      mismatches,
      stats: {
        total: allCredentials.length,
        successful,
        failed,
        usernameMatches,
        passwordMatches,
        portMatches,
        shellMatches,
      },
    };
  }


  async verifyCredentialsListBySSH(credentialsList: Partial<CredentialDTO>[]): Promise<{
    matches: Credentials[];
    mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
      shellMatch: boolean;
      errorDescription: string;
    }>;
    stats: {
      total: number;
      usernameMatches: number;
      passwordMatches: number;
      portMatches: number;
      shellMatches: number;
    };
  }> {
    const matches: Credentials[] = [];
    const mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
      shellMatch: boolean;
      errorDescription: string;
    }> = [];

    let usernameMatches = 0;
    let passwordMatches = 0;
    let portMatches = 0;
    let shellMatches = 0;

    const updatePromises: Promise<unknown>[] = [];
    const createHistoricPromises: Promise<unknown>[] = [];

    for (const dto of credentialsList) {
      if (!dto.Ip) {
        throw new NotFoundException(`Credential with IP ${dto.Ip} not found`);
      }

      let credential = await this.findOneByIp(dto.Ip);
      if (!credential) {
        credential = await this.create({
          ...dto,
          sitePort: Number(dto.sitePort) || 22,
        } as CredentialDTO);
      } else {
        credential = await this.update(credential.id, {
          ...dto,
          sitePort: Number(dto.sitePort) || credential.sitePort,
          lastDateChange: new Date(),
        });
      }
      
      console.log('Vérification du credential:', {
        password: dto.sitePassword || credential.sitePassword
      });
      try {
        await this.sshService.testConnection({
          host: dto.Ip || credential.Ip,
          port: dto.sitePort || credential.sitePort,
          username: dto.siteUsername || credential.siteUsername,
          password: dto.sitePassword || credential.sitePassword,
          siteSShVersion: dto.siteSShVersion || credential.siteSShVersion,
        });

        // Connexion réussie
        matches.push(credential);
        usernameMatches++;
        passwordMatches++;
        portMatches++;
        shellMatches++;


        updatePromises.push(
          this.update(credential.id, { lastDateChange: new Date()}).catch(err => {
            console.error(`Error on update lastDateChange siteId ${credential.id}`, err);
          })
        );

        // Résoudre l'historique associé
        const latestHistoric = await this.historicCredentialsService.getLatestUnresolvedBySiteId(credential.id);
        if (latestHistoric) {
          latestHistoric.errorResolutionDate = new Date();
          latestHistoric.errorStatus = 'resolved';
          await this.historicCredentialsService.update(latestHistoric.id, latestHistoric);
        }

      } catch (error) {
        let errorMessage = 'SSH connection failed';
        let isUsernameMatch = false;
        let isPasswordMatch = false;
        let isSitePortMatch = false;
        let isShellMatch = false;

        if (error instanceof Error) {
          errorMessage = error.message;

          if (error.message.includes('"Erreur détectée: Port invalide ou fermé"')) {
            errorMessage = 'Not valid Port: please change value';
            isUsernameMatch = true;
            isPasswordMatch = true;
            isShellMatch = true;
          } else if (error.message.includes("Erreur détectée: Username / Password invalides")) {
            errorMessage = 'Authentication failed (username ou password incorrect)';
            isSitePortMatch = true;
            isShellMatch = true;
          } else if (error.message.includes('Erreur détectée: Hôte introuvable (DNS ou IP invalide)')) {
            errorMessage = 'Host not found (DNS or invalid IP)';
          } else if (error.message.includes('Erreur détectée: Shell')) {
            errorMessage = 'Not valid Shell: please change value';
            isUsernameMatch = true;
            isPasswordMatch = true;
            isSitePortMatch = true;
          } else if (error.message.includes('Erreur détectée: Hôte injoignable (timeout)')) {
            errorMessage = 'Error TIMEOUT: please check your network/connectivity ';
          }
        }

        mismatches.push({
          id: credential.id,
          Ip: dto.Ip || credential.Ip,
          sitePort: dto.sitePort || credential.sitePort,
          siteUsername: dto.siteUsername || credential.siteUsername,
          usernameMatch: isUsernameMatch,
          passwordMatch: isPasswordMatch,
          portMatch: isSitePortMatch,
          shellMatch: isShellMatch,
          errorDescription: errorMessage,
        });
      }
    }

    await Promise.allSettled(updatePromises);
    await Promise.allSettled(createHistoricPromises);

    return {
      matches,
      mismatches,
      stats: {
        total: credentialsList.length,
        usernameMatches,
        passwordMatches,
        portMatches,
        shellMatches,
      },
    };

  }

  async verifyCredentialsDatabaseBySSH(credentialsList: Partial<CredentialDTO>[]): Promise<{
    matches: Credentials[];
    mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
      shellMatch: boolean;
      errorDescription: string;
    }>;
    stats: {
      total: number;
      usernameMatches: number;
      passwordMatches: number;
      portMatches: number;
      shellMatches: number;
    };
  }> {
    const matches: Credentials[] = [];
    const mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
      shellMatch: boolean;
      errorDescription: string;
    }> = [];

    let usernameMatches = 0;
    let passwordMatches = 0;
    let portMatches = 0;
    let shellMatches = 0;

    const updatePromises: Promise<unknown>[] = [];
    const createHistoricPromises: Promise<unknown>[] = [];

    for (const dto of credentialsList) {
      if (!dto.Ip) {
        throw new NotFoundException(`Credential avec IP ${dto.Ip} non trouvé`);
      }

      let credential = await this.findOneByIp(dto.Ip);

      if (!credential) {
        credential = await this.create({
          ...dto,
          sitePort: Number(dto.sitePort) || 22,
        } as CredentialDTO);
      }
      try {
        await this.sshService.testConnection({
          host: dto.Ip || credential.Ip,
          port: dto.sitePort || credential.sitePort,
          username: dto.siteUsername || credential.siteUsername,
          password: this.encryptionService.decrypt(dto.sitePassword || credential.sitePassword),
          siteSShVersion: dto.siteSShVersion || credential.siteSShVersion,
        });

        // Connexion réussie
        matches.push(credential);
        usernameMatches++;
        passwordMatches++;
        portMatches++;
        shellMatches++;


        updatePromises.push(
          this.update(credential.id, { lastDateChange: new Date()}).catch(err => {
            console.error(`Error on update lastDateChange siteId ${credential.id}`, err);
          })
        );

        // Résoudre l'historique associé
        const latestHistoric = await this.historicCredentialsService.getLatestUnresolvedBySiteId(credential.id);
        if (latestHistoric) {
          latestHistoric.errorResolutionDate = new Date();
          latestHistoric.errorStatus = 'resolved';
          await this.historicCredentialsService.update(latestHistoric.id, latestHistoric);
        }

      } catch (error) {
        let errorMessage = 'SSH connection failed';
        let isUsernameMatch = false;
        let isPasswordMatch = false;
        let isSitePortMatch = false;
        let isShellMatch = false;

        if (error instanceof Error) {
          errorMessage = error.message;

          if (error.message.includes('"Erreur détectée: Port invalide ou fermé"')) {
            errorMessage = 'Not valid Port: please change value';
            isUsernameMatch = true;
            isPasswordMatch = true;
            isShellMatch = true;
          } else if (error.message.includes("Erreur détectée: Username / Password invalides")) {
            errorMessage = 'Authentication failed (username ou password incorrect)';
            isSitePortMatch = true;
            isShellMatch = true;
          } else if (error.message.includes('Erreur détectée: Hôte introuvable (DNS ou IP invalide)')) {
            errorMessage = 'Host not found (DNS or invalid IP)';
          } else if (error.message.includes('Erreur détectée: Shell')) {
            errorMessage = 'Not valid Shell: please change value';
            isUsernameMatch = true;
            isPasswordMatch = true;
            isSitePortMatch = true;
          } else if (error.message.includes('Erreur détectée: Hôte injoignable (timeout)')) {
            errorMessage = 'Error TIMEOUT: please check your network/connectivity ';
          }
        }

        mismatches.push({
          id: credential.id,
          Ip: dto.Ip || credential.Ip,
          sitePort: dto.sitePort || credential.sitePort,
          siteUsername: dto.siteUsername || credential.siteUsername,
          usernameMatch: isUsernameMatch,
          passwordMatch: isPasswordMatch,
          portMatch: isSitePortMatch,
          shellMatch: isShellMatch,
          errorDescription: errorMessage,
        });
      }
    }

    await Promise.allSettled(updatePromises);
    await Promise.allSettled(createHistoricPromises);

    return {
      matches,
      mismatches,
      stats: {
        total: credentialsList.length,
        usernameMatches,
        passwordMatches,
        portMatches,
        shellMatches,
      },
    };
  }

  async verifyCredentialsBySSH(credentialsList: Partial<CredentialDTO>[]): Promise<{
    matches: Credentials[];
    mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
      shellMatch: boolean;
      errorDescription: string;
    }>;
    stats: {
      total: number;
      usernameMatches: number;
      passwordMatches: number;
      portMatches: number;
      shellMatches: number;
    };
  }> {
    const matches: Credentials[] = [];
    const mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
      shellMatch: boolean;
      errorDescription: string;
    }> = [];

    let usernameMatches = 0;
    let passwordMatches = 0;
    let portMatches = 0;
    let shellMatches = 0;

    const updatePromises: Promise<unknown>[] = [];
    const createHistoricPromises: Promise<unknown>[] = [];

    for (const dto of credentialsList) {
      if (!dto.Ip) {
        throw new NotFoundException(`Credential with IP ${dto.Ip} not found`);
      }

      let credential = await this.findOneByIp(dto.Ip);

      if (!credential) {
        credential = await this.create({
          ...dto,
          sitePort: Number(dto.sitePort) || 22,
        } as CredentialDTO);
      }

      try {
        await this.sshService.testConnection({
          host: dto.Ip || credential.Ip,
          port: dto.sitePort || credential.sitePort,
          username: dto.siteUsername || credential.siteUsername,
          password: dto.sitePassword || credential.sitePassword,
          siteSShVersion: dto.siteSShVersion || credential.siteSShVersion,
        });

        // Connexion réussie
        matches.push(credential);
        usernameMatches++;
        passwordMatches++;
        portMatches++;
        shellMatches++;

      } catch (error) {
        let errorMessage = 'SSH connection failed';
        let isUsernameMatch = false;
        let isPasswordMatch = false;
        let isSitePortMatch = false;
        let isShellMatch = false;

        if (error instanceof Error) {
          errorMessage = error.message;

          if (error.message.includes('"Erreur détectée: Port invalide ou fermé"')) {
            errorMessage = 'Not valid Port: please change value';
            isUsernameMatch = true;
            isPasswordMatch = true;
            isShellMatch = true;
          } else if (error.message.includes("Erreur détectée: Username / Password invalides")) {
            errorMessage = 'Authentication failed (username ou password incorrect)';
            isSitePortMatch = true;
            isShellMatch = true;
          } else if (error.message.includes('Erreur détectée: Hôte introuvable (DNS ou IP invalide)')) {
            errorMessage = 'Host not found (DNS or invalid IP)';
          } else if (error.message.includes('Erreur détectée: Shell')) {
            errorMessage = 'Not valid Shell: please change value';
            isUsernameMatch = true;
            isPasswordMatch = true;
            isSitePortMatch = true;
          } else if (error.message.includes('Erreur détectée: Hôte injoignable (timeout)')) {
            errorMessage = 'Error TIMEOUT: please check your network/connectivity ';
          }
        }

        mismatches.push({
          id: credential.id,
          Ip: dto.Ip || credential.Ip,
          sitePort: dto.sitePort || credential.sitePort,
          siteUsername: dto.siteUsername || credential.siteUsername,
          usernameMatch: isUsernameMatch,
          passwordMatch: isPasswordMatch,
          portMatch: isSitePortMatch,
          shellMatch: isShellMatch,
          errorDescription: errorMessage,
        });
      }
    }

    await Promise.allSettled(updatePromises);
    await Promise.allSettled(createHistoricPromises);

    return {
      matches,
      mismatches,
      stats: {
        total: credentialsList.length,
        usernameMatches,
        passwordMatches,
        portMatches,
        shellMatches,
      },
    };
  }

  async discoverCredentialsList(credentialsList: Partial<CredentialDTO>[]): Promise<{
    discoveries: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      siteSShVersion: string;
      password: string;
    }>;
    errors: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      CodeSite: string;
      errorDescription: string;
    }>;
    stats: {
      total: number;
      success: number;
      failed: number;
    };
  }> {
    const discoveries: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      siteSShVersion: string;
      password: string;
    }> = [];

    const errors: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      CodeSite: string;
      errorDescription: string;
    }> = [];

    let success = 0;
    let failed = 0;

    for (const dto of credentialsList) {
      if (!dto.Ip) {
        throw new NotFoundException(`Credential with IP ${dto.Ip} not found`);
      }

      // récupérer ou créer en base
      let credential = await this.findOneByIp(dto.Ip);
      if (!credential) {
        credential = await this.create({
          ...dto,
          sitePort: Number(dto.sitePort) || 22,
        } as CredentialDTO);
      }

      try {
        // Appel de discover → ne fournit que host + username et rejette port|password|siteSShVersion
        const found = await this.sshService.discover({
          host: dto.Ip || credential.Ip,
          username: dto.siteUsername || credential.siteUsername,
        });

        if (found) {
          discoveries.push({
            id: credential.id,
            Ip: dto.Ip || credential.Ip,
            sitePort: found.port!,
            siteUsername: found.username,
            siteSShVersion: found.siteSShVersion,
            password: found.password,
          });

          // Mise à jour en base avec les bons credentials trouvés
          await this.solveCredentials(credential.id, {
            sitePort: found.port,
            siteUsername: found.username,
            sitePassword: this.encryptionService.encrypt(found.password),
            siteSShVersion: found.siteSShVersion,
            lastDateChange: new Date(),
          });
          console.log('Mise à jour du credential ID', credential.id, 'avec les infos découvertes.');

          success++;
        } else {
          errors.push({
            id: credential.id,
            Ip: dto.Ip || credential.Ip,
            sitePort: dto.sitePort || credential.sitePort,
            siteUsername: dto.siteUsername || credential.siteUsername,
            CodeSite: dto.CodeSite || credential.CodeSite,
            errorDescription: 'No valid credential found',
          });
          failed++;
        }
      } catch (error) {
        let errorMessage = 'SSH discovery failed';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        errors.push({
          id: credential.id,
          Ip: dto.Ip || credential.Ip,
          sitePort: dto.sitePort || credential.sitePort,
          siteUsername: dto.siteUsername || credential.siteUsername,
          CodeSite: dto.CodeSite || credential.CodeSite,
          errorDescription: errorMessage,
        });

        failed++;
      }
    }

    return {
      discoveries,
      errors,
      stats: {
        total: credentialsList.length,
        success,
        failed,
      },
    };
  }
}
