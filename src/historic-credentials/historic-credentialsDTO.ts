/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class HistoricCredentialsDTO {
    @ApiProperty({
        description: "Identifiant unique de l'entrée d'historique",
        required: false,
    })
    id?: number;

    @ApiProperty({
        description: 'Identifiant du site concerné',
    })
    siteId: number;

    @ApiProperty({
        description: 'Date de la dernière erreur de connexion',
        required: false,
    })
    connectionErrorDate?: Date;

    @ApiProperty({
        description: "Description de l'erreur rencontrée",
        required: false,
    })
    errorDescription?: string;

    @ApiProperty({
        description: "Date à laquelle l'erreur a été résolue",
        required: false,
    })
    errorResolutionDate?: Date;

    @ApiProperty({
        description: 'Statut de la résolution',
        required: false,
    })
    errorStatus?: string;
}
