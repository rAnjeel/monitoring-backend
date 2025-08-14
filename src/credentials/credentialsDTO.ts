/* eslint-disable prettier/prettier */
export class CredentialDTO {
  Ip: string;
  CodeSite: string;
  siteUsername: string;
  sitePassword: string;
  isSitePasswordVerified: string;
  sitePort: number;
  siteSShVersion: string;
  lastDateChange?: Date;
  toVerify: boolean;
}
