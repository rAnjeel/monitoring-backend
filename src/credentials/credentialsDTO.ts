/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class CredentialDTO {
  @ApiProperty({
    description: 'Adresse IP du site',
  })
  Ip: string;

  @ApiProperty({
    description: 'Code unique du site',
  })
  CodeSite: string;

  @ApiProperty({
    description: "Nom d'utilisateur du site",
  })
  siteUsername: string;

  @ApiProperty({
    description: 'Mot de passe du site',
  })
  sitePassword: string;

  @ApiProperty({
    description: 'Statut de vérification du mot de passe',
  })
  isSitePasswordVerified: string;

  @ApiProperty({
    description: 'Port de connexion SSH',
  })
  sitePort: number;

  @ApiProperty({
    description: 'Version du serveur SSH',
  })
  siteSShVersion: string;

  @ApiProperty({
    description: 'Dernière date de modification des credentials',
    required: false,
  })
  lastDateChange?: Date;

  @ApiProperty({
    description: 'Indique si le site est à vérifier',
  })
  toVerify: boolean;
}
