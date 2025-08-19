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

@Injectable()
export class CredentialsService implements NestMiddleware {
  constructor(
    @InjectRepository(Credentials)
    private credentialRepository: Repository<Credentials>,
    private readonly historicCredentialsService: HistoricCredentialsService,
    private readonly dataSource: DataSource,
    private readonly sshService: SshService
  ) { }

  use(req: Request, res: Response, next: NextFunction) {
    req['clientIp'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    next();
  }

  // CREATE
  async create(credentialDTO: CredentialDTO) {
    return await this.credentialRepository.save({
      ...credentialDTO,
      isSitePasswordVerified: Number(credentialDTO.isSitePasswordVerified),
      sitePort: Number(credentialDTO.sitePort),
      lastDateChange: new Date(),
      toVerify: credentialDTO.toVerify
    });
  }

  // READ ALL
  async findAll(): Promise<Credentials[]> {
    return await this.credentialRepository.find();
  }

  async findSitesToVerify(): Promise<Credentials[]> {
  return await this.credentialRepository.findBy({
    toVerify: true
  });
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
      throw new NotFoundException(`Credential avec ID ${id} non trouvé`);
    }

    Object.assign(credential, updateDto);

    try {
      return await this.credentialRepository.save({
        ...credential,
        siteUsernameEntered: credential.siteUsername,
        sitePasswordEntered: credential.sitePassword,
        sitePortEntered: credential.sitePort,
        isSitePasswordVerified: Number(credential.isSitePasswordVerified),
        sitePort: Number(credential.sitePort),
      });
    } catch (error) {
      console.error('[Service Update] Erreur lors du save:', error);
      throw new Error('Erreur lors de la mise à jour du credential');
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

    Object.assign(credential, updateDto);

    // Résoudre l'historique associé
    const latestHistoric = await this.historicCredentialsService.getLatestUnresolvedBySiteId(id);
    if (latestHistoric) {
      latestHistoric.errorResolutionDate = new Date();
      latestHistoric.errorStatus = 'resolved';
      await this.historicCredentialsService.update(latestHistoric.id, latestHistoric);
    }

    try {
      return await this.credentialRepository.save({
        ...credential,
        siteUsernameEntered: credential.siteUsername,
        sitePasswordEntered: credential.sitePassword,
        sitePortEntered: credential.sitePort,
        isSitePasswordVerified: Number(credential.isSitePasswordVerified),
        sitePort: Number(credential.sitePort),
        lastDateChange: new Date()
      });
    } catch (error) {
      console.error('[Service Update] Erreur lors du save:', error);
      throw new Error('Erreur lors de la mise à jour du credential');
    }
  }

  // DELETE
  async remove(id: number) {
    return await this.credentialRepository.delete(id);
  }

  /**
   * Compare les colonnes username/password entre les valeurs stockées et saisies
   * @returns Analyse des correspondances et mismatches
   */
  async compareCredentials(): Promise<{
      matches: Credentials[];
      mismatches: Array<{
        id: number;
        Ip: string;
        sitePort: number;
        siteUsername: string;
        usernameMatch: boolean;
        passwordMatch: boolean;
        portMatch: boolean;
      }>;
      stats: {
        total: number;
        usernameMatches: number;
        passwordMatches: number;
        portMatches: number;
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
    }> = [];

    let usernameMatches = 0;
    let passwordMatches = 0;
    let portMatches = 0;

    const updatePromises: Promise<unknown>[] = [];
    const createHistoricPromises: Promise<unknown>[] = [];

    for (const credential of allCredentials) {
      const isUsernameMatch = credential.siteUsername === credential.siteUsernameEntered;
      const isPasswordMatch = credential.sitePassword === credential.sitePasswordEntered;
      const isSitePortMatch = credential.sitePort === credential.sitePortEntered;

      if (isUsernameMatch) usernameMatches++;
      if (isPasswordMatch) passwordMatches++;
      if (isSitePortMatch) portMatches++;

      if (isUsernameMatch && isPasswordMatch && isSitePortMatch) {
        matches.push(credential);

        // Déclencher l’update sans attendre
        updatePromises.push(
          this.update(credential.id, {
            lastDateChange: new Date(),
          }).catch(err => {
            console.error(`Erreur update lastDateChange siteId ${credential.id}`, err);
          })
        );
      } else {
        mismatches.push({
          id: credential.id,
          Ip: credential.Ip,
          sitePort: credential.sitePort,
          siteUsername: credential.siteUsername,
          usernameMatch: isUsernameMatch,
          passwordMatch: isPasswordMatch,
          portMatch: isSitePortMatch,
        });

        const errorDetails: string[] = [];
        if (!isUsernameMatch) errorDetails.push('Username mismatch');
        if (!isPasswordMatch) errorDetails.push('Password mismatch');
        if (!isSitePortMatch) errorDetails.push('Port mismatch');

        const errorDescription = errorDetails.join(', ') || 'Mismatch detected';

        createHistoricPromises.push(
          this.historicCredentialsService.create({
            siteId: credential.id,
            connectionErrorDate: new Date(),
            errorDescription,
            errorStatus: 'unresolved',
          }).catch(err => {
            console.error(`Erreur create historic siteId ${credential.id}`, err);
          })
        );
      }
    }

    // Attendre toutes les opérations en parallèle
    await Promise.allSettled(updatePromises);
    await Promise.allSettled(createHistoricPromises);

    return {
      matches,
      mismatches,
      stats: {
        total: allCredentials.length,
        usernameMatches,
        passwordMatches,
        portMatches,
      },
    };
  }

  async compareToVerifySitesCredentials(): Promise<{
      matches: Credentials[];
      mismatches: Array<{
        id: number;
        Ip: string;
        sitePort: number;
        siteUsername: string;
        usernameMatch: boolean;
        passwordMatch: boolean;
        portMatch: boolean;
      }>;
      stats: {
        total: number;
        usernameMatches: number;
        passwordMatches: number;
        portMatches: number;
      };
  }> {
    const toVerifyCredentials = await this.findSitesToVerify();

    const matches: Credentials[] = [];
    const mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
    }> = [];

    let usernameMatches = 0;
    let passwordMatches = 0;
    let portMatches = 0;

    const updatePromises: Promise<unknown>[] = [];
    const createHistoricPromises: Promise<unknown>[] = [];

    for (const credential of toVerifyCredentials) {
      const isUsernameMatch = credential.siteUsername === credential.siteUsernameEntered;
      const isPasswordMatch = credential.sitePassword === credential.sitePasswordEntered;
      const isSitePortMatch = credential.sitePort === credential.sitePortEntered;

      if (isUsernameMatch) usernameMatches++;
      if (isPasswordMatch) passwordMatches++;
      if (isSitePortMatch) portMatches++;

      if (isUsernameMatch && isPasswordMatch && isSitePortMatch) {
        matches.push(credential);

        // Déclencher l’update sans attendre
        updatePromises.push(
          this.update(credential.id, {
            lastDateChange: new Date(),
          }).catch(err => {
            console.error(`Erreur update lastDateChange siteId ${credential.id}`, err);
          })
        );
      } else {
        mismatches.push({
          id: credential.id,
          Ip: credential.Ip,
          sitePort: credential.sitePort,
          siteUsername: credential.siteUsername,
          usernameMatch: isUsernameMatch,
          passwordMatch: isPasswordMatch,
          portMatch: isSitePortMatch,
        });

        const errorDetails: string[] = [];
        if (!isUsernameMatch) errorDetails.push('Username mismatch');
        if (!isPasswordMatch) errorDetails.push('Password mismatch');
        if (!isSitePortMatch) errorDetails.push('Port mismatch');

        const errorDescription = errorDetails.join(', ') || 'Mismatch detected';

        createHistoricPromises.push(
          this.historicCredentialsService.create({
            siteId: credential.id,
            connectionErrorDate: new Date(),
            errorDescription,
            errorStatus: 'unresolved',
          }).catch(err => {
            console.error(`Erreur create historic siteId ${credential.id}`, err);
          })
        );
      }
    }

    // Attendre toutes les opérations en parallèle
    await Promise.allSettled(updatePromises);
    await Promise.allSettled(createHistoricPromises);

    return {
      matches,
      mismatches,
      stats: {
        total: toVerifyCredentials.length,
        usernameMatches,
        passwordMatches,
        portMatches,
      },
    };
  }

