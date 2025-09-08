/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class PassCredentialsDTO {
    @ApiProperty({
        description: 'Port du pass-site',
    })
    sitePort: string;

    @ApiProperty({
        description: 'Mot de passe du pass-site',
    })
    password: string;

    @ApiProperty({
        description: "Type de shell du pass-site",
    })
    siteSSHVersion: string;
}