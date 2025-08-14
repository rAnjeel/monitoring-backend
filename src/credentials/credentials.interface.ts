/* eslint-disable prettier/prettier */
export interface Credential {
    id: number;
    Ip: string;
    CodeSite: string;
    siteUsername: string;
    sitePassword: string;
    isSitePasswordVerified: number;
    sitePort: number;
    siteSShVersion: string;
    siteUsernameEntered: string;
    sitePasswordEntered: string;
    sitePortEntered: number;
    lastDateChange: Date;
    lastConnectionError: Date;
    toVerify: boolean;
}
