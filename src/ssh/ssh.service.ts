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
    private connectionStartTime: number;

    async testConnection(credentials: SshCredentials): Promise<{ status: string, output: string }> {
        return new Promise((resolve, reject) => {
            this.connectionStartTime = Date.now();
            this.logger.debug(`Starting SSH connection to ${credentials.host}:${credentials.port || 22}`);
            this.logger.debug(`Connection started at: ${new Date(this.connectionStartTime).toISOString()}`);

            credentials["tryKeyboard"] = true;

            credentials["algorithms"] = {
                kex: [
                    "diffie-hellman-group1-sha1",
                    "ecdh-sha2-nistp256",
                    "ecdh-sha2-nistp384",
                    "ecdh-sha2-nistp521",
                    "diffie-hellman-group-exchange-sha256",
                    "diffie-hellman-group14-sha1",
                ],

                cipher: [
                    "aes128-cbc",
                    "3des-cbc",
                    "blowfish-cbc",
                    "aes128-ctr",
                    "aes192-ctr",
                    "aes256-ctr",
                    "aes128-gcm",
                    "aes128-gcm@openssh.com",
                    "aes256-gcm",
                    "aes256-gcm@openssh.com",
                ],

                serverHostKey: [
                    "ssh-rsa",
                    "ssh-dss",
                    "ssh-ed25519",
                    "ecdsa-sha2-nistp256",
                    "ecdsa-sha2-nistp384",
                    "ecdsa-sha2-nistp521",
                ]
            };

            const conn = new Client();

            conn.on('ready', () => {
                this.logger.log(`Connexion du site réussie (${credentials.host}:${credentials.port || 22})`);
                conn.end();
                resolve({ status: 'connected', output: 'Connexion du site réussie' });
            });

            conn.on("keyboard-interactive", (name, descr, lang, prompts, finish) => {
                return finish([credentials.password]);
            });

            conn.on('error', (err) => {
                let friendlyMessage: string;

                if (err.message.includes('ECONNREFUSED')) {
                    friendlyMessage = 'Erreur détectée: Port invalide ou fermé';
                } else if (err.message.includes('ETIMEDOUT')) {
                    friendlyMessage = 'Erreur détectée: Hôte injoignable (timeout)';
                } else if (err.message.includes('All configured authentication methods failed')) {
                    friendlyMessage = 'Erreur détectée: Username / Password invalides';
                } else if (err.message.includes('ENOTFOUND')) {
                    friendlyMessage = 'Erreur détectée: Hôte introuvable (DNS ou IP invalide)';
                } else {
                    friendlyMessage = `Erreur détectée: ${err.message}`;
                }

                this.logger.error(`${friendlyMessage} (${credentials.host}:${credentials.port || 22})`);
                conn.end();
                reject(new Error(friendlyMessage));
            });

            conn.on('end', () => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.debug(`[+${elapsedTime}ms] SSH connection ended`);
                console.log(`[+${elapsedTime}ms] SSH connection ended`);
            });

            (conn as any).on('close', (hadError: boolean) => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.log(`[+${elapsedTime}ms] Connection closed ${hadError ? 'with error' : 'cleanly'}`);
                console.log(`[+${elapsedTime}ms] Connection closed ${hadError ? 'with error' : 'cleanly'}`);
            });

            // Configuration de connexion
            const connectionConfig = {
                host: credentials.host,
                port: credentials.port,
                username: credentials.username,
                password: credentials.password,
                readyTimeout: 1000 * 60,
                tryKeyboard: true,
            };

            this.logger.debug('Attempting connection with config:', {
                ...connectionConfig,
                password: '***'
            });

            conn.connect(connectionConfig);

        });
    }

    // Méthode utilitaire pour tester la connectivité réseau
    async testNetworkConnectivity(host: string, port: number = 22): Promise<void> {
        this.logger.debug(`Testing network connectivity to ${host}:${port}`);
        
        const dns = require('dns');
        const net = require('net');
        
        // Test de résolution DNS
        try {
            const startTime = Date.now();
            const addresses = await dns.promises.resolve4(host);
            const elapsedTime = Date.now() - startTime;
            this.logger.debug(`[+${elapsedTime}ms] DNS resolution successful: ${addresses.join(', ')}`);
            console.log(`[+${elapsedTime}ms] DNS resolution successful: ${addresses.join(', ')}`);
        } catch (dnsError) {
            this.logger.error(`DNS resolution failed: ${dnsError.message}`);
            console.error(`DNS resolution failed: ${dnsError.message}`);
            throw dnsError;
        }
        
        // Test de connexion TCP
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const startTime = Date.now();
            
            socket.setTimeout(5000);
            
            socket.on('connect', () => {
                const elapsedTime = Date.now() - startTime;
                this.logger.debug(`[+${elapsedTime}ms] TCP connection to ${host}:${port} successful`);
                console.log(`[+${elapsedTime}ms] TCP connection to ${host}:${port} successful`);
                socket.destroy();
                resolve();
            });
            
            socket.on('timeout', () => {
                const elapsedTime = Date.now() - startTime;
                this.logger.error(`[+${elapsedTime}ms] TCP connection to ${host}:${port} timed out`);
                console.error(`[+${elapsedTime}ms] TCP connection to ${host}:${port} timed out`);
                socket.destroy();
                reject(new Error('TCP connection timeout'));
            });
            
            socket.on('error', (error) => {
                const elapsedTime = Date.now() - startTime;
                this.logger.error(`[+${elapsedTime}ms] TCP connection error: ${error.message}`);
                console.error(`[+${elapsedTime}ms] TCP connection error: ${error.message}`);
                reject(error);
            });
            
            this.logger.debug(`Attempting TCP connection to ${host}:${port}`);
            socket.connect(port, host);
        });
    }
}