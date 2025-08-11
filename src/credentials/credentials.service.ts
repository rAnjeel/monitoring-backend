/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credentials } from '../credentials/credentials.entity';
import { CredentialDTO } from '../credentials/credentialsDTO';

@Injectable()
export class CredentialsService {
  constructor(
    @InjectRepository(Credentials)
    private credentialRepository: Repository<Credentials>,
  ) {}

  // CREATE
  async create(credentialDTO: CredentialDTO) {
    return await this.credentialRepository.save({
      ...credentialDTO,
      isSitePasswordVerified: Number(credentialDTO.isSitePasswordVerified),
      sitePort: Number(credentialDTO.sitePort),
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

  // UPDATE
  async update(id: number, updateDto: Partial<CredentialDTO>) {
    await this.credentialRepository.update(id, {
      ...updateDto,
      isSitePasswordVerified:
        updateDto.isSitePasswordVerified !== undefined
          ? Number(updateDto.isSitePasswordVerified)
          : undefined,
      sitePort:
        updateDto.sitePort !== undefined
          ? Number(updateDto.sitePort)
          : undefined,
    });
    return this.findOne(id);
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
      // 1. Récupérer toutes les entrées
      const allCredentials = await this.findAll();

      // 2. Initialiser les résultats
      const matches: Credentials[] = [];
      const mismatches: Array<{
        id: number;
        usernameMatch: boolean;
        passwordMatch: boolean;
        portMatch: boolean;
      }> = [];
      let usernameMatches = 0;
      let passwordMatches = 0;
      let portMatches = 0;

      // 3. Parcourir et comparer
      allCredentials.forEach((credential) => {
        const isUsernameMatch =
          credential.siteUsername === credential.siteUsernameEntered;
        const isPasswordMatch =
          credential.sitePassword === credential.sitePasswordEntered;
        const isSitePortMatch =
          credential.sitePort === credential.sitePortEntered;

        if (isUsernameMatch && isPasswordMatch && isSitePortMatch) {
          matches.push(credential);
        } else {
          mismatches.push({
            id: credential.id,
            usernameMatch: isUsernameMatch,
            passwordMatch: isPasswordMatch,
            portMatch: isSitePortMatch
          });
        }

        // Stats
        if (isUsernameMatch) usernameMatches++;
        if (isPasswordMatch) passwordMatches++;
        if (isSitePortMatch) portMatches++;
      });

      // 4. Retourner l'analyse structurée
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
}
