/* eslint-disable prettier/prettier */
export class HistoricCredentialsDTO {
    id?: number;
    siteId: number;
    connectionErrorDate?: Date;
    errorDescription?: string;
    errorResolutionDate?: Date;
    errorStatus?: string;
} 