  async verifySiteCredentials(
    Ip: string,
    siteUsername: string,
    sitePassword: string,
    sitePort: number
  ): Promise<{
    match: boolean;
    details: {
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
    };
    error?: string;
  }> {
    try {
      // 1. Récupérer le credential du site
      const credential = await this.findOneByIp(Ip);
      if (!credential) {
        return {
          match: false,
          details: { usernameMatch: false, passwordMatch: false, portMatch: false },
          error: 'Site not found',
        };
      }

      // 2. Comparer les valeurs
      const usernameMatch = credential.siteUsername === siteUsername;
      const passwordMatch = credential.sitePassword === sitePassword;
      const portMatch = credential.sitePort === sitePort;

      // 3. Vérifier le match complet
      const fullMatch = usernameMatch && passwordMatch && portMatch;

      // 4. Loguer l'historique si mismatch
      if (!fullMatch) {
        const errorDetails: string[] = [];
        if (!usernameMatch) errorDetails.push('Username mismatch');
        if (!passwordMatch) errorDetails.push('Password mismatch');
        if (!portMatch) errorDetails.push('Port mismatch');

        await this.historicCredentialsService.create({
          siteId: credential.id,
          connectionErrorDate: new Date(),
          errorDescription: errorDetails.join(', '),
          errorStatus: 'unresolved',
        }).catch(err => console.error(`Error creating history for site ${Ip}`, err));
      }

      // 5. Mettre à jour la date si match
      if (fullMatch) {
        await this.update(credential.id, { lastDateChange: new Date() } as Partial<CredentialDTO>)
          .catch(err => console.error(`Error updating site ${Ip}`, err));
      }

      return {
        match: fullMatch,
        details: { usernameMatch, passwordMatch, portMatch },
      };
    } catch (error) {
      console.error(`Error verifying credentials for site ${Ip}`, error);
      return {
        match: false,
        details: { usernameMatch: false, passwordMatch: false, portMatch: false },
        error: 'Internal server error',
      };
    }
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
        cs.isSitePasswordVerified,
        cs.sitePort,
        cs.siteSShVersion,
        cs.siteUsernameEntered,
        cs.sitePasswordEntered,
        cs.sitePortEntered,
        cs.lastDateChange,
        cs.toVerify,
        latest_historic.connectionErrorDate AS lastConnectionError
      FROM credentials_sites cs
      LEFT JOIN (
        SELECT siteId, MAX(connectionErrorDate) AS connectionErrorDate
        FROM credentials_sites_historic
        GROUP BY siteId
      ) AS latest_historic
      ON cs.id = latest_historic.siteId;
    `);
    return result;

    } catch (error) {
      console.error('[Service Update] Erreur lors du save:', error);
      throw new Error('Erreur lors de la mise à jour du credential');
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
      errorDescription: string;
    }>;
    stats: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const allCredentials = await this.findAll();

    const matches: Credentials[] = [];
    const mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      errorDescription: string;
    }> = [];

    let successful = 0;
    let failed = 0;

    const updatePromises: Promise<unknown>[] = [];
    const createHistoricPromises: Promise<unknown>[] = [];

    for (const credential of allCredentials) {
      try {
        await this.sshService.testConnection({
          host: credential.Ip,
          port: credential.sitePort,
          username: credential.siteUsername,
          password: credential.sitePassword,
        });

        matches.push(credential);
        successful++;

        updatePromises.push(
          this.update(credential.id, {
            lastDateChange: new Date(),
          }).catch(err => {
            console.error(`Erreur update lastDateChange siteId ${credential.id}`, err);
          }),
        );
      } catch (error) {
        let errorMessage = 'SSH connection failed';

        if (error instanceof Error) {
          errorMessage = error.message;

          if (error.message.includes('ECONNREFUSED')) {
            errorMessage = 'Connection refused (port fermé ou hôte injoignable)';
          } else if (error.message.includes('ETIMEDOUT')) {
            errorMessage = 'Connection timed out (hôte non accessible)';
          } else if (error.message.includes('All configured authentication methods failed')) {
            errorMessage = 'Authentication failed (username ou password incorrect)';
          } else if (error.message.includes('ENOTFOUND')) {
            errorMessage = 'Host not found (DNS ou IP invalide)';
          }
        }

        mismatches.push({
          id: credential.id,
          Ip: credential.Ip,
          sitePort: credential.sitePort,
          siteUsername: credential.siteUsername,
          errorDescription: errorMessage,
        });
        failed++;

        createHistoricPromises.push(
          this.historicCredentialsService
            .create({
              siteId: credential.id,
              connectionErrorDate: new Date(),
              errorDescription: errorMessage,
              errorStatus: 'unresolved',
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
      },
    };
  }

  async compareToVerifySitesCredentialsBySSH(): Promise<{
    matches: Credentials[];
    mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
    }>;
    stats: {
      total: number;
      usernameMatches: number;
      passwordMatches: number;
      portMatches: number;
    };
  }> {
    const toVerifyCredentials = await this.findSitesToVerify();

    const matches: Credentials[] = [];
    const mismatches: Array<{
      id: number;
      Ip: string;
      sitePort: number;
      siteUsername: string;
      usernameMatch: boolean;
      passwordMatch: boolean;
      portMatch: boolean;
    }> = [];

    let usernameMatches = 0;
    let passwordMatches = 0;
    let portMatches = 0;

    const updatePromises: Promise<unknown>[] = [];
    const createHistoricPromises: Promise<unknown>[] = [];

    for (const credential of toVerifyCredentials) {
      try {
        await this.sshService.testConnection({
          host: credential.Ip,
          port: credential.sitePort,
          username: credential.siteUsername,
          password: credential.sitePassword,
        });

        // Si la connexion SSH réussit, tout est considéré comme correct
        matches.push(credential);
        usernameMatches++;
        passwordMatches++;
        portMatches++;

        // Update lastDateChange
        updatePromises.push(
          this.update(credential.id, { lastDateChange: new Date() }).catch(err => {
            console.error(`Erreur update lastDateChange siteId ${credential.id}`, err);
          })
        );
      } catch (error) {
        let errorMessage = 'SSH connection failed';
        const isUsernameMatch = false;
        const isPasswordMatch = false;
        const isSitePortMatch = false;

        if (error instanceof Error) {
          errorMessage = error.message;

          if (error.message.includes('ECONNREFUSED')) {
            errorMessage = 'Connection refused (port fermé ou hôte injoignable)';
          } else if (error.message.includes('ETIMEDOUT')) {
            errorMessage = 'Connection timed out (hôte non accessible)';
          } else if (error.message.includes('All configured authentication methods failed')) {
            errorMessage = 'Authentication failed (username ou password incorrect)';
            // On peut déduire que username/password est mauvais
          } else if (error.message.includes('ENOTFOUND')) {
            errorMessage = 'Host not found (DNS ou IP invalide)';
          }
        }

        mismatches.push({
          id: credential.id,
          Ip: credential.Ip,
          sitePort: credential.sitePort,
          siteUsername: credential.siteUsername,
          usernameMatch: isUsernameMatch,
          passwordMatch: isPasswordMatch,
          portMatch: isSitePortMatch,
        });

        createHistoricPromises.push(
          this.historicCredentialsService.create({
            siteId: credential.id,
            connectionErrorDate: new Date(),
            errorDescription: errorMessage,
            errorStatus: 'unresolved',
          }).catch(err => {
            console.error(`Erreur create historic siteId ${credential.id}`, err);
          })
        );
      }
    }

    await Promise.allSettled(updatePromises);
    await Promise.allSettled(createHistoricPromises);

    return {
      matches,
      mismatches,
      stats: {
        total: toVerifyCredentials.length,
        usernameMatches,
        passwordMatches,
        portMatches,
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
      errorDescription: string;
    }>;
    stats: {
      total: number;
      usernameMatches: number;
      passwordMatches: number;
      portMatches: number;
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
      errorDescription: string;
    }> = [];

    let usernameMatches = 0;
    let passwordMatches = 0;
    let portMatches = 0;

    const updatePromises: Promise<unknown>[] = [];
    const createHistoricPromises: Promise<unknown>[] = [];

    for (const dto of credentialsList) {
      // ⚡ Charger depuis la DB avec l'ID du DTO
      if (!dto.Ip) {
        throw new NotFoundException(`Credential avec IP ${dto.Ip} non trouvé`);
      }
      const credential = await this.findOneByIp(dto.Ip);
      if (!credential) {
        throw new NotFoundException(`Credential avec IP ${dto.Ip} non trouvé`);
      }
      try {
        await this.sshService.testConnection({
          host: dto.Ip || credential.Ip,
          port: dto.sitePort || credential.sitePort,
          username: dto.siteUsername || credential.siteUsername,
          password: dto.sitePassword || credential.sitePassword,
        });

        // Connexion réussie
        matches.push(credential);
        usernameMatches++;
        passwordMatches++;
        portMatches++;

        updatePromises.push(
          this.update(credential.id, { lastDateChange: new Date() }).catch(err => {
            console.error(`Erreur update lastDateChange siteId ${credential.id}`, err);
          })
        );
      } catch (error) {
        let errorMessage = 'SSH connection failed';
        const isUsernameMatch = false;
        const isPasswordMatch = false;
        let isSitePortMatch = false;

        if (error instanceof Error) {
          errorMessage = error.message;

          if (error.message.includes('ECONNREFUSED')) {
            errorMessage = 'Connection refused (port fermé ou hôte injoignable)';
          } else if (error.message.includes('ETIMEDOUT')) {
            errorMessage = 'Connection timed out (hôte non accessible)';
          } else if (error.message.includes('All configured authentication methods failed')) {
            errorMessage = 'Authentication failed (username ou password incorrect)';
            isSitePortMatch = true; // port ok mais login/pass KO
          } else if (error.message.includes('ENOTFOUND')) {
            errorMessage = 'Host not found (DNS ou IP invalide)';
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
          errorDescription: errorMessage,
        });

        createHistoricPromises.push(
          this.historicCredentialsService.create({
            siteId: credential.id,
            connectionErrorDate: new Date(),
            errorDescription: errorMessage,
            errorStatus: 'unresolved',
          }).catch(err => {
            console.error(`Erreur create historic siteId ${credential.id}`, err);
          })
        );
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
      },
    };
  }
}
