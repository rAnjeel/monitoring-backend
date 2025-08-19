/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'ssh2';

export interface SshCredentials {
    host: string;
    port?: number;
    username: string;
    password: string;
}

@Injectable()
export class SshService {
    private readonly logger = new Logger(SshService.name);

    async testConnection(credentials: SshCredentials): Promise<{ status: string }> {
        return new Promise((resolve, reject) => {
            const conn = new Client();

            conn.on('ready', () => {
                this.logger.log(`Connected to ${credentials.host}`);
                conn.end();
                resolve({ status: 'connected' });
            });

            conn.on('error', (err) => {
                this.logger.error(`SSH error: ${err.message}`);
                reject(new Error(`SSH error: ${err.message}`));
            });

            conn.connect({
                host: credentials.host,
                port: credentials.port,
                username: credentials.username,
                password: credentials.password,
                readyTimeout: 20000,
                tryKeyboard: true,
            });
        });
    }
}
