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

@Injectable()
export class CredentialsService implements NestMiddleware {
  constructor(
    @InjectRepository(Credentials)
    private credentialRepository: Repository<Credentials>,
    private readonly historicCredentialsService: HistoricCredentialsService,
    private readonly dataSource: DataSource,
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
      lastDateChange: new Date()
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
}
